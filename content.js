console.log("Excalidraw+ extension active: Excalifont overridden and Google Drive Sync enabled.");

let currentUser = null;
let projectList = [];
let activeFileId = localStorage.getItem('excalidraw-plus-active-file-id') || null;
let lastSavedElementsString = "";
let isEditingName = false;
let editingFileId = null;


function showToast(message) {
  let container = document.getElementById('excalidraw-plus-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'excalidraw-plus-toast-container';
    container.className = 'excalidraw excalidraw-plus-toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = 'Toast';
  toast.role = 'status';
  toast.style.pointerEvents = 'auto'; 
  toast.innerHTML = `<div class="Toast__message">${message}</div>`;
  container.appendChild(toast);
  
  
  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}


function showConfirmDialog(title, message, onConfirm) {
  const container = document.createElement('div');
  container.className = 'excalidraw excalidraw-modal-container';
  container.innerHTML = `
    <div class="Modal Dialog ConfirmDialog">
      <div class="Modal__background" id="excalidraw-confirm-bg"></div>
      <div class="Modal__content" style="--max-width: 420px;">
        <div class="Island">
          <h2 class="Dialog__title"><span class="Dialog__titleContent">${title}</span></h2>
          <button class="Modal__close" id="excalidraw-confirm-close-btn" aria-label="Close" type="button">
            <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <g stroke-width="1.5">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"></path>
              </g>
            </svg>
          </button>
          <div class="Dialog__content">
            <p style="margin-bottom: 24px; line-height: 1.5; font-size: 13px; color: var(--text-primary-color);">${message}</p>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button class="excalidraw-plus-btn excalidraw-plus-btn-secondary" id="excalidraw-confirm-cancel" style="height: 36px; font-size: 13px;">Cancel</button>
              <button class="excalidraw-plus-btn excalidraw-plus-btn-primary" style="background-color: var(--color-critical, #ea4335); height: 36px; font-size: 13px;" id="excalidraw-confirm-ok">Confirm</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);
  
  const close = () => container.remove();
  document.getElementById('excalidraw-confirm-bg').addEventListener('click', close);
  document.getElementById('excalidraw-confirm-close-btn').addEventListener('click', close);
  document.getElementById('excalidraw-confirm-cancel').addEventListener('click', close);
  document.getElementById('excalidraw-confirm-ok').addEventListener('click', () => {
    close();
    onConfirm();
  });
}


function showLoadingOverlay(message = "Loading drawing from Cloud...") {
  let loader = document.getElementById('excalidraw-plus-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'excalidraw-plus-loader';
    loader.className = 'excalidraw-plus-loading-overlay';
    loader.innerHTML = `
      <div class="excalidraw-plus-spinner"></div>
      <div style="font-weight: 600; font-size: 14px;">${message}</div>
    `;
    document.documentElement.appendChild(loader);
  }
}

function hideLoadingOverlay() {
  const loader = document.getElementById('excalidraw-plus-loader');
  if (loader) {
    loader.remove();
  }
}


function showLoadingOverlay(message = "Loading drawing from Cloud...") {
  let loader = document.getElementById('excalidraw-plus-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'excalidraw-plus-loader';
    loader.className = 'excalidraw-plus-loading-overlay';
    loader.innerHTML = `
      <div class="excalidraw-plus-spinner"></div>
      <div style="font-weight: 600; font-size: 14px;">${message}</div>
    `;
    document.documentElement.appendChild(loader);
  }
}


function injectUI() {
  if (document.getElementById('excalidraw-plus-modal-container')) return;

  const container = document.createElement('div');
  container.id = 'excalidraw-plus-modal-container';
  container.className = 'excalidraw excalidraw-modal-container excalidraw-plus-modal-overlay';
  
  container.innerHTML = `
    <div class="Modal Dialog">
      <div class="Modal__background" id="excalidraw-plus-modal-bg"></div>
      <div class="Modal__content" style="--max-width: 500px;" tabindex="0">
        <div class="Island">
          <h2 class="Dialog__title">
            <span class="Dialog__titleContent">Excalidraw+ Cloud</span>
          </h2>
          <button class="Modal__close" id="excalidraw-plus-close-btn" aria-label="Close" type="button">
            <svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <g stroke-width="1.5">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"></path>
              </g>
            </svg>
          </button>
          
          <div class="Dialog__content">
            <div id="excalidraw-plus-auth-section"></div>
            <div id="excalidraw-plus-main-content"></div>
            <div id="excalidraw-plus-footer-section" style="margin-top: 12px; padding-top: 0; display: none;">
              <button class="excalidraw-plus-btn excalidraw-plus-btn-danger-text" id="excalidraw-plus-logout-btn" style="width: 100%;">Sign out</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  document.getElementById('excalidraw-plus-modal-bg').addEventListener('click', closeModal);
  document.getElementById('excalidraw-plus-close-btn').addEventListener('click', closeModal);
  document.getElementById('excalidraw-plus-logout-btn').addEventListener('click', handleLogout);

  checkUserStatus();
}

function openModal() {
  const container = document.getElementById('excalidraw-plus-modal-container');
  if (container) {
    container.classList.add('open');
    if (currentUser) {
      loadProjects();
    }
  }
}


function closeModal() {
  const container = document.getElementById('excalidraw-plus-modal-container');
  if (container) {
    container.classList.remove('open');
    isEditingName = false;
  }
}


async function checkUserStatus() {
  chrome.runtime.sendMessage({ action: 'getUser' }, (response) => {
    if (response && response.success && response.user) {
      currentUser = response.user;
      renderUserUI();
      loadProjects();
    } else {
      currentUser = null;
      renderLoginUI();
    }
  });
}

function renderLoginUI() {
  const authSection = document.getElementById('excalidraw-plus-auth-section');
  const mainContent = document.getElementById('excalidraw-plus-main-content');
  const footerSection = document.getElementById('excalidraw-plus-footer-section');

  authSection.innerHTML = '';
  footerSection.style.display = 'none';

  mainContent.innerHTML = `
    <div class="excalidraw-plus-state">
      <p style="margin-bottom: 24px; line-height: 1.6; font-size: 13px;">Sign in with Google to sync, save, and manage your drawing projects directly on your Google Drive.</p>
      <button class="excalidraw-plus-btn excalidraw-plus-btn-primary" id="excalidraw-plus-login-btn" style="width: 100%; height: 42px;">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3 0.643 4.56 1.814l2.43-2.43C17.27 1.637 14.87 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.795 0 10.24-4.11 10.24-10.24 0-.568-.057-1.125-.17-1.67H12.24z"/>
        </svg>
        Sign in with Google
      </button>
    </div>
  `;

  document.getElementById('excalidraw-plus-login-btn').addEventListener('click', handleLogin);
}

function getLastSyncTime() {
  return sessionStorage.getItem('excalidraw-plus-last-sync') || 'Never';
}

function updateLastSyncTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  sessionStorage.setItem('excalidraw-plus-last-sync', timeStr);
}

