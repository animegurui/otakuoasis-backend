import axios from 'axios';
import cheerio from 'cheerio';
import logger from '../utils/logger.js';
import { getProxy } from '../services/proxyService.js';

class BaseScraper {
  constructor(baseUrl, config = {}) {
    this.baseUrl = baseUrl;
    this.config = {
      timeout: 15000, // Higher timeout for Nigerian networks
      retries: 3,     // More retries for unstable connections
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
      const headers = { ...this.config.headers, ...(options.headers || {}) };
      const proxy = getProxy(); // Get Nigerian proxy
      
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

      // Special handling for Nigerian network conditions
      if (process.env.NODE_ENV === 'production' && proxy) {
        // Add additional headers for Nigerian ISPs
        axiosConfig.headers['X-Forwarded-For'] = proxy.split(':')[0];
        axiosConfig.headers['X-NG-Proxy'] = 'true';
      }

      const response = await axios(axiosConfig);
      return response.data;
    } catch (error) {
      if (this.currentRetry < this.config.retries) {
        this.currentRetry++;
        logger.warn(`Retry ${this.currentRetry} for ${url} due to error: ${error.message}`);
        return this.fetchPage(url, options);
      } else {
        this.currentRetry = 0; // Reset for next call
        throw new Error(`Failed to fetch ${url} after ${this.config.retries} retries: ${error.message}`);
      }
    }
  }

  async loadCheerio(url, options = {}) {
    const html = await this.fetchPage(url, options);
    return cheerio.load(html);
  }

  // Common method to extract numeric ID from string
  extractId(text) {
    const match = text.match(/\d+/);
    return match ? match[0] : null;
  }

  // Common method to normalize anime titles
  normalizeTitle(title) {
    return title
      .replace(/season\s+\d+/gi, '') // Remove season numbers
      .replace(/[^a-zA-Z0-9 ]/g, '') // Remove special characters
      .replace(/\s{2,}/g, ' ')       // Remove extra spaces
      .trim()
      .toLowerCase();
  }

  // Nigeria-specific: Prioritize Nigerian CDN sources
  prioritizeNigerianSources(sources) {
    if (!sources || sources.length === 0) return sources;
    
    // Nigerian CDN patterns (customize these as needed)
    const ngPatterns = [
      /ngcdn\./i,
      /naijacdn\./i,
      /africdn\./i,
      /9anime\.ng/i,
      /gogoanime\.africa/i
    ];
    
    return [
      // Nigerian sources first
      ...sources.filter(source => 
        ngPatterns.some(pattern => pattern.test(source.url))
      ),
      // Then all other sources
      ...sources.filter(source => 
        !ngPatterns.some(pattern => pattern.test(source.url))
      )
    ];
  }

  // Nigeria-specific: Optimize images for Nigerian CDN
  optimizeImageUrl(url) {
    if (!url) return url;
    
    // Nigeria-specific CDN domain
    const ngCdn = process.env.NG_IMAGE_CDN || 'https://cdn.ng.example.com';
    
    try {
      const parsedUrl = new URL(url);
      // Only optimize external images
      if (!parsedUrl.hostname.includes('ngcdn') && 
          !parsedUrl.hostname.includes('naijacdn')) {
        return `${ngCdn}/${parsedUrl.hostname}${parsedUrl.pathname}`;
      }
      return url;
    } catch (error) {
      return url;
    }
  }

  // Abstract methods to be implemented by specific scrapers
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
