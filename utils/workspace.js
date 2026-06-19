/**
 * OMNI Workspace Manager
 * Created by: lordtarrific
 */

const fs = require('fs-extra');
const path = require('path');

const WORKSPACE_ROOT = path.join(process.cwd(), 'workspaces');
fs.ensureDirSync(WORKSPACE_ROOT);

class WorkspaceManager {
  getPath(userId) {
    const wsPath = path.join(WORKSPACE_ROOT, String(userId).replace(/[^a-z0-9_-]/gi, '_'));
    fs.ensureDirSync(wsPath);
    return wsPath;
  }

  async create(userId) {
    const wsPath = this.getPath(userId);
    await fs.ensureDir(wsPath);
    await fs.ensureDir(path.join(wsPath, 'uploads'));
    return wsPath;
  }

  async list(userId) {
    const wsPath = this.getPath(userId);
    const items = await fs.readdir(wsPath).catch(() => []);
    return { cwd: wsPath, items };
  }
}

module.exports = new WorkspaceManager();