function renderUserUI() {
  const authSection = document.getElementById('excalidraw-plus-auth-section');
  const mainContent = document.getElementById('excalidraw-plus-main-content');
  const footerSection = document.getElementById('excalidraw-plus-footer-section');

  if (footerSection) footerSection.style.display = 'none';

  authSection.innerHTML = `
    <div class="excalidraw-plus-profile">
      <img src="${currentUser.picture || 'https://www.gstatic.com/images/branding/product/1x/avatar_square_blue_512dp.png'}" class="excalidraw-plus-avatar" alt="Avatar">
      <div class="excalidraw-plus-profile-info">
        <span class="excalidraw-plus-username">${currentUser.name}</span>
        <span class="excalidraw-plus-email">${currentUser.email}</span>
      </div>
      <button class="excalidraw-plus-btn excalidraw-plus-btn-secondary" id="excalidraw-plus-logout-btn" style="height: 28px; padding: 0 10px; font-size: 11px; border-color: var(--color-critical, #ea4335); color: var(--color-critical, #ea4335); font-weight: 600;">Sign out</button>
    </div>
  `;

  document.getElementById('excalidraw-plus-logout-btn').addEventListener('click', handleLogout);

  mainContent.innerHTML = `
    <div id="excalidraw-plus-active-status-container"></div>
    
    <div class="excalidraw-plus-section-title">
      <span>Cloud Projects</span>
      <button class="excalidraw-plus-btn excalidraw-plus-btn-secondary" id="excalidraw-plus-new-btn" style="height: 30px; padding: 0 10px; font-size: 13px;">+ Create new</button>
    </div>
    <div id="excalidraw-plus-project-list-container">
      <div class="excalidraw-plus-state">Loading projects...</div>
    </div>
  `;

  renderActiveProjectStatus();

  document.getElementById('excalidraw-plus-new-btn').addEventListener('click', handleCreateNewProject);
}

