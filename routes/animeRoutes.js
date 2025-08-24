import express from 'express';
import {
  getTrendingAnime,
  searchAnime,
  getAnimeBySlug,
  getAnimeEpisodes
} from '../controllers/animeController.js';
import redis from '../utils/redis.js'; // use the Redis client

const router = express.Router();

// Optional middlewares
let apiKeyAuth = (req, res, next) => next();
let validateSearchParams = (req, res, next) => next();
let validateAnimeSlug = (req, res, next) => next();
let globalRateLimiter = (req, res, next) => next();

// Import optional middlewares if available
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

// Middleware: Cache wrapper
const cacheMiddleware = (keyPrefix) => async (req, res, next) => {
  if (!redis.status || redis.status !== 'ready') return next(); // Redis not ready

  const key = `${keyPrefix}:${req.originalUrl}`;
  try {
    const cached = await redis.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch (err) {
    console.warn('⚠️ Redis cache read error:', err.message || err);
  }

  // Override res.json to cache the response
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    try {
      await redis.set(key, JSON.stringify(data), 'EX', 3600); // cache 1 hour
    } catch (err) {
      console.warn('⚠️ Redis cache write error:', err.message || err);
    }
    return originalJson(data);
  };

  next();
};

// Apply middlewares
router.use(apiKeyAuth);
router.use(globalRateLimiter);

// Routes with caching
router.get('/trending', cacheMiddleware('trending'), getTrendingAnime);
router.get('/search', validateSearchParams, cacheMiddleware('search'), searchAnime);
router.get('/:slug', validateAnimeSlug, cacheMiddleware('anime'), getAnimeBySlug);
router.get('/:slug/episodes', validateAnimeSlug, cacheMiddleware('episodes'), getAnimeEpisodes);

export default router;
