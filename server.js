import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import redis from './utils/redis.js'; // Redis client

dotenv.config();
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// --- Optional: morgan logging ---
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
  console.warn('⚠️ Morgan import failed', err.message);
}
app.use(morganMiddleware);

// --- MongoDB connection ---
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err.message || err));
} else {
  console.warn('⚠️ MONGO_URI not set — skipping MongoDB connection');
}

// --- Redis readiness check ---
async function checkRedis() {
  try {
    await redis.ping();
    console.log('✅ Redis connected');
  } catch (err) {
    console.warn('⚠️ Redis connection warning:', err.message || err);
    // Do not throw — allow server to run even if Redis is temporarily unavailable
  }
}
await checkRedis();

// --- Mount anime routes ---
try {
  const animeRoutesModule = await import('./routes/animeRoutes.js').catch(() => null);
  const animeRoutes = animeRoutesModule && (animeRoutesModule.default || animeRoutesModule);
  if (animeRoutes) {
    app.use('/api/anime', animeRoutes);
    console.log('✅ Mounted /api/anime routes');
  } else {
    console.warn('⚠️ ./routes/animeRoutes.js not found — /api/anime routes not mounted');
  }
} catch (err) {
  console.warn('⚠️ Error loading animeRoutes:', err.message || err);
}

// --- Cache management routes ---
try {
  const cacheUtilsModule = await import('./utils/cacheUtils.js').catch(() => null);
  const { clearCache } = cacheUtilsModule || {};
  if (typeof clearCache === 'function') {
    app.delete('/cache/:slug', async (req, res) => {
      try {
        await clearCache(req.params.slug);
        res.json({ message: `Cache cleared for ${req.params.slug}` });
      } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
      }
    });

    app.delete('/cache', async (req, res) => {
      try {
        await clearCache('*');
        res.json({ message: 'All cache cleared' });
      } catch (err) {
        res.status(500).json({ error: err.message || String(err) });
      }
    });

    console.log('✅ Cache management routes added');
  } else {
    console.warn('⚠️ clearCache not found — cache routes not added');
  }
} catch (err) {
  console.warn('⚠️ Error loading cacheUtils:', err.message || err);
}

// --- System endpoints ---
app.get('/ready', (req, res) => {
  res.json({ status: 'ready', uptime: process.uptime(), timestamp: new Date() });
});

app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: new Date(),
    services: { mongo: 'unknown', redis: 'unknown' }
  };

  // MongoDB health
  health.services.mongo = mongoose.connection.readyState === 1 ? 'up' : 'down';

  // Redis health
  try {
    await redis.ping();
    health.services.redis = 'up';
  } catch {
    health.services.redis = 'down';
  }

  const statusCode = health.services.mongo === 'up' && health.services.redis === 'up' ? 200 : 500;
  res.status(statusCode).json(health);
});

// Root route
app.get('/', (req, res) => res.send('Backend is running 🚀'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err?.message || 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

export default app;
