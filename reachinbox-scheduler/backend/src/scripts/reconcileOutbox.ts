import { ReconciliationService } from '../services/reconciliationService';
import { prisma } from '../config/prisma';
import { redisClient } from '../config/redis';
import { closeEmailQueue } from '../queues/emailQueue';
import { logger } from '../utils/logger';

async function run() {
  logger.info('Executing manual outbox reconciliation CLI...');
  const result = await ReconciliationService.reconcilePendingEmails();
  logger.info('Reconciliation CLI finished:', result);
  await closeEmailQueue();
  await redisClient.quit();
  await prisma.$disconnect();
  process.exit(0);
}

run().catch((err) => {
  logger.error('Error running reconciliation script:', err);
  process.exit(1);
});
