// server.js
import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;

app.get('/movie/:id', async (req, res) => {
  const { id } = req.params;
  const embedUrl = `https://vidsrc.xyz/embed/movie/${id}`;

  try {
    // Step 1: Fetch vidsrc embed page
    const embedRes = await fetch(embedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const embedHtml = await embedRes.text();

    // Step 2: Extract Cloudnestra iframe src from line 78
    const embedLines = embedHtml.split('\n');
    if (embedLines.length < 78) {
      return res.status(404).send(`Embed page too short to contain Cloudnestra iframe.
Embed URL: ${embedUrl}`);
    }
    const line78 = embedLines[77];
    const srcMatch = line78.match(/src="([^"]+)"/);
    if (!srcMatch) {
      return res.status(404).send(`Could not find Cloudnestra iframe src in line 78.
Line content: ${line78}`);
    }

    const cloudIframeUrl = srcMatch[1];

    // Step 3: Fetch Cloudnestra iframe page
    const cloudRes = await fetch(cloudIframeUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const cloudHtml = await cloudRes.text();

    // Step 4: Extract path from line 103, column ~20
    const cloudLines = cloudHtml.split('\n');
    if (cloudLines.length < 103) {
      return res.status(404).send(`Cloudnestra iframe page too short.
Cloud iframe URL: ${cloudIframeUrl}`);
    }
    const line103 = cloudLines[102];
    const pathMatch = line103.match(/['"]([^'"]+)['"]/);
    if (!pathMatch) {
      return res.status(404).send(`Could not find path in line 103.
Line content: ${line103}`);
    }

    const cloudPath = pathMatch[1];

    // Step 5: Return full cloudnestra.com URL
    const finalUrl = `https://cloudnestra.com${cloudPath}`;
    res.type('text/plain').send(finalUrl);

  } catch (err) {
    console.error(err);
    res.status(500).send(`Unexpected error: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Cloudnestra proxy running at http://localhost:${PORT}/movie/{id}`);
});
