/**
 * OMNI Terminal Manager
 * Created by: lordtarrific
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');

const userCwd = new Map();

class TerminalManager {
  setCwd(userId, cwd) {
    userCwd.set(String(userId), cwd);
  }

  async run(userId, command, cwd = null) {
    const userPath = cwd || userCwd.get(String(userId)) || process.cwd();
    const safeCommand = command.replace(/[;&|`$]/g, ''); // Basic safety

    try {
      const { stdout, stderr } = await execPromise(safeCommand, {
        cwd: userPath,
        timeout: 60000,
        maxBuffer: 1024 * 1024
      });
      return {
        output: (stdout || '') + (stderr ? `\n[stderr] ${stderr}` : ''),
        cwd: userPath
      };
    } catch (error) {
      return {
        output: `Error: ${error.message}\n${error.stderr || ''}`,
        cwd: userPath
      };
    }
  }
}

module.exports = new TerminalManager();
