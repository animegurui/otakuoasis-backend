import redisClient from './redisClient.js';

/**
 * Clear cache by key (slug).
 * @param {string} key - The Redis key to clear. Use "*" to flush all.
 */
export const clearCache = async (key) => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  if (key === '*') {
    // Flush entire Redis cache
    await redisClient.flushAll();
    console.log('🧹 Cleared ALL Redis cache');
  } else {
    // Delete specific key
    await redisClient.del(key);
    console.log(`🧹 Cleared cache for key: ${key}`);
  }
};
