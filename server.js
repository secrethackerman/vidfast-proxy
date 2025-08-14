import fetch from "node-fetch";

async function getProrcpIframe(embedUrl) {
    try {
        const res = await fetch(embedUrl);
        if (!res.ok) throw new Error(`HTTP status ${res.status}`);
        const text = await res.text();
        const lines = text.split("\n");
        let iframeSrc = null;

        for (const line of lines) {
            const match = line.match(/<iframe[^>]+src="(\/prorcp\/[^"]+)"/);
            if (match) {
                iframeSrc = match[1];
                break;
            }
        }

        if (!iframeSrc) {
            const snippet = lines.slice(0, 20).join("\n");
            throw new Error(`prorcp link not found in embed page.\nEmbed URL: ${embedUrl}\nFirst 500 chars:\n${snippet}`);
        }

        return iframeSrc;
    } catch (err) {
        throw new Error(`Failed to fetch embed page: ${err.message}`);
    }
}

async function getCloudnestraLink(prorcpUrl, baseUrl) {
    try {
        const res = await fetch(prorcpUrl);
        if (!res.ok) throw new Error(`HTTP status ${res.status}`);
        const text = await res.text();
        const lines = text.split("\n");

        if (lines.length < 78) throw new Error(`prorcp page too short`);
        const line78 = lines[77]; // 0-indexed
        const match = line78.match(/src="([^"]+)"/);
        if (!match) throw new Error(`Cloudnestra link not found on line 78`);
        const url = match[1].startsWith("http") ? match[1] : `${baseUrl}${match[1]}`;
        return url;
    } catch (err) {
        throw new Error(`Failed to fetch prorcp page: ${err.message}`);
    }
}

async function getCloudnestraPath(cloudnestraUrl) {
    try {
        const res = await fetch(cloudnestraUrl);
        if (!res.ok) throw new Error(`HTTP status ${res.status}`);
        const text = await res.text();
        const lines = text.split("\n");

        if (lines.length < 103) throw new Error(`Cloudnestra page too short`);
        const line103 = lines[102]; // 0-indexed
        const path = line103.slice(19).match(/[^"']+/); // after 20 chars
        if (!path) throw new Error(`Path not found on line 103`);
        return `https://cloudnestra.com${path[0]}`;
    } catch (err) {
        throw new Error(`Failed to fetch Cloudnestra URL: ${err.message}`);
    }
}

async function getFinalPlayerJs(finalUrl) {
    try {
        const res = await fetch(finalUrl);
        if (!res.ok) throw new Error(`HTTP status ${res.status}`);
        const text = await res.text();
        const lines = text.split("\n");

        if (lines.length < 482) throw new Error(`Final Cloudnestra page too short`);
        const line482 = lines[481]; // 0-indexed
        const snippet = line482.slice(68); // after 69 characters
        if (!snippet) throw new Error(`Player URL not found on line 482`);
        return snippet;
    } catch (err) {
        throw new Error(`Failed to fetch final Playerjs page: ${err.message}`);
    }
}

export async function fetchMovie(embedUrl) {
    try {
        const prorcpPath = await getProrcpIframe(embedUrl);
        const prorcpUrl = new URL(prorcpPath, embedUrl).href;

        const cloudnestraUrl = await getCloudnestraLink(prorcpUrl, "https://cloudnestra.com");

        const finalCloudnestraUrl = await getCloudnestraPath(cloudnestraUrl);

        const playerSnippet = await getFinalPlayerJs(finalCloudnestraUrl);

        return playerSnippet;
    } catch (err) {
        return `Unexpected error: ${err.message}`;
    }
}
