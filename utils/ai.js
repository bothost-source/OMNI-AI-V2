/**
 * OMNI AI Providers
 * Created by: lordtarrific
 * 
 * Supports: Kimi, Groq, Gemini, Agnes, OmegaTech, Blackbox, DeepSeek
 * Fallback chain: Kimi -> OpenRouter -> Groq -> Gemini -> Agnes -> OmegaTech -> DeepSeek
 */

const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const { requestWithRetry } = require('./httpRetry');

// ── Kimi (Moonshot AI) ──────────────────────────────────
async function askKimi(messages, options = {}) {
  const KIMI_API_KEY = process.env.KIMI_API_KEY;
  const KIMI_API_URL = process.env.KIMI_API_URL || 'https://api.moonshot.cn/v1/chat/completions';
  const KIMI_MODEL = process.env.KIMI_MODEL || 'kimi-k2-6';

  if (!KIMI_API_KEY) throw new Error('KIMI_API_KEY not set');

  const resp = await requestWithRetry(axios, {
    method: 'post',
    url: KIMI_API_URL,
    data: {
      model: options.model || KIMI_MODEL,
      messages: messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
        content: String(m.content || '').slice(0, 12000)
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens || 4096,
      stream: false
    },
    headers: {
      Authorization: `Bearer ${KIMI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 120000
  }, { retries: 2 });

  return resp.data?.choices?.[0]?.message?.content || '';
}

async function askKimiVision(prompt, imageBase64, mimeType = 'image/jpeg', options = {}) {
  const KIMI_API_KEY = process.env.KIMI_API_KEY;
  const KIMI_API_URL = process.env.KIMI_API_URL || 'https://api.moonshot.cn/v1/chat/completions';
  const KIMI_VISION_MODEL = process.env.KIMI_VISION_MODEL || 'kimi-k2-6';

  if (!KIMI_API_KEY) throw new Error('KIMI_API_KEY not set');

  const resp = await requestWithRetry(axios, {
    method: 'post',
    url: KIMI_API_URL,
    data: {
      model: options.model || KIMI_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: String(prompt || '') },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
        ]
      }],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens || 4096
    },
    headers: {
      Authorization: `Bearer ${KIMI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 120000
  }, { retries: 2 });

  return resp.data?.choices?.[0]?.message?.content || '';
}

// ── OpenRouter (Free/Cheap Models) ────────────────────────
async function askOpenRouter(messages, options = {}) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
  const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';

  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set');

  const resp = await requestWithRetry(axios, {
    method: 'post',
    url: OPENROUTER_API_URL,
    data: {
      model: options.model || OPENROUTER_MODEL,
      messages: messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
        content: String(m.content || '').slice(0, 12000)
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens || 4096
    },
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://omni-ai-bot.local',
      'X-Title': 'OMNI AI Bot'
    },
    timeout: 120000
  }, { retries: 2 });

  return resp.data?.choices?.[0]?.message?.content || '';
}

// ── Groq ─────────────────────────────────────────────────
async function askGroq(messages, options = {}) {
  if (!config.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
  const resp = await requestWithRetry(axios, {
    method: 'post',
    url: config.GROQ_API_URL,
    data: {
      model: options.model || config.GROQ_MODEL,
      messages: messages.map(m => ({ role: m.role, content: String(m.content || '').slice(0, 12000) })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens || 4096
    },
    headers: { Authorization: `Bearer ${config.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 120000
  }, { retries: 2 });
  return resp.data?.choices?.[0]?.message?.content || '';
}

async function askGroqVision(prompt, imageBase64, mimeType = 'image/jpeg', options = {}) {
  if (!config.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');
  const resp = await requestWithRetry(axios, {
    method: 'post',
    url: config.GROQ_API_URL,
    data: {
      model: options.model || config.GROQ_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: String(prompt || '') },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
        ]
      }],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens || 4096
    },
    headers: { Authorization: `Bearer ${config.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 120000
  }, { retries: 2 });
  return resp.data?.choices?.[0]?.message?.content || '';
}

// ── Gemini ────────────────────────────────────────────────
async function askGemini(messages, options = {}) {
  if (!config.GEMINIAPIKEY) throw new Error('GEMINI_API_KEY not set');

  // Handle string input gracefully
  if (typeof messages === 'string') {
    messages = [{ role: 'user', content: messages }];
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    messages = [{ role: 'user', content: '' }];
  }

  const genAI = new GoogleGenerativeAI(config.GEMINIAPIKEY);
  const model = genAI.getGenerativeModel({ model: options.model || config.GEMINI_MODEL });

  const chat = model.startChat({
    history: messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }]
    })),
    generationConfig: { temperature: options.temperature ?? 0.7, maxOutputTokens: options.max_tokens || 8192 }
  });

  const lastMsg = messages[messages.length - 1];
  const result = await chat.sendMessage(String(lastMsg?.content || ''));
  return result.response.text();
}

