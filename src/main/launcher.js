const { app, shell } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const NAME = 'Lumo';
const COMMENT = 'Lumo - music player';
const APP_ID = '';

function winShortcutPath() {
  return path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', `${NAME}.lnk`);
}

function linuxDesktopPath() {
  return path.join(os.homedir(), '.local', 'share', 'applications', 'lumo.desktop');
}

function linuxIconPath() {
  return path.join(os.homedir(), '.local', 'share', 'icons', 'hicolor', '512x512', 'apps', 'lumo.png');
}

function getLauncherInfo() {
  if (process.platform === 'win32') {
    return { platform: 'win32', canInstall: true, installed: fs.existsSync(winShortcutPath()), reason: '' };
  }
  if (process.platform === 'linux') {
    if (!process.env.APPIMAGE) return { platform: 'linux', canInstall: false, installed: false, reason: 'Available when Lumo runs as an AppImage' };
    return { platform: 'linux', canInstall: true, installed: fs.existsSync(linuxDesktopPath()), reason: '' };
  }
  return { platform: process.platform, canInstall: false, installed: false, reason: 'Not supported on this system' };
}

function quoteExec(file) {
  return '"' + file.replace(/(["`$\\])/g, '\\$1').replace(/%/g, '%%') + '"';
}

function installWindows() {
  try {
    fs.mkdirSync(path.dirname(iconDest), { recursive: true });
    fs.writeFileSync(iconDest, fs.readFileSync(path.join(__dirname, '../../assets', '01-default.png')));
    icon = iconDest;
  } catch (e) {}
  const lines = [
    '[Desktop Entry]',
    'Type=Application',
    'Version=1.0',
    `Name=${NAME}`,
    'GenericName=Music Player',
    `Comment=${COMMENT}`,
    `Exec=${quoteExec(image)} %U`,
    `TryExec=${image}`,
    `Icon=${icon}`,
    'Terminal=false',
    'Categories=AudioVideo;Audio;Player;Music;',
    `StartupWMClass=${app.getName()}`,
    'StartupNotify=true',
    ''
  ];
  fs.mkdirSync(path.dirname(desktop), { recursive: true });
  fs.writeFileSync(desktop, lines.join('\n'));
  fs.chmodSync(desktop, 0o755);
  execFile('update-desktop-database', [path.dirname(desktop)], () => {});
  return { ok: true };
}

function installLauncher() {
  let result;
  try {
    const info = getLauncherInfo();
    if (!info.canInstall) return { ok: false, success: false, error: info.reason || 'Cannot install launcher on this system' };
    if (process.platform === 'win32') result = installWindows();
    else if (process.platform === 'linux') result = installLinux();
    else return { ok: false, success: false, error: 'Unsupported platform: ' + process.platform };
  } catch (e) {
    result = { ok: false, error: e.message || String(e) };
  }
  return { ok: !!result.ok, success: !!result.ok, error: result.error || '', path: result.path || '' };
}

module.exports = { getLauncherInfo, installLauncher };


