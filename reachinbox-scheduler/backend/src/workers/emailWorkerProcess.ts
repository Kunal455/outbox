import { createEmailWorker } from './emailWorker';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';
import { prisma } from '../config/prisma';

logger.info('====================================================');
logger.info('   ReachInbox Background Email Worker Process       ');
logger.info('====================================================');
logger.info(`Worker Concurrency: ${env.WORKER_CONCURRENCY}`);
logger.info(`Default Min Delay: ${env.MIN_DELAY_MS}ms`);
logger.info(`Default Hourly Limit Per Sender: ${env.MAX_EMAILS_PER_HOUR_PER_SENDER}`);

const worker = createEmailWorker();

async function handleShutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down worker gracefully...`);
  try {
    await worker.close();
    await redisClient.quit();
    await prisma.$disconnect();
    logger.info('Worker process terminated cleanly.');
    process.exit(0);
  } catch (err: any) {
    logger.error(`Error during graceful worker shutdown: ${err.message}`);
    process.exit(1);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
