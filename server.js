import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/embed/movie/:id", async (req, res) => {
  const movieId = req.params.id;
  const embedUrl = `https://vidsrc.xyz/embed/movie/${movieId}`;
  console.log(`Fetching embed page: ${embedUrl}`);

  try {
    const embedResp = await fetch(embedUrl);
    if (!embedResp.ok) throw new Error(`Embed page HTTP status: ${embedResp.status}`);
    const embedText = await embedResp.text();
    const embedLines = embedText.split("\n");

    // Cloudnestra RCP URL is usually on line 78 (0-based index 77)
    const line78 = embedLines[77];
    const rcpMatch = line78.match(/\/\/cloudnestra\.com\/rcp[^\s'"]*/);
    if (!rcpMatch) throw new Error(`Cloudnestra RCP link not found on line 78:\n${line78}`);
    const cloudnestraUrl = "https:" + rcpMatch[0];
    console.log(`Extracted Cloudnestra URL: ${cloudnestraUrl}`);

    // Fetch the RCP page
    const rcpResp = await fetch(cloudnestraUrl);
    if (!rcpResp.ok) throw new Error(`RCP page HTTP status: ${rcpResp.status}`);
    const rcpText = await rcpResp.text();
    const rcpLines = rcpText.split("\n");

    // Playerjs file URL is usually on line 103 (0-based index 102)
    const line103 = rcpLines[102];
    const fileMatch = line103.match(/file:\s*'([^']+)'/);
    if (!fileMatch) throw new Error(`Playerjs file URL not found on line 103:\n${line103}`);
    const playerFileUrl = fileMatch[1];
    console.log(`Extracted Playerjs file URL: ${playerFileUrl}`);

    // Return Playerjs HTML
    const html = `
<script src="//files.catbox.moe/wpjrf3.js" type="text/javascript"></script>
<div id="player"></div>
<script>
  var player = new Playerjs({id:"player", file:"${playerFileUrl}"});
</script>
    `;
    res.setHeader("Content-Type", "text/html");
    res.send(html);

  } catch (err) {
    console.error("Error:", err.message);
    const errorHtml = `<h2>Error loading video:</h2><pre>${err.message}</pre>`;
    res.status(500).send(errorHtml);
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
