import Anime from '../models/Anime.js';
import { scrapeAndSaveAnime, scrapeEpisodeSources } from './scrapeController.js';
import cache from '../utils/cache.js';

// Get trending anime
export const getTrending = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    const anime = await Anime.find()
      .sort({ popularity: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('title image slug releaseYear type status');
      
    res.json({
      success: true,
      count: anime.length,
      page: parseInt(page),
      results: anime
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch trending anime',
      error: error.message 
    });
  }
};

// Get anime details
export const getAnimeDetails = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Check cache first
    const cacheKey = `anime:${slug}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    const anime = await Anime.findOne({ slug }).populate('relations', 'title image slug');
    
    if (!anime) {
      return res.status(404).json({ 
        success: false,
        message: 'Anime not found' 
      });
    }
    
    // Update popularity
    anime.popularity += 1;
    await anime.save();
    
    // Cache for 6 hours
    await cache.set(cacheKey, JSON.stringify(anime), 'EX', 21600);
    
    res.json({
      success: true,
      data: anime
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch anime details',
      error: error.message 
    });
  }
};

// Get episode sources
export const getEpisodeSources = async (req, res) => {
  try {
    const { slug, episodeNumber } = req.params;
    
    const anime = await Anime.findOne({ slug });
    
    if (!anime) {
      return res.status(404).json({ 
        success: false,
        message: 'Anime not found' 
      });
    }
    
    // Find the episode
    const episode = anime.episodes.find(
      ep => ep.number === parseInt(episodeNumber)
    );
    
    if (!episode) {
      return res.status(404).json({ 
        success: false,
        message: 'Episode not found' 
      });
    }
    
    // If sources need refresh
    if (!episode.sources || episode.sources.length === 0 || 
        (episode.lastScraped && Date.now() - episode.lastScraped > 86400000)) {
      const sources = await scrapeEpisodeSources(
        anime.source, 
        anime.sourceId, 
        episode.number
      );
      
      // Update episode sources
      episode.sources = sources;
      episode.lastScraped = new Date();
      await anime.save();
    }
    
    // Sort sources by priority
    const sortedSources = [...episode.sources].sort((a, b) => a.priority - b.priority);
    
    res.json({
      success: true,
      data: {
        animeTitle: anime.title,
        episodeNumber: episode.number,
        episodeTitle: episode.title,
        sources: sortedSources
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch episode sources',
      error: error.message 
    });
  }
};

// Search anime
export const searchAnime = async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    
    if (!query || query.length < 3) {
      return res.status(400).json({ 
        success: false,
        message: 'Search query must be at least 3 characters' 
      });
    }
    
    // Try database search first
    const dbResults = await Anime.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .limit(10)
    .select('title image slug type');
    
    if (dbResults.length > 0) {
      return res.json({
        success: true,
        source: 'database',
        results: dbResults
      });
    }
    
    // Fallback to scraping search
    const scrapedResults = await scrapeAnimeSearch(query, page);
    
    res.json({
      success: true,
      source: 'scraping',
      results: scrapedResults
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Search failed',
      error: error.message 
    });
  }
};
 
