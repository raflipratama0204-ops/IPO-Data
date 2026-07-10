// js/google-sync.js

(function(global) {
  const CLIENT_ID_KEY = 'google_client_id';
  const SYNC_ENABLED_KEY = 'google_sync_enabled';
  const FILE_NAME = 'ipo_account_db.json';

  let tokenClient = null;
  let accessToken = null;
  let tokenExpiry = null;
  let userInfo = null;
  let onStatusChangeCallback = null;

  // Restore session from sessionStorage if available
  function restoreSession() {
    try {
      const savedToken = sessionStorage.getItem('google_access_token');
      const savedExpiry = sessionStorage.getItem('google_token_expiry');
      const savedUser = sessionStorage.getItem('google_user_info');

      if (savedToken && savedExpiry && savedUser) {
        const expiryTime = parseInt(savedExpiry);
        // Ensure token has at least 5 minutes left
        if (expiryTime > Date.now() + 300000) {
          accessToken = savedToken;
          tokenExpiry = expiryTime;
          userInfo = JSON.parse(savedUser);
          return true;
        }
      }
    } catch (e) {
      console.warn('Gagal memulihkan sesi Google dari sessionStorage:', e);
    }
    return false;
  }

  // Save session to sessionStorage
  function saveSession(token, expiry, user) {
    try {
      sessionStorage.setItem('google_access_token', token);
      sessionStorage.setItem('google_token_expiry', expiry.toString());
      sessionStorage.setItem('google_user_info', JSON.stringify(user));
    } catch (e) {
      console.warn('Gagal menyimpan sesi Google ke sessionStorage:', e);
    }
  }

  // Clear session
  function clearSession() {
    try {
      sessionStorage.removeItem('google_access_token');
      sessionStorage.removeItem('google_token_expiry');
      sessionStorage.removeItem('google_user_info');
      localStorage.removeItem('google_connected');
    } catch (e) {
      console.warn('Gagal menghapus sesi Google:', e);
    }
    accessToken = null;
    tokenExpiry = null;
    userInfo = null;
  }

  // Fetch Google User Info
  async function fetchUserInfo(token) {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Gagal mengambil profil pengguna Google');
    }

    return await response.json();
  }

  // Initialize the Token Client
  function init(callback) {
    const clientId = getClientId();
    if (!clientId) {
      if (callback) callback({ initialized: false });
      return;
    }

    if (restoreSession()) {
      if (callback) callback({ initialized: true, connected: true, user: userInfo });
      if (onStatusChangeCallback) onStatusChangeCallback();
      return;
    }

    try {
      if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
        console.warn('Pustaka Google Identity Services belum siap.');
        if (callback) callback({ initialized: false, error: 'Google library not loaded' });
        return;
      }

      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (response) => {
          if (response.error) {
            console.error('Otorisasi Google gagal:', response);
            alert('Gagal menghubungkan akun Google: ' + response.error);
            if (callback) callback({ initialized: true, connected: false, error: response.error });
            return;
          }

          accessToken = response.access_token;
          const expiresSec = parseInt(response.expires_in) || 3600;
          tokenExpiry = Date.now() + (expiresSec * 1000);

          try {
            userInfo = await fetchUserInfo(accessToken);
            saveSession(accessToken, tokenExpiry, userInfo);
            localStorage.setItem('google_connected', 'true');
            if (callback) callback({ initialized: true, connected: true, user: userInfo });
            if (onStatusChangeCallback) onStatusChangeCallback();
          } catch (err) {
            console.error('Gagal memuat info profil setelah login:', err);
            if (callback) callback({ initialized: true, connected: true, user: null });
            if (onStatusChangeCallback) onStatusChangeCallback();
          }
        }
      });

      if (callback) callback({ initialized: true, connected: false });
    } catch (e) {
      console.error('Gagal menginisialisasi GIS Token Client:', e);
      if (callback) callback({ initialized: false, error: e.message });
    }
  }

  // Request Access Token / Login
  function connect() {
    const clientId = getClientId();
    if (!clientId) {
      alert('Silakan masukkan Google Client ID terlebih dahulu di menu pengaturan.');
      return;
    }

    if (!tokenClient) {
      init();
    }
    
    if (tokenClient) {
      tokenClient.requestAccessToken();
    } else {
      alert('Pustaka Google OAuth gagal diinisialisasi. Periksa koneksi internet Anda.');
    }
  }

  // Disconnect / Logout
  function disconnect() {
    if (accessToken) {
      try {
        google.accounts.oauth2.revoke(accessToken, () => {
          console.log('Token akses Google berhasil dicabut.');
        });
      } catch (e) {
        console.warn('Gagal mencabut token akses:', e);
      }
    }
    clearSession();
    if (onStatusChangeCallback) onStatusChangeCallback();
  }

  // Check if token is valid, request silently if needed
  function getValidToken() {
    return new Promise((resolve, reject) => {
      if (accessToken && tokenExpiry && Date.now() < tokenExpiry - 300000) { // 5-minute buffer
        resolve(accessToken);
        return;
      }

      const isConnected = localStorage.getItem('google_connected') === 'true';
      if (!isConnected) {
        reject(new Error('Akun Google tidak terhubung.'));
        return;
      }

      if (!tokenClient) {
        const clientId = getClientId();
        if (!clientId) {
          reject(new Error('Google Client ID belum diatur.'));
          return;
        }
        init();
      }

      if (!tokenClient) {
        reject(new Error('Google OAuth client gagal diinisialisasi.'));
        return;
      }

      // Override callback temporary to resolve the promise
      const prevCallback = tokenClient.callback;
      tokenClient.callback = async (response) => {
        tokenClient.callback = prevCallback; // Restore original callback
        
        if (response.error) {
          reject(new Error('Gagal memperbarui token Google: ' + response.error));
          return;
        }

        accessToken = response.access_token;
        const expiresSec = parseInt(response.expires_in) || 3600;
        tokenExpiry = Date.now() + (expiresSec * 1000);

        try {
          userInfo = await fetchUserInfo(accessToken);
          saveSession(accessToken, tokenExpiry, userInfo);
          resolve(accessToken);
        } catch (e) {
          // Resolve with token anyway, since token is valid
          resolve(accessToken);
        }
      };

      // Prompt: '' tells Google to try silently if possible
      tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  // Find the file in appDataFolder
  async function findFile(token) {
    const query = encodeURIComponent(`name = '${FILE_NAME}' and trashed = false`);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error('Gagal mencari berkas di Google Drive: ' + errText);
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  }

  // Upload data to Google Drive (create or update)
  async function uploadData(dbObject) {
    const token = await getValidToken();
    const fileInfo = await findFile(token);

    const jsonStr = JSON.stringify(dbObject, null, 2);
    
    if (fileInfo) {
      // Update existing file
      const fileId = fileInfo.id;
      const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: jsonStr
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error('Gagal memperbarui data di Google Drive: ' + errText);
      }

      return await response.json();
    } else {
      // Create new file (Multipart)
      const metadata = {
        name: FILE_NAME,
        parents: ['appDataFolder']
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([jsonStr], { type: 'application/json' }));

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: form
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error('Gagal membuat berkas baru di Google Drive: ' + errText);
      }

      return await response.json();
    }
  }

  // Download data from Google Drive
  async function downloadData() {
    const token = await getValidToken();
    const fileInfo = await findFile(token);

    if (!fileInfo) {
      throw new Error('Berkas data tidak ditemukan di Google Drive Anda. Lakukan unggahan pertama terlebih dahulu.');
    }

    const fileId = fileInfo.id;
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error('Gagal mengunduh berkas dari Google Drive: ' + errText);
    }

    return await response.json();
  }

  // Check sync status (returns file metadata if exists)
  async function getCloudStatus() {
    try {
      const token = await getValidToken();
      const fileInfo = await findFile(token);
      return {
        connected: true,
        user: userInfo,
        cloudFile: fileInfo // contains id, name, modifiedTime if exists
      };
    } catch (e) {
      return {
        connected: false,
        user: null,
        error: e.message
      };
    }
  }

  // Automatically upload in background (debounced or checked)
  let autoSyncTimeout = null;
  function autoUpload(dbObject) {
    if (localStorage.getItem(SYNC_ENABLED_KEY) !== 'true') return;
    if (localStorage.getItem('google_connected') !== 'true') return;

    if (autoSyncTimeout) clearTimeout(autoSyncTimeout);

    // Debounce upload to prevent hitting Google Drive API rate limits
    autoSyncTimeout = setTimeout(() => {
      uploadData(dbObject)
        .then(() => {
          console.log('Auto-sinkronisasi Cloud berhasil dilakukan di latar belakang.');
          // Save last sync time
          localStorage.setItem('google_last_sync_time', new Date().toISOString());
          if (onStatusChangeCallback) onStatusChangeCallback();
        })
        .catch(err => {
          console.warn('Auto-sinkronisasi Cloud di latar belakang gagal:', err.message);
        });
    }, 3000); // 3 seconds delay after edits
  }

  // Getters and Setters
  function isConnected() {
    return !!accessToken && !!userInfo;
  }

  function getClientId() {
    return localStorage.getItem(CLIENT_ID_KEY) || '409883088386-ar3ej7spjkl2t0hglmopa9fotejh1nt6.apps.googleusercontent.com';
  }

  function saveClientId(id) {
    localStorage.setItem(CLIENT_ID_KEY, id.trim());
    initTokenClient(id.trim());
  }

  function isSyncEnabled() {
    return localStorage.getItem(SYNC_ENABLED_KEY) === 'true';
  }

  function setSyncEnabled(enabled) {
    localStorage.setItem(SYNC_ENABLED_KEY, enabled ? 'true' : 'false');
  }

  // Helper to initialize Google Identity Services client if ID is saved
  function initTokenClient(clientId) {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      return;
    }
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      callback: async (response) => {
        if (response.error) {
          console.error('Otorisasi Google gagal:', response);
          alert('Gagal menghubungkan akun Google: ' + response.error);
          return;
        }

        accessToken = response.access_token;
        const expiresSec = parseInt(response.expires_in) || 3600;
        tokenExpiry = Date.now() + (expiresSec * 1000);

        try {
          userInfo = await fetchUserInfo(accessToken);
          saveSession(accessToken, tokenExpiry, userInfo);
          localStorage.setItem('google_connected', 'true');
          if (onStatusChangeCallback) onStatusChangeCallback();
        } catch (err) {
          console.error('Gagal mengambil profil setelah login:', err);
          if (onStatusChangeCallback) onStatusChangeCallback();
        }
      }
    });
  }

  function registerStatusCallback(cb) {
    onStatusChangeCallback = cb;
  }

  // Expose API
  global.googleSync = {
    init,
    connect,
    disconnect,
    uploadData,
    downloadData,
    getCloudStatus,
    autoUpload,
    isConnected,
    getClientId,
    saveClientId,
    isSyncEnabled,
    setSyncEnabled,
    registerStatusCallback,
    getUserInfo: () => userInfo,
    getValidToken
  };

})(window);
