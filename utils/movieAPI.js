const axios = require('axios');
const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);

const BASE_URL = 'https://omegatech-api.dixonomega.tech/api/movie';

// Search movies/TV shows
async function searchMovies(query, limit = 5) {
  try {
    const { data } = await axios.get(`${BASE_URL}/Movieku`, {
      params: { action: 'search', query, limit, detail: true },
      timeout: 30000,
      validateStatus: () => true
    });
    
    if (!data.success || !data.results) {
      return { success: false, error: data.message || 'No results found' };
    }
    
    return {
      success: true,
      source: data.source || 'Omegatech',
      query: data.query,
      count: data.count,
      results: data.results.map(r => ({
        id: r.id,
        type: r.title?.toLowerCase().includes('series') || r.title?.toLowerCase().includes('episode') ? 'tv' : 'movie',
        title: r.title?.replace(/^Nonton\s+(Movie\s+|Series\s+)?/i, '').replace(/\s+Subtitle Indonesia.*$/i, '').trim(),
        year: r.release?.split('-')?.[0] || r.release?.match(/\d{4}/)?.[0],
        synopsis: r.synopsis,
        rating: parseFloat(r.score) || 0,
        duration: r.duration,
        director: r.director,
        country: r.country,
        quality: r.quality,
        poster: r.poster,
        thumbnail: r.thumbnail,
        url: r.url,
        downloads: r.downloads || {}
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get movie details (same as search since detail=true returns everything)
async function getMovieDetails(id, type = 'movie') {
  try {
    const { data } = await axios.get(`${BASE_URL}/Movieku`, {
      params: { action: 'search', query: id.toString(), limit: 1, detail: true },
      timeout: 30000,
      validateStatus: () => true
    });
    
    if (!data.success || !data.results?.length) return null;
    
    const r = data.results[0];
    return {
      id: r.id,
      type: r.title?.toLowerCase().includes('series') || r.title?.toLowerCase().includes('episode') ? 'tv' : 'movie',
      title: r.title?.replace(/^Nonton\s+(Movie\s+|Series\s+)?/i, '').replace(/\s+Subtitle Indonesia.*$/i, '').trim(),
      year: r.release?.split('-')?.[0] || r.release?.match(/\d{4}/)?.[0],
      synopsis: r.synopsis,
      rating: parseFloat(r.score) || 0,
      duration: r.duration,
      director: r.director,
      country: r.country,
      quality: r.quality,
      poster: r.poster,
      thumbnail: r.thumbnail,
      url: r.url,
      downloads: r.downloads || {}
    };
  } catch (error) {
    console.error('Movie details error:', error.message);
    return null;
  }
}

// Format download links from Movieku API
function formatDownloadLinks(movie) {
  if (!movie?.downloads || Object.keys(movie.downloads).length === 0) {
    return '❌ No download links available.';
  }
  
  let text = `📥 *Download Links for ${movie.title}*\n\n`;
  
  for (const [quality, sources] of Object.entries(movie.downloads)) {
    text += `*${quality}:*\n`;
    for (const [name, url] of Object.entries(sources)) {
      text += `• ${name}: ${url}\n`;
    }
    text += `\n`;
  }
  
  return text;
}

// Format search results for WhatsApp
function formatSearchResults(results, max = 5) {
  if (!results?.length) return '❌ No movies found.';
  
  let text = `🎬 *Search Results* (${results.length} found)\n\n`;
  
  results.slice(0, max).forEach((movie, i) => {
    const type = movie.type === 'tv' ? '📺 TV' : '🎬 Movie';
    const rating = movie.rating ? `⭐ ${movie.rating.toFixed(1)}` : '';
    const year = movie.year ? `(${movie.year})` : '';
    const quality = movie.quality ? `[${movie.quality}]` : '';
    
    text += `${i + 1}. ${type} *${movie.title}* ${year} ${rating} ${quality}\n`;
    if (movie.synopsis) {
      text += `   _${movie.synopsis.slice(0, 60)}..._\n`;
    }
    text += `\n`;
  });
  
  text += `Reply with a number to get download links!`;
  return text;
}

// Format movie details for WhatsApp
function formatMovieDetails(movie) {
  if (!movie) return '❌ Movie not found.';
  
  const type = movie.type === 'tv' ? '📺 TV Series' : '🎬 Movie';
  const rating = movie.rating ? `⭐ ${movie.rating.toFixed(1)}/10` : '';
  const year = movie.year ? `📅 ${movie.year}` : '';
  const quality = movie.quality ? `🎞️ ${movie.quality}` : '';
  const duration = movie.duration ? `⏱️ ${movie.duration}` : '';
  
  let text = `${type}: *${movie.title}*\n`;
  text += `${rating} ${year} ${quality} ${duration}\n\n`;
  
  if (movie.synopsis) {
    text += `📝 ${movie.synopsis.slice(0, 300)}\n\n`;
  }
  
  return text;
}

// Get flag emoji
function getFlagEmoji(countryCode) {
  const flags = {
    'GB': '🇬🇧', 'US': '🇺🇸', 'IN': '🇮🇳', 'FR': '🇫🇷', 'ES': '🇪🇸',
    'PT': '🇵🇹', 'DE': '🇩🇪', 'IT': '🇮🇹', 'JP': '🇯🇵', 'TR': '🇹🇷',
    'RU': '🇷🇺', 'BR': '🇧🇷', 'SA': '🇸🇦', 'AU': '🇦🇺', 'CA': '🇨🇦',
    'KR': '🇰🇷', 'MX': '🇲🇽', 'NL': '🇳🇱', 'ID': '🇮🇩', 'USA': '🇺🇸'
  };
  return flags[countryCode] || '🌐';
}

module.exports = {
  searchMovies,
  getMovieDetails,
  formatSearchResults,
  formatMovieDetails,
  formatDownloadLinks,
  getFlagEmoji
};
