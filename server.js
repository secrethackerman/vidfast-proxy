// server.js
import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/movie/:id', async (req, res) => {
  const { id } = req.params;
  const pageUrl = `https://vidsrc.xyz/embed/movie/${id}`;

  try {
    // Step 1: Get the embed page
    const pageRes = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const pageHtml = await pageRes.text();

    // Step 2: Extract the /prorcp/ path from the loadIframe function
    const match = pageHtml.match(/src:\s*'([^']*\/prorcp\/[^']+)'/);
    if (!match) return res.status(404).send('prorcp link not found.');
    const prorcpUrl = new URL(match[1], pageUrl).href;

    // Step 3: Fetch that iframe page and follow redirects
    const iframeRes = await fetch(prorcpUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow'
    });
    const iframeHtml = await iframeRes.text();

    // Step 4: Extract the actual video source (m3u8 or mp4)
    const videoMatch = iframeHtml.match(/https?:\/\/[^\s"']+\.(m3u8|mp4)/i);
    if (!videoMatch) return res.status(404).send('Video link not found.');
    const videoUrl = videoMatch[0];

    // Step 5: Return JSON
    res.json({ source: videoUrl });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing request.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
