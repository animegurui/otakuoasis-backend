import { NIGERIAN_PROXIES, NG_QUALITY_PRIORITY } from './constants.js';

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
    ...SCRAPER_HEADERS,
    'X-Country': 'NG'
  }
};
