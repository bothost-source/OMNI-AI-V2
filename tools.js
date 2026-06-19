/**
 * OMNI Agent Tools
 * Created by: lordtarrific
 * 
 * Available tools for the AI agent to use
 */

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const archiver = require('archiver');
const FormData = require('form-data');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// ── Tool Definitions ──────────────────────────────────────
const tools = [
  {
    name: 'exec',
    description: 'Execute a terminal command',
    parameters: {
      type: 'object',
      properties: { command: { type: 'string', description: 'Shell command to run' } },
      required: ['command']
    }
  },
  {
    name: 'listFiles',
    description: 'List files in a directory',
    parameters: {
      type: 'object',
      properties: { dir: { type: 'string' }, maxFiles: { type: 'number' } },
      required: ['dir']
    }
  },
  {
    name: 'readFile',
    description: 'Read contents of a file',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' }, maxChars: { type: 'number' } },
      required: ['path']
    }
  },
  {
    name: 'writeFile',
    description: 'Write content to a file',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' }, content: { type: 'string' } },
      required: ['path', 'content']
    }
  },
  {
    name: 'zipAndUpload',
    description: 'Zip a directory and upload to Gofile',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path']
    }
  },
  {
    name: 'sendFile',
    description: 'Send a file path reference',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path']
    }
  },
  {
    name: 'createWorkTree',
    description: 'Create a project worktree with multiple files',
    parameters: {
      type: 'object',
      properties: {
        rootDir: { type: 'string' },
        files: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } } } }
      },
      required: ['rootDir', 'files']
    }
  },
  {
    name: 'unzipFile',
    description: 'Extract a zip file',
    parameters: {
      type: 'object',
      properties: { zipPath: { type: 'string' }, destination: { type: 'string' } },
      required: ['zipPath', 'destination']
    }
  },
  {
    name: 'webSearch',
    description: 'Search the web',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query']
    }
  },
  {
    name: 'fetchUrl',
    description: 'Fetch content from a URL',
    parameters: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url']
    }
  },
  {
    name: 'scrapeSite',
    description: 'Scrape a website',
    parameters: {
      type: 'object',
      properties: { url: { type: 'string' }, maxDepth: { type: 'number' } },
      required: ['url']
    }
  },
  {
    name: 'deepScrape',
    description: 'Deep scrape a website for APIs and endpoints',
    parameters: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url']
    }
  },
  {
    name: 'screenshot',
    description: 'Take a screenshot of a webpage',
    parameters: {
      type: 'object',
      properties: { url: { type: 'string' }, path: { type: 'string' }, fullPage: { type: 'boolean' } },
      required: ['url']
    }
  },
  {
    name: 'findAPIs',
    description: 'Find API endpoints in a scraped site',
    parameters: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url']
    }
  },
  {
    name: 'generateImage',
    description: 'Generate an image from a prompt',
    parameters: {
      type: 'object',
      properties: { prompt: { type: 'string' }, width: { type: 'number' }, height: { type: 'number' } },
      required: ['prompt']
    }
  },
  {
    name: 'consoleScreenshot',
    description: 'Save console output as file',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path']
    }
  },
  {
    name: 'deployToNetlify',
    description: 'Deploy a website folder to Netlify and get a live URL. No account needed.',
    parameters: {
      type: 'object',
      properties: { 
        path: { type: 'string', description: 'Path to the website folder to deploy' }
      },
      required: ['path']
    }
  }
];

// ── Tool Implementations ──────────────────────────────────
async function execTool(command, sendFeedback) {
  if (sendFeedback) await sendFeedback(`Running: ${command}`);
  try {
    const { stdout, stderr } = await execPromise(command, { timeout: 120000, maxBuffer: 1024 * 1024 });
    return { output: stdout || '', error: stderr || '', success: true };
  } catch (error) {
    return { output: '', error: error.message, success: false };
  }
}

async function listFilesTool(dir, maxFiles = 50, sendFeedback) {
  if (sendFeedback) await sendFeedback(`Listing files in: ${dir}`);
  const items = await fs.readdir(dir).catch(() => []);
  return { files: items.slice(0, maxFiles), total: items.length };
}

async function readFileTool(filePath, maxChars = 10000, sendFeedback) {
  if (sendFeedback) await sendFeedback(`Reading: ${filePath}`);
  const content = await fs.readFile(filePath, 'utf8').catch(() => '[File not found or unreadable]');
  return { content: content.slice(0, maxChars), path: filePath };
}

async function writeFileTool(filePath, content, sendFeedback) {
  if (sendFeedback) await sendFeedback(`Writing: ${filePath}`);
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content);
  return { path: filePath, saved: true };
}

