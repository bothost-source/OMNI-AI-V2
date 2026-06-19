require('dotenv').config();

/**
 * OMNI Bot Configuration v4.1.0
 * Merged: Base config + Security & Feature modules
 * Created by: lordtarrific
 */

const CONFIG = {
    // ═══════════════════════════════════════════════════════════
    // CORE IDENTITY
    // ═══════════════════════════════════════════════════════════
    botName: 'OMNI',
    botCreator: 'lordtarrific',
    botVersion: '4.1.0',

    // ═══════════════════════════════════════════════════════════
    // OWNER & ADMIN (Hardened)
    // ═══════════════════════════════════════════════════════════
    OWNER_NUMBER: process.env.OWNER_NUMBER || '2349121747036',
    OWNER_PASSCODE: process.env.OWNER_PASSCODE || 'OMNI2024SECURE',
    ADMIN_ID: Number.parseInt(process.env.ADMIN_ID || '0', 10),
    
    // Legacy support (mapped to new structure)
    get OWNER_ID() { return this.OWNER_NUMBER; },
    
    ALLOWED_USER_ID: process.env.ALLOWED_USER_ID,
    DEFAULT_ALLOWED_WHATSAPP_JIDS: '30065542856938@lid,30065542856938@s.whatsapp.net,30065542856938@lid',
    ALLOWED_WHATSAPP_JIDS: process.env.ALLOWED_WHATSAPP_JIDS || process.env.ALLOWED_JIDS || process.env.ALLOWED_USER_ID || '',
    ADMIN_WHATSAPP_JIDS: process.env.ADMIN_WHATSAPP_JIDS || process.env.OWNER_JIDS || '30065542856938@lid',
    OWNER_LIMIT_NOTIFY_JID: process.env.OWNER_LIMIT_NOTIFY_JID || process.env.OWNER_JID || '',

    // ═══════════════════════════════════════════════════════════
    // SECURITY MODULE (NEW)
    // ═══════════════════════════════════════════════════════════
    SECURITY: {
        MAX_ATTEMPTS: Number.parseInt(process.env.SECURITY_MAX_ATTEMPTS || '3', 10),
        LOCKOUT_DURATION: Number.parseInt(process.env.SECURITY_LOCKOUT_DURATION || '3600000', 10), // 1 hour
        PASSCODE_REQUIRED_COMMANDS: [
            'restart', 'shutdown', 'eval', 'exec', 
            'setowner', 'broadcast', 'cleardb'
        ],
        JAILBREAK_PROTECTION: true,
        BACKEND_EXPOSURE_PREVENTION: true,
    },

    // ═══════════════════════════════════════════════════════════
    // WHATSAPP SESSION
    // ═══════════════════════════════════════════════════════════
    WHATSAPP_SESSION_NAME: process.env.WHATSAPP_SESSION_NAME || 'omni-bot',
    WHATSAPP_PAIRING_NUMBER: process.env.WHATSAPP_PAIRING_NUMBER || process.env.PAIRING_NUMBER || '',
    browserName: process.env.WHATSAPP_BROWSER_NAME || 'Chrome',
    logLevel: process.env.WHATSAPP_LOG_LEVEL || 'silent',

    // ═══════════════════════════════════════════════════════════
    // AI APIs
    // ═══════════════════════════════════════════════════════════
    
    // -- Gemini --
    GEMINIAPIKEY: process.env.GEMINIAPIKEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    GEMINI_25_FLASH_MODEL: process.env.GEMINI_25_FLASH_MODEL || process.env.GEMINI_2_5_FLASH_MODEL || 'gemini-2.5-flash',
    GEMINI_3_FLASH_PREVIEW_MODEL: process.env.GEMINI_3_FLASH_PREVIEW_MODEL || process.env.GEMINI_3_FLASH_MODEL || 'gemini-3-flash-preview',
    GEMINI_VISION_MODEL: process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    GEMINI_IMAGE_MODEL: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
    GEMINI_ENABLE_GOOGLE_SEARCH: process.env.GEMINI_ENABLE_GOOGLE_SEARCH === 'true',

    // -- Groq --
    GROQ_API_KEY: process.env.GROQ_API_KEY || process.env.GROK_API_KEY || '',
    GROQ_MODEL: process.env.GROQ_MODEL || process.env.GROK_MODEL || 'llama-3.3-70b-versatile',
    GROQ_VISION_MODEL: process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
    GROQ_API_URL: process.env.GROQ_API_URL || process.env.GROK_API_URL || 'https://api.groq.com/openai/v1/chat/completions',

    // -- OmegaTech --
    OMEGATECH_AI_URL: process.env.OMEGATECH_AI_URL || 'https://omegatech-api.dixonomega.tech/api/ai/Qwen-Claude-Haiku',
    BLACKBOX_AI_URL: process.env.BLACKBOX_AI_URL || 'https://omegatech-api.dixonomega.tech/api/ai/Blackbox',
    OMEGATECH_HAIKU_URL: process.env.OMEGATECH_HAIKU_URL || 'https://omegatech-api.dixonomega.tech/api/ai/Qwen-Claude-Haiku',
    OMEGATECH_CLAUDE_URL: process.env.OMEGATECH_CLAUDE_URL || 'https://omegatech-api.dixonomega.tech/api/ai/Claude',
    OMEGATECH_DEEPSEEK_URL: process.env.OMEGATECH_DEEPSEEK_URL || 'https://omegatech-api.dixonomega.tech/api/ai/Deepseek',
    OMEGATECH_DEEPSEEK_MODEL: process.env.OMEGATECH_DEEPSEEK_MODEL || 'v32',
    OMEGATECH_AI_MODEL: process.env.OMEGATECH_AI_MODEL || 'claude',
    OMEGATECH_AI_MAX_CHARS: Number.parseInt(process.env.OMEGATECH_AI_MAX_CHARS || '3900', 10),
    BLACKBOX_AI_MAX_CHARS: Number.parseInt(process.env.BLACKBOX_AI_MAX_CHARS || '12000', 10),
    IMAGE_FALLBACK_BASE_URL: process.env.IMAGE_FALLBACK_BASE_URL || 'https://omegatech-api.dixonomega.tech/api/ai',
    OMEGATECH_LLAMA_CODER_URL: process.env.OMEGATECH_LLAMA_CODER_URL || 'https://omegatech-api.dixonomega.tech/api/ai/llamacoder',
    OMEGATECH_IMAGE_CONVERTER_URL: process.env.OMEGATECH_IMAGE_CONVERTER_URL || 'https://omegatech-api.dixonomega.tech/api/tools/Image-converter',
    OMEGATECH_ANIME_URL: process.env.OMEGATECH_ANIME_URL || 'https://omegatech-api.dixonomega.tech/api/Anime/Anoboy',
    OMEGATECH_REMUSIC_URL: process.env.OMEGATECH_REMUSIC_URL || 'https://omegatech-api.dixonomega.tech/api/ai/Remusic-ai',
    OMEGATECH_VIDBOX_URL: process.env.OMEGATECH_VIDBOX_URL || 'https://omegatech-api.dixonomega.tech/api/movie/Vidbox',
    OMEGATECH_APPLEMUSIC_URL: process.env.OMEGATECH_APPLEMUSIC_URL || 'https://omegatech-api.dixonomega.tech/api/Search/Applemusic',

    // -- Agnes AI --
    AGNES_API_KEY: process.env.AGNES_API_KEY || '',
    AGNES_API_URL: process.env.AGNES_API_URL || 'https://apihub.agnes-ai.com/v1/chat/completions',
    AGNES_MODELS_URL: process.env.AGNES_MODELS_URL || 'https://apihub.agnes-ai.com/v1/models',
    AGNES_IMAGE_API_URL: process.env.AGNES_IMAGE_API_URL || 'https://apihub.agnes-ai.com/v1/images/generations',
    AGNES_VIDEO_API_URL: process.env.AGNES_VIDEO_API_URL || 'https://apihub.agnes-ai.com/v1/videos',
    AGNES_VIDEO_RESULT_URL_TEMPLATE: process.env.AGNES_VIDEO_RESULT_URL_TEMPLATE || 'https://apihub.agnes-ai.com/v1/videos/{id}',
    AGNES_MODEL: process.env.AGNES_MODEL || 'agnes-1.5-flash',
    AGNES_TEXT_MODELS: process.env.AGNES_TEXT_MODELS || 'agnes-1.5-flash,agnes-1.5-pro',
    AGNES_IMAGE_MODELS: process.env.AGNES_IMAGE_MODELS || 'agnes-image-1.2',
    AGNES_VIDEO_MODELS: process.env.AGNES_VIDEO_MODELS || 'agnes-video-v1.2',

    // ═══════════════════════════════════════════════════════════
    // DOWNLOAD & MEDIA APIs
    // ═══════════════════════════════════════════════════════════
    YTS_SEARCH_API_URL: process.env.YTS_SEARCH_API_URL || 'https://abhi-api.vercel.app/api/search/yts',
    PRIYANSH_DOWNLOAD_API_URL: process.env.PRIYANSH_DOWNLOAD_API_URL || process.env.PRIYANSHI_DOWNLOAD_API_URL || 'https://dev-priyanshi.onrender.com/api/alldl',
    POPCAT_LYRICS_URL: process.env.POPCAT_LYRICS_URL || 'https://api.popcat.xyz/v2/lyrics',

    // -- TMDB (NEW) --
    TMDB_API_KEY: process.env.TMDB_API_KEY || '',
    TMDB_BASE_URL: 'https://api.themoviedb.org/3',
    TMDB_IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500',

    // ═══════════════════════════════════════════════════════════
    // VISION & SCRAPE
    // ═══════════════════════════════════════════════════════════
    VISION_SCRAPE_MODEL: process.env.VISION_SCRAPE_MODEL || process.env.GEMINI_3_FLASH_PREVIEW_MODEL || process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
    VISION_SCRAPE_HTTP_ENABLED: process.env.VISION_SCRAPE_HTTP_ENABLED !== 'false',
    VISION_SCRAPE_PORT: Number.parseInt(process.env.VISION_SCRAPE_PORT || process.env.PORT || '8000', 10),
    VISION_SCRAPE_MAX_CHARS: Number.parseInt(process.env.VISION_SCRAPE_MAX_CHARS || '12000', 10),

    // ═══════════════════════════════════════════════════════════
    // TTS & VOICE (Merged + Fixed)
    // ═══════════════════════════════════════════════════════════
    TTS: {
        // Google TTS
        LANG: process.env.TTS_LANG || 'en-US',
        TLD: process.env.TTS_TLD || 'com',
        VOICE: process.env.TTS_VOICE || 'Kore',  // Options: Kore, Puck, Fenrir, Leda, Orus
        GOOGLE_API_KEY: process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_API_KEY || '',
        GOOGLE_VOICE: process.env.GOOGLE_TTS_VOICE || 'en-US-Neural2-F',
        GOOGLE_GENDER: process.env.GOOGLE_TTS_GENDER || 'FEMALE',
        GOOGLE_SPEAKING_RATE: Number.parseFloat(process.env.GOOGLE_TTS_SPEAKING_RATE || '1.02'),
        GOOGLE_PITCH: Number.parseFloat(process.env.GOOGLE_TTS_PITCH || '0'),
        
        // Voice Note Settings (NEW - WhatsApp compatible)
        NOTE_FORMAT: 'ogg',
        NOTE_CODEC: 'libopus',
        NOTE_BITRATE: '128k',
        NOTE_MIMETYPE: 'audio/ogg; codecs=opus',
    },

    // ═══════════════════════════════════════════════════════════
    // VOICE / CALL
    // ═══════════════════════════════════════════════════════════
    ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY || '',
    CALL_VOICE_ENABLED: process.env.CALL_VOICE_ENABLED !== 'false',

    // ═══════════════════════════════════════════════════════════
    // STICKER MODULE (NEW)
    // ═══════════════════════════════════════════════════════════
    STICKERS: {
        REPLY_ENABLED: process.env.STICKER_REPLY_ENABLED !== 'false',
        RANDOM_REPLY: process.env.STICKER_RANDOM_REPLY !== 'false',
        PACK_PATH: process.env.STICKER_PACK_PATH || './stickers/',
        MAX_STICKERS: Number.parseInt(process.env.STICKER_MAX_COUNT || '100', 10),
        TRIGGER_CHANCE: Number.parseFloat(process.env.STICKER_TRIGGER_CHANCE || '0.3'), // 30% chance
    },

    // ═══════════════════════════════════════════════════════════
    // FEATURE FLAGS
    // ═══════════════════════════════════════════════════════════
    FEATURES: {
        PASSCODE_AUTH: true,
        STICKER_REPLIES: true,
        VOICE_NOTE_FIX: true,
        TMDB_UPCOMING: true,
        FILE_UPLOAD_SERVER: true,
        CLEAN_MESSAGE_EDIT: true,      // Edit instead of spam
        WHATSAPP_CODE_TEMPLATE: true,  // Send code via template
        JAILBREAK_PROTECTION: true,
        BACKEND_EXPOSURE_PREVENTION: true,
    }
};

module.exports = { CONFIG };
