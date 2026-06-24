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
      <div class="Modal__content excalidraw-confirm-dialog-content">
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
            <p class="excalidraw-confirm-text">${message}</p>
            <div class="excalidraw-confirm-actions">
              <button class="excalidraw-plus-btn excalidraw-plus-btn-secondary excalidraw-confirm-btn-secondary" id="excalidraw-confirm-cancel">Cancel</button>
              <button class="excalidraw-plus-btn excalidraw-plus-btn-primary excalidraw-confirm-btn-primary" id="excalidraw-confirm-ok">Confirm</button>
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
      <div class="excalidraw-plus-loader-text">${message}</div>
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


function injectUI() {
  if (document.getElementById('excalidraw-plus-modal-container')) return;

  const container = document.createElement('div');
  container.id = 'excalidraw-plus-modal-container';
  container.className = 'excalidraw excalidraw-modal-container excalidraw-plus-modal-overlay';

  container.innerHTML = `
    <div class="Modal Dialog">
      <div class="Modal__background" id="excalidraw-plus-modal-bg"></div>
      <div class="Modal__content excalidraw-plus-dialog-content" tabindex="0">
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
            <div id="excalidraw-plus-footer-section" class="excalidraw-plus-footer">
              <button class="excalidraw-plus-btn excalidraw-plus-btn-danger-text excalidraw-plus-btn-full" id="excalidraw-plus-logout-btn">Sign out</button>
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
      checkCloudVersion();
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
      <p class="excalidraw-plus-login-desc">Sign in with Google to sync, save, and manage your drawing projects directly on your Google Drive.</p>
      <button class="excalidraw-plus-login-btn" id="excalidraw-plus-login-btn">
        <svg height="18" style="flex:none;line-height:1" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><title>Google</title><path d="M23 12.245c0-.905-.075-1.565-.236-2.25h-10.54v4.083h6.186c-.124 1.014-.797 2.542-2.294 3.569l-.021.136 3.332 2.53.23.022C21.779 18.417 23 15.593 23 12.245z" fill="#4285F4"></path><path d="M12.225 23c3.03 0 5.574-.978 7.433-2.665l-3.542-2.688c-.948.648-2.22 1.1-3.891 1.1a6.745 6.745 0 01-6.386-4.572l-.132.011-3.465 2.628-.045.124C4.043 20.531 7.835 23 12.225 23z" fill="#34A853"></path><path d="M5.84 14.175A6.65 6.65 0 015.463 12c0-.758.138-1.491.361-2.175l-.006-.147-3.508-2.67-.115.054A10.831 10.831 0 001 12c0 1.772.436 3.447 1.197 4.938l3.642-2.763z" fill="#FBBC05"></path><path d="M12.225 5.253c2.108 0 3.529.892 4.34 1.638l3.167-3.031C17.787 2.088 15.255 1 12.225 1 7.834 1 4.043 3.469 2.197 7.062l3.63 2.763a6.77 6.77 0 016.398-4.572z" fill="#EB4335"></path></svg>
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
  const backupTime = localStorage.getItem('excalidraw-plus-backup-time');
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
      <button class="excalidraw-plus-btn excalidraw-plus-btn-secondary excalidraw-plus-logout-btn-small" id="excalidraw-plus-logout-btn">Sign out</button>
    </div>
  `;

  document.getElementById('excalidraw-plus-logout-btn').addEventListener('click', handleLogout);

  const backupBtnHtml = backupTime ? `
    <button class="excalidraw-plus-btn excalidraw-plus-btn-secondary excalidraw-plus-restore-btn" id="excalidraw-plus-restore-btn" title="Restore last backup from ${backupTime}">Restore Backup</button>
  ` : '';

  mainContent.innerHTML = `
    <div id="excalidraw-plus-active-status-container"></div>
    
    <div class="excalidraw-plus-section-title">
      <span>Cloud Projects</span>
      <div class="excalidraw-plus-section-actions">
        ${backupBtnHtml}
        <button class="excalidraw-plus-btn excalidraw-plus-btn-secondary excalidraw-plus-new-btn" id="excalidraw-plus-new-btn">+ Create new</button>
      </div>
    </div>
    <div id="excalidraw-plus-project-list-container">
      <div class="excalidraw-plus-state">Loading projects...</div>
    </div>
  `;

  renderActiveProjectStatus();

  document.getElementById('excalidraw-plus-new-btn').addEventListener('click', handleCreateNewProject);
  if (backupTime) {
    document.getElementById('excalidraw-plus-restore-btn').addEventListener('click', handleRestoreBackup);
  }
}

