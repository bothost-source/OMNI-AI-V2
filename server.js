/**
 * OMNI - German Number Bot
 * Uses whatsapp-web.js with PAIRING CODE
 * Groq AI integration for real responses
 */

const express = require('express');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import Groq AI
const groq = require('./groq');
const formatter = require('./code-formatter');

const app = express();
app.use(express.json());

// ============================
// CONFIGURATION
// ============================
const BOT_NAME = 'OMNI';
const PAIRING_CODE = process.env.OMNI_PAIRING_CODE || 'OMNI2024';
const ADMIN_NUMBER = process.env.ADMIN_NUMBER || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ============================
// WHATSAPP CLIENT WITH PAIRING CODE
// ============================

let currentPairingCode = null;
let isReady = false;
let botInfo = null;

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    },
    pairingEnabled: true
});

client.on('code', (code) => {
    console.log('[PAIRING] ╔══════════════════════════════════════╗');
    console.log('[PAIRING] ║         YOUR PAIRING CODE            ║');
    console.log('[PAIRING] ║                                      ║');
    console.log(`[PAIRING] ║           ${code}            ║`);
    console.log('[PAIRING] ║                                      ║');
    console.log('[PAIRING] ╚══════════════════════════════════════╝');
    console.log('[PAIRING] ');
    console.log('[PAIRING] To pair your German number:');
    console.log('[PAIRING] 1. Open WhatsApp on your phone');
    console.log('[PAIRING] 2. Settings → Linked Devices → Link with phone number');
    console.log('[PAIRING] 3. Enter the code above');
    console.log('[PAIRING] ');
    currentPairingCode = code;
});

client.on('ready', () => {
    console.log('[OMNI] ✅ Client is ready! Bot is running.');
    console.log(`[OMNI] 📱 Connected number: ${botInfo?.wid?.user || 'Unknown'}`);
    console.log(`[OMNI] 🤖 AI Status: ${groq.isConfigured() ? 'Groq AI ACTIVE' : 'Placeholder mode (add GROQ_API_KEY)'}`);
    isReady = true;
    currentPairingCode = null;
    botInfo = client.info;
});

client.on('authenticated', () => console.log('[OMNI] ✅ Authenticated'));
client.on('auth_failure', (msg) => console.error('[OMNI] ❌ Auth failure:', msg));

client.on('disconnected', (reason) => {
    console.log('[OMNI] ⚠️ Disconnected:', reason);
    isReady = false;
    client.destroy();
    setTimeout(() => client.initialize(), 5000);
});

client.initialize();

// ============================
// DOWNLOADS SETUP
// ============================

const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// ============================
// YOUTUBE DOWNLOADER
// ============================

async function downloadYouTubeAudio(url) {
    try {
        const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
        if (!videoId) return { error: 'Invalid YouTube URL' };
        const outputPath = path.join(DOWNLOAD_DIR, `${videoId}.mp3`);
        if (fs.existsSync(outputPath)) return { success: true, filePath: outputPath, cached: true };
        await execPromise(`yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputPath}" "${url}"`, { timeout: 120000 });
        if (fs.existsSync(outputPath)) return { success: true, filePath: outputPath, cached: false };
        return { error: 'Download failed' };
    } catch (error) { return { error: error.message }; }
}

async function downloadYouTubeVideo(url) {
    try {
        const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
        if (!videoId) return { error: 'Invalid YouTube URL' };
        const outputPath = path.join(DOWNLOAD_DIR, `${videoId}.mp4`);
        if (fs.existsSync(outputPath)) return { success: true, filePath: outputPath, cached: true };
        await execPromise(`yt-dlp -f "best[filesize<50M]" -o "${outputPath}" "${url}"`, { timeout: 120000 });
        if (fs.existsSync(outputPath)) return { success: true, filePath: outputPath, cached: false };
        return { error: 'Download failed' };
    } catch (error) { return { error: error.message }; }
}

// ============================
// IMAGE GENERATION
// ============================

async function generateImage(prompt) {
    try {
        const encodedPrompt = encodeURIComponent(prompt + ', high quality, detailed');
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 60000 });
        const fileName = `omni_german_${Date.now()}.png`;
        const filePath = path.join(DOWNLOAD_DIR, fileName);
        fs.writeFileSync(filePath, response.data);
        return { success: true, filePath, imageUrl };
    } catch (error) { return { error: error.message }; }
}

// ============================
// PLACEHOLDER RESPONSES (fallback)
// ============================

