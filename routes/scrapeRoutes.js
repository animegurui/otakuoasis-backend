import express from 'express';
import {
  scrapeTrending,
  scrapeSearch,
  scrapeAnimeDetails,
  scrapeEpisodes,
  scrapeEpisodeSources,
  createScrapeJob,
  getScrapeJobs,
  getScrapeJobById,
  rotateProxies,
  getScrapeSystemStatus
} from '../controllers/scrapeController.js';
import { apiKeyAuth, adminAuth } from '../middlewares/authMiddleware.js';
import { validateScrapeParams } from '../middlewares/validationMiddleware.js';
import { scrapeRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply API key auth to all routes
router.use(apiKeyAuth);
router.use(scrapeRateLimiter);

// Public scrape endpoints
router.get('/trending', scrapeTrending);
router.get('/search', scrapeSearch);
router.get('/anime/:slug', validateScrapeParams, scrapeAnimeDetails);
router.get('/episodes/:slug', validateScrapeParams, scrapeEpisodes);
router.get('/sources/:slug/:episode', validateScrapeParams, scrapeEpisodeSources);

// Admin-only endpoints
router.use(adminAuth);
router.post('/jobs', createScrapeJob);
router.get('/jobs', getScrapeJobs);
router.get('/jobs/:id', getScrapeJobById);
router.post('/proxies/rotate', rotateProxies);
router.get('/status', getScrapeSystemStatus);

export default router;
 
