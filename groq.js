/**
 * OMNI - Groq AI Module
 * Real AI responses using Groq API (Llama 3, Mixtral, Gemma)
 * Free tier: 1,500,000 tokens/day
 * Get key: https://console.groq.com/keys
 */

const axios = require('axios');
const formatter = require('./code-formatter');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Check if Groq is properly configured
 */
function isConfigured() {
    return GROQ_API_KEY && GROQ_API_KEY.startsWith('gsk_') && GROQ_API_KEY.length > 20;
}

/**
 * Generate AI response for any message
 */
async function chat(message, senderName = '') {
    if (!isConfigured()) {
        return null;
    }

    try {
        const response = await axios.post(
            GROQ_URL,
            {
                model: 'llama3-70b-8192',
                messages: [
                    {
                        role: 'system',
                        content: `You are OMNI, a helpful AI assistant on WhatsApp created by Kai. 
Respond in a friendly, concise way. Use *bold* for emphasis.
Keep responses under 1000 characters. Be helpful and accurate.`
                    },
                    {
                        role: 'user',
                        content: senderName ? `${senderName}: ${message}` : message
                    }
                ],
                temperature: 0.7,
                max_tokens: 1024
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const rawResponse = response.data.choices[0].message.content;
        const formattedResponse = formatter.reformatResponse(rawResponse);
        return `*OMNI* 🤖\n\n${formattedResponse}`;

    } catch (error) {
        console.error('[GROQ ERROR]', error.response?.data?.error?.message || error.message);
        return null;
    }
}

/**
 * Generate code with explanations
 */
async function code(language, task) {
    if (!isConfigured()) return null;

    try {
        const response = await axios.post(
            GROQ_URL,
            {
                model: 'llama3-70b-8192',
                messages: [
                    {
                        role: 'system',
                        content: `You are a coding expert. Provide clean, well-commented code.
Format: 
━━━━━━ *CODE: LANGUAGE* ━━━━━━
[code]
━━━━━━━━━━━━━━━━━━
[brief explanation]`
                    },
                    {
                        role: 'user',
                        content: `Write ${language} code for: ${task}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 1024
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const rawResponse = response.data.choices[0].message.content;
        const formattedResponse = formatter.reformatResponse(rawResponse);
        return `*OMNI* 🤖\n\n${formattedResponse}`;

    } catch (error) {
        console.error('[GROQ CODE ERROR]', error.response?.data?.error?.message || error.message);
        return null;
    }
}

module.exports = { isConfigured, chat, code };
