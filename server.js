import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

async function fetchText(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
    return await res.text();
  } catch (err) {
    throw new Error(`Failed to fetch ${url}: ${err.message}`);
  }
}

function getLine(text, lineNumber) {
  const lines = text.split("\n");
  return lines[lineNumber - 1] || "";
}

app.get("/movie/:id", async (req, res) => {
  const embedId = req.params.id;

  try {
    // Step 1: Fetch embed page
    const embedUrl = `https://vidsrc.xyz/embed/movie/${embedId}`;
    const embedPage = await fetchText(embedUrl);

    // Step 2: Extract prorcp URL from line 78, after column 30
    const line78 = getLine(embedPage, 78);
    const prorcpMatch = line78.match(/src="(\/\/[^"]+)"/);
    if (!prorcpMatch) {
      return res.status(500).send({
        error: "prorcp link not found",
        embedUrl,
        line78: line78.slice(0, 500),
      });
    }
    const prorcpUrl = `https:${prorcpMatch[1]}`;

    // Step 3: Fetch prorcp page and extract Cloudnestra path from line 103, 20 chars in
    const prorcpPage = await fetchText(prorcpUrl);
    const line103 = getLine(prorcpPage, 103);
    const cloudPath = line103.slice(20).match(/\S+/)?.[0];
    if (!cloudPath) {
      return res.status(500).send({
        error: "Cloudnestra path not found",
        prorcpUrl,
        line103,
      });
    }
    const cloudUrl = `https://cloudnestra.com${cloudPath}`;

    // Step 4: Fetch Cloudnestra URL, extract Playerjs file from line 482, after 69 chars
    const cloudPage = await fetchText(cloudUrl);
    const line482 = getLine(cloudPage, 482);
    const playerFile = line482.slice(69).match(/["']([^"']+)["']/)?.[1];
    if (!playerFile) {
      return res.status(500).send({
        error: "Playerjs file not found",
        cloudUrl,
        line482,
      });
    }

    // Step 5: Return Playerjs HTML snippet
    const playerHtml = `<script src="//files.catbox.moe/wpjrf3.js" type="text/javascript"></script>
<div id="player"></div>
<script>
   var player = new Playerjs({id:"player", file:"${playerFile}"});
</script>`;

    res.set("Content-Type", "text/html");
    res.send(playerHtml);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
