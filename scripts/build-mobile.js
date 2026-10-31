const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const wwwDir = path.join(rootDir, 'www');
const rendererDir = path.join(rootDir, 'src', 'renderer');
const assetsDir = path.join(rootDir, 'assets');
const supabaseSrc = path.join(rootDir, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js');

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('[Mobile Build] Preparing www directory...');
if (fs.existsSync(wwwDir)) {
  fs.rmSync(wwwDir, { recursive: true, force: true });
}
fs.mkdirSync(wwwDir, { recursive: true });

console.log('[Mobile Build] Copying renderer files...');
copyDirRecursive(rendererDir, wwwDir);

console.log('[Mobile Build] Copying assets...');
const wwwAssets = path.join(wwwDir, 'assets');
copyDirRecursive(assetsDir, wwwAssets);

if (fs.existsSync(supabaseSrc)) {
  fs.copyFileSync(supabaseSrc, path.join(wwwAssets, 'supabase.js'));
  console.log('[Mobile Build] Copied Supabase UMD bundle.');
}

console.log('[Mobile Build] Adapting index.html for Android/mobile...');
const indexHtmlPath = path.join(wwwDir, 'index.html');
let html = fs.readFileSync(indexHtmlPath, 'utf8');

// Replace relative paths in HTML
html = html.replace(/\.\.\/\.\.\/assets\//g, './assets/');
html = html.replace(/\.\.\/\.\.\/node_modules\/@supabase\/supabase-js\/dist\/umd\/supabase\.js/g, './assets/supabase.js');

// Add mobile viewport, safe-area meta, and bulletproof electronAPI shim
const mobileHeaderShim = `<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <script>
    window.isCapacitorApp = true;
    window.isMobile = true;
    if (!window.electronAPI) {
      window.electronAPI = new Proxy({}, {
        get: (target, prop) => {
          if (prop === 'isMobile') return true;
          if (prop === 'isCapacitor') return true;
          if (prop === 'platform') return 'android';
          if (prop === 'serverPort') return null;
          if (prop === 'serverToken') return '';
          if (typeof target[prop] !== 'undefined') return target[prop];
          return (...args) => {
            if (typeof prop === 'string' && (prop.startsWith('get') || prop.startsWith('fetch') || prop.startsWith('check'))) {
              return Promise.resolve(null);
            }
            return undefined;
          };
        }
      });
    }
  </script>`;

if (!html.includes('viewport-fit=cover')) {
  html = html.replace(/<head>/i, mobileHeaderShim);
}

// Add is-mobile and hide-titlebar classes to body
html = html.replace(/<body([^>]*)>/i, '<body$1 class="is-mobile hide-titlebar">');
fs.writeFileSync(indexHtmlPath, html, 'utf8');

console.log('[Mobile Build] Adapting styles.css for mobile safe-areas...');
const stylesCssPath = path.join(wwwDir, 'styles.css');
let css = fs.readFileSync(stylesCssPath, 'utf8');
css = css.replace(/\.\.\/\.\.\/assets\//g, './assets/');

const mobileCssAdditions = `
/* Lumo Mobile / Android Safe Area & Touch Styles */
body.is-mobile {
  padding-top: env(safe-area-inset-top, 0px) !important;
  padding-bottom: env(safe-area-inset-bottom, 0px) !important;
  -webkit-touch-callout: none !important;
  -webkit-tap-highlight-color: transparent !important;
  overscroll-behavior-y: none !important;
}
body.is-mobile .titlebar,
body.is-mobile .titlebar-drag-region,
body.is-mobile .titlebar-controls {
  display: none !important;
}
`;
css += mobileCssAdditions;
fs.writeFileSync(stylesCssPath, css, 'utf8');

console.log('[Mobile Build] www bundle ready successfully!');
