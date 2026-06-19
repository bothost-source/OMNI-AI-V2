// ═══════════════════════════════════════════════════════════
// OMNI AI - SECURITY MODULE (Integrates with existing accessControl)
// Handles: Owner auth, passcode protection, jailbreak detection,
// backend exposure prevention, sensitive file blocking
// ═══════════════════════════════════════════════════════════

const { CONFIG } = require('./config');

// Owner configuration - HARDCODED for security
const OWNER_NUMBER = '2349121747036';  // Your owner number
const OWNER_PASSCODE = 'OMNI2024SECURE'; // CHANGE THIS IN PRODUCTION

// Session storage
const authSessions = new Map();
const failedAttempts = new Map();
const securityLogs = [];

class SecurityManager {
    constructor() {
        this.sessions = authSessions;
        this.attempts = failedAttempts;
        this.logs = securityLogs;
    }

    /**
     * Check if user is the owner (2349121747036)
     */
    isOwner(userId) {
        const cleanId = this.normalizeId(userId);
        return cleanId === OWNER_NUMBER || 
               cleanId === OWNER_NUMBER.replace(/^0/, '') ||
               cleanId === '0' + OWNER_NUMBER;
    }

    /**
     * Normalize phone number for comparison
     */
    normalizeId(userId) {
        return String(userId || '').replace(/\D/g, '');
    }

    /**
     * Check if user is authenticated (entered passcode)
     */
    isAuthenticated(userId) {
        const session = this.sessions.get(userId);
        if (!session) return false;

        // Check if session expired (24 hours)
        if (Date.now() - session.timestamp > 86400000) {
            this.sessions.delete(userId);
            return false;
        }
        return true;
    }

    /**
     * Authenticate user with passcode
     */
    authenticate(userId, passcode) {
        // Check if user is locked out
        const userAttempts = this.attempts.get(userId);
        if (userAttempts && userAttempts.lockedUntil > Date.now()) {
            const remaining = Math.ceil((userAttempts.lockedUntil - Date.now()) / 60000);
            return { 
                success: false, 
                error: `🔒 Account locked. Try again in ${remaining} minutes.` 
            };
        }

        if (passcode === OWNER_PASSCODE) {
            this.sessions.set(userId, { timestamp: Date.now(), attempts: 0 });
            this.attempts.delete(userId);
            this.logEvent(userId, 'AUTH_SUCCESS');
            return { 
                success: true, 
                message: '✅ *Authentication successful!*\n🔓 Owner access granted.\n\n⚠️ This session expires in 24 hours.' 
            };
        } else {
            // Track failed attempt
            const attempts = (userAttempts?.count || 0) + 1;
            if (attempts >= 3) {
                this.attempts.set(userId, { 
                    count: attempts, 
                    lockedUntil: Date.now() + 3600000 // 1 hour lockout
                });
                this.logEvent(userId, 'AUTH_LOCKED');
                return { 
                    success: false, 
                    error: `❌ *Too many failed attempts!*\n🔒 Account locked for 1 hour.` 
                };
            } else {
                this.attempts.set(userId, { count: attempts, lockedUntil: 0 });
                this.logEvent(userId, 'AUTH_FAILED');
                return { 
                    success: false, 
                    error: `❌ *Wrong passcode!*\n⚠️ Attempt ${attempts}/3\n\n📝 Use: *auth [passcode]*` 
                };
            }
        }
    }

