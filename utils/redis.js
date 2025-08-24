import Redis from 'ioredis';
import logger from './logger.js';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  connectTimeout: 10000,
  maxRetriesPerRequest: 3
});

// Track connection status
redis.isReady = false;

redis.on('connect', () => {
  redis.isReady = true;
  logger.info('✅ Redis connected');
});

redis.on('error', (error) => {
  redis.isReady = false;
  logger.error(`❌ Redis error: ${error.message}`);
});

redis.on('end', () => {
  redis.isReady = false;
  logger.warn('⚠️ Redis connection closed');
});

export default redis;
