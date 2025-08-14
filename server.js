import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/embed/movie/:id", async (req, res) => {
  const movieId = req.params.id;
  const embedUrl = `https://vidsrc.xyz/embed/movie/${movieId}`;

  try {
    console.log(`Fetching embed page: ${embedUrl}`);
    const embedResp = await fetch(embedUrl);
    if (!embedResp.ok) throw new Error(`Failed to fetch embed page: ${embedResp.status}`);

    const embedText = await embedResp.text();
    const embedLines = embedText.split("\n");

    // Look for the cloudnestra prorcp link on line 78
    const line78 = embedLines[77] || "";
    const cloudMatch = line78.match(/\/\/cloudnestra\.com\/[^'"\s]+/);
    if (!cloudMatch) {
      console.error(`Cloudnestra URL not found on line 78: ${line78}`);
      return res.send(`<pre>Cloudnestra URL not found on line 78:\n${line78}</pre>`);
    }

    let prorcpUrl = "https:" + cloudMatch[0];
    console.log(`Extracted cloudnestra URL: ${prorcpUrl}`);

    // Fetch prorcp page
    const prorcpResp = await fetch(prorcpUrl);
    if (!prorcpResp.ok) throw new Error(`Failed to fetch prorcp page: ${prorcpResp.status}`);

    const prorcpText = await prorcpResp.text();
    const prorcpLines = prorcpText.split("\n");

    // Look for Playerjs file URL on line 103
    const line103 = prorcpLines[102] || "";
    const fileMatch = line103.match(/src:\s*'([^']+)'/);
    if (!fileMatch) {
      console.error(`Playerjs file URL not found on line 103:\n${line103}`);
      return res.send(`<pre>Playerjs file URL not found on line 103:\n${line103}</pre>`);
    }

    let playerFileUrl = fileMatch[1];
    if (playerFileUrl.startsWith("/")) {
      playerFileUrl = "https://cloudnestra.com" + playerFileUrl;
    }
    console.log(`Playerjs file URL: ${playerFileUrl}`);

    // Fetch Playerjs file page
    const playerResp = await fetch(playerFileUrl);
    if (!playerResp.ok) throw new Error(`Failed to fetch Playerjs file: ${playerResp.status}`);

    const playerText = await playerResp.text();
    const playerLines = playerText.split("\n");

    // Look for line 482 (Playerjs video file)
    const line482 = playerLines[481] || "";
    const videoMatch = line482.match(/file:\s*'([^']+)'/);
    if (!videoMatch) {
      console.error(`Playerjs file URL not found on line 482:\n${line482}`);
      return res.send(`<pre>Playerjs file URL not found on line 482:\n${line482}</pre>`);
    }

    const videoUrl = videoMatch[1];
    console.log(`Extracted video URL: ${videoUrl}`);

    // Return HTML with embedded Playerjs
    res.send(`
      <script src="//files.catbox.moe/wpjrf3.js" type="text/javascript"></script>
      <div id="player"></div>
      <script>
        var player = new Playerjs({
          id:"player",
          file: '${videoUrl}'
        });
      </script>
    `);
  } catch (err) {
    console.error(err);
    res.send(`<pre>Unexpected error: ${err.message}</pre>`);
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
