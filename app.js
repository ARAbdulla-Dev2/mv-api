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

const saveUserData = (data) => {
    if (!data || typeof data !== 'object' || !Array.isArray(data.users)) {
        console.error("Expected 'data.users' to be an array, but got:", data);
        return;
    }
    fs.writeFileSync('./data/data.json', JSON.stringify(data, null, 2));
};

server.get('/api', async (req, res) => {
    const { mv, mvScrape, apiKey, query, results , lang } = req.query;
    const searchQuery = query || null;

    const data = loadUserData();

    const users = data.users; // Ensure you access the `users` array
    if (!Array.isArray(users)) {
        console.error('Expected "users" to be an array, but got:', typeof users, users);
        return res.status(500).json({
            success: false,
            message: 'Data structure error'
        });
    }

    const user = users.find(user => user.apikey === apiKey);
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
        saveUserData({ users });
    }

    if (mv === 'true') {
        try {
            let scraper;

            // Select scraper based on the `mvScrape` parameter
            if (mvScrape === 'isaidub') {
                if (!lang) {
                    return res.status(403).json({
                        success: false,
                        message: 'Language is Required'
                    });
                }

                const module = lang === 'en' ? './modules/isaidub' : './modules/isaidubta';
                scraper = require(module);
            } else if (mvScrape === 'armvapi') {
                scraper = require('./modules/armvapi');
            } else {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid scraper specified'
                });
            }

            // Call the `getMovies` method from the scraper
            scraper.getMovies(searchQuery, res, results);
        } catch (error) {
            console.error('Error loading scraper module:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
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
