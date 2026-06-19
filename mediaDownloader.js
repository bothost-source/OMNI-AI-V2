// ═══════════════════════════════════════════════════════════
// OMNI AI - MEDIA DOWNLOADER
// Movie/music with images, voice notes (OGG Opus), scraping
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const axios = require('axios');
const tmdbAPI = require('./tmdbAPI');

const TEMP_DIR = './temp/';

class MediaDownloader {
    constructor() {
        this.tempDir = TEMP_DIR;
        this.ensureTempDir();
    }

    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Search and download movie/music with image
     */
    async searchAndDownload(query, type) {
        try {
            const timestamp = Date.now();

            let result = {
                caption: '',
                imageUrl: null,
                mediaPath: null,
                fileName: '',
                mimeType: ''
            };

            if (type === 'movie' || type === 'download') {
                // Search TMDB for movie info and poster
                const movies = await tmdbAPI.searchMovies(query);

                if (movies.length === 0) {
                    throw new Error('Movie not found');
                }

                const movie = movies[0];

                result.caption = `🎬 *${movie.title}* (${movie.year})\n\n` +
                                `⭐ Rating: ${movie.rating}/10\n` +
                                `📝 ${movie.overview}\n\n` +
                                `📥 Searching for download...`;
                result.imageUrl = movie.posterUrl;
                result.fileName = `${movie.title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
                result.mimeType = 'video/mp4';

            } else if (type === 'music' || type === 'song') {
                // For music, try to get album art from a music API
                result.caption = `🎵 *${query}*\n\n` +
                                `📥 Searching for download...`;
                result.fileName = `${query.replace(/[^a-z0-9]/gi, '_')}.mp3`;
                result.mimeType = 'audio/mpeg';

                // Try to get album art from iTunes
                try {
                    const itunesRes = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&limit=1`, { timeout: 10000 });
                    if (itunesRes.data?.results?.[0]?.artworkUrl100) {
                        result.imageUrl = itunesRes.data.results[0].artworkUrl100.replace('100x100', '600x600');
                    }
                } catch (e) {
                    // Ignore iTunes errors
                }
            }

            return result;

        } catch (err) {
            throw new Error(`Download failed: ${err.message}`);
        }
    }

    /**
     * Scrape website
     */
    async scrapeWebsite(url) {
        try {
            const { stdout } = await execPromise(`curl -s -L --max-time 30 "${url}" | head -c 5000`, {
                timeout: 35000
            });

            const titleMatch = stdout.match(/<title[^>]*>([^<]*)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : 'No title found';

            const descMatch = stdout.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
            const description = descMatch ? descMatch[1].trim() : 'No description found';

            const links = [];
            const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi;
            let match;
            while ((match = linkRegex.exec(stdout)) !== null && links.length < 10) {
                links.push({ url: match[1], text: match[2].trim() });
            }

            let result = `📌 *Title:* ${title}\n\n`;
            result += `📝 *Description:* ${description}\n\n`;
            result += `🔗 *Links found:* ${links.length}\n`;
            links.forEach((link, i) => {
                result += `${i + 1}. ${link.text || 'No text'} -> ${link.url}\n`;
            });

            return result;

        } catch (err) {
            throw new Error(`Scrape failed: ${err.message}`);
        }
    }

    /**
     * Text to voice - FIXED: OGG Opus format for WhatsApp
     */
    async textToVoice(text) {
        try {
            const timestamp = Date.now();
            const outputPath = path.join(this.tempDir, `voice_${timestamp}.ogg`);

            // Use Google TTS to get audio
            const chunks = this.splitTtsText(text, 180);
            const buffers = [];

            for (const chunk of chunks) {
                const { data } = await axios.get(
                    `https://translate.google.com/translate_tts`,
                    {
                        params: { 
                            ie: 'UTF-8', 
                            client: 'tw-ob', 
                            tl: 'en', 
                            q: chunk,
                            ttsspeed: 1
                        },
                        responseType: 'arraybuffer',
                        timeout: 30000,
                        headers: { 
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': 'https://translate.google.com/'
                        }
                    }
                );
                buffers.push(Buffer.from(data));
            }

            const combined = Buffer.concat(buffers);

            // Save as MP3 first, then convert to OGG Opus
            const mp3Path = path.join(this.tempDir, `voice_${timestamp}.mp3`);
            fs.writeFileSync(mp3Path, combined);

            // Convert to OGG Opus using ffmpeg
            try {
                await execPromise(`ffmpeg -i "${mp3Path}" -c:a libopus -b:a 128k -ar 48000 -ac 1 "${outputPath}" -y`, {
                    timeout: 30000
                });
                // Clean up MP3
                if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
            } catch (ffmpegErr) {
                // If ffmpeg fails, use the MP3 but rename to ogg (fallback)
                console.warn('[VOICE] ffmpeg not available, using MP3 fallback:', ffmpegErr.message);
                fs.renameSync(mp3Path, outputPath);
            }

            // Get duration
            let duration = 0;
            try {
                const { stdout } = await execPromise(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${outputPath}"`, {
                    timeout: 10000
                });
                duration = parseFloat(stdout.trim()) || 0;
            } catch (e) {
                // Estimate duration
                duration = Math.ceil(text.length / 15);
            }

            return {
                path: outputPath,
                duration: Math.round(duration)
            };

        } catch (err) {
            console.error('[VOICE] Error:', err);
            throw new Error(`Voice generation failed: ${err.message}`);
        }
    }

    /**
     * Split text for TTS
     */
    splitTtsText(text, max = 180) {
        const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
        const chunks = [];
        let current = '';
        for (const word of words) {
            if (`${current} ${word}`.trim().length > max && current) {
                chunks.push(current);
                current = word;
            } else {
                current = `${current} ${word}`.trim();
            }
        }
        if (current) chunks.push(current);
        return chunks.slice(0, 3);
    }
}

module.exports = new MediaDownloader();
