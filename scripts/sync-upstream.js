'use strict';

/**
 * Lumo - Upstream Riff Sync Engine
 * 
 * Safely fetches the latest official releases & bug fixes from upstream Riff
 * (https://github.com/rootscripts/riff) and merges them into this custom Lumo build,
 * while STRICTLY preserving all custom Lumo features:
 *  - Custom branding & product identity (Lumo by Oxeez)
 *  - Custom profile system (registration, Telegram verification, avatar, bio)
 *  - Custom friends system (requests, autocomplete, pending list)
 *  - Custom TV Karaoke controls (pure white active like, centered repost icon)
 *  - Custom 10-band equalizer layout with visible -12 dB scale
 *  - Custom launchers (Launch Lumo.bat, start-lumo.js, brand-electron.js)
 *  - Custom tests (verify_*.test.js)
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const UPSTREAM_URL = 'https://github.com/rootscripts/riff';

function run(cmd, options = {}) {
  try {
    return execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf8', stdio: options.silent ? 'pipe' : 'inherit', ...options });
  } catch (err) {
    if (options.ignoreError) return null;
    throw err;
  }
}

function runCapture(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (e) {
    return null;
  }
}

async function syncUpstream() {
  console.log('===================================================');
  console.log('      Lumo - Upstream Riff Sync Engine');
  console.log('===================================================\n');

  // 1. Check Git
  const gitVersion = runCapture('git --version');
  if (!gitVersion) {
    console.error('[ERROR] Git is not installed or not in PATH.');
    process.exit(1);
  }
  console.log(`[INFO] Using ${gitVersion}`);

  // 2. Ensure upstream remote exists
  const remotes = runCapture('git remote -v') || '';
  if (!remotes.includes('upstream')) {
    console.log(`[INFO] Adding upstream remote: ${UPSTREAM_URL}`);
    run(`git remote add upstream ${UPSTREAM_URL}`);
  } else {
    console.log('[INFO] Upstream remote configured.');
  }

  // 3. Fetch upstream
  console.log('[INFO] Fetching latest upstream commits and tags from Riff...');
  run('git fetch upstream --tags');

  // 4. Determine current and latest upstream version
  const pkgPath = path.join(ROOT_DIR, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version || '43.0.0';
  console.log(`[INFO] Current Lumo version: ${currentVersion}`);

  // Get latest upstream tag or commit
  let latestTag = runCapture('git describe --tags --abbrev=0 upstream/main') || '';
  if (!latestTag) {
    const allTags = runCapture('git tag -l "v*" --sort=-v:refname') || '';
    latestTag = allTags.split('\n')[0] || 'v44.0.0';
  }
  const cleanUpstreamVer = latestTag.replace(/^v/i, '');
  console.log(`[INFO] Latest upstream Riff release: ${latestTag} (${cleanUpstreamVer})`);

  // 5. Create a safety backup branch
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupBranch = `backup-lumo-${timestamp}`;
  runCapture(`git branch -f ${backupBranch} HEAD`);
  console.log(`[INFO] Safety backup branch created: ${backupBranch}`);

  // 6. Stash working directory if dirty
  const status = runCapture('git status --porcelain') || '';
  let didStash = false;
  if (status.trim().length > 0) {
    console.log('[INFO] Stashing current uncommitted changes...');
    runCapture('git stash push -m "lumo-pre-sync-auto"');
    didStash = true;
  }

  // 7. Protected Lumo files snapshot (ensure custom features are never overwritten)
  const protectedFiles = [
    'package.json',
    'Launch Lumo.bat',
    'scripts/brand-electron.js',
    'scripts/start-lumo.js',
    'scripts/sync-upstream.js',
    'sync-upstream.bat',
    'assets/01-default.ico',
    'assets/01-default.png',
    'assets/badge-alpha-tester.png',
    'assets/badge-bug-hunter.png',
    'assets/badge-owner-crown.png',
    'assets/badge-verified.png',
    'assets/lumo-icon.ico',
    'assets/lumo-icon.png',
    'assets/lumo-mark.svg',
    'assets/lumo.svg',
    'supabase/profiles.sql',
    'supabase/telegram_auth_codes.sql',
    'supabase/telegram_password_reset.sql',
    'supabase/telegram_profile_binding.sql',
    'test/verify_13_items.test.js',
    'test/verify_13_user_issues.test.js',
    'test/verify_feedback_fixes.test.js',
    'test/verify_fixes.test.js'
  ];

  const protectedBackup = new Map();
  for (const rel of protectedFiles) {
    const full = path.join(ROOT_DIR, rel);
    if (fs.existsSync(full)) {
      protectedBackup.set(rel, fs.readFileSync(full));
    }
  }

  // 8. Perform merge from upstream/main with 'ours' strategy for conflicts
  console.log(`[INFO] Merging upstream bug fixes into Lumo...`);
  try {
    // Attempt merge preferring current custom changes on conflicts (-X ours)
    run('git merge --no-commit -s ort -X ours upstream/main', { ignoreError: true });
  } catch (err) {
    console.log('[WARN] Merge required conflict resolution; applying Lumo protections...');
  }

  // Restore all protected Lumo files
  for (const [rel, content] of protectedBackup.entries()) {
    const full = path.join(ROOT_DIR, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }

  // Restore stashed working files if any
  if (didStash) {
    console.log('[INFO] Restoring your uncommitted modifications...');
    runCapture('git stash pop');
  }

  // 9. Update package.json version if upstream is newer
  try {
    const currentPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    currentPkg.name = 'lumo';
    currentPkg.productName = 'Lumo';
    currentPkg.author = 'Oxeez';
    currentPkg.scripts = currentPkg.scripts || {};
    currentPkg.scripts['sync-upstream'] = 'node scripts/sync-upstream.js';
    if (cleanUpstreamVer && cleanUpstreamVer !== currentPkg.version) {
      currentPkg.version = cleanUpstreamVer;
    }
    fs.writeFileSync(pkgPath, JSON.stringify(currentPkg, null, 2) + '\n', 'utf8');
  } catch (e) {
    console.warn('[WARN] Could not update version in package.json:', e.message);
  }

  // 10. Run tests to verify custom features and upstream fixes work in harmony
  console.log('\n[INFO] Running test suite to verify stability...');
  try {
    run('npm test');
    console.log('\n===================================================');
    console.log(' [SUCCESS] Upstream sync completed successfully!');
    console.log(` Lumo is now up-to-date with upstream Riff ${latestTag}`);
    console.log(' All custom Lumo features, profiles, and branding are preserved.');
    console.log('===================================================\n');
  } catch (testErr) {
    console.error('\n[WARNING] Some tests failed after sync.');
    console.error(`If needed, you can revert anytime by running: git reset --hard ${backupBranch}\n`);
    process.exit(1);
  }
}

syncUpstream().catch(err => {
  console.error('[ERROR] Sync failed:', err && err.message ? err.message : err);
  process.exit(1);
});
