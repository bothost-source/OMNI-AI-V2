// ═══════════════════════════════════════════════════════════
// OMNI AI - COMMAND HANDLER
// Processes all commands with security checks
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const { CONFIG } = require('./config');
const security = require('./security');
const stickerHandler = require('./stickerHandler');
const mediaDownloader = require('./mediaDownloader');
const tmdbAPI = require('./tmdbAPI');
const fileUploader = require('./fileUploader');
const codeFormatter = require('./codeFormatter');

class CommandHandler {
    constructor() {
        this.activeOperations = new Map(); // Track ongoing operations for clean editing
    }

    /**
     * Main command processor
     */
    async processCommand(sock, message, text, userId) {
        const cleanText = text.trim().toLowerCase();
        const chatId = message.key.remoteJid;

        // 1. Check for jailbreak attempts FIRST
        const jailbreak = security.detectJailbreak(text);
        if (jailbreak.detected) {
            security.logEvent(userId, 'JAILBREAK_ATTEMPT', { text: text.substring(0, 100) });
            return await this.sendCleanMessage(sock, chatId, jailbreak.response, message);
        }

        // 2. Check for sensitive file access
        const sensitive = security.checkSensitiveAccess(text);
        if (sensitive.blocked) {
            security.logEvent(userId, 'SENSITIVE_ACCESS_ATTEMPT', { text: text.substring(0, 100) });
            return await this.sendCleanMessage(sock, chatId, sensitive.response, message);
        }

        // 3. Handle sticker messages (non-text) - REPLY WITH RANDOM STICKER
        if (message.message?.stickerMessage) {
            return await stickerHandler.handleStickerReply(sock, message, userId);
        }

        // 4. Route text commands
        if (cleanText.startsWith('omni ')) {
            const command = cleanText.replace('omni ', '').trim();
            return await this.handleOmniCommand(sock, message, command, text, userId, chatId);
        }

        if (cleanText.startsWith('auth ')) {
            return await this.handleAuth(sock, message, text, userId, chatId);
        }

        if (cleanText === 'menu' || cleanText === 'help') {
            return await this.showMenu(sock, message, userId, chatId);
        }

        // Default: AI conversation
        return await this.handleAIChat(sock, message, text, userId, chatId);
    }

    /**
     * Handle "omni" prefixed commands
     */
    async handleOmniCommand(sock, message, command, fullText, userId, chatId) {
        const args = command.split(' ');
        const cmd = args[0];
        const rest = args.slice(1).join(' ');

        switch (cmd) {
            case 'run':
            case 'shell':
            case 'exec':
                return await this.handleRun(sock, message, rest, userId, chatId);

            case 'ls':
            case 'list':
            case 'dir':
                return await this.handleList(sock, message, userId, chatId);

            case 'cat':
            case 'read':
            case 'file':
                return await this.handleRead(sock, message, rest, userId, chatId);

            case 'download':
            case 'movie':
            case 'music':
            case 'song':
                return await this.handleDownload(sock, message, rest, userId, chatId, cmd);

            case 'scrape':
            case 'site':
            case 'web':
                return await this.handleScrape(sock, message, rest, userId, chatId);

            case 'upload':
            case 'save':
                return await this.handleUpload(sock, message, rest, userId, chatId);

            case 'learn':
            case 'remember':
            case 'saveinfo':
                return await this.handleLearn(sock, message, rest, userId, chatId);

            case 'voice':
            case 'say':
            case 'tts':
                return await this.handleVoice(sock, message, rest, userId, chatId);

            case 'movies':
            case 'latest':
            case 'tmdb':
                return await this.handleMovies(sock, message, rest, userId, chatId);

            case 'code':
            case 'js':
            case 'py':
                return await this.handleCode(sock, message, rest, userId, chatId, cmd);

            case 'sticker':
            case 'stickers':
                return await this.handleStickerInfo(sock, message, userId, chatId);

            default:
                return await this.sendCleanMessage(sock, chatId, 
                    `❓ *Unknown command: ${cmd}*\n\n` +
                    `📝 Use *menu* to see all available commands.`, message);
        }
    }

