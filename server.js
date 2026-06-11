/**
 * OMNI - German Number Bot (Baileys + Pairing Code)
 * No Puppeteer! Popup notification pairing! Works on Termux!
 */

const express = require('express');
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    DisconnectReason,
    Browsers,
    delay
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// ============================
// CONFIGURATION
// ============================
const BOT_NAME = 'OMNI';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PHONE_NUMBER = process.env.PHONE_NUMBER || '491634515397'; // Your German number

// Import modules
const formatter = require('./code-formatter');
const groq = require('./groq');

// ============================
// BAILEYS SETUP
// ============================
const sessionPath = './session_auth';
let sock = null;
let isReady = false;
let pairingCodeRequested = false;
let currentPairingCode = null;

function cleanSession() {
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log(`[✓] Cleaned old session`);
    }
}

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
        const fileName = `omni_${Date.now()}.png`;
        const filePath = path.join(DOWNLOAD_DIR, fileName);
        fs.writeFileSync(filePath, response.data);
        return { success: true, filePath, imageUrl };
    } catch (error) { return { error: error.message }; }
}

// ============================
// MESSAGE HANDLER
// ============================

const WELCOME_MESSAGE = `👋 *Welcome to OMNI!*

I'm your AI assistant. Mention me with *OMNI* at the start of your message, and I'll help you with:

• Answering questions (AI-powered)
• Writing & explaining code
• Downloading songs from YouTube
• Generating AI images
• General assistance

*Example:* OMNI write a Python function to sort a list

Type *OMNI help* for more options.`;

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
        return `*OMNI* 🤖\n\n📊 Bot Status:\n• Connected: ✅ Yes\n• Platform: Baileys (Pairing Code)\n• AI: ${groq.isConfigured() ? '✅ Groq AI Active' : '⚠️ Placeholder mode'}\n\nReady to help!`;
    }

    return `*OMNI* 🤖\n\nI received your message! Here is my response:\n\n${userMessage}\n\n⚠️ *Note:* I'm running in placeholder mode.\nAdd your GROQ_API_KEY to .env for real AI responses.\nGet free key at: https://console.groq.com/keys`;
}

async function handleMessage(msg) {
    const from = msg.key.remoteJid;
    const senderName = msg.pushName || '';

    if (!msg.message || !msg.message.conversation) return;

    const textBody = msg.message.conversation.trim();
    console.log(`[MESSAGE] From ${from} (${senderName}): ${textBody}`);

    if (textBody.toUpperCase().startsWith('OMNI')) {
        const userQuery = textBody.substring(4).trim();
        const queryLower = userQuery.toLowerCase();

        if (queryLower.includes('help') || !userQuery) {
            await sock.sendMessage(from, { text: WELCOME_MESSAGE });
            return;
        }

        if (queryLower.includes('status')) {
            await sock.sendMessage(from, { text: getPlaceholderResponse('status') });
            return;
        }

        if (queryLower.includes('code') || queryLower.includes('python')) {
            let response;
            if (groq.isConfigured()) {
                const lang = queryLower.includes('python') ? 'Python' : 'JavaScript';
                const task = userQuery.replace(/code|python|javascript|js/gi, '').trim() || 'hello world';
                response = await groq.code(lang, task);
                if (response) response = formatter.reformatResponse(response);
            }
            if (!response) {
                const fallbackCode = `def greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("World"))`;
                response = `*OMNI* 🤖\n\n${formatter.formatMetaCode(fallbackCode, 'PYTHON')}\n\nWould you like me to explain this or write something else?`;
            }
            await sock.sendMessage(from, { text: response });
            return;
        }

        if (queryLower.startsWith('song')) {
            const songUrl = userQuery.substring(4).trim();
            if (songUrl) {
                await sock.sendMessage(from, { text: '🎵 *OMNI* 🤖\n\nDownloading song... Please wait.' });
                const result = await downloadYouTubeAudio(songUrl);
                if (result.success) {
                    await sock.sendMessage(from, { 
                        document: { url: result.filePath },
                        mimetype: 'audio/mpeg',
                        fileName: path.basename(result.filePath)
                    });
                } else {
                    await sock.sendMessage(from, { text: `❌ *OMNI* 🤖\n\nDownload failed: ${result.error}` });
                }
            } else {
                await sock.sendMessage(from, { text: '❌ *OMNI* 🤖\n\nPlease provide a YouTube URL.\nExample: OMNI song https://youtube.com/watch?v=...' });
            }
            return;
        }

        if (queryLower.startsWith('video')) {
            const videoUrl = userQuery.substring(5).trim();
            if (videoUrl) {
                await sock.sendMessage(from, { text: '🎬 *OMNI* 🤖\n\nDownloading video... Please wait.' });
                const result = await downloadYouTubeVideo(videoUrl);
                if (result.success) {
                    await sock.sendMessage(from, { 
                        video: { url: result.filePath },
                        caption: '🎬 Downloaded by OMNI'
                    });
                } else {
                    await sock.sendMessage(from, { text: `❌ *OMNI* 🤖\n\nDownload failed: ${result.error}` });
                }
            } else {
                await sock.sendMessage(from, { text: '❌ *OMNI* 🤖\n\nPlease provide a YouTube URL.\nExample: OMNI video https://youtube.com/watch?v=...' });
            }
            return;
        }

        if (queryLower.startsWith('generate') || queryLower.startsWith('draw') || queryLower.startsWith('create')) {
            const imagePrompt = userQuery.substring(userQuery.indexOf(' ') + 1).trim();
            if (imagePrompt) {
                await sock.sendMessage(from, { text: `🎨 *OMNI* 🤖\n\nGenerating image: "${imagePrompt}"\n\nPlease wait...` });
                const result = await generateImage(imagePrompt);
                if (result.success) {
                    await sock.sendMessage(from, { 
                        image: { url: result.filePath },
                        caption: `🎨 Generated by OMNI: "${imagePrompt}"`
                    });
                } else {
                    await sock.sendMessage(from, { text: `❌ *OMNI* 🤖\n\nImage generation failed: ${result.error}` });
                }
            } else {
                await sock.sendMessage(from, { text: '❌ *OMNI* 🤖\n\nPlease provide an image description.\nExample: OMNI generate a futuristic city at night' });
            }
            return;
        }

        let responseText;
        if (groq.isConfigured()) {
            responseText = await groq.chat(userQuery, senderName);
            if (responseText) responseText = formatter.reformatResponse(responseText);
        }
        if (!responseText) {
            responseText = getPlaceholderResponse(userQuery, senderName);
        }
        await sock.sendMessage(from, { text: responseText });

    } else {
        const hint = `👋 *OMNI Bot*\n\nTo chat with me, start your message with *OMNI*\n\nExample: *OMNI hello* or *OMNI help*\n\nI'm here when you need me! 🤖`;
        await sock.sendMessage(from, { text: hint });
    }
}

