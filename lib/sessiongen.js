/**
 * Ladybug Cloud — Session generator (pairing code / QR)
 *
 * Spawns the worker against the installed bot directory, tracks job state in
 * memory, and hands back a finished `Ladybug!<base64-gzip>` session id.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const BOT_DIR = process.env.BOT_DIR || path.join(__dirname, '..', 'bots', 'ladybug');
const WORKER = path.join(__dirname, 'sessiongen-worker.js');
const JOB_TTL = 5 * 60 * 1000; // keep finished jobs for 5 minutes
const MAX_JOBS = 40;

const jobs = new Map();

function prune() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL && job.status !== 'pending') {
      cleanup(id);
    }
  }
  if (jobs.size > MAX_JOBS) {
    const oldest = [...jobs.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
    if (oldest) cleanup(oldest[0]);
  }
}

function cleanup(id) {
  const job = jobs.get(id);
  if (!job) return;
  try {
    if (job.proc && !job.proc.killed) job.proc.kill('SIGKILL');
  } catch (_) {}
  try {
    fs.rmSync(job.authDir, { recursive: true, force: true });
  } catch (_) {}
  jobs.delete(id);
}

function publicJob(job) {
  return {
    id: job.id,
    status: job.status, // pending | code | ready | error
    code: job.code || null,
    qr: job.qr || null,
    phone: job.phone,
    sessionId: job.sessionId || null,
    me: job.me || null,
    message: job.message || '',
    createdAt: job.createdAt,
  };
}

function start(phoneRaw) {
  prune();

  const phone = String(phoneRaw || '').replace(/[^0-9]/g, '');
  if (phone.length < 7) {
    const err = new Error('Enter a valid phone number with country code (digits only).');
    err.status = 400;
    throw err;
  }

  const baileysPath = path.join(BOT_DIR, 'node_modules', '@whiskeysockets', 'baileys');
  if (!fs.existsSync(baileysPath)) {
    const err = new Error('Bot dependencies are not installed yet. Ask the admin to run "Install Dependencies".');
    err.status = 409;
    throw err;
  }

  const id = crypto.randomBytes(8).toString('hex');
  const authDir = path.join(os.tmpdir(), `ladybug_pair_${id}`);

  const job = {
    id,
    phone,
    status: 'pending',
    code: null,
    qr: null,
    sessionId: null,
    me: null,
    message: 'Starting WhatsApp pairing...',
    createdAt: Date.now(),
    authDir,
    proc: null,
    buffer: '',
  };
  jobs.set(id, job);

  const proc = spawn(process.execPath, [WORKER, phone, authDir, BOT_DIR], {
    cwd: BOT_DIR,
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  job.proc = proc;

  const handle = (chunk) => {
    job.buffer += chunk.toString();
    const lines = job.buffer.split('\n');
    job.buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('@@')) continue;
      let msg;
      try {
        msg = JSON.parse(line.slice(2));
      } catch (_) {
        continue;
      }
      if (msg.type === 'code') {
        job.status = 'code';
        job.code = msg.code;
        job.message = 'Enter this code in WhatsApp → Linked devices.';
      } else if (msg.type === 'qr') {
        job.qr = msg.qr;
      } else if (msg.type === 'ready') {
        job.status = 'ready';
        job.sessionId = msg.sessionId;
        job.me = msg.me;
        job.message = 'Session generated successfully.';
      } else if (msg.type === 'retry') {
        job.message = msg.message || job.message;
      } else if (msg.type === 'error') {
        job.status = 'error';
        job.message = msg.message || 'Pairing failed.';
      }
    }
  };

  proc.stdout.on('data', handle);
  proc.stderr.on('data', (d) => {
    const text = d.toString();
    // Baileys logs noise to stderr; only surface real failures
    if (/error|invalid|fail/i.test(text) && job.status === 'pending') {
      job.message = text.trim().split('\n')[0].slice(0, 200);
    }
  });

  proc.on('exit', (codeNum) => {
    if (job.status === 'pending' || job.status === 'code') {
      job.status = 'error';
      if (!job.message || job.message.startsWith('Starting')) {
        job.message = `Pairing process exited (code ${codeNum}). Please try again.`;
      }
    }
    try {
      fs.rmSync(authDir, { recursive: true, force: true });
    } catch (_) {}
    job.proc = null;
  });

  return publicJob(job);
}

function get(id) {
  const job = jobs.get(id);
  if (!job) return null;
  return publicJob(job);
}

function cancel(id) {
  const job = jobs.get(id);
  if (!job) return false;
  cleanup(id);
  return true;
}

function activeCount() {
  let n = 0;
  for (const job of jobs.values()) if (job.status === 'pending' || job.status === 'code') n++;
  return n;
}

module.exports = { start, get, cancel, activeCount };