    /**
     * Handle authentication
     */
    async handleAuth(sock, message, text, userId, chatId) {
        const passcode = text.replace(/auth /i, '').trim();
        const result = security.authenticate(userId, passcode);

        if (result.success) {
            security.logEvent(userId, 'AUTH_SUCCESS');
        } else {
            security.logEvent(userId, 'AUTH_FAILED');
        }

        return await this.sendCleanMessage(sock, chatId, result.success ? result.message : result.error, message);
    }

    /**
     * Handle run/shell commands - OWNER ONLY + AUTH REQUIRED
     */
    async handleRun(sock, message, command, userId, chatId) {
        const auth = security.requireOwner(userId, 'run/shell');
        if (!auth.allowed) {
            return await this.sendCleanMessage(sock, chatId, auth.response, message);
        }

        // Double-check for dangerous commands
        const jailbreak = security.detectJailbreak(`omni run ${command}`);
        if (jailbreak.detected) {
            return await this.sendCleanMessage(sock, chatId, jailbreak.response, message);
        }

        // Send initial status
        const statusMsg = await this.sendCleanMessage(sock, chatId, 
            `⏳ *Executing command...*\n\n` +
            `📌 *Command:* \`\`\`${command}\`\`\`\n` +
            `🛡️ *User:* Owner\n` +
            `⏱️ Please wait...`, message);

        try {
            // Execute with timeout and restricted environment
            const { stdout, stderr } = await execPromise(command, {
                timeout: 30000,
                maxBuffer: 1024 * 1024, // 1MB output limit
                cwd: process.cwd(),
                env: { PATH: process.env.PATH } // Minimal env
            });

            const output = stdout || stderr || '✅ Command executed successfully (no output)';

            // Truncate if too long
            const truncated = output.length > 3000 
                ? output.substring(0, 3000) + '\n\n... [Output truncated - too long]' 
                : output;

            return await this.editMessage(sock, chatId, statusMsg.key, 
                `✅ *Command Executed*\n\n` +
                `📌 *Command:* \`\`\`${command}\`\`\`\n\n` +
                `📤 *Output:*\n\`\`\`\n${truncated}\n\`\`\``);

        } catch (err) {
            return await this.editMessage(sock, chatId, statusMsg.key, 
                `❌ *Command Failed*\n\n` +
                `📌 *Command:* \`\`\`${command}\`\`\`\n\n` +
                `⚠️ *Error:* ${err.message}`);
        }
    }

    /**
     * Handle ls/list - Lists files but NEVER sends them
     */
    async handleList(sock, message, userId, chatId) {
        // Public command - anyone can list files (names only, no content)
        try {
            const files = fs.readdirSync(process.cwd());
            const fileList = files.map(f => {
                const stats = fs.statSync(path.join(process.cwd(), f));
                const icon = stats.isDirectory() ? '📁' : '📄';
                const size = stats.isFile() ? ` (${(stats.size / 1024).toFixed(1)} KB)` : '';
                return `${icon} ${f}${size}`;
            }).join('\n');

            return await this.sendCleanMessage(sock, chatId, 
                `📂 *Directory Listing*\n\n` +
                `${fileList}\n\n` +
                `📊 *Total:* ${files.length} items\n\n` +
                `⚠️ *Note:* File contents are protected.\n` +
                `🔒 Owner access required to read files.`, message);

        } catch (err) {
            return await this.sendCleanMessage(sock, chatId, 
                `❌ *Error listing files:* ${err.message}`, message);
        }
    }

