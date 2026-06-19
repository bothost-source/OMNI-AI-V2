/**
 * OMNI Access Control & Usage Limits
 * Created by: lordtarrific
 */

const fs = require('fs-extra');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const OWNER_FILE = path.join(DATA_DIR, 'owner.json');

fs.ensureDirSync(DATA_DIR);

class AccessControl {
  constructor() {
    this.DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 100);
    this.users = this.loadUsers();
    this.owner = this.loadOwner();
  }

  loadUsers() {
    if (fs.existsSync(USERS_FILE)) return fs.readJsonSync(USERS_FILE);
    return {};
  }

  saveUsers() {
    fs.writeJsonSync(USERS_FILE, this.users, { spaces: 2 });
  }

  loadOwner() {
    if (fs.existsSync(OWNER_FILE)) return fs.readJsonSync(OWNER_FILE);
    return {};
  }

  saveOwner() {
    fs.writeJsonSync(OWNER_FILE, this.owner, { spaces: 2 });
  }

  async setOwner(data) {
    this.owner = { ...this.owner, ...data };
    this.saveOwner();
  }

  async getOwnerIds() {
    return [this.owner.ownerId, this.owner.devId].filter(Boolean);
  }

  async registerUser(user) {
    const id = String(user.id);
    if (!this.users[id]) {
      this.users[id] = {
        id, username: user.username || '',
        firstName: user.first_name || '', lastName: user.last_name || '',
        registeredAt: Date.now(), usageCount: 0, pushCount: 0,
        banned: false, selectedModel: null
      };
      this.saveUsers();
    }
  }

  async canUse(userId) {
    const user = this.users[String(userId)];
    if (!user) return { allowed: true, remaining: this.DAILY_LIMIT };
    if (user.banned) return { allowed: false, reason: 'banned' };
    if (user.usageCount >= this.DAILY_LIMIT) return { allowed: false, reason: 'limit' };
    return { allowed: true, remaining: this.DAILY_LIMIT - user.usageCount };
  }

  async incrementUsage(userId) {
    const id = String(userId);
    if (!this.users[id]) await this.registerUser({ id });
    this.users[id].usageCount = (this.users[id].usageCount || 0) + 1;
    this.saveUsers();
  }

  async isAdmin(userId) {
    return String(userId) === String(this.owner.ownerId) ||
           String(userId) === String(this.owner.devId);
  }

  async setBan(userId, banned) {
    const id = String(userId);
    if (!this.users[id]) await this.registerUser({ id });
    this.users[id].banned = banned;
    this.saveUsers();
  }

  async resetUser(userId) {
    const id = String(userId);
    if (this.users[id]) {
      this.users[id].usageCount = 0;
      this.users[id].pushCount = 0;
      this.saveUsers();
    }
  }

  async setModel(userId, model) {
    const id = String(userId);
    if (!this.users[id]) await this.registerUser({ id });
    this.users[id].selectedModel = model;
    this.saveUsers();
  }

  async getModel(userId, defaultModel) {
    const user = this.users[String(userId)];
    return user?.selectedModel || defaultModel;
  }

  async listUsers() {
    return Object.values(this.users);
  }

  async getWorkspaceFiles(userId) {
    const workspace = require('./workspace');
    const wsPath = workspace.getPath(userId);
    const items = await fs.readdir(wsPath).catch(() => []);
    return { cwd: wsPath, items };
  }
}

module.exports = new AccessControl();
