process.noDeprecation = true;
const { app, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const CHECK_DELAY_MS = 1500;
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

function readIgnored(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')).version || ''; } catch (e) { return ''; }
}

function writeIgnored(file, version) {
  try { fs.writeFileSync(file, JSON.stringify({ version })); } catch (e) {}
}

function isNewer(latest, current) {
  const p1 = String(latest || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const p2 = String(current || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

function initUpdater(getWindow) {
  const ignoreFile = path.join(app.getPath('userData'), 'ignored-update.json');
  const pkg = require('../../package.json');
  if (pkg.version) {
    app.setVersion(pkg.version);
  }
  const publishTarget = (pkg.build && pkg.build.publish && pkg.build.publish[0]) || {};
  const defaultRepo = (publishTarget.owner && publishTarget.repo) ? (publishTarget.owner + '/' + publishTarget.repo) : 'Shadow671488/lumo';
  const updateRepo = (process.env.LUMO_UPDATE_REPO || defaultRepo).trim();
  const updaterEnabled = true;
  const releasesUrl = updateRepo ? `https://github.com/${updateRepo}` : '';
  let manualCheck = false;
  let installNow = false;
  let isDownloaded = false;
  let current = null;

  try { ipcMain.removeHandler('get-app-version'); } catch (_) {}
  ipcMain.handle('get-app-version', () => app.getVersion());

  const isDev = !app.isPackaged;
  const devConfigFile = path.join(__dirname, '../../dev-app-update.yml');
  const canInstall = !isDev && (process.platform === 'win32' || (process.platform === 'linux' && !!process.env.APPIMAGE));

  const send = (channel, payload) => {
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  };

  const fetchLatestReleaseInfo = async () => {
    let latestVer = '';
    let releaseNotes = '';
    let publishedAt = '';
    let htmlUrl = releasesUrl ? `${releasesUrl}/releases/latest` : '';

    // 1. Check latest.yml directly from GitHub CDN (NO RATE LIMIT)
    try {
      const ymlRes = await fetch(`https://github.com/${updateRepo}/releases/latest/download/latest.yml`, {
        cache: 'no-cache',
        headers: { 'User-Agent': 'Lumo-Player' }
      });
      if (ymlRes.ok) {
        const ymlText = await ymlRes.text();
        const mVer = ymlText.match(/version:\s*([^\s\r\n]+)/);
        if (mVer && mVer[1]) latestVer = mVer[1].replace(/^v/i, '').trim();
        const mDate = ymlText.match(/releaseDate:\s*['"]?([^'"\r\n]+)['"]?/);
        if (mDate && mDate[1]) publishedAt = mDate[1].trim();
      }
    } catch (_) {}

    // 2. Check GitHub web json endpoint (NO RATE LIMIT)
    try {
      const webRes = await fetch(`https://github.com/${updateRepo}/releases/latest`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Lumo-Player' }
      });
      if (webRes.ok) {
        const webJson = await webRes.json();
        if (webJson.tag_name && !latestVer) {
          latestVer = webJson.tag_name.replace(/^v/i, '').trim();
        }
        if (webJson.body && !releaseNotes) releaseNotes = webJson.body;
        if (webJson.published_at && !publishedAt) publishedAt = webJson.published_at;
        if (webJson.update_url) htmlUrl = `https://github.com${webJson.update_url}`;
      }
    } catch (_) {}

    // 3. Fallback to atom feed (NO RATE LIMIT)
    if (!latestVer) {
      try {
        const atomRes = await fetch(`https://github.com/${updateRepo}/releases.atom`, {
          headers: { 'User-Agent': 'Lumo-Player' }
        });
        if (atomRes.ok) {
          const atomXml = await atomRes.text();
          const m = atomXml.match(/<title>v?([0-9]+\.[0-9]+\.[0-9]+)<\/title>/i);
          if (m && m[1]) latestVer = m[1].trim();
        }
      } catch (_) {}
    }

    if (!htmlUrl && latestVer) {
      htmlUrl = `${releasesUrl}/releases/tag/v${latestVer}`;
    }

    return { latestVer, releaseNotes, publishedAt, htmlUrl };
  };

  const fallbackFetchGitHub = async () => {
    if (!updaterEnabled) {
      if (manualCheck) send('update-not-available', { version: pkg.version || app.getVersion() });
      manualCheck = false;
      return;
    }
    try {
      const info = await fetchLatestReleaseInfo();
      const currentVersion = pkg.version || app.getVersion();
      if (info.latestVer && isNewer(info.latestVer, currentVersion)) {
        current = {
          version: info.latestVer,
          releaseNotes: info.releaseNotes || '',
          publishedAt: info.publishedAt || '',
          htmlUrl: info.htmlUrl || `${releasesUrl}/tag/v${info.latestVer}`
        };
        const ignored = readIgnored(ignoreFile) === info.latestVer;
        if (ignored && !manualCheck) return;
        manualCheck = false;
        send('update-available', {
          version: info.latestVer,
          releaseNotes: info.releaseNotes || '',
          publishedAt: info.publishedAt || '',
          htmlUrl: info.htmlUrl || `${releasesUrl}/tag/v${info.latestVer}`,
          canInstall: false,
          url: info.htmlUrl || `${releasesUrl}/tag/v${info.latestVer}`
        });
      } else {
        if (manualCheck) {
          send('update-not-available', { version: currentVersion });
        }
        manualCheck = false;
      }
    } catch (err) {
      if (manualCheck) {
        send('update-error', { message: err && err.message ? err.message : 'Update failed' });
      }
      manualCheck = false;
    }
  };

  let autoUpdater = null;
  const hasUpdaterSupport = !isDev || fs.existsSync(devConfigFile);
  if (updaterEnabled && hasUpdaterSupport && canInstall) {
    try {
      const eu = require('electron-updater');
      autoUpdater = eu.autoUpdater;
      if (isDev) autoUpdater.forceDevUpdateConfig = true;
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;

      autoUpdater.on('update-available', async (info) => {
        current = info;
        const ignored = readIgnored(ignoreFile) === info.version;
        if (ignored && !manualCheck) return;
        manualCheck = false;

        let releaseNotes = info.releaseNotes || info.releaseName || '';
        let publishedAt = info.releaseDate || '';
        let htmlUrl = `${releasesUrl}/tag/v${info.version}`;

        try {
          const fetched = await fetchLatestReleaseInfo();
          if (fetched.releaseNotes) releaseNotes = fetched.releaseNotes;
          if (fetched.publishedAt) publishedAt = fetched.publishedAt;
          if (fetched.htmlUrl) htmlUrl = fetched.htmlUrl;
        } catch (_) {}

        current.releaseNotes = releaseNotes;
        current.publishedAt = publishedAt;
        current.htmlUrl = htmlUrl;

        send('update-available', {
          version: info.version,
          canInstall,
          url: htmlUrl,
          releaseNotes,
          publishedAt,
          htmlUrl
        });

        autoUpdater.downloadUpdate().catch(() => {});
      });

      autoUpdater.on('update-not-available', () => {
        if (manualCheck) send('update-not-available', { version: app.getVersion() });
        manualCheck = false;
      });

      autoUpdater.on('download-progress', (p) => send('update-progress', { percent: Math.round(p.percent) }));

      autoUpdater.on('update-downloaded', (info) => {
        if (!current && info) current = info;
        isDownloaded = true;
        if (installNow) {
          autoUpdater.quitAndInstall();
        } else {
          send('update-ready', { version: current && current.version });
          send('update-downloaded', {
            version: current && current.version,
            releaseNotes: current && (current.releaseNotes || current.body || ''),
            publishedAt: current && (current.publishedAt || current.published_at || ''),
            htmlUrl: current && (current.htmlUrl || current.html_url || ''),
            canInstall: true
          });
        }
      });

      autoUpdater.on('error', () => {
        fallbackFetchGitHub();
      });
    } catch (_) {
      autoUpdater = null;
    }
  }

  const check = () => {
    if (!autoUpdater || !canInstall || isDev) {
      return fallbackFetchGitHub();
    }
    return autoUpdater.checkForUpdates().catch(() => {
      return fallbackFetchGitHub();
    });
  };

  try { ipcMain.removeHandler('update-check'); } catch (_) {}
  ipcMain.handle('update-check', () => {
    manualCheck = true;
    if (isDownloaded && current) {
      send('update-ready', { version: current.version });
      send('update-downloaded', {
        version: current.version,
        releaseNotes: current.releaseNotes || '',
        publishedAt: current.publishedAt || '',
        htmlUrl: current.htmlUrl || '',
        canInstall: true
      });
      return { ok: true, downloaded: true };
    }
    if (current && isNewer(current.version, pkg.version || app.getVersion())) {
      send('update-available', {
        version: current.version,
        canInstall,
        url: current.htmlUrl || `${releasesUrl}/tag/v${current.version}`,
        releaseNotes: current.releaseNotes || '',
        publishedAt: current.publishedAt || '',
        htmlUrl: current.htmlUrl || ''
      });
    }
    check();
    return { ok: true, downloaded: isDownloaded };
  });

  const doInstallNow = () => {
    installNow = true;
    if (autoUpdater && canInstall) {
      try {
        autoUpdater.quitAndInstall();
      } catch (_) {
        autoUpdater.downloadUpdate().then(() => {
          autoUpdater.quitAndInstall();
        }).catch(() => {});
      }
    } else {
      app.relaunch();
      app.exit(0);
    }
  };

  try { ipcMain.removeHandler('install-update-now'); } catch (_) {}
  ipcMain.on('install-update-now', doInstallNow);

  try { ipcMain.removeAllListeners('update-action'); } catch (_) {}
  ipcMain.on('update-action', (event, action) => {
    if (action === 'ignore') {
      if (current) writeIgnored(ignoreFile, current.version);
      return;
    }
    if (!canInstall || !autoUpdater) return;
    if (action === 'now') {
      doInstallNow();
    } else if (action === 'later') {
      installNow = false;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.downloadUpdate().catch(() => {});
    }
  });

  if (updaterEnabled) {
    setTimeout(check, CHECK_DELAY_MS);
    setInterval(check, CHECK_EVERY_MS).unref();
  }
}

module.exports = { initUpdater };
