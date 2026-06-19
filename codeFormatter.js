// ═══════════════════════════════════════════════════════════
// OMNI AI - CODE FORMATTER
// Sends code using WhatsApp native ``` code blocks + document
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

class CodeFormatter {
    constructor() {
        this.tempDir = './temp_code/';
        this.ensureDir();
    }

    ensureDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Send code as WhatsApp document with proper formatting
     * Uses WhatsApp template style with ``` code blocks
     */
    async sendCode(sock, chatId, code, filename, quotedMessage = null) {
        try {
            const ext = path.extname(filename) || '.js';
            const lang = ext === '.py' ? 'python' : ext === '.js' ? 'javascript' : 'code';

            // 1. Send formatted code message with WhatsApp native code block
            const formattedMessage = 
                `💻 *Code: ${filename}*\n\n` +
                `\`\`\`${lang}\n` +
                `${code}\n` +
                `\`\`\`\n\n` +
                `📋 *Copy the code above*\n` +
                `📥 *Or download the file below*\n\n` +
                `⚠️ *Use at your own risk*`;

            const options = {};
            if (quotedMessage) options.quoted = quotedMessage;

            await sock.sendMessage(chatId, { text: formattedMessage }, options);

            // 2. Also send as document file for easy download
            const tempFile = path.join(this.tempDir, filename);
            fs.writeFileSync(tempFile, code);

            await sock.sendMessage(chatId, {
                document: { url: tempFile },
                fileName: filename,
                mimetype: ext === '.py' ? 'text/x-python' : 'application/javascript',
                caption: `📄 ${filename}`
            });

            // Clean up temp file after delay
            setTimeout(() => {
                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            }, 300000); // 5 minutes

            return { success: true };

        } catch (err) {
            console.error('[CODE] Error sending code:', err);
            throw err;
        }
    }

    /**
     * Format code with line numbers for display
     */
    formatWithLineNumbers(code) {
        const lines = code.split('\n');
        return lines.map((line, i) => `${(i + 1).toString().padStart(3, '0')}| ${line}`).join('\n');
    }
}

module.exports = new CodeFormatter();
