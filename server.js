// server.js
import express from "express";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint: /proxy?vidsrc=<encoded_vidsrc_url>
app.get("/proxy", async (req, res) => {
  const vidsrcUrl = req.query.vidsrc;
  if (!vidsrcUrl) return res.status(400).send("Missing vidsrc URL");

  try {
    // 1. Fetch the vidsrc page
    const vidsrcResp = await fetch(vidsrcUrl);
    const vidsrcHtml = await vidsrcResp.text();

    // 2. Parse vidsrc HTML to extract Cloudnestra iframe
    const dom = new JSDOM(vidsrcHtml);
    const iframe = dom.window.document.querySelector("#player_iframe") || dom.window.document.querySelector("iframe");
    if (!iframe) return res.status(404).send("Cloudnestra iframe not found");

    const cloudnestraUrl = iframe.src.startsWith("/") 
      ? new URL(iframe.src, vidsrcUrl).href 
      : iframe.src;

    // 3. Fetch Cloudnestra content
    const cloudResp = await fetch(cloudnestraUrl);
    let cloudHtml = await cloudResp.text();

    // 4. Remove popup scripts (basic)
    cloudHtml = cloudHtml.replace(/<script[^>]*>[\s\S]*pop_asdf[\s\S]*<\/script>/gi, "");

    // 5. Serve cleaned HTML
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
