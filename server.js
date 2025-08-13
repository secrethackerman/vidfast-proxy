// server.js
import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const app = express();
const PORT = process.env.PORT || 3000;

// Route: /video/:id
app.get("/video/:id", async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).send("Missing video ID");

  const vidsrcUrl = `https://vidsrc.xyz/embed/movie/${id}`;

  try {
    // 1. Fetch the vidsrc page
    const vidsrcResp = await fetch(vidsrcUrl);
    const vidsrcHtml = await vidsrcResp.text();

    // 2. Extract Cloudnestra iframe
    const dom = new JSDOM(vidsrcHtml);
    const iframe = dom.window.document.querySelector("#player_iframe") || dom.window.document.querySelector("iframe");
    if (!iframe) return res.status(404).send("Cloudnestra iframe not found");

    const cloudnestraUrl = iframe.src.startsWith("/") 
      ? new URL(iframe.src, vidsrcUrl).href 
      : iframe.src;

    // 3. Fetch Cloudnestra page content
    const cloudResp = await fetch(cloudnestraUrl);
    const cloudHtml = await cloudResp.text();

    // 4. Serve it directly
    res.setHeader("Content-Type", "text/html");
    res.send(cloudHtml);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching or processing page");
  }
});

app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
