import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/embed/movie/:id", async (req, res) => {
    const movieId = req.params.id;
    const embedUrl = `https://vidsrc.xyz/embed/movie/${movieId}`;
    console.log(`[1] Fetching embed page: ${embedUrl}`);

    let embedHtml;
    try {
        const r = await fetch(embedUrl);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        embedHtml = await r.text();
    } catch (err) {
        console.error(`[!] Failed fetching embed page: ${err}`);
        return res.status(500).send(`<h1>Error fetching embed page</h1><p>${err}</p>`);
    }

    // Search for Cloudnestra RCP URL on line 78
    const embedLines = embedHtml.split("\n");
    let cloudUrlLine = embedLines[77] || "";
    const cloudMatch = cloudUrlLine.match(/\/\/cloudnestra\.com\/rcp[^\s'"]*/);
    if (!cloudMatch) {
        console.error(`[!] Cloudnestra RCP URL not found on line 78`);
        return res.status(500).send(`
            <h1>Error</h1>
            <p>Cloudnestra RCP URL not found on line 78</p>
            <pre>${cloudUrlLine.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>
        `);
    }

    const cloudUrl = "https:" + cloudMatch[0];
    console.log(`[2] Extracted Cloudnestra URL: ${cloudUrl}`);

    // Fetch prorcp page
    let prorcpHtml;
    try {
        const r = await fetch(cloudUrl);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        prorcpHtml = await r.text();
    } catch (err) {
        console.error(`[!] Failed fetching prorcp page: ${err}`);
        return res.status(500).send(`<h1>Error fetching prorcp page</h1><p>${err}</p>`);
    }

    // Search for Playerjs file URL on line 482
    const prorcpLines = prorcpHtml.split("\n");
    let playerLine = prorcpLines[481] || "";
    const playerMatch = playerLine.match(/Playerjs\(\s*\{[^}]*file\s*:\s*['"]([^'"]+)['"]/i);

    if (!playerMatch) {
        console.error(`[!] Playerjs file URL not found in prorcp page`);
        return res.status(500).send(`
            <h1>Error</h1>
            <p>Playerjs file URL not found in prorcp page</p>
            <pre>${playerLine.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>
        `);
    }

    const playerUrl = playerMatch[1];
    console.log(`[3] Extracted Playerjs URL: ${playerUrl}`);

    // Fetch Playerjs URL content (the .m3u8 or manifest)
    let playerHtml;
    try {
        const r = await fetch(playerUrl);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        playerHtml = await r.text();
    } catch (err) {
        console.error(`[!] Failed fetching Playerjs URL: ${err}`);
        return res.status(500).send(`<h1>Error fetching Playerjs URL</h1><p>${err}</p>`);
    }

    console.log(`[4] Successfully fetched Playerjs content, returning HTML`);

    // Return HTML with player embedded
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Movie ${movieId}</title>
        </head>
        <body>
            <div id="player"></div>
            <script src="https://cdn.jsdelivr.net/npm/playerjs@latest/dist/player.min.js"></script>
            <script>
                var player = new Playerjs({
                    id: "player",
                    file: "${playerUrl}"
                });
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
