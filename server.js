// server.js
import express from 'express';
import cors from 'cors';
import anigo from 'anigo-anime-api';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/**
 * NOTE:
 * This file uses the public methods described in the anigo-anime-api README:
 * - searchGogo(keyw)
 * - searchAnimix(keyw)
 * - getPopular(type)
 * - getGogoAnimeInfo(animeId)
 * - getGogoanimeEpisodeSource(episodeId) // e.g. "one-piece-episode-1015"
 * - getEpisodeInfoFromAnimix(animeId)
 * - getEpisodeSourceFromAnimix(name, epNum)
 *
 * The library may return different property names in objects; this code
 * attempts to normalize the common shapes.
 */

// ---------------------- Helper / Normalizers ----------------------
function normalizeResult(item, fallbackSource = 'gogo') {
  // Attempt to find a slug / id and a poster/title
  const slug = item.animeId || item.slug || item.malId || item.id || item.name || '';
  const title = item.title || item.name || item.animeTitle || 'Unknown';
  const poster = item.poster || item.image || item.thumbnail || '';
  const source = item.source || fallbackSource;
  return { title, source, slug: String(slug), poster };
}

// ---------------------- Endpoints ----------------------

// Trending / Popular
app.get('/trending', async (req, res) => {
  try {
    // type 1 = weekly most viewed (README)
    const popular = await anigo.getPopular(1);
    // popular may be array of items — normalize
    const mapped = (Array.isArray(popular) ? popular : []).map(item =>
      normalizeResult(item, item.source || 'gogo')
    );
    res.json(mapped);
  } catch (err) {
    console.error('trending error', err?.message || err);
    res.status(500).json([]);
  }
});

