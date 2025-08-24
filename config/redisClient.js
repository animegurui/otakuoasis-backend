import Redis from 'ioredis';

let redis = null;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);

  redis.on('connect', () => {
    console.log('✅ Connected to Redis');
  });

  redis.on('error', (err) => {
    console.error('❌ Redis error:', err);
  });
} else {
  console.warn('⚠️ Redis is disabled (no REDIS_URL set)');
}

export default redis;
