// ═══════════════════════════════════════════════════════════
// OMNI AI - STICKER MANAGER
// Handles sticker replies from saved sticker pack
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { CONFIG } = require('./config');

class StickerManager {
    constructor() {
        this.stickerDir = CONFIG.STICKERS.STICKER_PACK_PATH;
        this.stickers = [];
        this.init();
    }

    init() {
        // Ensure sticker directory exists
        if (!fs.existsSync(this.stickerDir)) {
            fs.mkdirSync(this.stickerDir, { recursive: true });
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

            console.log(`[STICKER] Loaded ${this.stickers.length} stickers`);
        } catch (err) {
            console.error('[STICKER] Error loading stickers:', err);
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
     * Handle incoming sticker - reply with random sticker
     */
    async handleStickerReply(sock, message, userId) {
        if (!CONFIG.STICKERS.REPLY_ENABLED) return false;

        try {
            const stickerPath = this.getRandomSticker();
            if (!stickerPath) {
                await sock.sendMessage(message.key.remoteJid, {
                    text: `😕 *No stickers available!*\n\n📝 Save stickers to:\n*${this.stickerDir}*\n\n📌 Send stickers to this number to save them.`
                });
                return false;
            }

            // Send random sticker as reply
            await sock.sendMessage(message.key.remoteJid, {
                sticker: { url: stickerPath }
            }, { quoted: message });

            return true;
        } catch (err) {
            console.error('[STICKER] Error sending sticker:', err);
            return false;
        }
    }

    /**
     * Save incoming sticker to pack
     */
    async saveSticker(buffer, filename) {
        try {
            const filepath = path.join(this.stickerDir, filename);
            fs.writeFileSync(filepath, buffer);
            this.loadStickers(); // Reload
            return { success: true, path: filepath };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Get sticker count
     */
    getStickerCount() {
        return this.stickers.length;
    }
}

module.exports = new StickerManager();
