// server.js - OtakuOasis Backend (Anime API)
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/* -------------------------------
   BASE API (Consumet: gogoanime)
-------------------------------- */
const BASE_URL = "https://api.consumet.org/anime/gogoanime";

/* -------------------------------
   Routes
-------------------------------- */

// Search: (Consumet has different endpoints; this route uses the 'search' endpoint)
app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: "Missing query ?q=" });
    // Consumet supports a search endpoint: /search?key=...
    const response = await axios.get(`https://api.consumet.org/anime/gogoanime/search?key=${encodeURIComponent(q)}`);
    res.json(response.data.results || response.data);
  } catch (err) {
    console.error(err?.message || err);
    res.status(500).json({ error: "Failed to fetch search results" });
  }
});

// Get anime info (episodes list, details)
app.get("/api/info/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(`${BASE_URL}/info/${id}`);
    res.json(response.data);
  } catch (err) {
    console.error(err?.message || err);
    res.status(500).json({ error: "Failed to fetch anime info" });
  }
});

// Get streaming links for an episode
app.get("/api/watch/:episodeId", async (req, res) => {
  try {
    const { episodeId } = req.params;
    const response = await axios.get(`${BASE_URL}/watch/${episodeId}`);
    res.json(response.data);
  } catch (err) {
    console.error(err?.message || err);
    res.status(500).json({ error: "Failed to fetch episode streams" });
  }
});

// Health check
app.get("/", (req, res) => {
  res.send("OtakuOasis Anime API is running 🚀");
});

/* -------------------------------
   Start Server
-------------------------------- */
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
