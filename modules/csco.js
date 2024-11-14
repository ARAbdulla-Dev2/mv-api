const axios = require('axios');
const cheerio = require('cheerio');

const generateDownloadUrls = (title, year) => {
	const baseUrls = [
		"https://ima04.cskinglk.xyz/server4/new",
		"https://ima04.cskinglk.xyz/server4/tnganuwpxppzfymytsqr/012024",
		"https://ima04.cskinglk.xyz/server1/qmsyfzbjcavekxfuwqbi/Movies/2022-03-12",
		"https://ima04.cskinglk.xyz/server2/lirrndwmwxoicpzwhmqg/CSMovies",
		"https://ima04.cskinglk.xyz/server3/lyppijeepgwshlzadesu/31Movies",
		"https://ima04.cskinglk.xyz/server4/tnganuwpxppzfymytsqr/012024",
		"https://ima04.cskinglk.xyz/server1/qmsyfzbjcavekxfuwqbi/Movies/2021-09-20",
		"https://ima04.cskinglk.xyz/server2/lirrndwmwxoicpzwhmqg/CSMovies"
	];

	const formattedTitleDash = title.replace(/\s+/g, "-");
	const formattedTitleDot = title.replace(/\s+/g, ".");
	const possibleUrls = [];

	baseUrls.forEach(baseUrl => {
		possibleUrls.push(`${baseUrl}/${formattedTitleDash}%20(${year})%20BluRay-[CineSubz.co]-480p?ext=mp4`);
		possibleUrls.push(`${baseUrl}/${formattedTitleDot}.${year}.WEBRip-[CineSubz.co]-480p?ext=mp4`);
		possibleUrls.push(`${baseUrl}/${formattedTitleDot}.${year}.BluRay-[CineSubz.co]-480p?ext=mp4`);
		possibleUrls.push(`${baseUrl}/${formattedTitleDot}.${year}.BluRay-[CineSubz.com]-480p?ext=mp4`);
		possibleUrls.push(`${baseUrl}/${formattedTitleDot}.${year}.BrRip-480P?ext=mkv`);
		possibleUrls.push(`${baseUrl}/CineSubz.com%20-${formattedTitleDot}.${year}.480p?ext=mp4`);
	});

	return possibleUrls;
};

const checkUrl = async (url) => {
	try {
		const response = await axios.get(url);
		const $ = cheerio.load(response.data);

		if ($('h3').text().includes("මෙම ගැටලුව") || $('p').text().includes("File Not Found")) {
			return false;
		}
		return true;
	} catch (error) {
		return false;
	}
};

const getMegaDownloadLink480p = async (moviePageUrl) => {
	try {
		const response = await axios.get(moviePageUrl);
		const $ = cheerio.load(response.data);

		let megaLink = "";

		$('#dl-links a.mega-download').each((i, element) => {
			const linkElement = $(element);
			megaLink = linkElement.attr('href');
			return false;
		});

		return megaLink || "No Mega link found";
	} catch (error) {
		console.error("Error fetching Mega download link:", error);
		return "Error fetching Mega link";
	}
};

async function getMovies(searchQuery, res, results) {
	try {
		const response = await axios.get(`https://cinesubz.co/?s=${searchQuery}`);
		const html = response.data;

		const $ = cheerio.load(html);
		const resultsArray = [];

		const tasks = $('.result-item .title a').map(async (i, el) => {
			if (i >= results) return;

			const movieUrl = $(el).attr('href');
			const fullTitle = $(el).text().trim();

			const titleMatch = fullTitle.match(/^(.*?)(\(\d{4}\))/);
			if (titleMatch) {
				const title = titleMatch[1].trim();
				const year = titleMatch[2].replace(/[()]/g, "");

				if (!movieUrl.includes('tv')) {
					const downloadUrls = generateDownloadUrls(title, year);
					let workingUrl = null;

					for (const url of downloadUrls) {
						const isValid = await checkUrl(url);
						if (isValid) {
							workingUrl = url;
							break;
						}
					}

					let mega480pLink;

					if (workingUrl && workingUrl !== null) {
						mega480pLink = await getMegaDownloadLink480p(workingUrl);

						resultsArray.push({
							movieUrl,
							title,
							year,
							downloadPageUrl: workingUrl || "No working link found",
							downloadLinks: {
								mega: {
									"480p": mega480pLink || "No 480p Mega link found"
								}
							}
						});
					}
				}
			}
		}).get();

		await Promise.all(tasks);

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
		console.error(error);
		res.status(500).json({
			success: false,
			message: 'Error fetching data'
		});
	}
}

module.exports = {
	getMovies
}