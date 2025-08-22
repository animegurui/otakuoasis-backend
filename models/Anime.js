import mongoose from 'mongoose';

const EpisodeSchema = new mongoose.Schema({
  number: { type: Number, required: true },
  title: String,
  thumbnail: String,
  sources: [{
    url: { type: String, required: true },
    server: String,
    quality: String,
    isDownload: { type: Boolean, default: false },
    priority: { type: Number, default: 1 }
  }],
  createdAt: { type: Date, default: Date.now },
  lastScraped: Date
});

const AnimeSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  slug: { type: String, required: true, unique: true },
  altTitles: [String],
  malId: Number,
  anilistId: Number,
  image: String,
  banner: String,
  description: String,
  type: { type: String, enum: ['TV', 'Movie', 'OVA', 'ONA', 'Special'] },
  status: { type: String, enum: ['Ongoing', 'Completed', 'Upcoming'] },
  genres: [{ type: String, index: true }],
  tags: [String],
  releaseYear: Number,
  episodes: [EpisodeSchema],
  source: { 
    type: String, 
    enum: ['gogoanime', '9anime', 'zoro', 'anilist'],
    required: true
  },
  sourceId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastScraped: Date,
  popularity: { type: Number, default: 0 },
  score: Number,
  duration: String,
  rating: String,
  relations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Anime'
  }]
}, { timestamps: true });

// Text index for searching
AnimeSchema.index({ title: 'text', altTitles: 'text' });

// Compound index for source lookup
AnimeSchema.index({ source: 1, sourceId: 1 }, { unique: true });

export default mongoose.model('Anime', AnimeSchema);
