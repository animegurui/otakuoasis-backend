import express from 'express';
import {
  getTrendingAnime,
  searchAnime,
  getAnimeBySlug,
  getAnimeEpisodes
} from '../controllers/animeController.js';

const router = express.Router();

// Try to import optional middlewares
let apiKeyAuth = (req, res, next) => next();
let validateSearchParams = (req, res, next) => next();
let validateAnimeSlug = (req, res, next) => next();
let cacheMiddleware = () => (req, res, next) => next();
let globalRateLimiter = (req, res, next) => next();

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
  const mod = await import('../middlewares/cacheMiddleware.js').catch(() => null);
  if (mod?.cacheMiddleware) cacheMiddleware = mod.cacheMiddleware;
} catch {}

try {
  const mod = await import('../middlewares/rateLimiter.js').catch(() => null);
  if (mod?.globalRateLimiter) globalRateLimiter = mod.globalRateLimiter;
} catch {}

// Apply middlewares
router.use(apiKeyAuth);
router.use(globalRateLimiter);

// Routes
router.get('/trending', cacheMiddleware('trending'), getTrendingAnime);
router.get('/search', validateSearchParams, cacheMiddleware('search'), searchAnime);
router.get('/:slug', validateAnimeSlug, cacheMiddleware('anime'), getAnimeBySlug);
router.get('/:slug/episodes', validateAnimeSlug, cacheMiddleware('episodes'), getAnimeEpisodes);

export default router;
