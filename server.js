// server.js
import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/movie/:id", async (req, res) => {
  const movieId = req.params.id;
  const upstreamUrl = `https://vidfast.pro/movie/${movieId}`;

  try {
    const response = await fetch(upstreamUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Proxy/1.0)" }
    });
    let html = await response.text();

    // Remove scripts that open popups
    // (matches window.open or common ad scripts)
    html = html.replace(/window\.open[\s\S]*?\);?/gi, "");
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "");

    // Inject sandboxed iframe if needed
    html = html.replace(
      /<body>/i,
      `<body><iframe sandbox="allow-scripts allow-same-origin" allowfullscreen style="width:100%;height:100%;border:none;"></iframe>`
    );

    // Fix relative URLs
    html = html.replace(
      /<head>/i,
      `<head><base href="https://vidfast.pro/">`
    );

    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(html);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching movie page.");
  }
});

app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
