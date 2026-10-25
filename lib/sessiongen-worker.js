#!/usr/bin/env node
/**
 * Ladybug Cloud — Session pairing worker
 * Runs against the installed bot directory so it can reuse the bot's Baileys
 * dependency. Emits JSON lines prefixed with "@@" on stdout so the host can
 * stream progress to the browser.
 *
 * Usage: node sessiongen-worker.js <phoneDigits> <authDir> <botDir>
 */
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const [, , phoneRaw, authDir, botDir] = process.argv;
const phone = String(phoneRaw || '').replace(/[^0-9]/g, '');

function emit(obj) {
  process.stdout.write('@@' + JSON.stringify(obj) + '\n');
}
function fail(msg) {
  emit({ type: 'error', message: msg });
  process.exit(1);
}

if (!phone || phone.length < 7) fail('Invalid phone number. Use country code, digits only.');
if (!authDir || !botDir) fail('Missing worker arguments.');

let baileys;
try {
  baileys = require(path.join(botDir, 'node_modules', '@whiskeysockets', 'baileys'));
} catch (e) {
  fail('Baileys is not installed in the bot directory. Ask the admin to run "Install Dependencies".');
}

const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = baileys;

const silentLogger = {
  level: 'silent',
  child: () => silentLogger,
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
};

(async () => {
  fs.mkdirSync(authDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  let version = [2, 3000, 1023223821];
  try {
    const v = await fetchLatestBaileysVersion();
    if (v && v.version) version = v.version;
  } catch (_) {}

  const sock = makeWASocket({
    version,
    auth: state,
    logger: silentLogger,
    printQRInTerminal: false,
    browser: ['Chrome', 'Windows', '10.0'],
    syncFullHistory: false,
    downloadHistory: false,
    markOnlineOnConnect: false,
  });

  let codeRequested = false;
  let attempts = 0;
  let finished = false;

  sock.ev.on('creds.update', saveCreds);

  async function requestCode() {
    if (codeRequested || finished || state.creds.registered) return;
    attempts += 1;
    try {
      const code = await sock.requestPairingCode(phone);
      codeRequested = true;
      emit({ type: 'code', code, phone });
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      if (attempts >= 5) {
        fail('Could not request a pairing code: ' + msg);
      } else {
        emit({ type: 'retry', message: `Waiting for WhatsApp… (attempt ${attempts}/5)` });
        setTimeout(requestCode, 5000);
      }
    }
  }

  // Give the noise handshake time to complete before asking for a code.
  setTimeout(requestCode, 3500);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      emit({ type: 'qr', qr });
      // A QR means the handshake is ready — good moment to request a code.
      if (!codeRequested) requestCode();
    }

    if (connection === 'open') {
      finished = true;
      try {
        await new Promise((r) => setTimeout(r, 1200));
        const credsPath = path.join(authDir, 'creds.json');
        if (!fs.existsSync(credsPath)) throw new Error('creds.json was not written');
        const raw = fs.readFileSync(credsPath);
        const gz = zlib.gzipSync(raw);
        const sessionId = 'Ladybug!' + gz.toString('base64');
        emit({ type: 'ready', sessionId, me: sock.user || null });
        setTimeout(() => process.exit(0), 300);
      } catch (e) {
        fail('Failed to build session: ' + (e && e.message ? e.message : e));
      }
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        fail('This WhatsApp account was logged out. Try again with a fresh code.');
      } else if (!finished && !codeRequested) {
        emit({ type: 'retry', message: 'Reconnecting to WhatsApp…' });
      }
    }
  });

  setTimeout(() => fail('Timed out waiting for WhatsApp. Please try again.'), 180000);
})().catch((e) => fail(e && e.message ? e.message : String(e)));
