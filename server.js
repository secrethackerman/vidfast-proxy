import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/embed/movie/:id", async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[*] Starting scrape for movie ID: ${id}`);

        // Step 1: Get vidsrc embed page
        const embedUrl = `https://vidsrc.xyz/embed/movie/${id}`;
        console.log(`[*] Fetching embed page: ${embedUrl}`);
        let response = await fetch(embedUrl);
        if (!response.ok) throw new Error(`Embed fetch failed: ${response.status}`);
        let html = await response.text();

        // Step 2: Find Cloudnestra prorcp link
        const cloudMatch = html.match(/\/\/cloudnestra\.com\/prorcp\/[^\s'"]+/);
        if (!cloudMatch) {
            const lines = html.split("\n");
            console.error("[!] prorcp link not found. Dumping line 78 for debugging:");
            console.error(lines[77] || "(line 78 not found)");
            return res.status(500).send("prorcp link not found");
        }
        const prorcpUrl = "https:" + cloudMatch[0];
        console.log(`[*] Found prorcp URL: ${prorcpUrl}`);

        // Step 3: Fetch prorcp page
        response = await fetch(prorcpUrl);
        if (!response.ok) throw new Error(`prorcp fetch failed: ${response.status}`);
        html = await response.text();

        // Step 4: Extract m3u8 from line 482
        const prorcpLines = html.split("\n");
        const lineIndex = 481; // 0-based index for human line 482
        const line482 = prorcpLines[lineIndex] || "";
        console.log(`[*] Line 482 content: ${line482}`);

        const fileMatch = line482.match(/file:\s*'([^']+)'/);
        if (!fileMatch) {
            console.error("[!] Playerjs file URL not found on line 482");
            return res.status(500).send("Playerjs file URL not found");
        }
        let m3u8Url = fileMatch[1];
        if (m3u8Url.startsWith("/")) {
            const baseUrl = new URL(prorcpUrl).origin;
            m3u8Url = baseUrl + m3u8Url;
        }
        console.log(`[*] Final m3u8 URL: ${m3u8Url}`);

        // Step 5: Return HTML with player using proxy
        const proxyUrl = `/m3u8-proxy?url=${encodeURIComponent(m3u8Url)}`;
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Player</title></head>
            <body>
                <div id="player"></div>
                <script src="//cdn.jsdelivr.net/npm/playerjs@latest"></script>
                <script>
                    var player = new Playerjs({id:"player", file:"${proxyUrl}"});
                </script>
            </body>
            </html>
        `);
    } catch (err) {
        console.error("[!] Unexpected error:", err);
        res.status(500).send(`Error: ${err.message}`);
    }
});

// Step 6: m3u8 proxy
app.get("/m3u8-proxy", async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) return res.status(400).send("Missing m3u8 URL");
        console.log(`[*] Proxying m3u8: ${url}`);

        let response = await fetch(url);
        if (!response.ok) throw new Error(`m3u8 fetch failed: ${response.status}`);
        let text = await response.text();

        // Rewrite relative segment URLs
        const baseUrl = url.substring(0, url.lastIndexOf("/"));
        text = text.replace(/^(?!#)(.*\.m3u8|.*\.ts)/gm, match => {
            if (match.startsWith("http")) return match;
            return baseUrl + "/" + match;
        });

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.send(text);
    } catch (err) {
        console.error("[!] m3u8 proxy error:", err);
        res.status(500).send(`m3u8 proxy error: ${err.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`✅ Proxy server running on port ${PORT}`);
});
