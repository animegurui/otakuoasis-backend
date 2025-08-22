import Anime from '../models/Anime.js';
import GogoAnimeScraper from '../scrapers/gogoanime.js';
import NineAnimeScraper from '../scrapers/nineanime.js';
import ZoroScraper from '../scrapers/zoro.js';

const scrapers = {
  gogoanime: new GogoAnimeScraper(),
  nineanime: new NineAnimeScraper(),
  zoro: new ZoroScraper()
};

// Scrape and save anime
export const scrapeAndSaveAnime = async (source, sourceId) => {
  try {
    const scraper = scrapers[source];
    if (!scraper) throw new Error('Invalid source');
    
    // Check if already exists
    const existing = await Anime.findOne({ source, sourceId });
    if (existing) return existing;
    
    // Scrape details
    const animeData = await scraper.getAnimeDetails(sourceId);
    if (!animeData) throw new Error('Failed to scrape anime details');
    
    // Create new anime document
    const anime = new Anime(animeData);
    await anime.save();
    
    return anime;
  } catch (error) {
    throw new Error(`Scrape failed: ${error.message}`);
  }
};

// Scrape episode sources
export const scrapeEpisodeSources = async (source, animeId, episodeNumber) => {
  try {
    const scraper = scrapers[source];
    if (!scraper) throw new Error('Invalid source');
    
    return await scraper.getEpisodeSources(animeId, episodeNumber);
  } catch (error) {
    throw new Error(`Episode scrape failed: ${error.message}`);
  }
};

// Search across scrapers
export const scrapeAnimeSearch = async (query, page = 1) => {
  try {
    const results = await Promise.allSettled([
      scrapers.gogoanime.search(query, page),
      scrapers.nineanime.search(query, page),
      scrapers.zoro.search(query, page)
    ]);
    
    // Combine results from all sources
    const combined = results
      .filter(res => res.status === 'fulfilled')
      .flatMap(res => res.value)
      .reduce((acc, current) => {
        // Deduplicate by title and source
        const exists = acc.some(item => 
          item.title === current.title && item.source === current.source
        );
        if (!exists) acc.push(current);
        return acc;
      }, [])
      .sort((a, b) => {
        // Prioritize exact matches
        const aExact = a.title.toLowerCase() === query.toLowerCase();
        const bExact = b.title.toLowerCase() === query.toLowerCase();
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then by source priority
        const sourcePriority = { gogoanime: 1, zoro: 2, nineanime: 3 };
        return sourcePriority[a.source] - sourcePriority[b.source];
      });
    
    return combined;
  } catch (error) {
    throw new Error(`Search failed: ${error.message}`);
  }
};
 
