import axios from 'axios';
import cheerio from 'cheerio';
import logger from '../utils/logger.js';

class BaseScraper {
  constructor(baseUrl, config = {}) {
    this.baseUrl = baseUrl;
    this.config = {
      timeout: 10000,
      retries: 2,
      proxyList: [],
      preferredServers: [],
      qualityPriority: ['480p', '360p', '720p', '1080p'],
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      ...config
    };
    this.currentProxyIndex = 0;
    this.currentRetry = 0;
  }

  setConfig(config) {
    this.config = { ...this.config, ...config };
  }

  async fetchPage(url, options = {}) {
    try {
      const headers =
 
