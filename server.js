// server.js
import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = 3000;

// Proxy endpoint
// Example: http://localhost:3000/embed/movie/1234
app.get('/embed/movie/:id', async (req, res) => {
  const { id } = req.params;
  const targetUrl = `https://vidsrc.xyz/embed/movie/${id}`;

  try {
    const response = await fetch(targetUrl);
    let html = await response.text();

    // Remove the anti-iframe script by matching a unique part
    html = html.replace(
      /<script>[\s\S]*?sandboxDetection[\s\S]*?<\/script>/,
      ''
    );

    // Optionally, remove other potentially malicious scripts
    // html = html.replace(/<script[\s\S]*?<\/script>/gi, '');

    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching target page.');
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}/embed/movie/{id}`);
});
