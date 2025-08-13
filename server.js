import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;

app.get('/movie/:id', async (req, res) => {
  const { id } = req.params;
  const embedUrl = `https://vidsrc.xyz/embed/movie/${id}`;

  try {
    // Step 1: Fetch Vidsrc embed page
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
    let line78 = embedLines[77];
    const srcMatch = line78.match(/src="([^"]+)"/);
    if (!srcMatch) {
      return res.status(404).send(`Could not find Cloudnestra iframe src in line 78.
Line content: ${line78}`);
    }

    // Step 3: Normalize URL
    let cloudIframeUrl = srcMatch[1];
    if (cloudIframeUrl.startsWith('//')) {
      cloudIframeUrl = 'https:' + cloudIframeUrl;
    } else if (!cloudIframeUrl.startsWith('http')) {
      cloudIframeUrl = new URL(cloudIframeUrl, 'https://vidsrc.xyz').href;
    }

    // Step 4: Fetch Cloudnestra iframe page
    const cloudRes = await fetch(cloudIframeUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const cloudHtml = await cloudRes.text();

    // Step 5: Extract path from line 103, column ~20
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
    const finalUrl = `https://cloudnestra.com${cloudPath}`;

    // Step 6: Fetch the final Cloudnestra media page
    const mediaRes = await fetch(finalUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const mediaHtml = await mediaRes.text();

    // Step 7: Extract file URL from line 482, after 69 characters
    const mediaLines = mediaHtml.split('\n');
    if (mediaLines.length < 482) {
      return res.status(404).send(`Media page too short.
Cloudnestra media URL: ${finalUrl}`);
    }
    const line482 = mediaLines[481];
    const fileUrl = line482.slice(69).replace(/['";]+/g, '').trim(); // clean quotes/semicolon

    // Step 8: Return HTML snippet with Playerjs
    const playerHtml = `
<script src="//files.catbox.moe/wpjrf3.js" type="text/javascript"></script>
<div id="player"></div>

<script>
   var player = new Playerjs({id:"player", file:"${fileUrl}"});
</script>
    `;

    res.type('text/html').send(playerHtml);

  } catch (err) {
    console.error(err);
    res.status(500).send(`Unexpected error: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running at http://localhost:${PORT}/movie/{id}`);
});
