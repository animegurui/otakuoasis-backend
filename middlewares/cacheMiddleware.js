import redis from '../utils/redis.js';
import logger from '../utils/logger.js';

const CACHE_TTL = 1800; // 30 minutes

export const cacheMiddleware = (prefix) => {
  return async (req, res, next) => {
    if (!redis) {
      return next(); // Skip caching if Redis is not available
    }

    const key = `${prefix}:${req.originalUrl || req.url}`;

    try {
      const cachedData = await redis.get(key);

      if (cachedData) {
        logger.debug(`Cache hit for ${key}`);
        return res.json(JSON.parse(cachedData));
      }

      logger.debug(`Cache miss for ${key}`);
      res.originalSend = res.json;
      res.json = (body) => {
        if (res.statusCode === 200) {
          redis.setex(key, CACHE_TTL, JSON.stringify(body)).catch(err => {
            logger.warn(`Failed to set cache for ${key}: ${err.message}`);
          });
        }
        res.originalSend(body);
      };

      next();
    } catch (error) {
      logger.warn(`Cache error for ${key}: ${error.message}`);
      next(); // Continue without caching
    }
  };
};

export const clearCache = async (keyPattern) => {
  if (!redis) return; // Skip if Redis is not configured

  try {
    const keys = await redis.keys(keyPattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Cleared cache for pattern: ${keyPattern}`);
    }
  } catch (error) {
    logger.warn(`Cache clear error for ${keyPattern}: ${error.message}`);
  }
};
