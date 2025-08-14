import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Fetch the video file URL from a given embed movie ID.
 */
async function getVideoFile(embedId) {
  try {
    // Step 1: Fetch the embed page
    const embedUrl = `https://vidsrc.xyz/embed/movie/${embedId}`;
    const embedRes = await fetch(embedUrl);
    if (!embedRes.ok) throw new Error(`Failed to fetch embed page: ${embedRes.status}`);
    const embedHtml = await embedRes.text();

    // Step 2: Extract cloudnestra.com/rcp link from line 78
    const embedLines = embedHtml.split("\n");
    const line78 = embedLines[77] || "";
    const rcpMatch = line78.match(/\/\/cloudnestra\.com\/rcp\S*/);
    if (!rcpMatch) {
      throw new Error(`cloudnestra.com/rcp link not found on line 78:\n${line78}`);
    }
    const rcpUrl = "https:" + rcpMatch[0];

    // Step 3: Fetch the prorcp page
    const prorcpRes = await fetch(rcpUrl);
    if (!prorcpRes.ok) throw new Error(`Failed to fetch prorcp page: ${prorcpRes.status}`);
    const prorcpHtml = await prorcpRes.text();

    // Step 4: Extract Playerjs URL from line 103, 20 chars in
    const prorcpLines = prorcpHtml.split("\n");
    const line103 = prorcpLines[102] || "";
    const fileMatch = line103.slice(19).match(/\{(.+?)\}/);
    if (!fileMatch) throw new Error(`Playerjs file URL not found on line 103:\n${line103}`);
    const playerFileUrl = `https://cloudnestra.com${fileMatch[1]}`;

    // Step 5: Fetch Playerjs page
    const playerRes = await fetch(playerFileUrl);
    if (!playerRes.ok) throw new Error(`Failed to fetch Playerjs page: ${playerRes.status}`);
    const playerHtml = await playerRes.text();

    // Step 6: Extract final URL from line 482, 69 chars in
    const playerLines = playerHtml.split("\n");
    const line482 = playerLines[481] || "";
    const finalMatch = line482.slice(68).match(/\{(.+?)\}/);
    if (!finalMatch) throw new Error(`Final file URL not found on line 482:\n${line482}`);

    return finalMatch[1]; // The final URL (m3u8 or video)
  } catch (err) {
    console.error("Error fetching video file:", err.message);
    throw err;
  }
}

// Proxy route: /embed/video/:id
app.get("/embed/video/:id", async (req, res) => {
  try {
    const embedId = req.params.id;
    const fileUrl = await getVideoFile(embedId);

    // Fetch the content of the final URL and pipe it to the client
    const finalRes = await fetch(fileUrl);
    if (!finalRes.ok) return res.status(finalRes.status).send("Failed to fetch video content");

    // Set proper headers for m3u8 or video
    res.setHeader("Content-Type", finalRes.headers.get("content-type") || "application/octet-stream");

    // Stream the response directly
    finalRes.body.pipe(res);
  } catch (err) {
    res.status(500).send(`Failed: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
