const fs = require('fs');
const path = require('path');

const iconSrc = path.join(__dirname, '..', 'assets', 'icon-512x512.png');
const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

const mipmaps = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi'
];

for (const m of mipmaps) {
  const dir = path.join(resDir, m);
  if (fs.existsSync(dir)) {
    fs.copyFileSync(iconSrc, path.join(dir, 'ic_launcher.png'));
    fs.copyFileSync(iconSrc, path.join(dir, 'ic_launcher_round.png'));
    fs.copyFileSync(iconSrc, path.join(dir, 'ic_launcher_foreground.png'));
  }
}

console.log('Copied Lumo icons to all Android mipmap directories!');
