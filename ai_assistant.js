/**
 * ExcalidrawPlus AI Assistant — Redesigned
 * Layout: Header with Settings popup | Chat Panel | Preview Panel | Insert Bar
 */

(function () {
  /* ── State ── */
  let isAiModalOpen = false;
  let geminiApiKeys = [];
  let currentKeyIndex = 0;
  let selectedModel = 'gemini-2.5-flash';
  let fetchedModels = ['gemini-2.5-flash', 'gemini-2.5-pro'];
  let modelSearchQuery = '';
  let isGenerating = false;

  // Last successfully parsed result — used for Insert
  let lastParseResult = null;

  /* ─────────────────────────────────────────────
     HTML Template
  ───────────────────────────────────────────── */
  function buildModalHTML() {
    return `
      <!-- Backdrop: clicking it closes the modal -->
      <div class="ep-ai-backdrop" id="ep-ai-backdrop"></div>

      <!-- Dialog box -->
      <div class="ep-ai-dialog" role="dialog" aria-modal="true">

        <!-- ── Header ── -->
        <div class="ep-ai-header">
          <div class="ep-ai-title-left">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--color-primary,#6965db)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span>Diagram Assistant</span>
          </div>
          <div class="ep-ai-title-right">
            <!-- Settings gear -->
            <button class="ep-ai-settings-btn" id="ep-ai-settings-btn" title="AI Settings" type="button">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>

            <!-- Settings Popup -->
            <div class="ep-ai-settings-popup" id="ep-ai-settings-popup">
              <div class="ep-ai-settings-popup-title">AI Settings</div>

              <div class="ep-ai-settings-field">
                <label class="ep-ai-settings-label">Model</label>
                <div class="ep-ai-model-wrapper">
                  <button class="ep-ai-model-trigger" id="ep-ai-model-trigger" type="button">
                    <span id="ep-ai-model-text">gemini-2.5-flash</span>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
                  </button>
                  <div class="ep-ai-model-menu" id="ep-ai-model-menu">
                    <div class="ep-ai-model-search-wrap">
                      <input type="text" id="ep-ai-model-search" placeholder="Search models…">
                    </div>
                    <div class="ep-ai-model-list" id="ep-ai-model-list"></div>
                  </div>
                </div>
              </div>

              <div class="ep-ai-settings-field">
                <label class="ep-ai-settings-label">API Keys <span style="font-weight:400;color:#999;">(one per line)</span></label>
                <textarea class="ep-ai-keys-textarea" id="ep-ai-keys" placeholder="AIza…&#10;AIza… (multiple keys rotate on 429)"></textarea>
              </div>

              <button class="ep-ai-settings-save-btn" id="ep-ai-settings-save" type="button">Save</button>
            </div>

            <!-- Close button -->
            <button class="ep-ai-close-btn" id="ep-ai-close" aria-label="Close" type="button">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- ── Two-column body ── -->
        <div class="ep-ai-body">

          <!-- Left: Chat Panel -->
          <div class="ep-ai-chat-panel">
            <div class="ep-ai-chat-messages" id="ep-ai-chat-messages">
              <div class="ep-ai-msg assistant">
                👋 Describe the diagram you want — flowchart, sequence, ERD, etc. I'll generate and preview it here.
              </div>
            </div>

            <div class="ep-ai-chat-footer">
              <div class="ep-ai-chips" id="ep-ai-chips">
                <div class="ep-ai-chip" data-prompt="Draw a flowchart explaining user login flow with password check">Login Flow</div>
                <div class="ep-ai-chip" data-prompt="Draw a sequence diagram for buying a book on an e-commerce platform">E-commerce</div>
                <div class="ep-ai-chip" data-prompt="Draw an ERD for a habit tracking app with users and entries">Habit ERD</div>
              </div>
              <div class="ep-ai-input-row">
                <input type="text" class="ep-ai-input" id="ep-ai-input" placeholder="Continue refining your diagram…">
                <button class="ep-ai-send-btn" id="ep-ai-send" title="Send" type="button">
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Right: Preview Panel -->
          <div class="ep-ai-preview-panel">
            <div class="ep-ai-preview-toolbar">
              <span class="ep-ai-preview-label">Preview</span>
              <div style="display:flex;align-items:center;gap:8px;">
                <div class="ep-ai-view-tabs">
                  <button class="ep-ai-view-tab active" id="ep-ai-tab-diagram" type="button">Diagram</button>
                  <button class="ep-ai-view-tab" id="ep-ai-tab-code" type="button">Mermaid</button>
                </div>
                <button class="ep-ai-new-diagram-btn" id="ep-ai-new-diagram" type="button">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  New Diagram
                </button>
              </div>
            </div>

            <div class="ep-ai-preview-canvas" id="ep-ai-preview-canvas">
              <div class="ep-ai-preview-placeholder" id="ep-ai-preview-placeholder">
                <svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="#aaa" stroke-width="2">
                  <rect x="8" y="20" width="20" height="12" rx="3"/>
                  <rect x="36" y="8" width="20" height="12" rx="3"/>
                  <rect x="36" y="32" width="20" height="12" rx="3"/>
                  <line x1="28" y1="26" x2="36" y2="14"/>
                  <line x1="28" y1="26" x2="36" y2="38"/>
                </svg>
                <span>Your diagram will appear here</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Bottom bar ── -->
        <div class="ep-ai-bottom-bar">
          <span class="ep-ai-status-text" id="ep-ai-status-text"></span>
          <button class="ep-ai-insert-btn" id="ep-ai-insert" type="button" disabled>
            Insert
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

      </div><!-- /ep-ai-dialog -->
    `;
  }

  /* ─────────────────────────────────────────────
     Inject UI
  ───────────────────────────────────────────── */
  function injectAiUI() {
    if (document.getElementById('ep-ai-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'ep-ai-modal';
    // Only 'excalidraw' to inherit CSS variables. NO Excalidraw modal classes.
    modal.className = 'excalidraw ep-ai-modal';
    modal.innerHTML = buildModalHTML();

    if (!document.body) return;
    document.body.appendChild(modal);

    bindEvents();
    loadCredentials();
  }

  /* ─────────────────────────────────────────────
     Event Binding
  ───────────────────────────────────────────── */
  function bindEvents() {
    // Modal close — backdrop click or X button
    document.getElementById('ep-ai-backdrop').addEventListener('click', closeAiModal);
    document.getElementById('ep-ai-close').addEventListener('click', closeAiModal);

    // Settings toggle
    const settingsBtn = document.getElementById('ep-ai-settings-btn');
    const settingsPopup = document.getElementById('ep-ai-settings-popup');
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = settingsPopup.classList.toggle('open');
      settingsBtn.classList.toggle('active', isOpen);
    });

    // Close settings popup when clicking outside
    document.addEventListener('click', (e) => {
      if (!settingsBtn.contains(e.target) && !settingsPopup.contains(e.target)) {
        settingsPopup.classList.remove('open');
        settingsBtn.classList.remove('active');
      }
    });

    // Save settings
    document.getElementById('ep-ai-settings-save').addEventListener('click', () => {
      saveApiKeys();
      settingsPopup.classList.remove('open');
      settingsBtn.classList.remove('active');
    });

    // Model dropdown
    document.getElementById('ep-ai-model-trigger').addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = document.getElementById('ep-ai-model-menu');
      menu.classList.toggle('open');
      if (menu.classList.contains('open')) {
        const si = document.getElementById('ep-ai-model-search');
        si.value = '';
        modelSearchQuery = '';
        si.focus();
        buildModelList();
      }
    });
    document.getElementById('ep-ai-model-search').addEventListener('input', () => {
      modelSearchQuery = document.getElementById('ep-ai-model-search').value;
      buildModelList();
    });
    // Close model dropdown on outside click
    document.addEventListener('click', (e) => {
      const trigger = document.getElementById('ep-ai-model-trigger');
      const menu = document.getElementById('ep-ai-model-menu');
      if (menu && menu.classList.contains('open') && !trigger.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
      }
    });

    // Chat input
    document.getElementById('ep-ai-send').addEventListener('click', handleUserMessage);
    document.getElementById('ep-ai-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) handleUserMessage();
    });

    // Suggestion chips
    document.querySelectorAll('.ep-ai-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const input = document.getElementById('ep-ai-input');
        if (input) { input.value = chip.getAttribute('data-prompt'); input.focus(); }
      });
    });

    // View tabs (Diagram / Mermaid)
    document.getElementById('ep-ai-tab-diagram').addEventListener('click', () => setViewTab('diagram'));
    document.getElementById('ep-ai-tab-code').addEventListener('click', () => setViewTab('code'));

    // New Diagram
    document.getElementById('ep-ai-new-diagram').addEventListener('click', newDiagram);

    // Insert
    document.getElementById('ep-ai-insert').addEventListener('click', handleInsert);
  }

  /* ─────────────────────────────────────────────
     Credentials
  ───────────────────────────────────────────── */
  function loadCredentials() {
    chrome.storage.local.get(['gemini_api_keys', 'gemini_selected_model'], (res) => {
      if (res.gemini_api_keys) {
        document.getElementById('ep-ai-keys').value = res.gemini_api_keys.join('\n');
        geminiApiKeys = res.gemini_api_keys;
      }
      if (res.gemini_selected_model) {
        selectedModel = res.gemini_selected_model;
        document.getElementById('ep-ai-model-text').textContent = selectedModel;
      }
      buildModelList();
      fetchGeminiModels();
      restoreChatHistory();
    });
  }

  function saveApiKeys() {
    const rawVal = document.getElementById('ep-ai-keys').value;
    const keys = rawVal.split('\n').map(k => k.trim()).filter(Boolean);
    geminiApiKeys = keys;
    currentKeyIndex = 0;
    chrome.storage.local.set({ gemini_api_keys: keys });
    fetchGeminiModels();
    setStatus(keys.length ? `${keys.length} key(s) saved` : 'No keys set');
  }

  /* ─────────────────────────────────────────────
     Model Dropdown
  ───────────────────────────────────────────── */
  async function fetchGeminiModels() {
    if (geminiApiKeys.length === 0) return;
    const key = geminiApiKeys[0];
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      if (response.ok) {
        const data = await response.json();
        const models = data.models
          .filter(m => m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace('models/', ''));
        if (models.length > 0) { fetchedModels = models; buildModelList(); }
      }
    } catch (e) { console.warn('Failed to fetch models:', e); }
  }

  function buildModelList() {
    const listEl = document.getElementById('ep-ai-model-list');
    if (!listEl) return;
    const filtered = fetchedModels.filter(m => m.toLowerCase().includes(modelSearchQuery.toLowerCase()));
    listEl.innerHTML = filtered.map(m => {
      const sel = m === selectedModel;
      return `<div class="ep-ai-model-item${sel ? ' selected' : ''}" data-model="${m}">${m}</div>`;
    }).join('');
    listEl.querySelectorAll('.ep-ai-model-item').forEach(item => {
      item.addEventListener('click', () => {
        selectedModel = item.getAttribute('data-model');
        document.getElementById('ep-ai-model-text').textContent = selectedModel;
        chrome.storage.local.set({ gemini_selected_model: selectedModel });
        document.getElementById('ep-ai-model-menu').classList.remove('open');
        buildModelList();
      });
    });
  }

  /* ─────────────────────────────────────────────
     View Tab & Preview
  ───────────────────────────────────────────── */
  let currentView = 'diagram';
  let lastMermaidCode = '';

  function setViewTab(tab) {
    currentView = tab;
    document.getElementById('ep-ai-tab-diagram').classList.toggle('active', tab === 'diagram');
    document.getElementById('ep-ai-tab-code').classList.toggle('active', tab === 'code');
    renderPreview();
  }

  function renderPreview() {
    const canvas = document.getElementById('ep-ai-preview-canvas');
    if (!canvas) return;

    // Remove existing content except placeholder
    const placeholder = document.getElementById('ep-ai-preview-placeholder');
    // Clear all dynamic content
    Array.from(canvas.children).forEach(child => {
      if (child.id !== 'ep-ai-preview-placeholder') child.remove();
    });

    if (!lastMermaidCode) {
      if (placeholder) placeholder.style.display = '';
      return;
    }

    if (placeholder) placeholder.style.display = 'none';

    if (currentView === 'code') {
      const pre = document.createElement('pre');
      pre.className = 'ep-ai-preview-code';
      pre.textContent = lastMermaidCode;
      canvas.appendChild(pre);
    } else {
      // Render SVG via mermaid (if available) or show a clean code block
      renderMermaidSVG(lastMermaidCode, canvas);
    }
  }

  async function renderMermaidSVG(code, container) {
    try {
      const parser = await loadMermaidParser();
      if (parser && typeof parser.mermaid === 'function') {
        const mInstance = parser.mermaid();
        if (mInstance) {
          const id = 'ep-mmd-' + Date.now();
          const wrap = document.createElement('div');
          wrap.className = 'ep-ai-preview-svg-wrap';
          wrap.id = id + '-wrap';
          container.appendChild(wrap);
          const { svg } = await mInstance.render(id, code);
          wrap.innerHTML = svg;
          return;
        }
      }
    } catch (e) {
      console.error('Failed to render SVG with internal mermaid:', e);
    }

    // Fallback: show code nicely styled
    const pre = document.createElement('pre');
    pre.className = 'ep-ai-preview-code';
    pre.textContent = code;
    container.appendChild(pre);
  }

  /* ─────────────────────────────────────────────
     Chat Messages
  ───────────────────────────────────────────── */
  function addMessage(sender, text, isCode = false) {
    const history = JSON.parse(sessionStorage.getItem('ep-ai-chat-history') || '[]');
    history.push({ sender, text, isCode });
    sessionStorage.setItem('ep-ai-chat-history', JSON.stringify(history));
    renderMessageToDom(sender, text, isCode);
  }

  function renderMessageToDom(sender, text, isCode = false) {
    const chatBody = document.getElementById('ep-ai-chat-messages');
    if (!chatBody) return;
    const msg = document.createElement('div');
    msg.className = `ep-ai-msg ${sender}`;
    if (isCode) {
      msg.innerHTML = `<pre><code>${escapeHtml(text)}</code></pre>`;
    } else {
      msg.innerHTML = formatMarkdownText(text);
    }

    if (sender === 'assistant') {
      const cleanMermaid = extractMermaidCode(text);
      const hasMermaid = text.includes('```') || 
                         /^(flowchart|graph|sequenceDiagram|erDiagram|classDiagram|stateDiagram-v2|pie|gantt|gitGraph|mindmap|timeline|xychart-beta|quadrantChart|sankey-beta)/i.test(cleanMermaid);
      
      if (hasMermaid) {
        msg.classList.add('ep-ai-msg-clickable');
        msg.title = 'Click to preview this diagram version';
        msg.addEventListener('click', async () => {
          document.querySelectorAll('.ep-ai-msg.assistant').forEach(el => el.classList.remove('ep-ai-msg-active'));
          msg.classList.add('ep-ai-msg-active');

          setStatus('Loading diagram version…');
          setInsertEnabled(false);

          try {
            const parser = await loadMermaidParser();
            const parseResult = await parser.parseMermaidToExcalidraw(cleanMermaid, {
              fontSize: 16,
              flowchart: {
                nodeSpacing: 70,
                rankSpacing: 70,
                curve: 'linear'
              }
            });
            if (parseResult && parseResult.elements) {
              lastParseResult = parseResult;
              lastMermaidCode = cleanMermaid;
              
              sessionStorage.setItem('ep-ai-last-mermaid-code', lastMermaidCode);
              sessionStorage.setItem('ep-ai-last-parse-result', JSON.stringify(parseResult));

              renderPreview();
              setInsertEnabled(true);
              setStatus(`${parseResult.elements.length} elements ready`);
            }
          } catch (err) {
            console.error('Failed to parse clicked message diagram:', err);
            lastMermaidCode = cleanMermaid;
            sessionStorage.setItem('ep-ai-last-mermaid-code', lastMermaidCode);
            sessionStorage.removeItem('ep-ai-last-parse-result');
            lastParseResult = null;
            renderPreview();
            setStatus('Preview only — parse error');
          }
        });
      }
    }

    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showTypingIndicator() {
    const chatBody = document.getElementById('ep-ai-chat-messages');
    if (!chatBody) return;
    const existing = document.getElementById('ep-ai-typing');
    if (existing) return;
    const el = document.createElement('div');
    el.className = 'ep-ai-typing ep-ai-msg assistant';
    el.id = 'ep-ai-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    chatBody.appendChild(el);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function removeTypingIndicator() {
    const el = document.getElementById('ep-ai-typing');
    if (el) el.remove();
  }

  function restoreChatHistory() {
    const history = JSON.parse(sessionStorage.getItem('ep-ai-chat-history') || '[]');
    if (history.length > 0) {
      const chatBody = document.getElementById('ep-ai-chat-messages');
      if (chatBody) {
        chatBody.innerHTML = '';
        history.forEach(item => renderMessageToDom(item.sender, item.text, item.isCode));
      }
    }
  }

  /* ─────────────────────────────────────────────
     Status bar helpers
  ───────────────────────────────────────────── */
  function setStatus(text) {
    const el = document.getElementById('ep-ai-status-text');
    if (el) el.textContent = text;
  }

  function setInsertEnabled(enabled) {
    const btn = document.getElementById('ep-ai-insert');
    if (btn) btn.disabled = !enabled;
  }

  /* ─────────────────────────────────────────────
     New Diagram
  ───────────────────────────────────────────── */
  function newDiagram() {
    lastMermaidCode = '';
    lastParseResult = null;
    setInsertEnabled(false);
    setStatus('');
    // Clear preview
    const canvas = document.getElementById('ep-ai-preview-canvas');
    if (canvas) {
      Array.from(canvas.children).forEach(child => {
        if (child.id !== 'ep-ai-preview-placeholder') child.remove();
      });
      const ph = document.getElementById('ep-ai-preview-placeholder');
      if (ph) ph.style.display = '';
    }
    // Clear chat
    sessionStorage.removeItem('ep-ai-chat-history');
    sessionStorage.removeItem('ep-ai-last-mermaid-code');
    sessionStorage.removeItem('ep-ai-last-parse-result');
    const chatBody = document.getElementById('ep-ai-chat-messages');
    if (chatBody) {
      chatBody.innerHTML = '';
      const welcome = document.createElement('div');
      welcome.className = 'ep-ai-msg assistant';
      welcome.textContent = '✨ New diagram started! Describe what you want to create.';
      chatBody.appendChild(welcome);
    }
    // Reset view tab
    setViewTab('diagram');
  }

  /* ─────────────────────────────────────────────
     Send message & generate diagram
  ───────────────────────────────────────────── */
  async function handleUserMessage() {
    const input = document.getElementById('ep-ai-input');
    const sendBtn = document.getElementById('ep-ai-send');
    if (!input || !sendBtn || isGenerating) return;

    const promptText = input.value.trim();
    if (!promptText) return;

    if (geminiApiKeys.length === 0) {
      // Open settings popup as hint
      document.getElementById('ep-ai-settings-popup').classList.add('open');
      document.getElementById('ep-ai-settings-btn').classList.add('active');
      setStatus('⚠️ Please add an API key in Settings first');
      return;
    }

    input.value = '';
    isGenerating = true;
    input.disabled = true;
    sendBtn.disabled = true;
    setInsertEnabled(false);
    setStatus('Generating…');

    addMessage('user', promptText);
    showTypingIndicator();

    let responseText = '';
    let success = false;
    let attempts = 0;
    const maxAttempts = geminiApiKeys.length;

    while (attempts < maxAttempts && !success) {
      const activeKey = geminiApiKeys[currentKeyIndex];
      try {
        const response = await callGeminiAPI(activeKey, promptText);
        if (response.status === 429) {
          rotateApiKey();
          attempts++;
          continue;
        }
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `API Error ${response.status}`);
        }
        const data = await response.json();
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        success = true;
      } catch (err) {
        rotateApiKey();
        attempts++;
        if (attempts >= maxAttempts) {
          removeTypingIndicator();
          addMessage('assistant', `❌ Failed: ${err.message || 'Unknown error'}. Check your API Key(s) in Settings.`);
          resetGeneratingState();
          setStatus('Generation failed');
          return;
        }
      }
    }

    if (success && responseText) {
      const cleanMermaid = extractMermaidCode(responseText);

      try {
        removeTypingIndicator();
        addMessage('assistant', 'Compiling diagram…');

        const parser = await loadMermaidParser();
        const parseResult = await parser.parseMermaidToExcalidraw(cleanMermaid, {
          fontSize: 16,
          flowchart: {
            nodeSpacing: 70,
            rankSpacing: 70,
            curve: 'linear'
          }
        });

        if (parseResult && parseResult.elements) {
          lastParseResult = parseResult;
          lastMermaidCode = cleanMermaid;
          
          sessionStorage.setItem('ep-ai-last-mermaid-code', lastMermaidCode);
          sessionStorage.setItem('ep-ai-last-parse-result', JSON.stringify(parseResult));

          // Update chat — replace last "Compiling" message
          removeLastMessage();
          addMessage('assistant', `✅ Done! ${parseResult.elements.length} elements ready — click **Insert** to add to canvas, or keep refining.`);

          // Update preview
          renderPreview();
          setInsertEnabled(true);
          setStatus(`${parseResult.elements.length} elements ready`);
        } else {
          throw new Error('Empty elements from parser');
        }
      } catch (e) {
        removeTypingIndicator();
        removeLastMessage();
        lastMermaidCode = extractMermaidCode(responseText);
        sessionStorage.setItem('ep-ai-last-mermaid-code', lastMermaidCode);
        sessionStorage.removeItem('ep-ai-last-parse-result');
        addMessage('assistant', `⚠️ Couldn't render diagram as shapes: ${e.message}. Showing code preview instead.`);
        renderPreview();
        setStatus('Preview only — parse error');
      }
    }

    resetGeneratingState();
  }

  /* ─────────────────────────────────────────────
     Insert into canvas
  ───────────────────────────────────────────── */
  async function handleInsert() {
    if (!lastParseResult) return;
    const insertBtn = document.getElementById('ep-ai-insert');
    if (insertBtn) { insertBtn.disabled = true; insertBtn.textContent = 'Inserting…'; }

    try {
      await injectElementsToCanvas(lastParseResult.elements, lastParseResult.files);
      closeAiModal();
    } catch (e) {
      setStatus('Insert failed: ' + e.message);
      if (insertBtn) { insertBtn.disabled = false; insertBtn.innerHTML = 'Insert <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'; }
    }
  }

  /* ─────────────────────────────────────────────
     Modal open/close
  ───────────────────────────────────────────── */
  function openAiModal() {
    injectAiUI();
    const modal = document.getElementById('ep-ai-modal');
    if (modal) {
      modal.classList.add('open');
      isAiModalOpen = true;
      sessionStorage.setItem('ep-ai-modal-open', 'true');
      
      // Restore history, preview, and status
      restoreChatHistory();
      const savedCode = sessionStorage.getItem('ep-ai-last-mermaid-code');
      if (savedCode) {
        lastMermaidCode = savedCode;
        const savedResult = sessionStorage.getItem('ep-ai-last-parse-result');
        if (savedResult) {
          try {
            lastParseResult = JSON.parse(savedResult);
            setInsertEnabled(true);
            setStatus(`${lastParseResult.elements.length} elements ready`);
          } catch (_) {
            lastParseResult = null;
          }
        }
        renderPreview();
      }

      // Focus input
      setTimeout(() => {
        const input = document.getElementById('ep-ai-input');
        if (input) input.focus();
      }, 100);
    }
  }

  function closeAiModal() {
    const modal = document.getElementById('ep-ai-modal');
    if (modal) {
      modal.classList.remove('open');
      isAiModalOpen = false;
      sessionStorage.setItem('ep-ai-modal-open', 'false');
    }
  }

  /* ─────────────────────────────────────────────
     Helpers
  ───────────────────────────────────────────── */
  function rotateApiKey() {
    currentKeyIndex = (currentKeyIndex + 1) % geminiApiKeys.length;
  }

  function removeLastMessage() {
    const history = JSON.parse(sessionStorage.getItem('ep-ai-chat-history') || '[]');
    if (history.length > 0) {
      history.pop();
      sessionStorage.setItem('ep-ai-chat-history', JSON.stringify(history));
    }
    const chatBody = document.getElementById('ep-ai-chat-messages');
    if (chatBody && chatBody.lastChild) chatBody.removeChild(chatBody.lastChild);
  }

  function resetGeneratingState() {
    isGenerating = false;
    const input = document.getElementById('ep-ai-input');
    const sendBtn = document.getElementById('ep-ai-send');
    if (input) { input.disabled = false; input.focus(); }
    if (sendBtn) sendBtn.disabled = false;
  }

  function extractMermaidCode(text) {
    const match = text.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
    let code = match && match[1] ? match[1].trim() : text.trim();
    // Strip subgraphs to prevent parser crash and fallback to image
    code = code.replace(/^\s*subgraph\s+.*$/gim, '');
    code = code.replace(/^\s*end\s*$/gim, '');
    return code.trim();
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatMarkdownText(text) {
    let html = escapeHtml(text);
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    html = html.replace(/\n/g, '<br/>');
    return html;
  }

  function loadMermaidParser() {
    return new Promise((resolve, reject) => {
      if (window.ExcalidrawMermaidToExcalidraw) { resolve(window.ExcalidrawMermaidToExcalidraw); return; }
      if (window.mermaidToExcalidraw) { window.ExcalidrawMermaidToExcalidraw = window.mermaidToExcalidraw; resolve(window.mermaidToExcalidraw); return; }
      reject(new Error('Local Mermaid parser not loaded. Please reload the page.'));
    });
  }

  /* ─────────────────────────────────────────────
     Gemini API call
  ───────────────────────────────────────────── */
  async function callGeminiAPI(key, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${key}`;
    const systemInstruction = `
You are an expert diagram designer. Your ONLY task is to generate clean, syntax-valid Mermaid.js diagram definitions.

## Diagram types — IMPORTANT: two tiers

### TIER 1 — Native Excalidraw shapes (fully editable after insert)
These are parsed into real Excalidraw elements (rectangles, arrows, text):
- flowchart TD / flowchart LR  → process flows, general diagrams
- sequenceDiagram               → actor interactions, API calls
- erDiagram                    → database schemas, entity relationships
- classDiagram                 → OOP class structures
- stateDiagram-v2              → state machines, lifecycle diagrams

PREFER these types whenever the user's request can reasonably map to them.

### CRITICAL RULES:
1. NEVER use "subgraph" blocks under any circumstances. They break the parser and cause the rendering to fail.
2. NEVER use the newline character "\n" inside node labels. Always use "<br/>" for line breaks.
3. NEVER use the "&" operator to join nodes (e.g. A & B --> C). Always write links individually.
4. STRICT BAN ON TIER 2 DIAGRAMS: Do not generate mindmap, pie, timeline, gantt, gitGraph, xychart, quadrantChart, or sankey-beta unless the user explicitly requested that specific chart name. If they ask for a "diagram", "concept map", "chart", "map", or "flow", ALWAYS use "flowchart TD" (Tier 1 native type). Never fallback to static image diagrams.

### TIER 2 — SVG image fallback (rendered as embedded image, NOT editable)
These work visually but insert as a static image — the user cannot edit individual shapes:
- pie                  → pie charts
- gantt                → project timelines / Gantt charts
- gitGraph             → git branch history
- mindmap              → mind maps
- timeline             → chronological timelines
- xychart-beta         → bar charts, line charts
- quadrantChart        → 2×2 priority matrices
- sankey-beta          → flow/volume diagrams

ONLY use Tier 2 when the user explicitly asks for that chart type AND it cannot be expressed as a flowchart/ER/class diagram. Warn the user in your response that it will be a static image.

## Choosing the right type
- "line chart" / "bar chart" → xychart-beta  (SVG fallback)
- "pie chart" / "donut chart" → pie  (SVG fallback)
- "table" → NOT supported in Mermaid; use erDiagram with entities or classDiagram instead
- "ERD" / "entity relationship" / "database" → erDiagram  (native ✓)
- "class diagram" / "UML" → classDiagram  (native ✓)
- "flow" / "process" / "flowchart" → flowchart TD  (native ✓)
- "sequence" / "API flow" / "interaction" → sequenceDiagram  (native ✓)
- "state machine" / "lifecycle" → stateDiagram-v2  (native ✓)

## Universal rules
1. ONLY return the Mermaid definition — NO prose, NO explanation.
2. Start with the correct diagram keyword on the very first line.
3. Be EXTREMELY detailed, exhaustive, and comprehensive: include all specific steps, sub-points, platform names, links/resources, tips, warnings, and examples mentioned in the source text. Do NOT summarize or omit key information. Map the entire content thoroughly.
4. Depth & Granularity: Always break down complex processes into granular, step-by-step sequential nodes. Avoid grouping different distinct points or lists into a single node. Instead, create separate linked nodes for sub-steps, alternative paths, and resource links.
5. Rich Node Text: Provide descriptive and context-rich node labels. If a step has rules, exceptions, or tips, list them inside the node separated by '<br/>' so the user has full context without reading the original text.

## flowchart rules
- Labels MUST be wrapped in double quotes: A["Label"]
- Edge labels use pipe syntax: A -->|label text| B  (NO quotes inside)
- Shapes: rectangle A["label"], rounded A("label"), diamond A{"label"}
- NEVER use subgraphs — they break the parser or cause fallback to static images
- Styling: style A fill:#e3f2fd,stroke:#1565c0  (fill and stroke ONLY)
- NEVER use newline character '\n' inside labels — ALWAYS use '<br/>' for line breaks.
- NEVER use the '&' operator to join nodes (e.g. A & B --> C) — write connections individually.

## erDiagram rules
- Entity names are UPPERCASE, no quotes: USER, HABIT, ENTRY
- Attributes inside entity block: int id PK / string username / datetime created_at
- Relationships: USER ||--o{ HABIT : "creates"
- Cardinality: || exactly one, |o zero or one, }| one or more, }o zero or more
- NEVER put attributes on relationship lines
- NO style statements in erDiagram

## sequenceDiagram rules
- Participants: participant Alice
- Messages: Alice->>Bob: message text

## classDiagram rules
- Members: +type name (public), -type name (private)
- Methods: +methodName() ReturnType
- Relationships: ClassA --|> ClassB : Inheritance

## stateDiagram-v2 rules
- States: [*] --> StateName
- Transitions: StateA --> StateB : event

## xychart-beta rules (bar/line charts)
- xychart-beta
    title "Monthly Sales"
    x-axis [Jan, Feb, Mar, Apr]
    y-axis "Revenue (USD)" 0 --> 10000
    bar [3000, 5000, 8000, 6000]
    line [3000, 5000, 8000, 6000]

## pie rules
- pie title "Market Share"
    "Chrome" : 65
    "Firefox" : 15
    "Safari" : 20
`;


    const requestBody = {
      contents: [{ parts: [{ text: `Generate Mermaid diagram for: ${prompt}` }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] }
    };
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
  }

  /* ─────────────────────────────────────────────
     IndexedDB file saver
  ───────────────────────────────────────────── */
  function saveFilesToIndexedDB(files) {
    return new Promise((resolve, reject) => {
      if (!files || Object.keys(files).length === 0) { resolve(); return; }
      const request = indexedDB.open('files-db');
      request.onerror = (e) => { reject(e); };
      request.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('files-store')) { db.close(); resolve(); return; }
        const tx = db.transaction(['files-store'], 'readwrite');
        const store = tx.objectStore('files-store');
        Object.keys(files).forEach(id => {
          const f = files[id];
          store.put({ id, mimeType: f.mimeType, dataURL: f.dataURL, created: Date.now(), lastRetrieved: Date.now() }, id);
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = (err) => { db.close(); reject(err); };
      };
    });
  }

  /* ─────────────────────────────────────────────
     Canvas injection (unchanged core logic)
  ───────────────────────────────────────────── */
  async function injectElementsToCanvas(newElements, newFiles) {
    try {
      const currentRaw = localStorage.getItem('excalidraw');
      let currentElements = [];
      if (currentRaw) currentElements = JSON.parse(currentRaw);

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      newElements.forEach(el => {
        if (el.x < minX) minX = el.x;
        if (el.y < minY) minY = el.y;
        if (el.x + (el.width || 0) > maxX) maxX = el.x + (el.width || 0);
        if (el.y + (el.height || 0) > maxY) maxY = el.y + (el.height || 0);
      });

      let maxExistingY = -Infinity, minExistingX = Infinity;
      currentElements.forEach(el => {
        if (el.isDeleted) return;
        const bottom = el.y + (el.height || 0);
        if (bottom > maxExistingY) maxExistingY = bottom;
        if (el.x < minExistingX) minExistingX = el.x;
      });

      let targetX = 100, targetY = 100;
      if (currentElements.length > 0 && maxExistingY !== -Infinity) {
        targetX = minExistingX !== Infinity ? minExistingX : 100;
        targetY = maxExistingY + 150;
      }

      const shiftX = targetX - minX;
      const shiftY = targetY - minY;

      const idMap = {};
      newElements.forEach(el => { idMap[el.id] = 'ai_' + Math.random().toString(36).substr(2, 9); });

      const processedNew = newElements.map(el => {
        const newId = idMap[el.id] || el.id;
        const copy = { ...el, id: newId, x: el.x + shiftX, y: el.y + shiftY, seed: Math.floor(Math.random() * 1e9) };
        if (copy.containerId && idMap[copy.containerId]) copy.containerId = idMap[copy.containerId];
        if (copy.boundElements) copy.boundElements = copy.boundElements.map(b => idMap[b.id] ? { ...b, id: idMap[b.id] } : b);
        if (copy.type === 'arrow') {
          copy.roundness = { type: 2 };
          if (copy.start && copy.start.id && idMap[copy.start.id]) {
            const sid = idMap[copy.start.id];
            copy.start = { ...copy.start, id: sid };
            copy.startBinding = { elementId: sid, focus: 0, gap: 8 };
          }
          if (copy.end && copy.end.id && idMap[copy.end.id]) {
            const eid = idMap[copy.end.id];
            copy.end = { ...copy.end, id: eid };
            copy.endBinding = { elementId: eid, focus: 0, gap: 8 };
          }
        }
        return copy;
      });

      function simplifyPointsToThree(points) {
        if (points.length < 3) return points;
        const start = points[0];
        const end = points[points.length - 1];
        
        let maxDist = -1;
        let bestPoint = null;
        
        const a = end[1] - start[1];
        const b = start[0] - end[0];
        const c = end[0] * start[1] - end[1] * start[0];
        const denom = Math.sqrt(a * a + b * b);
        
        for (let i = 1; i < points.length - 1; i++) {
          const pt = points[i];
          const dist = denom === 0 ? 0 : Math.abs(a * pt[0] + b * pt[1] + c) / denom;
          if (dist > maxDist) {
            maxDist = dist;
            bestPoint = pt;
          }
        }
        
        if (bestPoint && maxDist > 5) {
          const midX = (start[0] + end[0]) / 2;
          const midY = (start[1] + end[1]) / 2;
          const gentleX = midX + (bestPoint[0] - midX) * 0.3;
          const gentleY = midY + (bestPoint[1] - midY) * 0.3;
          return [start, [gentleX, gentleY], end];
        }
        return [start, end];
      }

      processedNew.forEach(el => {
        if (el.type === 'arrow') {
          if (el.startBinding?.elementId) {
            const s = processedNew.find(x => x.id === el.startBinding.elementId);
            if (s) s.boundElements = (s.boundElements || []).concat({ type: 'arrow', id: el.id });
          }
          if (el.endBinding?.elementId) {
            const s = processedNew.find(x => x.id === el.endBinding.elementId);
            if (s) s.boundElements = (s.boundElements || []).concat({ type: 'arrow', id: el.id });
          }
        }
      });

      function wrapText(text, maxChars = 25) {
        if (!text) return text;
        const lines = text.split('\n');
        const wrappedLines = [];
        lines.forEach(line => {
          if (line.length <= maxChars) {
            wrappedLines.push(line);
          } else {
            const words = line.split(' ');
            let currentLine = '';
            words.forEach(word => {
              if ((currentLine + ' ' + word).trim().length <= maxChars) {
                currentLine = (currentLine + ' ' + word).trim();
              } else {
                if (currentLine) wrappedLines.push(currentLine);
                currentLine = word;
              }
            });
            if (currentLine) wrappedLines.push(currentLine);
          }
        });
        return wrappedLines.join('\n');
      }

      const textElementsToAdd = [];
      processedNew.forEach(el => {
        if (el.label && el.label.text) {
          const textId = 'ai_text_' + Math.random().toString(36).substr(2, 9);
          const rawText = el.label.text.replace(/<br\s*\/?>/gi, '\n');
          el.label.text = wrapText(rawText, 25);
          const lines = el.label.text.split('\n');
          const maxLineLen = Math.max(...lines.map(l => l.length), 1);
          const estimatedWidth = maxLineLen * 10.5 + 40;
          const estimatedHeight = lines.length * 22 + 24;
          if (estimatedWidth > (el.width || 0)) { const dx = estimatedWidth - (el.width || 0); el.width = estimatedWidth; el.x -= dx / 2; }
          if (estimatedHeight > (el.height || 0)) { const dy = estimatedHeight - (el.height || 0); el.height = estimatedHeight; el.y -= dy / 2; }
          const textEl = {
            id: textId, type: 'text',
            x: el.x + ((el.width || 0) - estimatedWidth) / 2,
            y: el.y + ((el.height || 0) - estimatedHeight) / 2,
            width: estimatedWidth, height: estimatedHeight,
            text: el.label.text, fontSize: el.label.fontSize || 16, fontFamily: 1,
            textAlign: el.label.textAlign || 'center', verticalAlign: el.label.verticalAlign || 'middle',
            containerId: el.id, strokeColor: el.label.strokeColor || el.strokeColor || '#1e1e1e',
            backgroundColor: 'transparent', fillStyle: 'solid', opacity: 100,
            groupIds: el.groupIds || [], roundness: null,
            seed: Math.floor(Math.random() * 1e9), version: 1, versionNonce: Math.floor(Math.random() * 1e9), isDeleted: false
          };
          el.boundElements = (el.boundElements || []).concat({ type: 'text', id: textId });
          textElementsToAdd.push(textEl);
        }
      });

      function getIntersectionPoint(rect, center, target) {
        const { x, y, width, height } = rect;
        const dx = target.x - center.x, dy = target.y - center.y;
        if (dx === 0 && dy === 0) return { x: center.x, y: center.y };
        if (dx !== 0) {
          const bx = dx > 0 ? x + width : x, t = (bx - center.x) / dx, by = center.y + t * dy;
          if (by >= y && by <= y + height) return { x: bx, y: by };
        }
        if (dy !== 0) {
          const by = dy > 0 ? y + height : y, t = (by - center.y) / dy, bx = center.x + t * dx;
          if (bx >= x && bx <= x + width) return { x: bx, y: by };
        }
        return { x: center.x, y: center.y };
      }

      processedNew.forEach(el => {
        if (el.type !== 'arrow') return;
        const startShape = el.startBinding?.elementId ? processedNew.find(s => s.id === el.startBinding.elementId) : null;
        const endShape = el.endBinding?.elementId ? processedNew.find(s => s.id === el.endBinding.elementId) : null;
        let absPoints = el.points?.length ? el.points.map(pt => [el.x + pt[0], el.y + pt[1]]) : [[el.x, el.y], [el.x, el.y]];
        absPoints = simplifyPointsToThree(absPoints);

        const cx1 = startShape ? startShape.x + (startShape.width || 0) / 2 : absPoints[0][0];
        const cy1 = startShape ? startShape.y + (startShape.height || 0) / 2 : absPoints[0][1];
        const cx2 = endShape ? endShape.x + (endShape.width || 0) / 2 : absPoints[absPoints.length - 1][0];
        const cy2 = endShape ? endShape.y + (endShape.height || 0) / 2 : absPoints[absPoints.length - 1][1];

        const targetForStart = absPoints.length > 2 ? { x: absPoints[1][0], y: absPoints[1][1] } : { x: cx2, y: cy2 };
        const targetForEnd = absPoints.length > 2 ? { x: absPoints[absPoints.length - 2][0], y: absPoints[absPoints.length - 2][1] } : { x: cx1, y: cy1 };

        let sx = cx1, sy = cy1;
        if (startShape) {
          const i = getIntersectionPoint(startShape, { x: cx1, y: cy1 }, targetForStart);
          sx = i.x; sy = i.y;
          el.startBinding = { elementId: startShape.id, focus: 0, gap: 8, fixedPoint: [(sx - startShape.x) / (startShape.width || 1), (sy - startShape.y) / (startShape.height || 1)] };
        } else { sx = absPoints[0][0]; sy = absPoints[0][1]; }

        let ex = cx2, ey = cy2;
        if (endShape) {
          const i = getIntersectionPoint(endShape, { x: cx2, y: cy2 }, targetForEnd);
          ex = i.x; ey = i.y;
          el.endBinding = { elementId: endShape.id, focus: 0, gap: 8, fixedPoint: [(ex - endShape.x) / (endShape.width || 1), (ey - endShape.y) / (endShape.height || 1)] };
        } else { ex = absPoints[absPoints.length - 1][0]; ey = absPoints[absPoints.length - 1][1]; }

        absPoints[0] = [sx, sy];
        absPoints[absPoints.length - 1] = [ex, ey];
        el.x = sx; el.y = sy;
        el.points = absPoints.map(pt => [pt[0] - sx, pt[1] - sy]);
      });

      // ── Overlap fix: separate text labels that land at the same position ──
      // Edge labels on back-arrows often share the same midpoint with another label.
      const allNewTexts = [...processedNew, ...textElementsToAdd].filter(el => el.type === 'text');
      const OVERLAP_THRESHOLD = 40; // px — if two labels are this close, nudge them apart
      for (let i = 0; i < allNewTexts.length; i++) {
        for (let j = i + 1; j < allNewTexts.length; j++) {
          const a = allNewTexts[i], b = allNewTexts[j];
          const dx = Math.abs((a.x + (a.width || 0) / 2) - (b.x + (b.width || 0) / 2));
          const dy = Math.abs((a.y + (a.height || 0) / 2) - (b.y + (b.height || 0) / 2));
          if (dx < OVERLAP_THRESHOLD && dy < OVERLAP_THRESHOLD) {
            // Nudge the second label away: prefer horizontal offset if dy is small
            const offsetX = dx < dy ? 0 : (b.x > a.x ? 1 : -1) * OVERLAP_THRESHOLD;
            const offsetY = dy <= dx ? 0 : (b.y > a.y ? 1 : -1) * OVERLAP_THRESHOLD;
            const nudge = Math.max(OVERLAP_THRESHOLD, (a.height || 20) + 4);
            b.x += offsetX || nudge;
            b.y += offsetY || nudge;
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      const mergedElements = [...currentElements, ...processedNew, ...textElementsToAdd];

      localStorage.setItem('excalidraw', JSON.stringify(mergedElements));
      localStorage.setItem('version-dataState', JSON.stringify(Date.now()));

      if (newFiles) {
        const currentFilesRaw = localStorage.getItem('excalidraw-files');
        let currentFiles = {};
        if (currentFilesRaw) { try { currentFiles = JSON.parse(currentFilesRaw); } catch (_) { } }
        const mergedFiles = { ...currentFiles, ...newFiles };
        localStorage.setItem('excalidraw-files', JSON.stringify(mergedFiles));
        localStorage.setItem('version-files', JSON.stringify(Date.now()));
        try { await saveFilesToIndexedDB(newFiles); } catch (_) { }
      }

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new FocusEvent('focus'));
      showToast(`Loaded ${processedNew.length + textElementsToAdd.length} elements. Syncing canvas…`);

      setTimeout(() => { window.location.reload(); }, 800);
    } catch (e) {
      console.error('Failed to inject elements:', e);
      throw e;
    }
  }

  /* ─────────────────────────────────────────────
     Floating button injection
  ───────────────────────────────────────────── */
  function checkAndInjectFloatingButton() {
    if (document.getElementById('excalidraw-plus-ai-trigger-btn')) return;
    const plusBanner = document.querySelector('.plus-banner');
    if (plusBanner && plusBanner.parentNode) {
      const aiBtn = document.createElement('button');
      aiBtn.id = 'excalidraw-plus-ai-trigger-btn';
      aiBtn.className = plusBanner.className;
      aiBtn.innerHTML = '<span>Assistant</span>';
      aiBtn.style.cursor = 'pointer';
      aiBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openAiModal(); });
      plusBanner.parentNode.insertBefore(aiBtn, plusBanner);
    }
  }

  /* ─────────────────────────────────────────────
     DOM observer
  ───────────────────────────────────────────── */
  const uiObserver = new MutationObserver(() => {
    checkAndInjectFloatingButton();
    if (sessionStorage.getItem('ep-ai-modal-open') === 'true' && !document.getElementById('ep-ai-modal')) {
      openAiModal();
    }
  });
  uiObserver.observe(document.documentElement, { childList: true, subtree: true });

  window.openExcalidrawPlusAiModal = openAiModal;

})();
