import { prisma } from '../config/prisma';
import { emailQueue, enqueueEmailJob } from '../queues/emailQueue';
import { logger } from '../utils/logger';

export class ReconciliationService {
  /**
   * Scans for pending EmailRecords in PostgreSQL that do not have an active/delayed job in BullMQ,
   * and safely re-enqueues them. This acts as our transactional outbox reconciliation mechanism.
   */
  public static async reconcilePendingEmails(): Promise<{
    scanned: number;
    reconciled: number;
    alreadyQueued: number;
  }> {
    logger.info('Starting outbox reconciliation check for pending email records...');

    let scanned = 0;
    let reconciled = 0;
    let alreadyQueued = 0;

    try {
      // Find records that are marked 'scheduled' or 'deferred'
      const pendingRecords = await prisma.emailRecord.findMany({
        where: {
          status: { in: ['scheduled', 'deferred'] }
        },
        include: {
          campaign: true,
          sender: true
        },
        take: 500
      });

      scanned = pendingRecords.length;

      for (const record of pendingRecords) {
        const jobId = `email-${record.id}`;

        try {
          const existingJob = await emailQueue.getJob(jobId);

          if (existingJob) {
            const state = await existingJob.getState();
            // If already delayed, waiting, or active, leave it alone
            if (['delayed', 'waiting', 'active'].includes(state)) {
              alreadyQueued++;
              continue;
            }
          }

          // Job is missing from queue! Re-enqueue it
          const now = new Date();
          const scheduledTime = record.scheduledTime > now ? record.scheduledTime : now;

          await enqueueEmailJob(
            {
              emailRecordId: record.id,
              campaignId: record.campaignId,
              senderId: record.senderId,
              recipientEmail: record.recipientEmail,
              subject: record.subjectSnapshot,
              body: record.bodySnapshot,
              scheduledTime: scheduledTime.toISOString(),
              idempotencyKey: record.idempotencyKey,
              attemptNumber: record.attemptCount
            },
            scheduledTime
          );

          reconciled++;
          logger.info(`Reconciled missing BullMQ job [${jobId}] for email record ${record.id}`);
        } catch (jobErr: any) {
          logger.warn(`Could not verify job state for record ${record.id}: ${jobErr.message}`);
        }
      }

      logger.info(`Reconciliation complete. Scanned: ${scanned}, Reconciled missing: ${reconciled}, Already queued: ${alreadyQueued}`);
    } catch (err: any) {
      logger.error(`Reconciliation process encountered an error: ${err.message}`);
    }

    return { scanned, reconciled, alreadyQueued };
  }
}
