import Redis from 'ioredis';
import logger from './logger.js';

let redis;

if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
  redis = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD || undefined,
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
  });

  redis.on('connect', () => {
    logger.info('✅ Redis connected');
  });

  redis.on('error', (error) => {
    logger.warn(`⚠️ Redis connection failed: ${error.message}. Caching disabled.`);
  });
} else {
  logger.warn('⚠️ Redis not configured. Caching disabled.');
  redis = null; // Disable Redis if not configured
}

export default redis;
