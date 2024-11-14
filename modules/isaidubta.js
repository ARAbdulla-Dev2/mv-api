const axios = require('axios');
const cheerio = require('cheerio');

async function fetchDownloadUrls(downloadPageUrl) {
	try {
		const response = await axios.get(downloadPageUrl);
		const $ = cheerio.load(response.data);

		const downloadUrls = {};

		$('div.f').each((index, element) => {
			const resolutionText = $(element).find('a').text().trim();
			const relativeUrl = $(element).find('a').attr('href');
			const fullUrl = `https://isaidub9.com${relativeUrl}`;

			const fontText = $(element).find('td.left font').text().trim();
			if (fontText.toLowerCase().includes('sample')) {
				return;
			}

			if (resolutionText.includes("360p")) {
				downloadUrls["360p"] = fullUrl;
			} else if (resolutionText.includes("720p")) {
				downloadUrls["720p"] = fullUrl;
			}
		});

		const middle1DownloadUrls = {};

		for (const quality in downloadUrls) {
			const qualityUrl = downloadUrls[quality];
			const qualityPageResponse = await axios.get(qualityUrl);
			const $qualityPage = cheerio.load(qualityPageResponse.data);

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

		const middle2DownloadUrls = {};

		for (const quality in middle1DownloadUrls) {
			const qualityUrl = middle1DownloadUrls[quality];
			const qualityPageResponse = await axios.get(qualityUrl);
			const $qualityPage = cheerio.load(qualityPageResponse.data);

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

			$qualityPage('div.download').each((index, element) => {
				let finalDownloadLink = $(element).find('a').attr('href');
				if (finalDownloadLink) {
					const [baseUrl, queryString] = finalDownloadLink.split('?');

					const encodedQueryString = queryString ?
						queryString
						.split('&')
						.map(param => {
							const [key, value] = param.split('=');
							return `${key}=${encodeURIComponent(value)}`;
						})
						.join('&') :
						'';

					const finalEncodedUrl = baseUrl + '?' + encodedQueryString;

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

async function fetchNestedUrls(movieUrl, movieTitle) {
	try {
		const response = await axios.get(movieUrl);
		const $ = cheerio.load(response.data);

		const movie = {
			title: movieTitle,
			downloadUrls: {}
		};

		const nestedUrls = [];
		$('div.f').each((index, element) => {
			const title = $(element).find('a').text().trim();
			const relativeUrl = $(element).find('a').attr('href');
			const fullUrl = `https://isaidub9.com${relativeUrl}`;
			nestedUrls.push({
				title,
				url: fullUrl
			});
		});

		for (const {
				title,
				url
			}
			of nestedUrls) {
			const finalDownloadUrls = await fetchDownloadUrls(url);
			movie.downloadUrls = {
				...movie.downloadUrls,
				...finalDownloadUrls
			};
		}

		return movie;
	} catch (error) {
		console.error(`Error fetching nested URLs from ${movieUrl}:`, error);
		return {};
	}
}

async function getMovies(searchQuery, res, results) {
	try {
		const baseUrl = 'https://isaidub9.com/movie/tamil-dubbed-movies-download/';
		const totalPages = 145;
		const movies = [];

		for (let page = 1; page <= totalPages; page++) {
			const pageUrl = `${baseUrl}?get-page=${page}`;
			const response = await axios.get(pageUrl);
			const $ = cheerio.load(response.data);

			const movieLinks = [];
			$('.f').each((index, element) => {
				const title = $(element).find('a').text().trim();
				const relativeUrl = $(element).find('a').attr('href');
				const fullUrl = `https://isaidub9.com${relativeUrl}`;

				if (title.toLowerCase().includes(searchQuery.toLowerCase())) {
					movieLinks.push({
						title,
						fullUrl
					});
				}
			});

			for (const {
					title,
					fullUrl
				}
				of movieLinks) {
				const movie = await fetchNestedUrls(fullUrl, title);
				if (Object.keys(movie.downloadUrls).length > 0) {
					movies.push(movie);
				}

				if (movies.length >= results) break;
			}

			if (movies.length >= results) break;
		}

		const resultsArray = movies.slice(0, results);

		if (resultsArray.length > 0) {
			res.json({
				success: true,
				results: resultsArray
			});
		} else {
			res.status(404).json({
				success: false,
				message: 'No movies found'
			});
		}
	} catch (error) {
		console.error('Error fetching main page URLs:', error);
		res.status(500).json({
			success: false,
			message: 'Failed to fetch or parse data'
		});
	}
}

module.exports = {
	getMovies,
};