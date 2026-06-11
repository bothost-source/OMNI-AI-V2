/**
 * OMNI - Code Formatter
 * Formats code responses in Meta AI style
 * 
 * Meta AI Style:
 * ━━━━━━ *CODE: JAVASCRIPT* ━━━━━━
 * function hello() {
 *     console.log("Hello World");
 * }
 * ━━━━━━━━━━━━━━━━━━
 * 
 * This function ensures ALL code responses follow this format
 */

/**
 * Format code in Meta AI style
 * @param {string} code - The raw code string
 * @param {string} language - Programming language (javascript, python, etc.)
 * @returns {string} - Formatted code block
 */
function formatMetaCode(code, language = '') {
    const lang = language.toUpperCase() || 'CODE';
    const cleanCode = code.trim();

    return `━━━━━━ *CODE: ${lang}* ━━━━━━
${cleanCode}
━━━━━━━━━━━━━━━━━━`;
}

/**
 * Parse and reformat AI response to ensure Meta AI style
 * @param {string} response - Raw AI response that may contain markdown code blocks
 * @returns {string} - Response with Meta AI style formatting
 */
function reformatResponse(response) {
    // Replace markdown code blocks ```language with Meta style
    let formatted = response;

    // Pattern 1: ```language
code
```
    formatted = formatted.replace(
        /```(\w+)?
([\s\S]*?)```/g,
        (match, lang, code) => {
            return formatMetaCode(code.trim(), lang || '');
        }
    );

    // Pattern 2: ```
code
``` (no language specified)
    formatted = formatted.replace(
        /```
([\s\S]*?)```/g,
        (match, code) => {
            return formatMetaCode(code.trim(), '');
        }
    );

    // Pattern 3: Inline `code` → keep as is or convert to *code*
    formatted = formatted.replace(/`([^`]+)`/g, '*$1*');

    return formatted;
}

/**
 * Check if response contains code blocks
 */
function containsCode(response) {
    return /```/.test(response) || /━━━━━━ \*CODE/.test(response);
}

/**
 * Extract code from response and reformat
 */
function extractAndFormat(response, language = '') {
    // If response already has Meta format, return as is
    if (response.includes('━━━━━━ *CODE')) {
        return response;
    }

    // If response has markdown code blocks, convert them
    if (response.includes('```')) {
        return reformatResponse(response);
    }

    // If it's just raw code, wrap it
    return formatMetaCode(response, language);
}

module.exports = {
    formatMetaCode,
    reformatResponse,
    containsCode,
    extractAndFormat
};
