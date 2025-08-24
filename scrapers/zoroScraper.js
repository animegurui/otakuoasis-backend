import BaseScraper from './baseScraper.js';
import mongoose from 'mongoose';

const Anime = mongoose.models.Anime || mongoose.model('Anime', new mongoose.Schema({
  id: String,
  title: String,
  slug: String,
  image: String,
  latestEpisode: Number,
  source: String,
  updatedAt: { type: Date, default: Date.now }
}));

export default class ZoroScraper extends BaseScraper {
  constructor() {
    super('https://zoro.to'); // base URL from your update
  }

  // Run: scrapes trending and upserts into MongoDB
  async run() {
    console.log('🚀 Running ZoroScraper...');
    try {
      const { data: trending } = await this.scrapeTrending(20);

      if (!trending || trending.length === 0) {
        console.warn('⚠️ No trending anime scraped from zoro');
        return 0;
      }

      for (const anime of trending) {
        await Anime.findOneAndUpdate(
          { id: anime.id },
          { ...anime, updatedAt: new Date() },
          { upsert: true, new: true }
        );
      }

      console.log(`✅ ZoroScraper finished — saved ${trending.length} entries`);
      return trending.length;
    } catch (err) {
      console.error('❌ ZoroScraper run() failed:', err.message || err);
      throw err;
    }
  }

