import { validationResult } from 'express-validator';

// Validator for search parameters
export const validateSearchParams = (req, res, next) => {
  // Check if query parameter exists
  if (!req.query.q && !req.query.genre) {
    return res.status(400).json({
      success: false,
      message: 'Search query (q) or genre is required'
    });
  }

  // Validate numeric parameters
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  next();
};

// Validator for slug parameters
export const validateSlugParam = (req, res, next) => {
  const { slug, animeSlug } = req.params;
  
  // Validate slug format (alphanumeric with hyphens)
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  
  if (slug && !slugRegex.test(slug)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid anime slug format'
    });
  }
  
  if (animeSlug && !slugRegex.test(animeSlug)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid anime slug format'
    });
  }
  
  next();
};

// Validator for episode number
export const validateEpisodeNumber = (req, res, next) => {
  const episodeNumber = parseInt(req.params.episodeNumber);
  
  if (isNaN(episodeNumber) || episodeNumber <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Episode number must be a positive integer'
    });
  }
  
  req.params.episodeNumber = episodeNumber; // Ensure number type
  next();
};
