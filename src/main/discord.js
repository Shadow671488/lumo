
const net = require('net');
const RPC = require('discord-rpc');

// Ensure Windows named pipes map correctly across Node libuv versions
if (process.platform === 'win32') {
  const origCreateConnection = net.createConnection;
  net.createConnection = function(...args) {
    if (typeof args[0] === 'string' && args[0].startsWith('\\\\?\\pipe\\')) {
      args[0] = args[0].replace('\\\\?\\pipe\\', '\\\\.\\pipe\\');
    }
    return origCreateConnection.apply(this, args);
  };
}

// Discord Rich Presence shows the NAME of the Discord application this ID
// belongs to. The ID below belongs to the original Riff app, so it shows
// "Riff". Create your own application at https://discord.com/developers/applications
// (name it "Lumo"), copy its Application ID, and either paste it here or set
// the LUMO_DISCORD_CLIENT_ID environment variable.
const CLIENT_ID = process.env.LUMO_DISCORD_CLIENT_ID || '1565067909259202570';
const RECONNECT_DELAY_MS = 15000;

let rpcClient = null;
let isConnected = false;
let isEnabled = true;
let lastTrackInfo = null;
let reconnectTimer = null;
let isDestroying = false;

function initRPC() {
  if (rpcClient || isDestroying) return;

  try {
    rpcClient = new RPC.Client({ transport: 'ipc' });
  } catch (e) {
    console.warn('[Discord RPC] Failed to create RPC client:', e.message || e);
    rpcClient = null;
    scheduleReconnect();
    return;
  }

  rpcClient.on('ready', () => {
    isConnected = true;
    console.log('[Discord RPC] Connected as', rpcClient.user?.username || 'unknown');
    if (lastTrackInfo && isEnabled) {
      _setActivity(lastTrackInfo);
    }
  });

  rpcClient.on('disconnected', () => {
    console.log('[Discord RPC] Disconnected');
    isConnected = false;
    rpcClient = null;
    scheduleReconnect();
  });

  rpcClient.on('error', (err) => {
    console.warn('[Discord RPC] Socket error:', err.message || err);
    isConnected = false;
    rpcClient = null;
    scheduleReconnect();
  });

  rpcClient.login({ clientId: CLIENT_ID }).catch(err => {
    console.warn('[Discord RPC] Login failed:', err.message || err);
    isConnected = false;
    rpcClient = null;
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimer || isDestroying || !isEnabled) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (isEnabled && !isDestroying) {
      initRPC();
    }
  }, RECONNECT_DELAY_MS);
}

function _setActivity(trackInfo) {
  if (!rpcClient || !isConnected || !trackInfo) return;
  const now = Math.floor(Date.now() / 1000);
  const startEpoch = trackInfo.startTimestamp || now;
  const showArtistStatus = trackInfo.artistInStatus !== false;
  const cleanTitle = String(trackInfo.title || 'Unknown Track').trim().substring(0, 128);
  const cleanArtist = String(trackInfo.artist || 'Unknown Artist').trim().substring(0, 128);

  const activity = {
    details: cleanTitle.length >= 2 ? cleanTitle : cleanTitle + ' ',
    state: showArtistStatus ? (cleanArtist.length >= 2 ? cleanArtist : cleanArtist + ' ') : (`by ${cleanArtist}`).substring(0, 128),
    startTimestamp: startEpoch * 1000,
    instance: false,
  };

  // Only the start timestamp is sent on purpose. With an end timestamp Discord
  // renders the remaining/total time (e.g. "1:25") right after playback starts,
  // which looks like a wrong clock. A start-only activity shows a clean elapsed
  // timer that begins at 0:00 and counts up.

  if (trackInfo.thumbnail && typeof trackInfo.thumbnail === 'string' && trackInfo.thumbnail.startsWith('http')) {
    activity.largeImageKey = trackInfo.thumbnail;
    activity.largeImageText = cleanTitle;
  }

  // Use official setActivity with fallback to raw request if needed
  if (typeof rpcClient.setActivity === 'function') {
    rpcClient.setActivity(activity).catch(() => {
      if (rpcClient && isConnected) {
        rpcClient.request('SET_ACTIVITY', {
          pid: process.pid,
          activity: {
            details: activity.details,
            state: activity.state,
            timestamps: { start: activity.startTimestamp },
            assets: activity.largeImageKey ? { large_image: activity.largeImageKey, large_text: cleanTitle } : undefined,
            instance: false
          }
        }).catch(err => {
          console.warn('[Discord RPC] SET_ACTIVITY error:', err.message || err);
        });
      }
    });
  } else {
    rpcClient.request('SET_ACTIVITY', {
      pid: process.pid,
      activity: {
        details: activity.details,
        state: activity.state,
        timestamps: { start: activity.startTimestamp },
        assets: activity.largeImageKey ? { large_image: activity.largeImageKey, large_text: cleanTitle } : undefined,
        instance: false
      }
    }).catch(err => {
      console.warn('[Discord RPC] SET_ACTIVITY error:', err.message || err);
    });
  }
}


function updatePresence(trackInfo) {
  if (!trackInfo) return;

  lastTrackInfo = trackInfo;

  if (!isEnabled) return;

  if (isConnected && rpcClient) {
    _setActivity(trackInfo);
  } else if (!rpcClient) {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    initRPC();
  }
}

function clearPresence() {
  lastTrackInfo = null;
  if (rpcClient && isConnected) {
    rpcClient.clearActivity().catch(() => {});
  }
}

function setEnabled(enabled) {
  isEnabled = !!enabled;

  if (isEnabled) {
    if (!rpcClient) {
      initRPC();
    } else if (lastTrackInfo) {
      _setActivity(lastTrackInfo);
    }
  } else {
    if (rpcClient && isConnected) {
      rpcClient.clearActivity().catch(() => {});
    }
    destroyRPC();
  }
}

function getEnabled() {
  return isEnabled;
}

function getConnected() {
  return isConnected;
}

function destroyRPC() {
  isDestroying = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (rpcClient) {
    try {
      rpcClient.destroy().catch(() => {});
    } catch (e) {}
    rpcClient = null;
  }
  isConnected = false;
  setTimeout(() => { isDestroying = false; }, 500);
}

function reconnectRPC() {
  destroyRPC();
  setTimeout(() => initRPC(), 600);
}

module.exports = {
  initRPC,
  updatePresence,
  clearPresence,
  setEnabled,
  getEnabled,
  getConnected,
  destroyRPC,
  reconnectRPC,
};