function renderActiveProjectStatus() {
  const statusContainer = document.getElementById('excalidraw-plus-active-status-container');
  if (!statusContainer) return;

  const activeProject = activeFileId ? projectList.find(p => p.id === activeFileId) : null;
  const activeName = activeProject ? activeProject.name : getActiveFilename();

  if (activeFileId) {
    statusContainer.innerHTML = `
      <div class="excalidraw-plus-active-project-card">
        <div class="excalidraw-plus-card-header excalidraw-plus-card-header-flex">
          <div class="excalidraw-plus-card-info-flex">
            <svg class="excalidraw-plus-cloud-icon active excalidraw-plus-flex-shrink-0" viewBox="0 0 24 24" width="20" height="20">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>
            </svg>
            <div class="excalidraw-plus-card-title-group excalidraw-plus-overflow-hidden">
              <div class="excalidraw-plus-card-status">Linked to Cloud</div>
              <div class="excalidraw-plus-card-name excalidraw-plus-text-ellipsis" id="excalidraw-plus-active-name">${activeName}</div>
            </div>
          </div>
          <button class="excalidraw-plus-btn excalidraw-plus-btn-primary excalidraw-plus-sync-btn-small" id="excalidraw-plus-sync-btn">Sync Now</button>
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
        } catch (e) { }
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
  } catch (e) { }
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
      container.innerHTML = `<div class="excalidraw-plus-state excalidraw-plus-state-error">Failed to load cloud projects.</div>`;
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
            <input type="text" id="rename-input-${file.id}" class="excalidraw-plus-input excalidraw-plus-rename-input-small" value="${file.name}">
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
      infoEl.addEventListener('click', async () => {
        if (file.id === activeFileId) {
          closeModal();
          return;
        }

        const elements = localStorage.getItem('excalidraw');
        const isCanvasEmpty = !elements || elements === "[]" || elements === "";

        if (isCanvasEmpty) {
          handleLoadProject(file.id, file.name);
        } else {
          if (activeFileId) {
            showToast("Saving current changes...");
            const saved = await handleSaveProject();
            if (saved) {
              handleLoadProject(file.id, file.name);
            } else {
              showConfirmDialog(
                "Load Drawing",
                `Failed to autosave. Are you sure you want to load "${file.name}"? Current canvas data in this tab will be overwritten.`,
                () => handleLoadProject(file.id, file.name)
              );
            }
          } else {
            showConfirmDialog(
              "Load Drawing",
              `Are you sure you want to load "${file.name}"? Current canvas data in this tab will be overwritten.`,
              () => handleLoadProject(file.id, file.name)
            );
          }
        }
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

    const fileId = forceNew ? null : activeFileId;

    if (elements === "[]" && fileId) {
      showToast("Cannot overwrite a cloud project with an empty canvas.");
      resolve(false);
    } else {
      proceedWithSave(name, elements, state, files, fileId, forceNew, resolve);
    }
  });
}

function proceedWithSave(name, elements, state, files, fileId, forceNew, resolve) {
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
      if (response.file.modifiedTime) {
        localStorage.setItem('excalidraw-plus-active-file-modified-time', response.file.modifiedTime);
      }
      lastSavedElementsString = elements;
      updateLastSyncTime();
      showToast(forceNew ? "Created new copy on Cloud!" : "Drawing saved to Cloud!");
      try {
        const stateObj = JSON.parse(localStorage.getItem('excalidraw-state') || '{}');
        stateObj.name = name;
        localStorage.setItem('excalidraw-state', JSON.stringify(stateObj));
      } catch (e) { }
      loadProjects();
      renderActiveProjectStatus();
      resolve(true);
    } else {
      showToast("Save failed: " + (response ? response.error : "Connection error"));
      resolve(false);
    }
  });
}

async function handleAutosave() {
  if (!currentUser || !activeFileId) return;

  const elements = localStorage.getItem('excalidraw');
  if (!elements || elements === lastSavedElementsString) return;

  if (elements === "[]" && lastSavedElementsString !== "[]" && lastSavedElementsString !== "") {
    return;
  }

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
      if (response.file && response.file.modifiedTime) {
        localStorage.setItem('excalidraw-plus-active-file-modified-time', response.file.modifiedTime);
      }
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

      const currentElements = localStorage.getItem('excalidraw');
      const currentState = localStorage.getItem('excalidraw-state');
      const currentFiles = localStorage.getItem('excalidraw-files');
      if (currentElements && currentElements !== "[]") {
        localStorage.setItem('excalidraw-plus-backup-elements', currentElements);
        if (currentState) localStorage.setItem('excalidraw-plus-backup-state', currentState);
        if (currentFiles) localStorage.setItem('excalidraw-plus-backup-files', currentFiles);
        localStorage.setItem('excalidraw-plus-backup-time', new Date().toLocaleString());
      }

      localStorage.setItem('excalidraw', JSON.stringify(content.elements || []));
      if (content.appState) {
        localStorage.setItem('excalidraw-state', JSON.stringify(content.appState));
      }
      if (content.files) {
        localStorage.setItem('excalidraw-files', JSON.stringify(content.files));
      }

      localStorage.setItem('excalidraw-plus-active-file-id', fileId);
      if (response.metadata && response.metadata.modifiedTime) {
        localStorage.setItem('excalidraw-plus-active-file-modified-time', response.metadata.modifiedTime);
      }

      window.location.reload();
    } else {
      showToast("Failed to load drawing: " + (response ? response.error : "Unknown error"));
      hideLoadingOverlay();
    }
  });
}

function handleRestoreBackup() {
  const backupElements = localStorage.getItem('excalidraw-plus-backup-elements');
  const backupState = localStorage.getItem('excalidraw-plus-backup-state');
  const backupFiles = localStorage.getItem('excalidraw-plus-backup-files');

  if (!backupElements) return showToast("No backup available.");

  showConfirmDialog(
    "Restore Backup",
    "Are you sure you want to restore the backup? This will replace your current canvas.",
    () => {
      localStorage.setItem('excalidraw', backupElements);
      if (backupState) localStorage.setItem('excalidraw-state', backupState);
      if (backupFiles) localStorage.setItem('excalidraw-files', backupFiles);

      localStorage.removeItem('excalidraw-plus-backup-elements');
      localStorage.removeItem('excalidraw-plus-backup-state');
      localStorage.removeItem('excalidraw-plus-backup-files');
      localStorage.removeItem('excalidraw-plus-backup-time');

      showToast("Backup restored successfully.");
      window.location.reload();
    }
  );
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
        <svg height="18" style="flex:none;line-height:1" viewBox="0 0 24 24" width="18" xmlns="http://www.w3.org/2000/svg"><title>Google</title><path d="M23 12.245c0-.905-.075-1.565-.236-2.25h-10.54v4.083h6.186c-.124 1.014-.797 2.542-2.294 3.569l-.021.136 3.332 2.53.23.022C21.779 18.417 23 15.593 23 12.245z" fill="#4285F4"></path><path d="M12.225 23c3.03 0 5.574-.978 7.433-2.665l-3.542-2.688c-.948.648-2.22 1.1-3.891 1.1a6.745 6.745 0 01-6.386-4.572l-.132.011-3.465 2.628-.045.124C4.043 20.531 7.835 23 12.225 23z" fill="#34A853"></path><path d="M5.84 14.175A6.65 6.65 0 015.463 12c0-.758.138-1.491.361-2.175l-.006-.147-3.508-2.67-.115.054A10.831 10.831 0 001 12c0 1.772.436 3.447 1.197 4.938l3.642-2.763z" fill="#FBBC05"></path><path d="M12.225 5.253c2.108 0 3.529.892 4.34 1.638l3.167-3.031C17.787 2.088 15.255 1 12.225 1 7.834 1 4.043 3.469 2.197 7.062l3.63 2.763a6.77 6.77 0 016.398-4.572z" fill="#EB4335"></path></svg>
      </div>
      <div class="dropdown-menu-item__text">
        <span class="excalidraw-plus-text-ellipsis">Sign in with Google</span>
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


let isBannerShowing = false;

async function checkCloudVersion() {
  if (!currentUser || !activeFileId || isBannerShowing) return;

  chrome.runtime.sendMessage({
    action: 'getFileMetadata',
    fileId: activeFileId
  }, (response) => {
    if (response && response.success && response.metadata) {
      const cloudTime = response.metadata.modifiedTime;
      const localTime = localStorage.getItem('excalidraw-plus-active-file-modified-time');

      const elements = localStorage.getItem('excalidraw');
      const isCanvasEmpty = !elements || elements === "[]" || elements === "";

      
      const shouldUpdate = !localTime || (new Date(cloudTime).getTime() > new Date(localTime).getTime() + 5000);

      if (shouldUpdate) {
        
        if (isCanvasEmpty || elements === lastSavedElementsString) {
          
          handleLoadProject(activeFileId, response.metadata.name);
        } else {
          
          showUpdateBanner(response.metadata.name);
        }
      }
    }
  });
}

function showUpdateBanner(fileName) {
  if (document.getElementById('excalidraw-plus-update-banner')) return;
  isBannerShowing = true;

  const banner = document.createElement('div');
  banner.id = 'excalidraw-plus-update-banner';
  banner.className = 'excalidraw-plus-update-banner';
  banner.innerHTML = `
    <div class="excalidraw-plus-banner-content">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
      </svg>
      <span>A newer version of <strong>${fileName}</strong> is available on Cloud.</span>
    </div>
    <div class="excalidraw-plus-banner-actions">
      <button class="excalidraw-plus-btn excalidraw-plus-btn-primary" id="excalidraw-plus-banner-update-btn">Update Canvas</button>
      <button class="excalidraw-plus-btn excalidraw-plus-btn-secondary" id="excalidraw-plus-banner-dismiss-btn">Dismiss</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('excalidraw-plus-banner-update-btn').addEventListener('click', () => {
    banner.remove();
    isBannerShowing = false;
    handleLoadProject(activeFileId, fileName);
  });

  document.getElementById('excalidraw-plus-banner-dismiss-btn').addEventListener('click', () => {
    banner.remove();
    localStorage.setItem('excalidraw-plus-active-file-modified-time', new Date().toISOString());
    isBannerShowing = false;
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    checkCloudVersion();
  }
});


// ============================================================
// GEMINI AI ASSISTANT & KEY ROTATION
// ============================================================

let currentApiKeyIndex = 0;

function getApiKeys() {
  try {
    const stored = localStorage.getItem('excalidraw-plus-gemini-keys');
    if (stored) {
      const keys = JSON.parse(stored);
      if (Array.isArray(keys) && keys.length > 0) {
        return keys.map(k => k.trim()).filter(Boolean);
      }
    }
  } catch (e) {}
  return [];
}

function saveApiKeys(keysArray) {
  localStorage.setItem('excalidraw-plus-gemini-keys', JSON.stringify(keysArray));
  currentApiKeyIndex = 0; 
}

async function callGeminiAPI(prompt, systemInstruction) {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error("No Gemini API Keys found. Please configure them in the AI panel settings.");
  }

  let lastError = null;
  const originalIndex = currentApiKeyIndex;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const currentIndex = (originalIndex + attempt) % keys.length;
    const apiKey = keys[currentIndex];

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] }
        })
      });

      if (response.status === 429) {
        throw new Error("Rate limit exceeded (HTTP 429)");
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      currentApiKeyIndex = currentIndex; 
      
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        throw new Error("Empty response received from Gemini API");
      }
      return candidateText;
    } catch (err) {
      console.warn(`[Gemini AI] Key index ${currentIndex} failed:`, err.message);
      lastError = err;
      
      if (keys.length > 1) {
        showToast(`API Key ${currentIndex + 1} failed. Rotating to next key...`);
      }
    }
  }

  throw new Error(`All configured Gemini API Keys failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
}

async function loadMermaidLibrary() {
  if (window.parseMermaidToExcalidraw && window.convertToExcalidrawElements) {
    return {
      parseMermaidToExcalidraw: window.parseMermaidToExcalidraw,
      convertToExcalidrawElements: window.convertToExcalidrawElements
    };
  }

  
  return new Promise((resolve, reject) => {
    
    const tryFindOnWindow = () => {
      
      if (window.parseMermaidToExcalidraw && window.convertToExcalidrawElements) {
        resolve({
          parseMermaidToExcalidraw: window.parseMermaidToExcalidraw,
          convertToExcalidrawElements: window.convertToExcalidrawElements
        });
        return true;
      }
      
      const excalidrawLib = window.ExcalidrawLib || window.Excalidraw;
      if (excalidrawLib && excalidrawLib.parseMermaidToExcalidraw) {
        resolve({
          parseMermaidToExcalidraw: excalidrawLib.parseMermaidToExcalidraw,
          convertToExcalidrawElements: excalidrawLib.convertToExcalidrawElements || window.convertToExcalidrawElements
        });
        return true;
      }
      return false;
    };

    if (tryFindOnWindow()) return;

    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@excalidraw/mermaid-to-excalidraw@2.2.2/dist/index.js';
    script.onload = () => {
      if (window.parseMermaidToExcalidraw) {
        resolve({
          parseMermaidToExcalidraw: window.parseMermaidToExcalidraw,
          convertToExcalidrawElements: window.convertToExcalidrawElements || (window.ExcalidrawLib && window.ExcalidrawLib.convertToExcalidrawElements)
        });
      } else {
        
        const script2 = document.createElement('script');
        script2.src = 'https://cdn.jsdelivr.net/npm/@excalidraw/excalidraw@0.17.6/dist/excalidraw.production.min.js';
        script2.onload = () => {
          resolve({
            parseMermaidToExcalidraw: window.parseMermaidToExcalidraw || (window.ExcalidrawLib && window.ExcalidrawLib.parseMermaidToExcalidraw),
            convertToExcalidrawElements: window.convertToExcalidrawElements || (window.ExcalidrawLib && window.ExcalidrawLib.convertToExcalidrawElements)
          });
        };
        script2.onerror = () => reject(new Error("Failed to load Excalidraw elements converter"));
        document.head.appendChild(script2);
      }
    };
    script.onerror = () => reject(new Error("Failed to load Mermaid parsing CDN library"));
    document.head.appendChild(script);
  });
}

async function drawMermaidOnCanvas(mermaidCode) {
  showLoadingOverlay("Generating Excalidraw elements...");
  try {
    const libs = await loadMermaidLibrary();
    if (!libs.parseMermaidToExcalidraw) {
      throw new Error("Mermaid parser not ready or loaded.");
    }

    const cleanMermaid = mermaidCode
      .replace(/```mermaid/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = await libs.parseMermaidToExcalidraw(cleanMermaid);
    if (!parsed || !parsed.elements) {
      throw new Error("Failed to parse Mermaid code to elements structure.");
    }

    
    let convertFn = libs.convertToExcalidrawElements || (window.ExcalidrawLib && window.ExcalidrawLib.convertToExcalidrawElements);
    
    let finalElements = [];
    if (convertFn) {
      finalElements = convertFn(parsed.elements, { regenerateIds: true });
    } else {
      
      finalElements = parsed.elements.map(el => {
        if (!el.id) el.id = Math.random().toString(36).substring(2, 9);
        if (!el.seed) el.seed = Math.floor(Math.random() * 1e9);
        return el;
      });
    }

    
    const currentElements = JSON.parse(localStorage.getItem('excalidraw') || '[]');
    const mergedElements = [...currentElements, ...finalElements];

    localStorage.setItem('excalidraw', JSON.stringify(mergedElements));
    showToast("Diagram imported to canvas successfully!");
    
    setTimeout(() => {
      window.location.reload();
    }, 800);
  } catch (err) {
    console.error("[Excalidraw+ AI Error]", err);
    showToast("Failed to draw diagram: " + err.message);
  } finally {
    hideLoadingOverlay();
  }
}

