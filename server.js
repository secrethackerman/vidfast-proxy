import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;

app.get('/movie/:id', async (req, res) => {
  const { id } = req.params;
  const pageUrl = `https://vidsrc.xyz/embed/movie/${id}`;

  try {
    // Step 1: Fetch main page
    const pageRes = await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const pageHtml = await pageRes.text();

    // Step 2: Find prorcp link even if it's inside JS
    const match = pageHtml.match(/\/prorcp\/[A-Za-z0-9:_-]+/);
    if (!match) return res.status(404).send('prorcp link not found in HTML.');
    const prorcpUrl = new URL(match[0], pageUrl).href;

    // Step 3: Fetch prorcp page
    const prorcpRes = await fetch(prorcpUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const prorcpHtml = await prorcpRes.text();

    // Step 4: Extract all http(s) links from that HTML
    const links = prorcpHtml.match(/https?:\/\/[^\s"'<>]+/g) || [];

    res.json({ prorcpUrl, links });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing request.');
  }
});

app.listen(PORT, () => {
  console.log(`Debug proxy running: http://localhost:${PORT}/movie/{id}`);
});
