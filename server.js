import fetch from "node-fetch";

async function fetchEmbed(id) {
    const embedUrl = `https://vidsrc.xyz/embed/movie/${id}`;
    try {
        const res = await fetch(embedUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching embed page`);
        const text = await res.text();

        // Step 1: get Cloudnestra RCP URL from line 78
        const lines = text.split("\n");
        const line78 = lines[77] || "";
        const rcpMatch = line78.match(/\/\/cloudnestra\.com\/rcp[^\s'"]+/);
        if (!rcpMatch) {
            console.error("Could not find Cloudnestra RCP link on line 78:");
            console.error(line78);
            throw new Error("RCP link not found");
        }
        const rcpUrl = "https:" + rcpMatch[0];
        return rcpUrl;
    } catch (err) {
        console.error("Failed fetching embed page:", err.message);
        throw err;
    }
}

async function fetchProRCP(rcpUrl) {
    try {
        const res = await fetch(rcpUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching RCP page`);
        const text = await res.text();

        // Step 2: look at line 103, 20th character, extract {path}
        const lines = text.split("\n");
        const line103 = lines[102] || "";
        const pathMatch = line103.match(/['"]([^'"]+)['"]/);
        if (!pathMatch) {
            console.error("Could not find path on line 103:");
            console.error(line103);
            throw new Error("Path not found");
        }
        const path = pathMatch[1];
        return `https://cloudnestra.com${path}`;
    } catch (err) {
        console.error("Failed fetching RCP page:", err.message);
        throw err;
    }
}

async function fetchPlayerFile(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching Player page`);
        const text = await res.text();

        // Step 3: get Playerjs file URL from line 482, after 69 characters
        const lines = text.split("\n");
        const line482 = lines[481] || "";
        const fileMatch = line482.match(/file\s*:\s*["']([^"']+)["']/);
        if (!fileMatch) {
            console.error("Could not find Playerjs file URL on line 482:");
            console.error(line482);
            throw new Error("Playerjs file not found");
        }
        return fileMatch[1];
    } catch (err) {
        console.error("Failed fetching Playerjs file page:", err.message);
        throw err;
    }
}

export async function getVideoFile(id) {
    try {
        const rcpUrl = await fetchEmbed(id);
        const proRCPUrl = await fetchProRCP(rcpUrl);
        const playerFileUrl = await fetchPlayerFile(proRCPUrl);

        // Step 4: handle .m3u8 as text if needed
        if (playerFileUrl.endsWith(".m3u8")) {
            const m3u8Res = await fetch(playerFileUrl);
            if (!m3u8Res.ok) throw new Error(`HTTP ${m3u8Res.status} fetching m3u8`);
            const m3u8Text = await m3u8Res.text();
            return m3u8Text;
        }

        return playerFileUrl;
    } catch (err) {
        console.error("Error getting video file:", err.message);
        throw err;
    }
}
