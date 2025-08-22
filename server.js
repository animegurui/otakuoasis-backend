import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Health/root route so you don't see "Cannot GET /"
app.get("/", (req, res) => {
  res.status(200).json({
    ok: true,
    name: "OtakuOasis Backend",
    message: "Backend is running",
    docs: ["/api/search?q=naruto", "/api/info/:id", "/api/watch/:episodeId"]
  });
});

// Search anime (Consumet / gogoanime)
app.get("/api/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Missing ?q query" });

    const r = await fetch(`https://api.consumet.org/anime/gogoanime/${encodeURIComponent(q)}`);
    const data = await r.json();
    // Consumet returns { results: [...] }
    res.json(data);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Failed to search anime" });
  }
});

// Anime info + episodes
app.get("/api/info/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const r = await fetch(`https://api.consumet.org/anime/gogoanime/info/${encodeURIComponent(id)}`);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error("Info error:", err);
    res.status(500).json({ error: "Failed to fetch anime info" });
  }
});

// Episode streaming sources
app.get("/api/watch/:episodeId", async (req, res) => {
  try {
    const episodeId = req.params.episodeId;
    const r = await fetch(`https://api.consumet.org/anime/gogoanime/watch/${encodeURIComponent(episodeId)}`);
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error("Watch error:", err);
    res.status(500).json({ error: "Failed to fetch episode sources" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 OtakuOasis backend running on port ${PORT}`);
});
