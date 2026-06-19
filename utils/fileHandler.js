/**
 * OMNI File Handler
 * Created by: lordtarrific
 */

const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');

function isZipFileName(filename = '') {
  return /\.zip$/i.test(String(filename || ''));
}

async function listWorkspaceZips(cwd) {
  const items = await fs.readdir(cwd).catch(() => []);
  const zips = items.filter(f => f.endsWith('.zip'));
  return zips.join('\n') || '(no zip files)';
}

async function saveWhatsappZip(media, cwd) {
  const safeName = String(media.filename || 'upload.zip').replace(/[^a-z0-9._-]/gi, '_');
  const fullPath = path.join(cwd, safeName);
  await fs.writeFile(fullPath, Buffer.from(media.data, 'base64'));
  return { name: safeName, fullPath };
}

async function unzipFile(zipPath, destination) {
  await fs.ensureDir(destination);
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(destination, true);

  // Check if zip has a single root folder and strip it
  const entries = zip.getEntries();
  const rootDirs = new Set();
  for (const entry of entries) {
    const parts = entry.entryName.split('/');
    if (parts.length > 1) rootDirs.add(parts[0]);
  }

  let strippedRoot = null;
  if (rootDirs.size === 1) {
    const root = [...rootDirs][0];
    const rootPath = path.join(destination, root);
    if (await fs.pathExists(rootPath)) {
      const items = await fs.readdir(rootPath);
      for (const item of items) {
        await fs.move(path.join(rootPath, item), path.join(destination, item), { overwrite: true });
      }
      await fs.remove(rootPath);
      strippedRoot = root;
    }
  }

  return { destination, strippedRoot };
}

module.exports = {
  isZipFileName,
  listWorkspaceZips,
  saveWhatsappZip,
  unzipFile
};
