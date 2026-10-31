'use strict';
const path = require('path');
const { spawn } = require('child_process');

process.env.LUMO_MOBILE = '1';
const startLumo = path.join(__dirname, 'start-lumo.js');
const child = spawn(process.execPath, [startLumo, '--mobile'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  windowsHide: false,
});
child.on('close', (code) => process.exit(code || 0));
