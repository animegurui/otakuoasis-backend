import express from 'express';
import {
  getTrendingAnime,
  searchAnime,
  getAnimeBySlug,
  getAnimeEpisodes
} from '../controllers/animeController.js';
import redis from '../config/redis.js';

const router = express.Router();

// Middleware placeholders
let apiKeyAuth = (req, res, next) => next();
let validateSearchParams = (req, res, next) => next();
let validateAnimeSlug = (req, res, next) => next();
let globalRateLimiter = (req, res, next) => next();

// Optional middlewares
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

// Apply middlewares
router.use(apiKeyAuth);
router.use(globalRateLimiter);

// Cache middleware using Redis
const cacheMiddleware = (keyPrefix) => async (req, res, next) => {
  if (!redis || redis.status !== 'ready') {
    console.warn(`⚠️ Redis not ready — skipping cache for ${keyPrefix}`);
    return next();
  }

  const cacheKey = `${keyPrefix}:${req.originalUrl}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      redis.set(cacheKey, JSON.stringify(data), 'EX', 3600); // 1 hour cache
      return originalJson(data);
    };
    next();
  } catch (err) {
    console.warn(`⚠️ Cache error for ${keyPrefix}:${req.originalUrl}`, err.message);
    next();
  }
};

// Routes
router.get('/trending', cacheMiddleware('trending'), getTrendingAnime);
router.get('/search', validateSearchParams, cacheMiddleware('search'), searchAnime);
router.get('/:slug', validateAnimeSlug, cacheMiddleware('anime'), getAnimeBySlug);
router.get('/:slug/episodes', validateAnimeSlug, cacheMiddleware('episodes'), getAnimeEpisodes);

export default router;
