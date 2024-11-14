const express = require('express');
const fs = require('fs');
const axios = require('axios');

const server = express();
const PORT = 80;

server.use(express.static('public'));

const loadUserData = () => {
	const data = fs.readFileSync('./data/data.json', 'utf8');
	const parsedData = JSON.parse(data);
	return parsedData;
};

const saveUserData = (users) => {
	if (!Array.isArray(users)) {
		console.error("Expected 'users' to be an array, but got", users);
		return;
	}
	fs.writeFileSync('./data/data.json', JSON.stringify({
		users
	}, null, 2));
};

server.get('/api', async (req, res) => {
	const {
		mv,
		mvScrape,
		apiKey,
		query,
		results,
		lang
	} = req.query;
	const searchQuery = query || null;

	const users = loadUserData();

	if (!Array.isArray(users.users)) {
		return res.status(500).json({
			success: false,
			message: 'Data structure error'
		});
	}

	const user = users.users.find(user => user.apikey === apiKey);

	if (!user) {
		return res.status(403).json({
			success: false,
			message: 'Not Authenticated'
		});
	}

	if (user.limit !== 'unlimited' && user.limit <= 0) {
		return res.status(403).json({
			success: false,
			message: 'API limit reached'
		});
	}

	if (user.limit !== 'unlimited') {
		user.limit -= 1;
		saveUserData(users);
	}

	if (mv === 'true' && mvScrape === 'csco') {
		const csco = require('./modules/csco');
		csco.getMovies(searchQuery, res, results);
	} else if (mv === 'true' && mvScrape === 'vegamv') {
		const vegamv = require('./modules/vegamv');
		vegamv.getMovies(searchQuery, res, results);
	} else if (mv === 'true' && mvScrape === 'isaidub') {
		if (!lang) {
			return res.status(403).json({
				success: false,
				message: 'Language is Required'
			});
		} else if (lang === 'en') {
			const isaidub = require('./modules/isaidub');
			isaidub.getMovies(searchQuery, res, results);
		} else if (lang === 'ta') {
			const isaidubta = require('./modules/isaidubta');
			isaidubta.getMovies(searchQuery, res, results);
		}
	} else {
		return res.status(403).json({
			success: false,
			message: 'Invalid parameters'
		});
	}
});

server.listen(PORT, () => {
	console.log(`SERVER IS RUNNING ON PORT ${PORT}`);
});