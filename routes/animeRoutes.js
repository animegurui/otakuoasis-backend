import express from 'express';
import AnimeController from '../controllers/animeController.js';
import CacheMiddleware from '../middlewares/cacheMiddleware.js';
import RateLimiterMiddleware from '../middlewares/rateLimiterMiddleware.js';
import { validateSearchParams, validateSlugParam } from '../middlewares/validationMiddleware.js';

const router = express.Router();

// Apply rate limiting to all routes
router.use(RateLimiterMiddleware.animeApiLimiter);

/**
 * @swagger
 * /api/anime/trending:
 *   get:
 *     summary: Get trending anime
 *     description: Returns a list of currently trending anime series
 *     tags: [Anime]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: List of trending anime
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Anime'
 *       500:
 *         description: Server error
 */
router.get(
  '/trending',
  CacheMiddleware.cacheCheck('trending', 60 * 15), // Cache for 15 minutes
  AnimeController.getTrendingAnime
);

/**
 * @swagger
 * /api/anime/search:
 *   get:
 *     summary: Search anime
 *     description: Search anime by title, genre, or other criteria
 *     tags: [Anime]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by release year
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Filter by genre (comma separated)
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Anime'
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *       400:
 *         description: Invalid search parameters
 *       404:
 *         description: No results found
 *       500:
 *         description: Server error
 */
router.get(
  '/search',
  validateSearchParams,
  CacheMiddleware.cacheCheck('search', 60 * 60), // Cache for 1 hour
  AnimeController.searchAnime
);

/**
 * @swagger
 * /api/anime/{slug}:
 *   get:
 *     summary: Get anime details
 *     description: Get detailed information about a specific anime series
 *     tags: [Anime]
 *     parameters:
 *       - in: path
 *         name: slug
 *         schema:
 *           type: string
 *         required: true
 *         description: Anime slug (URL-friendly identifier)
 *     responses:
 *       200:
 *         description: Anime details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnimeDetails'
 *       404:
 *         description: Anime not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:slug',
  validateSlugParam,
  CacheMiddleware.cacheCheck('anime-details', 60 * 60 * 24), // Cache for 24 hours
  AnimeController.getAnimeBySlug
);

/**
 * @swagger
 * /api/anime/{animeSlug}/episodes/{episodeNumber}/sources:
 *   get:
 *     summary: Get episode sources
 *     description: Get streaming sources for a specific anime episode
 *     tags: [Anime]
 *     parameters:
 *       - in: path
 *         name: animeSlug
 *         schema:
 *           type: string
 *         required: true
 *         description: Anime slug
 *       - in: path
 *         name: episodeNumber
 *         schema:
 *           type: integer
 *         required: true
 *         description: Episode number
 *       - in: query
 *         name: server
 *         schema:
 *           type: string
 *           enum: [gogo, vidstream, mp4upload]
 *         description: Preferred streaming server
 *     responses:
 *       200:
 *         description: Episode streaming sources
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VideoSource'
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: Episode not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:animeSlug/episodes/:episodeNumber/sources',
  validateSlugParam,
  CacheMiddleware.cacheCheck('episode-sources', 60 * 60 * 2), // Cache for 2 hours
  AnimeController.getEpisodeSources
);

export default router;
