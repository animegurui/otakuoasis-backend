import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import animeRoutes from './routes/animeRoutes.js';
import scrapeRoutes from './routes/scrapeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { startScheduler } from './services/scheduler.js';
import logger from './utils/logger.js';
import connectRedis from './utils/cache.js';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const PORT = process.env.PORT || 5000;

// Set Nigeria timezone (WAT - West Africa Time)
process.env.TZ = 'Africa/Lagos';
logger.info(`🌍 Timezone set to Africa/Lagos`);

// ========================
// Security Configuration
// ========================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:", "http:"], // Allow external images
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "blob:"],
      frameSrc: ["'self'", "https:"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" } // Needed for CDN images
}));

// Rate Limiting - Nigeria specific settings
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Higher limit for Nigerian users
  message: 'Too many requests, please try again later',
  keyGenerator: (req) => {
    // Prioritize X-Forwarded-For header for proxies
    return req.headers['x-forwarded-for'] || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for admin routes
    return req.path.startsWith('/api/admin');
  }
});
app.use(limiter);

// ========================
// Middleware
// ========================
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Morgan HTTP request logging with Winston
app.use(morgan('combined', { 
  stream: { 
    write: (message) => logger.info(message.trim()) 
  } 
}));

// ========================
// Database Connection
// ========================
const connectDB = async () => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: process.env.NODE_ENV !== 'production'
    });
    logger.info('🚀 MongoDB connected successfully');
    
    // Create indexes if not in production
    if (process.env.NODE_ENV !== 'production') {
      const Anime = mongoose.model('Anime');
      await Anime.createIndexes();
      logger.info('🔍 Created MongoDB indexes');
    }
  } catch (err) {
    logger.error(`❌ MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

// ========================
// Redis Cache Connection
// ========================
const setupCache = async () => {
  try {
    await connectRedis();
    logger.info('🔴 Redis connected successfully');
  } catch (err) {
    logger.error(`❌ Redis connection error: ${err.message}`);
  }
};

// ========================
// API Routes
// ========================
app.use('/api/anime', animeRoutes);
app.use('/api/scrape', scrapeRoutes);
app.use('/api/admin', adminRoutes);

// ========================
// Health Check Endpoint
// ========================
app.get('/health', (req, res) => {
  const nigeriaTime = new Date().toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    hour12: true
  });
  
  res.status(200).json({
    status: 'healthy',
    server_time: nigeriaTime,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// ========================
// Error Handling
// ========================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} not found`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  const nigeriaTime = new Date().toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    hour12: true
  });
  
  logger.error(`Error: ${err.message}`, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    stack: err.stack
  });
  
  const errorResponse = {
    success: false,
    message: err.message || 'Internal Server Error',
    timestamp: nigeriaTime
  };
  
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }
  
  res.status(err.statusCode || 500).json(errorResponse);
});

// ========================
// Server Initialization
// ========================
const startServer = async () => {
  // Connect to database first
  await connectDB();
  
  // Connect to Redis
  await setupCache();
  
  // Start server
  const server = app.listen(PORT, () => {
    const nigeriaTime = new Date().toLocaleString('en-NG', {
      timeZone: 'Africa/Lagos',
      hour12: true
    });
    
    logger.info(`🚀 Server running on port ${PORT} at ${nigeriaTime}`);
    
    // Start scheduled tasks in production
    if (process.env.NODE_ENV === 'production') {
      startScheduler();
      logger.info('⏱️ Scheduled tasks started');
    }
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.warn(`⚠️ Received ${signal}. Shutting down gracefully...`);
    
    server.close(async () => {
      try {
        // Close database connections
        await mongoose.disconnect();
        logger.info('📦 MongoDB connection closed');
        
        // Close Redis connection
        const redis = await connectRedis();
        await redis.quit();
        logger.info('🔴 Redis connection closed');
        
        process.exit(0);
      } catch (err) {
        logger.error(`❌ Error during shutdown: ${err.message}`);
        process.exit(1);
      }
    });
    
    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('⌛ Shutdown timeout. Forcing exit...');
      process.exit(1);
    }, 10000);
  };

  // Handle shutdown signals
  ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
    process.on(signal, () => shutdown(signal));
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error(`⚠️ Unhandled Rejection at: ${promise}, reason: ${reason}`);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error(`💥 Uncaught Exception: ${error.message}`);
    shutdown('uncaughtException');
  });
};

// Start the server
startServer();
