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
    const url = `${this.baseUrl}/popular.html`;
    const $ = await this.fetchPage(url);
    
    const trending = [];
    
    $('.last_episodes > ul > li').slice(0, limit).each((i, el) => {
      const $el = $(el);
      const title = $el.find('p.name a').attr('title');
      const slug = $el.find('p.name a').attr('href').split('/')[1];
      const image = $el.find('div.img img').attr('src');
      
      trending.push({
        id: `gogo-${slug}`,
        title,
        slug,
