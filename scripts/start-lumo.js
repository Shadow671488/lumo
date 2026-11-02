'use strict';

process.noDeprecation = true;
if (process.env.NODE_OPTIONS) {
  const cleaned = process.env.NODE_OPTIONS.replace(/--no-deprecation\b/g, '').trim();
  if (cleaned) {
    process.env.NODE_OPTIONS = cleaned;
  } else {
    delete process.env.NODE_OPTIONS;
  }
} else {
  delete process.env.NODE_OPTIONS;
}

// Clean up any hung or orphaned Lumo processes to avoid lockfile sharing violations (Error code 32)
if (process.platform === 'win32') {
  try {
    const { execSync } = require('child_process');
    execSync('taskkill /f /im Lumo.exe 2>nul & taskkill /f /im electron.exe 2>nul', {
      stdio: 'ignore',
      shell: 'cmd.exe',
      windowsHide: true
    });
  } catch (_) {}
}

// Launches the app through Lumo.exe on Windows so Task Manager and the Windows
// Volume Mixer show "Lumo" (and its icon) instead of "Electron". Falls back to
// the regular electron binary on other platforms or if Lumo.exe is missing.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const appDir = path.join(__dirname, '..');
const extraArgs = process.argv.slice(2);

let exe;
try {
  const electronExe = require('electron'); // absolute path to electron.exe
  const lumoExe = path.join(path.dirname(electronExe), 'Lumo.exe');
  exe = process.platform === 'win32' && fs.existsSync(lumoExe) ? lumoExe : electronExe;
} catch (e) {
  console.error('[start] Could not locate the Electron binary:', e.message || e);
  process.exit(1);
}

const child = spawn(exe, ['--no-deprecation', appDir, ...extraArgs], {
  cwd: appDir,
  stdio: 'inherit',
  windowsHide: false,
});

child.on('error', (err) => {
  console.error('[start] Failed to launch Lumo:', err.message || err);
  process.exit(1);
});
child.on('close', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code == null ? 0 : code);
});
