import BaseScraper from './baseScraper.js';

export default class MultiSourceScraper {
  constructor() {
    this.sources = {
      gogoanime: new GogoAnimeScraper(),
      nineanime: new NineAnimeScraper(),
      zoro: new ZoroScraper()
    };
  }

  async run(source, limit = 20) {
    if (!this.sources[source]) throw new Error(`Unknown source: ${source}`);
    return this.sources[source].scrapeTrending(limit);
  }

  async search(source, query, page = 1) {
    if (!this.sources[source]) throw new Error(`Unknown source: ${source}`);
    return this.sources[source].scrapeSearch(query, page);
  }

  async animeDetails(source, slug) {
    if (!this.sources[source]) throw new Error(`Unknown source: ${source}`);
    return this.sources[source].scrapeAnimeDetails(slug);
  }

  async episodes(source, slug) {
    if (!this.sources[source]) throw new Error(`Unknown source: ${source}`);
    return this.sources[source].scrapeEpisodes(slug);
  }

  async episodeSources(source, slug, episodeNumber, server = '') {
    if (!this.sources[source]) throw new Error(`Unknown source: ${source}`);
    return this.sources[source].scrapeEpisodeSources(slug, episodeNumber, server);
  }
}

// -------------------- GogoAnime Scraper --------------------
class GogoAnimeScraper extends BaseScraper {
  constructor() { super('https://gogoanime3.co'); }

  async scrapeTrending(limit = 20) {
    const $ = await this.fetchPage(`${this.baseUrl}/popular.html`);
    const trending = [];
    $('.last_episodes .items li').slice(0, limit).each((i, el) => {
      const $el = $(el);
      const title = $el.find('p.name a').text().trim();
      const slug = $el.find('p.name a').attr('href').split('/').pop();
      const image = $el.find('div.img a img').attr('src');
      const episode = parseInt($el.find('p.episode').text().trim().replace('EP ', '')) || 1;

      trending.push({
        id: `gogoanime-${slug}`,
        title,
        slug,
        image,
        latestEpisode: episode,
        source: 'gogoanime'
      });
    });
    return { data: trending, sources: [this.baseUrl] };
  }

  async scrapeSearch(query, page = 1) {
    const $ = await this.fetchPage(`${this.baseUrl}/search.html?keyword=${encodeURIComponent(query)}&page=${page}`);
    const results = [];
    $('.items li').each((i, el) => {
      const $el = $(el);
      const title = $el.find('p.name a').text().trim();
      const slug = $el.find('p.name a').attr('href').split('/').pop();
      const image = $el.find('div.img a img').attr('src');
      const episode = parseInt($el.find('p.episode').text().trim().replace('EP ', '')) || 1;

      results.push({
        id: `gogoanime-${slug}`,
        title,
        slug,
        image,
        latestEpisode: episode,
        source: 'gogoanime'
      });
    });
    return { data: results, currentPage: page, source: 'gogoanime' };
  }

  async scrapeAnimeDetails(slug) {
    const $ = await this.fetchPage(`${this.baseUrl}/category/${slug}`);
    const title = $('.anime_info_body_bg h1').text().trim();
    const image = $('.anime_info_body_bg img').attr('src');
    const description = $('.anime_info_body_bg p.type').nextAll('p').text().trim();
    const episodes = [];

    $('#episode_page li a').each((i, el) => {
      const number = parseInt($(el).text().trim()) || i + 1;
      const epsSlug = $(el).attr('href').split('/').pop();
      episodes.push({ number, slug: epsSlug });
    });

    return { title, slug, image, description, episodes, source: 'gogoanime', latestEpisode: episodes.length };
  }

  async scrapeEpisodes(slug) {
    const $ = await this.fetchPage(`${this.baseUrl}/category/${slug}`);
    const episodes = [];
    $('#episode_page li a').each((i, el) => {
      const number = parseInt($(el).text().trim()) || i + 1;
      const epsSlug = $(el).attr('href').split('/').pop();
      episodes.push({ number, slug: epsSlug, animeSlug: slug });
    });
    return episodes;
  }

  async scrapeEpisodeSources(slug, episodeNumber, server = '') {
    const $ = await this.fetchPage(`${this.baseUrl}/${slug}-episode-${episodeNumber}`);
    const sources = [];
    $('#episode_related a').each((i, el) => {
      sources.push({ server: $(el).text().trim(), url: $(el).attr('href') });
    });
    return server ? sources.filter(s => s.server.toLowerCase().includes(server.toLowerCase())) : sources;
  }
}

// -------------------- NineAnime Scraper --------------------
class NineAnimeScraper extends BaseScraper {
  constructor() { super('https://9anime.pl'); }

  async scrapeTrending(limit = 20) {
    const $ = await this.fetchPage(`${this.baseUrl}/trending`);
    const trending = [];
    $('.film-list > .item').slice(0, limit).each((i, el) => {
      const $el = $(el);
      const title = $el.find('.info .name').text().trim();
      const slug = $el.find('.info .name').attr('href').split('/').pop();
      const image = $el.find('.poster img').attr('src');
      const episode = parseInt($el.find('.ep-status').text().trim().match(/\d+/)?.[0]) || 1;

      trending.push({
        id: `nine-${slug}`,
        title,
        slug,
        image,
        latestEpisode: episode,
        source: 'nineanime'
      });
    });
    return { data: trending, sources: [this.baseUrl] };
  }

