/**
 * OMNI Log Manager
 * Created by: lordtarrific
 */

const fs = require('fs-extra');
const path = require('path');

const LOGS_DIR = path.join(process.cwd(), 'data', 'logs');
fs.ensureDirSync(LOGS_DIR);

async function appendLog(userId, action, details = '') {
  const file = path.join(LOGS_DIR, `${userId}.log`);
  const line = `[${new Date().toISOString()}] ${action}: ${String(details).slice(0, 500)}\n`;
  await fs.appendFile(file, line);
}

async function tailLogs(lines = 50) {
  const allLogs = [];
  const files = await fs.readdir(LOGS_DIR).catch(() => []);
  for (const file of files) {
    const content = await fs.readFile(path.join(LOGS_DIR, file), 'utf8').catch(() => '');
    allLogs.push(...content.split('\n').filter(Boolean));
  }
  return allLogs.slice(-lines).join('\n');
}

module.exports = { appendLog, tailLogs };
