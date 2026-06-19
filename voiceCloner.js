// voiceCloner.js - Voice & TTS
const axios = require('axios');

async function fetchGoogleTtsAudio(text, lang = 'en') {
  const chunks = [];
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  let current = '';

  for (const word of words) {
    if (`${current} ${word}`.trim().length > 180 && current) {
      chunks.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) chunks.push(current);

  const buffers = [];
  for (const chunk of chunks.slice(0, 3)) {
    const { data } = await axios.get(`https://translate.google.com/translate_tts`, {
      params: { ie: 'UTF-8', client: 'tw-ob', tl: lang, q: chunk, ttsspeed: 1 },
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://translate.google.com/'
      }
    });
    buffers.push(Buffer.from(data));
  }
  return Buffer.concat(buffers);
}

module.exports = {
  async handleCommand(ctx, args) {
    return `🎙️ Voice Features

To use voice:
1. Say "say <text>" for text-to-speech
2. Send a voice note with "clone my voice"

⚠️ Voice cloning requires ElevenLabs API key.`;
  },

  // Export TTS function for server.js to use
  async generateTTS(text, lang = 'en') {
    return await fetchGoogleTtsAudio(text, lang);
  }
};