// ============================
// START BAILEYS WITH PAIRING CODE
// ============================
async function startBot() {
    cleanSession();

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    console.log(`[i] Using WA v${version.join('.')}`);
    console.log(`[i] Phone number: ${PHONE_NUMBER}`);

    sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: Browsers.macOS('Chrome'),
        syncFullHistory: false,
        markOnlineOnConnect: true,
        printQRInTerminal: false,  // We use pairing code, not QR
        connectTimeoutMs: 120000,
        keepAliveIntervalMs: 30000,
        defaultQueryTimeoutMs: 60000
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // PAIRING CODE LOGIC (like your pair.js!)
        if (qr && !pairingCodeRequested && !sock.authState.creds.registered) {
            pairingCodeRequested = true;

            const cleanNumber = PHONE_NUMBER.replace(/\D/g, '');

            if (!cleanNumber || cleanNumber.length < 10) {
                console.error('[x] Error: Invalid phone number in .env');
                return;
            }

            console.log(`[i] Requesting pairing code for: +${cleanNumber}`);
            await delay(2000);

            try {
                const code = await sock.requestPairingCode(cleanNumber);
                currentPairingCode = code;

                console.log('\n╔══════════════════════════════════════╗');
                console.log('║         YOUR PAIRING CODE            ║');
                console.log('║                                      ║');
                console.log(`║           ${code}            ║`);
                console.log('║                                      ║');
                console.log('╚══════════════════════════════════════╝\n');

                console.log('[i] Check your phone for a popup notification!');
                console.log('[i] WhatsApp → Settings → Linked Devices → Link with phone number');
                console.log('[i] Enter the code above\n');

                // Save code to file
                fs.writeFileSync('PAIRING_CODE.txt', code);

            } catch (err) {
                console.error('[✗] Failed to get pairing code:', err.message);
                pairingCodeRequested = false;
            }
        }

        if (connection === 'open') {
            console.log('\n[✓] SUCCESS: DEVICE LINKED!');
            console.log(`[✓] Connected as: ${sock.user.id}`);
            isReady = true;
            pairingCodeRequested = false;
            currentPairingCode = null;

            // Send welcome message to yourself
            try {
                await sock.sendMessage(sock.user.id, { 
                    text: '*OMNI* 🤖\n\nBot is now active!\nType *OMNI help* to see what I can do.' 
                });
            } catch (e) {}
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`[✗] Connection closed. Status: ${statusCode}`);

            if (statusCode !== DisconnectReason.loggedOut) {
                console.log('[i] Reconnecting in 5 seconds...');
                await delay(5000);
                return startBot();
            }
        }
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && msg.message) {
            await handleMessage(msg);
        }
    });
}

// Start bot
startBot();

// ============================
// EXPRESS API
// ============================

app.get('/', (req, res) => {
    res.json({
        name: 'OMNI German Bot (Baileys + Pairing Code)',
        version: '1.0.0',
        status: isReady ? 'connected' : 'waiting_for_pairing',
        ai: groq.isConfigured() ? 'groq_active' : 'placeholder_mode',
        pairing_code: currentPairingCode || null,
        features: ['text', 'media', 'youtube-download', 'image-generation', 'groq-ai'],
        platform: 'Baileys (Popup Notification Pairing)'
    });
});

app.get('/pairing', (req, res) => {
    if (isReady) {
        return res.json({
            status: 'connected',
            user: sock.user?.id || 'Unknown',
            message: 'Bot is paired and running!'
        });
    }

    if (currentPairingCode) {
        return res.json({
            status: 'waiting_for_pairing',
            pairing_code: currentPairingCode,
            instructions: [
                'Check your phone for a popup notification!',
                'WhatsApp → Settings → Linked Devices → Link with phone number',
                `Enter code: ${currentPairingCode}`
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
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OMNI] Dashboard: http://localhost:${PORT}/`);
    console.log(`[OMNI] Waiting for pairing code popup notification...`);
});
