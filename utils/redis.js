import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL; // Make sure you set this in your .env

// Create a Redis client
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 5,   // retry a few times before failing
  reconnectOnError: (err) => {
    console.warn('Redis reconnectOnError:', err.message || err);
    return true; // automatically reconnect on errors
  },
  lazyConnect: true, // don't connect until first command
});

// Handle connection events
redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.warn('⚠️ Redis error:', err.message || err));
redis.on('close', () => console.warn('⚠️ Redis connection closed'));
redis.on('reconnecting', () => console.log('🔄 Redis reconnecting...'));

// Optional: try connecting immediately
(async () => {
  try {
    await redis.connect();
  } catch (err) {
    console.warn('⚠️ Initial Redis connection failed:', err.message || err);
  }
})();

export default redis;