function injectAIPanel() {
  if (document.getElementById('excalidraw-plus-ai-panel')) return;

  // 1. Create floating toggle button
  const trigger = document.createElement('button');
  trigger.id = 'excalidraw-plus-ai-trigger';
  trigger.className = 'excalidraw-plus-ai-trigger';
  trigger.title = 'AI Assistant';
  trigger.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;
  document.body.appendChild(trigger);

  // 2. Create sidebar panel
  const panel = document.createElement('div');
  panel.id = 'excalidraw-plus-ai-panel';
  panel.className = 'excalidraw-plus-ai-panel';
  
  const savedKeys = getApiKeys().join('\n');

  panel.innerHTML = `
    <div class="excalidraw-plus-ai-header">
      <h3>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
          <polyline points="2 17 12 22 22 17"></polyline>
          <polyline points="2 12 12 17 22 12"></polyline>
        </svg>
        Gemini Assistant
      </h3>
      <div class="excalidraw-plus-ai-header-actions">
        <button class="excalidraw-plus-action-icon-btn" id="excalidraw-plus-ai-gear-btn" title="API Keys Settings">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <button class="excalidraw-plus-action-icon-btn" id="excalidraw-plus-ai-close-btn" title="Close Panel">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>

    <!-- API Key Settings Section -->
    <div class="excalidraw-plus-ai-keys-modal" id="excalidraw-plus-ai-keys-modal">
      <div class="excalidraw-plus-ai-keys-label">Gemini API Keys (One per line)</div>
      <textarea class="excalidraw-plus-ai-keys-textarea" id="excalidraw-plus-ai-keys-textarea" placeholder="Paste your API keys here...">${savedKeys}</textarea>
      <button class="excalidraw-plus-btn excalidraw-plus-btn-primary" id="excalidraw-plus-ai-save-keys-btn">Save Keys</button>
    </div>

    <!-- Chat history -->
    <div class="excalidraw-plus-ai-chat-history" id="excalidraw-plus-ai-chat-history">
      <div class="excalidraw-plus-ai-msg assistant">
        Hi! I can draw diagrams directly on your canvas. Describe what you want to draw (e.g. "flowchart of signup process").
      </div>
    </div>

    <!-- Input text box -->
    <div class="excalidraw-plus-ai-input-area">
      <textarea class="excalidraw-plus-ai-textarea" id="excalidraw-plus-ai-textarea" placeholder="Ask AI to draw something..."></textarea>
      <button class="excalidraw-plus-btn excalidraw-plus-btn-primary excalidraw-plus-ai-send-btn" id="excalidraw-plus-ai-send-btn">Generate</button>
    </div>
  `;
  document.body.appendChild(panel);

  // Setup UI Listeners
  trigger.addEventListener('click', () => {
    panel.classList.toggle('open');
  });

  document.getElementById('excalidraw-plus-ai-close-btn').addEventListener('click', () => {
    panel.classList.remove('open');
  });

  const gearBtn = document.getElementById('excalidraw-plus-ai-gear-btn');
  const keysModal = document.getElementById('excalidraw-plus-ai-keys-modal');
  gearBtn.addEventListener('click', () => {
    keysModal.classList.toggle('open');
  });

  document.getElementById('excalidraw-plus-ai-save-keys-btn').addEventListener('click', () => {
    const keysText = document.getElementById('excalidraw-plus-ai-keys-textarea').value;
    const keys = keysText.split('\n').map(k => k.trim()).filter(Boolean);
    saveApiKeys(keys);
    showToast("Gemini API Keys saved successfully!");
    keysModal.classList.remove('open');
  });

  // Chat send logic
  const textarea = document.getElementById('excalidraw-plus-ai-textarea');
  const sendBtn = document.getElementById('excalidraw-plus-ai-send-btn');
  const chatHistory = document.getElementById('excalidraw-plus-ai-chat-history');

  async function handleSend() {
    const prompt = textarea.value.trim();
    if (!prompt) return;

    // Append user message
    const userMsg = document.createElement('div');
    userMsg.className = 'excalidraw-plus-ai-msg user';
    userMsg.textContent = prompt;
    chatHistory.appendChild(userMsg);
    textarea.value = "";
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Loading status from Assistant
    const loaderMsg = document.createElement('div');
    loaderMsg.className = 'excalidraw-plus-ai-msg assistant';
    loaderMsg.innerHTML = '<span class="excalidraw-plus-spinner" style="display:inline-block; width:14px; height:14px; margin:0"></span> Thinking & generating diagram...';
    chatHistory.appendChild(loaderMsg);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
      const systemInstruction = 
        "You are an Excalidraw Mermaid code generator. Your job is to output ONLY valid Mermaid syntax for diagram definitions. " +
        "Output no markdown wrappers, no descriptions, and no code blocks. Just start with diagram types like: " +
        "flowchart TD, flowchart LR, sequenceDiagram, classDiagram, erDiagram. " +
        "Keep the definitions correct and syntactically clean.";

      const response = await callGeminiAPI(prompt, systemInstruction);
      loaderMsg.remove();

      // Display success message
      const assistantMsg = document.createElement('div');
      assistantMsg.className = 'excalidraw-plus-ai-msg assistant';
      assistantMsg.innerHTML = `<strong>Diagram Generated successfully!</strong><br><pre style="white-space:pre-wrap; font-size:11px; margin-top:5px; background:rgba(0,0,0,0.02); padding:5px; border-radius:4px;">${response}</pre>`;
      chatHistory.appendChild(assistantMsg);
      chatHistory.scrollTop = chatHistory.scrollHeight;

      // Draw onto canvas
      await drawMermaidOnCanvas(response);

    } catch (err) {
      loaderMsg.remove();
      const errMsg = document.createElement('div');
      errMsg.className = 'excalidraw-plus-ai-msg error';
      errMsg.textContent = "Error: " + err.message;
      chatHistory.appendChild(errMsg);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }
  }

  sendBtn.addEventListener('click', handleSend);
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
}


function init() {
  lastSavedElementsString = localStorage.getItem('excalidraw') || "";

  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('beforeunload', (event) => {
    const elements = localStorage.getItem('excalidraw');
    if (currentUser && activeFileId && elements && elements !== lastSavedElementsString && elements !== "[]") {
      event.preventDefault();
      event.returnValue = '';
    }
  });

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

  setInterval(handleAutosave, 300000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectUI();
      injectAIPanel();
    });
  } else {
    injectUI();
    injectAIPanel();
  }
}

init();
