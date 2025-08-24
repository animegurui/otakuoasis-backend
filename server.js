import express from 'express';
import anigo from 'anigo-anime-api';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// ---------------------- Dummy Backend Endpoints ----------------------

// Trending anime
app.get('/trending', async (req, res) => {
  try {
    const trending = await anigo.getPopular(1);
    res.json(trending);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch trending anime' });
  }
});

// Search anime
app.get('/search', async (req, res) => {
  const q = req.query.q || '';
  try {
    const results = await anigo.searchGogo(q);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search anime' });
  }
});

// Episodes list
app.get('/episodes/:slug', async (req, res) => {
  const slug = req.params.slug;
  try {
    const episodes = await anigo.getEpisodeInfoFromAnimix(slug);
    res.json(episodes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch episodes' });
  }
});

// Episode sources
app.get('/episode-sources/:slug/:episodeNumber', async (req, res) => {
  const { slug, episodeNumber } = req.params;
  try {
    const sources = await anigo.getEpisodeSourceFromAnimix(slug, episodeNumber);
    res.json(sources);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch episode sources' });
  }
});

// ---------------------- Playground Route ----------------------
app.get('/playground', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OtakuOasis Playground</title>
  <style>
    body { font-family: sans-serif; background:#111; color:#eee; padding:20px; }
    input, button { padding:6px; margin:4px; }
    .result { margin-top:20px; padding:10px; background:#222; display: flex; flex-wrap: wrap; gap:12px; border-radius:8px; }
    .anime-card { cursor:pointer; width:120px; text-align:center; }
    .anime-card img { width:100%; border-radius:8px; margin-bottom:6px; }
    video { max-width:100%; margin-top:10px; border-radius:8px; display:block; margin-bottom:10px; }
    .source, .back, .navBtn { margin:6px 0; cursor:pointer; }
    .source { color:#00BFFF; }
    .source:hover { text-decoration:underline; }
    .back { color:#FF6347; font-weight:bold; }
    .back:hover { text-decoration:underline; }
    .navBtn { color:#FFD700; font-weight:bold; }
    .navBtn:hover { text-decoration:underline; }
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
  <div id="results" class="result"></div>

  <h3>🔥 Trending Anime</h3>
  <div id="trending" class="result"></div>

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
      container.innerHTML = "";
      data.forEach(anime => {
        const div = document.createElement('div');
        div.className = "anime-card";
        div.innerHTML = \`
          <img src="\${anime.poster}" alt="\${anime.title}" />
          <strong>\${anime.title}</strong>
        \`;
        div.onclick = () => loadEpisodes(anime);
        container.appendChild(div);
      });
    }

    async function search() {
      const q = document.getElementById('query').value;
      const res = await fetch('/search?q=' + q);
      const data = await res.json();
      const resultsDiv = document.getElementById('results');
      resultsDiv.innerHTML = "";
      data.forEach(anime => {
        const div = document.createElement('div');
        div.className = "anime-card";
        div.innerHTML = \`
          <img src="\${anime.poster}" alt="\${anime.title}" />
          <strong>\${anime.title}</strong>
        \`;
        div.onclick = () => loadEpisodes(anime);
        resultsDiv.appendChild(div);
      });
    }

    async function loadEpisodes(anime) {
      lastAnime = anime;
      const res = await fetch('/episodes/' + anime.slug);
      const data = await res.json();
      episodeList = data;
      const container = document.getElementById('episodes');
      container.innerHTML = \`<h3>📺 Episodes for \${anime.title}</h3>\`;

      const playAllBtn = document.createElement('button');
      playAllBtn.textContent = "▶️ Play All Episodes";
      playAllBtn.onclick = () => playAll();
      container.appendChild(playAllBtn);

      data.forEach((ep, index) => {
        const div = document.createElement('div');
        div.textContent = "Episode " + ep.number;
        div.className = "source";
        div.onclick = () => {
          autoPlayAll = false;
          loadSources(anime.slug, index);
        };
        container.appendChild(div);
      });
    }

    async function loadSources(slug, epIndex) {
      currentEpisodeIndex = epIndex;
      document.getElementById('endMessage').innerHTML = "";
      const episode = episodeList[epIndex];
      const res = await fetch('/episode-sources/' + slug + '/' + episode.number);
      const sources = await res.json();
      const container = document.getElementById('sources');
      container.innerHTML = "<h3>🎞 Available Sources (Click to Play)</h3>";

      if (sources.length === 0) {
        container.innerHTML += "<p>❌ No video sources found</p>";
        return;
      }

      sources.forEach(src => {
        const div = document.createElement('div');
        div.className = "source";
        div.innerHTML = "▶️ <strong>" + (src.quality || "Server") + "</strong>";
        div.onclick = () => {
          autoPlayAll = false;
          playVideo(src.url);
        };
        container.appendChild(div);
      });

      playVideo(sources[0].url);
      updateNavButtons();
      updateControls();
    }

    function playVideo(url) {
      const player = document.getElementById('player');
      player.src = url;
      player.play();

      player.onended = () => {
        if (currentEpisodeIndex < episodeList.length - 1) {
          if (autoPlayAll) loadSources(lastAnime.slug, currentEpisodeIndex + 1);
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
        prevBtn.onclick = () => loadSources(lastAnime.slug, currentEpisodeIndex - 1);
        navDiv.appendChild(prevBtn);
      }
      if (currentEpisodeIndex < episodeList.length - 1) {
        const nextBtn = document.createElement('div');
        nextBtn.className = "navBtn";
        nextBtn.textContent = "Next Episode ➡️";
        nextBtn.onclick = () => loadSources(lastAnime.slug, currentEpisodeIndex + 1);
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
      loadSources(lastAnime.slug, 0);
    }
  </script>
</body>
</html>`);
});

// ---------------------- Start Server ----------------------
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
