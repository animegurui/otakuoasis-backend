const express = require('express');
const cors = require('cors');
const app = express();

// Use the PORT environment variable provided by the deployment platform, or default to 3001
const PORT = process.env.PORT || 3001;

// === Middleware ===
// Enable CORS for all routes, allowing your frontend to connect
app.use(cors());
// Parse incoming JSON requests
app.use(express.json());

// === API Routes ===
// A simple test route to make sure the server is alive
app.get('/api', (req, res) => {
    res.json({ message: "Hello from the AniFlix API! 🚀" });
});

// Example route to get top airing anime (proxied from Jikan)
app.get('/api/top-airing', async (req, res) => {
    try {
        const apiResponse = await fetch('https://api.jikan.moe/v4/top/anime?filter=airing&limit=12');
        if (!apiResponse.ok) {
            throw new Error(`Jikan API failed with status: ${apiResponse.status}`);
        }
        const data = await apiResponse.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add more routes for trending, user login, etc. here

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Export the app for Vercel's serverless environment
module.exports = app;
