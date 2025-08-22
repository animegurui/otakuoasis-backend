# OtakuOasis — Backend API
**Author:** Calvin Whyte (2025)

This repository contains the OtakuOasis backend (Node.js + Express).  
It proxies anime metadata and streaming links from public APIs (Consumet / Gogoanime, Anilist).

## Features
- Search anime: `GET /api/search?q=...`
- Anime details & episodes: `GET /api/info/:id`
- Episode streams: `GET /api/watch/:episodeId`

## Run locally
1. `npm install`
2. `npm start`  
Server runs on `http://localhost:5000` by default.

## Deploy to Render
1. Create a new **Web Service** on Render and connect this repo.
2. Build command: `npm install`
3. Start command: `npm start`
4. If you change anything, use **Clear build cache & deploy** on Render.

## Notes
- License: MIT (© 2025 Calvin Whyte)
