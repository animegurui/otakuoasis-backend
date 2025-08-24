import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import redis from './utils/redis.js';
import cron from 'node-cron';

// ✅ Import scrapers (match case-sensitive filenames in your repo)
import GogoAnimeScraper from './scrapers/gogoanimeScraper.js';
import NineAnimeScraper from './scrapers/nineanimeScraper.js';
import ZoroScraper from './scrapers/zoroScraper.js';

dotenv.config();
const app = express();
app.set('trust proxy', true);

// Middleware
app.use(cors());
app.use(express.json());

// --- Morgan logging (optional) ---
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

// --- MongoDB connection ---
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log('✅ Connected to MongoDB');
  }).catch(err => {
    console.error('❌ MongoDB connection error:', err.message || err);
  });
} else {
  console.warn('⚠️ MONGO_URI not set — skipping MongoDB connection');
}

// --- Anime routes ---
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

// --- Cache clear routes (optional) ---
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

// --- Scraper Setup ---
const scrapers = [
  new GogoAnimeScraper(),
  new NineAnimeScraper(),
  new ZoroScraper()
];

// 🔄 Run scrapers every hour
cron.schedule('0 * * * *', async () => {
  console.log('⏳ Starting hourly scrape...');
  let errors = 0;

  for (const scraper of scrapers) {
    try {
      await scraper.run();
    } catch (err) {
      errors++;
      console.error(`❌ Error running ${scraper.constructor.name}:`, err.message);
    }
  }

  // ✅ Store lastScrape & errors in Redis
  try {
    await redis.set('scraper:lastScrape', new Date().toISOString());
    await redis.set('scraper:errors', errors.toString());
  } catch (err) {
    console.warn('⚠️ Failed to update scrape metadata in Redis:', err.message);
  }

  console.log('✅ Hourly scrape finished');
});

// 🔘 Manual trigger endpoint
app.post('/scrape-now', async (req, res) => {
  try {
    let errors = 0;
    for (const scraper of scrapers) {
      try {
        await scraper.run();
      } catch (err) {
        errors++;
        console.error(`❌ Error running ${scraper.constructor.name}:`, err.message);
      }
    }

    // ✅ Store lastScrape & errors in Redis
    await redis.set('scraper:lastScrape', new Date().toISOString());
    await redis.set('scraper:errors', errors.toString());

    res.json({ message: '✅ Manual scrape complete' });
  } catch (error) {
    res.status(500).json({ error: error.message || String(error) });
  }
});

// --- System endpoints ---
app.get('/ready', (req, res) => {
  res.json({
    status: 'ready',
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

app.get('/health', async (req, res) => {
  const healthStatus = {
    uptime: process.uptime(),
    timestamp: new Date(),
    services: {
      mongo: 'unknown',
      redis: 'unknown'
    },
    scraper: {
      lastScrape: null,
      entriesInDatabase: null,
      errors: 0
    }
  };

  // Mongo
  try {
    if (mongoose.connection.readyState === 1) {
      healthStatus.services.mongo = 'up';

      try {
        const AnimeModel = mongoose.models.Anime || null;
        if (AnimeModel) {
          healthStatus.scraper.entriesInDatabase = await AnimeModel.countDocuments();
        }
      } catch (err) {
        console.warn('⚠️ Could not count anime entries:', err.message);
      }
    } else {
      healthStatus.services.mongo = 'down';
    }
  } catch {
    healthStatus.services.mongo = 'down';
  }

  // Redis
  try {
    await redis.ping();
    healthStatus.services.redis = 'up';

    const lastScrape = await redis.get('scraper:lastScrape');
    const scrapeErrors = await redis.get('scraper:errors');
    healthStatus.scraper.lastScrape = lastScrape || null;
    healthStatus.scraper.errors = scrapeErrors ? parseInt(scrapeErrors, 10) : 0;
  } catch {
    healthStatus.services.redis = 'down';
  }

  const isHealthy =
    healthStatus.services.mongo === 'up' &&
    healthStatus.services.redis === 'up';

  res.status(isHealthy ? 200 : 500).json(healthStatus);
});

// Root route
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
