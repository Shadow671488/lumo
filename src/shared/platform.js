const fs = require('fs');
const os = require('os');
const path = require('path');

const IS_WIN = process.platform === 'win32';
const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const legacyDataDir = IS_WIN
  ? path.join(localAppData, 'Riff')
  : process.platform === 'darwin'
  ? path.join(os.homedir(), 'Library', 'Application Support', 'Riff')
  : path.join(os.homedir(), '.cache', 'devsize');
const DEFAULT_DATA_DIR = IS_WIN
  ? path.join(localAppData, 'Lumo')
  : process.platform === 'darwin'
  ? path.join(os.homedir(), 'Library', 'Application Support', 'Lumo')
  : path.join(os.homedir(), '.cache', 'lumo');
const LEGACY_CONFIG_DIR = IS_WIN
  ? path.join(localAppData, 'Riff')
  : process.platform === 'darwin'
  ? path.join(os.homedir(), 'Library', 'Application Support', 'Riff')
  : path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'devsize');
const CONFIG_DIR = IS_WIN
  ? path.join(localAppData, 'Lumo')
  : process.platform === 'darwin'
  ? path.join(os.homedir(), 'Library', 'Application Support', 'Lumo')
  : path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'lumo');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

function renameLegacyDefault(oldDir, newDir) {
  try {
    if (!fs.existsSync(oldDir)) return;
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(path.dirname(newDir), { recursive: true });
      fs.renameSync(oldDir, newDir);
      return;
    }
    // If both brands already have a data folder, fill gaps in Lumo without
    // overwriting current files or deleting the original Riff copy.
    const copyMissing = (from, to) => {
      for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
        const source = path.join(from, entry.name);
        const target = path.join(to, entry.name);
        if (entry.isDirectory()) {
          if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
          if (fs.statSync(target).isDirectory()) copyMissing(source, target);
        } else if (entry.isFile() && !fs.existsSync(target)) {
          fs.copyFileSync(source, target);
        }
      }
    };
    if (fs.statSync(oldDir).isDirectory() && fs.statSync(newDir).isDirectory()) copyMissing(oldDir, newDir);
  } catch (error) { console.warn('Lumo could not rename a legacy Riff data folder:', error.message); }
}
// Keep all existing settings, libraries, and caches by renaming old default folders in place.
renameLegacyDefault(legacyDataDir, DEFAULT_DATA_DIR);
if (LEGACY_CONFIG_DIR !== legacyDataDir) renameLegacyDefault(LEGACY_CONFIG_DIR, CONFIG_DIR);

function readConfig() {
  try {
    let raw;
    try { raw = fs.readFileSync(CONFIG_PATH, 'utf-8'); }
    catch (_) { raw = fs.readFileSync(path.join(LEGACY_CONFIG_DIR, 'config.json'), 'utf-8'); }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function resolveDataDir() {
  const override = process.env.LUMO_DATA_DIR || process.env.RIFF_DATA_DIR;
  if (override && override.trim()) {
    try { return path.resolve(override.trim()); } catch (e) {}
  }
  const configured = readConfig().dataDir;
  if (configured && typeof configured === 'string' && configured.trim()) {
    try {
      const configuredPath = path.resolve(configured.trim());
      if (configuredPath === path.resolve(legacyDataDir)) return DEFAULT_DATA_DIR;
      return configuredPath;
    } catch (e) {}
  }
  return DEFAULT_DATA_DIR;
}

function setDataDir(dir) {
  const cfg = readConfig();
  if (dir && String(dir).trim()) cfg.dataDir = path.resolve(String(dir).trim());
  else delete cfg.dataDir;
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
  return cfg.dataDir || DEFAULT_DATA_DIR;
}

function resolveDownloadDir() {
  const configured = readConfig().downloadDir;
  if (configured && typeof configured === 'string' && configured.trim()) {
    try {
      const configuredPath = path.resolve(configured.trim());
      if (configuredPath === path.resolve(legacyDataDir)) return DEFAULT_DATA_DIR;
      return configuredPath;
    } catch (e) {}
  }
  return null;
}

function setDownloadDir(dir) {
  const cfg = readConfig();
  if (dir && String(dir).trim()) cfg.downloadDir = path.resolve(String(dir).trim());
  else delete cfg.downloadDir;
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
  return cfg.downloadDir || null;
}

const DATA_DIR = resolveDataDir();

const CACHE_DIR = path.join(DATA_DIR, 'tracks');
const CUSTOM_LYRICS_DIR = path.join(DATA_DIR, 'custom-lyrics');
const LYRICS_DIR = path.join(DATA_DIR, 'lyrics');
const THUMBNAILS_DIR = path.join(DATA_DIR, 'thumbnails');
const METADATA_PATH = path.join(DATA_DIR, 'metadata.json');
const LIBRARY_DIR = path.join(DATA_DIR, 'library');
const LIBRARY_PATH = path.join(DATA_DIR, 'library.json');
const BIN_DIR = path.join(DATA_DIR, 'bin');
const TUTORIAL_MARKER = IS_WIN ? 'C:\\Lumo\\.lumotutorial' : path.join(os.homedir(), '.lumotutorial');
const TUTORIAL_MARKER_FALLBACK = path.join(DATA_DIR, '.lumotutorial');
const LEGACY_TUTORIAL_MARKERS = IS_WIN ? ['C:\\Riff\\.rifftutorial', path.join(legacyDataDir, '.rifftutorial')] : [path.join(os.homedir(), '.rifftutorial'), path.join(legacyDataDir, '.rifftutorial')];
const STARTUP_PATH = path.join(DATA_DIR, 'startup.json');
function readStartupConfig() { try { return JSON.parse(fs.readFileSync(STARTUP_PATH, 'utf8')) || {}; } catch (e) { return {}; } }
function writeStartupConfig(patch) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STARTUP_PATH, JSON.stringify({ ...readStartupConfig(), ...patch }));
    return true;
  } catch (e) { return false; }
}
function tutorialDone() { return fs.existsSync(TUTORIAL_MARKER) || fs.existsSync(TUTORIAL_MARKER_FALLBACK) || LEGACY_TUTORIAL_MARKERS.some(file => fs.existsSync(file)); }
function markTutorialDone() {
  for (const file of [TUTORIAL_MARKER, TUTORIAL_MARKER_FALLBACK]) {
    try { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, '1'); return true; } catch (e) {}
  }
  return false;
}

