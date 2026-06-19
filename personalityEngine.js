// personalityEngine.js - Bot Personality Switcher
const historyManager = require('./utils/history');

const personalities = {
  default: 'Friendly and helpful assistant',
  savage: 'Witty, sarcastic, and roast mode',
  professional: 'Formal business consultant',
  flirty: 'Playful and charming',
  gangster: 'Street talk, confident and bold',
  nerd: 'Tech expert with deep explanations',
  pidgin: 'Nigerian Pidgin speaker'
};

module.exports = {
  async handleCommand(ctx, args) {
    if (!args) {
      const list = Object.entries(personalities)
        .map(([k, v]) => `• ${k} — ${v}`)
        .join('\n');
      return `🎭 Available Personalities:\n\n${list}\n\nSay: "switch personality <name>"`;
    }

    const mode = args.toLowerCase().trim();

    if (personalities[mode]) {
      historyManager.updateProfile(ctx.from.id, { personality: mode });
      return `✅ Personality switched to **${mode}**!\n\n${personalities[mode]}`;
    }

    return `❌ Unknown personality: "${args}"\n\nAvailable: ${Object.keys(personalities).join(', ')}`;
  }
};
