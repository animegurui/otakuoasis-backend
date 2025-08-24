import BaseScraper from './baseScraper.js';
import mongoose from 'mongoose';

// Use your Anime schema/model (adjust fields if needed)
const Anime = mongoose.models.Anime || mongoose.model('Anime', new mongoose.Schema({
  id: String,
  title: String,
  slug: String,
  image: String,
  latestEpisode: Number,
  source: String,
  updatedAt: { type: Date, default: Date.now }
}));

export default class GogoanimeScraper extends BaseScraper {
  constructor() {
    super('https://gogoanime3.co', {
      headers: {
        'Referer': 'https://gogoanime3.co/',
        'Accept-Encoding': 'gzip'
      }
    });
  }

  // 🔥 New run() method for server.js + /scrape-now
  async run() {
    console.log('🚀 Running GogoanimeScraper...');
    try {
      const { data: trending } = await this.scrapeTrending(20);

      if (trending.length === 0) {
        console.warn('⚠️ No trending anime scraped from gogoanime');
        return;
      }

      // Save/update in MongoDB
      for (const anime of trending) {
        await Anime.findOneAndUpdate(
          { id: anime.id },
          { ...anime, updatedAt: new Date() },
          { upsert: true, new: true }
        );
      }

      console.log(`✅ GogoanimeScraper finished — saved ${trending.length} entries`);
      return trending.length;
    } catch (err) {
      console.error('❌ GogoanimeScraper run() failed:', err.message);
      throw err;
    }
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

      if (typeof this.reportScrape === 'function') {
        await this.reportScrape({ source: 'gogoanime', entries: trending.length, errors: 0 });
      }

      return {
        data: trending,
        sources: [this.baseUrl]
      };
    } catch (err) {
      if (typeof this.reportScrape === 'function') {
        await this.reportScrape({ source: 'gogoanime', entries: 0, errors: 1 });
      }
      throw err;
    }
  }

  async scrapeSearch(query, page = 1) {
    try {
      const url = `${this.baseUrl}/search.html?keyword=${encodeURIComponent(query)}&page=${page}`;
      const $ = await this.fetchPage(url);

      const results = [];

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

      const hasMore = $('.pagination-list').find('li:last-child a').text().includes('Next');

      if (typeof this.reportScrape === 'function') {
        await this.reportScrape({ source: 'gogoanime', entries: results.length, errors: 0 });
      }

      return {
        data: results,
        hasMore,
        currentPage: page,
        source: 'gogoanime'
      };
    } catch (err) {
      if (typeof this.reportScrape === 'function') {
        await this.reportScrape({ source: 'gogoanime', entries: 0, errors: 1 });
      }
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

      const genres = [];
      $('.anime_info_body .type:contains("Genre") a').each((i, el) => {
        genres.push($(el).text().trim());
      });

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

      if (typeof this.reportScrape === 'function') {
        await this.reportScrape({ source: 'gogoanime', entries: 1, errors: 0 });
      }

      return result;
    } catch (err) {
      if (typeof this.reportScrape === 'function') {
        await this.reportScrape({ source: 'gogoanime', entries: 0, errors: 1 });
      }
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

      if (typeof this.reportScrape === 'function') {
        await this.reportScrape({ source: 'gogoanime', entries: episodes.length, errors: 0 });
      }

      return episodes;
    } catch (err) {
      if (typeof this.reportScrape === 'function') {
        await this.reportScrape({ source: 'gogoanime', entries: 0, errors: 1 });
      }
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

      let filteredServers = servers;
      if (server) {
        filteredServers = servers.filter(s =>
          s.server.toLowerCase().includes(server.toLowerCase())
        );
      }
      if (filteredServers.length === 0 && servers.length > 0) {
        filteredServers = [servers[0]];
      }

      if (typeof this.reportScrape === 'function') {
        await this.reportScrape({ source: 'gogoanime', entries: filteredServers.length, errors: 0 });
      }

      return filteredServers;
    } catch (err) {
      if (typeof this.reportScrape === 'function') {
        await this.reportScrape({ source: 'gogoanime', entries: 0, errors: 1 });
      }
      throw err;
    }
  }
}
