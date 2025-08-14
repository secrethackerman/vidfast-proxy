import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 10000;

// Helper: fetch page and log status
async function fetchPage(url) {
    console.log(`[fetchPage] Fetching URL: ${url}`);
    const res = await fetch(url);
    console.log(`[fetchPage] Status: ${res.status}`);
    const text = await res.text();
    return text;
}

app.get("/embed/movie/:id", async (req, res) => {
    const movieId = req.params.id;
    const embedUrl = `https://vidsrc.xyz/embed/movie/${movieId}`;

    console.log(`[Route] /embed/movie/${movieId}`);
    console.log(`[Route] Embed URL: ${embedUrl}`);

    try {
        const pageText = await fetchPage(embedUrl);
        const lines = pageText.split("\n");

        // Find cloudnestra rcp link on line 78
        const line78 = lines[77] || "";
        const match = line78.match(/\/\/cloudnestra\.com\/rcp\S*/);
        if (!match) {
            console.error("[Error] Cloudnestra RCP link not found on line 78");
            console.log("[Debug] Line 78 content:", line78);
            return res.status(500).send("Cloudnestra RCP link not found");
        }

        const cloudUrl = `https:${match[0]}`;
        console.log(`[Info] Cloudnestra URL: ${cloudUrl}`);

        // Fetch prorcp page
        const prorcpText = await fetchPage(cloudUrl);
        const prorcpLines = prorcpText.split("\n");

        // Line 103, 20 characters in: get path
        const line103 = prorcpLines[102] || "";
        const pathMatch = line103.slice(20).match(/\{(.+?)\}/);
        if (!pathMatch) {
            console.error("[Error] Path not found on line 103");
            return res.status(500).send("Path not found on line 103");
        }

        const finalPath = `https://cloudnestra.com${pathMatch[1]}`;
        console.log(`[Info] Final path URL: ${finalPath}`);

        // Fetch final page (line 482, 69 characters in)
        const finalText = await fetchPage(finalPath);
        const finalLines = finalText.split("\n");
        const line482 = finalLines[481] || "";
        const fileMatch = line482.slice(69).match(/\{(.+?)\}/);
        if (!fileMatch) {
            console.error("[Error] File URL not found on line 482");
            return res.status(500).send("File URL not found on line 482");
        }

        const fileUrl = fileMatch[1];
        console.log(`[Success] Player file URL: ${fileUrl}`);

        // Return HTML player
        res.send(`
<script src="//files.catbox.moe/wpjrf3.js" type="text/javascript"></script>
<div id="player"></div>
<script>
   var player = new Playerjs({id:"player", file:"${fileUrl}"});
</script>
        `);

    } catch (err) {
        console.error("[Unexpected Error]", err);
        res.status(500).send("Unexpected error occurred");
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