    /**
     * Handle cat/read - OWNER ONLY + AUTH REQUIRED
     * NEVER sends sensitive files
     */
    async handleRead(sock, message, filename, userId, chatId) {
        const auth = security.requireOwner(userId, 'read file');
        if (!auth.allowed) {
            return await this.sendCleanMessage(sock, chatId, auth.response, message);
        }

        if (!filename) {
            return await this.sendCleanMessage(sock, chatId, 
                `📝 *Usage:* omni cat <filename>\n\n` +
                `📌 Example: omni cat readme.txt`, message);
        }

        // Check for sensitive paths
        const sensitive = security.checkSensitiveAccess(filename);
        if (sensitive.blocked) {
            security.logEvent(userId, 'SENSITIVE_READ_ATTEMPT', { filename });
            return await this.sendCleanMessage(sock, chatId, sensitive.response, message);
        }

        try {
            const filepath = path.join(process.cwd(), filename);

            // Security: prevent directory traversal
            if (!filepath.startsWith(process.cwd())) {
                throw new Error('Access denied: Path traversal detected');
            }

            if (!fs.existsSync(filepath)) {
                return await this.sendCleanMessage(sock, chatId, 
                    `❌ *File not found:* ${filename}\n\n` +
                    `📝 Use *omni ls* to list available files.`, message);
            }

            const stats = fs.statSync(filepath);
            if (stats.isDirectory()) {
                return await this.sendCleanMessage(sock, chatId, 
                    `📁 *${filename}* is a directory.\n\n` +
                    `📝 Use *omni ls* to list contents.`, message);
            }

            // Limit file size
            if (stats.size > 1024 * 1024) { // 1MB limit
                return await this.sendCleanMessage(sock, chatId, 
                    `⚠️ *File too large:* ${filename}\n` +
                    `📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n\n` +
                    `❌ Max allowed: 1 MB`, message);
            }

            const content = fs.readFileSync(filepath, 'utf8');

            // If it's code, format it properly
            const ext = path.extname(filename);
            if (['.js', '.py', '.json', '.html', '.css'].includes(ext)) {
                return await codeFormatter.sendCode(sock, chatId, content, filename, message);
            }

            return await this.sendCleanMessage(sock, chatId, 
                `📄 *${filename}*\n\n` +
                `\`\`\`\n${content}\n\`\`\``, message);

        } catch (err) {
            return await this.sendCleanMessage(sock, chatId, 
                `❌ *Error reading file:* ${err.message}`, message);
        }
    }

    /**
     * Handle movie/music downloads with images
     */
    async handleDownload(sock, message, query, userId, chatId, type) {
        if (!query) {
            return await this.sendCleanMessage(sock, chatId, 
                `📝 *Usage:* omni ${type} <search query>\n\n` +
                `📌 Example: omni movie Inception\n` +
                `📌 Example: omni music Blinding Lights`, message);
        }

        const statusMsg = await this.sendCleanMessage(sock, chatId, 
            `🔍 *Searching for ${type}...*\n\n` +
            `📌 Query: ${query}\n` +
            `⏳ Please wait...`, message);

        try {
            const result = await mediaDownloader.searchAndDownload(query, type);

            if (result.imageUrl) {
                // Send image with caption
                await sock.sendMessage(chatId, {
                    image: { url: result.imageUrl },
                    caption: result.caption
                });
                // Delete status message
                await sock.sendMessage(chatId, { delete: statusMsg.key });
            } else {
                await this.editMessage(sock, chatId, statusMsg.key, result.caption);
            }

            // Send media file if available
            if (result.mediaPath) {
                await sock.sendMessage(chatId, {
                    document: { url: result.mediaPath },
                    fileName: result.fileName,
                    mimetype: result.mimeType
                });
            }

        } catch (err) {
            await this.editMessage(sock, chatId, statusMsg.key, 
                `❌ *Download failed:* ${err.message}\n\n` +
                `📝 Try a different search term.`);
        }
    }

