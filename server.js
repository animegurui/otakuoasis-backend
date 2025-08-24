import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();
const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// --- Optional: morgan logging (won't crash if not installed) ---
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

// --- Optional: MongoDB (connect only if MONGO_URI provided) ---
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log('✅ Connected to MongoDB');
  }).catch(err => {
    console.error('❌ MongoDB connection error:', err.message || err);
    // don't exit so non-DB routes remain available for testing
  });
} else {
  console.warn('⚠️ MONGO_URI not set — skipping MongoDB connection');
}

// --- Optional: Mount anime routes if file exists ---
// IMPORTANT: server.js lives in src/, so routes should be in src/routes/
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

// --- Optional: cache clear endpoints if cache util exists ---
// cache utils expected at src/utils/cacheUtils.js
try {
  const cacheUtilsModule = await import('./utils/cacheUtils.js').catch(() => null);
  const { clearCache } = cacheUtilsModule || {};
  if (typeof clearCache === 'function') {
    app.delete('/cache/:slug', async (req, res) => {
      try {
        const slug = req.params.slug;
        await clearCache(slug);
        res.json({ message: `Cache cleared for ${slug}` });
      } catch (error) {
        res.status(500).json({ error: error.message || String(error) });
      }
    });

    app.delete('/cache', async (req, res) => {
      try {
        await clearCache('*');
        res.json({ message: 'All cache cleared' });
      } catch (error) {
        res.status(500).json({ error: error.message || String(error) });
      }
    });

    console.log('✅ Cache management routes added');
  } else {
    console.warn('⚠️ clearCache not found — cache routes not added');
  }
} catch (err) {
  console.warn('⚠️ Error loading cacheUtils:', err.message || err);
}

// Health route
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

// Global error handler (safety)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err?.message || 'Internal Server Error' });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

export default app;
