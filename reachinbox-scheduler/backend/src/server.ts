import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { redisClient } from './config/redis';
import { prisma } from './config/prisma';
import { checkElasticsearchHealth } from './config/elasticsearch';
import { getSmtpTransporter } from './services/smtpService';
import { ElasticsearchService } from './services/elasticsearchService';
import { ReconciliationService } from './services/reconciliationService';
import { closeEmailQueue } from './queues/emailQueue';

const server = http.createServer(app);

async function bootstrap() {
  server.listen(env.PORT, async () => {
    logger.info('====================================================');
    logger.info(` ReachInbox Email Job Scheduler API Server Started `);
    logger.info(` Port: http://localhost:${env.PORT}                 `);
    logger.info(` Bull Board Dashboard: http://localhost:${env.PORT}/admin/queues `);
    logger.info('====================================================');

    // Asynchronous background checks
    try {
      await getSmtpTransporter();
      await checkElasticsearchHealth();
      await ElasticsearchService.ensureIndex();
      await ReconciliationService.reconcilePendingEmails();
    } catch (startupErr: any) {
      logger.warn(`Startup background sync notice: ${startupErr.message}`);
    }
  });
}

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful API server shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await closeEmailQueue();
      await redisClient.quit();
      await prisma.$disconnect();
      logger.info('All connections terminated cleanly. Goodbye!');
      process.exit(0);
    } catch (err: any) {
      logger.error(`Error during shutdown cleanup: ${err.message}`);
      process.exit(1);
    }
  });

  // Force close after 10s if stuck
  setTimeout(() => {
    logger.error('Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

bootstrap().catch((err) => {
  logger.error('Fatal error during server startup:', err);
  process.exit(1);
});
