import logger from '../utils/logger.js';

export const validateSearchParams = (req, res, next) => {
  const { q: query } = req.query;
  
  if (!query || query.trim().length < 3) {
    logger.warn('Invalid search query');
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 3 characters'
    });
  }
  
  next();
};

export const validateScrapeParams = (req, res, next) => {
  const { source, slug, episode } = req.params;
  
  if (!slug || typeof slug !== 'string') {
    logger.warn('Invalid scrape slug parameter');
    return res.status(400).json({
      success: false,
      message: 'Invalid anime identifier'
    });
  }
  
  if (episode && isNaN(Number(episode))) {
    logger.warn('Invalid episode number format');
    return res.status(400).json({
      success: false,
      message: 'Episode number must be numeric'
    });
  }
  
  next();
};

export const validateAnimeSlug = (req, res, next) => {
  const { slug } = req.params;
  
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    logger.warn(`Invalid anime slug: ${slug}`);
    return res.status(400).json({
      success: false,
      message: 'Invalid anime identifier format'
    });
  }
  
  next();
};
 
