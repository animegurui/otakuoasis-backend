import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import animeRoutes from './routes/animeRoutes.js';
import scrapeRoutes from './routes/scrapeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { startScheduler } from './services/scheduler.js';
import logger from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => logger.error(`MongoDB connection error: ${err.message}`));

// Routes
app.use('/api/anime', animeRoutes);
app.use('/api/scrape', scrapeRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Anime API is running' });
});

// Start scheduler
startScheduler();

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
 
