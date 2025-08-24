import axios from 'axios';
import * as cheerio from 'cheerio';
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
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      ...config
    };
  }

  setConfig(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Robust proxy parser.
   * Accepts:
   *  - "host:port"
   *  - "http://host:port"
   *  - "http://user:pass@host:port"
   * Returns axios proxy object or null.
   */
  _parseProxy(proxyString) {
    if (!proxyString) return null;

    try {
      const url = proxyString.includes('://')
        ? new URL(proxyString)
        : new URL(`http://${proxyString}`);

      const proxy = {
        protocol: url.protocol ? url.protocol.replace(':', '') : 'http',
        host: url.hostname,
        port: url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80)
      };

      if (url.username || url.password) {
        proxy.auth = {
          username: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password)
        };
      }

      return proxy;
    } catch (err) {
      // If parsing fails, return null (caller will handle)
      return null;
    }
  }

  async fetchPage(url, options = {}) {
    const headers = { ...this.config.headers, ...(options.headers || {}) };
    const proxyString = getProxy(); // may return null or string
    const parsedProxy = this._parseProxy(proxyString);

    const axiosBaseConfig = {
      url,
      method: options.method || 'GET',
      headers,
      timeout: this.config.timeout,
      responseType: options.responseType || 'text',
      // don't set proxy here; will be attached only if parsedProxy exists
    };

    if (parsedProxy) {
      axiosBaseConfig.proxy = {
        host: parsedProxy.host,
        port: parsedProxy.port,
        protocol: parsedProxy.protocol,
        ...(parsedProxy.auth ? { auth: parsedProxy.auth } : {})
      };

      if (process.env.NODE_ENV === 'production') {
        // Add additional headers for Nigerian ISPs when proxy used in production
        axiosBaseConfig.headers['X-Forwarded-For'] = parsedProxy.host;
        axiosBaseConfig.headers['X-NG-Proxy'] = 'true';
      }
    }

    // Local retry loop (safe for concurrent usage)
    let lastErr;
    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        if (attempt > 0) {
          logger.warn(`Attempt ${attempt + 1} for ${url}`);
        }
        const response = await axios(axiosBaseConfig);
        return response.data;
      } catch (error) {
        lastErr = error;
        const msg = error && error.message ? error.message : String(error);
        logger.warn(`Fetch error for ${url} (attempt ${attempt + 1}): ${msg}`);

        // small backoff between retries (optional)
        if (attempt < this.config.retries) {
          const backoff = 200 * (attempt + 1);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        } else {
          // all attempts exhausted
          const reason = lastErr && lastErr.response
            ? `status ${lastErr.response.status}`
            : lastErr && lastErr.message
              ? lastErr.message
              : 'unknown error';
          throw new Error(`Failed to fetch ${url} after ${this.config.retries + 1} attempts: ${reason}`);
        }
      }
    }
  }

  async loadCheerio(url, options = {}) {
    const html = await this.fetchPage(url, options);
    return cheerio.load(html);
  }

  // Common method to extract numeric ID from string
  extractId(text) {
    const match = text && text.match(/\d+/);
    return match ? match[0] : null;
  }

  // Common method to normalize anime titles
  normalizeTitle(title) {
    if (!title) return '';
    return title
      .replace(/season\s+\d+/gi, '') // Remove season numbers
      .replace(/[^a-zA-Z0-9 ]/g, '') // Remove special characters
      .replace(/\s{2,}/g, ' ') // Remove extra spaces
      .trim()
      .toLowerCase();
  }

  // Nigeria-specific: Prioritize Nigerian CDN sources
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
      ...sources.filter((source) => ngPatterns.some((p) => p.test(source.url))),
      ...sources.filter((source) => !ngPatterns.some((p) => p.test(source.url)))
    ];
  }

  // Nigeria-specific: Optimize images for Nigerian CDN
  optimizeImageUrl(url) {
    if (!url) return url;

    const ngCdn = process.env.NG_IMAGE_CDN || 'https://cdn.ng.example.com';

    try {
      const parsedUrl = new URL(url);
      if (!parsedUrl.hostname.includes('ngcdn') && !parsedUrl.hostname.includes('naijacdn')) {
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