    /**
     * Handle website scraping
     */
    async handleScrape(sock, message, url, userId, chatId) {
        if (!url) {
            return await this.sendCleanMessage(sock, chatId, 
                `📝 *Usage:* omni scrape <url>\n\n` +
                `📌 Example: omni scrape https://example.com`, message);
        }

        const statusMsg = await this.sendCleanMessage(sock, chatId, 
            `🌐 *Scraping website...*\n\n` +
            `📌 URL: ${url}\n` +
            `⏳ Please wait...`, message);

        try {
            const result = await mediaDownloader.scrapeWebsite(url);

            await this.editMessage(sock, chatId, statusMsg.key, 
                `✅ *Scrape Complete*\n\n` +
                `📌 *URL:* ${url}\n\n` +
                `📊 *Results:*\n${result}`);

        } catch (err) {
            await this.editMessage(sock, chatId, statusMsg.key, 
                `❌ *Scrape failed:* ${err.message}`);
        }
    }

    /**
     * Handle file upload to server
     */
    async handleUpload(sock, message, filename, userId, chatId) {
        const auth = security.requireOwner(userId, 'upload file');
        if (!auth.allowed) {
            return await this.sendCleanMessage(sock, chatId, auth.response, message);
        }

        // Check if message has a document attached
        const document = message.message?.documentMessage || 
                        message.message?.imageMessage ||
                        message.message?.videoMessage;

        if (!document) {
            return await this.sendCleanMessage(sock, chatId, 
                `📝 *Usage:* Send a file with caption *omni upload [filename]*\n\n` +
                `📌 The file will be saved to the server directory.`, message);
        }

        const statusMsg = await this.sendCleanMessage(sock, chatId, 
            `📤 *Uploading file...*\n` +
            `⏳ Please wait...`, message);

        try {
            const result = await fileUploader.saveFile(sock, message, filename);

            await this.editMessage(sock, chatId, statusMsg.key, 
                `✅ *Upload Complete*\n\n` +
                `📌 *Filename:* ${result.filename}\n` +
                `📂 *Path:* ${result.path}\n` +
                `📊 *Size:* ${result.size}`);

        } catch (err) {
            await this.editMessage(sock, chatId, statusMsg.key, 
                `❌ *Upload failed:* ${err.message}`);
        }
    }

    /**
     * Handle learning/memory
     */
    async handleLearn(sock, message, info, userId, chatId) {
        if (!info) {
            return await this.sendCleanMessage(sock, chatId, 
                `📝 *Usage:* omni learn <information to remember>\n\n` +
                `📌 Example: omni learn My favorite color is blue`, message);
        }

        try {
            const result = await fileUploader.saveToMemory(userId, info);

            return await this.sendCleanMessage(sock, chatId, 
                `🧠 *Learning Complete*\n\n` +
                `✅ Saved: "${info}"\n\n` +
                `📊 Total memories: ${result.count}`, message);

        } catch (err) {
            return await this.sendCleanMessage(sock, chatId, 
                `❌ *Error saving memory:* ${err.message}`, message);
        }
    }

    /**
     * Handle voice notes - FIXED FORMAT for WhatsApp
     */
    async handleVoice(sock, message, text, userId, chatId) {
        if (!text) {
            return await this.sendCleanMessage(sock, chatId, 
                `📝 *Usage:* omni voice <text>\n\n` +
                `📌 Example: omni voice Hello, how are you?`, message);
        }

        const statusMsg = await this.sendCleanMessage(sock, chatId, 
            `🎙️ *Generating voice note...*\n` +
            `⏳ Please wait...`, message);

        try {
            const result = await mediaDownloader.textToVoice(text);

            // Send as proper WhatsApp voice note (PTT - Push To Talk)
            await sock.sendMessage(chatId, {
                audio: { url: result.path },
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true  // This makes it appear as a voice note
            });

            // Clean up temp file
            await this.editMessage(sock, chatId, statusMsg.key, 
                `✅ *Voice note sent!*\n\n` +
                `🎙️ Duration: ${result.duration}s`);

            // Delete temp file after sending
            setTimeout(() => {
                if (fs.existsSync(result.path)) fs.unlinkSync(result.path);
            }, 60000);

        } catch (err) {
            await this.editMessage(sock, chatId, statusMsg.key, 
                `❌ *Voice generation failed:* ${err.message}\n\n` +
                `⚠️ Make sure ffmpeg and espeak are installed.`);
        }
    }

