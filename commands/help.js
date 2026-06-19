/**
 * OMNI Help Command
 * Created by: lordtarrific
 */

function buildHelpText(prefix = '/') {
  return `🤖 *OMNI* — Your Advanced WhatsApp Agent
_Created by lordtarrific_\n
*Chat Commands:*
${prefix}help — Show this message
${prefix}model — Check current AI model
${prefix}groq — Switch to Groq AI
${prefix}gemini — Switch to Gemini AI
${prefix}logs — View recent bot logs
${prefix}workspace — List your workspace files
${prefix}getfile <path> — Send a file from workspace
${prefix}run <command> — Run terminal command
${prefix}gitpush — Push workspace to GitHub\n
*Media Commands:*
${prefix}play <song> — Download song
${prefix}video <url> — Download video from URL
${prefix}image <prompt> — Generate AI image
${prefix}voice <text> — Text to speech\n
*Dev Commands:*
${prefix}llamacoder <idea> — Build React app
${prefix}users — List users (admin only)
${prefix}ban <id> — Ban user (admin only)
${prefix}unban <id> — Unban user (admin only)
${prefix}resetuser <id> — Reset user limits (admin only)\n
*Group Owner Commands:*
%allowchat — Enable AI chat in group
%disallowchat — Disable AI chat in group
%permit @user — Allow user to use bot
%unpermit @user — Remove user permission
%status — Show group permissions\n
*Natural Commands:*
Just mention me or start with "OMNI"
- "OMNI download [song]" — Music
- "OMNI generate [prompt]" — Image
- "OMNI sticker" — Reply to image
- "OMNI randsticker" — Random sticker
- "OMNI apk [app]" — Download APK
- "OMNI join [link]" — Join group
- "OMNI group link" — Get group link
- "delete this" — Delete my last message
- "tag @user" — Tag someone\n
💡 *Tip:* Add GROQ_API_KEY or GEMINI_API_KEY to .env for full AI power!`;
}

module.exports = { buildHelpText };
