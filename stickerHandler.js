// ═══════════════════════════════════════════════════════════
// OMNI AI - STICKER HANDLER
// Downloads, saves, and replies with stickers using Baileys
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// Sticker directory configuration
const STICKER_DIR = './stickers/';

class StickerHandler {
    constructor() {
        this.stickerDir = STICKER_DIR;
        this.stickers = [];
        this.init();
    }

    init() {
        // Ensure sticker directory exists
        if (!fs.existsSync(this.stickerDir)) {
            fs.mkdirSync(this.stickerDir, { recursive: true });
            console.log(`[STICKER] Created sticker directory: ${this.stickerDir}`);
        }
        this.loadStickers();
    }

    /**
     * Load all stickers from directory
     */
    loadStickers() {
        try {
            const files = fs.readdirSync(this.stickerDir);
            this.stickers = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.webp', '.png', '.jpg', '.jpeg', '.gif'].includes(ext);
            }).map(file => path.join(this.stickerDir, file));

            console.log(`[STICKER] Loaded ${this.stickers.length} stickers from ${this.stickerDir}`);
        } catch (err) {
            console.error('[STICKER] Error loading stickers:', err);
            this.stickers = [];
        }
    }

    /**
     * Get random sticker for reply
     */
    getRandomSticker() {
        if (this.stickers.length === 0) {
            return null;
        }
        const randomIndex = Math.floor(Math.random() * this.stickers.length);
        return this.stickers[randomIndex];
    }

    /**
     * Handle incoming sticker - reply with random sticker from saved pack
     */
    async handleStickerReply(sock, message, userId) {
        const chatId = message.key.remoteJid;

        try {
            // First, try to save the incoming sticker
            await this.saveIncomingSticker(sock, message);

            // Then reply with a random sticker
            const stickerPath = this.getRandomSticker();

            if (!stickerPath) {
                // No stickers saved yet - send info message
                await sock.sendMessage(chatId, {
                    text: `🎨 *Sticker Pack Empty*\n\n` +
                          `📭 No saved stickers yet.\n\n` +
                          `📝 *To add stickers:*\n` +
                          `1. Send stickers to this number\n` +
                          `2. I'll save them automatically\n` +
                          `3. Then I'll reply with random stickers!`
                }, { quoted: message });
                return false;
            }

            // Send random sticker as reply
            const stickerBuffer = fs.readFileSync(stickerPath);

            await sock.sendMessage(chatId, {
                sticker: stickerBuffer
            }, { quoted: message });

            console.log(`[STICKER] Replied with sticker: ${path.basename(stickerPath)}`);
            return true;

        } catch (err) {
            console.error('[STICKER] Error in sticker reply:', err);
            return false;
        }
    }

    /**
     * Save incoming sticker to pack
     */
    async saveIncomingSticker(sock, message) {
        try {
            const stickerMsg = message.message?.stickerMessage;
            if (!stickerMsg) {
                return { success: false, error: 'No sticker message' };
            }

            console.log('[STICKER] Downloading incoming sticker...');

            // Download sticker using Baileys downloadMediaMessage
            const buffer = await downloadMediaMessage(
                message,
                'buffer',
                {},
                {
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                }
            );

            if (!buffer) {
                throw new Error('Failed to download sticker - buffer is empty');
            }

            // Generate unique filename
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 8);
            const filename = `sticker_${timestamp}_${randomStr}.webp`;
            const filepath = path.join(this.stickerDir, filename);

            // Save sticker
            fs.writeFileSync(filepath, buffer);

            // Reload stickers
            this.loadStickers();

            console.log(`[STICKER] Saved incoming sticker: ${filename} (${buffer.length} bytes)`);

            return {
                success: true,
                filename: filename,
                path: filepath,
                size: buffer.length
            };

        } catch (err) {
            console.error('[STICKER] Error saving incoming sticker:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Get sticker count
     */
    getStickerCount() {
        return this.stickers.length;
    }

    /**
     * List all saved stickers
     */
    listStickers() {
        return this.stickers.map(filepath => ({
            filename: path.basename(filepath),
            path: filepath,
            size: fs.statSync(filepath).size
        }));
    }
}

module.exports = new StickerHandler();
