const axios = require('axios');
const cheerio = require('cheerio');

async function getMovies(searchQuery, res, results) {
    if (!searchQuery) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        const searchURL = 'https://vegamovies.soy'; // Replace with the correct URL if needed

        // Step 1: Search the movie
        const response = await axios.post(searchURL, new URLSearchParams({
            do: 'search',
            subaction: 'search',
            story: searchQuery,
        }));

        const $ = cheerio.load(response.data);
        const articles = [];

        // Step 2: Get movie details and URLs from search results
        const movieLinks = [];
        $('article.post-item').each((index, element) => {
            if (index >= results) return false; // Limit the number of results
            
            const title = $(element).find('.entry-title a').text().trim();
            const url = $(element).find('.entry-title a').attr('href');
            const image = $(element).find('.blog-img img').attr('src');
            const date = $(element).find('.date-time span').text().trim();

            if (url) movieLinks.push({ title, url, year: date, image: image ? `https://vegamovies.soy${image}` : null });
        });

        // Step 3: Visit each movie URL to get download links
        for (const movie of movieLinks) {
            const downloadUrls = await getDownloadLinks(movie.url);
            movie.downloadUrls = downloadUrls;
        }

        // Send the extracted data as a JSON response
        res.json(movieLinks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch or parse data' });
    }
}

// Function to extract download links for 480p, 720p, and 1080p resolutions
async function getDownloadLinks(url) {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const downloadUrls = {};

        // Assuming the page structure has "download link sections" you can find by labels
        $('h3').each((index, element) => {
            const label = $(element).text().toLowerCase();

            if (label.includes('480p')) {
                downloadUrls['480p'] = $(element).next().find('a').attr('href');
            } else if (label.includes('720p')) {
                downloadUrls['720p'] = $(element).next().find('a').attr('href');
            } else if (label.includes('1080p')) {
                downloadUrls['1080p'] = $(element).next().find('a').attr('href');
            }
        });

        return downloadUrls;
    } catch (error) {
        console.error(`Failed to fetch download links from ${url}`, error);
        return {};
    }
}

module.exports = {
    getMovies,
};
