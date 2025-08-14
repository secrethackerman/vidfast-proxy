import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/embed/movie/:id", async (req, res) => {
    const movieId = req.params.id;
    const embedUrl = `https://vidsrc.xyz/embed/movie/${movieId}`;
    console.log(`[Info] Fetching embed page: ${embedUrl}`);

    try {
        // Step 1: Fetch embed page
        const embedResp = await fetch(embedUrl);
        if (!embedResp.ok) throw new Error(`HTTP ${embedResp.status}`);
        const embedText = await embedResp.text();

        // Step 2: Find prorcp link on line 78
        const embedLines = embedText.split("\n");
        const line78 = embedLines[77] || "";
        const prorcpMatch = line78.match(/\/\/cloudnestra\.com\/rcp\S*/);
        if (!prorcpMatch) {
            console.error(`[Error] prorcp link not found on line 78`);
            console.error(`Line 78 content: ${line78}`);
            return res.status(500).send("prorcp link not found");
        }
        const prorcpUrl = "https:" + prorcpMatch[0];
        console.log(`[Info] Found prorcp URL: ${prorcpUrl}`);

        // Step 3: Fetch prorcp page
        const prorcpResp = await fetch(prorcpUrl);
        if (!prorcpResp.ok) throw new Error(`HTTP ${prorcpResp.status}`);
        const prorcpText = await prorcpResp.text();

        // Step 4: Find cloudnestra src URL on line 103
        const prorcpLines = prorcpText.split("\n");
        const line103 = prorcpLines[102] || "";
        const srcMatch = line103.match(/src:\s*'(.+?)'/);
        if (!srcMatch) {
            console.error(`[Error] src URL not found on line 103`);
            console.error(`Line 103 content: ${line103}`);
            return res.status(500).send("src URL not found");
        }
        const cloudnestraUrl = srcMatch[1]; // e.g., https://cloudnestra.com/xxxx
        console.log(`[Info] Extracted cloudnestra URL: ${cloudnestraUrl}`);

        // Step 5: Fetch cloudnestra page
        const cloudResp = await fetch(cloudnestraUrl);
        if (!cloudResp.ok) throw new Error(`HTTP ${cloudResp.status}`);
        const cloudText = await cloudResp.text();

        // Step 6: Extract Playerjs file URL from line 482 after 69 characters
        const cloudLines = cloudText.split("\n");
        const line482 = cloudLines[481] || "";
        if (line482.length < 69) {
            console.error(`[Error] Line 482 too short`);
            console.error(`Line 482 content: ${line482}`);
            return res.status(500).send("Line 482 too short to extract URL");
        }
        const playerFileUrl = line482.slice(69).trim();
        console.log(`[Info] Extracted Playerjs file URL: ${playerFileUrl}`);

        // Step 7: Return HTML using Playerjs with the extracted URL
        const html = `
<script src="//files.catbox.moe/wpjrf3.js" type="text/javascript"></script>
<div id="player"></div>

<script>
   var player = new Playerjs({id:"player", file:"${playerFileUrl}"});
</script>
        `;
        res.setHeader("Content-Type", "text/html");
        res.send(html);

    } catch (err) {
        console.error(`[Unexpected Error] ${err}`);
        res.status(500).send(`Unexpected error: ${err.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
