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

export default class NineAnimeScraper extends BaseScraper {
  constructor() {
    super('https://9anime.pl'); // base from your update
  }

  // Run: scrape trending + upsert to MongoDB
  async run() {
    console.log('🚀 Running NineAnimeScraper...');
    try {
      const { data: trending } = await this.scrapeTrending(20);

      if (!trending || trending.length === 0) {
        console.warn('⚠️ No trending anime scraped from nineanime');
        return 0;
      }

      for (const anime of trending) {
        await Anime.findOneAndUpdate(
          { id: anime.id },
          { ...anime, updatedAt: new Date() },
          { upsert: true, new: true }
        );
      }

      console.log(`✅ NineAnimeScraper finished — saved ${trending.length} entries`);
      return trending.length;
    } catch (err) {
      console.error('❌ NineAnimeScraper run() failed:', err.message || err);
      throw err;
    }
  }

  // Trending (from your nineanime update)
  async scrapeTrending(limit = 20) {
    try {
      const url = `${this.baseUrl}/trending`;
      const $ = await this.fetchPage(url);

      const trending = [];
      $('.film-list > .item').slice(0, limit).each((i, el) => {
        const $el = $(el);
        const title = $el.find('.info .name').text().trim();
        // try href from either .info .name anchor or outer anchor
        const href = $el.find('.info .name').attr('href') || $el.find('a').attr('href') || '';
        const slug = href.split('/').filter(Boolean).pop() || '';
        const image = $el.find('.poster img').attr('src') || $el.find('img').attr('src') || '';
        const episode = ($el.find('.ep-status').text().trim().match(/\d+/) || ['1'])[0];

        trending.push({
          id: `nine-${slug}`,
          title,
          slug,
          image,
          latestEpisode: parseInt(episode, 10) || 1,
          source: 'nineanime'
        });
      });

      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'nineanime', entries: trending.length, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (nineanime scrapeTrending):', rErr?.message || rErr);
      }

      return { data: trending, sources: [this.baseUrl] };
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'nineanime', entries: 0, errors: 1 });
        }
      } catch (_) {}
      throw err;
    }
  }

  // Search: adapted from original implementation
  async scrapeSearch(query, page = 1) {
    try {
      const url = `${this.baseUrl}/search?keyword=${encodeURIComponent(query)}&page=${page}`;
      const $ = await this.fetchPage(url);

      const results = [];
      $('.film-list .item, .film-list > .item').each((i, el) => {
        const $el = $(el);
        const title = $el.find('.name, .info .name').text().trim();
        const href = $el.find('a').attr('href') || '';
        const slug = href.split('/').filter(Boolean).pop() || '';
        const image = $el.find('img').attr('src') || '';

        results.push({
          id: `nine-${slug}`,
          title,
          slug,
          image,
          source: 'nineanime'
        });
      });

      // Check if there's more pages (naive)
      let hasMore = false;
      hasMore = $('.pagination').find('a:contains("Next"), a:contains("next")').length > 0;

      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'nineanime', entries: results.length, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (nineanime scrapeSearch):', rErr?.message || rErr);
      }

      return { data: results, hasMore, currentPage: page, source: 'nineanime' };
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'nineanime', entries: 0, errors: 1 });
        }
      } catch (_) {}
      throw err;
    }
  }

  // Anime details: adapted from your original nineanimeScraper
  async scrapeAnimeDetails(slug) {
    try {
      const url = `${this.baseUrl}/watch/${slug}`;
      const $ = await this.fetchPage(url);

      const title = $('.detail .title').text().trim() || $('.film-detail .title').text().trim();
      const image = $('.detail .poster img').attr('src') || $('.poster img').attr('src') || '';
      const description = $('.detail .content').text().trim() || $('.film-description').text().trim();

      const details = {};
      $('.detail .meta .row, .film-detail .item').each((i, el) => {
        const $el = $(el);
        const key = ($el.find('.type, .label').text() || '').trim().toLowerCase();
        const value = ($el.find('.content, .value').text() || $el.text()).trim();
        if (key) details[key] = value;
      });

      // Extract genres
      const genres = [];
      $('.detail .genre a, .genres a').each((i, el) => {
        genres.push($(el).text().trim());
      });

      // Extract episodes
      const episodes = [];
      $('#episodes a, .eps a').each((i, el) => {
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
        type: details['type'],
        status: details['status'],
        released: details['year'],
        genres,
        episodes,
        source: 'nineanime',
        rating: parseFloat(details['score']?.split('/')[0]) || 0,
        popularity: episodes.length * 100 || 0
      };

      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'nineanime', entries: 1, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (nineanime scrapeAnimeDetails):', rErr?.message || rErr);
      }

      return result;
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'nineanime', entries: 0, errors: 1 });
        }
      } catch (_) {}
      throw err;
    }
  }

  // Episodes
  async scrapeEpisodes(slug) {
    try {
      const url = `${this.baseUrl}/watch/${slug}`;
      const $ = await this.fetchPage(url);

      const episodes = [];
      $('#episodes a, .eps a').each((i, el) => {
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
          await this.reportScrape({ source: 'nineanime', entries: episodes.length, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (nineanime scrapeEpisodes):', rErr?.message || rErr);
      }

      return episodes;
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'nineanime', entries: 0, errors: 1 });
        }
      } catch (_) {}
      throw err;
    }
  }

  // Episode sources
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

      // Fallback anchors
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
          await this.reportScrape({ source: 'nineanime', entries: filtered.length, errors: 0 });
        }
      } catch (rErr) {
        console.warn('⚠️ reportScrape failed (nineanime scrapeEpisodeSources):', rErr?.message || rErr);
      }

      return filtered;
    } catch (err) {
      try {
        if (typeof this.reportScrape === 'function') {
          await this.reportScrape({ source: 'nineanime', entries: 0, errors: 1 });
        }
      } catch (_) {}
      throw err;
    }
  }
}
