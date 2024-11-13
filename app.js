const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const server = express();
const PORT = 80;
const API = 'db04REEwRFfiYvlQ6R1Ne6qg6SeF09vE';

// Endpoint to scrape and find working download links
server.get('/api', async (req, res) => {
    const { mv, mvScrape, apiKey, query, results, lang } = req.query;
    const searchQuery = query || null;

    if (mv === 'true' && mvScrape === 'csco' && apiKey === API) {
        const csco = require('./modules/csco');
        csco.getMovies(searchQuery, res, results);
    } else if (mv === 'true' && mvScrape === 'vegamv' && apiKey === API) {
        const vegamv = require('./modules/vegamv');
        vegamv.getMovies(searchQuery, res, results);
    } else if (mv === 'true' && mvScrape === 'isaidub' && apiKey === API){

        if (!lang){
            res.status(403).json({ success: false, message: 'Language is Required'})
        } else if (lang === 'en') {
        const isaidub = require('./modules/isaidub');
        isaidub.getMovies(searchQuery, res, results);
        }
    }
     else {
        res.status(403).json({ success: false, message: 'Not Authenticated' });
    }
});

server.listen(PORT, () => {
    console.log(`SERVER IS RUNNING ON PORT ${PORT}`);
});
