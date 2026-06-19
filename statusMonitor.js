// statusMonitor.js - WhatsApp Status Monitor
module.exports = {
  async handleCommand(ctx, args) {
    return `📊 Status Monitor

Your bot can:
• Send status updates (text/image/video)
• Auto-reply when mentioned in status

⚠️ WhatsApp does not provide an official API to see who viewed your status. Meta removed this feature for privacy reasons.`;
  }
};