  async scrapeSearch(query, page = 1) {
    const $ = await this.fetchPage(`${this.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`);
    const results = [];
    $('.film-list .item').each((i, el) => {
      const $el = $(el);
      const title = $el.find('.info .name').text().trim();
      const slug = $el.find('.info .name').attr('href').split('/').pop();
      const image = $el.find('.poster img').attr('src');
      const episode = parseInt($el.find('.ep-status').text().trim().match(/\d+/)?.[0]) || 1;

      results.push({
        id: `nine-${slug}`,
        title,
        slug,
        image,
        latestEpisode: episode,
        source: 'nineanime'
      });
    });
    return { data: results, currentPage: page, source: 'nineanime' };
  }

  async scrapeAnimeDetails(slug) {
    const $ = await this.fetchPage(`${this.baseUrl}/watch/${slug}`);
    const title = $('.detail .title').text().trim();
    const image = $('.detail .poster img').attr('src');
    const description = $('.detail .content').text().trim();
    const episodes = [];

    $('#episodes a').each((i, el) => {
      const number = parseInt($(el).text().trim()) || i + 1;
      const epsSlug = $(el).attr('href').split('/').pop();
      episodes.push({ number, slug: epsSlug });
    });

    return { title, slug, image, description, episodes, source: 'nineanime', latestEpisode: episodes.length };
  }

  async scrapeEpisodes(slug) {
    const $ = await this.fetchPage(`${this.baseUrl}/watch/${slug}`);
    const episodes = [];
    $('#episodes a').each((i, el) => {
      const number = parseInt($(el).text().trim()) || i + 1;
      const epsSlug = $(el).attr('href').split('/').pop();
      episodes.push({ number, slug: epsSlug, animeSlug: slug });
    });
    return episodes;
  }

  async scrapeEpisodeSources(slug, episodeNumber, server = '') {
    const $ = await this.fetchPage(`${this.baseUrl}/watch/${slug}/ep-${episodeNumber}`);
    const sources = [];
    $('#servers-list > option').each((i, el) => {
      sources.push({ server: $(el).text().trim(), url: $(el).val() });
    });
    return server ? sources.filter(s => s.server.toLowerCase().includes(server.toLowerCase())) : sources;
  }
}

// -------------------- Zoro Scraper --------------------
class ZoroScraper extends BaseScraper {
  constructor() { super('https://zoro.to'); }

  async scrapeTrending(limit = 20) {
    const $ = await this.fetchPage(`${this.baseUrl}/trending`);
    const trending = [];
    $('.film_list-wrap .flw-item').slice(0, limit).each((i, el) => {
      const $el = $(el);
      const title = $el.find('.dynamic-name').text().trim();
      const slug = $el.find('a').attr('href').split('/').pop();
      const image = $el.find('img').attr('data-src') || $el.find('img').attr('src');
      const episode = parseInt($el.find('.tick-eps').text().trim().match(/\d+/)?.[0]) || 1;

      trending.push({
        id: `zoro-${slug}`,
        title,
        slug,
        image,
        latestEpisode: episode,
        source: 'zoro'
      });
    });
    return { data: trending, sources: [this.baseUrl] };
  }

  async scrapeSearch(query, page = 1) {
    const $ = await this.fetchPage(`${this.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`);
    const results = [];
    $('.film_list .item').each((i, el) => {
      const $el = $(el);
      const title = $el.find('.dynamic-name').text().trim();
      const slug = $el.find('a').attr('href').split('/').pop();
      const image = $el.find('img').attr('data-src') || $el.find('img').attr('src');
      const episode = parseInt($el.find('.tick-eps').text().trim().match(/\d+/)?.[0]) || 1;

      results.push({
        id: `zoro-${slug}`,
        title,
        slug,
        image,
        latestEpisode: episode,
        source: 'zoro'
      });
    });
    return { data: results, currentPage: page, source: 'zoro' };
  }

  async scrapeAnimeDetails(slug) {
    const $ = await this.fetchPage(`${this.baseUrl}/watch/${slug}`);
    const title = $('.detail .title').text().trim();
    const image = $('.detail .poster img').attr('src');
    const description = $('.detail .content').text().trim();
    const episodes = [];

    $('#episodes a').each((i, el) => {
      const number = parseInt($(el).text().trim()) || i + 1;
      const epsSlug = $(el).attr('href').split('/').pop();
      episodes.push({ number, slug: epsSlug });
    });

    return { title, slug, image, description, episodes, source: 'zoro', latestEpisode: episodes.length };
  }

  async scrapeEpisodes(slug) {
    const $ = await this.fetchPage(`${this.baseUrl}/watch/${slug}`);
    const episodes = [];
    $('#episodes a').each((i, el) => {
      const number = parseInt($(el).text().trim()) || i + 1;
      const epsSlug = $(el).attr('href').split('/').pop();
      episodes.push({ number, slug: epsSlug, animeSlug: slug });
    });
    return episodes;
  }

  async scrapeEpisodeSources(slug, episodeNumber, server = '') {
    const $ = await this.fetchPage(`${this.baseUrl}/watch/${slug}/ep-${episodeNumber}`);
    const sources = [];
    $('#servers-list > option').each((i, el) => {
      sources.push({ server: $(el).text().trim(), url: $(el).val()
