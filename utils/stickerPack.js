/**
 * OMNI Sticker Pack Manager
 * Created by: lordtarrific
 * Merged version — best of both implementations
 */

const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');

const STICKER_PACK_DIR = path.join(process.cwd(), 'data', 'sticker-pack');
const MAX_STICKERS = Number(process.env.STICKER_PACK_MAX_FILES || 250);

// In-memory cache for fast random access
const stickers = [];
let cacheInitialized = false;

function stickerHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function ensureStickerPackDir() {
  await fs.ensureDir(STICKER_PACK_DIR);
}

async function pruneStickerPack() {
  const entries = (await fs.readdir(STICKER_PACK_DIR, { withFileTypes: true }).catch(() => []))
    .filter((entry) => entry.isFile() && /\.webp$/i.test(entry.name))
    .map((entry) => path.join(STICKER_PACK_DIR, entry.name));
  if (entries.length <= MAX_STICKERS) return;

  const withStats = await Promise.all(entries.map(async (filePath) => ({
    filePath,
    mtimeMs: (await fs.stat(filePath)).mtimeMs
  })));
  withStats
    .sort((a, b) => a.mtimeMs - b.mtimeMs)
    .slice(0, Math.max(0, withStats.length - MAX_STICKERS))
    .forEach((entry) => fs.unlink(entry.filePath).catch(() => {}));
}

async function initCache() {
  if (cacheInitialized) return;
  await ensureStickerPackDir();
  const entries = (await fs.readdir(STICKER_PACK_DIR, { withFileTypes: true }).catch(() => []))
    .filter((entry) => entry.isFile() && /\.webp$/i.test(entry.name))
    .map((entry) => ({
      hash: entry.name.replace(/\.webp$/i, ''),
      path: path.join(STICKER_PACK_DIR, entry.name),
      createdAt: Date.now()
    }));
  stickers.length = 0;
  stickers.push(...entries);
  cacheInitialized = true;
}

async function saveSticker(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data || '', 'base64');
  if (!buffer.length) return { hash: '', path: '' };
  await ensureStickerPackDir();
  const hash = stickerHash(buffer);
  const filePath = path.join(STICKER_PACK_DIR, `${hash}.webp`);

  if (!(await fs.pathExists(filePath))) {
    await fs.writeFile(filePath, buffer);
    await pruneStickerPack();
  }

  // Update in-memory cache
  const existing = stickers.find(s => s.hash === hash);
  if (!existing) {
    stickers.push({ hash, path: filePath, createdAt: Date.now() });
  }

  return { hash, path: filePath };
}

async function getRandomSticker(excludeHash = '') {
  await initCache();
  const candidates = stickers.filter((s) => s.hash !== excludeHash);
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function getAllStickers() {
  return [...stickers];
}

module.exports = {
  saveSticker,
  getRandomSticker,
  getAllStickers,
  STICKER_PACK_DIR,
  stickerHash
};
