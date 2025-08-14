import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/embed/movie/:id", async (req, res) => {
    const movieId = req.params.id;
    console.log(`[INFO] Requested ID: ${movieId}`);

    try {
        const embedUrl = `https://vidsrc.xyz/embed/movie/${movieId}`;
        console.log(`[STEP] Fetching embed page: ${embedUrl}`);

        const embedResp = await fetch(embedUrl);
        const embedHtml = await embedResp.text();

        const lines = embedHtml.split("\n");
        const line78 = lines[77] || "";
        const matchCloud = line78.match(/\/\/cloudnestra\.com\/prorcp[^\"]+/);

        if (!matchCloud) {
            console.error(`[ERROR] Cloudnestra link not found on line 78: ${line78}`);
            return res.status(500).send(`<h1>Error: Cloudnestra link not found</h1><pre>${line78}</pre>`);
        }

        const prorcpUrl = `https:${matchCloud[0]}`;
        console.log(`[STEP] Found prorcp URL: ${prorcpUrl}`);

        const prorcpResp = await fetch(prorcpUrl);
        const prorcpHtml = await prorcpResp.text();

        const prorcpLines = prorcpHtml.split("\n");
        const line103 = prorcpLines[102] || "";
        const matchPath = line103.match(/'([^']+)'/);

        if (!matchPath) {
            console.error(`[ERROR] Path not found on line 103: ${line103}`);
            return res.status(500).send(`<h1>Error: Path not found</h1><pre>${line103}</pre>`);
        }

        const cloudPathUrl = `https://cloudnestra.com${matchPath[1]}`;
        console.log(`[STEP] Found cloud path URL: ${cloudPathUrl}`);

        const pathResp = await fetch(cloudPathUrl);
        const pathHtml = await pathResp.text();

        const pathLines = pathHtml.split("\n");
        const line482 = pathLines[481] || "";
        const m3u8Match = line482.match(/file:\s*'([^']+)'/);

        if (!m3u8Match) {
            console.error(`[ERROR] Playerjs file URL not found on line 482: ${line482}`);
            return res.status(500).send(`<h1>Error: Playerjs file URL not found</h1><pre>${line482}</pre>`);
        }

        let m3u8Url = m3u8Match[1];
        if (m3u8Url.startsWith("/")) {
            const origin = new URL(cloudPathUrl).origin;
            m3u8Url = `${origin}${m3u8Url}`;
        }

        console.log(`[SUCCESS] Found m3u8 URL: ${m3u8Url}`);

        // Return an HTML page pointing Playerjs to our m3u8-proxy
        const proxyUrl = `/m3u8-proxy?url=${encodeURIComponent(m3u8Url)}`;
        res.send(`
            <html>
            <body>
                <script src="https://cdn.jsdelivr.net/npm/playerjs@1"></script>
                <div id="player"></div>
                <script>
                    var player = new Playerjs({id:"player", file:"${proxyUrl}"});
                </script>
            </body>
            </html>
        `);

    } catch (err) {
        console.error(`[UNEXPECTED ERROR] ${err.stack}`);
        res.status(500).send(`<h1>Unexpected error</h1><pre>${err.message}</pre>`);
    }
});

// New m3u8 proxy handler
app.get("/m3u8-proxy", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send("Missing URL parameter");
    }

    console.log(`[M3U8-PROXY] Fetching playlist: ${targetUrl}`);

    try {
        const playlistResp = await fetch(targetUrl);
        if (!playlistResp.ok) {
            throw new Error(`Failed to fetch playlist: ${playlistResp.status}`);
        }

        let playlist = await playlistResp.text();
        const baseUrl = new URL(targetUrl).origin;

        // Rewrite relative segment paths
        playlist = playlist.replace(/^(?!#)(.*\.m3u8|.*\.ts)/gm, (match) => {
            if (match.startsWith("http")) return match;
            return `${baseUrl}${match.startsWith("/") ? match : "/" + match}`;
        });

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        res.send(playlist);

    } catch (err) {
        console.error(`[M3U8-PROXY ERROR] ${err.stack}`);
        res.status(500).send(`Error fetching m3u8: ${err.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
