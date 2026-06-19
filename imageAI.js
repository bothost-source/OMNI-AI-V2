// imageAI.js - AI Image Generation
const { generateGeminiImage } = require('./utils/ai');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

async function downloadImage(url) {
  try {
    const { data } = await axios.get(url, { 
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return Buffer.from(data);
  } catch (e) {
    return null;
  }
}

module.exports = {
  async handleCommand(ctx, args) {
    if (!args) return 'Usage: generate image <description>';

    await ctx.sendChatAction('typing');

    try {
      // Try Gemini first
      const result = await generateGeminiImage(args);

      if (result.images && result.images.length) {
        for (const img of result.images.slice(0, 4)) {
          await ctx.sock.sendMessage(ctx.remoteJid, {
            image: img.data,
            mimetype: img.mimetype || 'image/png',
            caption: `🎨 ${args.slice(0, 100)}`
          }, { quoted: ctx.message });
        }
        return '';
      }
    } catch (e) {
      // Gemini failed, try Pollinations
    }

    // Fallback: Pollinations AI (free, no API key)
    try {
      await ctx.reply('🎨 Generating image...');

      const encodedPrompt = encodeURIComponent(args);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;

      // Download the image
      const imageBuffer = await downloadImage(imageUrl);

      if (imageBuffer) {
        await ctx.sock.sendMessage(ctx.remoteJid, {
          image: imageBuffer,
          mimetype: 'image/jpeg',
          caption: `🎨 ${args.slice(0, 100)}`
        }, { quoted: ctx.message });
        return '';
      }

      // If download failed, send URL as last resort
      return `🎨 Image URL: ${imageUrl}

⚠️ Could not download image. Click link to view.`;
    } catch (e) {
      return `❌ Image generation failed: ${e.message}`;
    }
  }
};
