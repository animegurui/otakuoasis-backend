import cron from 'node-cron';
import ScrapeJob from '../models/ScrapeJob.js';
import { scrapeTrending } from '../controllers/scrapeController.js';
import logger from '../utils/logger.js';

// Run every 6 hours
const TRENDING_SCRAPE_SCHEDULE = '0 */6 * * *';

// Run every 30 minutes
const JOB_PROCESSING_SCHEDULE = '*/30 * * * *';

export const startScheduler = () => {
  // Schedule trending anime scrape
  cron.schedule(TRENDING_SCRAPE_SCHEDULE, async () => {
    try {
      logger.info('Starting scheduled trending scrape');
      await scrapeTrending('NG', 20);
      logger.info('Scheduled trending scrape completed');
    } catch (error) {
      logger.error(`Scheduled trending scrape failed: ${error.message}`);
    }
  });

  // Schedule job processing
  cron.schedule(JOB_PROCESSING_SCHEDULE, async () => {
    try {
      logger.info('Processing pending scrape jobs');
      const pendingJobs = await ScrapeJob.find({ status: 'pending' })
        .sort({ priority: -1, createdAt: 1 })
        .limit(10);

      for (const job of pendingJobs) {
        try {
          job.status = 'processing';
          job.startedAt = new Date();
          await job.save();

          // Here you would call the appropriate scrape function based on job.type
          // For example: 
          //   if (job.type === 'trending') await scrapeTrending(...);
          //   else if (job.type === 'search') await scrapeSearch(...);
          // This is a placeholder implementation

          job.status = 'completed';
          job.completedAt = new Date();
          job.result = { message: 'Job processed successfully' };
          await job.save();
          logger.info(`Job ${job._id} completed`);
        } catch (jobError) {
          job.status = 'failed';
          job.error = jobError.message;
          await job.save();
          logger.error(`Job ${job._id} failed: ${jobError.message}`);
        }
      }
    } catch (error) {
      logger.error(`Job processing failed: ${error.message}`);
    }
  });

  logger.info('Scheduler started');
};
 
