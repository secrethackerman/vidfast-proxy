import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/embed/movie/:id", async (req, res) => {
  const { id } = req.params;
  const embedUrl = `https://vidsrc.xyz/embed/movie/${id}`;

  try {
    // Step 1: Fetch embed page
    const embedResp = await fetch(embedUrl);
    if (!embedResp.ok) throw new Error(`Failed to fetch embed page: ${embedResp.status}`);
    const embedText = await embedResp.text();
    const embedLines = embedText.split("\n");

    // Step 2: Find prorcp URL
    const prorcpLine = embedLines.find(line => line.includes("/prorcp/"));
    if (!prorcpLine) {
      const snippet = embedText.slice(0, 500);
      throw new Error(`Prorcp link not found in embed page.\nEmbed URL: ${embedUrl}\nFirst 500 chars:\n${snippet}`);
    }

    let prorcpPath = prorcpLine.match(/\/prorcp\/[^\s'"]+/);
    if (!prorcpPath) throw new Error("Prorcp path regex failed");
    prorcpPath = prorcpPath[0];

    const prorcpUrl = `https://cloudnestra.com${prorcpPath}`;

    // Step 3: Fetch prorcp page
    const prorcpResp = await fetch(prorcpUrl);
    if (!prorcpResp.ok) throw new Error(`Failed to fetch prorcp page: ${prorcpResp.status}`);
    const prorcpText = await prorcpResp.text();
    const prorcpLines = prorcpText.split("\n");

    // Step 4: Extract Cloudnestra player URL (line 78, after column 30)
    if (prorcpLines.length < 78) throw new Error("Prorcp page too short to find Cloudnestra URL");
    let cloudLine = prorcpLines[77].slice(30).trim();
    cloudLine = cloudLine.replace(/^['"]|['"]$/g, ""); // strip quotes
    const cloudUrl = `https://cloudnestra.com${cloudLine}`;

    // Step 5: Fetch Cloudnestra page
    const cloudResp = await fetch(cloudUrl);
    if (!cloudResp.ok) throw new Error(`Failed to fetch Cloudnestra page: ${cloudResp.status}`);
    const cloudText = await cloudResp.text();
    const cloudLines = cloudText.split("\n");

    // Step 6: Extract PlayerJS file URL (line 482, after 69 chars)
    if (cloudLines.length < 482) throw new Error("Cloudnestra page too short to find PlayerJS URL");
    let playerLine = cloudLines[481].slice(69).trim();
    playerLine = playerLine.replace(/^['"]|['"]$/g, ""); // strip quotes

    // Step 7: Fetch final m3u8
    const finalResp = await fetch(playerLine);
    if (!finalResp.ok) throw new Error(`Failed to fetch final URL: ${finalResp.status}`);
    const m3u8Text = await finalResp.text();

    res.setHeader("Content-Type", "text/plain");
    res.send(m3u8Text);

  } catch (err) {
    console.error(err);
    res.status(500).send(`Unexpected error: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
