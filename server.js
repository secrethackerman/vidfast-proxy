// server.js
import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;

// The URL you want to iframe
const TARGET_URL = 'https://example.com';

app.get('/proxy', async (req, res) => {
  try {
    const response = await fetch(TARGET_URL);
    let html = await response.text();

    // Remove the specific script by matching a unique part of it
    html = html.replace(
      /<script>[\s\S]*?sandboxDetection[\s\S]*?<\/script>/,
      ''
    );

    // Optional: you can also strip other inline scripts or malicious scripts here

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching target page.');
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}/proxy`);
});
