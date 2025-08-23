import express from 'express';
import ScrapeController from '../controllers/scrapeController.js';
import { adminAuth, apiKeyAuth } from '../middlewares/authMiddleware.js';
import { validateScrapeParams, validateAnimeSlug } from '../middlewares/validationMiddleware.js';
import logger from '../utils/logger.js';
import CacheMiddleware from '../middlewares/cacheMiddleware.js';

const router = express.Router();

// ==============================================
// Public Scraping Routes (API Key Required)
// ==============================================

/**
 * @route   GET /api/scrape/trending
 * @desc    Scrape trending anime from sources
 * @access  Public (Requires API Key)
 */
router.get(
  '/trending',
  apiKeyAuth,
  CacheMiddleware.cacheCheck('scrape-trending', 60 * 10), // Cache for 10 minutes
  async (req, res) => {
    try {
      const { region = 'NG', limit = 25 } = req.query;
      logger.info(`Scraping trending anime for region: ${region}`);
      
      const results = await ScrapeController.scrapeTrending(region, parseInt(limit));
      
      res.json({
        success: true,
        region,
        scrapedAt: new Date().toISOString(),
        sources: results.sources,
        data: results.data
      });
    } catch (error) {
      logger.error(`Trending scrape error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to scrape trending anime'
      });
    }
  }
);

/**
 * @route   GET /api/scrape/search
 * @desc    Scrape search results from anime sources
 * @access  Public (Requires API Key)
 */
router.get(
  '/search',
  apiKeyAuth,
  validateScrapeParams,
  async (req, res) => {
    try {
      const { q: query, page = 1, source } = req.query;
      logger.info(`Scraping search for: "${query}"`);
      
      const results = await ScrapeController.scrapeSearch(query, parseInt(page), source);
      
      res.json({
        success: true,
        query,
        page,
        source: results.source,
        hasMore: results.hasMore,
        data: results.data
      });
    } catch (error) {
      logger.error(`Search scrape error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Search scrape failed'
      });
    }
  }
);

/**
 * @route   GET /api/scrape/anime/:slug
 * @desc    Scrape anime details from sources
 * @access  Public (Requires API Key)
 */
router.get(
  '/anime/:slug',
  apiKeyAuth,
  validateAnimeSlug,
  async (req, res) => {
    try {
      const { slug } = req.params;
      const { source } = req.query;
      logger.info(`Scraping anime details for: ${slug}`);
      
      const anime = await ScrapeController.scrapeAnimeDetails(slug, source);
      
      res.json({
        success: true,
        slug,
        source: anime.source,
        data: anime
      });
    } catch (error) {
      logger.error(`Anime details scrape error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to scrape anime details'
      });
    }
  }
);

/**
 * @route   GET /api/scrape/anime/:slug/episodes
 * @desc    Scrape episodes for an anime
 * @access  Public (Requires API Key)
 */
router.get(
  '/anime/:slug/episodes',
  apiKeyAuth,
  validateAnimeSlug,
  async (req, res) => {
    try {
      const { slug } = req.params;
      const { source } = req.query;
      logger.info(`Scraping episodes for: ${slug}`);
      
      const episodes = await ScrapeController.scrapeEpisodes(slug, source);
      
      res.json({
        success: true,
        slug,
        source: episodes.source,
        count: episodes.data.length,
        data: episodes.data
      });
    } catch (error) {
      logger.error(`Episodes scrape error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to scrape episodes'
      });
    }
  }
);

/**
 * @route   GET /api/scrape/anime/:slug/episodes/:episodeNumber/sources
 * @desc    Scrape video sources for an episode
 * @access  Public (Requires API Key)
 */
router.get(
  '/anime/:slug/episodes/:episodeNumber/sources',
  apiKeyAuth,
  validateAnimeSlug,
  async (req, res) => {
    try {
      const { slug, episodeNumber } = req.params;
      const { source, server } = req.query;
      logger.info(`Scraping sources for ${slug} episode ${episodeNumber}`);
      
      const sources = await ScrapeController.scrapeEpisodeSources(
        slug, 
        parseInt(episodeNumber), 
        source,
        server
      );
      
      res.json({
        success: true,
        slug,
        episodeNumber,
        source: sources.source,
        server: sources.server,
        data: sources.data
      });
    } catch (error) {
      logger.error(`Sources scrape error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to scrape video sources'
      });
    }
  }
);

// ==============================================
// Admin Scraping Routes (Require Admin Privileges)
// ==============================================

/**
 * @route   POST /api/scrape/jobs
 * @desc    Create a new scraping job (admin only)
 * @access  Private (Admin)
 */
router.post(
  '/jobs',
  adminAuth,
  async (req, res) => {
    try {
      const { type, target, priority = 'normal' } = req.body;
      logger.info(`Creating scrape job: ${type} for ${target}`);
      
      const job = await ScrapeController.createScrapeJob(type, target, priority);
      
      res.status(201).json({
        success: true,
        message: 'Scrape job created',
        jobId: job.id,
        status: job.status
      });
    } catch (error) {
      logger.error(`Job creation error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to create scrape job'
      });
    }
  }
);

/**
 * @route   GET /api/scrape/jobs
 * @desc    Get all scraping jobs (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/jobs',
  adminAuth,
  async (req, res) => {
    try {
      const { status, limit = 50 } = req.query;
      logger.info(`Fetching scrape jobs with status: ${status || 'all'}`);
      
      const jobs = await ScrapeController.getScrapeJobs(status, parseInt(limit));
      
      res.json({
        success: true,
        count: jobs.length,
        data: jobs
      });
    } catch (error) {
      logger.error(`Jobs fetch error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch scrape jobs'
      });
    }
  }
);

/**
 * @route   GET /api/scrape/jobs/:id
 * @desc    Get scraping job details (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/jobs/:id',
  adminAuth,
  async (req, res) => {
    try {
      const { id } = req.params;
      logger.info(`Fetching scrape job: ${id}`);
      
      const job = await ScrapeController.getScrapeJobById(id);
      
      res.json({
        success: true,
        data: job
      });
    } catch (error) {
      logger.error(`Job fetch error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch scrape job'
      });
    }
  }
);

/**
 * @route   POST /api/scrape/proxies/rotate
 * @desc    Rotate scraping proxies (admin only)
 * @access  Private (Admin)
 */
router.post(
  '/proxies/rotate',
  adminAuth,
  async (req, res) => {
    try {
      logger.info('Rotating scraping proxies');
      const result = await ScrapeController.rotateProxies();
      
      res.json({
        success: true,
        message: 'Proxies rotated',
        newProxies: result.proxies,
        removedProxies: result.removed
      });
    } catch (error) {
      logger.error(`Proxy rotation error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to rotate proxies'
      });
    }
  }
);

/**
 * @route   GET /api/scrape/status
 * @desc    Get scraping system status (admin only)
 * @access  Private (Admin)
 */
router.get(
  '/status',
  adminAuth,
  async (req, res) => {
    try {
      logger.info('Fetching scraping system status');
      const status = await ScrapeController.getScrapeSystemStatus();
      
      res.json({
        success: true,
        status: {
          ...status,
          time: new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
        }
      });
    } catch (error) {
      logger.error(`Status fetch error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system status'
      });
    }
  }
);

export default router;
