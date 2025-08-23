import Anime from '../models/Anime.js';
import Episode from '../models/Episode.js';
import { NIGERIA_CONFIG } from '../config/nigeriaConfig.js';
import logger from '../utils/logger.js';

const optimizeForNigeria = (data) => {
  if (data.image) {
    data.image = data.image.replace(
      /(https?:\/\/[^\/]+)/, 
      NIGERIA_CONFIG.cdn.images
    );
  }
  
  if (data.episodes && Array.isArray(data.episodes)) {
    data.episodes.forEach(episode => {
      if (episode.thumbnail) {
        episode.thumbnail = episode.thumbnail.replace(
          /(https?:\/\/[^\/]+)/, 
          NIGERIA_CONFIG.cdn.images
        );
      }
    });
  }
  
  if (data.sources && Array.isArray(data.sources)) {
    data.sources.sort((a, b) => {
      const qualityOrder = NIGERIA_CONFIG.contentPreferences.qualityRanking;
      return qualityOrder.indexOf(a.quality) - qualityOrder.indexOf(b.quality);
    });
  }
  
  return data;
};

export const getTrendingAnime = async (req, res) => {
  try {
    const region = req.query.region || NIGERIA_CONFIG.contentPreferences.trendingRegion;
    const limit = parseInt(req.query.limit) || 20;
    
    const nigeriaAnime = await Anime.find({ 
      tags: { $in: NIGERIA_CONFIG.contentPreferences.promotedGenres } 
    }).limit(3).lean();
    
    const trending = await Anime.find()
      .sort({ popularity: -1 })
      .limit(limit)
      .lean();
    
    const combined = [...nigeriaAnime, ...trending].reduce((acc, anime) => {
      if (!acc.some(a => a._id.equals(anime._id))) acc.push(anime);
      return acc;
    }, []);
    
    const results = combined.slice(0, limit).map(optimizeForNigeria);
    
    res.json({ success: true, region, count: results.length, data: results });
  } catch (error) {
    logger.error(`Trending anime error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch trending anime' });
  }
};

export const searchAnime = async (req, res) => {
  try {
    const { q: query } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    if (!query || query.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 3 characters'
      });
    }
    
    const regex = new RegExp(query, 'i');
    
    const [results, total] = await Promise.all([
      Anime.find({ $or: [
          { title: regex },
          { altTitles: regex },
          { description: regex },
          { tags: regex }
        ]}).skip(skip).limit(limit).lean(),
      Anime.countDocuments({ $or: [
          { title: regex },
          { altTitles: regex },
          { description: regex },
          { tags: regex }
        ]})
    ]);
    
    const optimizedResults = results.map(optimizeForNigeria);
    
    res.json({
      success: true,
      query,
      page,
      totalPages: Math.ceil(total / limit),
      count: optimizedResults.length,
      data: optimizedResults
    });
  } catch (error) {
    logger.error(`Search error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
};

export const getAnimeBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const anime = await Anime.findOne({ slug }).populate('episodes').lean();
    
    if (!anime) return res.status(404).json({ success: false, message: 'Anime not found' });
    
    res.json({ success: true, data: optimizeForNigeria(anime) });
  } catch (error) {
    logger.error(`Anime detail error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch anime details' });
  }
};

export const getAnimeEpisodes = async (req, res) => {
  try {
    const { slug } = req.params;
    const anime = await Anime.findOne({ slug }).select('episodes').lean();
    
    if (!anime) return res.status(404).json({ success: false, message: 'Anime not found' });
    
    const episodes = await Episode.find({ _id: { $in: anime.episodes } }).lean();
    
    const optimizedEpisodes = episodes.map(episode => {
      if (episode.thumbnail) {
        episode.thumbnail = episode.thumbnail.replace(
          /(https?:\/\/[^\/]+)/, 
          NIGERIA_CONFIG.cdn.images
        );
      }
      return episode;
    });
    
    res.json({ success: true, count: optimizedEpisodes.length, data: optimizedEpisodes });
  } catch (error) {
    logger.error(`Episodes fetch error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch episodes' });
  }
};
