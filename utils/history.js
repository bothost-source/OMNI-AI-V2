/**
 * OMNI Chat History & Memory Manager
 * Created by: lordtarrific
 */

const fs = require('fs-extra');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_DIR = path.join(DATA_DIR, 'history');
const MEMORY_DIR = path.join(DATA_DIR, 'memory');

fs.ensureDirSync(HISTORY_DIR);
fs.ensureDirSync(MEMORY_DIR);

function getUserFile(userId) {
  return path.join(HISTORY_DIR, `${userId}.json`);
}

function getMemoryFile(userId) {
  return path.join(MEMORY_DIR, `${userId}.json`);
}

class HistoryManager {
  getHistory(userId) {
    const file = getUserFile(userId);
    if (fs.existsSync(file)) {
      return fs.readJsonSync(file);
    }
    return { messages: [], profile: {} };
  }

  saveHistory(userId, data) {
    fs.writeJsonSync(getUserFile(userId), data, { spaces: 2 });
  }

  addMessage(userId, role, content) {
    const history = this.getHistory(userId);
    history.messages.push({ role, content: String(content || '').slice(0, 8000), timestamp: Date.now() });
    // Keep last 100 messages
    if (history.messages.length > 100) history.messages = history.messages.slice(-100);
    this.saveHistory(userId, history);
  }

  getMessages(userId, limit = 20) {
    const history = this.getHistory(userId);
    return history.messages.slice(-limit);
  }

  updateProfile(userId, updates) {
    const history = this.getHistory(userId);
    history.profile = { ...history.profile, ...updates };
    this.saveHistory(userId, history);
  }

  addMemory(userId, content, source = 'user') {
    const file = getMemoryFile(userId);
    let memories = [];
    if (fs.existsSync(file)) memories = fs.readJsonSync(file);
    memories.push({ content: String(content || '').slice(0, 1000), source, timestamp: Date.now() });
    if (memories.length > 50) memories = memories.slice(-50);
    fs.writeJsonSync(file, memories, { spaces: 2 });
  }

  formatMemoryContext(userId) {
    const file = getMemoryFile(userId);
    if (!fs.existsSync(file)) return '';
    const memories = fs.readJsonSync(file).slice(-10);
    if (!memories.length) return '';
    return 'User memories:\n' + memories.map(m => `- ${m.content}`).join('\n');
  }
}

module.exports = new HistoryManager();
