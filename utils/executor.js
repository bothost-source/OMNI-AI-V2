/**
 * OMNI Safe Command Executor
 * Created by: lordtarrific
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function safeExec(command, options = {}) {
  const { stdout, stderr } = await execPromise(command, {
    cwd: options.cwd || process.cwd(),
    timeout: options.timeout || 120000,
    maxBuffer: options.maxBuffer || 1024 * 1024
  });
  return { stdout, stderr };
}

module.exports = safeExec;
