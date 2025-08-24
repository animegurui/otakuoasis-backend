import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();
const app = express();

// Middleware
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
  }
} catch (err) {
  console.warn('⚠️ Morgan import failed:', err.message);
}
app.use(morganMiddleware);

// --- MongoDB (optional) ---
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log('✅ Connected to MongoDB');
  }).catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
  });
} else {
  console.warn('⚠️ MONGO_URI not set — skipping DB connection');
}

// --- Anime routes ---
try {
  // IMPORTANT: no extra "src/"
  const animeRoutesModule = await import('./routes/animeRoutes.js').catch(() => null);
  const animeRoutes = animeRoutesModule && (animeRoutesModule.default || animeRoutesModule);
  if (animeRoutes) {
    app.use('/api/anime', animeRoutes);
    console.log('✅ Mounted /api/anime routes');
  } else {
    console.warn('⚠️ animeRoutes.js not found — routes not mounted');
  }
} catch (err) {
  console.warn('⚠️ Error loading animeRoutes:', err.message);
}

// --- Root health check ---
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err?.message || 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

export default app;
