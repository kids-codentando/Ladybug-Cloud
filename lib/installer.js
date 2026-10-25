/**
 * Bot Code Installer
 * Installs / updates the Ladybug Mini bot source into BOT_DIR.
 *  - from GitHub archive (zip)
 *  - from an uploaded zip
 *  - installs npm dependencies
 * Preserves per-bot session folders and node_modules during updates.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');
const AdmZip = require('adm-zip');

const BOT_DIR = process.env.BOT_DIR || path.join(__dirname, '..', 'bots', 'ladybug');
const DEFAULT_REPO_ZIP =
  process.env.BOT_ZIP_URL ||
  'https://github.com/kids-codentando/Ladybug-Mini/archive/refs/heads/main.zip';

const state = {
  installing: false,
  step: 'idle',
  message: '',
  progress: 0,
  lastInstalledAt: null,
  depsInstalling: false,
};

function setState(patch) {
  Object.assign(state, patch);
}

function getState() {
  return { ...state, botDir: BOT_DIR, installed: fs.existsSync(path.join(BOT_DIR, 'index.js')) };
}

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 6) return reject(new Error('Too many redirects'));
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'LadybugCloud-Installer/1.0' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        return download(next, dest, redirects + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(dest)));
      file.on('error', (err) => {
        try {
          fs.unlinkSync(dest);
        } catch (e) {
          /* ignore */
        }
        reject(err);
      });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => req.destroy(new Error('Download timed out')));
  });
}

/** Extract zip buffer, stripping the top-level folder, into BOT_DIR. */
function extractInto(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  if (!entries.length) throw new Error('Zip archive is empty');

  // Detect common top-level prefix (e.g. "Ladybug-Mini-main/")
  const first = entries[0].entryName;
  const slash = first.indexOf('/');
  const prefix = slash > 0 ? first.slice(0, slash + 1) : '';

  fs.mkdirSync(BOT_DIR, { recursive: true });

  let count = 0;
  for (const entry of entries) {
    let name = entry.entryName;
    if (prefix && name.startsWith(prefix)) name = name.slice(prefix.length);
    if (!name) continue;

    // Never overwrite runtime data
    if (name.startsWith('node_modules/')) continue;
    if (/^session_[^/]+\//.test(name)) continue;
    if (name === 'session/' || name.startsWith('session/')) continue;
    if (name.startsWith('data/')) continue;

    const target = path.join(BOT_DIR, name);
    // Path traversal guard
    if (!target.startsWith(path.resolve(BOT_DIR))) continue;

    if (entry.isDirectory) {
      fs.mkdirSync(target, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, entry.getData());
      count += 1;
    }
  }
  return count;
}

async function installFromGitHub(url = DEFAULT_REPO_ZIP) {
  if (state.installing) throw new Error('An installation is already in progress');
  setState({ installing: true, step: 'download', message: 'Downloading bot source...', progress: 10 });

  const tmp = path.join(os.tmpdir(), `ladybug_${Date.now()}.zip`);
  try {
    await download(url, tmp);
    setState({ step: 'extract', message: 'Extracting files...', progress: 45 });
    const buffer = fs.readFileSync(tmp);
    const count = extractInto(buffer);
    setState({
      step: 'done',
      message: `Installed ${count} files from GitHub`,
      progress: 100,
      installing: false,
      lastInstalledAt: new Date().toISOString(),
    });
    return { ok: true, files: count };
  } catch (e) {
    setState({ step: 'error', message: e.message, progress: 0, installing: false });
    throw e;
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch (e) {
      /* ignore */
    }
  }
}

async function installFromBuffer(buffer, filename = 'upload.zip') {
  if (state.installing) throw new Error('An installation is already in progress');
  setState({ installing: true, step: 'extract', message: 'Extracting uploaded archive...', progress: 40 });
  try {
    const count = extractInto(buffer);
    if (!fs.existsSync(path.join(BOT_DIR, 'index.js'))) {
      throw new Error('Archive does not contain index.js — is this the bot source?');
    }
    setState({
      step: 'done',
      message: `Installed ${count} files from ${filename}`,
      progress: 100,
      installing: false,
      lastInstalledAt: new Date().toISOString(),
    });
    return { ok: true, files: count };
  } catch (e) {
    setState({ step: 'error', message: e.message, progress: 0, installing: false });
    throw e;
  }
}

/** Run npm install inside BOT_DIR (long-running, streamed into state). */
function installDependencies() {
  if (state.depsInstalling) return { ok: false, error: 'Dependencies already installing' };
  if (!fs.existsSync(path.join(BOT_DIR, 'package.json'))) {
    return { ok: false, error: 'Bot code not installed yet' };
  }

  setState({ depsInstalling: true, step: 'deps', message: 'Installing npm dependencies...', progress: 5 });

  const proc = spawn('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], {
    cwd: BOT_DIR,
    env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: 'true', PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let out = '';
  const onData = (c) => {
    out += c.toString();
    if (out.length > 4000) out = out.slice(-4000);
    setState({ message: out.split('\n').slice(-3).join(' ').slice(0, 300) });
  };
  proc.stdout.on('data', onData);
  proc.stderr.on('data', onData);

  proc.on('exit', (code) => {
    if (code === 0) {
      setState({ depsInstalling: false, step: 'done', message: 'Dependencies installed', progress: 100 });
    } else {
      setState({ depsInstalling: false, step: 'error', message: `npm install failed (code ${code})`, progress: 0 });
    }
  });

  return { ok: true, started: true };
}

module.exports = {
  BOT_DIR,
  DEFAULT_REPO_ZIP,
  getState,
  installFromGitHub,
  installFromBuffer,
  installDependencies,
};