async function createWorkTree(rootDir, files, sendFeedback) {
  if (sendFeedback) await sendFeedback(`Creating worktree at: ${rootDir}`);
  await fs.ensureDir(rootDir);
  const createdFiles = [];
  const skippedFiles = [];

  for (const file of files) {
    const fullPath = path.join(rootDir, file.path);
    await fs.ensureDir(path.dirname(fullPath));

    // Validate content - skip empty files but log them
    const content = String(file.content || '');
    if (!content.trim() || content.trim().length < 10) {
      skippedFiles.push(file.path);
      // Write a placeholder so the file exists but mark it as incomplete
      await fs.writeFile(fullPath, `<!-- ${file.path} - Content was empty, needs to be generated -->
`);
      continue;
    }

    await fs.writeFile(fullPath, content);
    createdFiles.push(file.path);
  }

  if (skippedFiles.length > 0 && sendFeedback) {
    await sendFeedback(`⚠️ ${skippedFiles.length} file(s) had empty content and need regeneration: ${skippedFiles.join(', ')}`);
  }

  return { rootDir, files: createdFiles, fileCount: createdFiles.length, stage: 'await_update', skipped: skippedFiles };
}

async function createZipArchive(sourcePath, outputPath = null, sendFeedback) {
  if (sendFeedback) await sendFeedback('Creating zip archive...');

  // Verify source exists
  if (!(await fs.pathExists(sourcePath))) {
    throw new Error(`Source path does not exist: ${sourcePath}`);
  }

  const targetPath = outputPath || path.join(path.dirname(sourcePath), `${path.basename(sourcePath)}.zip`);

  // Ensure parent directory exists
  await fs.ensureDir(path.dirname(targetPath));

  // Check if source has any files
  const stats = await fs.stat(sourcePath);
  if (stats.isDirectory()) {
    const files = await fs.readdir(sourcePath);
    if (files.length === 0) {
      throw new Error('Source directory is empty. Nothing to zip.');
    }
  }

  const output = fs.createWriteStream(targetPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    let finalized = false;
    let closed = false;
    let result = null;

    const checkComplete = () => {
      if (finalized && closed && result) {
        resolve(result);
      }
    };

    output.on('close', () => {
      closed = true;
      checkComplete();
    });

    archive.on('finish', () => {
      finalized = true;
      result = { path: targetPath, size: archive.pointer() };
      checkComplete();
    });

    archive.on('error', (err) => {
      reject(new Error(`Archive error: ${err.message}`));
    });

    output.on('error', (err) => {
      reject(new Error(`Write stream error: ${err.message}`));
    });

    archive.pipe(output);

    if (stats.isDirectory()) {
      archive.directory(sourcePath, false);
    } else {
      archive.file(sourcePath, { name: path.basename(sourcePath) });
    }

    archive.finalize();
  });
}

