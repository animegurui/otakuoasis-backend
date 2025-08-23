import BaseScraper from './baseScraper.js';

export default class ZoroScraper extends BaseScraper {
  constructor() {
    super('https://zoro.to', {
      headers: {
        'Referer': 'https://zoro.to/',
        'Accept-Encoding': 'gzip'
      }
    });
  }

  async scrapeTrending(limit = 20) {
    const url = `${this.baseUrl}/popular`;
    const $ = await this.fetchPage(url);
    
    const trending = [];
    
    $('.film_list-wrap .film-detail').slice(0, limit).each((i, el) => {
      const $el = $(el);
      const title = $el.find('.film-name a').attr('title');
      const slug = $el.find('.film-name a').attr('href').split('/')[2];
      const image = $el.find('img').attr('data-src');
      
      trending.push({
        id: `zoro-${slug}`,
        title,
        slug,
        image,
        source: 'zoro'
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
    
    $('.film_list-wrap .film-detail').each((i, el) => {
      const $el = $(el);
      const title = $el.find('.film-name a').attr('title');
      const slug = $el.find('.film-name a').attr('href').split('/')[2];
      const image = $el.find('img').attr('data-src');
      
      results.push({
        id: `zoro-${slug}`,
        title,
        slug,
        image,
        source: 'zoro'
      });
    });
    
    // Check if there's more pages
    hasMore = $('.pagination').find('li:last-child a').text().includes('Next');
    
    return {
      data: results,
      hasMore,
      currentPage: page,
      source: 'zoro'
    };
  }

  async scrapeAnimeDetails(slug) {
    const url = `${this.baseUrl}/watch/${slug}`;
    const $ = await this.fetchPage(url);
    
    const title = $('.anisc-detail .film-name').text().trim();
    const image = $('.anisc-poster .film-poster-img').attr('src');
    const description = $('.anisc-detail .film-description').text().trim();
    
    const details = {};
    $('.anisc-detail .item').each((i, el) => {
      const $el = $(el);
      const key = $el.find('.name').text().trim().toLowerCase();
      const value = $el.find('.value').text().trim();
      details[key] = value;
    });
    
    // Extract genres
    const genres = [];
    $('.anisc-info .item[data-id="genres"] a').each((i, el) => {
      genres.push($(el).text().trim());
    });
    
    // Extract episodes
    const episodes = [];
    $('#episodes-content a').each((i, el) => {
      const $el = $(el);
      const number = $el.find('.d-title').text().replace('Episode ', '').trim();
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
      released: details['released'],
      genres,
      episodes,
      source: 'zoro',
      rating: parseFloat(details['score']) || 0,
      popularity: episodes.length * 100 || 0
    };
  }

  async scrapeEpisodes(slug) {
    const url = `${this.baseUrl}/watch/${slug}`;
    const $ = await this.fetchPage(url);
    
    const episodes = [];
    
    $('#episodes-content a').each((i, el) => {
      const $el = $(el);
      const number = $el.find('.d-title').text().replace('Episode ', '').trim();
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
    const url = `${this.baseUrl}/watch/${slug}/episode/${episodeNumber}`;
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
