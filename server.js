const express = require(‘express’);
const axios = require(‘axios’);
const cheerio = require(‘cheerio’);

const app = express();
const PORT = 3000;

// Helper function to extract string from single quotes after a pattern
function extractFromQuotes(text, pattern) {
const regex = new RegExp(pattern + “\s*[’"]([^'"]+)[’"]”);
const match = text.match(regex);
return match ? match[1] : null;
}

// Route handler for /embed/movie/:num
app.get(’/embed/movie/:num’, async (req, res) => {
try {
const num = req.params.num;
console.log(`Processing movie ID: ${num}`);

```
    // Step 1: Get params from URL (already done via req.params.num)
    
    // Step 2: Get HTML of vidsrc.net
    console.log('Step 2: Fetching vidsrc.net page...');
    const vidsrcUrl = `https://vidsrc.net/embed/movie?tmdb=${num}`;
    const vidsrcResponse = await axios.get(vidsrcUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    // Step 3: Get the src URL of iframe with id="player_iframe"
    console.log('Step 3: Extracting iframe src...');
    const $ = cheerio.load(vidsrcResponse.data);
    let iframeSrc = $('#player_iframe').attr('src');
    
    if (!iframeSrc) {
        // If not found in HTML, search in script tags
        const scripts = $('script').map((i, el) => $(el).html()).get();
        for (const script of scripts) {
            if (script && script.includes('player_iframe')) {
                iframeSrc = extractFromQuotes(script, 'src:\\s*');
                if (iframeSrc) break;
            }
        }
    }

    if (!iframeSrc) {
        throw new Error('Could not find iframe src');
    }

    console.log(`Found iframe src: ${iframeSrc}`);

    // Step 4: Extract string after the specified pattern
    console.log('Step 4: Searching for frame manipulation code...');
    const scripts = $('script').map((i, el) => $(el).html()).get().join('\n');
    
    // Look for the pattern in the script content
    const framePattern = /\$\("#the_frame"\)\.removeAttr\("style"\);\s*\$\("#the_frame"\)\.html\(""\);\s*\$\('<iframe>',\s*\{\s*id:\s*['"]player_iframe['"],\s*src:\s*['"]([^'"]+)['"]/;
    const frameMatch = scripts.match(framePattern);
    
    let frameUrl = null;
    if (frameMatch) {
        frameUrl = frameMatch[1];
    } else {
        // Alternative pattern search
        const altPattern = /src:\s*['"]([^'"]*)['"]/g;
        let match;
        while ((match = altPattern.exec(scripts)) !== null) {
            if (match[1].includes('/') || match[1].startsWith('http')) {
                frameUrl = match[1];
                break;
            }
        }
    }

    if (!frameUrl) {
        throw new Error('Could not extract frame URL from scripts');
    }

    console.log(`Found frame URL: ${frameUrl}`);

    // Step 5: Get source from cloudnestra.com
    console.log('Step 5: Fetching cloudnestra.com page...');
    const cloudnestraUrl = `https://cloudnestra.com${frameUrl}`;
    const cloudnestraResponse = await axios.get(cloudnestraUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': vidsrcUrl
        }
    });

    // Step 6: Get URL from Playerjs configuration
    console.log('Step 6: Extracting final video URL...');
    const $cloud = cheerio.load(cloudnestraResponse.data);
    const cloudScripts = $cloud('script').map((i, el) => $cloud(el).html()).get().join('\n');
    
    // Look for Playerjs configuration
    const playerjsPattern = /Playerjs\(\{\s*id:\s*["']player_parent["'],\s*file:\s*["']([^"']+)["']/;
    const playerjsMatch = cloudScripts.match(playerjsPattern);
    
    if (!playerjsMatch) {
        throw new Error('Could not find Playerjs file URL');
    }

    const finalVideoUrl = playerjsMatch[1];
    console.log(`Final video URL: ${finalVideoUrl}`);

    // Redirect to the final video URL
    res.redirect(finalVideoUrl);

} catch (error) {
    console.error('Error processing request:', error.message);
    res.status(500).json({ 
        error: 'Failed to extract video URL', 
        details: error.message 
    });
}
```

});

// Health check endpoint
app.get(’/health’, (req, res) => {
res.json({ status: ‘OK’, timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
console.log(`Server running on http://localhost:${PORT}`);
console.log(`Test with: http://localhost:${PORT}/embed/movie/123456`);
});

module.exports = app;
