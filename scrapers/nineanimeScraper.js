import BaseScraper from './baseScraper.js';

export default class NineanimeScraper extends BaseScraper {
  constructor() {
    super('https://9animetv.to', {
      headers: {
        'Referer': 'https://9animetv.to/',
        'Accept-Encoding': 'gzip'
      }
    });
  }

  async scrapeTrending(limit = 20) {
    const url = `${this.baseUrl}/home`;
    const $ = await this.fetchPage(url);
    
    const trending = [];
    
    $('.trending-list .item').slice(0, limit).each((i, el) => {
      const $el = $(el);
      const title = $el.find('.name').text().trim();
      const slug = $el.find('a').attr('href').split('/')[2];
      const image = $el.find('img').attr('src');
      
      trending.push({
        id: `9anime-${slug}`,
        title,
        slug,
        image,
        source: '9anime'
      });
    });
    
    return {
      data: trending,
      sources: [this.baseUrl]
    };
  }

  async scrapeSearch(query, page = 1) {
    const url = `${this.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`;
    const $ = await this.fetchPage(url);
    
    const results = [];
    let hasMore = true;
    
    $('.film-list .item').each((i, el) => {
      const $el = $(el);
      const title = $el.find('.name').text().trim();
      const slug = $el.find('a').attr('href').split('/')[2];
      const image = $el.find('img').attr('src');
      
      results.push({
        id: `9anime-${slug}`,
        title,
        slug,
        image,
        source: '9anime'
      });
    });
    
    // Check if there's more pages
    hasMore = $('.pagination').find('li:last-child a').text().includes('Next');
    
    return {
      data: results,
      hasMore,
      currentPage: page,
      source: '9anime'
    };
  }

  async scrapeAnimeDetails(slug) {
    const url = `${this.baseUrl}/watch/${slug}`;
    const $ = await this.fetchPage(url);
    
    const title = $('.detail .title').text().trim();
    const image = $('.detail .poster img').attr('src');
    const description = $('.detail .content').text().trim();
    
    const details = {};
    $('.detail .meta .row').each((i, el) => {
      const $el = $(el);
      const key = $el.find('.type').text().trim().toLowerCase();
      const value = $el.find('.content').text().trim();
      details[key] = value;
    });
    
    // Extract genres
    const genres = [];
    $('.detail .genre a').each((i, el) => {
      genres.push($(el).text().trim());
    });
    
    // Extract episodes
    const episodes = [];
    $('#episodes a').each((i, el) => {
      const $el = $(el);
      const number = $el.text().trim();
      const url = $el.attr('href').split('/')[2];
      episodes.push({
        number: parseInt(number),
        slug: url
      });
    });
    
    return {
      title,
      slug,
      image,
      description,
      type: details['type'],
      status: details['status'],
      released: details['year'],
      genres,
      episodes,
      source: '9anime',
      rating: parseFloat(details['score']?.split('/')[0]) || 0,
      popularity: episodes.length * 100 || 0
    };
  }

  async scrapeEpisodes(slug) {
    const url = `${this.baseUrl}/watch/${slug}`;
    const $ = await this.fetchPage(url);
    
    const episodes = [];
    
    $('#episodes a').each((i, el) => {
      const $el = $(el);
      const number = $el.text().trim();
      const url = $el.attr('href').split('/')[2];
      
      episodes.push({
        number: parseInt(number),
        slug: url,
        title: `Episode ${number}`,
        thumbnail: '',
        animeSlug: slug
      });
    });
    
    return episodes;
  }

  async scrapeEpisodeSources(slug, episodeNumber, server = '') {
    const url = `${this.baseUrl}/watch/${slug}/ep-${episodeNumber}`;
    const $ = await this.fetchPage(url);
    
    const servers = [];
    $('#servers-list > option').each((i, el) => {
      const $el = $(el);
      servers.push({
        server: $el.text().trim(),
        url: $el.val()
      });
    });
    
    // Filter by preferred server if specified
    let filteredServers = servers;
    if (server) {
      filteredServers = servers.filter(s => 
        s.server.toLowerCase().includes(server.toLowerCase())
      );
    }
    
    // If no filtered servers, use the first available
    if (filteredServers.length === 0 && servers.length > 0) {
      filteredServers = [servers[0]];
    }
    
    return filteredServers;
  }
}
