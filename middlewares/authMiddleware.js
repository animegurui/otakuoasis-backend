import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

export const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  // 🔹 Allow bypass in development or if API_KEY is not set
  if (process.env.NODE_ENV === 'development' || !process.env.API_KEY) {
    return next();
  }

  if (!apiKey) {
    logger.warn('API key missing');
    return res.status(401).json({ 
      success: false, 
      message: 'API key required' 
    });
  }

  if (apiKey !== process.env.API_KEY) {
    logger.warn(`Invalid API key: ${apiKey}`);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid API key' 
    });
  }

  next();
};

// Admin-only routes
export const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Admin auth token missing');
    return res.status(401).json({ 
      success: false, 
      message: 'Admin token required' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      logger.warn(`Unauthorized admin access attempt by ${decoded.userId}`);
      return res.status(403).json({ 
        success: false, 
        message: 'Admin privileges required' 
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.error(`Admin token verification failed: ${error.message}`);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

// User routes
export const userAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('User auth token missing');
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication token required' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error(`User token verification failed: ${error.message}`);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};
