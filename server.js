import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

// Serve the video embed proxy
app.get("/embed/movie/:id", async (req, res) => {
  const movieId = req.params.id;
  const embedUrl = `https://vidsrc.xyz/embed/movie/${movieId}`;

  try {
    console.log(`[1] Fetching embed page: ${embedUrl}`);
    const embedResp = await fetch(embedUrl);
    if (!embedResp.ok) throw new Error(`Embed fetch failed: ${embedResp.status}`);
    const embedHtml = await embedResp.text();

    // Find cloudnestra RCP URL on line 78
    const embedLines = embedHtml.split("\n");
    const line78 = embedLines[77] || "";
    const matchRcp = line78.match(/\/\/cloudnestra\.com\/rcp[^\s'"]+/);
    if (!matchRcp) {
      console.error(`[!] Line 78: ${line78}`);
      throw new Error("cloudnestra.com RCP link not found");
    }
    const cloudUrl = "https:" + matchRcp[0];
    console.log(`[2] Extracted cloudnestra URL: ${cloudUrl}`);

    // Fetch prorcp page
    const prorcpResp = await fetch(cloudUrl);
    if (!prorcpResp.ok) throw new Error(`prorcp fetch failed: ${prorcpResp.status}`);
    const prorcpHtml = await prorcpResp.text();

    // Get Playerjs URL on line 482
    const prorcpLines = prorcpHtml.split("\n");
    const line482 = prorcpLines[481] || "";
    const matchPlayerjs = line482.match(/file:\s*['"]([^'"]+)['"]/);
    if (!matchPlayerjs) throw new Error("Playerjs file URL not found on line 482");
    const playerUrl = matchPlayerjs[1];
    console.log(`[3] Extracted Playerjs URL: ${playerUrl}`);

    if (playerUrl.endsWith(".m3u8")) {
      // Fetch the .m3u8 playlist
      const playlistResp = await fetch(playerUrl);
      if (!playlistResp.ok) throw new Error(`Playlist fetch failed: ${playlistResp.status}`);
      let playlistText = await playlistResp.text();

      // Rewrite all segment paths to go through proxy
      playlistText = playlistText.replace(/^([^\n]*\.ts)$/gm, (match) => {
        const segmentUrl = new URL(match, playerUrl).href;
        return `/segment?url=${encodeURIComponent(segmentUrl)}`;
      });

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return res.send(playlistText);
    } else {
      // Return normal HTML with Playerjs
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

// Proxy individual .ts segments
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
