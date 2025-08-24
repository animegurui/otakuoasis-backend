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
    try {
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

      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: '9anime', entries: trending.length, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (9anime scrapeTrending):', rErr?.message || rErr);
      }

      return {
        data: trending,
        sources: [this.baseUrl]
      };
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: '9anime', entries: 0, errors: 1 });
        }
      } catch (_) {}

      throw err;
    }
  }

  async scrapeSearch(query, page = 1) {
    try {
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

      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: '9anime', entries: results.length, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (9anime scrapeSearch):', rErr?.message || rErr);
      }

      return {
        data: results,
        hasMore,
        currentPage: page,
        source: '9anime'
      };
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: '9anime', entries: 0, errors: 1 });
        }
      } catch (_) {}

      throw err;
    }
  }

  async scrapeAnimeDetails(slug) {
    try {
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

      const result = {
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

      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: '9anime', entries: 1, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (9anime scrapeAnimeDetails):', rErr?.message || rErr);
      }

      return result;
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: '9anime', entries: 0, errors: 1 });
        }
      } catch (_) {}

      throw err;
    }
  }

  async scrapeEpisodes(slug) {
    try {
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

      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: '9anime', entries: episodes.length, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (9anime scrapeEpisodes):', rErr?.message || rErr);
      }

      return episodes;
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: '9anime', entries: 0, errors: 1 });
        }
      } catch (_) {}

      throw err;
    }
  }

  async scrapeEpisodeSources(slug, episodeNumber, server = '') {
    try {
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

      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: '9anime', entries: filteredServers.length, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (9anime scrapeEpisodeSources):', rErr?.message || rErr);
      }

      return filteredServers;
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: '9anime', entries: 0, errors: 1 });
        }
      } catch (_) {}

      throw err;
    }
  }
}
