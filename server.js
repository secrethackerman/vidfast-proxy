import express from 'express';
import fetch from 'node-fetch';
import lineReader from 'line-reader';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/embed/movie/:id', async (req, res) => {
  const { id } = req.params;
  const embedUrl = `https://vidsrc.xyz/embed/movie/${id}`;

  try {
    const embedResp = await fetch(embedUrl);
    if (!embedResp.ok) throw new Error(`Embed page fetch failed: ${embedResp.status}`);

    const embedText = await embedResp.text();
    const embedLines = embedText.split('\n');

    const cloudLine = embedLines[77]; // line 78
    if (!cloudLine || !cloudLine.includes('//cloudnestra.com/rcp')) {
      return res.status(500).send(`Cloudnestra RCP link not found on line 78: ${cloudLine || ''}`);
    }

    const cloudUrlMatch = cloudLine.match(/\/\/cloudnestra\.com\/rcp\S*/);
    if (!cloudUrlMatch) {
      return res.status(500).send(`Failed to extract Cloudnestra URL from line 78: ${cloudLine}`);
    }
    const cloudUrl = 'https:' + cloudUrlMatch[0].replace(/['"]/g, '');

    // Fetch the prorcp page
    const prorcpResp = await fetch(cloudUrl);
    if (!prorcpResp.ok) throw new Error(`Prorcp fetch failed: ${prorcpResp.status}`);
    const prorcpText = await prorcpResp.text();
    const prorcpLines = prorcpText.split('\n');

    const playerLine = prorcpLines[102]; // line 103
    if (!playerLine || !playerLine.includes('var player = new Playerjs')) {
      return res.status(500).send(`Playerjs line not found on line 103: ${playerLine || ''}`);
    }

    const fileMatch = playerLine.match(/file:\s*["']([^"']+)["']/);
    if (!fileMatch) {
      return res.status(500).send(`Failed to extract Playerjs file URL on line 103: ${playerLine}`);
    }
    const playerFileUrl = 'https://cloudnestra.com' + fileMatch[1];

    // Fetch the Playerjs content
    const playerResp = await fetch(playerFileUrl);
    if (!playerResp.ok) throw new Error(`Playerjs fetch failed: ${playerResp.status}`);
    const playerText = await playerResp.text();
    const playerLines = playerText.split('\n');

    const finalLine = playerLines[481]; // line 482
    if (!finalLine) {
      return res.status(500).send('Final Playerjs line not found');
    }

    const finalUrlMatch = finalLine.match(/file:\s*["']([^"']+)["']/);
    if (!finalUrlMatch) {
      return res.status(500).send(`Failed to extract final URL on line 482: ${finalLine}`);
    }

    const finalUrl = finalUrlMatch[1];
    res.send(finalUrl);

  } catch (err) {
    console.error(err);
    res.status(500).send(`Unexpected error: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
