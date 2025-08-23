import mongoose from 'mongoose';

const animeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  altTitles: [{
    type: String,
    trim: true
  }],
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['TV', 'Movie', 'OVA', 'ONA', 'Special'],
    default: 'TV'
  },
  status: {
    type: String,
    enum: ['Ongoing', 'Completed', 'Upcoming'],
    default: 'Ongoing'
  },
  genres: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }],
  releaseYear: Number,
  episodes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Episode'
  }],
  image: {
    type: String,
    trim: true
  },
  thumbnail: {
    type: String,
    trim: true
  },
  popularity: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  source: {
    type: String,
    enum: ['gogoanime', '9anime', 'zoro', 'animepahe'],
    default: 'gogoanime'
  },
  lastScraped: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexing for better performance
animeSchema.index({ title: 'text', altTitles: 'text', tags: 'text' });
animeSchema.index({ slug: 1 }, { unique: true });
animeSchema.index({ popularity: -1 });
animeSchema.index({ releaseYear: -1 });

const Anime = mongoose.model('Anime', animeSchema);

export default Anime;
 
