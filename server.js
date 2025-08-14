import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/embed/movie/:id", async (req, res) => {
  const movieId = req.params.id;
  const embedUrl = `https://vidsrc.xyz/embed/movie/${movieId}`;

  try {
    console.log(`[1] Fetching embed page: ${embedUrl}`);
    const embedResp = await fetch(embedUrl);
    if (!embedResp.ok) throw new Error(`Embed fetch failed: ${embedResp.status}`);
    const embedHtml = await embedResp.text();

    // Find cloudnestra RCP URL
    const matchRcp = embedHtml.match(/\/\/cloudnestra\.com\/rcp[^\s'"]+/);
    if (!matchRcp) throw new Error("cloudnestra.com RCP link not found");
    const cloudUrl = "https:" + matchRcp[0];
    console.log(`[2] Extracted cloudnestra URL: ${cloudUrl}`);

    // Fetch prorcp page
    const prorcpResp = await fetch(cloudUrl);
    if (!prorcpResp.ok) throw new Error(`prorcp fetch failed: ${prorcpResp.status}`);
    const prorcpHtml = await prorcpResp.text();

    // Search for Playerjs file URL anywhere
    const playerMatch = prorcpHtml.match(/file:\s*['"]([^'"]+)['"]/);
    if (!playerMatch) throw new Error("Playerjs file URL not found in prorcp page");
    const playerUrl = playerMatch[1];
    console.log(`[3] Extracted Playerjs URL: ${playerUrl}`);

    if (playerUrl.endsWith(".m3u8")) {
      const playlistResp = await fetch(playerUrl);
      if (!playlistResp.ok) throw new Error(`Playlist fetch failed: ${playlistResp.status}`);
      let playlistText = await playlistResp.text();

      playlistText = playlistText.replace(/^([^\n]*\.ts)$/gm, (match) => {
        const segmentUrl = new URL(match, playerUrl).href;
        return `/segment?url=${encodeURIComponent(segmentUrl)}`;
      });

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return res.send(playlistText);
    } else {
      res.send(`
        <script src="//files.catbox.moe/wpjrf3.js" type="text/javascript"></script>
        <div id="player"></div>
        <script>
           var player = new Playerjs({id:"player", file:"${playerUrl}"});
        </script>
      `);
    }
  } catch (err) {
    console.error("[ERROR]", err);
    res.status(500).send(err.message);
  }
});

app.get("/segment", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("No URL provided");

  try {
    const segResp = await fetch(url);
    if (!segResp.ok) throw new Error(`Segment fetch failed: ${segResp.status}`);
    res.setHeader("Content-Type", "video/MP2T");
    segResp.body.pipe(res);
  } catch (err) {
    console.error("[SEGMENT ERROR]", err);
    res.status(500).send(err.message);
  }
});

app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