    /**
     * Handle TMDB latest movies
     */
    async handleMovies(sock, message, query, userId, chatId) {
        const statusMsg = await this.sendCleanMessage(sock, chatId, 
            `🎬 *Fetching latest movies...*\n` +
            `⏳ Please wait...`, message);

        try {
            const movies = await tmdbAPI.getLatestMovies(query || 'popular');

            let response = `🎬 *Latest Movies*\n\n`;

            for (const movie of movies.slice(0, 5)) {
                response += `🎥 *${movie.title}* (${movie.year})\n`;
                response += `⭐ Rating: ${movie.rating}/10\n`;
                response += `📝 ${movie.overview.substring(0, 100)}...\n\n`;

                // Send movie poster if available
                if (movie.posterUrl) {
                    await sock.sendMessage(chatId, {
                        image: { url: movie.posterUrl },
                        caption: `🎥 *${movie.title}* (${movie.year})\n⭐ ${movie.rating}/10`
                    });
                }
            }

            await this.editMessage(sock, chatId, statusMsg.key, response);

        } catch (err) {
            await this.editMessage(sock, chatId, statusMsg.key, 
                `❌ *Failed to fetch movies:* ${err.message}\n\n` +
                `📝 Make sure TMDB API key is configured in config.js`);
        }
    }

    /**
     * Handle code sending with WhatsApp template format
     */
    async handleCode(sock, message, query, userId, chatId, type) {
        const auth = security.requireOwner(userId, 'code generation');
        if (!auth.allowed) {
            return await this.sendCleanMessage(sock, chatId, auth.response, message);
        }

        if (!query) {
            return await this.sendCleanMessage(sock, chatId, 
                `📝 *Usage:* omni ${type} <description>\n\n` +
                `📌 Example: omni js create a calculator`, message);
        }

        const statusMsg = await this.sendCleanMessage(sock, chatId, 
            `💻 *Generating ${type.toUpperCase()} code...*\n` +
            `⏳ Please wait...`, message);

        try {
            // This would integrate with AI for code generation
            // For now, sending template format
            const code = `// Generated ${type.toUpperCase()} code\n// Request: ${query}\n\n// Your code here...`;

            await codeFormatter.sendCode(sock, chatId, code, `generated.${type === 'js' ? 'js' : 'py'}`, message);

            await this.editMessage(sock, chatId, statusMsg.key, 
                `✅ *Code generated and sent!*\n\n` +
                `📌 Format: WhatsApp template\n` +
                `💾 File: generated.${type === 'js' ? 'js' : 'py'}`);

        } catch (err) {
            await this.editMessage(sock, chatId, statusMsg.key, 
                `❌ *Code generation failed:* ${err.message}`);
        }
    }

    /**
     * Handle sticker info
     */
    async handleStickerInfo(sock, message, userId, chatId) {
        const count = stickerHandler.getStickerCount();
        const isOwner = security.isOwner(userId);

        let info = `🎨 *Sticker Pack Info*\n\n`;
        info += `📊 *Saved stickers:* ${count}\n`;
        info += `📂 *Directory:* ${CONFIG.STICKERS.STICKER_PACK_PATH}\n\n`;
        info += `📝 *How it works:*\n`;
        info += `1. Send any sticker to this number\n`;
        info += `2. I save it automatically\n`;
        info += `3. When you send a sticker, I reply with a random one!\n\n`;

        if (isOwner) {
            info += `🔐 *Owner Commands:*\n`;
            info += `• Send sticker to save it\n`;
            info += `• Sticker replies are automatic\n`;
        }

        return await this.sendCleanMessage(sock, chatId, info, message);
    }

