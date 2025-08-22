export const schemas = {
  Anime: {
    type: 'object',
    properties: {
      id: { type: 'string', example: '507f1f77bcf86cd799439011' },
      title: { type: 'string', example: 'Attack on Titan' },
      slug: { type: 'string', example: 'attack-on-titan' },
      image: { type: 'string', example: 'https://example.com/aot.jpg' },
      rating: { type: 'number', example: 9.0 },
      releaseDate: { type: 'string', example: '2013-04-07' },
      status: { type: 'string', example: 'Completed', enum: ['Ongoing', 'Completed', 'Upcoming'] }
    }
  },
  
  AnimeDetails: {
    allOf: [
      { $ref: '#/components/schemas/Anime' },
      {
        type: 'object',
        properties: {
          description: { type: 'string', example: 'In a world where humanity lives inside cities...' },
          genres: { 
            type: 'array', 
            items: { type: 'string' },
            example: ['Action', 'Drama', 'Fantasy']
          },
          totalEpisodes: { type: 'integer', example: 75 },
          episodes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                number: { type: 'integer', example: 1 },
                title: { type: 'string', example: 'To You, in 2000 Years' },
                thumbnail: { type: 'string', example: 'https://example.com/ep1.jpg' }
              }
            }
          }
        }
      }
    ]
  },
  
  VideoSource: {
    type: 'object',
    properties: {
      quality: { type: 'string', example: '1080p' },
      url: { type: 'string', example: 'https://stream.example.com/video.mp4' },
      isM3U8: { type: 'boolean', example: true },
      server: { type: 'string', example: 'Vidstream' },
      priority: { type: 'integer', example: 1 }
    }
  }
};
