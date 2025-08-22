import rateLimit from 'express-rate-limit';

const RateLimiterMiddleware = {
  // Global rate limiter for anime API
  animeApiLimiter: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // Limit each IP to 150 requests per window
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    keyGenerator: (req) => {
      return req.headers['x-forwarded-for'] || req.ip;
    },
    message: {
      status: 429,
      error: 'Too many requests, please try again later'
    }
  }),
  
  // Strict limiter for sensitive endpoints
  strictLimiter: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50,
    message: {
      status: 429,
      error: 'Too many requests from this IP, try again in an hour'
    }
  })
};

export default RateLimiterMiddleware;
