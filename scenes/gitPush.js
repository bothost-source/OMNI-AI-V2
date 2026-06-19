/**
 * OMNI GitHub Push Scene
 * Created by: lordtarrific
 */

const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const pushStates = new Map();

async function handleGitPushText(ctx, text) {
  const userId = ctx.from.id;
  const state = pushStates.get(userId);
  if (!state) return false;

  if (state.step === 'await_url') {
    state.url = text.trim();
    state.step = 'await_token';
    pushStates.set(userId, state);
    await ctx.reply('🔑 Now send your GitHub personal access token (with repo scope):');
    return true;
  }

  if (state.step === 'await_token') {
    state.token = text.trim();
    state.step = 'pushing';
    pushStates.set(userId, state);
    await ctx.reply('⬆️ Pushing to GitHub...');

    try {
      const cwd = state.cwd || path.join(process.cwd(), 'workspaces', userId);
      const remoteUrl = state.url.replace('https://', `https://${state.token}@`);

      await execPromise('git add .', { cwd });
      await execPromise('git commit -m "OMNI auto-commit" || true', { cwd });
      await execPromise(`git remote add origin ${remoteUrl} 2>/dev/null || true`, { cwd });
      await execPromise('git push -u origin main --force', { cwd });

      pushStates.delete(userId);
      await ctx.reply('✅ Pushed to GitHub successfully!');
    } catch (error) {
      pushStates.delete(userId);
      await ctx.reply(`❌ Push failed: ${error.message}`);
    }
    return true;
  }

  return false;
}

async function startGitPush(ctx) {
  const userId = ctx.from.id;
  const workspace = require('../utils/workspace');
  const cwd = workspace.getPath(userId);

  pushStates.set(userId, { step: 'await_url', cwd });
  await ctx.reply('📤 GitHub Push\n\nSend the GitHub repo URL (e.g., https://github.com/username/repo):');
}

module.exports = { handleGitPushText, startGitPush };
