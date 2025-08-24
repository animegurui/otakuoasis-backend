import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const redis = new Redis(process.env.REDIS_URL, {
  tls: { rejectUnauthorized: false }, // Required for cloud Redis
  maxRetriesPerRequest: 5,            // Allow more retries
  connectTimeout: 10000,              // 10s timeout
  reconnectOnError: (err) => {
    console.warn('Redis reconnectOnError:', err.message);
    return true;
  },
});

redis.on('connect', () => console.info('✅ Redis connected'));
redis.on('error', (err) => console.warn('⚠️ Redis connection failed:', err.message));

export default redis;
