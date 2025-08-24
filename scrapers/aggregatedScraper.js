// scrapers/aggregatedScraper.js

import MultiSourceScraper from './multiSourceScraper.js';
import mongoose from 'mongoose';

// ====================
// MongoDB Cache Schema
// ====================
const CacheSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  data: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now }
});
const Cache = mongoose.models.Cache || mongoose.model('Cache', CacheSchema);

// ====================
// AggregatedScraper Class
// ====================
export default class AggregatedScraper {
  constructor() {
    this.multiScraper = new MultiSourceScraper();
    this.sources = ['gogoanime', 'nineanime', 'zoro'];

    this.cacheTTL = 60 * 1000; // 60 seconds default TTL
    this.rateLimitMs = 2000;   // 2 seconds per source
    this.lastFetch = {};
  }

  // --------------------
  // Internal: Persistent Cache Get
  // --------------------
  async _getCache(key) {
    const entry = await Cache.findOne({ key });
    if (entry && (Date.now() - new Date(entry.updatedAt).getTime() < this.cacheTTL)) {
      return entry.data;
    }
    return null;
  }

  // --------------------
  // Internal: Persistent Cache Set
  // --------------------
  async _setCache(key, data) {
    await Cache.findOneAndUpdate(
      { key },
      { data, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  }

  // --------------------
  // Internal: Rate-limit per source
  // --------------------
  async _rateLimit(source) {
    const last = this.lastFetch[source] || 0;
    const wait = this.rateLimitMs - (Date.now() - last);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    this.lastFetch[source] = Date.now();
  }

  // --------------------
  // Aggregate Trending
  // --------------------
  async aggregateTrending(limitPerSource = 20, sortBy = 'latestEpisode') {
    const trendingLists = await Promise.all(
      this.sources.map(async source => {
        const cacheKey = `trending:${source}`;
        const cached = await this._getCache(cacheKey);
        if (cached) return cached;

        await this._rateLimit(source);
        const data = await this.multiScraper.run(source, limitPerSource).catch(() => []);
        await this._setCache(cacheKey, data);
        return data;
      })
    );

    return this.mergeAndSort(trendingLists, sortBy);
  }

  // --------------------
  // Aggregate Search
  // --------------------
  async aggregateSearch(query, limitPerSource = 20, fetchDetails = false) {
    const searchLists = await Promise.all(
      this.sources.map(async source => {
        const cacheKey = `search:${source}:${query}`;
        const cached = await this._getCache(cacheKey);
        if (cached) return cached;

        await this._rateLimit(source);
        const results = await this.multiScraper.search(source, query, 1)
          .then(res => res.data || [])
          .catch(() => []);
        await this._setCache(cacheKey, results);
        return results;
      })
    );

    let merged = this.mergeAndSort(searchLists, 'latestEpisode');

    if (fetchDetails) {
      merged = await Promise.all(
        merged.map(async item => {
          try {
            await this._rateLimit(item.source);
            const details = await this.multiScraper.animeDetails(item.source, item.slug);
            return { ...item, details };
          } catch {
            return item;
          }
        })
      );
    }

    return merged;
  }

  // --------------------
  // Aggregate Episodes
  // --------------------
  async aggregateEpisodes(source, slug) {
    if (!this.sources.includes(source)) throw new Error(`Unknown source: ${source}`);
    const cacheKey = `episodes:${source}:${slug}`;
    const cached = await this._getCache(cacheKey);
    if (cached) return cached;

    await this._rateLimit(source);
    const episodes = await this.multiScraper.episodes(source, slug).catch(() => []);
    await this._setCache(cacheKey, episodes);
    return episodes;
  }

  // --------------------
  // Aggregate Episode Sources
  // --------------------
  async aggregateEpisodeSources(source, slug, episodeNumber, preferredServer = '') {
    if (!this.sources.includes(source)) throw new Error(`Unknown source: ${source}`);
    const cacheKey = `epSources:${source}:${slug}:${episodeNumber}:${preferredServer}`;
    const cached = await this._getCache(cacheKey);
    if (cached) return cached;

    await this._rateLimit(source);
    const sources = await this.multiScraper
      .episodeSources(source, slug, episodeNumber, preferredServer)
      .catch(() => []);
    await this._setCache(cacheKey, sources);
    return sources;
  }

  // --------------------
  // Merge & Sort Helper
  // --------------------
  mergeAndSort(lists, sortBy = 'latestEpisode') {
    let merged = lists.flat();
    const seen = new Set();

    merged = merged.filter(item => {
      const key = item.slug + '-' + item.source;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    merged.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
    return merged;
  }
}