// Search (we'll call both Gogo and Animix, return merged)
app.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);

  try {
    const [gogoRes, animixRes] = await Promise.allSettled([
      anigo.searchGogo(q),
      anigo.searchAnimix(q)
    ]);

    const results = [];

    if (gogoRes.status === 'fulfilled' && Array.isArray(gogoRes.value)) {
      for (const it of gogoRes.value) results.push(normalizeResult(it, 'gogo'));
    }

    if (animixRes.status === 'fulfilled' && Array.isArray(animixRes.value)) {
      for (const it of animixRes.value) results.push(normalizeResult(it, 'animix'));
    }

    // dedupe by slug+title
    const seen = new Set();
    const dedup = [];
    for (const r of results) {
      const key = `${r.source}::${r.slug}::${r.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        dedup.push(r);
      }
    }

    res.json(dedup);
  } catch (err) {
    console.error('search error', err?.message || err);
    res.status(500).json([]);
  }
});

// Episodes list
// Expectation: client calls /episodes/:source/:slug
app.get('/episodes/:source/:slug', async (req, res) => {
  const { source, slug } = req.params;
  try {
    if (source === 'gogo') {
      // getGogoAnimeInfo should return anime details including episodes (per README)
      const info = await anigo.getGogoAnimeInfo(slug);
      // try common shapes
      let episodes = [];
      if (Array.isArray(info?.episodes)) {
        episodes = info.episodes.map(ep => {
          // ep may be an object or string
          if (typeof ep === 'string' || typeof ep === 'number') return { number: ep };
          return { number: ep.number || ep.ep || ep.episode || ep.title || '' };
        });
      } else if (Array.isArray(info?.episode_list)) {
        episodes = info.episode_list.map(ep => ({ number: ep.number || ep.ep || ep }));
      } else if (Array.isArray(info?.eps)) {
        episodes = info.eps.map(ep => ({ number: ep.number || ep }));
      } else if (info && info.totalEpisodes) {
        // fallback: create numeric list 1..total
        const total = Number(info.totalEpisodes) || 0;
        for (let i = 1; i <= total; i++) episodes.push({ number: i });
      } else {
        // final fallback: empty
        episodes = [];
      }

      // Normalize numbers to strings/numbers
      episodes = episodes.map(e => ({ number: typeof e.number === 'string' ? e.number.replace(/\D/g, '') || e.number : e.number }));
      res.json(episodes);
      return;
    }

    if (source === 'animix') {
      // Animix: use getEpisodeInfoFromAnimix (README)
      // The slug for animix may be a malId or anime name — the search result includes malId sometimes.
      const epInfo = await anigo.getEpisodeInfoFromAnimix(slug);
      // epInfo likely contains an episodes array
      let episodes = [];
      if (Array.isArray(epInfo?.episodes)) {
        episodes = epInfo.episodes.map(e => ({ number: e.number || e.ep || e }));
      } else if (Array.isArray(epInfo)) {
        episodes = epInfo.map(e => ({ number: e.number || e.ep || e }));
      }
      res.json(episodes);
      return;
    }

    // Unknown source -> empty
    res.json([]);
  } catch (err) {
    console.error('episodes error', err?.message || err);
    res.status(500).json([]);
  }
});

// Episode sources
app.get('/episode-sources/:source/:slug/:episodeNumber', async (req, res) => {
  const { source, slug, episodeNumber } = req.params;
  try {
    if (source === 'gogo') {
      // For Gogo, the README shows getGogoanimeEpisodeSource(episodeId)
      // EpisodeId format example: "one-piece-episode-1015"
      // We'll try the most typical construction:
      const episodeIdCandidate = `${slug}-episode-${episodeNumber}`;
      let sources = await anigo.getGogoanimeEpisodeSource(episodeIdCandidate);

      // The library might return an object with .sources or an array directly
      if (!sources) sources = [];
      if (sources?.sources) sources = sources.sources;
      // Normalise to array of {url, quality}
      const normalized = (Array.isArray(sources) ? sources : []).map(s => ({
        url: s.file || s.url || s.source || s.link || s,
        quality: s.label || s.quality || s.type || ''
      }));
      return res.json(normalized);
    }

    if (source === 'animix') {
      // Animix: getEpisodeSourceFromAnimix(name, epNum)
      // slug might be anime name or malId; the README example uses name + epNum
      const epSources = await anigo.getEpisodeSourceFromAnimix(slug, String(episodeNumber));
      // epSources might already be an array of { url, quality } or an object
      let sources = epSources || [];
      if (Array.isArray(sources)) {
        const normalized = sources.map(s => ({
          url: s.file || s.url || s.source || s.link || s,
          quality: s.label || s.quality || s.type || ''
        }));
        return res.json(normalized);
      } else if (sources.sources) {
        const normalized = (sources.sources || []).map(s => ({
          url: s.file || s.url || s.source || s.link || s,
          quality: s.label || s.quality || s.type || ''
        }));
        return res.json(normalized);
      } else {
        // If the structure is unknown, return as-is
        return res.json([sources]);
      }
    }

    // Unknown source
    res.json([]);
  } catch (err) {
    console.error('episode-sources error', err?.message || err);
    res.status(500).json([]);
  }
});

// ---------------------- Playground Route ----------------------
// Serves the same playground UI you had — it expects the endpoints above.
app.get('/playground', (req, res) => {
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>OtakuOasis Playground</title>
  <style>
    body { font-family: sans-serif; background:#111; color:#eee; padding:20px; }
    input, button { padding:6px; margin:4px; }
    .result { margin-top:20px; padding:10px; background:#222; border-radius:8px; }
    video { max-width:100%; margin-top:10px; border-radius:8px; display:block; margin-bottom:10px; }
    .anime, .source, .back, .navBtn { margin:6px 0; cursor:pointer; }
    .anime { color:#4CAF50; } .anime:hover { text-decoration:underline; }
    .source { color:#00BFFF; } .source:hover { text-decoration:underline; }
    .back { color:#FF6347; font-weight:bold; } .back:hover { text-decoration:underline; }
    .navBtn { color:#FFD700; font-weight:bold; } .navBtn:hover { text-decoration:underline; }
    .finished { color:#00FF7F; font-size:18px; font-weight:bold; margin-top:15px; }
    #controls button { margin-right:6px; }
  </style>
</head>
<body>
  <h1>⚡ OtakuOasis Playground</h1>
  <p>Test scraping without frontend.</p>

  <h3>Search Anime</h3>
  <input id="query" placeholder="naruto" />
  <button onclick="search()">Search</button>
  <div id="results"></div>

  <div class="result" id="trending"></div>
  <div class="result" id="episodes"></div>
  <div class="result" id="sources"></div>

  <video id="player" controls></video>
  <div id="playerNav"></div>
  <div id="controls"></div>
  <div id="endMessage"></div>

  <script>
    let lastAnime = null;
    let episodeList = [];
    let currentEpisodeIndex = -1;
    let autoPlayAll = false;

    window.onload = loadTrending;

    async function loadTrending() {
      const res = await fetch('/trending');
      const data = await res.json();
      const container = document.getElementById('trending');
      container.innerHTML = "<h3>🔥 Trending Anime</h3>";
      data.forEach(anime => {
        const div = document.createElement('div');
        div.className = "anime";
        div.innerHTML = "<strong>" + anime.title + "</strong>";
        div.onclick = () => loadEpisodes(anime);
        container.appendChild(div);
      });
    }

    async function search() {
      const q = document.getElementById('query').value;
      if (!q) return;
      const res = await fetch('/search?q=' + encodeURIComponent(q));
      const data = await res.json();
      const resultsDiv = document.getElementById('results');
      resultsDiv.innerHTML = "<h3>🔍 Search Results</h3>";
      data.forEach(anime => {
        const div = document.createElement('div');
        div.className = "anime";
        div.innerHTML = "<strong>" + anime.title + " <small>(" + anime.source + ")</small></strong>";
        div.onclick = () => loadEpisodes(anime);
        resultsDiv.appendChild(div);
      });
    }

    async function loadEpisodes(anime) {
      lastAnime = anime;
      const res = await fetch('/episodes/' + anime.source + '/' + encodeURIComponent(anime.slug));
      const data = await res.json();
      episodeList = data;
      const container = document.getElementById('episodes');
      container.innerHTML = "<h3>📺 Episodes for " + anime.title + "</h3>";

      const playAllBtn = document.createElement('button');
      playAllBtn.textContent = "▶️ Play All Episodes";
      playAllBtn.onclick = () => playAll();
      container.appendChild(playAllBtn);

      data.forEach((ep, index) => {
        const div = document.createElement('div');
        div.textContent = "Episode " + ep.number;
        div.className = "anime";
        div.onclick = () => {
          autoPlayAll = false;
          loadSources(anime.source, anime.slug, index, anime.poster);
        };
        container.appendChild(div);
      });
    }

    async function loadSources(source, slug, epIndex, poster) {
      currentEpisodeIndex = epIndex;
      document.getElementById('endMessage').innerHTML = "";
      const episode = episodeList[epIndex];
      const res = await fetch('/episode-sources/' + source + '/' + encodeURIComponent(slug) + '/' + episode.number);
      const data = await res.json();
      const container = document.getElementById('sources');
      container.innerHTML = "<h3>🎞 Available Sources (Click to Play)</h3>";

      const sources = Array.isArray(data) ? data : data.sources || [];
      if (sources.length === 0) {
        container.innerHTML += "<p>❌ No video sources found</p>";
        return;
      }

      sources.forEach(src => {
        const div = document.createElement('div');
        div.className = "source";
        div.innerHTML = "▶️ <strong>" + (src.quality || src.server || "Server") + "</strong>";
        div.onclick = () => {
          autoPlayAll = false;
          playVideo(src.url, poster);
        };
        container.appendChild(div);
      });

      playVideo(sources[0].url, poster);
      updateNavButtons();
      updateControls();
    }

    function playVideo(url, poster) {
      const player = document.getElementById('player');
      player.src = url;
      player.poster = poster || "";
      player.play();

      player.onended = () => {
        if (currentEpisodeIndex < episodeList.length - 1) {
          if (autoPlayAll) {
            loadSources(lastAnime.source, lastAnime.slug, currentEpisodeIndex + 1, lastAnime.poster);
          }
        } else {
          document.getElementById('endMessage').innerHTML = "<div class='finished'>🎉 You finished this anime!</div>";
          autoPlayAll = false;
          updateControls();
        }
      };
    }

    function updateNavButtons() {
      const navDiv = document.getElementById('playerNav');
      navDiv.innerHTML = "";
      if (currentEpisodeIndex > 0) {
        const prevBtn = document.createElement('div');
        prevBtn.className = "navBtn";
        prevBtn.textContent = "⬅️ Previous Episode";
        prevBtn.onclick = () => loadSources(lastAnime.source, lastAnime.slug, currentEpisodeIndex - 1, lastAnime.poster);
        navDiv.appendChild(prevBtn);
      }
      if (currentEpisodeIndex < episodeList.length - 1) {
        const nextBtn = document.createElement('div');
        nextBtn.className = "navBtn";
        nextBtn.textContent = "Next Episode ➡️";
        nextBtn.onclick = () => loadSources(lastAnime.source, lastAnime.slug, currentEpisodeIndex + 1, lastAnime.poster);
        navDiv.appendChild(nextBtn);
      }
    }

    function updateControls() {
      const controlsDiv = document.getElementById('controls');
      controlsDiv.innerHTML = "";
      if (autoPlayAll) {
        const stopBtn = document.createElement('button');
        stopBtn.textContent = "⏹ Stop Auto-Play";
        stopBtn.onclick = () => { autoPlayAll = false; updateControls(); };
        controlsDiv.appendChild(stopBtn);
      }
    }

    function playAll() {
      autoPlayAll = true;
      updateControls();
      loadSources(lastAnime.source, lastAnime.slug, 0, lastAnime.poster);
    }
  </script>
</body>
</html>`);
});

// ---------------------- Start Server ----------------------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
