import { NIGERIAN_PROXIES, NG_QUALITY_PRIORITY } from './constants.js';

// Default headers used when SCRAPER_HEADERS is not defined anywhere
const DEFAULT_SCRAPER_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9'
};

// Use a runtime-provided global SCRAPER_HEADERS if present, otherwise fallback
const RESOLVED_SCRAPER_HEADERS = (typeof globalThis !== 'undefined' && globalThis.SCRAPER_HEADERS)
  ? globalThis.SCRAPER_HEADERS
  : DEFAULT_SCRAPER_HEADERS;

export const NIGERIA_CONFIG = {
  defaultQuality: '480p',
  timezone: 'Africa/Lagos',
  preferredServers: ['Vidstream', 'Mp4Upload', 'Streamtape'],
  proxyPriority: ['NG', 'ZA', 'GH', 'KE'],
  cdn: {
    images: process.env.NG_IMAGE_CDN || 'https://cdn.ng.example.com',
    videos: process.env.NG_VIDEO_CDN || 'https://video.ng.example.com'
  },
  paymentGateways: [
    {
      id: 'paystack',
      name: 'Paystack',
      config: {
        publicKey: process.env.PAYSTACK_PUBLIC_KEY,
        secretKey: process.env.PAYSTACK_SECRET_KEY
      }
    },
    {
      id: 'flutterwave',
      name: 'Flutterwave',
      config: {
        publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
        secretKey: process.env.FLUTTERWAVE_SECRET_KEY
      }
    }
  ],
  networkOptimizations: {
    maxTimeout: 15000,
    maxRetries: 3,
    minCompression: 'gzip',
    cacheTTL: 1800
  },
  contentPreferences: {
    trendingRegion: 'NG',
    promotedGenres: ['Nigerian Animation', 'African Folklore'],
    qualityRanking: NG_QUALITY_PRIORITY
  },
  proxies: NIGERIAN_PROXIES,
  scraperHeaders: {
    ...RESOLVED_SCRAPER_HEADERS,
    'X-Country': 'NG'
  }
};
