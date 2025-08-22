// Get episode sources
export const getEpisodeSources = async (req, res) => {
  try {
    const { slug, episodeNumber } = req.params;
    const { quality = 'auto' } = req.query;

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
    if (
      !episode.sources || episode.sources.length === 0 || 
      (episode.lastScraped && Date.now() - episode.lastScraped > 86400000)
    ) {
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

    // Nigerian-friendly quality prioritization
    const preferredQualities = quality === 'auto'
      ? ['480p', '360p', '720p', '1080p']
      : [quality, '480p', '360p', '720p', '1080p'];

    const sortedSources = [...episode.sources].sort((a, b) => {
      const aIndex = preferredQualities.indexOf(a.quality);
      const bIndex = preferredQualities.indexOf(b.quality);
      return aIndex - bIndex;
    });

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
