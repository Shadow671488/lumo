'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(ROOT, 'src/renderer/app.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(ROOT, 'src/renderer/index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(ROOT, 'src/renderer/styles.css'), 'utf8');
const discordJs = fs.readFileSync(path.join(ROOT, 'src/main/discord.js'), 'utf8');
const storageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/storage.json'), 'utf8'));

test('Issue 1: Top nav layout, locked searchbar on left, profile button on far right', () => {
  // Searchbar is in normal flex flow on the left
  assert(stylesCss.includes('.search-box-wrapper'), 'search-box-wrapper styled');
  assert(stylesCss.includes('margin-left: auto !important;'), 'user profile button pushed to far right');
  // Setting for searchbar position hidden
  assert(indexHtml.includes('id="setting-search-pos-row" style="display: none !important;"'), 'search position setting hidden in settings UI');
  assert(indexHtml.includes('class="user-profile-nav-btn" id="btn-user-profile"'), 'profile button present in top nav');
  assert(appJs.includes("pos = 'left';"), 'search position locked to left in app.js');
});

test('Issue 2: Shuffle and Repeat buttons glowing icons without background pill', () => {
  // Inactive & hover has transparent background
  assert(stylesCss.includes('background: transparent !important;'), 'shuffle and repeat have transparent background');
  assert(stylesCss.includes('box-shadow: none !important;'), 'oval pill shadow removed');
  // Active arrows have drop-shadow glow
  assert(stylesCss.includes('drop-shadow(0 0 6px var(--md-sys-color-primary'), 'active buttons have illuminated glow filter');
  // Active repeat 1 badge
  assert(stylesCss.includes("#btn-repeat.repeat-one::after"), 'repeat-one has 1 badge');
  assert(/#btn-repeat\.active::after\s*\{\s*display:\s*none;/.test(stylesCss), 'repeat-all hides 1 badge');
  // Active shuffle dot indicator
  assert(stylesCss.includes("#btn-shuffle.active::after"), 'shuffle has active indicator');
  // 3-mode repeat cycling in app.js
  assert(appJs.includes("state.repeatMode = 'all'") && appJs.includes("state.repeatMode = 'one'"), 'repeat button cycles off -> all -> one -> off');
  assert(appJs.includes("el.btnRepeat.classList.toggle('repeat-one', mode === 'one')"), 'repeat-one class toggled for mode one');
});

test('Issue 3: 3-dots Context Menu toggle-close and removed queue/play-next items', () => {
  assert(appJs.includes('if (trackMenuEl && triggerBtn && trackMenuEl._triggerBtn === triggerBtn)'), 'toggle-close check present');
  assert(appJs.includes('menu._triggerBtn = triggerBtn;'), 'triggerBtn saved on menu instance');
  // Play Next and Add to Queue removed from openTrackContextMenu
  assert(!appJs.includes("label: 'Play next',"), 'Play next removed from dots context menu');
  assert(!appJs.includes("label: 'Add to queue',"), 'Add to queue removed from dots context menu');
});

test('Issue 4: Discord Rich Presence error handling, Windows named pipe, and reconnect', () => {
  assert(discordJs.includes("args[0].replace('\\\\\\\\?\\\\pipe\\\\', '\\\\\\\\.\\\\pipe\\\\')"), 'Windows pipe normalized from \\\\?\\pipe\\ to \\\\.\\pipe\\');
  assert(discordJs.includes("rpcClient.on('error'"), 'Socket error handler attached');
  assert(discordJs.includes('clearTimeout(reconnectTimer)'), 'Reconnect timer cleared on playback start');
  assert(discordJs.includes('setActivity'), 'Uses official setActivity method');
});

test('Issue 5: Wavy progress bar hides straight rail line when active', () => {
  assert(appJs.includes('if (!isWavy && showProgressBg && sw > padLeft + padRight)'), 'rail line drawn only when wavy mode is disabled');
  assert.strictEqual(storageJson.riff_wavy_progress, 'false', 'wavy progress defaults to false');
});

test('Issue 6: Playlist header Play button', () => {
  assert(indexHtml.includes('id="btn-play-playlist"'), 'Play button in playlist detail header');
  assert(indexHtml.includes('id="btn-play-playlist-label"'), 'Play button label in playlist detail header');
  assert(appJs.includes('function updatePlaylistPlayButtonState'), 'Playlist play button state updater implemented');
  assert(appJs.includes('setupPlayPlaylistButton'), 'Playlist play button click handler wired');
});

test('Issue 7: Friends system with real nicknames and user registration', () => {
  // Friends not hardcoded dummy users
  assert(!appJs.includes('Listening to Daft Punk - Veridis Quo</div>'), 'Hardcoded dummy friends HTML removed');
  assert(appJs.includes('function getUserFriends'), 'getUserFriends implemented');
  assert(appJs.includes('function saveUserFriends'), 'saveUserFriends implemented');
  assert(appJs.includes('riff_user_friends'), 'friends stored in localStorage');
  assert(appJs.includes('btn-add-friend'), 'add friend button wired');
  assert(appJs.includes('btn-remove-friend'), 'remove friend button wired');
  assert(appJs.includes('DEFAULT_REGISTERED_USERS'), 'default registered users network seeded');
  // User oxeez_ is not taken by default seeded users
  assert(!appJs.includes("username: 'oxeez_'"), 'oxeez_ not seeded as default registered dummy');
  assert(appJs.includes("u.username.toLowerCase() === 'oxeez_'"), 'oxeez_ cleaned from any previous default dummy list');
});

test('Issue 8: Profile customization: bio, unique nickname validation, avatar upload', () => {
  assert(indexHtml.includes('id="profile-edit-modal"'), 'Profile edit modal dialog exists in HTML');
  assert(indexHtml.includes('id="input-profile-nickname"'), 'Nickname input exists');
  assert(indexHtml.includes('id="input-profile-bio"'), 'Bio input exists');
  assert(indexHtml.includes('id="input-profile-avatar-file"'), 'Avatar file input exists');
  assert(appJs.includes('function openProfileEditModal'), 'openProfileEditModal implemented');
  assert(appJs.includes('FileReader'), 'FileReader used to process uploaded avatar data URL');
  assert(appJs.includes('isTaken = registered.some'), 'Unique nickname validation against registered users');
  assert(appJs.includes('getUserAccount'), 'getUserAccount implemented');
  assert(appJs.includes('updateUserNavButton'), 'updateUserNavButton updates top nav avatar & name');
  assert(appJs.includes('window.electronAPI.pickMedia'), 'native media picker supported for avatar upload');
});

test('Issue 9: Pinned song play/pause toggle and clickable title/artist', () => {
  assert(appJs.includes('function updatePinnedPlayButtonState'), 'updatePinnedPlayButtonState implemented');
  assert(appJs.includes('id="btn-play-pinned-track"'), 'Play button for pinned track');
  assert(appJs.includes('id="pinned-track-title"'), 'Pinned track title id');
  assert(appJs.includes('id="pinned-track-artist"'), 'Pinned track artist id');
  assert(appJs.includes('openArtistProfile(pinned.artist)'), 'Pinned track artist click opens artist profile');
});

test('Issue 10: Discover vertical page scroll without carousel hijacking', () => {
  assert(appJs.includes('const isOverHorizontalRow = !!e.target.closest('), 'Cursor position checked before intercepting wheel');
  assert(appJs.includes('if (!isOverHorizontalRow) return;'), 'Allows natural vertical scroll when not hovering over carousel');
});

test('Issue 11: Infinite repeat bug fix and queue progression', () => {
  assert(appJs.includes('if (state._isNaturalEnding && !state.isRepeat)'), 'Stops playback at queue end when repeat is off');
  assert(appJs.includes('state.isPlaying = false;'), 'Sets isPlaying to false when natural ending reached');
  assert(appJs.includes('if (state.queue && state.queue.length > 1 && state.queueIndex > 0)'), 'playPrev navigates previous queue track');
});

test('Issue 12: Discover square cards artist name click opens artist profile', () => {
  assert(stylesCss.includes('.sp-card-artist-link'), 'sp-card-artist-link class styled');
  assert(appJs.includes('subSpan.className = \'sp-card-artist-link\';'), 'sub text wrapped in artist link');
  assert(appJs.includes('openArtistProfile(sub)'), 'artist click handler calls openArtistProfile on spCard');
  assert(appJs.includes('openArtistProfile(track.artist)'), 'artist click handler calls openArtistProfile on sp-tile');
});

test('Issue 13: Show More button renamed and transparent glass styling', () => {
  assert(appJs.includes("'Show More'"), 'Button text set to Show More');
  assert(!appJs.includes("'Load more tracks'"), 'Load more tracks text replaced');
  assert(stylesCss.includes('.btn-search-load-more'), 'btn-search-load-more styled in CSS');
  assert(stylesCss.includes('backdrop-filter: blur(10px);'), 'glass blur effect applied');
});
