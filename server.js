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
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CleanProxy/1.0)",
      },
    });

    let html = await response.text();

    // Remove all <script> tags (ads/popup scripts)
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "");

    // Optional: Remove iframes inside the page that are ads
    html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");

    // Fix relative URLs by adding a <base> tag
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

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
