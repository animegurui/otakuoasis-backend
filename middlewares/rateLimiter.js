import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded by ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later'
    });
  }
});

export const scrapeRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Scrape rate limit exceeded by ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many scrape requests, please try again later'
    });
  }
});

export const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Admin endpoint rate limit exceeded by ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many admin requests, please try again later'
    });
  }
});
 
