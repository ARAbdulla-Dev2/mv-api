const express = require('express');
const fs = require('fs');
const server = express();
const PORT = 80;

// Load user data from the data.json file
const loadUserData = () => {
    const data = fs.readFileSync('./data/data.json', 'utf8');
    return JSON.parse(data); // Ensure it's parsing the data as JSON
};

// Save user data back to data.json after modification
const saveUserData = (users) => {
    fs.writeFileSync('./data/data.json', JSON.stringify({ users }, null, 2));
};

// Endpoint to scrape and find working download links
server.get('/api', async (req, res) => {
    const { mv, mvScrape, apiKey, query, results, lang } = req.query;
    const searchQuery = query || null;

    // Load user data from the file
    const users = loadUserData();
    
    // Debugging output
    console.log(users); // Check if it's the correct structure
    console.log(users.users); // Check if users.users is an array

    // Find the user with the provided apiKey
    const user = users.users ? users.users.find(user => user.apikey === apiKey) : null;

    // If no user is found, respond with an authentication error
    if (!user) {
        return res.status(403).json({ success: false, message: 'Not Authenticated' });
    }

    // Check if the user has a limit and if they have remaining requests
    if (user.limit !== 'unlimited' && user.limit <= 0) {
        return res.status(403).json({ success: false, message: 'API limit reached' });
    }

    // If the user has a limit, reduce it by 1
    if (user.limit !== 'unlimited') {
        user.limit -= 1;
        saveUserData(users); // Save updated data back to the file
    }

    // Proceed with the movie search if authenticated and limit check passes
    if (mv === 'true' && mvScrape === 'csco') {
        const csco = require('./modules/csco');
        csco.getMovies(searchQuery, res, results);
    } else if (mv === 'true' && mvScrape === 'vegamv') {
        const vegamv = require('./modules/vegamv');
        vegamv.getMovies(searchQuery, res, results);
    } else if (mv === 'true' && mvScrape === 'isaidub') {
        if (!lang) {
            return res.status(403).json({ success: false, message: 'Language is Required' });
        } else if (lang === 'en') {
            const isaidub = require('./modules/isaidub');
            isaidub.getMovies(searchQuery, res, results);
        }
    } else {
        return res.status(403).json({ success: false, message: 'Invalid parameters' });
    }
});

server.listen(PORT, () => {
    console.log(`SERVER IS RUNNING ON PORT ${PORT}`);
});
