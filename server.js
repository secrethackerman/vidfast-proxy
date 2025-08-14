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
    if (!embedResp.ok) throw new Error(`HTTP ${embedResp.status}`);
    const embedHtml = await embedResp.text();

    // Find cloudnestra prorcp link
    const cloudMatch = embedHtml.match(/\/\/cloudnestra\.com\/rcp[^\s"'<>]*/);
    if (!cloudMatch) {
      console.error("[!] Cloudnestra link not found on embed page line ~78");
      return res.status(404).send("Cloudnestra link not found");
    }
    const prorcpUrl = `https:${cloudMatch[0]}`;
    console.log(`[2] Extracted Cloudnestra URL: ${prorcpUrl}`);

    // Fetch the prorcp page
    const prorcpResp = await fetch(prorcpUrl);
    if (!prorcpResp.ok) throw new Error(`HTTP ${prorcpResp.status}`);
    const prorcpHtml = await prorcpResp.text();

    // Extract Playerjs file URL from the prorcp HTML
    const matchPlayerjs = prorcpHtml.match(/Playerjs\(\{[^}]*file:\s*['"]([^'"]+)['"]/);
    if (!matchPlayerjs) {
      console.error("[!] Playerjs file URL not found in prorcp page");
      return res.status(404).send("Playerjs file URL not found");
    }
    const playerUrl = matchPlayerjs[1];
    console.log(`[3] Extracted Playerjs URL: ${playerUrl}`);

    // Return a minimal HTML with Playerjs
    const html = `
      <script src="//files.catbox.moe/wpjrf3.js" type="text/javascript"></script>
      <div id="player"></div>
      <script>
        var player = new Playerjs({id:"player", file:"${playerUrl}"});
      </script>
    `;

    res.setHeader("Content-Type", "text/html");
    res.send(html);

  } catch (err) {
    console.error("[!] Error:", err.message);
    res.status(500).send("Internal server error");
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
