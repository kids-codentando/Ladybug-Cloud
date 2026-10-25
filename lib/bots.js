/**
 * Bot Process Manager
 * Spawns one `node index.js` child process per bot instance, each with its own
 * SESSION_ID and session folder. Captures logs in a ring buffer, tracks status,
 * and supports auto-restart.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BOT_DIR = process.env.BOT_DIR || path.join(__dirname, '..', 'bots', 'ladybug');
const MAX_LOG_LINES = 600;

/** botId -> runtime */
const runtimes = new Map();

function emptyRuntime(botId) {
  return {
    botId,
    proc: null,
    status: 'stopped', // stopped | starting | running | stopping | crashed
    pid: null,
    startedAt: null,
    stoppedAt: null,
    exitCode: null,
    logs: [],
    manualStop: false,
    restarts: 0,
    lastError: null,
  };
}

function getRuntime(botId) {
  if (!runtimes.has(botId)) runtimes.set(botId, emptyRuntime(botId));
  return runtimes.get(botId);
}

function pushLog(rt, stream, chunk) {
  const text = chunk.toString();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    rt.logs.push({ t: Date.now(), stream, line: line.slice(0, 2000) });
  }
  if (rt.logs.length > MAX_LOG_LINES) {
    rt.logs.splice(0, rt.logs.length - MAX_LOG_LINES);
  }
}

function botCodeInstalled() {
  return fs.existsSync(path.join(BOT_DIR, 'index.js'));
}

function sessionDirFor(bot) {
  return path.join(BOT_DIR, `session_${bot.id}`);
}

/**
 * Start a bot instance.
 * @param {object} bot  bot record from store
 */
function start(bot) {
  const rt = getRuntime(bot.id);

  if (rt.proc && !rt.proc.killed) {
    return { ok: false, error: 'Bot is already running' };
  }
  if (!botCodeInstalled()) {
    rt.status = 'crashed';
    rt.lastError = 'Bot code is not installed. Ask the admin to install Ladybug Mini.';
    pushLog(rt, 'stderr', `[host] ${rt.lastError}`);
    return { ok: false, error: rt.lastError };
  }
  if (!bot.sessionId) {
    rt.status = 'crashed';
    rt.lastError = 'No session ID configured for this bot.';
    pushLog(rt, 'stderr', `[host] ${rt.lastError}`);
    return { ok: false, error: rt.lastError };
  }

  rt.manualStop = false;
  rt.status = 'starting';
  rt.startedAt = Date.now();
  rt.stoppedAt = null;
  rt.exitCode = null;
  rt.lastError = null;

  const sessionFolder = sessionDirFor(bot);
  try {
    fs.mkdirSync(sessionFolder, { recursive: true });
  } catch (e) {
    /* ignore */
  }

  const env = {
    ...process.env,
    SESSION_ID: bot.sessionId,
    SESSION_NAME: `session_${bot.id}`,
    BOT_NAME: bot.name || 'Ladybug Mini',
    NODE_ENV: process.env.NODE_ENV || 'production',
    TMPDIR: path.join(os.tmpdir(), `ladybug_${bot.id}`),
  };

  pushLog(rt, 'stdout', `[host] Starting "${bot.name}" ...`);

  let proc;
  try {
    proc = spawn(process.execPath, ['index.js'], {
      cwd: BOT_DIR,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    rt.status = 'crashed';
    rt.lastError = e.message;
    pushLog(rt, 'stderr', `[host] spawn failed: ${e.message}`);
    return { ok: false, error: e.message };
  }

  rt.proc = proc;
  rt.pid = proc.pid;
  rt.status = 'running';

  proc.stdout.on('data', (c) => pushLog(rt, 'stdout', c));
  proc.stderr.on('data', (c) => pushLog(rt, 'stderr', c));

  proc.on('error', (err) => {
    rt.status = 'crashed';
    rt.lastError = err.message;
    pushLog(rt, 'stderr', `[host] process error: ${err.message}`);
  });

  proc.on('exit', (code, signal) => {
    rt.exitCode = code;
    rt.pid = null;
    rt.proc = null;
    rt.stoppedAt = Date.now();

    if (rt.manualStop) {
      rt.status = 'stopped';
      pushLog(rt, 'stdout', `[host] Bot stopped (code ${code}).`);
      return;
    }

    rt.status = 'crashed';
    rt.lastError = `Exited with code ${code}${signal ? ` (${signal})` : ''}`;
    pushLog(rt, 'stderr', `[host] Bot crashed: ${rt.lastError}`);

    if (bot.autoRestart !== false && rt.restarts < 5) {
      rt.restarts += 1;
      const delay = Math.min(30000, 3000 * rt.restarts);
      pushLog(rt, 'stdout', `[host] Auto-restart in ${delay / 1000}s (attempt ${rt.restarts}/5)...`);
      setTimeout(() => {
        const store = require('./store');
        const fresh = store.findBotById(bot.id);
        if (fresh && fresh.status !== 'stopped' && !rt.manualStop) start(fresh);
      }, delay);
    }
  });

  return { ok: true, pid: proc.pid };
}

function stop(botId) {
  const rt = getRuntime(botId);
  if (!rt.proc) {
    rt.status = 'stopped';
    return { ok: true, already: true };
  }
  rt.manualStop = true;
  rt.status = 'stopping';
  rt.restarts = 0;
  pushLog(rt, 'stdout', '[host] Stopping bot...');
  try {
    rt.proc.kill('SIGTERM');
    setTimeout(() => {
      if (rt.proc) {
        try {
          rt.proc.kill('SIGKILL');
        } catch (e) {
          /* ignore */
        }
      }
    }, 8000);
  } catch (e) {
    return { ok: false, error: e.message };
  }
  return { ok: true };
}

function restart(bot) {
  stop(bot.id);
  setTimeout(() => start(bot), 1200);
  return { ok: true };
}

function status(botId) {
  const rt = getRuntime(botId);
  return {
    status: rt.status,
    pid: rt.pid,
    startedAt: rt.startedAt,
    stoppedAt: rt.stoppedAt,
    exitCode: rt.exitCode,
    restarts: rt.restarts,
    lastError: rt.lastError,
    running: !!(rt.proc && !rt.proc.killed),
  };
}

function logs(botId, limit = 200) {
  return getRuntime(botId).logs.slice(-limit);
}

function clearLogs(botId) {
  getRuntime(botId).logs = [];
}

function stopAll() {
  for (const rt of runtimes.values()) {
    if (rt.proc) {
      rt.manualStop = true;
      try {
        rt.proc.kill('SIGTERM');
      } catch (e) {
        /* ignore */
      }
    }
  }
}

function runningCount() {
  let n = 0;
  for (const rt of runtimes.values()) if (rt.proc) n += 1;
  return n;
}

module.exports = {
  BOT_DIR,
  start,
  stop,
  restart,
  status,
  logs,
  clearLogs,
  stopAll,
  runningCount,
  botCodeInstalled,
  sessionDirFor,
};
