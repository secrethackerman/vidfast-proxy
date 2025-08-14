import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/embed/movie/:id", async (req, res) => {
    const movieId = req.params.id;
    console.log(`[INFO] Incoming request for movie ID: ${movieId}`);

    try {
        // Step 1: Get the embed page from vidsrc
        const embedUrl = `https://vidsrc.xyz/embed/movie/${movieId}`;
        console.log(`[STEP 1] Fetching embed page: ${embedUrl}`);
        const embedResp = await fetch(embedUrl);
        const embedHtml = await embedResp.text();
        const embedLines = embedHtml.split("\n");

        // Step 2: Search for Cloudnestra link anywhere in the page (loose match)
        let cloudnestraUrl = null;
        for (const line of embedLines) {
            const matchCloud = line.match(/\/\/cloudnestra\.com\/[^\"]+/);
            if (matchCloud) {
                cloudnestraUrl = "https:" + matchCloud[0];
                break;
            }
        }

        if (!cloudnestraUrl) {
            console.error("[ERROR] Cloudnestra link not found in embed page");
            return res
                .status(500)
                .send(`<h1>Error: Cloudnestra link not found</h1><pre>${embedLines[77] || "Line 78 not found"}</pre>`);
        }

        console.log(`[STEP 2] Extracted Cloudnestra URL: ${cloudnestraUrl}`);

        // Step 3: Fetch prorcp page
        const prorcpResp = await fetch(cloudnestraUrl);
        const prorcpHtml = await prorcpResp.text();
        const prorcpLines = prorcpHtml.split("\n");

        // Step 4: Extract path from line 103 (zero-index = 102)
        const targetLine = prorcpLines[102] || "";
        const pathMatch = targetLine.match(/'([^']+)'/);
        if (!pathMatch) {
            console.error("[ERROR] Playerjs file URL not found on line 103");
            return res.status(500).send(`<h1>Playerjs file URL not found on line 103:</h1><pre>${targetLine}</pre>`);
        }

        const path = pathMatch[1];
        const finalUrl = path.startsWith("http") ? path : `https://cloudnestra.com${path}`;
        console.log(`[STEP 4] Extracted path: ${finalUrl}`);

        // Step 5: Fetch final page to find m3u8 in line 482 (zero-index = 481)
        const finalResp = await fetch(finalUrl);
        const finalHtml = await finalResp.text();
        const finalLines = finalHtml.split("\n");
        const line482 = finalLines[481] || "";
        const m3u8Match = line482.match(/'(https?:\/\/[^']+\.m3u8)'/);

        if (!m3u8Match) {
            console.error("[ERROR] m3u8 URL not found in line 482");
            return res.status(500).send(`<h1>m3u8 URL not found on line 482:</h1><pre>${line482}</pre>`);
        }

        const m3u8Url = m3u8Match[1];
        console.log(`[STEP 5] Extracted m3u8 URL: ${m3u8Url}`);

        // Step 6: Fetch the m3u8 and return it directly
        const m3u8Resp = await fetch(m3u8Url);
        if (!m3u8Resp.ok) {
            console.error(`[ERROR] Failed to fetch m3u8: ${m3u8Resp.status} ${m3u8Resp.statusText}`);
            return res.status(500).send(`<h1>Failed to fetch m3u8</h1><pre>Status: ${m3u8Resp.status}</pre>`);
        }

        const m3u8Text = await m3u8Resp.text();
        res.type("application/vnd.apple.mpegurl").send(m3u8Text);

    } catch (err) {
        console.error("[FATAL ERROR]", err);
        res.status(500).send(`<h1>Unexpected error</h1><pre>${err.stack}</pre>`);
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
