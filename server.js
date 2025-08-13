// server.js
import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;

app.get('/movie/:id', async (req, res) => {
  const { id } = req.params;
  const pageUrl = `https://vidsrc.xyz/embed/movie/${id}`;

  try {
    // Step 1: Fetch vidsrc embed page
    const pageRes = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const pageHtml = await pageRes.text();

    // Step 2: Extract Cloudnestra src from line 78
    const pageLines = pageHtml.split('\n');
    if (pageLines.length < 78) {
      return res.status(404).send(`Embed page too short to contain Cloudnestra link.
Embed URL: ${pageUrl}`);
    }

    // Line 78 (0-indexed 77)
    const line78 = pageLines[77];
    const srcMatch = line78.match(/src="([^"]+)"/);
    if (!srcMatch) {
      return res.status(404).send(`Could not find Cloudnestra src in line 78.
Line content: ${line78}`);
    }

    const cloudnestraUrl = srcMatch[1];

    // Step 3: Return Cloudnestra URL in plaintext
    res.type('text/plain').send(cloudnestraUrl);

  } catch (err) {
    console.error(err);
    res.status(500).send(`Unexpected error: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Cloudnestra proxy running at http://localhost:${PORT}/movie/{id}`);
});
