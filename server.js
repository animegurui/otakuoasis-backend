import express from 'express'; const app = express(); const PORT = process.env.PORT || 3000;

// ---------------------- Dummy Backend Endpoints ----------------------

// Trending anime app.get('/trending', (req, res) => { res.json([ { title: "Naruto", source: "gogo", slug: "naruto", poster: "" }, { title: "One Piece", source: "gogo", slug: "one-piece", poster: "" }, { title: "Attack on Titan", source: "gogo", slug: "attack-on-titan", poster: "" } ]); });

// Search anime app.get('/search', (req, res) => { const q = req.query.q || ""; res.json([ { title: ${q} Example Anime 1, source: "gogo", slug: "example-anime-1", poster: "" }, { title: ${q} Example Anime 2, source: "gogo", slug: "example-anime-2", poster: "" } ]); });

// Episodes list app.get('/episodes/:source/:slug', (req, res) => { const episodes = []; for (let i = 1; i <= 5; i++) { episodes.push({ number: i }); } res.json(episodes); });

// Episode sources app.get('/episode-sources/:source/:slug/:episodeNumber', (req, res) => { res.json([ { url: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4", quality: "720p" }, { url: "https://sample-videos.com/video123/mp4/480/big_buck_bunny_480p_1mb.mp4", quality: "480p" } ]); });

// ---------------------- Playground Route ---------------------- app.get('/playground', (req, res) => { res.send(` <html> <head> <title>OtakuOasis Playground</title> <style> body { font-family: sans-serif; background:#111; color:#eee; padding:20px; } input, button { padding:6px; margin:4px; } .result { margin-top:20px; padding:10px; background:#222; border-radius:8px; } video { max-width:100%; margin-top:10px; border-radius:8px; display:block; margin-bottom:10px; } .anime, .source, .back, .navBtn { margin:6px 0; cursor:pointer; } .anime { color:#4CAF50; } .anime:hover { text-decoration:underline; } .source { color:#00BFFF; } .source:hover { text-decoration:underline; } .back { color:#FF6347; font-weight:bold; } .back:hover { text-decoration:underline; } .navBtn { color:#FFD700; font-weight:bold; } .navBtn:hover { text-decoration:underline; } .finished { color:#00FF7F; font-size:18px; font-weight:bold; margin-top:15px; } #controls button { margin-right:6px; } </style> </head> <body> <h1>⚡ OtakuOasis Playground</h1> <p>Test scraping without frontend.</p>

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
        const res = await fetch('/search?q=' + q);
        const data = await res.json();
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = "<h3>🔍 Search Results</h3>";
        data.forEach(anime => {
          const div = document.createElement('div');
          div.className = "anime";
          div.innerHTML = "<strong>" + anime.title + "</strong>";
          div.onclick = () => loadEpisodes(anime);
          resultsDiv.appendChild(div);
        });
      }

      async function loadEpisodes(anime) {
        lastAnime = anime;
        const res = await fetch('/episodes/' + anime.source + '/' + anime.slug);
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
        const res = await fetch('/episode-sources/' + source + '/' + slug + '/' + episode.number);
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
</html>

`); });

// ---------------------- Start Server ---------------------- app.listen(PORT, () => { console.log(Server running at http://localhost:${PORT}); });

