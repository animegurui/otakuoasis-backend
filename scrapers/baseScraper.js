import axios from 'axios';
import cheerio from 'cheerio';
import logger from '../utils/logger.js';
import { getProxy } from '../services/proxyService.js';
import redis from '../config/redisClient.js';   // ✅ Redis client

class BaseScraper {
  constructor(baseUrl, config = {}) {
    this.baseUrl = baseUrl;
    this.config = {
      timeout: 15000,
      retries: 3,
      proxyList: [],
      preferredServers: [],
      qualityPriority: ['480p', '360p', '720p', '1080p'],
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      ...config
    };
    this.currentRetry = 0;
  }

  setConfig(config) {
    this.config = { ...this.config, ...config };
  }

  async fetchPage(url, options = {}) {
    try {
      const cacheKey = `scraper:${url}`;

      // ✅ Check Redis cache first
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          logger.info(`⚡ Cache hit for ${url}`);
          return cached;
        }
      }

      const headers = { ...this.config.headers, ...(options.headers || {}) };
      const proxy = getProxy();

      const axiosConfig = {
        url,
        method: options.method || 'GET',
        headers,
        timeout: this.config.timeout,
        proxy: proxy ? {
          protocol: 'http',
          host: proxy.split(':')[0],
          port: parseInt(proxy.split(':')[1])
        } : null,
        responseType: options.responseType || 'text'
      };

      const response = await axios(axiosConfig);

      // ✅ Save into Redis for 1h
      if (redis) {
        await redis.set(cacheKey, response.data, { EX: 3600 });
        logger.info(`💾 Cached ${url} for 1h`);
      }

      return response.data;
    } catch (error) {
      if (this.currentRetry < this.config.retries) {
        this.currentRetry++;
        logger.warn(`Retry ${this.currentRetry} for ${url} due to error: ${error.message}`);
        return this.fetchPage(url, options);
      } else {
        this.currentRetry = 0;
        throw new Error(`Failed to fetch ${url} after ${this.config.retries} retries: ${error.message}`);
      }
    }
  }

  async loadCheerio(url, options = {}) {
    const html = await this.fetchPage(url, options);
    return cheerio.load(html);
  }

  extractId(text) {
    const match = text.match(/\d+/);
    return match ? match[0] : null;
  }

  normalizeTitle(title) {
    return title
      .replace(/season\s+\d+/gi, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .toLowerCase();
  }

  prioritizeNigerianSources(sources) {
    if (!sources || sources.length === 0) return sources;

    const ngPatterns = [
      /ngcdn\./i,
      /naijacdn\./i,
      /africdn\./i,
      /9anime\.ng/i,
      /gogoanime\.africa/i
    ];

    return [
      ...sources.filter(source =>
        ngPatterns.some(pattern => pattern.test(source.url))
      ),
      ...sources.filter(source =>
        !ngPatterns.some(pattern => pattern.test(source.url))
      )
    ];
  }

  optimizeImageUrl(url) {
    if (!url) return url;
    const ngCdn = process.env.NG_IMAGE_CDN || 'https://cdn.ng.example.com';
    try {
      const parsedUrl = new URL(url);
      if (!parsedUrl.hostname.includes('ngcdn') &&
          !parsedUrl.hostname.includes('naijacdn')) {
        return `${ngCdn}/${parsedUrl.hostname}${parsedUrl.pathname}`;
      }
      return url;
    } catch (error) {
      return url;
    }
  }

  async scrapeTrending(limit) {
    throw new Error('scrapeTrending method not implemented');
  }

  async scrapeSearch(query, page) {
    throw new Error('scrapeSearch method not implemented');
  }

  async scrapeAnimeDetails(slug) {
    throw new Error('scrapeAnimeDetails method not implemented');
  }

  async scrapeEpisodes(slug) {
    throw new Error('scrapeEpisodes method not implemented');
  }

  async scrapeEpisodeSources(slug, episodeNumber, server) {
    throw new Error('scrapeEpisodeSources method not implemented');
  }
}

export default BaseScraper;
