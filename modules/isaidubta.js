const axios = require('axios');
const cheerio = require('cheerio');

// Function to fetch download URLs by resolution
async function fetchDownloadUrls(downloadPageUrl) {
    try {
        const response = await axios.get(downloadPageUrl);
        const $ = cheerio.load(response.data);

        const downloadUrls = {};

        // Extract download links for 360p and 720p
        $('div.f').each((index, element) => {
            const resolutionText = $(element).find('a').text().trim();
            const relativeUrl = $(element).find('a').attr('href');
            const fullUrl = `https://isaidub9.com${relativeUrl}`;

            const fontText = $(element).find('td.left font').text().trim();
            if (fontText.toLowerCase().includes('sample')) {
                return; // Skip if it's a sample
            }

            if (resolutionText.includes("360p")) {
                downloadUrls["360p"] = fullUrl;
            } else if (resolutionText.includes("720p")) {
                downloadUrls["720p"] = fullUrl;
            }
        });

        // For each quality (360p, 720p), scrape the final download link
        const middle1DownloadUrls = {};

        for (const quality in downloadUrls) {
            const qualityUrl = downloadUrls[quality];
            const qualityPageResponse = await axios.get(qualityUrl);
            const $qualityPage = cheerio.load(qualityPageResponse.data);

            // Extract the final download URL
            $qualityPage('div.f').each((index, element) => {
                const fontText = $(element).find('td.left font').text().trim();
                if (!fontText.toLowerCase().includes('sample')) {
                    const finalDownloadLink = $(element).find('a').attr('href');
                    if (finalDownloadLink) {
                        middle1DownloadUrls[quality] = `https://isaidub9.com${finalDownloadLink}`;
                    }
                }
            });
        }

        // For each quality (360p, 720p), scrape the final download link
        const middle2DownloadUrls = {};

        for (const quality in middle1DownloadUrls) {
            const qualityUrl = middle1DownloadUrls[quality];
            const qualityPageResponse = await axios.get(qualityUrl);
            const $qualityPage = cheerio.load(qualityPageResponse.data);

            // Extract the final download URL
            $qualityPage('div.download').each((index, element) => {
                    const finalDownloadLink = $(element).find('a').attr('href');
                    if (finalDownloadLink) {
                        middle2DownloadUrls[quality] = finalDownloadLink;
                    }
            });
        }

        const finalDownloadUrls = {};

for (const quality in middle2DownloadUrls) {
    const qualityUrl = middle2DownloadUrls[quality];
    const qualityPageResponse = await axios.get(qualityUrl);
    const $qualityPage = cheerio.load(qualityPageResponse.data);

    // Extract the final download URL
    $qualityPage('div.download').each((index, element) => {
        let finalDownloadLink = $(element).find('a').attr('href');
        if (finalDownloadLink) {
            // Split the URL into base URL and the query string
            const [baseUrl, queryString] = finalDownloadLink.split('?');
            
            // Encode the query string only (URL parameters)
            const encodedQueryString = queryString
                ? queryString
                    .split('&')
                    .map(param => {
                        const [key, value] = param.split('=');
                        return `${key}=${encodeURIComponent(value)}`;
                    })
                    .join('&')
                : '';

            // Rebuild the final URL with base URL and the encoded query string
            const finalEncodedUrl = baseUrl + '?' + encodedQueryString;

            // Store the final download URL
            finalDownloadUrls[quality] = finalEncodedUrl;
        }
    });
}

return finalDownloadUrls;

        
    } catch (error) {
        console.error(`Error fetching download URLs from ${downloadPageUrl}:`, error);
        return {};
    }
}

// Function to fetch nested URLs (movie resolutions) on each movie's main page
async function fetchNestedUrls(movieUrl, movieTitle) {
    try {
        const response = await axios.get(movieUrl);
        const $ = cheerio.load(response.data);

        const movie = { title: movieTitle, downloadUrls: {} };

        const nestedUrls = [];
        $('div.f').each((index, element) => {
            const title = $(element).find('a').text().trim();
            const relativeUrl = $(element).find('a').attr('href');
            const fullUrl = `https://isaidub9.com${relativeUrl}`;
            nestedUrls.push({ title, url: fullUrl });
        });

        // Visit each nested URL to retrieve the final download links
        for (const { title, url } of nestedUrls) {
            const finalDownloadUrls = await fetchDownloadUrls(url);
            movie.downloadUrls = { ...movie.downloadUrls, ...finalDownloadUrls };
        }

        return movie;
    } catch (error) {
        console.error(`Error fetching nested URLs from ${movieUrl}:`, error);
        return {};
    }
}

// Main function to get movies based on the search query
async function getMovies(searchQuery, res, results) {
    try {
        const baseUrl = 'https://isaidub9.com/movie/tamil-dubbed-movies-download/';
        const totalPages = 145;
        const movies = [];

        // Loop through pages and scrape movie titles
        for (let page = 1; page <= totalPages; page++) {
            const pageUrl = `${baseUrl}?get-page=${page}`;
            const response = await axios.get(pageUrl);
            const $ = cheerio.load(response.data);

            // Collect movies with matching titles
            const movieLinks = [];
            $('.f').each((index, element) => {
                const title = $(element).find('a').text().trim();
                const relativeUrl = $(element).find('a').attr('href');
                const fullUrl = `https://isaidub9.com${relativeUrl}`;
                
                if (title.toLowerCase().includes(searchQuery.toLowerCase())) {
                    movieLinks.push({ title, fullUrl });
                }
            });

            // Visit each movie page to get download links and nested URLs
            for (const { title, fullUrl } of movieLinks) {
                const movie = await fetchNestedUrls(fullUrl, title);
                if (Object.keys(movie.downloadUrls).length > 0) {
                    movies.push(movie);
                }

                if (movies.length >= results) break;
            }

            // Stop if we have enough results
            if (movies.length >= results) break;
        }

        // Return the requested number of results
        res.json({ success: true, results: movies.slice(0, results) });
    } catch (error) {
        console.error('Error fetching main page URLs:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch or parse data' });
    }
}

module.exports = {
    getMovies,
};
