import { NIGERIA_CONFIG } from '../config/nigeriaConfig.js';
import GogoanimeScraper from '../scrapers/gogoanimeScraper.js';
import NineanimeScraper from '../scrapers/nineanimeScraper.js';
import ZoroScraper from '../scrapers/zoroScraper.js';
import Anime from '../models/Anime.js';
import Episode from '../models/Episode.js';
import ScrapeJob from '../models/ScrapeJob.js';
import logger from '../utils/logger.js';

const getScraper = (source) => {
  let scraper;
  
  switch(source) {
    case '9anime': scraper = new NineanimeScraper(); break;
    case 'zoro': scraper = new ZoroScraper(); break;
    default: scraper = new GogoanimeScraper();
  }
  
  scraper.setConfig({
    timeout: NIGERIA_CONFIG.networkOptimizations.maxTimeout,
    retries: NIGERIA_CONFIG.networkOptimizations.maxRetries,
    proxyList: NIGERIA_CONFIG.proxies,
    preferredServers: NIGERIA_CONFIG.preferredServers,
    qualityPriority: NIGERIA_CONFIG.contentPreferences.qualityRanking,
    headers: NIGERIA_CONFIG.scraperHeaders
  });
  
  return scraper;
};

export const scrapeTrending = async (region, limit) => {
  try {
    const scraper = getScraper('gogoanime');
    const results = await scraper.scrapeTrending(limit);
    
    const nigeriaContent = results.data.filter(item => 
      item.tags?.some(tag => 
        NIGERIA_CONFIG.contentPreferences.promotedGenres.includes(tag)
      )
    );
    
    const regularContent = results.data.filter(item => 
      !nigeriaContent.some(nc => nc.id === item.id)
    );
    
    const combined = [...nigeriaContent, ...regularContent].slice(0, limit);
    
    return { success: true, region, sources: results.sources, data: combined };
  } catch (error) {
    logger.error(`Trending scrape error: ${error.message}`);
    throw new Error('Failed to scrape trending anime');
  }
};

export const scrapeSearch = async (query, page, source = 'gogoanime') => {
  try {
    const scraper = getScraper(source);
    const results = await scraper.scrapeSearch(query, page);
    return {
      success: true,
      query,
      page,
      source: scraper.source,
      hasMore: results.hasMore,
      data: results.data
    };
  } catch (error) {
    logger.error(`Search scrape error: ${error.message}`);
    throw new Error('Search scrape failed');
  }
};

export const scrapeAnimeDetails = async (slug, source = 'gogoanime') => {
  try {
    const scraper = getScraper(source);
    const anime = await scraper.scrapeAnimeDetails(slug);
    
    const existingAnime = await Anime.findOne({ slug });
    if (existingAnime) {
      await Anime.updateOne({ slug }, anime);
    } else {
      await Anime.create(anime);
    }
    
    return { success: true, slug, source: scraper.source, data: anime };
  } catch (error) {
    logger.error(`Anime details scrape error: ${error.message}`);
    throw new Error('Failed to scrape anime details');
  }
};

export const scrapeEpisodes = async (slug, source = 'gogoanime') => {
  try {
    const scraper = getScraper(source);
    const episodes = await scraper.scrapeEpisodes(slug);
    
    const anime = await Anime.findOne({ slug });
    if (!anime) throw new Error('Anime not found in database');
    
    for (const episode of episodes) {
      const existingEpisode = await Episode.findOne({ 
        animeId: anime._id, 
        number: episode.number 
      });
      
      if (existingEpisode) {
        await Episode.updateOne({ _id: existingEpisode._id }, episode);
      } else {
        const newEpisode = await Episode.create({ ...episode, animeId: anime._id });
        anime.episodes.push(newEpisode._id);
      }
    }
    
    await anime.save();
    
    return { success: true, slug, source: scraper.source, data: episodes };
  } catch (error) {
    logger.error(`Episodes scrape error: ${error.message}`);
    throw new Error('Failed to scrape episodes');
  }
};

export const scrapeEpisodeSources = async (slug, episodeNumber, source = 'gogoanime', server) => {
  try {
    const scraper = getScraper(source);
    const sources = await scraper.scrapeEpisodeSources(slug, episodeNumber, server);
    
    const anime = await Anime.findOne({ slug });
    if (!anime) throw new Error('Anime not found in database');
    
    const episode = await Episode.findOne({ 
      animeId: anime._id, 
      number: episodeNumber 
    });
    
    if (episode) {
      episode.sources = sources;
      await episode.save();
    }
    
    return { success: true, slug, episodeNumber, source: scraper.source, data: sources };
  } catch (error) {
    logger.error(`Sources scrape error: ${error.message}`);
    throw new Error('Failed to scrape video sources');
  }
};

export const createScrapeJob = async (type, target, priority = 'normal') => {
  const job = await ScrapeJob.create({ type, target, priority });
  return job;
};

export const getScrapeJobs = async (status, limit = 50) => {
  const query = status ? { status } : {};
  return await ScrapeJob.find(query).limit(limit).sort({ createdAt: -1 });
};

export const getScrapeJobById = async (id) => {
  return await ScrapeJob.findById(id);
};

export const rotateProxies = async () => {
  return { success: true, message: 'Proxies rotated' };
};

export const getScrapeSystemStatus = async () => {
  return {
    status: 'operational',
    lastScrape: new Date().toISOString(),
    activeJobs: 5,
    failedJobs: 2
  };
};
 
