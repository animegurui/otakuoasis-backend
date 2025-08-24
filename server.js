// server.js

import express from 'express';
import mongoose from 'mongoose';

// --- Updated imports after moving scraper files into "scrapers" folder
import AggregatedScraper from './scrapers/aggregatedScraper.js';

const app = express();
const PORT = process.env.PORT || 3000;

// --- MongoDB connection (using your URI directly)
const MONGO_URI = process.env.MONGODB_URI || "mongodb+srv://Calvinwhyte:07038303357Mummy@animegurui.jwvxzei.mongodb.net/?retryWrites=true&w=majority&appName=Animegurui";

mongoose.connect(MONGO_URI, {
  dbName: "otakuoasis", // change if your DB name is different
}).then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// --- Aggregated scraper instance
const scraper = new AggregatedScraper();

// --- Routes
app.get('/', (req, res) => {
  res.json({
    message: "🚀 Welcome to OtakuOasis API",
    routes: {
      health: "/health",
      trending: "/trending",
      search: "/search?q=naruto",
      episodes: "/episodes/:source/:slug",
      episodeSources: "/episode-sources/:source/:slug/:episode",
      debugMongo: "/__debug/mongo",
      debugScrape: "/__debug/scrape?query=naruto" // new manual scrape route
    }
  });
});

app.get('/trending', async (req, res) => {
  try {
    const data = await scraper.aggregateTrending();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch trending anime' });
  }
});

app.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const data = await scraper.aggregateSearch(query);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search anime' });
  }
});

app.get('/episodes/:source/:slug', async (req, res) => {
  try {
    const { source, slug } = req.params;
    const data = await scraper.aggregateEpisodes(source, slug);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch episodes' });
  }
});

app.get('/episode-sources/:source/:slug/:episode', async (req, res) => {
  try {
    const { source, slug, episode } = req.params;
    const preferredServer = req.query.server || '';
    const data = await scraper.aggregateEpisodeSources(source, slug, episode, preferredServer);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch episode sources' });
  }
});

// --- Debug route to verify MongoDB connection
app.get('/__debug/mongo', (req, res) => {
  const state = mongoose.connection.readyState;
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    status: states[state] || "unknown",
    uriInUse: MONGO_URI.startsWith("mongodb+srv") ? "Atlas URI" : "Local/Other",
  });
});

// --- Universal manual scrape route
app.get('/__debug/scrape', async (req, res) => {
  try {
    const { query, source, slug, episode } = req.query;

    let data;

    if (query) {
      data = await scraper.aggregateSearch(query);
    } else if (source && slug && episode) {
      data = await scraper.aggregateEpisodeSources(source, slug, episode);
    } else if (source && slug) {
      data = await scraper.aggregateEpisodes(source, slug);
    } else {
      data = await scraper.aggregateTrending();
    }

    res.json({ ok: true, data });
  } catch (err) {
    console.error("❌ Manual scrape error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
