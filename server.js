import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/embed/movie/:id", async (req, res) => {
    try {
        const movieId = req.params.id;
        const embedUrl = `https://vidsrc.xyz/embed/movie/${movieId}`;
        console.log(`[Info] Fetching embed page: ${embedUrl}`);

        const embedResp = await fetch(embedUrl);
        if (!embedResp.ok) {
            console.error(`[Error] Embed page fetch failed: ${embedResp.status}`);
            return res.status(500).send("Embed page fetch failed");
        }
        const embedText = await embedResp.text();
        const embedLines = embedText.split("\n");

        // Step 1: Find prorcp link on line 78 containing cloudnestra.com/rcp
        const line78 = embedLines[77] || "";
        const cloudMatch = line78.match(/\/\/cloudnestra\.com\/rcp[^\s'"]*/);
        if (!cloudMatch) {
            console.error(`[Error] Cloudnestra rcp link not found on line 78`);
            console.error(`Line 78: ${line78}`);
            return res.status(500).send("Cloudnestra rcp link not found");
        }
        const cloudUrl = "https:" + cloudMatch[0];
        console.log(`[Info] Found cloudnestra rcp URL: ${cloudUrl}`);

        // Step 2: Fetch the prorcp page
        const prorcpResp = await fetch(cloudUrl);
        if (!prorcpResp.ok) {
            console.error(`[Error] Fetching prorcp page failed: ${prorcpResp.status}`);
            return res.status(500).send("Fetching prorcp page failed");
        }
        const prorcpText = await prorcpResp.text();
        const prorcpLines = prorcpText.split("\n");

        // Step 3: Extract cloudnestra file URL on line 103 after src: ''
        const line103 = prorcpLines[102] || "";
        const srcMatch = line103.match(/src:\s*'(.+?)'/);
        if (!srcMatch) {
            console.error(`[Error] src URL not found on line 103`);
            console.error(`Line 103 content: ${line103}`);
            return res.status(500).send("src URL not found");
        }
        let cloudnestraFileUrl = srcMatch[1].trim();
        if (cloudnestraFileUrl.startsWith("/")) {
            cloudnestraFileUrl = "https://cloudnestra.com" + cloudnestraFileUrl;
        }
        console.log(`[Info] Extracted cloudnestra file URL: ${cloudnestraFileUrl}`);

        // Step 4: Fetch cloudnestra file and extract Playerjs URL on line 482
        const cloudResp = await fetch(cloudnestraFileUrl);
        if (!cloudResp.ok) {
            console.error(`[Error] Fetching cloudnestra file failed: ${cloudResp.status}`);
            return res.status(500).send("Fetching cloudnestra file failed");
        }
        const cloudText = await cloudResp.text();
        const cloudLines = cloudText.split("\n");
        const line482 = cloudLines[481] || "";
        const playerMatch = line482.match(/file:"(.+?)"/);
        if (!playerMatch) {
            console.error(`[Error] Playerjs file URL not found on line 482`);
            console.error(`Line 482 content: ${line482}`);
            return res.status(500).send("Playerjs file URL not found");
        }
        const playerFileUrl = playerMatch[1].trim();
        console.log(`[Info] Extracted Playerjs file URL: ${playerFileUrl}`);

        // Step 5: Return HTML with Playerjs script
        const html = `
<script src="//files.catbox.moe/wpjrf3.js" type="text/javascript"></script>
<div id="player"></div>
<script>
   var player = new Playerjs({id:"player", file:"${playerFileUrl}"});
</script>`;
        res.setHeader("Content-Type", "text/html");
        return res.send(html);

    } catch (err) {
        console.error(`[Unexpected error] ${err.message}`);
        return res.status(500).send("Unexpected error");
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
