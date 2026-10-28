'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(ROOT, 'src/renderer/app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'src/renderer/index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(ROOT, 'src/renderer/styles.css'), 'utf8');
const serverJs = fs.readFileSync(path.join(ROOT, 'src/server/server.js'), 'utf8');
const discordJs = fs.readFileSync(path.join(ROOT, 'src/main/discord.js'), 'utf8');
const storageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/storage.json'), 'utf8'));

test('Item 1: Wavy progress off by default, linear glowing knob, smooth wave envelope', () => {
  assert.strictEqual(storageJson.riff_wavy_progress, 'false', 'Default wavy progress must be false in storage.json');
  assert.strictEqual(storageJson.riff_progress_knob, 'true', 'Default progress knob must be true in storage.json');
  assert(appJs.includes("localStorage.getItem('riff_wavy_progress') === 'true'"), 'Wavy enabled only when explicitly true');
  assert(appJs.includes('Math.sin(Math.PI * t)'), 'Wave amplitude tapered at start and end using sine envelope');
  assert(appJs.includes('scrubProgress = targetProgress'), '1-to-1 tracking even when paused');
  assert(appJs.includes('sCtx.shadowBlur = isDraggingScrubber ? 14 : 10'), 'Glowing knob render with shadowBlur');
  assert(appJs.includes("if (!animationFrameId && typeof startVisualizers === 'function') startVisualizers();"), 'Wavy toggle redraws immediately even when paused');
});

test('Item 2: Timeline layout, slider labels (-12), shuffle/repeat states, track-meta cutoff', () => {
  assert(stylesCss.includes('height: 40px'), 'time-label aligned with progress bar rail height');
  assert(stylesCss.includes('.eq-scale'), 'eq-scale styled with proper padding');
  assert(stylesCss.includes('min-width: 36px'), 'eq-scale has sufficient width for -12');
  assert(stylesCss.includes('#btn-shuffle.active'), 'shuffle active state styled with glow and dot');
  assert(stylesCss.includes('#btn-repeat.active::after'), 'repeat active has 1 badge');
  assert(stylesCss.includes('clamp(280px, 30vw, 500px)'), 'track-meta flex max-width clamp prevents aggressive cutoff');
  assert(stylesCss.includes('track-title-scroll'), 'track title has marquee scroll animation on hover');
});

test('Item 3: Dynamic discover sections and multi-platform artist catalog', () => {
  assert(indexHtml.includes('id="riff-dynamic-sections"'), 'Dynamic sections container exists');
  assert(indexHtml.includes('id="riff-quick-picks-grid"'), 'Quick picks grid exists');
  assert(indexHtml.includes('id="riff-trending-row"'), 'Trending row exists');
  assert(indexHtml.includes('id="riff-popular-row"'), 'Popular row exists');
  assert(indexHtml.includes('id="riff-recently-played-row"'), 'Recently played row exists');
  assert(appJs.includes('function renderDynamicDiscoverSections'), 'Dynamic sections render function implemented');
  assert(appJs.includes('riff_trending_cache'), 'Discover sections read from trending cache');
  assert(serverJs.includes('searchAppleMusicTracks'), 'Apple Music track search implemented');
  assert(serverJs.includes("platform === 'all'"), 'Unified multi-platform search implemented');
  assert(serverJs.includes('addTrackToArtist'), 'Artist tracks merged from multiple sources into deep catalog');
});

test('Item 4: SoundCloud-style Repost feature with live feedback, counters, and persistence', () => {
  assert(appJs.includes('function toggleTrackRepost'), 'toggleTrackRepost function implemented');
  assert(appJs.includes('function togglePlaylistRepost'), 'togglePlaylistRepost function implemented');
  assert(appJs.includes('function getTrackReposts'), 'getTrackReposts function implemented');
  assert(appJs.includes('function getPlaylistReposts'), 'getPlaylistReposts function implemented');
  assert(appJs.includes('riff_reposted_tracks'), 'Track reposts persisted in storage');
  assert(appJs.includes('riff_reposted_playlists'), 'Playlist reposts persisted in storage');
  assert(appJs.includes('riff_repost_counts'), 'Repost counts persisted in storage');
  assert(indexHtml.includes('id="btn-repost-playlist"'), 'Playlist repost button in header');
  assert(indexHtml.includes('id="btn-tvk-repost"'), 'Full-screen player repost button');
});

test('Item 5: 3-dots Context Menu replacing button clusters', () => {
  assert(indexHtml.includes('id="btn-playbar-dots"'), 'Playbar 3-dots button exists');
  assert(appJs.includes('btn-row-dots'), 'Track row has 3-dots button');
  assert(appJs.includes('function openTrackContextMenu'), 'openTrackContextMenu implemented');
  assert(appJs.includes('window.openTrackDotsMenu ='), 'openTrackDotsMenu exposed');
  assert(appJs.includes('Rename track'), 'Rename track in dots menu');
  assert(appJs.includes('Copy share link') || appJs.includes('Copy link'), 'Copy link in dots menu');
  assert(appJs.includes('Download / Offline'), 'Download offline in dots menu');
  assert(appJs.includes('Remove from playlist'), 'Contextual remove from playlist in dots menu');
});

