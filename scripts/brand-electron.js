'use strict';

// Windows shows the name/icon of the executable file itself in Task Manager
// and the Volume Mixer. In dev (`npm start`) that file is the bundled
// electron.exe, so it appears as "Electron". This script:
//   1. rewrites electron.exe's friendly name + icon to Lumo, and
//   2. creates a sibling "Lumo.exe" (same resources live next to it) that the
//      app is launched through, so Windows reports it as Lumo.exe everywhere.
// It only touches this project's node_modules, is Windows-only, and is
// re-applied automatically after `npm install`.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

if (process.platform !== 'win32') process.exit(0);

function findRcedit() {
  const candidates = [
    ['node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe'],
    ['node_modules', 'rcedit', 'bin', 'rcedit.exe'],
    ['node_modules', 'electron-builder', '.cache', 'rcedit.exe'],
  ];
  for (const parts of candidates) {
    const full = path.join(__dirname, '..', ...parts);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function patch(exe, rcedit, icon) {
  execFileSync(rcedit, [
    exe,
    '--set-icon', icon,
    '--set-version-string', 'FileDescription', 'Lumo',
    '--set-version-string', 'ProductName', 'Lumo',
    '--set-version-string', 'CompanyName', 'Lumo',
    '--set-version-string', 'InternalName', 'Lumo',
    '--set-version-string', 'OriginalFilename', 'Lumo.exe',
  ], { stdio: 'inherit' });
}

try {
  const rcedit = findRcedit();
  if (!rcedit) {
    console.log('[brand] rcedit not found, skipping electron branding');
    process.exit(0);
  }

  let electronExe;
  try {
    electronExe = require('electron');
  } catch (e) {
    console.log('[brand] electron is not installed yet, skipping');
    process.exit(0);
  }
  if (typeof electronExe !== 'string' || !fs.existsSync(electronExe)) {
    console.log('[brand] electron.exe not found, skipping');
    process.exit(0);
  }

  const icon = path.join(__dirname, '..', 'assets', '01-default.ico');
  if (!fs.existsSync(icon)) {
    console.log('[brand] assets/01-default.ico missing, skipping');
    process.exit(0);
  }

  // electron.exe (used by `electron .` and as the template for Lumo.exe)
  try {
    patch(electronExe, rcedit, icon);
    console.log('[brand] electron.exe branded as Lumo');
  } catch (e) {
    console.warn('[brand] could not patch electron.exe:', e.message || e);
  }

  // Lumo.exe — a copy next to electron.exe so it shares the same DLLs,
  // resources and locales. `npm start` launches this file.
  const lumoExe = path.join(path.dirname(electronExe), 'Lumo.exe');
  try {
    const needsCopy = !fs.existsSync(lumoExe) || fs.statSync(lumoExe).mtimeMs < fs.statSync(electronExe).mtimeMs;
    if (needsCopy) {
      fs.copyFileSync(electronExe, lumoExe);
      patch(lumoExe, rcedit, icon);
    }
    console.log('[brand] Lumo.exe ready at', lumoExe);
  } catch (e) {
    console.warn('[brand] could not create/patch Lumo.exe:', e.message || e);
  }
} catch (error) {
  // Never fail install because branding could not be applied. Re-run
  // `npm run brand` after closing the app.
  console.warn('[brand] branding failed:', error.message || error);
}