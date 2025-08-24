import BaseScraper from './baseScraper.js';

export default class GogoanimeScraper extends BaseScraper {
  constructor() {
    super('https://gogoanime3.co', {
      headers: {
        'Referer': 'https://gogoanime3.co/',
        'Accept-Encoding': 'gzip'
      }
    });
  }

  async scrapeTrending(limit = 20) {
    try {
      const url = `${this.baseUrl}/popular.html`;
      const $ = await this.fetchPage(url);

      const trending = [];

      $('.last_episodes > ul > li').slice(0, limit).each((i, el) => {
        const $el = $(el);
        const title = $el.find('p.name a').attr('title');
        const slug = $el.find('p.name a').attr('href').split('/')[1];
        const image = $el.find('div.img img').attr('src');
        const episode = $el.find('p.episode').text().trim().match(/\d+/)?.[0] || '1';

        trending.push({
          id: `gogo-${slug}`,
          title,
          slug,
          image,
          latestEpisode: parseInt(episode),
          source: 'gogoanime'
        });
      });

      // Report scraping stats if BaseScraper implements reportScrape
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'gogoanime', entries: trending.length, errors: 0 });
        }
      } catch (rErr) {
        // Don't fail the method because of reporting
        // eslint-disable-next-line no-console
        console.warn('⚠️ reportScrape failed (gogoanime scrapeTrending):', rErr?.message || rErr);
      }

      return {
        data: trending,
        sources: [this.baseUrl]
      };
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'gogoanime', entries: 0, errors: 1 });
        }
      } catch (_) { /* swallow */ }

      throw err;
    }
  }

  async scrapeSearch(query, page = 1) {
    try {
      const url = `${this.baseUrl}/search.html?keyword=${encodeURIComponent(query)}&page=${page}`;
      const $ = await this.fetchPage(url);

      const results = [];
      let hasMore = true;

      $('.last_episodes > ul > li').each((i, el) => {
        const $el = $(el);
        const title = $el.find('p.name a').attr('title');
        const slug = $el.find('p.name a').attr('href').split('/')[1];
        const image = $el.find('div.img img').attr('src');
        const released = $el.find('p.released').text().trim().replace('Released: ', '');

        results.push({
          id: `gogo-${slug}`,
          title,
          slug,
          image,
          released,
          source: 'gogoanime'
        });
      });

      // Check if there's more pages
      hasMore = $('.pagination-list').find('li:last-child a').text().includes('Next');

      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'gogoanime', entries: results.length, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (gogoanime scrapeSearch):', rErr?.message || rErr);
      }

      return {
        data: results,
        hasMore,
        currentPage: page,
        source: 'gogoanime'
      };
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'gogoanime', entries: 0, errors: 1 });
        }
      } catch (_) {}

      throw err;
    }
  }

  async scrapeAnimeDetails(slug) {
    try {
      const url = `${this.baseUrl}/category/${slug}`;
      const $ = await this.fetchPage(url);

      const title = $('.anime_info_body h1').text().trim();
      const image = $('.anime_info_body img').attr('src');
      const description = $('.anime_info_body p:eq(0)').text().replace('Plot Summary: ', '').trim();

      const details = {};
      $('.anime_info_body .type').each((i, el) => {
        const $el = $(el);
        const key = $el.text().split(':')[0].trim().toLowerCase();
        const value = $el.text().split(':').slice(1).join(':').trim();
        details[key] = value;
      });

      // Extract genres
      const genres = [];
      $('.anime_info_body .type:contains("Genre") a').each((i, el) => {
        genres.push($(el).text().trim());
      });

      // Extract episodes
      const episodes = [];
      $('#episode_related li').each((i, el) => {
        const $el = $(el);
        const number = $el.find('.name').text().replace('EP ', '').trim();
        const url = $el.find('a').attr('href').split('/')[1];
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
        released: details['released'],
        genres,
        episodes,
        source: 'gogoanime',
        rating: parseFloat(details['score']) || 0,
        popularity: episodes.length * 100 || 0
      };

      try {
        if (typeof this.reportScrape === 'function') {
          // For details page, count as 1 entry scraped
          await this.reportScrape({ source: 'gogoanime', entries: 1, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (gogoanime scrapeAnimeDetails):', rErr?.message || rErr);
      }

      return result;
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'gogoanime', entries: 0, errors: 1 });
        }
      } catch (_) {}

      throw err;
    }
  }

  async scrapeEpisodes(slug) {
    try {
      const url = `${this.baseUrl}/category/${slug}`;
      const $ = await this.fetchPage(url);

      const episodes = [];

      $('#episode_related li').each((i, el) => {
        const $el = $(el);
        const number = $el.find('.name').text().replace('EP ', '').trim();
        const url = $el.find('a').attr('href').split('/')[1];

        episodes.push({
          number: parseInt(number),
          slug: url,
          title: `Episode ${number}`,
          thumbnail: $el.find('img').attr('src') || '',
          animeSlug: slug
        });
      });

      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'gogoanime', entries: episodes.length, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (gogoanime scrapeEpisodes):', rErr?.message || rErr);
      }

      return episodes;
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'gogoanime', entries: 0, errors: 1 });
        }
      } catch (_) {}

      throw err;
    }
  }

  async scrapeEpisodeSources(slug, episodeNumber, server = '') {
    try {
      const episodeSlug = slug.replace('episode-', '');
      const url = `${this.baseUrl}/${episodeSlug}`;
      const $ = await this.fetchPage(url);

      const servers = [];
      $('#load_anime > div > div.anime_muti_link > ul > li').each((i, el) => {
        const $el = $(el);
        const serverName = $el.text().trim();
        const videoUrl = $el.find('a').attr('data-video');
        servers.push({
          server: serverName,
          url: videoUrl
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
          // we don't count sources as "entries" but still report a successful hit
          await this.reportScrape({ source: 'gogoanime', entries: filteredServers.length, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (gogoanime scrapeEpisodeSources):', rErr?.message || rErr);
      }

      return filteredServers;
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'gogoanime', entries: 0, errors: 1 });
        }
      } catch (_) {}

      throw err;
    }
  }
}
