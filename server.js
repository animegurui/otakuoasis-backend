import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Try to load morgan (optional)
let morganMiddleware = (req, res, next) => next(); // no-op if not installed
try {
  const morganModule = await import('morgan').catch(() => null);
  const morgan = morganModule && (morganModule.default || morganModule);
  if (morgan) {
    morganMiddleware = morgan('dev');
    console.log('✅ Morgan loaded for request logging');
  } else {
    console.warn('⚠️ Morgan not installed, skipping request logging');
  }
} catch (err) {
  console.warn('⚠️ Morgan import failed, skipping request logging', err.message);
}
app.use(morganMiddleware);

// Routes
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
