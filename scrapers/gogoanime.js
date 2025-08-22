import BaseScraper from './baseScraper.js';
import axios from 'axios';
import cheerio from 'cheerio';
import { randomUserAgent, rotateProxy } from '../utils/proxy.js';
import { delay } from '../utils/helpers.js';

export default class GogoAnimeScraper extends BaseScraper {
  constructor() {
    super({
      name: 'gogoanime',
      baseUrl: 'https://gogoanime3.net',
      searchPath: '/search.html?keyword=',
      detailPath: '/category/',
      episodePath: '/'
    });
  }

  async search(query, page = 1) {
    try {
      const url = `${this.baseUrl}${this.searchPath}${encodeURIComponent(query)}&page=${page}`;
      const { data } = await this.fetchWithRetry(url);
      const $ = cheerio.load(data);
      
      const results = [];
      
      $('ul.items > li').each((i, el) => {
        const title = $(el).find('p.name a').attr('title');
        const sourceId = $(el).find('p.name a').attr('href').replace('/category/', '');
        const image = $(el).find('div.img img').attr('src');
        const release = $(el).find('p.released').text().replace('Released: ', '');
        const type = $(el).find('p.type').text().trim();
        
        results.push({
          title,
          sourceId,
          image,
          release,
          type,
          source: this.name
        });
      });
      
      return results;
    } catch (error) {
      this.logError('Search failed', error);
      return [];
    }
  }

  async getAnimeDetails(sourceId) {
    try {
      const url = `${this.baseUrl}${this.detailPath}${sourceId}`;
      const { data } = await this.fetchWithRetry(url);
      const $ = cheerio.load(data);
      
      // Extract main details
      const title = $('div.anime_info_body_bg h1').text().trim();
      const image = $('div.anime_info_body_bg img').attr('src');
      const description = $('div.anime_info_body_bg p:nth-child(5)')
        .text()
        .replace('Plot Summary: ', '')
        .trim();
      
      // Extract metadata
      const metadata = {};
      $('div.anime_info_body_bg p.type').each((i, el) => {
        const text = $(el).text().trim();
        const [key, ...valueParts] = text.split(':');
        if (key && valueParts.length > 0) {
          metadata[key.trim()] = valueParts.join(':').trim();
        }
      });
      
      // Parse episodes
      const episodes = [];
      const episodeCount = parseInt($('#episode_page li').last().find('a').attr('ep_end'));
      
      // Use a queue system to avoid overloading
      const episodeQueue = [];
      for (let i = 1; i <= episodeCount; i++) {
        episodeQueue.push(i);
      }
      
      // Process episodes in batches
      const batchSize = 5;
      while (episodeQueue.length > 0) {
        const batch = episodeQueue.splice(0, batchSize);
        const promises = batch.map(epNum => this.getEpisodeSources(sourceId, epNum));
        const batchResults = await Promise.all(promises);
        
        batchResults.forEach((sources, index) => {
          if (sources.length > 0) {
            episodes.push({
              number: batch[index],
              sources
            });
          }
        });
        
        // Add delay between batches
        await delay(2000);
      }
      
      return {
        title,
        slug: sourceId,
        image,
        banner: image.replace('gogocdn.net/cover/', 'gogocdn.net/banner/'),
        description,
        type: metadata.Type,
        genres: metadata.Genre?.split(', ') || [],
        releaseYear: metadata.Released?.split('-')[0] || null,
        status: metadata.Status?.includes('Ongoing') ? 'Ongoing' : 'Completed',
        episodes,
        source: this.name,
        sourceId,
        rating: metadata.Rating,
        duration: metadata.Duration
      };
    } catch (error) {
      this.logError('Details fetch failed', error);
      return null;
    }
  }

  async getEpisodeSources(animeId, episodeNumber) {
    try {
      const url = `${this.baseUrl}/${animeId}-episode-${episodeNumber}`;
      const { data } = await this.fetchWithRetry(url);
      const $ = cheerio.load(data);
      
      const sources = [];
      
      // Extract streaming servers
      $('div.anime_muti_link ul li').each((i, el) => {
        const serverName = $(el).text().trim();
        const dataVideo = $(el).find('a').attr('data-video');
        
        if (dataVideo && !dataVideo.includes('streaming.php')) {
          sources.push({
            url: dataVideo,
            server: serverName,
            quality: 'HD',
            priority: 1
          });
        }
      });
      
      // Extract download links
      $('div.download_anime li').each((i, el) => {
        const serverName = $(el).find('a').text().trim();
        const url = $(el).find('a').attr('href');
        
        if (url) {
          sources.push({
            url,
            server: serverName,
            quality: '720p',
            isDownload: true,
            priority: 2
          });
        }
      });
      
      return sources;
    } catch (error) {
      this.logError(`Episode ${episodeNumber} sources fetch failed`, error);
      return [];
    }
  }
}
 
