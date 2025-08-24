// src/scrapers/multiSourceScraper.js
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
    const s = this.sources[source];
    if (!s) throw new Error(`Unknown source: ${source}`);
    return s.scrapeTrending(limit);
  }

  async search(source, query, page = 1) {
    const s = this.sources[source];
    if (!s) throw new Error(`Unknown source: ${source}`);
    return s.scrapeSearch(query, page);
  }

  async animeDetails(source, slug) {
    const s = this.sources[source];
    if (!s) throw new Error(`Unknown source: ${source}`);
    return s.scrapeAnimeDetails(slug);
  }

  async episodes(source, slug) {
    const s = this.sources[source];
    if (!s) throw new Error(`Unknown source: ${source}`);
    return s.scrapeEpisodes(slug);
  }

  async episodeSources(source, slug, episodeNumber, server = '') {
    const s = this.sources[source];
    if (!s) throw new Error(`Unknown source: ${source}`);
    return s.scrapeEpisodeSources(slug, episodeNumber, server);
  }
}

/* --------------------
   GogoAnime Scraper
   -------------------- */
class GogoAnimeScraper extends BaseScraper {
  constructor() { super('https://gogoanime3.co'); }

  async scrapeTrending(limit = 20) {
    const url = `${this.baseUrl}/popular.html`;
    const $ = await this.fetchPage(url);

    const trending = [];
    $('.last_episodes .items li, .film_list-wrap .flw-item').slice(0, limit).each((i, el) => {
      const $el = $(el);
      const $a = $el.find('p.name a, .name a').first();
      const title = ($a.text() || '').trim();
      const href = $a.attr('href') || '';
      const slug = href.split('/').filter(Boolean).pop() || '';
      const image = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';
      const epText = $el.find('p.episode, .episode').text() || '';
      const episode = parseInt((epText.match(/\d+/) || ['1'])[0], 10) || 1;

      trending.push({
        id: `gogo-${slug}`,
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
    const url = `${this.baseUrl}/search.html?keyword=${encodeURIComponent(query)}&page=${page}`;
    const $ = await this.fetchPage(url);

    const results = [];
    $('.last_episodes .items li, .items li, .film_list-wrap .flw-item').each((i, el) => {
      const $el = $(el);
      const $a = $el.find('p.name a, .name a').first();
      const title = ($a.text() || '').trim();
      const href = $a.attr('href') || '';
      const slug = href.split('/').filter(Boolean).pop() || '';
      const image = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';
      const epText = $el.find('p.episode, .episode').text() || '';
      const episode = parseInt((epText.match(/\d+/) || ['1'])[0], 10) || 1;

      results.push({
        id: `gogo-${slug}`,
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
    const url = `${this.baseUrl}/category/${slug}`;
    const $ = await this.fetchPage(url);

    const title = ($('.anime_info_body_bg h1, .anime_info_body_bg h2').first().text() || '').trim();
    const image = $('.anime_info_body_bg img').first().attr('src') || '';
    // description often after some p.type elements
    const description = ($('.anime_info_body_bg .type').first().nextAll('p').text() || '').trim();

    const episodes = [];
    $('#episode_page li a, .episode_page li a').each((i, el) => {
      const $el = $(el);
      const txt = ($el.text() || '').trim();
      const number = parseInt((txt.match(/\d+/) || [i + 1])[0], 10) || (i + 1);
      const href = $el.attr('href') || '';
      const epSlug = href.split('/').filter(Boolean).pop() || '';
      episodes.push({ number, slug: epSlug });
    });

    return {
      title,
      slug,
      image,
      description,
      episodes,
      source: 'gogoanime',
      latestEpisode: episodes.length
    };
  }

  async scrapeEpisodes(slug) {
    const url = `${this.baseUrl}/category/${slug}`;
    const $ = await this.fetchPage(url);

    const episodes = [];
    $('#episode_page li a, .episode_page li a').each((i, el) => {
      const $el = $(el);
      const txt = ($el.text() || '').trim();
      const number = parseInt((txt.match(/\d+/) || [i + 1])[0], 10) || (i + 1);
      const href = $el.attr('href') || '';
      const epSlug = href.split('/').filter(Boolean).pop() || '';
      episodes.push({ number, slug: epSlug, title: `Episode ${number}`, thumbnail: '', animeSlug: slug });
    });

    return episodes;
  }

  async scrapeEpisodeSources(slug, episodeNumber, server = '') {
    const url = `${this.baseUrl}/${slug}-episode-${episodeNumber}`;
    const $ = await this.fetchPage(url);

    const sources = [];
    $('.play-video a, #episode_related a, .anime_muti_link li a').each((i, el) => {
      const $el = $(el);
      const serverName = ($el.text() || '').trim() || `server-${i}`;
      const href = $el.attr('data-video') || $el.attr('href') || $el.attr('data-src') || '';
      sources.push({ server: serverName, url: href });
    });

    if (server) {
      const lower = server.toLowerCase();
      const filtered = sources.filter(s => (s.server || '').toLowerCase().includes(lower));
      return filtered.length ? filtered : sources.slice(0, 1);
    }

    return sources;
  }
}

/* --------------------
   NineAnime Scraper
   -------------------- */
class NineAnimeScraper extends BaseScraper {
  constructor() { super('https://9anime.pl'); }

  async scrapeTrending(limit = 20) {
    const url = `${this.baseUrl}/trending`;
    const $ = await this.fetchPage(url);

    const trending = [];
    $('.film-list > .item, .film-list .item').slice(0, limit).each((i, el) => {
      const $el = $(el);
      const $a = $el.find('a').first();
      const title = ($el.find('.info .name').text() || $a.text() || '').trim();
      const href = ($el.find('.info .name').attr('href') || $a.attr('href') || '') + '';
      const slug = href.split('/').filter(Boolean).pop() || '';
      const image = $el.find('.poster img').attr('src') || $el.find('img').attr('src') || '';
      const epText = ($el.find('.ep-status').text() || '');
      const episode = parseInt((epText.match(/\d+/) || ['1'])[0], 10) || 1;

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
    const url = `${this.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`;
    const $ = await this.fetchPage(url);

    const results = [];
    $('.film-list .item, .film-list > .item').each((i, el) => {
      const $el = $(el);
      const $a = $el.find('a').first();
      const title = ($el.find('.info .name').text() || $a.text() || '').trim();
      const href = ($el.find('.info .name').attr('href') || $a.attr('href') || '') + '';
      const slug = href.split('/').filter(Boolean).pop() || '';
      const image = $el.find('.poster img').attr('src') || $el.find('img').attr('src') || '';
      const epText = ($el.find('.ep-status').text() || '');
      const episode = parseInt((epText.match(/\d+/) || ['1'])[0], 10) || 1;

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
    const url = `${this.baseUrl}/watch/${slug}`;
    const $ = await this.fetchPage(url);

    const title = ($('.detail .title').text() || '').trim();
    const image = $('.detail .poster img').attr('src') || '';
    const description = ($('.detail .content').text() || '').trim();

    const episodes = [];
    $('#episodes a').each((i, el) => {
      const $el = $(el);
      const txt = ($el.text() || '').trim();
      const number = parseInt((txt.match(/\d+/) || [i + 1])[0], 10) || (i + 1);
      const href = $el.attr('href') || '';
      const epSlug = href.split('/').filter(Boolean).pop() || '';
      episodes.push({ number, slug: epSlug });
    });

    return {
      title,
      slug,
      image,
      description,
      episodes,
      source: 'nineanime',
      latestEpisode: episodes.length
    };
  }

  async scrapeEpisodes(slug) {
    const url = `${this.baseUrl}/watch/${slug}`;
    const $ = await this.fetchPage(url);

    const episodes = [];
    $('#episodes a').each((i, el) => {
      const $el = $(el);
      const txt = ($el.text() || '').trim();
      const number = parseInt((txt.match(/\d+/) || [i + 1])[0], 10) || (i + 1);
      const href = $el.attr('href') || '';
      const epSlug = href.split('/').filter(Boolean).pop() || '';
      episodes.push({ number, slug: epSlug, title: `Episode ${number}`, thumbnail: '', animeSlug: slug });
    });

    return episodes;
  }

  async scrapeEpisodeSources(slug, episodeNumber, server = '') {
    const url = `${this.baseUrl}/watch/${slug}/ep-${episodeNumber}`;
    const $ = await this.fetchPage(url);

    const servers = [];
    $('#servers-list > option').each((i, el) => {
      const $el = $(el);
      servers.push({ server: ($el.text() || '').trim(), url: $el.val() || '' });
    });

    $('.server-list a, .servers a').each((i, el) => {
      const $el = $(el);
      const txt = ($el.text() || '').trim();
      const href = $el.attr('href') || $el.data('src') || '';
      servers.push({ server: txt || `server-${i}`, url: href });
    });

    if (server) {
      const lower = server.toLowerCase();
      const filtered = servers.filter(s => (s.server || '').toLowerCase().includes(lower));
      return filtered.length ? filtered : servers.slice(0, 1);
    }

    return servers;
  }
}

/* --------------------
   Zoro Scraper
   -------------------- */
class ZoroScraper extends BaseScraper {
  constructor() { super('https://zoro.to'); }

  async scrapeTrending(limit = 20) {
    const url = `${this.baseUrl}/trending`;
    const $ = await this.fetchPage(url);

    const trending = [];
    $('.film_list-wrap .flw-item, .flw-item').slice(0, limit).each((i, el) => {
      const $el = $(el);
      const $a = $el.find('a').first();
      const title = ($el.find('.dynamic-name').text() || $a.text() || '').trim();
      const href = ($a.attr('href') || '') + '';
      const slug = href.split('/').filter(Boolean).pop() || '';
      const image = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';
      const epText = ($el.find('.tick-eps').text() || '');
      const episode = parseInt((epText.match(/\d+/) || ['1'])[0], 10) || 1;

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
    const url = `${this.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`;
    const $ = await this.fetchPage(url);

    const results = [];
    $('.film_list .item, .flw-item').each((i, el) => {
      const $el = $(el);
      const $a = $el.find('a').first();
      const title = ($el.find('.dynamic-name').text() || $a.text() || '').trim();
      const href = ($a.attr('href') || '') + '';
      const slug = href.split('/').filter(Boolean).pop() || '';
      const image = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';
      const epText = ($el.find('.tick-eps').text() || '');
      const episode = parseInt((epText.match(/\d+/) || ['1'])[0], 10) || 1;

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
    const url = `${this.baseUrl}/watch/${slug}`;
    const $ = await this.fetchPage(url);

    const title = ($('.detail .title').text() || '').trim();
    const image = $('.detail .poster img').attr('src') || '';
    const description = ($('.detail .content').text() || '').trim();

    const episodes = [];
    $('#episodes a').each((i, el) => {
      const $el = $(el);
      const txt = ($el.text() || '').trim();
      const number = parseInt((txt.match(/\d+/) || [i + 1])[0], 10) || (i + 1);
      const href = $el.attr('href') || '';
      const epSlug = href.split('/').filter(Boolean).pop() || '';
      episodes.push({ number, slug: epSlug });
    });

    return {
      title,
      slug,
      image,
      description,
      episodes,
      source: 'zoro',
      latestEpisode: episodes.length
    };
  }

  async scrapeEpisodes(slug) {
    const url = `${this.baseUrl}/watch/${slug}`;
    const $ = await this.fetchPage(url);

    const episodes = [];
    $('#episodes a').each((i, el) => {
      const $el = $(el);
      const txt = ($el.text() || '').trim();
      const number = parseInt((txt.match(/\d+/) || [i + 1])[0], 10) || (i + 1);
      const href = $el.attr('href') || '';
      const epSlug = href.split('/').filter(Boolean).pop() || '';
      episodes.push({ number, slug: epSlug, title: `Episode ${number}`, thumbnail: '', animeSlug: slug });
    });

    return episodes;
  }

  async scrapeEpisodeSources(slug, episodeNumber, server = '') {
    const url = `${this.baseUrl}/watch/${slug}/ep-${episodeNumber}`;
    const $ = await this.fetchPage(url);

    const servers = [];
    $('#servers-list > option').each((i, el) => {
      const $el = $(el);
      servers.push({ server: ($el.text() || '').trim(), url: $el.val() || '' });
    });

    $('.server-list a, .servers a').each((i, el) => {
      const $el = $(el);
      const txt = ($el.text() || '').trim();
      const href = $el.attr('href') || $el.data('src') || '';
      servers.push({ server: txt || `server-${i}`, url: href });
    });

    if (server) {
      const lower = server.toLowerCase();
      const filtered = servers.filter(s => (s.server || '').toLowerCase().includes(lower));
      return filtered.length ? filtered : servers.slice(0, 1);
    }

    return servers;
  }
}
