import redis from '../utils/cache.js';

const CacheMiddleware = {
  cacheCheck: (keyPrefix, ttl = 3600) => {
    return async (req, res, next) => {
      try {
        // Generate unique cache key based on request
        const cacheKey = `${keyPrefix}:${req.originalUrl}`;
        
        // Check if cached data exists
        const cachedData = await redis.get(cacheKey);
        
        if (cachedData) {
          return res.json(JSON.parse(cachedData));
        }
        
        // Override res.json to cache response
        const originalJson = res.json;
        res.json = (body) => {
          // Cache the response (only successful responses)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            redis.setex(cacheKey, ttl, JSON.stringify(body));
          }
          return originalJson.call(res, body);
        };
        
        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next();
      }
    };
  },
  
  clearCache: (keyPattern) => {
    return async (req, res, next) => {
      try {
        const keys = await redis.keys(keyPattern);
        if (keys.length > 0) {
          await redis.del(keys);
        }
        next();
      } catch (error) {
        console.error('Cache clear error:', error);
        next();
      }
    };
  }
};

export default CacheMiddleware;
