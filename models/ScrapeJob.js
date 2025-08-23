import mongoose from 'mongoose';

const scrapeJobSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['trending', 'search', 'details', 'episodes', 'sources'],
    required: true
  },
  target: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'critical'],
    default: 'normal'
  },
  attempts: {
    type: Number,
    default: 0
  },
  result: mongoose.Schema.Types.Mixed,
  error: String,
  startedAt: Date,
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for job queue processing
scrapeJobSchema.index({ status: 1, priority: -1, createdAt: 1 });

const ScrapeJob = mongoose.model('ScrapeJob', scrapeJobSchema);

export default ScrapeJob;
 
