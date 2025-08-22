const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
const PORT = process.env.PORT || 5000;

// ✅ Search anime (AniList API through consumet API)
app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: "Query ?q= missing" });

    const resp = await fetch(`https://api.consumet.org/anime/gogoanime/${encodeURIComponent(q)}`);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch anime search" });
  }
});

// ✅ Get anime info
app.get("/api/info/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const resp = await fetch(`https://api.consumet.org/anime/gogoanime/info/${id}`);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch anime info" });
  }
});

// ✅ Get episode streaming sources
app.get("/api/watch/:episodeId", async (req, res) => {
  try {
    const episodeId = req.params.episodeId;
    const resp = await fetch(`https://api.consumet.org/anime/gogoanime/watch/${episodeId}`);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch episode sources" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 OtakuOasis backend running on port ${PORT}`);
});
