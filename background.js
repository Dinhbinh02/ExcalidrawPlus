
const CHROME_CLIENT_ID = "824888142961-rl8p766vurc40cls3cuaabd0vj16j804.apps.googleusercontent.com";

const WEB_CLIENT_ID = "YOUR_GOOGLE_WEB_CLIENT_ID";

let cachedToken = null;

async function getAuthToken(interactive = false, forceRefresh = false) {
  const isChrome = typeof chrome !== 'undefined' && 
                   /Chrome/i.test(navigator.userAgent) && 
                   !/Edg/i.test(navigator.userAgent) && 
                   !/OPR/i.test(navigator.userAgent) && 
                   !(navigator.brave && typeof navigator.brave.isBrave === 'function');

  if (!isChrome) {
    if (forceRefresh) {
      cachedToken = null;
      await chrome.storage.local.remove(['google_oauth_token', 'google_oauth_token_time']);
    } else if (cachedToken) {
      return cachedToken;
    } else {
      const storageData = await chrome.storage.local.get(['google_oauth_token', 'google_oauth_token_time']);
      if (storageData.google_oauth_token && storageData.google_oauth_token_time) {
        const ageMs = Date.now() - storageData.google_oauth_token_time;
        if (ageMs < 3000000) {
          cachedToken = storageData.google_oauth_token;
          return cachedToken;
        }
      }
    }

    return new Promise((resolve, reject) => {
      const redirectUri = chrome.identity.getRedirectURL();
      const scopes = [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/drive.appdata"
      ];
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
        `client_id=${encodeURIComponent(WEB_CLIENT_ID)}&` +
        `response_type=token&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes.join(' '))}`;

      chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: interactive
      }, (redirectUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (redirectUrl) {
          try {
            const url = new URL(redirectUrl);
            const hashParams = new URLSearchParams(url.hash.substring(1));
            const token = hashParams.get('access_token');
            if (token) {
              cachedToken = token;
              chrome.storage.local.set({ 
                google_oauth_token: token,
                google_oauth_token_time: Date.now()
              });
              resolve(token);
            } else {
              reject(new Error("No access token found in redirect URL"));
            }
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error("Authentication flow cancelled or failed"));
        }
      });
    });
  }

  
  return new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.identity || !chrome.identity.getAuthToken) {
      reject(new Error("Chrome Identity API is not available"));
      return;
    }

    const attemptNativeAuth = () => {
      chrome.identity.getAuthToken({ interactive: interactive }, (token) => {
        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message;
          if (errMsg.includes("not supported") || errMsg.includes("not available")) {
            
            const redirectUri = chrome.identity.getRedirectURL();
            const scopes = [
              "https://www.googleapis.com/auth/userinfo.email",
              "https://www.googleapis.com/auth/userinfo.profile",
              "https://www.googleapis.com/auth/drive.appdata"
            ];
            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
              `client_id=${encodeURIComponent(WEB_CLIENT_ID)}&` +
              `response_type=token&` +
              `redirect_uri=${encodeURIComponent(redirectUri)}&` +
              `scope=${encodeURIComponent(scopes.join(' '))}`;

            chrome.identity.launchWebAuthFlow({
              url: authUrl,
              interactive: interactive
            }, (redirectUrl) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else if (redirectUrl) {
                try {
                  const url = new URL(redirectUrl);
                  const hashParams = new URLSearchParams(url.hash.substring(1));
                  const token = hashParams.get('access_token');
                  if (token) {
                    cachedToken = token;
                    chrome.storage.local.set({ 
                      google_oauth_token: token,
                      google_oauth_token_time: Date.now()
                    });
                    resolve(token);
                  } else {
                    reject(new Error("No access token found in redirect URL"));
                  }
                } catch (err) {
                  reject(err);
                }
              } else {
                reject(new Error("Authentication flow cancelled or failed"));
              }
            });
          } else {
            reject(new Error(errMsg));
          }
        } else if (token) {
          resolve(token);
        } else {
          reject(new Error("Failed to retrieve authentication token"));
        }
      });
    };

    if (forceRefresh) {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (token) {
          chrome.identity.removeCachedAuthToken({ token: token }, () => {
            attemptNativeAuth();
          });
        } else {
          attemptNativeAuth();
        }
      });
    } else {
      attemptNativeAuth();
    }
  });
}

async function fetchUserInfo(token) {
  const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    if (response.status === 401) {
      
      cachedToken = null;
      await chrome.storage.local.remove(['google_oauth_token', 'google_oauth_token_time']);
    }
    throw new Error('Failed to fetch user info: ' + response.status);
  }
  const data = await response.json();
  const user = {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture
  };
  await chrome.storage.local.set({ google_user_info: user });
  return user;
}


async function listFiles(token) {
  const q = `'appDataFolder' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=appDataFolder&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime%20desc`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to list files');
  const data = await response.json();
  return data.files || [];
}

async function getFileContent(token, fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to download file content');
  return await response.json();
}

async function saveFile(token, name, content, fileId = null) {
  const metadata = {
    name: name,
    parents: fileId ? undefined : ['appDataFolder']
  };

  const boundary = 'foo_bar_baz';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(content) +
    closeDelimiter;

  let url;
  let method;
  if (fileId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
    method = 'PATCH';
  } else {
    url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    method = 'POST';
  }

  const response = await fetch(url, {
    method: method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!response.ok) throw new Error('Failed to save file');
  return await response.json();
}

async function deleteFile(token, fileId) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to delete file');
  return true;
}

async function renameFile(token, fileId, name) {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: name })
  });
  if (!response.ok) throw new Error('Failed to rename file');
  return await response.json();
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleMessage = async () => {
    try {
      if (message.action === 'login') {
        const token = await getAuthToken(true);
        const user = await fetchUserInfo(token);
        return { success: true, user };
      }

      if (message.action === 'getUser') {
        const token = await getAuthToken(false).catch(() => null);
        if (token) {
          const user = await fetchUserInfo(token).catch(() => null);
          return { success: true, user };
        }
        return { success: true, user: null };
      }

      if (message.action === 'logout') {
        const token = await getAuthToken(false).catch(() => null);
        if (token) {
          await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`).catch(() => null);
          chrome.identity.removeCachedAuthToken({ token }, () => {});
        }
        await chrome.storage.local.remove(['google_user_info']);
        return { success: true };
      }

      if (message.action === 'openTab') {
        await chrome.tabs.create({ url: message.url });
        return { success: true };
      }

      
      const token = await getAuthToken(false);

      if (message.action === 'listFiles') {
        const files = await listFiles(token);
        return { success: true, files };
      }

      if (message.action === 'getFile') {
        const content = await getFileContent(token, message.fileId);
        return { success: true, content };
      }

      if (message.action === 'saveFile') {
        const result = await saveFile(token, message.name, message.content, message.fileId);
        return { success: true, file: result };
      }

      if (message.action === 'renameFile') {
        const result = await renameFile(token, message.fileId, message.name);
        return { success: true, file: result };
      }

      if (message.action === 'deleteFile') {
        await deleteFile(token, message.fileId);
        return { success: true };
      }

      throw new Error(`Unknown action: ${message.action}`);
    } catch (error) {
      console.error(`[Background] Error handling action ${message.action}:`, error);
      return { success: false, error: error.message };
    }
  };

  handleMessage().then(sendResponse);
  return true; 
});