function renderActiveProjectStatus() {
  const statusContainer = document.getElementById('excalidraw-plus-active-status-container');
  if (!statusContainer) return;

  const activeProject = activeFileId ? projectList.find(p => p.id === activeFileId) : null;
  const activeName = activeProject ? activeProject.name : getActiveFilename();

  if (activeFileId) {
    statusContainer.innerHTML = `
      <div class="excalidraw-plus-active-project-card">
        <div class="excalidraw-plus-card-header" style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px; overflow: hidden; flex-grow: 1;">
            <svg class="excalidraw-plus-cloud-icon active" viewBox="0 0 24 24" width="20" height="20" style="flex-shrink: 0;">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>
            </svg>
            <div class="excalidraw-plus-card-title-group" style="overflow: hidden;">
              <div class="excalidraw-plus-card-status">Linked to Cloud</div>
              <div class="excalidraw-plus-card-name" id="excalidraw-plus-active-name" style="white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${activeName}</div>
            </div>
          </div>
          <button class="excalidraw-plus-btn excalidraw-plus-btn-primary" id="excalidraw-plus-sync-btn" style="height: 30px; font-size: 12px; padding: 0 10px; flex-shrink: 0;">Sync Now</button>
        </div>
      </div>
    `;

    document.getElementById('excalidraw-plus-sync-btn').addEventListener('click', () => handleSaveProject(false));
  } else {
    statusContainer.innerHTML = `
      <div class="excalidraw-plus-input-group">
        <input type="text" id="excalidraw-plus-filename" class="excalidraw-plus-input" placeholder="Drawing name..." value="${getActiveFilename()}">
        <button class="excalidraw-plus-btn excalidraw-plus-btn-primary" id="excalidraw-plus-save-btn">Save to Cloud</button>
      </div>
    `;

    document.getElementById('excalidraw-plus-save-btn').addEventListener('click', () => handleSaveProject(false));
  }
}

async function handleRenameProjectInList(fileId, oldName, inputEl) {
  const newName = inputEl.value.trim();
  if (!newName) return showToast("Name cannot be empty");
  if (newName === oldName) {
    editingFileId = null;
    renderProjectList();
    return;
  }

  chrome.runtime.sendMessage({
    action: 'renameFile',
    fileId: fileId,
    name: newName
  }, (response) => {
    editingFileId = null;
    if (response && response.success) {
      showToast("Drawing renamed successfully.");
      if (fileId === activeFileId) {
        try {
          const stateObj = JSON.parse(localStorage.getItem('excalidraw-state') || '{}');
          stateObj.name = newName;
          localStorage.setItem('excalidraw-state', JSON.stringify(stateObj));
        } catch (e) {}
      }
      loadProjects();
    } else {
      showToast("Rename failed: " + (response ? response.error : "Connection error"));
      renderProjectList();
    }
  });
}

function getActiveFilename() {
  try {
    const rawState = localStorage.getItem('excalidraw-state');
    if (rawState) {
      const state = JSON.parse(rawState);
      if (state.name) return state.name;
    }
  } catch (e) {}
  return "Untitled Drawing";
}

async function handleLogin() {
  chrome.runtime.sendMessage({ action: 'login' }, (response) => {
    if (response && response.success) {
      currentUser = response.user;
      renderUserUI();
      loadProjects();
      showToast("Logged in successfully!");
    } else {
      showToast("Login failed: " + (response ? response.error : "Connection error"));
    }
  });
}

async function handleLogout() {
  chrome.runtime.sendMessage({ action: 'logout' }, (response) => {
    currentUser = null;
    projectList = [];
    activeFileId = null;
    localStorage.removeItem('excalidraw-plus-active-file-id');
    renderLoginUI();
    showToast("Signed out successfully.");
  });
}

