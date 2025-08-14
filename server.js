const fetch = require("node-fetch");

async function getPlayerHtml(embedUrl) {
    try {
        // Step 1: Fetch embed page
        const embedRes = await fetch(embedUrl);
        const embedText = await embedRes.text();

        // Step 2: Find prorcp iframe
        const prorcpMatch = embedText.match(/src=['"]([^'"]*prorcp[^'"]*)['"]/);
        if (!prorcpMatch) {
            console.error("prorcp iframe not found. First 500 chars:\n", embedText.slice(0, 500));
            return;
        }
        const prorcpUrl = new URL(prorcpMatch[1], embedUrl).href;

        // Step 3: Fetch prorcp page
        const prorcpRes = await fetch(prorcpUrl);
        const prorcpText = await prorcpRes.text();

        // Step 4: Find Cloudnestra link (line 78)
        const prorcpLines = prorcpText.split("\n");
        if (prorcpLines.length < 78) {
            console.error("Unexpected prorcp page structure, less than 78 lines");
            return;
        }
        let cloudLinkLine = prorcpLines[77];
        const cloudMatch = cloudLinkLine.match(/src=['"]([^'"]+)['"]/);
        if (!cloudMatch) {
            console.error("Cloudnestra src not found on line 78:", cloudLinkLine);
            return;
        }
        const cloudUrl = cloudMatch[1].startsWith("//")
            ? "https:" + cloudMatch[1]
            : cloudMatch[1];

        // Step 5: Fetch Cloudnestra page
        const cloudRes = await fetch(cloudUrl);
        const cloudText = await cloudRes.text();

        // Step 6: Find Playerjs M3U8 URL (line 482)
        const cloudLines = cloudText.split("\n");
        if (cloudLines.length < 482) {
            console.error("Unexpected Cloudnestra page structure, less than 482 lines");
            return;
        }
        let playerLine = cloudLines[481];
        const playerMatch = playerLine.match(/file:\s*['"]([^'"]+)['"]/);
        if (!playerMatch) {
            console.error("Playerjs file not found on line 482:", playerLine);
            return;
        }

        // Step 7: Convert relative path to full URL
        let m3u8Url = playerMatch[1].trim();
        if (m3u8Url.startsWith("/")) {
            m3u8Url = "https://cloudnestra.com" + m3u8Url;
        }

        // Step 8: Fetch M3U8 playlist and pick highest resolution
        const m3u8Res = await fetch(m3u8Url);
        const m3u8Text = await m3u8Res.text();
        const lines = m3u8Text.split("\n");

        let bestUrl = null;
        let bestRes = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith("#EXT-X-STREAM-INF")) {
                const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/);
                if (resMatch) {
                    const width = parseInt(resMatch[1], 10);
                    const height = parseInt(resMatch[2], 10);
                    const nextLine = lines[i + 1];
                    if (width * height > bestRes) {
                        bestRes = width * height;
                        bestUrl = nextLine.startsWith("/")
                            ? "https://cloudnestra.com" + nextLine
                            : nextLine;
                    }
                }
            }
        }

        if (!bestUrl) {
            console.error("No valid stream found in M3U8 playlist");
            return;
        }

        // Step 9: Return Playerjs HTML snippet
        return `
<script src="//files.catbox.moe/wpjrf3.js" type="text/javascript"></script>
<div id="player"></div>
<script>
   var player = new Playerjs({id:"player", file:"${bestUrl}"});
</script>
        `.trim();

    } catch (err) {
        console.error("Unexpected error:", err);
    }
}

module.exports = { getPlayerHtml };
