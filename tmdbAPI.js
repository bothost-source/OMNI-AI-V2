// ═══════════════════════════════════════════════════════════
// OMNI AI - TMDB API MODULE (Updated)
// Fetches latest movies with posters
// ═══════════════════════════════════════════════════════════

const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY || 'YOUR_TMDB_API_KEY_HERE';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

class TMDBAPI {
    constructor() {
        this.apiKey = TMDB_API_KEY;
    }

    getApiKey() {
        if (!this.apiKey || this.apiKey === 'YOUR_TMDB_API_KEY_HERE') {
            throw new Error('TMDB API key not configured. Set TMDB_API_KEY in .env');
        }
        return this.apiKey;
    }

    async makeRequest(endpoint, params = {}) {
        try {
            const response = await axios.get(`${BASE_URL}${endpoint}`, {
                params: {
                    api_key: this.getApiKey(),
                    language: 'en-US',
                    ...params
                },
                timeout: 30000
            });
            return response.data;
        } catch (err) {
            console.error('[TMDB] API Error:', err.message);
            throw err;
        }
    }

    /**
     * Get latest/now playing movies
     */
    async getLatestMovies(page = 1) {
        const data = await this.makeRequest('/movie/now_playing', { page });
        return (data.results || []).map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
            rating: movie.vote_average || 'N/A',
            overview: movie.overview || 'No description',
            posterUrl: movie.poster_path ? `${IMAGE_BASE}${movie.poster_path}` : null,
            backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : null,
            releaseDate: movie.release_date
        }));
    }

    /**
     * Get popular movies
     */
    async getPopularMovies(page = 1) {
        const data = await this.makeRequest('/movie/popular', { page });
        return (data.results || []).map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
            rating: movie.vote_average || 'N/A',
            overview: movie.overview || 'No description',
            posterUrl: movie.poster_path ? `${IMAGE_BASE}${movie.poster_path}` : null
        }));
    }

    /**
     * Get upcoming movies
     */
    async getUpcomingMovies(page = 1) {
        const data = await this.makeRequest('/movie/upcoming', { page });
        return (data.results || []).map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.split('-')[0] : 'TBA',
            rating: movie.vote_average || 'N/A',
            overview: movie.overview || 'No description',
            posterUrl: movie.poster_path ? `${IMAGE_BASE}${movie.poster_path}` : null,
            releaseDate: movie.release_date
        }));
    }

    /**
     * Search movies
     */
    async searchMovies(query, page = 1) {
        const data = await this.makeRequest('/search/movie', { query, page });
        return (data.results || []).map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.split('-')[0] : 'N/A',
            rating: movie.vote_average || 'N/A',
            overview: movie.overview || 'No description',
            posterUrl: movie.poster_path ? `${IMAGE_BASE}${movie.poster_path}` : null
        }));
    }

    /**
     * Get movie details by ID
     */
    async getMovieDetails(movieId) {
        const data = await this.makeRequest(`/movie/${movieId}`);
        return {
            id: data.id,
            title: data.title,
            year: data.release_date ? data.release_date.split('-')[0] : 'N/A',
            rating: data.vote_average,
            overview: data.overview,
            posterUrl: data.poster_path ? `${IMAGE_BASE}${data.poster_path}` : null,
            genres: data.genres ? data.genres.map(g => g.name).join(', ') : 'N/A',
            runtime: data.runtime ? `${data.runtime} min` : 'N/A',
            tagline: data.tagline || ''
        };
    }
}

module.exports = new TMDBAPI();