  // Trending (from your update)
  async scrapeTrending(limit = 20) {
    try {
      const url = `${this.baseUrl}/trending`;
      const $ = await this.fetchPage(url);

      const trending = [];
      $('.film_list-wrap .flw-item').slice(0, limit).each((i, el) => {
        const $el = $(el);
        const title = $el.find('.dynamic-name').text().trim();
        const href = $el.find('a').attr('href') || '';
        const slug = href.split('/').filter(Boolean).pop() || '';
        const image = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';
        const episode = ($el.find('.tick-eps').text().trim().match(/\d+/) || ['1'])[0];

        trending.push({
          id: `zoro-${slug}`,
          title,
          slug,
          image,
          latestEpisode: parseInt(episode, 10) || 1,
          source: 'zoro'
        });
      });

      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'zoro', entries: trending.length, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (zoro scrapeTrending):', rErr?.message || rErr);
      }

      return { data: trending, sources: [this.baseUrl] };
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'zoro', entries: 0, errors: 1 });
        }
      } catch (_) {}
      throw err;
    }
  }

  // Search: best-effort using film_list-wrap items
  async scrapeSearch(query, page = 1) {
    try {
      const url = `${this.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`;
      const $ = await this.fetchPage(url);

      const results = [];
      $('.film_list-wrap .flw-item').each((i, el) => {
        const $el = $(el);
        const title = $el.find('.dynamic-name').text().trim();
        const href = $el.find('a').attr('href') || '';
        const slug = href.split('/').filter(Boolean).pop() || '';
        const image = $el.find('img').attr('data-src') || $el.find('img').attr('src') || '';

        results.push({
          id: `zoro-${slug}`,
          title,
          slug,
          image,
          source: 'zoro'
        });
      });

      // naive hasMore detection - presence of pagination with Next text
      let hasMore = false;
      hasMore = $('.pagination').find('a:contains("Next"), a:contains("next")').length > 0;

      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'zoro', entries: results.length, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (zoro scrapeSearch):', rErr?.message || rErr);
      }

      return { data: results, hasMore, currentPage: page, source: 'zoro' };
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'zoro', entries: 0, errors: 1 });
        }
      } catch (_) {}
      throw err;
    }
  }

  // Anime details: best-effort selectors (may require tweaks depending on page layout)
  async scrapeAnimeDetails(slug) {
    try {
      const url = `${this.baseUrl}/watch/${slug}`;
      const $ = await this.fetchPage(url);

      // Generic selectors with fallbacks
      const title = $('.film-detail .title, .detail .title').first().text().trim() || $('.dynamic-name').first().text().trim();
      const image = $('.film-poster img, .poster img').first().attr('data-src') || $('.film-poster img, .poster img').first().attr('src') || '';
      const description = $('.film-description, .desc, .detail .content').first().text().trim() || '';

      const details = {};
      $('.film-detail .item, .detail .meta .row').each((i, el) => {
        const $el = $(el);
        const key = ($el.find('.label, .type').text() || $el.find('strong').text()).trim().toLowerCase();
        const value = ($el.find('.value, .content').text() || $el.text()).trim();
        if (key) details[key] = value;
      });

      // genres
      const genres = [];
      $('.film-detail .genres a, .detail .genre a').each((i, el) => {
        genres.push($(el).text().trim());
      });

      // episodes
      const episodes = [];
      $('#episodes a, .eps .ep-item a').each((i, el) => {
        const $el = $(el);
        const numberText = $el.text().trim();
        const number = parseInt(numberText.match(/\d+/)?.[0] || (i + 1), 10);
        const href = $el.attr('href') || '';
        const epSlug = href.split('/').filter(Boolean).pop() || '';
        episodes.push({
          number,
          slug: epSlug
        });
      });

      const result = {
        title,
        slug,
        image,
        description,
        type: details['type'] || details['format'],
        status: details['status'],
        released: details['year'] || details['released'],
        genres,
        episodes,
        source: 'zoro',
        rating: parseFloat((details['score'] || '').split('/')[0]) || 0,
        popularity: episodes.length * 100 || 0
      };

      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'zoro', entries: 1, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (zoro scrapeAnimeDetails):', rErr?.message || rErr);
      }

      return result;
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'zoro', entries: 0, errors: 1 });
        }
      } catch (_) {}
      throw err;
    }
  }

  // Episodes list
  async scrapeEpisodes(slug) {
    try {
      const url = `${this.baseUrl}/watch/${slug}`;
      const $ = await this.fetchPage(url);

      const episodes = [];
      $('#episodes a, .eps .ep-item a').each((i, el) => {
        const $el = $(el);
        const numberText = $el.text().trim();
        const number = parseInt(numberText.match(/\d+/)?.[0] || (i + 1), 10);
        const href = $el.attr('href') || '';
        const epSlug = href.split('/').filter(Boolean).pop() || '';

        episodes.push({
          number,
          slug: epSlug,
          title: `Episode ${number}`,
          thumbnail: '',
          animeSlug: slug
        });
      });

      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'zoro', entries: episodes.length, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (zoro scrapeEpisodes):', rErr?.message || rErr);
      }

      return episodes;
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'zoro', entries: 0, errors: 1 });
        }
      } catch (_) {}
      throw err;
    }
  }

  // Episode sources: looks for server list / options
  async scrapeEpisodeSources(slug, episodeNumber, server = '') {
    try {
      const url = `${this.baseUrl}/watch/${slug}/ep-${episodeNumber}`;
      const $ = await this.fetchPage(url);

      const servers = [];
      // Many zoro pages list sources differently — check a few common patterns
      $('#servers-list > option').each((i, el) => {
        const $el = $(el);
        servers.push({
          server: $el.text().trim(),
          url: $el.val()
        });
      });

      // Fallback: anchors in a server list
      $('.server-list a, .servers a').each((i, el) => {
        const $el = $(el);
        servers.push({
          server: $el.text().trim() || `server-${i}`,
          url: $el.attr('href') || $el.data('src') || ''
        });
      });

      // Filter by preferred server if specified
      let filtered = servers;
      if (server) {
        filtered = servers.filter(s => s.server.toLowerCase().includes(server.toLowerCase()));
      }

      if (filtered.length === 0 && servers.length > 0) {
        filtered = [servers[0]];
      }

      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'zoro', entries: filtered.length, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (zoro scrapeEpisodeSources):', rErr?.message || rErr);
      }

      return filtered;
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'zoro', entries: 0, errors: 1 });
        }
      } catch (_) {}
      throw err;
    }
  }
}
