// server.js

import express from 'express';
import mongoose from 'mongoose';

// --- Updated imports after moving scraper files into "scrapers" folder
import AggregatedScraper from './scrapers/aggregatedScraper.js';

const app = express();
const PORT = process.env.PORT || 3000;

// --- MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/anime', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// --- Aggregated scraper instance
const scraper = new AggregatedScraper();

// --- Routes
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

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