    /**
     * Detect jailbreak attempts
     */
    detectJailbreak(message) {
        const lowerMsg = String(message || '').toLowerCase();
        const normalized = String(message || '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();

        const jailbreakPatterns = [
            /ignore.*previous.*instruction/i,
            /ignore.*above/i,
            /system.*prompt/i,
            /you are.*now/i,
            /pretend.*you.*are/i,
            /DAN.*mode/i,
            /jailbreak/i,
            /hack/i,
            /exploit/i,
            /bypass.*security/i,
            /show.*backend/i,
            /show.*server/i,
            /show.*code/i,
            /download.*all/i,
            /send.*all.*files/i,
            /cat.*\.env/i,
            /cat.*config/i,
            /get.*token/i,
            /get.*api.*key/i,
            /show.*password/i,
            /reveal.*secret/i,
            /developer.*mode/i,
            /prompt.*inject/i,
            /do.*anything.*now/i,
            /reveal.*hidden/i,
            /dump.*memory/i,
            /print.*system/i,
            /what.*are.*your.*instructions/i,
            /show.*me.*your.*prompt/i
        ];

        for (const pattern of jailbreakPatterns) {
            if (pattern.test(message) || pattern.test(lowerMsg) || pattern.test(normalized)) {
                this.logEvent('SYSTEM', 'JAILBREAK_ATTEMPT', { text: message.substring(0, 200) });
                return {
                    detected: true,
                    response: `🛡️ *SECURITY ALERT* 🛡️\n\n` +
                              `⚠️ Unauthorized access pattern detected!\n` +
                              `❌ This incident has been logged.\n` +
                              `🔒 Backend access is strictly forbidden.\n\n` +
                              `📝 *Available commands:*\n` +
                              `• *menu* - Show all commands\n` +
                              `• *help* - Get assistance`
                };
            }
        }

        // Check for blocked commands in run/shell
        if (/^omni\s+(run|shell|exec)/i.test(message)) {
            const cmd = message.replace(/^omni\s+(run|shell|exec)/i, '').trim().toLowerCase();
            const blockedCommands = [
                'rm -rf', 'rm -r /', 'mkfs', 'dd if=', 'format',
                'shutdown', 'reboot', 'poweroff', 'init 0',
                'wget', 'curl -o', 'nc -e', 'bash -i', 'python -c',
                'eval(', 'exec(', 'system(', 'child_process',
                'fs.unlink', 'fs.rmdir', 'process.exit'
            ];
            for (const blocked of blockedCommands) {
                if (cmd.includes(blocked.toLowerCase())) {
                    return {
                        detected: true,
                        response: `⛔ *COMMAND BLOCKED* ⛔\n\n` +
                                  `❌ This command is restricted for security reasons.\n` +
                                  `🛡️ System protection active.\n\n` +
                                  `⚠️ Attempting dangerous operations will result in permanent ban.`
                    };
                }
            }
        }

        return { detected: false };
    }

    /**
     * Check if trying to access sensitive files
     */
    checkSensitiveAccess(message) {
        const lowerMsg = String(message || '').toLowerCase();
        const sensitivePaths = [
            '.env', 'config.js', 'package.json', 'node_modules',
            'server.js', 'auth.js', 'credentials', 'token', 'secret',
            'password', 'key', 'private', 'database', 'db.json',
            'session', 'auth_info', 'creds', 'pairing',
            'owner', 'admin', 'runtimeOwnerId', 'runtimePairedNumber'
        ];

        for (const sensitive of sensitivePaths) {
            if (lowerMsg.includes(sensitive.toLowerCase())) {
                return {
                    blocked: true,
                    response: `🔒 *ACCESS DENIED* 🔒\n\n` +
                              `❌ Attempting to access sensitive system files.\n` +
                              `🛡️ This operation is not permitted.\n\n` +
                              `✅ *What you can do:*\n` +
                              `• Use *ls* to list files (names only)\n` +
                              `• Contact owner for file access`
                };
            }
        }
        return { blocked: false };
    }

    /**
     * Verify owner for sensitive operations
     */
    requireOwner(userId, operation) {
        if (!this.isOwner(userId)) {
            this.logEvent(userId, 'UNAUTHORIZED_ACCESS_ATTEMPT', { operation });
            return {
                allowed: false,
                response: `⛔ *OWNER ONLY* ⛔\n\n` +
                          `❌ Command: *${operation}*\n` +
                          `🔒 This command requires owner privileges.\n\n` +
                          `📝 Owner: +${OWNER_NUMBER}`
            };
        }

        if (!this.isAuthenticated(userId)) {
            return {
                allowed: false,
                response: `🔐 *AUTHENTICATION REQUIRED* 🔐\n\n` +
                          `❌ Command: *${operation}*\n` +
                          `🔒 This sensitive command requires passcode.\n\n` +
                          `📝 Use: *auth [your_passcode]*\n` +
                          `⚠️ 3 attempts max before lockout`
            };
        }

        return { allowed: true };
    }

    /**
     * Log security event
     */
    logEvent(userId, event, details = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, userId, event, details };
        this.logs.push(logEntry);
        console.log(`[SECURITY ${timestamp}] User: ${userId} | Event: ${event}`, details);

        // Keep only last 1000 logs
        if (this.logs.length > 1000) {
            this.logs.shift();
        }
    }

    /**
     * Get security logs (owner only)
     */
    getLogs(userId) {
        if (!this.isOwner(userId)) return null;
        return this.logs.slice(-50);
    }
}

module.exports = new SecurityManager();
