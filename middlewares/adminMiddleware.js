import { NIGERIA_CONFIG } from '../config/nigeriaConfig.js';
import logger from '../utils/logger.js';

export const validateAdminToken = (req, res, next) => {
  const adminToken = req.headers['x-admin-token'];
  
  if (!adminToken) {
    logger.warn('Admin token missing');
    return res.status(401).json({
      success: false,
      message: 'Admin token required'
    });
  }
  
  if (adminToken !== process.env.ADMIN_TOKEN) {
    logger.warn('Invalid admin token');
    return res.status(403).json({
      success: false,
      message: 'Invalid admin token'
    });
  }
  
  next();
};

export const logAdminAction = (action) => {
  return (req, res, next) => {
    const nigeriaTime = new Date().toLocaleString('en-NG', {
      timeZone: 'Africa/Lagos'
    });
    
    logger.info(`ADMIN ACTION: ${action} by ${req.user?.userId || 'system'} at ${nigeriaTime}`, {
      action,
      user: req.user?.userId || 'system',
      ip: req.ip,
      method: req.method,
      url: req.originalUrl
    });
    
    next();
  };
};
 