async function loadProjects() {
  const container = document.getElementById('excalidraw-plus-project-list-container');
  if (!container) return;

  chrome.runtime.sendMessage({ action: 'listFiles' }, (response) => {
    if (response && response.success) {
      
      projectList = response.files.filter(f => f.name !== 'lumina_backup.json');
      renderProjectList();
    } else {
      container.innerHTML = `<div class="excalidraw-plus-state" style="color:var(--color-critical);">Failed to load cloud projects.</div>`;
    }
  });
}

function renderProjectList() {
  const container = document.getElementById('excalidraw-plus-project-list-container');
  if (!container) return;

  if (projectList.length === 0) {
    container.innerHTML = `<div class="excalidraw-plus-state">No drawings on Cloud yet.</div>`;
    return;
  }

  const listHtml = projectList.map(file => {
    const isEditing = file.id === editingFileId;
    return `
      <div class="excalidraw-plus-item" data-id="${file.id}">
        <div class="excalidraw-plus-item-info" id="info-${file.id}">
          ${isEditing ? `
            <input type="text" id="rename-input-${file.id}" class="excalidraw-plus-input" value="${file.name}" style="height: 28px; font-size: 13px; padding: 0 8px; width: 100%;">
          ` : `
            <span class="excalidraw-plus-item-name">${file.name}</span>
            <span class="excalidraw-plus-item-date">Updated: ${new Date(file.modifiedTime).toLocaleString()}</span>
          `}
        </div>
        <div class="excalidraw-plus-item-actions">
          ${isEditing ? `
            <button class="excalidraw-plus-action-icon-btn save-rename-btn" data-id="${file.id}" title="Save rename">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <button class="excalidraw-plus-action-icon-btn cancel-rename-btn" title="Cancel">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          ` : `
            <button class="excalidraw-plus-action-icon-btn rename-btn" data-id="${file.id}" title="Rename drawing">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="excalidraw-plus-action-icon-btn delete delete-btn" data-id="${file.id}" title="Delete drawing">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="excalidraw-plus-list">${listHtml}</div>`;

  renderActiveProjectStatus();

  projectList.forEach(file => {
    const infoEl = document.getElementById(`info-${file.id}`);
    const isEditing = file.id === editingFileId;

    if (!isEditing && infoEl) {
      infoEl.addEventListener('click', () => {
        if (file.id === activeFileId) {
          closeModal();
          return;
        }
        showConfirmDialog(
          "Load Drawing",
          `Are you sure you want to load "${file.name}"? Current canvas data in this tab will be overwritten.`,
          () => handleLoadProject(file.id, file.name)
        );
      });
    }

    if (isEditing) {
      const inputEl = document.getElementById(`rename-input-${file.id}`);
      if (inputEl) {
        inputEl.focus();
        inputEl.select();
        inputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            handleRenameProjectInList(file.id, file.name, inputEl);
          }
          if (e.key === 'Escape') {
            editingFileId = null;
            renderProjectList();
          }
        });
      }

      const saveBtn = container.querySelector(`.save-rename-btn[data-id="${file.id}"]`);
      if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleRenameProjectInList(file.id, file.name, inputEl);
        });
      }

      const cancelBtn = container.querySelector('.cancel-rename-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          editingFileId = null;
          renderProjectList();
        });
      }
    } else {
      const renameBtn = container.querySelector(`.rename-btn[data-id="${file.id}"]`);
      if (renameBtn) {
        renameBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          editingFileId = file.id;
          renderProjectList();
        });
      }

      const deleteBtn = container.querySelector(`.delete-btn[data-id="${file.id}"]`);
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          showConfirmDialog(
            "Delete Drawing",
            `Are you sure you want to delete "${file.name}" from Cloud?`,
            () => handleDeleteProject(file.id)
          );
        });
      }
    }
  });
}

async function handleCreateNewProject() {
  if (currentUser) {
    const elements = localStorage.getItem('excalidraw');
    if (elements && elements !== "[]" && elements !== "") {
      showToast("Saving current project before creating new...");
      const saved = await handleSaveProject();
      if (!saved) {
        showToast("Could not save current drawing. Please save manually first.");
        return;
      }
    }
  }

  closeModal();
  
  
  localStorage.removeItem('excalidraw-plus-active-file-id');
  activeFileId = null;
  renderActiveProjectStatus();

  
  let clearBtn = document.querySelector('[data-testid="clear-canvas-button"]');
  if (clearBtn) {
    clearBtn.click();
    return;
  }

  
  const menuTrigger = document.querySelector('.dropdown-menu-trigger, button[aria-label="Main menu"], button[aria-label="Menu"]');
  if (menuTrigger) {
    menuTrigger.click();
    setTimeout(() => {
      clearBtn = document.querySelector('[data-testid="clear-canvas-button"]');
      if (clearBtn) {
        clearBtn.click();
      } else {
        
        localStorage.removeItem('excalidraw');
        localStorage.removeItem('excalidraw-files');
        const cleanState = {
          name: "Untitled Drawing",
          theme: localStorage.getItem('theme') || 'light',
          viewBackgroundColor: '#ffffff'
        };
        localStorage.setItem('excalidraw-state', JSON.stringify(cleanState));
        window.location.reload();
      }
    }, 100);
  } else {
    
    localStorage.removeItem('excalidraw');
    localStorage.removeItem('excalidraw-files');
    const cleanState = {
      name: "Untitled Drawing",
      theme: localStorage.getItem('theme') || 'light',
      viewBackgroundColor: '#ffffff'
    };
    localStorage.setItem('excalidraw-state', JSON.stringify(cleanState));
    window.location.reload();
  }
}

async function handleSaveProject(forceNew = false) {
  return new Promise((resolve) => {
    const nameInput = document.getElementById('excalidraw-plus-filename');
    const name = nameInput ? nameInput.value.trim() : getActiveFilename();
    if (!name) {
      showToast("Please enter a drawing name");
      resolve(false);
      return;
    }

    const elements = localStorage.getItem('excalidraw');
    const state = localStorage.getItem('excalidraw-state');
    const files = localStorage.getItem('excalidraw-files');

    if (!elements) {
      showToast("No drawing data to save!");
      resolve(false);
      return;
    }

    const content = {
      elements: JSON.parse(elements),
      appState: state ? JSON.parse(state) : {},
      files: files ? JSON.parse(files) : {}
    };

    content.appState.name = name;

    const saveBtn = document.getElementById('excalidraw-plus-save-btn') || document.getElementById('excalidraw-plus-sync-btn');
    let oldText = "";
    if (saveBtn) {
      oldText = saveBtn.innerHTML;
      saveBtn.innerHTML = "Saving...";
      saveBtn.disabled = true;
    }

    const fileId = forceNew ? null : activeFileId;

    showToast("Saving to Cloud...");

    chrome.runtime.sendMessage({
      action: 'saveFile',
      name: name,
      content: content,
      fileId: fileId
    }, (response) => {
      if (saveBtn) {
        saveBtn.innerHTML = oldText;
        saveBtn.disabled = false;
      }

      if (response && response.success) {
        activeFileId = response.file.id;
        localStorage.setItem('excalidraw-plus-active-file-id', response.file.id);
        lastSavedElementsString = elements;
        updateLastSyncTime();
        showToast(forceNew ? "Created new copy on Cloud!" : "Drawing saved to Cloud!");
        try {
          const stateObj = JSON.parse(localStorage.getItem('excalidraw-state') || '{}');
          stateObj.name = name;
          localStorage.setItem('excalidraw-state', JSON.stringify(stateObj));
        } catch (e) {}
        loadProjects();
        renderActiveProjectStatus();
        resolve(true);
      } else {
        showToast("Save failed: " + (response ? response.error : "Connection error"));
        resolve(false);
      }
    });
  });
}

async function handleAutosave() {
  if (!currentUser || !activeFileId) return;

  const elements = localStorage.getItem('excalidraw');
  if (!elements || elements === lastSavedElementsString) return;

  const name = getActiveFilename();
  const state = localStorage.getItem('excalidraw-state');
  const files = localStorage.getItem('excalidraw-files');

  const content = {
    elements: JSON.parse(elements),
    appState: state ? JSON.parse(state) : {},
    files: files ? JSON.parse(files) : {}
  };

  content.appState.name = name;

  chrome.runtime.sendMessage({
    action: 'saveFile',
    name: name,
    content: content,
    fileId: activeFileId
  }, (response) => {
    if (response && response.success) {
      lastSavedElementsString = elements;
      updateLastSyncTime();
      showToast("Autosaved to Cloud");
    }
  });
}

async function handleLoadProject(fileId, filename) {
  closeModal();
  showLoadingOverlay("Loading drawing...");

  chrome.runtime.sendMessage({
    action: 'getFile',
    fileId: fileId
  }, (response) => {
    if (response && response.success && response.content) {
      const content = response.content;
      
      localStorage.setItem('excalidraw', JSON.stringify(content.elements || []));
      if (content.appState) {
        localStorage.setItem('excalidraw-state', JSON.stringify(content.appState));
      }
      if (content.files) {
        localStorage.setItem('excalidraw-files', JSON.stringify(content.files));
      }
      
      localStorage.setItem('excalidraw-plus-active-file-id', fileId);

      window.location.reload();
    } else {
      showToast("Failed to load drawing: " + (response ? response.error : "Unknown error"));
      hideLoadingOverlay();
    }
  });
}

async function handleDeleteProject(fileId) {
  chrome.runtime.sendMessage({
    action: 'deleteFile',
    fileId: fileId
  }, (response) => {
    if (response && response.success) {
      if (activeFileId === fileId) {
        activeFileId = null;
        localStorage.removeItem('excalidraw-plus-active-file-id');
      }
      showToast("Drawing deleted successfully.");
      loadProjects();
    } else {
      showToast("Delete failed: " + (response ? response.error : "Unknown error"));
    }
  });
}


const observer = new MutationObserver((mutations) => {
  
  const signinLink = document.querySelector('a[href*="utm_source=signin"]');
  if (signinLink && !signinLink.classList.contains('excalidraw-plus-processed')) {
    signinLink.classList.add('excalidraw-plus-processed');
    
    const googleBtn = document.createElement('a');
    googleBtn.className = 'excalidraw-plus-signin-btn radix-menu-item dropdown-menu-item dropdown-menu-item-base highlighted';
    googleBtn.role = 'menuitem';
    googleBtn.innerHTML = `
      <div class="dropdown-menu-item__icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3 0.643 4.56 1.814l2.43-2.43C17.27 1.637 14.87 1 12.24 1 6.58 1 2 5.58 2 11.24s4.58 10.24 10.24 10.24c5.795 0 10.24-4.11 10.24-10.24 0-.568-.057-1.125-.17-1.67H12.24z"/>
        </svg>
      </div>
      <div class="dropdown-menu-item__text">
        <span style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">Sign in with Google</span>
      </div>
    `;

    googleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.body.click(); 
      openModal();
    });

    signinLink.parentNode.replaceChild(googleBtn, signinLink);
  }

  
  const plusBanner = document.querySelector('.plus-banner');
  if (plusBanner && !plusBanner.classList.contains('excalidraw-plus-processed')) {
    plusBanner.classList.add('excalidraw-plus-processed');
    
    plusBanner.removeAttribute('href');
    plusBanner.removeAttribute('target');
    plusBanner.removeAttribute('rel');
    plusBanner.style.cursor = 'pointer';
    
    plusBanner.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModal();
    });
  }
});


function init() {
  lastSavedElementsString = localStorage.getItem('excalidraw') || "";
  
  observer.observe(document.documentElement, { childList: true, subtree: true });
  
  
  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      event.stopPropagation();
      if (!currentUser) {
        showToast("Please sign in with Google first to save drawings to Cloud.");
        openModal();
      } else {
        if (!activeFileId) {
          openModal();
          setTimeout(() => {
            const input = document.getElementById('excalidraw-plus-filename');
            if (input) {
              input.focus();
              input.select();
            }
          }, 150);
        } else {
          handleSaveProject();
        }
      }
    }
  }, true);

  
  setInterval(handleAutosave, 900000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectUI);
  } else {
    injectUI();
  }
}

init();
