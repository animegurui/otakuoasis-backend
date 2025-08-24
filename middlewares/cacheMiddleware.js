import redis from '../utils/redis.js';
import logger from '../utils/logger.js';

const CACHE_TTL = 1800; // 30 minutes

export const cacheMiddleware = (prefix) => {
  return async (req, res, next) => {
    // Skip caching if Redis is not ready
    if (!redis?.isReady) {
      logger.warn('⚠️ Redis not ready — skipping cache lookup');
      return next();
    }

    const key = `${prefix}:${req.originalUrl || req.url}`;
    
    try {
      const cachedData = await redis.get(key);
      
      if (cachedData) {
        logger.debug(`✅ Cache hit for ${key}`);
        return res.json(JSON.parse(cachedData));
      }
      
      logger.debug(`❌ Cache miss for ${key}`);
      res.originalSend = res.json;
      res.json = (body) => {
        if (res.statusCode === 200) {
          redis.setex(key, CACHE_TTL, JSON.stringify(body));
        }
        res.originalSend(body);
      };
      next();
    } catch (error) {
      logger.error(`Cache error: ${error.message}`);
      next();
    }
  };
};

export const clearCache = async (keyPattern) => {
  if (!redis?.isReady) {
    logger.warn('⚠️ Redis not ready — skipping cache clear');
    return;
  }

  try {
    const keys = await redis.keys(keyPattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`🗑️ Cleared cache for pattern: ${keyPattern}`);
    }
  } catch (error) {
    logger.error(`Cache clear error: ${error.message}`);
  }
};
