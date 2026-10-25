import { Queue } from 'bullmq';
import { redisClient } from '../config/redis';
import { EmailJobData } from '../types';
import { logger } from '../utils/logger';

export const EMAIL_QUEUE_NAME = 'reachinbox-email-queue';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed job metadata for 24h for dashboard
      count: 5000
    },
    removeOnFail: {
      age: 7 * 24 * 3600 // Keep failed jobs for 7 days
    }
  }
});

emailQueue.on('error', (err) => {
  logger.warn(`Email Queue error event: ${err.message}`);
});

/**
 * Enqueue an email as a BullMQ delayed job using a stable Job ID.
 */
export async function enqueueEmailJob(data: EmailJobData, scheduledTime: Date): Promise<string> {
  const now = Date.now();
  const scheduledMs = scheduledTime.getTime();
  const delay = Math.max(0, scheduledMs - now);

  // Use stable job identifier to prevent duplicates in Redis
  const jobId = `email-${data.emailRecordId}`;

  const job = await emailQueue.add(
    'send-email',
    data,
    {
      jobId,
      delay
    }
  );

  logger.info(`Delayed job queued [${jobId}] for recipient ${data.recipientEmail}. Delay: ${delay}ms (${new Date(scheduledMs).toISOString()})`);
  return job.id || jobId;
}

/**
 * Gracefully close the queue
 */
export async function closeEmailQueue(): Promise<void> {
  try {
    await emailQueue.close();
    logger.info('Email queue closed successfully.');
  } catch (err: any) {
    logger.error(`Error closing email queue: ${err.message}`);
  }
}