function getPlaceholderResponse(userMessage, senderName = '') {
    const msgLower = userMessage.toLowerCase();

    if (msgLower.includes('help')) {
        return `*OMNI* 🤖\n\nHere is what I can do:\n\n• *OMNI <question>* — Ask me anything\n• *OMNI code <language>* — Get code examples\n• *OMNI song <YouTube URL>* — Download a song\n• *OMNI video <YouTube URL>* — Download a video\n• *OMNI generate <description>* — Create an AI image\n• *OMNI status* — Check bot status\n\nJust start your message with *OMNI* and I'll respond!`;
    }

    if (msgLower.includes('code') || msgLower.includes('python')) {
        return `*OMNI* 🤖\n\nHere is a Python example:\n\n━━━━━━ *CODE: PYTHON* ━━━━━━\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("World"))\n━━━━━━━━━━━━━━━━━━\n\nWould you like me to explain this or write something else?`;
    }

    if (msgLower.includes('hello') || msgLower.includes('hi')) {
        return `*OMNI* 🤖\n\nHello${senderName ? ' ' + senderName : ''}! How can I assist you today?`;
    }

    if (msgLower.includes('status')) {
        return `*OMNI* 🤖\n\n📊 AI Status:\n• Connected: ${isReady ? '✅ Yes' : '❌ No'}\n• Number: ${botInfo?.wid?.user || 'Unknown'}\n• AI: ${groq.isConfigured() ? '✅ Groq AI Active' : '⚠️ Placeholder mode'}\n• Platform: WhatsApp Web (Pairing Code)\n\nReady to help!`;
    }

    return `*OMNI* 🤖\n\nI received your message! Here is my response:\n\n${userMessage}\n\n⚠️ *Note:* I'm running in placeholder mode.\nAdd your GROQ_API_KEY to .env for real AI responses.\nGet free key at: https://console.groq.com/keys`;
}

// ============================
// MESSAGE HANDLER
// ============================

const WELCOME_MESSAGE = `👋 *Welcome to OMNI!*

I'm your AI assistant created by lordtarrific. Mention me with *OMNI* at the start of your message, and I'll help you with:

• Answering questions 
• Writing & explaining code
• Downloading songs
• Generating AI images
• General assistance

*Example:* OMNI write a Python function to sort a list

Type *OMNI help* for more options.`;

client.on('message_create', async (msg) => {
    if (msg.fromMe) return;

    const textBody = msg.body.trim();
    const fromNumber = msg.from;
    const senderName = msg._data.notifyName || '';

    console.log(`[MESSAGE] From ${fromNumber} (${senderName}): ${textBody}`);

    if (textBody.toUpperCase().startsWith('OMNI')) {
        const userQuery = textBody.substring(4).trim();
        const queryLower = userQuery.toLowerCase();

        // HELP / WELCOME
        if (queryLower.includes('help') || !userQuery) {
            await msg.reply(WELCOME_MESSAGE);
            return;
        }

        // STATUS
        if (queryLower.includes('status')) {
            const statusMsg = groq.isConfigured() 
                ? await groq.generateGroqResponse('What is your status?', senderName) || getPlaceholderResponse('status')
                : getPlaceholderResponse('status');
            await msg.reply(statusMsg);
            return;
        }

        // CODE - Use Groq if available
        if (queryLower.includes('code') || queryLower.includes('python')) {
            let response;
            if (groq.isConfigured()) {
                const language = queryLower.includes('python') ? 'Python' : 'JavaScript';
                const task = userQuery.replace(/code|python|javascript|js/gi, '').trim() || 'hello world';
                response = await groq.generateCodeResponse(language, task);
            }
            if (!response) response = getPlaceholderResponse('code python', senderName);
            await msg.reply(response);
            return;
        }

        // SONG DOWNLOAD
        if (queryLower.startsWith('song')) {
            const songUrl = userQuery.substring(4).trim();
            if (songUrl) {
                await msg.reply('🎵 *OMNI* 🤖\n\nDownloading song... Please wait.');
                const result = await downloadYouTubeAudio(songUrl);
                if (result.success) {
                    const media = MessageMedia.fromFilePath(result.filePath);
                    await msg.reply(media, undefined, { caption: '🎵 Downloaded by OMNI' });
                } else {
                    await msg.reply(`❌ *OMNI* 🤖\n\nDownload failed: ${result.error}`);
                }
            } else {
                await msg.reply('❌ *OMNI* 🤖\n\nPlease provide a YouTube URL.\nExample: OMNI song https://youtube.com/watch?v=...');
            }
            return;
        }

        // VIDEO DOWNLOAD
        if (queryLower.startsWith('video')) {
            const videoUrl = userQuery.substring(5).trim();
            if (videoUrl) {
                await msg.reply('🎬 *OMNI* 🤖\n\nDownloading video... Please wait.');
                const result = await downloadYouTubeVideo(videoUrl);
                if (result.success) {
                    const media = MessageMedia.fromFilePath(result.filePath);
                    await msg.reply(media, undefined, { caption: '🎬 Downloaded by OMNI' });
                } else {
                    await msg.reply(`❌ *OMNI* 🤖\n\nDownload failed: ${result.error}`);
                }
            } else {
                await msg.reply('❌ *OMNI* 🤖\n\nPlease provide a YouTube URL.\nExample: OMNI video https://youtube.com/watch?v=...');
            }
            return;
        }

        // GENERATE IMAGE
        if (queryLower.startsWith('generate') || queryLower.startsWith('draw') || queryLower.startsWith('create')) {
            const imagePrompt = userQuery.substring(userQuery.indexOf(' ') + 1).trim();
            if (imagePrompt) {
                await msg.reply(`🎨 *OMNI* 🤖\n\nGenerating image: "${imagePrompt}"\n\nPlease wait...`);
                const result = await generateImage(imagePrompt);
                if (result.success) {
                    const media = MessageMedia.fromFilePath(result.filePath);
                    await msg.reply(media, undefined, { caption: `🎨 Generated by OMNI: "${imagePrompt}"` });
                } else {
                    await msg.reply(`❌ *OMNI* 🤖\n\nImage generation failed: ${result.error}`);
                }
            } else {
                await msg.reply('❌ *OMNI* 🤖\n\nPlease provide an image description.\nExample: OMNI generate a futuristic city at night');
            }
            return;
        }

        // DEFAULT TEXT - Use Groq AI if available, else placeholder
        let responseText;
        if (groq.isConfigured()) {
            responseText = await groq.generateGroqResponse(userQuery, senderName);
        }
        if (!responseText) {
            responseText = getPlaceholderResponse(userQuery, senderName);
        }
        await msg.reply(responseText);

    } else {
        const hint = `👋 *OMNI*\n\nTo chat with me, start your message with *OMNI*\n\nExample: *OMNI hello* or *OMNI help*\n\nI'm here when you need me! 🤖`;
        await msg.reply(hint);
    }
});

