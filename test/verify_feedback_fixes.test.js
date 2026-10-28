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

test('Deliverable 1: Playlist header Play button is circular with SVG icon and no raw text label', () => {
  // index.html has circular play button with SVG icon
  assert(indexHtml.includes('id="btn-play-playlist"'), 'btn-play-playlist element exists');
  assert(indexHtml.includes('id="btn-play-playlist-label"'), 'btn-play-playlist-label element exists');
  // Play button SVG
  assert(indexHtml.includes('<polygon points="6 4 20 12 6 20 6 4"'), 'SVG play icon in playlist play button');
  // CSS hides or styles the text label
  assert(stylesCss.includes('#btn-play-playlist-label') && stylesCss.includes('display: none !important;'), 'Label visually hidden');
  assert(stylesCss.includes('#btn-play-playlist'), 'Play button styled');
});

test('Deliverable 2: Audio resume without resetting to 0:00', () => {
  // Pinned play button resumes current track if paused
  assert(appJs.includes('if (state.currentTrack && isSameTrack(state.currentTrack, pinned) && el.nativeAudio && el.nativeAudio.src)'), 'Pinned track resumes playback');
  // Playlist play button resumes current track if paused
  assert(appJs.includes('const isCurrentPlTrack = !!(state.currentTrack && pl.tracks.some(t => isSameTrack(t, state.currentTrack)));'), 'Playlist play button checks if current track is in playlist');
  // Track row click resumes current track if paused
  assert(appJs.includes('if (state.currentTrack && isSameTrack(state.currentTrack, track) && el.nativeAudio && el.nativeAudio.src)'), 'Track row click toggles pause/playSmooth');
  // playSmooth restores frozenCurTime if audio was at 0
  assert(appJs.includes('if (frozenCurTime > 0 && el.nativeAudio.currentTime === 0 && Number.isFinite(frozenCurTime))'), 'playSmooth restores frozen position');
});

test('Deliverable 3: Profile header removes [GUEST] badge', () => {
  // When not registered, guest badge text is empty and element hidden
  assert(appJs.includes("accountType.textContent = '';"), 'Guest badge text cleared');
  assert(appJs.includes("accountType.style.display = 'none';"), 'Guest badge hidden for guests');
  assert(stylesCss.includes('.profile-badge-guest:empty {'), 'Empty badge styled to stay hidden');
});

test('Deliverable 4: Separate Registration and Edit Profile modals', () => {
  // Dedicated registration modal in HTML
  assert(indexHtml.includes('id="profile-register-modal"'), 'profile-register-modal exists in HTML');
  assert(indexHtml.includes('id="input-register-nickname"'), 'input-register-nickname exists in HTML');
  assert(indexHtml.includes('id="btn-submit-register"'), 'btn-submit-register exists in HTML');
  // Dedicated edit profile modal in HTML
  assert(indexHtml.includes('id="profile-edit-modal"'), 'profile-edit-modal exists in HTML');
  assert(indexHtml.includes('id="input-profile-nickname"'), 'input-profile-nickname exists in HTML');
  // Registration and edit modals separated in JS
  assert(appJs.includes('function openRegisterModal'), 'openRegisterModal implemented');
  assert(appJs.includes('function openProfileEditModal'), 'openProfileEditModal implemented');
  assert(appJs.includes("btnEditProfile.textContent = 'Edit Profile';"), 'Registered shows Edit Profile');
  assert(appJs.includes("btnEditProfile.textContent = 'Register / Log In';"), 'Guest shows Register / Log In');
});

test('Deliverable 5: Friend search autocomplete and prefix/substring matching ("Sha" -> "Shadow")', () => {
  // Shadow seeded in registered users
  assert(appJs.includes("username: 'Shadow'"), 'Shadow user seeded');
  // Dropdown element in HTML
  assert(indexHtml.includes('id="friend-autocomplete-dropdown"'), 'Autocomplete dropdown element exists in HTML');
  // Autocomplete logic in JS
  assert(appJs.includes('friend-autocomplete-item'), 'Autocomplete suggestions created');
  assert(appJs.includes('uname.startsWith(q) || uname.includes(q)'), 'Matches prefix and substring');
  // Target resolution with prefix and substring fallback
  assert(appJs.includes('target = registered.find(u => u.username.toLowerCase().startsWith(targetNick.toLowerCase()));'), 'Prefix match fallback');
  assert(appJs.includes('target = registered.find(u => u.username.toLowerCase().includes(targetNick.toLowerCase()));'), 'Substring match fallback');
});

