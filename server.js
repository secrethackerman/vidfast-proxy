const express = require(‘express’);
const axios = require(‘axios’);
const cheerio = require(‘cheerio’);

const app = express();
const PORT = process.env.PORT || 3000;

function extractFromQuotes(text, pattern) {
const regex = new RegExp(pattern + ‘\s*['”]([^'"]+)['”]’);
const match = text.match(regex);
return match ? match[1] : null;
}

app.get(’/embed/movie/:num’, async (req, res) => {
try {
const num = req.params.num;
console.log(‘Processing movie ID:’, num);

```
    const vidsrcUrl = 'https://vidsrc.net/embed/movie?tmdb=' + num;
    const vidsrcResponse = await axios.get(vidsrcUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });

    const $ = cheerio.load(vidsrcResponse.data);
    let iframeSrc = $('#player_iframe').attr('src');
    
    if (!iframeSrc) {
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

    console.log('Found iframe src:', iframeSrc);

    const scripts = $('script').map((i, el) => $(el).html()).get().join('\n');
    
    const framePattern = /\$\("#the_frame"\)\.removeAttr\("style"\);\s*\$\("#the_frame"\)\.html\(""\);\s*\$\('<iframe>',\s*\{\s*id:\s*['"]player_iframe['"],\s*src:\s*['"]([^'"]+)['"]/;
    const frameMatch = scripts.match(framePattern);
    
    let frameUrl = null;
    if (frameMatch) {
        frameUrl = frameMatch[1];
    } else {
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

    console.log('Found frame URL:', frameUrl);

    const cloudnestraUrl = 'https://cloudnestra.com' + frameUrl;
    const cloudnestraResponse = await axios.get(cloudnestraUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': vidsrcUrl
        }
    });

    const $cloud = cheerio.load(cloudnestraResponse.data);
    const cloudScripts = $cloud('script').map((i, el) => $cloud(el).html()).get().join('\n');
    
    const playerjsPattern = /Playerjs\(\{\s*id:\s*["']player_parent["'],\s*file:\s*["']([^"']+)["']/;
    const playerjsMatch = cloudScripts.match(playerjsPattern);
    
    if (!playerjsMatch) {
        throw new Error('Could not find Playerjs file URL');
    }

    const finalVideoUrl = playerjsMatch[1];
    console.log('Final video URL:', finalVideoUrl);

    res.redirect(finalVideoUrl);

} catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ 
        error: 'Failed to extract video URL', 
        details: error.message 
    });
}
```

});

app.get(’/health’, (req, res) => {
res.json({ status: ‘OK’, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
console.log(‘Server running on port’, PORT);
});

module.exports = app;
