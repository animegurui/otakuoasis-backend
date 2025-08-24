import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';

// import your redis cache util
import { clearCache } from './src/utils/cacheUtils.js';

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Example: connect MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// --- Your existing routes ---
// e.g.
// import userRoutes from './src/routes/userRoutes.js';
// app.use('/api/users', userRoutes);

// ===============================
// 🧹 Redis Cache Management Routes
// ===============================

// Clear cache for a specific slug
app.delete('/cache/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    await clearCache(slug);
    res.json({ message: `Cache cleared for ${slug}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear *all* cache
app.delete('/cache', async (req, res) => {
  try {
    await clearCache('*');
    res.json({ message: 'All cache cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===============================

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
