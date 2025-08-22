router.get('/dashboard', (req, res) => {
  res.json({
    animeCount: await Anime.countDocuments(),
    popularAnime: await Anime.find().sort({ popularity: -1 }).limit(5)
  });
});
