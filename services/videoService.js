import { NIGERIA_CONFIG } from '../config/nigeriaConfig.js';
import logger from '../utils/logger.js';

// Optimize video URLs for Nigerian CDN
export const optimizeVideoUrl = (url) => {
  try {
    if (!url) return url;
    // If the URL is from a known source, rewrite to use Nigerian CDN
    const cdnDomains = ['streamtape.com', 'mp4upload.com', 'vidstream.pro'];
    for (const domain of cdnDomains) {
      if (url.includes(domain)) {
        const newUrl = new URL(url);
        newUrl.hostname = `${NIGERIA_CONFIG.cdn.videos}/${domain}`;
        return newUrl.toString();
      }
    }
    return url;
  } catch (error) {
    logger.error(`Video URL optimization failed: ${error.message}`);
    return url;
  }
};

// Select the best source based on quality and server preference
export const selectBestSource = (sources) => {
  if (!sources || sources.length === 0) return null;

  // Filter by preferred servers
  const preferredServers = NIGERIA_CONFIG.preferredServers;
  let filteredSources = sources.filter(source => 
    preferredServers.some(server => source.server.includes(server))
  );

  // If no preferred servers, use all sources
  if (filteredSources.length === 0) filteredSources = sources;

  // Sort by quality priority
  const qualityPriority = NIGERIA_CONFIG.contentPreferences.qualityRanking;
  filteredSources.sort((a, b) => {
    const aIndex = qualityPriority.indexOf(a.quality);
    const bIndex = qualityPriority.indexOf(b.quality);
    return aIndex - bIndex;
  });

  // Optimize the URL
  const bestSource = filteredSources[0];
  return {
    ...bestSource,
    url: optimizeVideoUrl(bestSource.url)
  };
};

// Extract video ID from various platforms
export const extractVideoId = (url) => {
  const patterns = [
    // Streamtape: https://streamtape.com/v/VIDEO_ID
    /streamtape\.com\/[ve]?\/([a-zA-Z0-9]+)/,
    // Mp4Upload: https://mp4upload.com/VIDEO_ID
    /mp4upload\.com\/(?:embed-)?([a-zA-Z0-9]+)/,
    // Vidstream: https://vidstream.pro/embed/VIDEO_ID
    /vidstream\.pro\/embed\/([a-zA-Z0-9]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  
  return null;
};
 
