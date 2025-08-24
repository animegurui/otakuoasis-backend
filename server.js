import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Routes & utils (adjust paths if your project layout differs)
import animeRoutes from './src/routes/animeRoutes.js';
import { clearCache } from './src/utils/cacheUtils.js';

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Try to load morgan (optional) using dynamic import so missing package won't crash
let morganMiddleware = (req, res, next) => next();
try {
  const morganModule = await import('morgan').catch(() => null);
  const morgan = morganModule && (morganModule.default || morganModule);
  if (morgan) {
    morganMiddleware = morgan('dev');
    console.log('✅ Morgan loaded for request logging');
  } else {
    console.warn('⚠️ Morgan not installed, skipping request logging');
  }
} catch (err) {
  console.warn('⚠️ Morgan import failed, skipping request logging', err.message);
}
app.use(morganMiddleware);

// Connect to MongoDB if MONGO_URI is present
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log('✅ Connected to MongoDB');
  }).catch(err => {
    console.error('❌ MongoDB connection error:', err);
    // NOTE: not exiting so you can still test routes that don't require DB
  });
} else {
  console.warn('⚠️ MONGO_URI not set — skipping MongoDB connection');
}

// Health / root route
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

// Mount anime routes (this makes /api/anime/trending work if animeRoutes exists)
app.use('/api/anime', animeRoutes);

// Cache management routes (uses your clearCache utility)
app.delete('/cache/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    await clearCache(slug);
    res.json({ message: `Cache cleared for ${slug}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/cache', async (req, res) => {
  try {
    await clearCache('*');
    res.json({ message: 'All cache cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

export default app;
