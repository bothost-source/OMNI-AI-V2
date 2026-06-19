/**
 * OMNI Console Capture
 * Created by: lordtarrific
 */

const fs = require('fs-extra');
const path = require('path');

const CAPTURE_DIR = path.join(process.cwd(), 'data', 'captures');
fs.ensureDirSync(CAPTURE_DIR);

const captures = new Map();

function append(userId, text) {
  const id = String(userId);
  const current = captures.get(id) || '';
  captures.set(id, current + String(text) + '\n');
}

async function saveScreenshot(userId, filePath) {
  const content = captures.get(String(userId)) || '[No console output captured]';
  const targetPath = filePath || path.join(CAPTURE_DIR, `console-${userId}-${Date.now()}.txt`);
  await fs.writeFile(targetPath, content);
  return { path: targetPath, type: 'text' };
}

function get(userId) {
  return captures.get(String(userId)) || '';
}

function clear(userId) {
  captures.delete(String(userId));
}

module.exports = { append, get, clear, saveScreenshot };
