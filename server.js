import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import AggregatedScraper from './aggregatedScraper.js';

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/animeDB';

async function start() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`✅ Connected to MongoDB at ${MONGO_URI}`);

    // Instantiate scraper
    const scraper = new AggregatedScraper();

    const app = express();
    app.use(cors());
    app.use(express.json());

    // -------------------- Health check --------------------
    app.get('/', (req, res) => res.json({ success: true, message: 'Anime Scraper API is running!' }));

    // -------------------- Full healthStatus --------------------
    app.get('/healthStatus', async (req, res) => {
      const status = {
        server: true,
        mongo: false,
        scraper: false,
        timestamp: new Date()
      };

      // MongoDB check
      try {
        status.mongo = mongoose.connection.readyState === 1;
      } catch (err) {
        status.mongo = false;
      }

      // Scraper check: quick trending fetch
      try {
        await scraper.aggregateTrending(1); // fetch 1 trending anime to test scraper
        status.scraper = true;
      } catch (err) {
        status.scraper = false;
      }

      const allHealthy = status.server && status.mongo && status.scraper;
      res.status(allHealthy ? 200 : 503).json(status);
    });

    // -------------------- GET /trending --------------------
    app.get('/trending', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit, 10) || 10;
        const sortBy = req.query.sortBy || 'latestEpisode';
        const data = await scraper.aggregateTrending(limit, sortBy);
        res.json({ success: true, data });
      } catch (err) {
        console.error('GET /trending error:', err);
        res.status(500).json({ success: false, message: err.message || 'Internal error' });
      }
    });

    // -------------------- GET /search --------------------
    app.get('/search', async (req, res) => {
      try {
        const q = req.query.q;
        if (!q) return res.status(400).json({ success: false, message: 'Missing search query parameter "q"' });

        const limit = parseInt(req.query.limit, 10) || 10;
        const fetchDetails = (req.query.details === 'true');

        const results = await scraper.aggregateSearch(q, limit, fetchDetails);
        res.json({ success: true, data: results });
      } catch (err) {
        console.error('GET /search error:', err);
        res.status(500).json({ success: false, message: err.message || 'Internal error' });
      }
    });

    // -------------------- GET /episodes --------------------
    app.get('/episodes', async (req, res) => {
      try {
        const { source, slug } = req.query;
        if (!source || !slug) return res.status(400).json({ success: false, message: 'Missing "source" or "slug" query parameter' });

        const episodes = await scraper.aggregateEpisodes(source, slug);
        res.json({ success: true, data: episodes });
      } catch (err) {
        console.error('GET /episodes error:', err);
        res.status(500).json({ success: false, message: err.message || 'Internal error' });
      }
    });

    // -------------------- GET /sources --------------------
    app.get('/sources', async (req, res) => {
      try {
        const { source, slug, episode, server } = req.query;
        if (!source || !slug || !episode) {
          return res.status(400).json({ success: false, message: 'Missing "source", "slug", or "episode" query parameter' });
        }

        const episodeNumber = parseInt(episode, 10);
        if (Number.isNaN(episodeNumber)) {
          return res.status(400).json({ success: false, message: '"episode" must be a number' });
        }

        const sources = await scraper.aggregateEpisodeSources(source, slug, episodeNumber, server || '');
        res.json({ success: true, data: sources });
      } catch (err) {
        console.error('GET /sources error:', err);
        res.status(500).json({ success: false, message: err.message || 'Internal error' });
      }
    });

    // -------------------- Start listening --------------------
    const server = app.listen(PORT, () => {
      console.log(`🚀 Anime Scraper API running at http://localhost:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('⚠️ Shutting down server...');
      server.close();
      try {
        await mongoose.disconnect();
        console.log('✅ MongoDB disconnected');
      } catch (e) {
        console.warn('Error disconnecting MongoDB:', e);
      }
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
