import mongoose from 'mongoose';

const episodeSchema = new mongoose.Schema({
  animeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Anime',
    required: true
  },
  number: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  thumbnail: {
    type: String,
    trim: true
  },
  duration: {
    type: Number, // in seconds
    min: 0
  },
  airedAt: Date,
  sources: [{
    server: String,
    url: String,
    quality: String,
    requiresProxy: Boolean
  }],
  subtitles: [{
    language: String,
    url: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for fast episode lookup
episodeSchema.index({ animeId: 1, number: 1 }, { unique: true });

const Episode = mongoose.model('Episode', episodeSchema);

export default Episode;
 
