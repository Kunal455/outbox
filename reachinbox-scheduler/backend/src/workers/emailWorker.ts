import { Worker, Job } from 'bullmq';
import { redisClient } from '../config/redis';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { EMAIL_QUEUE_NAME } from '../queues/emailQueue';
import { EmailJobData } from '../types';
import { RateLimiterService } from '../services/rateLimiter';
import { sendEmail } from '../services/smtpService';
import { ElasticsearchService } from '../services/elasticsearchService';
import { SlackService } from '../services/slackService';
import { logger } from '../utils/logger';

export function createEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const data = job.data;
      logger.info(`[Worker] Processing email job ${job.id} for recipient: ${data.recipientEmail}`);

      // 1. Database-backed Idempotency check
      const emailRecord = await prisma.emailRecord.findUnique({
        where: { id: data.emailRecordId },
        include: {
          sender: true,
          campaign: { include: { user: true } }
        }
      });

      if (!emailRecord) {
        logger.warn(`[Worker] EmailRecord ${data.emailRecordId} not found in database. Discarding job.`);
        return { skipped: true, reason: 'record_not_found' };
      }

      if (emailRecord.status === 'sent') {
        logger.info(`[Worker] EmailRecord ${data.emailRecordId} already marked SENT. Idempotency preserved.`);
        return { skipped: true, reason: 'already_sent' };
      }

      const sender = emailRecord.sender;
      if (!sender || !sender.isActive) {
        const errorMsg = 'Assigned sender is inactive or deleted';
        await prisma.emailRecord.update({
          where: { id: emailRecord.id },
          data: { status: 'failed', lastError: errorMsg }
        });
        await ElasticsearchService.updateEmailStatus(emailRecord.id, 'failed');
        return { success: false, reason: errorMsg };
      }

      // 2. Atomic Distributed Rate Limiting & Minimum Delay Reservation
      const reservation = await RateLimiterService.reserveSendingCapacity(
        sender.id,
        sender.hourlyLimit,
        sender.minSendIntervalMs
      );

      if (!reservation.allowed) {
        const waitMs = reservation.waitMs || 2000;
        const rescheduledTime = new Date(Date.now() + waitMs);

        if (reservation.reason === 'hourly_limit') {
          logger.warn(`[Worker] Hourly sending limit reached for sender ${sender.email} (${reservation.currentCount}/${reservation.hourlyLimit}). Deferring job by ${waitMs}ms`);

          // Update database and search status to deferred
          await prisma.emailRecord.update({
            where: { id: emailRecord.id },
            data: {
              status: 'deferred',
              scheduledTime: rescheduledTime
            }
          });
          await ElasticsearchService.updateEmailStatus(emailRecord.id, 'deferred');

          // Notify connected Slack workspace (debounced per sender/hour)
          SlackService.notifyRateLimitExceeded({
            userId: emailRecord.campaign.userId,
            senderId: sender.id,
            senderName: sender.name,
            senderEmail: sender.email,
            hourlyLimit: sender.hourlyLimit,
            rescheduledTime
          }).catch((slackErr) => logger.warn(`Slack alert trigger notice: ${slackErr.message}`));
        } else {
          logger.info(`[Worker] Minimum delay interval active for sender ${sender.email}. Deferring by ${waitMs}ms`);
        }

        // Reschedule job in BullMQ to the next eligible timestamp
        if (job.token) {
          await job.moveToDelayed(Date.now() + waitMs, job.token);
        } else {
          await job.retry();
        }

        return { deferred: true, reason: reservation.reason, waitMs };
      }

      // 3. Mark in-progress
      await prisma.emailRecord.update({
        where: { id: emailRecord.id },
        data: {
          status: 'processing',
          attemptCount: { increment: 1 }
        }
      });
      await ElasticsearchService.updateEmailStatus(emailRecord.id, 'processing');

      // 4. Dispatch Email via SMTP
      const sendResult = await sendEmail({
        fromName: sender.name,
        fromEmail: sender.email,
        to: data.recipientEmail,
        subject: data.subject,
        body: data.body
      });

      if (sendResult.success) {
        const sentTime = new Date();
        await prisma.emailRecord.update({
          where: { id: emailRecord.id },
          data: {
            status: 'sent',
            sentTime,
            providerMessageId: sendResult.providerMessageId || null,
            previewUrl: sendResult.previewUrl || null,
            lastError: null
          }
        });

        // Update Elasticsearch status
        await ElasticsearchService.updateEmailStatus(emailRecord.id, 'sent', sentTime);

        // Check if all campaign emails are finished
        const pendingCount = await prisma.emailRecord.count({
          where: {
            campaignId: emailRecord.campaignId,
            status: { in: ['scheduled', 'processing', 'deferred'] }
          }
        });

        if (pendingCount === 0) {
          await prisma.campaign.update({
            where: { id: emailRecord.campaignId },
            data: { status: 'COMPLETED' }
          });
          logger.info(`[Worker] Campaign ${emailRecord.campaignId} marked COMPLETED.`);
        }

        return {
          success: true,
          providerMessageId: sendResult.providerMessageId,
          previewUrl: sendResult.previewUrl
        };
      } else {
        // Rollback hourly quota count if send failed
        await RateLimiterService.rollbackReservation(sender.id);

        if (sendResult.isTransient) {
          // Transient error: throw error to trigger BullMQ retry mechanism
          const errMsg = sendResult.error || 'Transient SMTP failure';
          await prisma.emailRecord.update({
            where: { id: emailRecord.id },
            data: { lastError: `Transient error (retry queued): ${errMsg}` }
          });
          throw new Error(errMsg);
        } else {
          // Permanent failure (e.g. invalid recipient 550, auth failed): mark failed without retrying
          const errMsg = sendResult.error || 'Permanent SMTP failure';
          await prisma.emailRecord.update({
            where: { id: emailRecord.id },
            data: {
              status: 'failed',
              lastError: errMsg
            }
          });
          await ElasticsearchService.updateEmailStatus(emailRecord.id, 'failed');
          return { success: false, permanent: true, error: errMsg };
        }
      }
    },
    {
      connection: redisClient,
      concurrency: env.WORKER_CONCURRENCY,
      limiter: {
        max: 50,
        duration: 1000
      }
    }
  );

  worker.on('completed', (job) => {
    logger.info(`[Worker] Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[Worker] Job ${job?.id} failed with error: ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.warn(`[Worker] Error event: ${err.message}`);
  });

  return worker;
}