async function askGeminiWithMedia(prompt, media, options = {}) {
  if (!config.GEMINIAPIKEY) throw new Error('GEMINI_API_KEY not set');
  const genAI = new GoogleGenerativeAI(config.GEMINIAPIKEY);
  const model = genAI.getGenerativeModel({ model: options.model || config.GEMINI_VISION_MODEL });

  const parts = [{ text: String(prompt || '') }];
  if (media?.data) {
    parts.push({
      inlineData: {
        mimeType: media.mimetype || 'image/jpeg',
        data: Buffer.isBuffer(media.data) ? media.data.toString('base64') : media.data
      }
    });
  }

  const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
  return result.response.text();
}

async function generateGeminiImage(prompt, media = null, options = {}) {
  if (!config.GEMINIAPIKEY) throw new Error('GEMINI_API_KEY not set');
  const genAI = new GoogleGenerativeAI(config.GEMINIAPIKEY);
  const model = genAI.getGenerativeModel({ model: options.model || config.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash' });

  const parts = [{ text: `Generate an image: ${prompt}` }];
  if (media?.data) {
    parts.push({
      inlineData: {
        mimeType: media.mimetype || 'image/jpeg',
        data: Buffer.isBuffer(media.data) ? media.data.toString('base64') : media.data
      }
    });
  }

  const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
  return {
    text: result.response.text(),
    images: []
  };
}

// ── Agnes AI ──────────────────────────────────────────────
async function askAgnes(messages, options = {}) {
  const AGNES_API_KEY = process.env.AGNES_API_KEY;
  const AGNES_API_URL = process.env.AGNES_API_URL || 'https://apihub.agnes-ai.com/v1/chat/completions';
  const AGNES_MODEL = process.env.AGNES_MODEL || 'agnes-1.5-flash';

  if (!AGNES_API_KEY) throw new Error('Agnes API key not configured');

  try {
    const { data } = await axios.post(AGNES_API_URL, {
      model: AGNES_MODEL,
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      temperature: 0.7,
      max_tokens: 4000
    }, {
      headers: {
        'Authorization': `Bearer ${AGNES_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    });

    return data?.choices?.[0]?.message?.content || data?.response || 'No response from Agnes';
  } catch (error) {
    throw new Error(`Agnes API error: ${error.response?.data?.error?.message || error.message}`);
  }
}


async function generateAgnesImage(prompt, options = {}) {
  if (!config.AGNES_API_KEY) throw new Error('AGNES_API_KEY not set');
  const resp = await requestWithRetry(axios, {
    method: 'post',
    url: config.AGNES_IMAGE_API_URL,
    data: {
      model: options.model || config.AGNES_IMAGE_MODELS?.split(',')[0] || 'agnes-image-1.2',
      prompt: String(prompt || ''),
      n: 1,
      size: options.size || '1024x1024'
    },
    headers: { Authorization: `Bearer ${config.AGNES_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: 120000
  }, { retries: 2 });

  const imageUrl = resp.data?.data?.[0]?.url || resp.data?.url;
  if (!imageUrl) throw new Error('Agnes image generation failed');
  return { type: 'images', images: [{ url: imageUrl }], prompt };
}

// ── OmegaTech / Blackbox ─────────────────────────────────
async function askOmegaTech(prompt, options = {}) {
  const url = options.useBlackbox ? config.BLACKBOX_AI_URL : config.OMEGATECH_AI_URL;
  const resp = await requestWithRetry(axios, {
    method: 'get',
    url: url,
    params: { prompt: String(prompt || ''), model: options.model || config.OMEGATECH_AI_MODEL },
    timeout: 60000,
    validateStatus: () => true
  }, { retries: 1 });

  return resp.data?.result || resp.data?.response || resp.data?.text || JSON.stringify(resp.data);
}

async function askBlackbox(prompt, options = {}) {
  return askOmegaTech(prompt, { ...options, useBlackbox: true });
}

async function askDeepSeek(prompt, options = {}) {
  const resp = await requestWithRetry(axios, {
    method: 'get',
    url: config.OMEGATECH_DEEPSEEK_URL,
    params: { prompt: String(prompt || ''), model: options.model || config.OMEGATECH_DEEPSEEK_MODEL },
    timeout: 60000,
    validateStatus: () => true
  }, { retries: 1 });

  return resp.data?.result || resp.data?.response || resp.data?.text || JSON.stringify(resp.data);
}

// ── Malvryx (DeepSeek-compatible fallback) ───────────────
async function askMalvryx(messages, options = {}) {
  // Try Kimi first, then OpenRouter, then Agnes, then OmegaTech, then return fallback
  if (process.env.KIMI_API_KEY) {
    try { return await askKimi(messages, options); } catch (e) {}
  }
  if (process.env.OPENROUTER_API_KEY) {
    try { return await askOpenRouter(messages, options); } catch (e) {}
  }
  if (config.AGNES_API_KEY) {
    try { return await askAgnes(messages, options); } catch (e) {}
  }
  if (config.GEMINIAPIKEY) {
    try { return await askGemini(messages, options); } catch (e) {}
  }

  // Final fallback
  return JSON.stringify({
    final: "I can't reach my brain rn, pls try again later"
  });
}

// ── Unified AI Interface ─────────────────────────────────
async function askAI(messages, options = {}) {
  const brain = options.brain || 'kimi';

  try {
    switch (brain) {
      case 'kimi':
        if (process.env.KIMI_API_KEY) return await askKimi(messages, options);
        throw new Error('Kimi not configured');
      case 'openrouter':
        if (process.env.OPENROUTER_API_KEY) return await askOpenRouter(messages, options);
        throw new Error('OpenRouter not configured');
      case 'groq':
        if (config.GROQ_API_KEY) return await askGroq(messages, options);
        throw new Error('Groq not configured');
      case 'gemini':
        if (config.GEMINIAPIKEY) return await askGemini(messages, options);
        throw new Error('Gemini not configured');
      case 'agnes':
        if (config.AGNES_API_KEY) return await askAgnes(messages, options);
        throw new Error('Agnes not configured');
      case 'omegatech':
        return await askOmegaTech(messages[messages.length - 1]?.content, options);
      case 'deepseek':
        return await askDeepSeek(messages[messages.length - 1]?.content, options);
      default:
        throw new Error(`Unknown brain: ${brain}`);
    }
  } catch (error) {
    // Fallback chain: Kimi -> OpenRouter -> Groq -> Gemini -> Agnes -> Malvryx
    if (brain !== 'kimi' && process.env.KIMI_API_KEY) {
      try { return await askKimi(messages, options); } catch (e) {}
    }
    if (brain !== 'openrouter' && process.env.OPENROUTER_API_KEY) {
      try { return await askOpenRouter(messages, options); } catch (e) {}
    }
    if (brain !== 'groq' && config.GROQ_API_KEY) {
      try { return await askGroq(messages, options); } catch (e) {}
    }
    if (brain !== 'gemini' && config.GEMINIAPIKEY) {
      try { return await askGemini(messages, options); } catch (e) {}
    }
    if (brain !== 'agnes' && config.AGNES_API_KEY) {
      try { return await askAgnes(messages, options); } catch (e) {}
    }
    return await askMalvryx(messages, options);
  }
}

module.exports = {
  askKimi,
  askKimiVision,
  askOpenRouter,
  askGroq,
  askGroqVision,
  askGemini,
  askGeminiWithMedia,
  askAgnes,
  generateAgnesImage,
  askOmegaTech,
  askBlackbox,
  askDeepSeek,
  askMalvryx,
  askAI,
  generateGeminiImage
};
