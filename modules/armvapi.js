const axios = require('axios');

// Function to fetch real download URL and file size
async function getRealDownloadUrl(movieName) {
  try {
    const response = await axios.get(`https://file9.arabdullah.top/api/request-movie/${encodeURIComponent(movieName)}`);
    const { name, url, expiresIn } = response.data;
    const downloadUrl = `https://file9.arabdullah.top${url}`;

    // Fetch the file size via a HEAD request
    const headResponse = await axios.head(downloadUrl);
    const fileSizeInBytes = parseInt(headResponse.headers['content-length'], 10);

    // Convert file size to GB
    const fileSizeInGB = (fileSizeInBytes / (1024 * 1024 * 1024)).toFixed(2); // 2 decimal places for GB

    return {
      name,
      url: downloadUrl,
      expiresIn,
      fileSizeGB: fileSizeInGB // Add file size to the result
    };
  } catch (error) {
    console.error(`Error fetching real download URL for ${movieName}:`, error);
    return null;
  }
}

// Function to fetch search results from the movie search API
async function getMovies(searchQuery, res, results = 3) {
  try {
    const searchResponse = await axios.get(`https://file9.arabdullah.top/api/movies?search=${encodeURIComponent(searchQuery)}`);
    const movies = searchResponse.data;
    
    const movieResults = [];

    // Iterate over the search results and fetch real download URLs
    for (let i = 0; i < Math.min(results, movies.length); i++) {
      const movie = movies[i];
      const realDownload = await getRealDownloadUrl(movie.name);

      if (realDownload) {
        movieResults.push({
          name: realDownload.name,
          quality: movie.quality,
          downloadUrl: realDownload.url,
          fileSizeGB: realDownload.fileSizeGB // Include file size in the result
        });
      }
    }

    // Limit the number of results returned to the requested number
    const resultsArray = movieResults.slice(0, results);

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
    console.error('Error fetching movies:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching movies'
    });
  }
}

module.exports = {
  getMovies
};
