import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  var prismaInstance: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.prismaInstance ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' }
          ]
        : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  global.prismaInstance = prisma;
}

prisma.$connect()
  .then(() => logger.info('PostgreSQL connected successfully via Prisma'))
  .catch((err) => logger.warn(`PostgreSQL connection notice (will connect on demand or when Docker container is started): ${err.message}`));
