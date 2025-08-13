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

    // Step 2: Extract /prorcp/ link
    const prorcpMatch = pageHtml.match(/\/prorcp\/[A-Za-z0-9+/=]+/);
    if (!prorcpMatch) {
      const start = 4 * 500; // 5th 500-character block
      const debugSnippet = pageHtml.slice(start, start + 500);
      return res.status(404).send(`prorcp link not found in embed page.
Embed URL: ${pageUrl}
HTTP Status: ${pageRes.status}
Characters 2001-2500 of page: ${debugSnippet}`);
    }
    const prorcpUrl = new URL(prorcpMatch[0], pageUrl).href;

    // Step 3: Fetch prorcp page
    const prorcpRes = await fetch(prorcpUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const prorcpHtml = await prorcpRes.text();

    if (prorcpRes.status !== 200) {
      const start = 4 * 500; // 5th block
      const debugSnippet = prorcpHtml.slice(start, start + 500);
      return res.status(500).send(`Failed fetching prorcp page.
prorcp URL: ${prorcpUrl}
HTTP Status: ${prorcpRes.status}
Characters 2001-2500: ${debugSnippet}`);
    }

    // Step 4: Find 'var player = new Playerjs' without // in front
    const playerMatch = prorcpHtml.match(/^(?!.*\/\/).*var\s+player\s*=\s*new\s+Playerjs\(([\s\S]*?)\);/m);
    if (!playerMatch) {
      const start = 4 * 500;
      const debugSnippet = prorcpHtml.slice(start, start + 500);
      return res.status(404).send(`Playerjs code not found in prorcp page.
prorcp URL: ${prorcpUrl}
Characters 2001-2500: ${debugSnippet}`);
    }

    const playerCode = playerMatch[1];

    // Step 5: Extract file: '...' from Playerjs config
    const fileMatch = playerCode.match(/file\s*:\s*['"]([^'"]+)['"]/);
    if (!fileMatch) {
      return res.status(404).send(`File URL not found in Playerjs config.
Playerjs code snippet (first 200 chars): ${playerCode.slice(0, 200)}`);
    }

    const fileUrl = fileMatch[1];

    // Step 6: Return in plain text
    res.type('text/plain').send(fileUrl);

  } catch (err) {
    console.error(err);
    res.status(500).send(`Unexpected error: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Direct file proxy running at http://localhost:${PORT}/movie/{id}`);
});
