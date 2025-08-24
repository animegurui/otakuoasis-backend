import express from 'express';
import redis from '../config/redis.js'; // Make sure your Redis instance is exported here
import {
  getTrendingAnime,
  searchAnime,
  getAnimeBySlug,
  getAnimeEpisodes
} from '../controllers/animeController.js';

const router = express.Router();

// Optional middlewares with fallback
let apiKeyAuth = (req, res, next) => next();
let validateSearchParams = (req, res, next) => next();
let validateAnimeSlug = (req, res, next) => next();
let globalRateLimiter = (req, res, next) => next();

// Dynamic imports for middlewares
try {
  const mod = await import('../middlewares/authMiddleware.js').catch(() => null);
  if (mod?.apiKeyAuth) apiKeyAuth = mod.apiKeyAuth;
} catch {}
try {
  const mod = await import('../middlewares/validationMiddleware.js').catch(() => null);
  if (mod?.validateSearchParams) validateSearchParams = mod.validateSearchParams;
  if (mod?.validateAnimeSlug) validateAnimeSlug = mod.validateAnimeSlug;
} catch {}
try {
  const mod = await import('../middlewares/rateLimiter.js').catch(() => null);
  if (mod?.globalRateLimiter) globalRateLimiter = mod.globalRateLimiter;
} catch {}

// Redis caching middleware factory
const cacheMiddleware = (keyPrefix) => async (req, res, next) => {
  if (!redis || !redis.status || redis.status !== 'ready') {
    console.warn(`⚠️ Redis not ready — skipping cache for ${keyPrefix}`);
    return next();
  }

  const cacheKey = `${keyPrefix}:${req.originalUrl}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.info(`✅ Cache hit for ${cacheKey}`);
      return res.json(JSON.parse(cached));
    }
  } catch (err) {
    console.warn(`⚠️ Redis cache error for ${cacheKey}: ${err.message}`);
  }

  // Override res.json to store response in Redis
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(body)); // 5 min cache
    } catch (err) {
      console.warn(`⚠️ Failed to set Redis cache: ${err.message}`);
    }
    return originalJson(body);
  };

  next();
};

// Apply global middlewares
router.use(apiKeyAuth);
router.use(globalRateLimiter);

// Routes with caching
router.get('/trending', cacheMiddleware('trending'), getTrendingAnime);
router.get('/search', validateSearchParams, cacheMiddleware('search'), searchAnime);
router.get('/:slug', validateAnimeSlug, cacheMiddleware('anime'), getAnimeBySlug);
router.get('/:slug/episodes', validateAnimeSlug, cacheMiddleware('episodes'), getAnimeEpisodes);

export default router;
