// ═══════════════════════════════════════════════════════════
// OMNI AI - FILE UPLOADER & MEMORY
// Handles file uploads and learning/memory storage
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

class FileUploader {
    constructor() {
        this.memoryFile = './memory.json';
        this.memories = this.loadMemories();
    }

    /**
     * Save uploaded file to server directory
     */
    async saveFile(sock, message, customFilename) {
        try {
            // Download the file from WhatsApp
            const buffer = await downloadMediaMessage(
                message,
                'buffer',
                {},
                { logger: console, reuploadRequest: sock.updateMediaMessage }
            );

            if (!buffer) {
                throw new Error('Could not download file from message');
            }

            // Determine filename
            let filename = customFilename;
            if (!filename) {
                const doc = message.message?.documentMessage;
                const img = message.message?.imageMessage;
                const vid = message.message?.videoMessage;

                if (doc?.fileName) filename = doc.fileName;
                else if (img) filename = `image_${Date.now()}.jpg`;
                else if (vid) filename = `video_${Date.now()}.mp4`;
                else filename = `file_${Date.now()}.bin`;
            }

            // Security: sanitize filename
            filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

            const filepath = path.join(process.cwd(), filename);

            // Check if file already exists
            if (fs.existsSync(filepath)) {
                filename = `${Date.now()}_${filename}`;
            }

            const finalPath = path.join(process.cwd(), filename);
            fs.writeFileSync(finalPath, buffer);

            return {
                success: true,
                filename: filename,
                path: finalPath,
                size: `${(buffer.length / 1024).toFixed(2)} KB`
            };

        } catch (err) {
            throw new Error(`Upload failed: ${err.message}`);
        }
    }

    /**
     * Load memories from file
     */
    loadMemories() {
        try {
            if (fs.existsSync(this.memoryFile)) {
                const data = fs.readFileSync(this.memoryFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (err) {
            console.error('[MEMORY] Error loading:', err);
        }
        return {};
    }

    /**
     * Save memories to file
     */
    saveMemories() {
        try {
            fs.writeFileSync(this.memoryFile, JSON.stringify(this.memories, null, 2));
        } catch (err) {
            console.error('[MEMORY] Error saving:', err);
        }
    }

    /**
     * Save information to memory
     */
    saveToMemory(userId, info) {
        if (!this.memories[userId]) {
            this.memories[userId] = [];
        }

        const memory = {
            id: Date.now(),
            info: info,
            timestamp: new Date().toISOString()
        };

        this.memories[userId].push(memory);
        this.saveMemories();

        return {
            success: true,
            count: this.memories[userId].length
        };
    }

    /**
     * Get memories for user
     */
    getMemories(userId) {
        return this.memories[userId] || [];
    }

    /**
     * Get all memories (for AI learning)
     */
    getAllMemories() {
        return this.memories;
    }
}

module.exports = new FileUploader();