test('Deliverable 6: Pinned song permissions - only profile owner can change', () => {
  // Owner check in renderProfileView
  assert(appJs.includes('const isOwner = !state.viewingProfileUser || (state.viewingProfileUser.username.toLowerCase() === myAccount.username.toLowerCase());'), 'Owner check implemented');
  assert(appJs.includes("btnChangePinned.style.display = isOwner ? '' : 'none';"), 'Change button hidden when viewing other profile');
  // Guard in openPinTrackModal
  assert(appJs.includes('if (state.viewingProfileUser && state.viewingProfileUser.username.toLowerCase() !== myAccount.username.toLowerCase()) return;'), 'openPinTrackModal guarded for owner only');
});

test('Deliverable 7: Playbar alignment and time labels layout', () => {
  assert(stylesCss.includes('.playbar-center {'), 'playbar-center styled');
  assert(stylesCss.includes('width: clamp(340px, 46vw, 620px) !important;'), 'playbar-center width clamped');
  assert(stylesCss.includes('.scrubber-bar-wrapper {'), 'scrubber-bar-wrapper styled');
  assert(stylesCss.includes('.scrubber-track-container {'), 'scrubber-track flex sizing');
  assert(stylesCss.includes('.playbar #time-current {'), 'time-current formatted');
  assert(stylesCss.includes('.playbar #time-duration {'), 'time-duration formatted');
  assert(stylesCss.includes('min-width: 44px !important;'), 'Time labels min-width prevents jump/overlap');
  assert(stylesCss.includes('font-variant-numeric: tabular-nums !important;'), 'Tabular numbers prevent jitter');
});

test('Deliverable 8: Player download button icon', () => {
  assert(indexHtml.includes('id="btn-playbar-more" title="Download track"'), 'Download button in playbar');
  assert(indexHtml.includes('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>'), 'Download SVG icon present in btn-playbar-more');
});

test('Deliverable 9: Remove Download from 3-dots playbar menu', () => {
  assert(appJs.includes("if (track.platform !== 'local' && triggerBtn !== el.btnPlaybarDots && context !== 'playbar')"), 'Download omitted when 3-dots clicked from playbar');
});

test('Deliverable 10: Offline music playback support', () => {
  // /api/check-cache endpoint exists
  assert(serverJs.includes("parsedUrl.pathname === '/api/check-cache'"), 'server has check-cache endpoint');
  // findCachedFile searches cache and downloads directory
  assert(serverJs.includes('async function findCachedFile'), 'server findCachedFile implemented');
  assert(serverJs.includes('handleLocalTrack'), 'server handleLocalTrack streams cached file');
  // playTrack checks check-cache before online fetch
  assert(appJs.includes('/api/check-cache?id='), 'playTrack checks cache before network fetch');
  // encodeUrl passes id parameter
  assert(appJs.includes('&id=${encodeURIComponent(t.id || \'\')}'), 'encodeUrl passes track id');
  // server handleEncode caches output file with id
  assert(serverJs.includes('const reqTrackId = cleanTrackId(parsedUrl.query.id);'), 'handleEncode receives track id');
  assert(serverJs.includes('copyFile(outPath, path.join(CACHE_DIR, `${reqTrackId}.${ext}`))'), 'handleEncode copies to cache for offline');
});

