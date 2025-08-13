// server.js
import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;

app.get('/movie/:id', async (req, res) => {
  const { id } = req.params;
  const pageUrl = `https://vidsrc.xyz/embed/movie/${id}`;

  try {
    // Step 1: Fetch the vidsrc embed page
    const pageRes = await fetch(pageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const pageHtml = await pageRes.text();

    // Step 2: Find /prorcp/ token
    const match = pageHtml.match(/\/prorcp\/[A-Za-z0-9+/=]+/);
    if (!match) return res.status(404).send('prorcp link not found.');
    const prorcpPath = match[0];
    const prorcpUrl = new URL(prorcpPath, pageUrl).href;

    // Step 3: Fetch the prorcp page
    const iframeRes = await fetch(prorcpUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const iframeHtml = await iframeRes.text();

    // Step 4: Find direct video link (.m3u8 or .mp4)
    const videoMatch = iframeHtml.match(/https?:\/\/[^\s"']+\.(m3u8|mp4)/i);
    if (!videoMatch) return res.status(404).send('Video link not found.');
    const videoUrl = videoMatch[0];

    // Step 5: Return the direct link
    res.send(videoUrl);

  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing request.');
  }
});

app.listen(PORT, () => {
  console.log(`Direct video proxy running at http://localhost:${PORT}/movie/{id}`);
});
