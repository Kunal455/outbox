import Redis, { RedisOptions } from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

const redisConfig: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    // Reconnect with exponential backoff capped at 3 seconds
    const delay = Math.min(times * 100, 3000);
    return delay;
  }
};

export function createRedisClient(): Redis {
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined) {
    const RedisMock = require('ioredis-mock');
    return new RedisMock() as Redis;
  }

  const client = new Redis(redisConfig);

  client.on('connect', () => {
    logger.info(`Redis connecting to ${env.REDIS_HOST}:${env.REDIS_PORT}`);
  });

  client.on('ready', () => {
    logger.info('Redis connection established and ready');
  });

  client.on('error', (err) => {
    logger.warn(`Redis connection event: ${err.message}`);
  });

  return client;
}

// Default singleton Redis instance for rate limiting and general caching
export const redisClient = createRedisClient();

