import express from 'express';
import {
  getTrendingAnime,
  searchAnime,
  getAnimeBySlug,
  getAnimeEpisodes
} from '../controllers/animeController.js';
import { apiKeyAuth } from '../middlewares/authMiddleware.js';
import { validateSearchParams, validateAnimeSlug } from '../middlewares/validationMiddleware.js';
import { cacheMiddleware } from '../middlewares/cacheMiddleware.js';
import { globalRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply API key auth to all routes
router.use(apiKeyAuth);
router.use(globalRateLimiter);

// Trending anime
router.get('/trending', 
  cacheMiddleware('trending'),
  getTrendingAnime
);

// Search anime
router.get('/search', 
  validateSearchParams,
  cacheMiddleware('search'),
  searchAnime
);

// Get anime by slug
router.get('/:slug', 
  validateAnimeSlug,
  cacheMiddleware('anime'),
  getAnimeBySlug
);

// Get anime episodes
router.get('/:slug/episodes', 
  validateAnimeSlug,
  cacheMiddleware('episodes'),
  getAnimeEpisodes
);

export default router;
 
