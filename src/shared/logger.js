const fs = require('fs');
const path = require('path');
const { DATA_DIR } = require('./platform');

const LOG_DIR = path.join(DATA_DIR, 'logs');
const LOG_PATH = path.join(LOG_DIR, 'lumo.log');
const LEGACY_LOG_PATH = path.join(LOG_DIR, 'riff.log');
const MAX_BYTES = 1024 * 1024;

function rotate() {
  try {
    if (fs.existsSync(LOG_PATH) && fs.statSync(LOG_PATH).size > MAX_BYTES) fs.renameSync(LOG_PATH, `${LOG_PATH}.1`);
  } catch (e) {}
}

function log(level, message, stack = null) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    rotate();
    const detail = stack ? `\n${String(stack).slice(0, 4000)}` : '';
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} [${level}] ${String(message).slice(0, 800)}${detail}\n`);
  } catch (e) {}
}

function tail(lines) {
  const all = [];
  for (const file of [LEGACY_LOG_PATH, LOG_PATH]) {
    try { all.push(...fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)); } catch (_) {}
  }
  return all.map((line, index) => ({ line, index, timestamp: Date.parse(line.match(/^\S+/)?.[0] || '') }))
    .sort((a, b) => (a.timestamp - b.timestamp) || (a.index - b.index))
    .slice(-lines)
    .map(item => item.line);
}


module.exports = { log, tail, LOG_DIR };
