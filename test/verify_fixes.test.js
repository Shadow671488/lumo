'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const { startServer, stopServer, getServerToken, upgradeArtworkUrl } = require('../server');

test('Artwork URLs upgrade to high-res', () => {
  assert.strictEqual(
    upgradeArtworkUrl('https://i.ytimg.com/vi/abc12345/hqdefault.jpg?sqp=xyz&rs=123'),
    'https://i.ytimg.com/vi/abc12345/maxresdefault.jpg'
  );
  assert.strictEqual(
    upgradeArtworkUrl('https://img.youtube.com/vi/abc12345/sddefault.jpg'),
    'https://img.youtube.com/vi/abc12345/maxresdefault.jpg'
  );
  assert.strictEqual(
    upgradeArtworkUrl('https://lh3.googleusercontent.com/xyz=w120-h120-l90-rj'),
    'https://lh3.googleusercontent.com/xyz=w1200-h1200-l90-rj'
  );
  assert.strictEqual(
    upgradeArtworkUrl('https://lh3.googleusercontent.com/xyz=s544-c-k-c0x00ffffff-no-rj'),
    'https://lh3.googleusercontent.com/xyz=w1200-h1200-l90-rj'
  );
  assert.strictEqual(
    upgradeArtworkUrl('https://i1.sndcdn.com/artworks-xyz-large.jpg'),
    'https://i1.sndcdn.com/artworks-xyz-t500x500.jpg'
  );
  assert.strictEqual(
    upgradeArtworkUrl('https://i1.sndcdn.com/artworks-xyz-t300x300.jpg'),
    'https://i1.sndcdn.com/artworks-xyz-t500x500.jpg'
  );
  assert.strictEqual(
    upgradeArtworkUrl('https://i1.sndcdn.com/artworks-xyz-t50x50.png'),
    'https://i1.sndcdn.com/artworks-xyz-t500x500.png'
  );
  assert.strictEqual(
    upgradeArtworkUrl('https://is1-ssl.mzstatic.com/image/thumb/Music/100x100bb.jpg'),
    'https://is1-ssl.mzstatic.com/image/thumb/Music/1200x1200bb.jpg'
  );
});

test('Favorites storage is purged to 0 tracks', () => {
  const diskStorage = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/storage.json'), 'utf8'));
  assert.strictEqual(diskStorage.devsize_favorites, '[]');

  const appDataFile = 'C:\\Users\\11\\AppData\\Roaming\\Riff\\storage.json';
  if (fs.existsSync(appDataFile)) {
    const appDataStorage = JSON.parse(fs.readFileSync(appDataFile, 'utf8'));
    assert.strictEqual(appDataStorage.devsize_favorites, '[]');
  }
});

test('Top header search bar removes platform switch and closes top-nav', () => {
  const html = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf8');
  assert(!html.includes('platform-switch-container'), 'platform-switch-container was removed');
  assert(html.includes('id="search-input"'));

  const searchBoxIdx = html.indexOf('class="search-box-wrapper"');
  const appLayoutIdx = html.indexOf('class="app-layout"');
  const segment = html.substring(searchBoxIdx, appLayoutIdx);
  const openDivs = (segment.match(/<div\b/g) || []).length;
  const closeDivs = (segment.match(/<\/div>/g) || []).length;
  // search-box-wrapper + search-box = 2 open divs, but top-nav opened before, so segment closes search-box, search-box-wrapper, top-nav = 3 closes
  assert.strictEqual(closeDivs - openDivs, 1, 'top-nav must be closed before app-layout');
  assert(html.includes('All (YouTube, YouTube Music, Apple Music, SoundCloud)'));
});

test('Sidebar badges and active item styling', () => {
  const css = fs.readFileSync(path.join(__dirname, '../src/renderer/styles.css'), 'utf8');
  assert(css.includes('.nav-badge[data-count="0"]'));
  assert(css.includes('.nav-item.active .nav-badge {'));
  assert(css.includes('transform: scale(0.96);'));
});

test('Image proxy endpoint runs without crashing and serves images', async () => {
  const port = await startServer();
  const token = getServerToken();

  await new Promise((resolve, reject) => {
    http.get(
      `http://127.0.0.1:${port}/api/image-proxy?url=` + encodeURIComponent('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'),
      { headers: { 'X-Riff-Token': token } },
      (res) => {
        try {
          assert.strictEqual(res.statusCode, 200);
          assert.strictEqual(res.headers['content-type'], 'image/jpeg');
          let len = 0;
          res.on('data', chunk => len += chunk.length);
          res.on('end', () => {
            assert(len > 1000, 'Image buffer received');
            resolve();
          });
        } catch (err) {
          reject(err);
        }
      }
    ).on('error', reject);
  });

  await stopServer();
});