async function uploadFileToGofile(filePath, sendFeedback) {
  if (sendFeedback) await sendFeedback('Uploading to Gofile...');

  try {
    // Get best server using current API
    const { data: serverData } = await axios.get('https://api.gofile.io/servers', { timeout: 10000 });
    const server = serverData.data?.servers?.[0]?.name || serverData.data?.server;

    if (!server) {
      throw new Error('GoFile: No upload server available');
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const { data } = await axios.post(`https://${server}.gofile.io/contents/uploadfile`, form, {
      headers: form.getHeaders(),
      timeout: 300000, // 5 minutes for large files
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    if (data.status !== 'ok') {
      throw new Error(`GoFile upload failed: ${data.status}`);
    }

    return { 
      url: data.data?.downloadPage || data.data?.pageUrl, 
      directUrl: data.data?.directLink || data.data?.downloadUrl,
      fileId: data.data?.fileId,
      code: data.data?.code
    };
  } catch (error) {
    console.error('[GoFile] Upload error:', error.message);
    if (error.response) {
      console.error('[GoFile] Response:', error.response.data);
    }
    throw new Error(`GoFile upload failed: ${error.message}`);
  }
}

async function zipAndUpload(sourcePath, sendFeedback) {
  const zipResult = await createZipArchive(sourcePath, null, sendFeedback);

  // Verify ZIP was actually created
  if (!zipResult?.path || !(await fs.pathExists(zipResult.path))) {
    throw new Error('ZIP archive was not created. The source directory may be empty or inaccessible.');
  }

  const upload = await uploadFileToGofile(zipResult.path, sendFeedback);
  await fs.unlink(zipResult.path).catch(() => {});
  return { type: 'url', url: upload.url };
}

async function sendFile(filePath, sendFeedback) {
  if (sendFeedback) await sendFeedback(`Preparing file: ${filePath}`);
  return { path: filePath, type: 'file' };
}

async function unzipFileTool(zipPath, destination, sendFeedback) {
  if (sendFeedback) await sendFeedback(`Extracting: ${zipPath}`);
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(destination, true);
  return { destination, extracted: true };
}

async function webSearch(query, sendFeedback) {
  if (sendFeedback) await sendFeedback(`Searching: ${query}`);
  // Use DuckDuckGo lite or similar
  try {
    const { data } = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 30000
    });
    return { results: data.slice(0, 5000), query };
  } catch (e) {
    return { error: e.message, query };
  }
}

async function fetchUrl(url, sendFeedback) {
  if (sendFeedback) await sendFeedback(`Fetching: ${url}`);
  const { data } = await axios.get(url, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
  return { content: typeof data === 'string' ? data.slice(0, 10000) : JSON.stringify(data).slice(0, 10000), url };
}

async function scrapeSite(url, maxDepth = 2, sendFeedback) {
  if (sendFeedback) await sendFeedback(`Scraping: ${url}`);
  const cheerio = require('cheerio');
  const { data } = await axios.get(url, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
  const $ = cheerio.load(data);
  const links = [];
  $('a[href]').each((_, el) => links.push($(el).attr('href')));
  return { title: $('title').text(), links: links.slice(0, 100), text: $('body').text().slice(0, 5000) };
}

async function deepScrape(url, options = {}, sendFeedback) {
  if (sendFeedback) await sendFeedback(`Deep scraping: ${url}`);
  return scrapeSite(url, 3, sendFeedback);
}

async function screenshot(url, savePath = null, fullPage = false, sendFeedback) {
  if (sendFeedback) await sendFeedback(`Taking screenshot of: ${url}`);
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  const targetPath = savePath || path.join(process.cwd(), `screenshot-${Date.now()}.png`);
  await page.screenshot({ path: targetPath, fullPage });
  await browser.close();
  return { path: targetPath, url };
}

async function findAPIs(url, sendFeedback) {
  if (sendFeedback) await sendFeedback(`Finding APIs at: ${url}`);
  const result = await scrapeSite(url, 1, sendFeedback);
  const apiPatterns = result.links.filter(l => /api|graphql|rest|swagger|openapi/i.test(l));
  return { apis: apiPatterns, url };
}

async function generateImage(args, sendFeedback) {
  const prompt = args.prompt || args;
  if (sendFeedback) await sendFeedback(`Generating image: ${prompt}`);
  const encodedPrompt = encodeURIComponent(prompt + ', high quality, detailed');
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${args.width || 1024}&height=${args.height || 1024}&nologo=true`;
  return { type: 'images', images: [{ url: imageUrl }], prompt };
}



// ── Netlify Deploy (Free, No Account Required) ─────────────────

async function deployToNetlify(sitePath, sendFeedback) {
  if (sendFeedback) await sendFeedback('Deploying to Netlify...');

  const { execFile } = require('child_process');
  const util = require('util');
  const execFileAsync = util.promisify(execFile);

  // Check if netlify-cli is installed
  try {
    await execFileAsync('netlify', ['--version']);
  } catch (e) {
    if (sendFeedback) await sendFeedback('Installing Netlify CLI...');
    try {
      await execFileAsync('npm', ['install', '-g', 'netlify-cli'], { timeout: 120000 });
    } catch (installErr) {
      throw new Error('Netlify CLI not available. Install with: npm install -g netlify-cli');
    }
  }

  try {
    // Deploy with anonymous flag (no account needed, 1-hour claim window)
    const { stdout, stderr } = await execFileAsync('netlify', [
      'deploy',
      '--dir', sitePath,
      '--allow-anonymous',
      '--json'
    ], { timeout: 120000, maxBuffer: 1024 * 1024 });

    const result = JSON.parse(stdout);

    return {
      url: result.deploy_url || result.url,
      adminUrl: result.admin_url,
      siteId: result.site_id,
      deployId: result.deploy_id,
      claimUrl: result.claim_url
    };
  } catch (error) {
    // Fallback: try with npx if global install failed
    try {
      const { stdout } = await execFileAsync('npx', [
        'netlify-cli',
        'deploy',
        '--dir', sitePath,
        '--allow-anonymous',
        '--json'
      ], { timeout: 180000, maxBuffer: 1024 * 1024 });

      const result = JSON.parse(stdout);
      return {
        url: result.deploy_url || result.url,
        adminUrl: result.admin_url,
        siteId: result.site_id,
        deployId: result.deploy_id,
        claimUrl: result.claim_url
      };
    } catch (npxErr) {
      throw new Error(`Netlify deploy failed: ${error.message}. ${npxErr.message}`);
    }
  }
}

module.exports = {
  tools,
  execTool,
  listFilesTool,
  readFileTool,
  writeFileTool,
  zipAndUpload,
  sendFile,
  createWorkTree,
  createZipArchive,
  uploadFileToGofile,
  deployToNetlify,
  unzipFileTool,
  webSearch,
  fetchUrl,
  scrapeSite,
  deepScrape,
  screenshot,
  findAPIs,
  generateImage
};