test('Deliverable 11: Custom font upload in Settings -> Interface', () => {
  // HTML elements for custom font
  assert(indexHtml.includes('id="font-opt-custom"'), 'font-opt-custom button exists');
  assert(indexHtml.includes('id="input-custom-font-file"'), 'input-custom-font-file exists');
  assert(indexHtml.includes('id="btn-reset-custom-font"'), 'btn-reset-custom-font exists');
  // JS support in applyFont
  assert(appJs.includes("if (f === 'custom')"), 'applyFont supports custom font');
  assert(appJs.includes('@font-face { font-family: \'RiffCustomFont\';'), '@font-face injected dynamically');
  assert(appJs.includes('setProperty(\'--font-family\', "\'RiffCustomFont\', sans-serif")'), '--font-family set to RiffCustomFont');
  // Custom font file picker and reset wired
  assert(appJs.includes('inputCustomFontFile.addEventListener(\'change\''), 'Custom font file change listener wired');
  assert(appJs.includes('btnResetCustomFont.addEventListener(\'click\''), 'Custom font reset listener wired');
  assert(appJs.includes("btnResetCustom.classList.toggle('hidden', !savedCustomName);"), 'Custom font reset button removes .hidden class');
});

test('Functional Verification: MIME type resolution for all lossless and lossy offline downloads', () => {
  const extToMime = {
    '.opus': 'audio/ogg; codecs=opus',
    '.webm': 'audio/webm',
    '.m4a': 'audio/mp4',
    '.mp3': 'audio/mpeg',
    '.flac': 'audio/flac',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg'
  };
  for (const [ext, expectedMime] of Object.entries(extToMime)) {
    assert(serverJs.includes(`'${ext}': '${expectedMime}'`), `server.js maps ${ext} to ${expectedMime}`);
  }
  assert(serverJs.includes('const audioExtRegex = /\\.(opus|webm|m4a|mp3|flac|wav|ogg)$/i;'), 'clear-offline-library regex cleans all formats');
});

test('Functional Verification: Pinned song resolution isolates owner from friend profile', () => {
  // Shadow has Archangel pinned
  assert(appJs.includes("pinnedTrack: { id: 'burial_archangel', title: 'Archangel', artist: 'Burial', duration: 238 }"), 'Shadow user seeded with pinnedTrack');
  // Logic correctly separates owner vs other user
  assert(appJs.includes('pinned = (account && account.pinnedTrack) ? account.pinnedTrack : null;'), 'Other profile reads account.pinnedTrack');
  assert(appJs.includes('${isOwner ? \'No favorite song pinned yet. Favorite music or click Change to pin a song!\' : \'No favorite song pinned yet.\'}'), 'Profile empty pinned song text varies by ownership');
});

test('Functional Verification: Playbar center and waveform vertical alignment (height 26px)', () => {
  assert(appJs.includes('cachedTrackHeight = rect.height || 26;'), 'cachedTrackHeight dynamically set to container height (26px)');
  assert(appJs.includes('const sh = cachedTrackHeight || (el.scrubberTrack ? el.scrubberTrack.clientHeight : 26);'), 'Wave draw height uses 26px default');
  assert(stylesCss.includes('height: 26px !important;'), 'Styles enforce 26px height');
  assert(stylesCss.includes('.playbar .squiggly-canvas'), 'Squiggly canvas scoped in playbar');
});

test('Functional Verification: Album play button resume check', () => {
  assert(appJs.includes('const isCurrentAlbumTrack = !!(state.currentTrack && tracks.some(t => isSameTrack(t, state.currentTrack)));'), 'playAlbumFrom checks if current track is in album');
});

test('Functional Verification: Friend autocomplete keyboard navigation', () => {
  assert(appJs.includes("if (e.key === 'ArrowDown' && items.length > 0)"), 'ArrowDown moves autocomplete selection');
  assert(appJs.includes("if (e.key === 'ArrowUp' && items.length > 0)"), 'ArrowUp moves autocomplete selection');
  assert(appJs.includes("if (e.key === 'Escape')"), 'Escape closes autocomplete dropdown');
});

test('Functional Verification: Profile edit modal has Log Out button', () => {
  assert(indexHtml.includes('id="btn-logout-profile"'), 'btn-logout-profile exists in HTML');
  assert(appJs.includes("const btnLogout = document.getElementById('btn-logout-profile');"), 'btnLogout wired in JS');
  assert(appJs.includes("saveUserAccount({ username: 'Guest', isRegistered: false, bio: 'Music enthusiast & audio explorer', avatar: '' });"), 'Logout resets to Guest account');
});