    /**
     * Show menu - Hides owner commands from public
     */
    async showMenu(sock, message, userId, chatId) {
        const isOwner = security.isOwner(userId);
        const isAuth = security.isAuthenticated(userId);

        let menu = `🤖 *OMNI AI - COMMAND MENU*\n\n`;

        // Public commands
        menu += `📌 *GENERAL COMMANDS*\n`;
        menu += `• *menu* - Show this menu\n`;
        menu += `• *help* - Get help\n`;
        menu += `• *omni ls* - List files (names only)\n`;
        menu += `• *omni sticker* - Sticker pack info\n\n`;

        menu += `🎬 *MEDIA COMMANDS*\n`;
        menu += `• *omni movie <name>* - Download movie with poster\n`;
        menu += `• *omni music <name>* - Download music with cover\n`;
        menu += `• *omni movies* - Latest movies from TMDB\n`;
        menu += `• *omni voice <text>* - Text to voice note\n\n`;

        menu += `🌐 *WEB COMMANDS*\n`;
        menu += `• *omni scrape <url>* - Scrape website\n\n`;

        menu += `🧠 *AI COMMANDS*\n`;
        menu += `• *omni learn <text>* - Teach me something\n`;
        menu += `• Just chat normally - AI conversation\n\n`;

        // Owner-only commands (only show to owner)
        if (isOwner && isAuth) {
            menu += `\n🔐 *OWNER COMMANDS* (Authenticated)\n`;
            menu += `• *omni run <cmd>* - Execute shell commands\n`;
            menu += `• *omni cat <file>* - Read file contents\n`;
            menu += `• *omni upload* - Upload file to server\n`;
            menu += `• *omni js <desc>* - Generate JS code\n`;
            menu += `• *omni py <desc>* - Generate Python code\n\n`;
        } else if (isOwner && !isAuth) {
            menu += `\n🔐 *OWNER COMMANDS* (Locked)\n`;
            menu += `⚠️ Use *auth [passcode]* to unlock\n`;
            menu += `• *omni run <cmd>* - Execute shell commands\n`;
            menu += `• *omni cat <file>* - Read file contents\n`;
            menu += `• *omni upload* - Upload file to server\n\n`;
        }

        menu += `⚠️ *SECURITY NOTICE*\n`;
        menu += `🔒 Sensitive commands require owner authentication\n`;
        menu += `🛡️ Jailbreak attempts are logged and blocked\n`;
        menu += `📵 File contents are protected from unauthorized access\n\n`;

        if (isOwner) {
            menu += `👑 *You are the Owner*\n`;
            if (!isAuth) menu += `🔓 Use *auth [passcode]* to unlock full access\n`;
            else menu += `✅ Full access granted\n`;
        }

        return await this.sendCleanMessage(sock, chatId, menu, message);
    }

    /**
     * Handle AI chat
     */
    async handleAIChat(sock, message, text, userId, chatId) {
        // Simple AI response (integrate with your AI model)
        // This is a placeholder - replace with your actual AI integration
        const responses = [
            `🤖 *OMNI AI*\n\nI received your message. I'm currently in learning mode.\n\n📝 Try these commands:\n• *menu* - Show all commands\n• *omni movie <name>* - Download movies\n• *omni music <name>* - Download music`,
        ];

        return await this.sendCleanMessage(sock, chatId, responses[0], message);
    }

    // ═══════════════════════════════════════════════════════════
    // CLEAN MESSAGE HELPERS (No spam - single message editing)
    // ═══════════════════════════════════════════════════════════

    /**
     * Send a new message (for initial responses)
     */
    async sendCleanMessage(sock, chatId, text, quotedMessage = null) {
        const options = {};
        if (quotedMessage) {
            options.quoted = quotedMessage;
        }

        return await sock.sendMessage(chatId, { text: text }, options);
    }

    /**
     * Edit an existing message (clean updates, no spam)
     */
    async editMessage(sock, chatId, messageKey, newText) {
        try {
            await sock.sendMessage(chatId, {
                edit: messageKey,
                text: newText
            });
        } catch (err) {
            // Fallback: send new message if edit fails
            await sock.sendMessage(chatId, { text: newText });
        }
    }
}

module.exports = new CommandHandler();
