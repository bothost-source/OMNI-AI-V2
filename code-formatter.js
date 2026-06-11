/**
 * OMNI - Code Formatter
 * Formats code responses in Meta AI style
 */

/**
 * Format code in Meta AI style
 */
function formatMetaCode(code, language) {
    const lang = (language || 'CODE').toUpperCase();
    const cleanCode = code.trim();
    return '━━━━━━ *CODE: ' + lang + '* ━━━━━━\n' + cleanCode + '\n━━━━━━━━━━━━━━━━━━';
}

/**
 * Parse and reformat AI response to ensure Meta AI style
 */
function reformatResponse(response) {
    let formatted = response;

    // Replace markdown code blocks with Meta style
    // Pattern: ```language\ncode\n```
    formatted = formatted.replace(
        /```([a-zA-Z0-9]*)?\n([\s\S]*?)```/g,
        function(match, lang, code) {
            return formatMetaCode(code.trim(), lang || '');
        }
    );

    // Replace inline `code` with *code*
    formatted = formatted.replace(/`([^`]+)`/g, '*$1*');

    return formatted;
}

/**
 * Check if response contains code blocks
 */
function containsCode(response) {
    return response.includes('```') || response.includes('━━━━━━ *CODE');
}

module.exports = {
    formatMetaCode,
    reformatResponse,
    containsCode
};