async function copyDirContents(fromDir, toDir, skipNames = new Set(['config.json'])) {
  await fs.promises.mkdir(toDir, { recursive: true });
  const entries = await fs.promises.readdir(fromDir, { withFileTypes: true });
  for (const entry of entries) {
    if (skipNames.has(entry.name)) continue;
    const src = path.join(fromDir, entry.name);
    const dest = path.join(toDir, entry.name);
    if (entry.isDirectory()) await copyDirContents(src, dest, skipNames);
    else if (entry.isFile()) await fs.promises.copyFile(src, dest);
  }
}

async function removeDirContents(dir, skipNames = new Set(['config.json'])) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (skipNames.has(entry.name)) continue;
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await removeDirContents(target, skipNames);
      try { await fs.promises.rmdir(target); } catch (e) {}
    } else if (entry.isFile()) {
      try { await fs.promises.unlink(target); } catch (e) {}
    }
  }
}

function isExecutableFile(p) {
  try {
    fs.accessSync(p, fs.constants.X_OK);
    return fs.statSync(p).isFile();
  } catch (e) {
    return false;
  }
}

function findInPath(name, env = process.env, platform = process.platform) {
  const win = platform === 'win32';
  const dirs = (env.PATH || env.Path || '').split(win ? ';' : ':').filter(Boolean);
  const extra = platform === 'darwin' ? ['/opt/homebrew/bin', '/usr/local/bin'] : [];
  const exts = win ? ['.exe', '.cmd', '.bat', ''] : [''];
  for (const dir of dirs.concat(extra)) {
    for (const ext of exts) {
      const candidate = path.join(dir, name + ext);
      if (isExecutableFile(candidate)) return candidate;
    }
  }
  return null;
}

const binaryCache = {};

function resolveBinary(name) {
  if (name in binaryCache) return binaryCache[name];
  const exe = IS_WIN ? `${name}.exe` : name;
  const envSuffix = name.replace(/[^a-z0-9]/gi, '').toUpperCase();
  const envKey = `LUMO_${envSuffix}`;
  const legacyEnvKey = `RIFF_${envSuffix}`;
  const candidates = [
    process.env[envKey],
    process.env[legacyEnvKey],
    path.join(BIN_DIR, exe),
    process.resourcesPath && path.join(process.resourcesPath, 'bin', exe),
    path.join(__dirname, '../../bin', exe)
  ].filter(Boolean);
  let found = candidates.find(isExecutableFile) || findInPath(name);
  if (!found && !IS_WIN) {
    const local = path.join(os.homedir(), '.local', 'bin', exe);
    if (isExecutableFile(local)) found = local;
  }
  binaryCache[name] = found || null;
  return binaryCache[name];
}

function ytDlpCommand(args) {
  const bin = resolveBinary('yt-dlp');
  if (!bin) {
    throw new Error('yt-dlp not found. Put yt-dlp and ffmpeg into the bin folder next to the app, or add them to PATH.');
  }
  const ffmpeg = resolveBinary('ffmpeg');
  const extra = ffmpeg && !findInPath('ffmpeg') ? ['--ffmpeg-location', path.dirname(ffmpeg)] : [];
  return { bin, args: extra.concat(args) };
}

function clearBinaryCache() {
  Object.keys(binaryCache).forEach((k) => delete binaryCache[k]);
}

module.exports = {
  clearBinaryCache,
  IS_WIN, DATA_DIR, DEFAULT_DATA_DIR, CONFIG_PATH, BIN_DIR, CACHE_DIR, CUSTOM_LYRICS_DIR, LYRICS_DIR, THUMBNAILS_DIR, METADATA_PATH,
  LIBRARY_DIR, LIBRARY_PATH, STARTUP_PATH,
  findInPath, resolveBinary, ytDlpCommand,
  tutorialDone, markTutorialDone,
  readStartupConfig, writeStartupConfig,
  readConfig, resolveDataDir, setDataDir, resolveDownloadDir, setDownloadDir, copyDirContents, removeDirContents
};
