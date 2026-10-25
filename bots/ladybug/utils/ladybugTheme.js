/**
 * Ladybug Theme — shared visual language for every Ladybug Mini command.
 * Made under Ntandomods
 *
 * Every command that talks to the user should build its reply with these
 * helpers so the whole bot feels like one product: same frame, same icons,
 * same signature footer.
 */

const config = require('../config');

const BUG = '🐞';
const BAR_FULL = '▰';
const BAR_EMPTY = '▱';
const FRAME = '──────────────────';

/** Icons used across commands, kept in one place so they stay consistent. */
const ICON = {
  bug: '🐞',
  ping: '🏓',
  bolt: '⚡',
  clock: '⏱️',
  dna: '🧬',
  robot: '🤖',
  leaf: '🌿',
  sparkle: '✨',
  crown: '👑',
  tag: '🏷️',
  chart: '📊',
  ram: '🧠',
  cpu: '⚙️',
  disk: '💾',
  net: '📡',
  fire: '🔥',
  ok: '✅',
  warn: '⚠️',
  cross: '❌',
  wing: '🪽',
  spot: '🔴',
  honey: '🍯',
};

/**
 * Top of a themed box.
 * @param {string} title
 * @returns {string}
 */
function header(title) {
  return `╭───「 ${BUG} *${String(title).toUpperCase()}* 」───╮`;
}

/**
 * Bottom of a themed box plus the brand signature.
 * @param {string} [note] optional one-line note above the signature
 * @returns {string}
 */
function footer(note) {
  let out = `╰${FRAME}╯`;
  if (note) out += `\n${note}`;
  out += `\n> ${BUG} *${config.botName || 'Ladybug Mini'}* • ${config.brand || 'Ntandomods'}`;
  return out;
}

/** A labelled row inside the box. */
function row(icon, label, value) {
  return `│ ${icon} *${label}:* ${value}`;
}

/** A row with no label, just content. */
function line(text) {
  return `│ ${text}`;
}

/** Horizontal separator inside the box. */
function divider() {
  return `├${FRAME}┤`;
}

/** Empty spacer row. */
function blank() {
  return '│';
}

/**
 * Text progress bar.
 * @param {number} value
 * @param {number} max
 * @param {number} [size]
 * @returns {string} e.g. ▰▰▰▰▰▱▱▱▱▱ 50%
 */
function bar(value, max, size = 10) {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const filled = Math.round(ratio * size);
  const body = BAR_FULL.repeat(filled) + BAR_EMPTY.repeat(size - filled);
  return `${body} ${Math.round(ratio * 100)}%`;
}

/** Bar with the bug marking the current position. */
function bugBar(value, max, size = 10) {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const pos = Math.min(size - 1, Math.max(0, Math.round(ratio * (size - 1))));
  let out = '';
  for (let i = 0; i < size; i += 1) {
    if (i === pos) out += BUG;
    else out += i < pos ? BAR_FULL : BAR_EMPTY;
  }
  return `${out} ${Math.round(ratio * 100)}%`;
}

/** Random element of an array. */
function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** Random integer between min and max inclusive. */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Stable 0..1 pseudo-random value derived from a string (a user JID, etc).
 * Same input always gives the same result, so "your spots" never change
 * between two messages.
 */
function hashRatio(input) {
  const str = String(input || 'ladybug');
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** "2d 4h 12m 8s" from seconds. */
function humanDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (secs || !parts.length) parts.push(`${secs}s`);
  return parts.join(' ');
}

/** Milliseconds as a short human string. */
function humanMs(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Bytes as MB/GB. */
function humanBytes(bytes) {
  const mb = bytes / 1024 / 1024;
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

/**
 * A verdict word + emoji for a latency figure, so ping/speed read like
 * something a person wrote rather than a raw number.
 */
function latencyVerdict(ms) {
  if (ms < 80) return { text: 'Blazing — wings barely moved', icon: '🔥' };
  if (ms < 200) return { text: 'Snappy little bug', icon: '⚡' };
  if (ms < 500) return { text: 'Cruising along', icon: '🌿' };
  if (ms < 1200) return { text: 'Crawling, but alive', icon: '🐌' };
  return { text: 'Stuck in the honey jar', icon: '🍯' };
}

/** The full signature line, for commands that do not use a box. */
function signature() {
  return `> ${BUG} *${config.botName || 'Ladybug Mini'}* • ${config.brand || 'Ntandomods'}`;
}

module.exports = {
  BUG,
  ICON,
  header,
  footer,
  row,
  line,
  divider,
  blank,
  bar,
  bugBar,
  pick,
  randInt,
  hashRatio,
  humanDuration,
  humanMs,
  humanBytes,
  latencyVerdict,
  signature,
};
