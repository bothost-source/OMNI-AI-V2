/**
 * OMNI Message Formatter
 * Created by: lordtarrific
 */

function formatMetaCode(code, language = 'JAVASCRIPT') {
  const lines = code.split('\n');
  const maxLen = Math.max(...lines.map(l => l.length), 20);
  const border = '━'.repeat(maxLen + 4);

  let result = `┏${border}┓\n`;
  result += `┃ 📝 ${language.padEnd(maxLen + 1)}┃\n`;
  result += `┣${border}┫\n`;

  for (const line of lines) {
    result += `┃ ${line.padEnd(maxLen + 2)}┃\n`;
  }

  result += `┗${border}┛`;
  return result;
}

function reformatResponse(text) {
  // Convert markdown code blocks to OMNI format
  return text
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return formatMetaCode(code.trim(), (lang || 'CODE').toUpperCase());
    })
    .replace(/\*\*(.*?)\*\*/g, '*$1*')
    .replace(/__(.*?)__/g, '_$1_');
}

module.exports = {
  formatMetaCode,
  reformatResponse
};