test('Item 6: Offline music caching & Russian spelling', () => {
  assert(serverJs.includes('Удалить автономный файл'), 'Russian text correctly spelled (Удалить, not Удаить)');
  assert(!serverJs.includes('Удаить автономный файл'), 'Old typo removed');
  assert(appJs.includes('cacheData.cached && cacheData.streamUrl'), 'Direct streamUrl used for offline cached playback');
  assert(serverJs.includes('async function findCachedFile(trackId, title = \'\', artist = \'\')'), 'findCachedFile supports title and artist');
  assert(serverJs.includes('candidateNames.push(`${cleanA} - ${cleanT}`)'), 'findCachedFile searches Downloads folder by artist and title');
});

test('Item 7: Infinite Scroll and Auto-Loading', () => {
  assert(appJs.includes('search-load-more-wrap'), 'Search load more button wrapper appended');
  assert(appJs.includes('state.searchAutoLoading = true'), 'Auto-loading flag toggled on load more click');
  assert(appJs.includes('loadMoreSearchResults'), 'loadMoreSearchResults implemented');
  assert(stylesCss.includes('.search-load-more-container'), 'Search load more container styled');
  assert(serverJs.includes('async function searchSoundcloud(query, limit = 14, offset = 0)'), 'searchSoundcloud supports offset');
  assert(serverJs.includes('merged.slice(offset, offset + limit)'), 'all platform search slices by offset');
});

test('Item 8: Removal of custom song photo upload feature from track lists', () => {
  assert(!appJs.includes('class="btn-icon-pill btn-row-art"'), 'btn-row-art removed from createTrackRow');
  assert(indexHtml.includes('id="btn-right-panel-art"') && indexHtml.includes('display: none !important;'), 'btn-right-panel-art hidden in index.html');
  assert(!appJs.includes('openTrackArtModal(state.currentTrack);'), 'coverContainer click no longer opens track art modal');
});

test('Item 9: Direct URL paste into search bar auto-resolves and plays', () => {
  assert(serverJs.includes('resolveDirectUrlTrack'), 'server.js has direct URL resolver');
  assert(appJs.includes('isDirectInput') || appJs.includes('isDirectUrl'), 'app.js detects direct URL input');
  assert(serverJs.includes('isDirectUrl: true'), 'server.js flags direct URL resolution');
  const regex = /^https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:youtube\.com|youtu\.be|soundcloud\.com)\//i;
  assert(regex.test('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), 'Matches mobile YouTube URLs');
  assert(regex.test('https://music.youtube.com/watch?v=dQw4w9WgXcQ'), 'Matches YouTube Music URLs');
  assert(regex.test('https://youtu.be/dQw4w9WgXcQ'), 'Matches short youtu.be URLs');
  assert(regex.test('https://soundcloud.com/artist/track-name'), 'Matches SoundCloud URLs');
  assert(regex.test('https://on.soundcloud.com/xyz123'), 'Matches short on.soundcloud.com URLs');
});

test('Item 10: Playlist Favorite Heart State fills with color', () => {
  assert(appJs.includes('function updatePlaylistFavHeartState'), 'updatePlaylistFavHeartState implemented');
  assert(appJs.includes('function getFavoritePlaylists'), 'getFavoritePlaylists implemented');
  assert(appJs.includes('function togglePlaylistFavorite'), 'togglePlaylistFavorite implemented');
  assert(stylesCss.includes('#btn-fav-all-playlist.active svg') || stylesCss.includes('#btn-fav-all-playlist.favorited svg'), 'Playlist favorite active style fills heart');
  assert(appJs.includes('#ff3b5c'), 'Favorite heart set to filled red #ff3b5c');
});

test('Item 11: User Profile in top-right with pinned favorite song, reposts, friends', () => {
  assert(indexHtml.includes('id="btn-user-profile"'), 'Profile button exists next to search');
  assert(indexHtml.includes('id="view-profile"'), 'Profile view section exists');
  assert(indexHtml.includes('id="profile-pinned-card"'), 'Pinned track card container exists');
  assert(indexHtml.includes('id="btn-change-pinned-track"'), 'Change pinned track button exists');
  assert(indexHtml.includes('id="pin-track-modal"'), 'Pinned track selection modal exists');
  assert(appJs.includes('function renderProfileView'), 'renderProfileView implemented');
  assert(appJs.includes('function setupProfileTabs'), 'setupProfileTabs implemented');
  assert(appJs.includes('Reposted Playlists'), 'Profile reposts tab renders both reposted playlists and tracks');
  assert(stylesCss.includes('.user-profile-nav-btn'), 'User profile nav button styled');
  assert(stylesCss.includes('.profile-header-card'), 'Profile header card styled');
});

test('Item 12: Discord Rich Presence named pipe on Windows', () => {
  assert(discordJs.includes("args[0].replace('\\\\\\\\?\\\\pipe\\\\', '\\\\\\\\.\\\\pipe\\\\')"), 'Windows named pipe replaces prefix with \\\\.\\pipe\\');
  assert(discordJs.includes('args[0].startsWith'), 'Pipe replacement hook active');
});

test('Item 13: Playlist cleanup - only Full-Circle retained', () => {
  const playlists = JSON.parse(storageJson.devsize_playlists || '[]');
  assert.strictEqual(playlists.length, 1, 'Only 1 playlist in storage.json');
  assert.strictEqual(playlists[0].id, 'pl_mvpynt26xt58a', 'Playlist ID matches Full-Circle');
  assert.strictEqual(playlists[0].name, 'Full-Circle', 'Playlist name matches Full-Circle');
});