// ============================
// EXPRESS API
// ============================

app.get('/', (req, res) => {
    res.json({
        name: 'OMNI German Number Bot',
        version: '1.0.0',
        status: isReady ? 'connected' : 'waiting_for_pairing',
        number: botInfo?.wid?.user || 'Not connected',
        ai_status: groq.isConfigured() ? 'groq_active' : 'placeholder_mode',
        features: ['text', 'media', 'youtube-download', 'image-generation', 'groq-ai'],
        pairing_code: currentPairingCode || null
    });
});

app.get('/pairing', (req, res) => {
    if (isReady) {
        return res.json({
            status: 'already_connected',
            number: botInfo?.wid?.user,
            ai: groq.isConfigured() ? 'Groq AI Active' : 'Placeholder Mode',
            message: 'Bot is paired and running!'
        });
    }
    if (currentPairingCode) {
        return res.json({
            status: 'waiting_for_pairing',
            pairing_code: currentPairingCode,
            instructions: [
                'Open WhatsApp on your phone',
                'Go to: Settings → Linked Devices → Link with phone number',
                'Enter the pairing code above',
                'Wait for connection...'
            ]
        });
    }
    res.json({ status: 'initializing', message: 'Pairing code will appear soon...' });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: isReady ? 'online' : 'offline',
        bot: BOT_NAME,
        connected: isReady,
        ai: groq.isConfigured() ? 'groq' : 'placeholder',
        number: botInfo?.wid?.user || null,
        timestamp: new Date().toISOString()
    });
});

app.post('/api/send-message', async (req, res) => {
    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ error: "Missing 'to' or 'message'" });
    try {
        const chat = await client.getChatById(to.includes('@') ? to : `${to}@c.us`);
        await chat.sendMessage(message);
        res.json({ success: true, sent_to: to });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ============================
// START SERVER
// ============================

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OMNI] Dashboard running on port ${PORT}`);
    console.log(`[OMNI] Check pairing status: http://localhost:${PORT}/pairing`);
    console.log(`[OMNI] AI Mode: ${groq.isConfigured() ? 'Groq AI ✅' : 'Placeholder ⚠️ (add GROQ_API_KEY)'}`);
    console.log(`[OMNI] Waiting for pairing code...`);
});
