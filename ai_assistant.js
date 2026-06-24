/**
 * ExcalidrawPlus AI Assistant Script
 * Manages Gemini API integration, key rotation, model searches, and Mermaid rendering
 */

(function () {
  let isAiModalOpen = false;
  let geminiApiKeys = [];
  let currentKeyIndex = 0;
  let selectedModel = "gemini-2.5-flash";
  let fetchedModels = ["gemini-2.5-flash", "gemini-2.5-pro"];
  let modelSearchQuery = "";
  let isGenerating = false;

  // Initialize and append UI to DOM
  function injectAiUI() {
    if (document.getElementById('excalidraw-plus-ai-modal')) return;

    // Create Modal Structure
    const modal = document.createElement('div');
    modal.id = 'excalidraw-plus-ai-modal';
    modal.className = 'excalidraw excalidraw-plus-ai-modal-overlay';
    modal.innerHTML = `
      <div class="excalidraw-plus-ai-dialog">
        <div class="excalidraw-plus-ai-header">
          <div class="excalidraw-plus-ai-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span>Gemini AI Assistant</span>
          </div>
          <button class="excalidraw-plus-ai-close-btn" id="excalidraw-plus-ai-close" aria-label="Close">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <div class="excalidraw-plus-ai-config-section">
          <div class="excalidraw-plus-ai-config-row">
            <span class="excalidraw-plus-ai-field-label">Gemini Model</span>
            <div class="excalidraw-plus-ai-dropdown-wrapper">
              <button class="excalidraw-plus-ai-dropdown-trigger" id="excalidraw-plus-ai-model-trigger">
                <span id="excalidraw-plus-ai-current-model-text">gemini-2.5-flash</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              <div class="excalidraw-plus-ai-dropdown-menu" id="excalidraw-plus-ai-model-menu">
                <div class="excalidraw-plus-ai-dropdown-search">
                  <input type="text" id="excalidraw-plus-ai-model-search" placeholder="Search models...">
                </div>
                <div class="excalidraw-plus-ai-dropdown-list" id="excalidraw-plus-ai-model-list">
                  <!-- Dynamic Models injected here -->
                </div>
              </div>
            </div>
          </div>
          <div class="excalidraw-plus-ai-config-row" style="align-items: flex-start;">
            <span class="excalidraw-plus-ai-field-label" style="margin-top: 4px;">API Keys<br/><span style="font-size: 10px; font-weight: normal; color: #888;">(One per line)</span></span>
            <textarea class="excalidraw-plus-ai-keys-textarea" id="excalidraw-plus-ai-keys" placeholder="AIZA...&#10;AIZA... (Multiple keys rotated on 429)"></textarea>
          </div>
        </div>

        <div class="excalidraw-plus-ai-chat-body" id="excalidraw-plus-ai-chat-messages">
          <div class="excalidraw-plus-ai-msg assistant">
            Hi! Describe the flowchart or diagram you want to generate. I will create it and render it directly on your Excalidraw canvas.
          </div>
        </div>

        <div class="excalidraw-plus-ai-footer">
          <div class="excalidraw-plus-ai-suggestions">
            <div class="excalidraw-plus-ai-suggest-chip" data-prompt="Draw a flowchart explaining user login flow with password check">Login Flow</div>
            <div class="excalidraw-plus-ai-suggest-chip" data-prompt="Draw a sequence diagram for buying a book on an e-commerce platform">E-commerce Buy</div>
            <div class="excalidraw-plus-ai-suggest-chip" data-prompt="Draw a simple flowchart showing photosynthesis cycle">Photosynthesis</div>
          </div>
          <div class="excalidraw-plus-ai-input-row">
            <input type="text" class="excalidraw-plus-ai-chat-input" id="excalidraw-plus-ai-input" placeholder="Ask AI to draw something...">
            <button class="excalidraw-plus-ai-send-btn" id="excalidraw-plus-ai-send" title="Send">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Bind Event Listeners
    document.getElementById('excalidraw-plus-ai-close').addEventListener('click', closeAiModal);
    document.getElementById('excalidraw-plus-ai-model-trigger').addEventListener('click', toggleModelDropdown);
    document.getElementById('excalidraw-plus-ai-model-search').addEventListener('input', filterModels);
    document.getElementById('excalidraw-plus-ai-keys').addEventListener('change', saveApiKeys);
    document.getElementById('excalidraw-plus-ai-send').addEventListener('click', handleUserMessage);
    document.getElementById('excalidraw-plus-ai-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleUserMessage();
    });

    // Close model dropdown on click outside
    document.addEventListener('click', (e) => {
      const trigger = document.getElementById('excalidraw-plus-ai-model-trigger');
      const menu = document.getElementById('excalidraw-plus-ai-model-menu');
      if (menu && menu.classList.contains('open') && !trigger.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
      }
    });

    // Chip click handler
    document.querySelectorAll('.excalidraw-plus-ai-suggest-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const input = document.getElementById('excalidraw-plus-ai-input');
        if (input) {
          input.value = chip.getAttribute('data-prompt');
          input.focus();
        }
      });
    });

    // Load credentials from local storage
    chrome.storage.local.get(['gemini_api_keys', 'gemini_selected_model'], (res) => {
      if (res.gemini_api_keys) {
        document.getElementById('excalidraw-plus-ai-keys').value = res.gemini_api_keys.join('\n');
        geminiApiKeys = res.gemini_api_keys;
      }
      if (res.gemini_selected_model) {
        selectedModel = res.gemini_selected_model;
        document.getElementById('excalidraw-plus-ai-current-model-text').textContent = selectedModel;
      }
      buildModelList();
      fetchGeminiModels();
    });
  }

  function openAiModal() {
    injectAiUI();
    const modal = document.getElementById('excalidraw-plus-ai-modal');
    if (modal) {
      modal.classList.add('open');
      isAiModalOpen = true;
    }
  }

  function closeAiModal() {
    const modal = document.getElementById('excalidraw-plus-ai-modal');
    if (modal) {
      modal.classList.remove('open');
      isAiModalOpen = false;
    }
  }

  function toggleModelDropdown(e) {
    e.stopPropagation();
    const menu = document.getElementById('excalidraw-plus-ai-model-menu');
    if (menu) {
      menu.classList.toggle('open');
      if (menu.classList.contains('open')) {
        const searchInput = document.getElementById('excalidraw-plus-ai-model-search');
        searchInput.value = '';
        searchInput.focus();
        modelSearchQuery = '';
        buildModelList();
      }
    }
  }

  function saveApiKeys() {
    const rawVal = document.getElementById('excalidraw-plus-ai-keys').value;
    const keys = rawVal.split('\n').map(k => k.trim()).filter(Boolean);
    geminiApiKeys = keys;
    currentKeyIndex = 0;
    chrome.storage.local.set({ gemini_api_keys: keys });
    fetchGeminiModels();
  }

  // Fetch dynamic models list from Google API using the first key available
  async function fetchGeminiModels() {
    if (geminiApiKeys.length === 0) return;
    const key = geminiApiKeys[0];
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      if (response.ok) {
        const data = await response.json();
        // Filter generateContent models
        const models = data.models
          .filter(m => m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace('models/', ''));
        if (models.length > 0) {
          fetchedModels = models;
          buildModelList();
        }
      }
    } catch (e) {
      console.warn("Failed to fetch models dynamically from Gemini API:", e);
    }
  }

  function buildModelList() {
    const listContainer = document.getElementById('excalidraw-plus-ai-model-list');
    if (!listContainer) return;

    const filtered = fetchedModels.filter(m => m.toLowerCase().includes(modelSearchQuery.toLowerCase()));

    listContainer.innerHTML = filtered.map(model => {
      const isSelected = model === selectedModel;
      return `<div class="excalidraw-plus-ai-dropdown-item ${isSelected ? 'selected' : ''}" data-model="${model}">${model}</div>`;
    }).join('');

    // Attach click events to model items
    listContainer.querySelectorAll('.excalidraw-plus-ai-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        selectedModel = item.getAttribute('data-model');
        document.getElementById('excalidraw-plus-ai-current-model-text').textContent = selectedModel;
        chrome.storage.local.set({ gemini_selected_model: selectedModel });
        document.getElementById('excalidraw-plus-ai-model-menu').classList.remove('open');
      });
    });
  }

  function filterModels() {
    modelSearchQuery = document.getElementById('excalidraw-plus-ai-model-search').value;
    buildModelList();
  }

  function addMessage(sender, text, isCode = false) {
    const chatBody = document.getElementById('excalidraw-plus-ai-chat-messages');
    if (!chatBody) return;

    const msg = document.createElement('div');
    msg.className = `excalidraw-plus-ai-msg ${sender}`;

    if (isCode) {
      msg.innerHTML = `<pre><code>${escapeHtml(text)}</code></pre>`;
    } else {
      msg.innerHTML = formatMarkdownText(text);
    }

    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function escapeHtml(string) {
    return String(string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatMarkdownText(text) {
    let html = escapeHtml(text);
    // Bold formats
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Inline code formats
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    // Convert newlines to breaks
    html = html.replace(/\n/g, '<br/>');
    return html;
  }

  // Load Mermaid Parser dependency dynamically
  function loadMermaidParser() {
    return new Promise((resolve, reject) => {
      if (window.ExcalidrawMermaidToExcalidraw) {
        resolve(window.ExcalidrawMermaidToExcalidraw);
        return;
      }

      // We load the script from standard CDN
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@excalidraw/mermaid-to-excalidraw@1.2.0/dist/mermaid-to-excalidraw.production.min.js';
      script.onload = () => {
        if (window.ExcalidrawMermaidToExcalidraw) {
          resolve(window.ExcalidrawMermaidToExcalidraw);
        } else if (window.mermaidToExcalidraw) {
          window.ExcalidrawMermaidToExcalidraw = window.mermaidToExcalidraw;
          resolve(window.mermaidToExcalidraw);
        } else {
          reject(new Error("Mermaid parser failed to load or attach to global window object."));
        }
      };
      script.onerror = () => reject(new Error("CDN script fetch failure for excalidraw-mermaid-to-excalidraw."));
      document.head.appendChild(script);
    });
  }

  async function handleUserMessage() {
    const input = document.getElementById('excalidraw-plus-ai-input');
    const sendBtn = document.getElementById('excalidraw-plus-ai-send');
    if (!input || !sendBtn || isGenerating) return;

    const promptText = input.value.trim();
    if (!promptText) return;

    if (geminiApiKeys.length === 0) {
      alert("Please enter at least one Gemini API Key in the API Keys area above.");
      return;
    }

    input.value = '';
    isGenerating = true;
    input.disabled = true;
    sendBtn.disabled = true;

    addMessage('user', promptText);
    addMessage('assistant', "Thinking & drawing... Please wait.");

    // Query Gemini API (with key rotation support on 429)
    let responseText = "";
    let success = false;
    let attempts = 0;
    const maxAttempts = geminiApiKeys.length;

    while (attempts < maxAttempts && !success) {
      const activeKey = geminiApiKeys[currentKeyIndex];
      try {
        const response = await callGeminiAPI(activeKey, promptText);
        if (response.status === 429) {
          console.warn(`Key #${currentKeyIndex} rate-limited (429). Rotating key...`);
          rotateApiKey();
          attempts++;
          continue;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `API Status Error: ${response.status}`);
        }

        const data = await response.json();
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        success = true;
      } catch (err) {
        console.error(`Attempt with key #${currentKeyIndex} failed:`, err);
        rotateApiKey();
        attempts++;
        if (attempts >= maxAttempts) {
          // All attempts failed
          removeLastSystemMessage();
          addMessage('assistant', `Failed to generate: ${err.message || 'Unknown network error'}. Please verify your API Key(s) and connection.`);
          resetGeneratingState();
          return;
        }
      }
    }

    if (success && responseText) {
      removeLastSystemMessage();
      // Extract code block content if it exists
      const cleanMermaid = extractMermaidCode(responseText);
      addMessage('assistant', "Compiling structure...");

      try {
        const parser = await loadMermaidParser();
        const parseResult = await parser.parseMermaidToExcalidraw(cleanMermaid, {
          fontSize: 16
        });

        if (parseResult && parseResult.elements) {
          // Import newly compiled elements directly to Excalidraw's canvas storage
          injectElementsToCanvas(parseResult.elements);
          removeLastSystemMessage();
          addMessage('assistant', `Success! Imported ${parseResult.elements.length} elements to your canvas.`);
          addMessage('assistant', cleanMermaid, true);
        } else {
          throw new Error("Empty elements array returned from mermaid parser");
        }
      } catch (e) {
        removeLastSystemMessage();
        addMessage('assistant', `Mermaid compilation error: ${e.message}. Here is the output raw code so you can copy and adjust:`);
        addMessage('assistant', cleanMermaid, true);
      }
    }

    resetGeneratingState();
  }

  function rotateApiKey() {
    currentKeyIndex = (currentKeyIndex + 1) % geminiApiKeys.length;
  }

  function removeLastSystemMessage() {
    const chatBody = document.getElementById('excalidraw-plus-ai-chat-messages');
    if (chatBody && chatBody.lastChild) {
      chatBody.removeChild(chatBody.lastChild);
    }
  }

  function resetGeneratingState() {
    isGenerating = false;
    const input = document.getElementById('excalidraw-plus-ai-input');
    const sendBtn = document.getElementById('excalidraw-plus-ai-send');
    if (input) {
      input.disabled = false;
      input.focus();
    }
    if (sendBtn) {
      sendBtn.disabled = false;
    }
  }

  function extractMermaidCode(text) {
    // Look for markdown code blocks enclosing mermaid or graph definitions
    const codeBlockRegex = /```(?:mermaid)?\s*([\s\S]*?)```/i;
    const match = text.match(codeBlockRegex);
    if (match && match[1]) {
      return match[1].trim();
    }
    return text.trim();
  }

  async function callGeminiAPI(key, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${key}`;
    const systemInstruction = `
You are an expert architect and diagram designer. Your task is to generate clean, syntax-valid Mermaid.js flowchart or sequence diagram definitions.

Follow these strict rules:
1. ONLY return a Mermaid diagram definition.
2. DO NOT write any conversational intros or explanations (e.g. do not say "Here is your diagram").
3. Flowcharts MUST start with: flowchart TD or flowchart LR
4. Sequence diagrams MUST start with: sequenceDiagram
5. Avoid special punctuation characters inside node labels. Wrap labels in quotes if they contain spaces. Example: A["This is a step"]
6. Prefer flowchart TD or flowchart LR for general processes.
`;

    const requestBody = {
      contents: [{
        parts: [{
          text: `Draw the following diagram request using Mermaid: ${prompt}`
        }]
      }],
      systemInstruction: {
        parts: [{
          text: systemInstruction
        }]
      }
    };

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
  }

  // Pushes elements directly into Excalidraw's canvas state & updates view
  function injectElementsToCanvas(newElements) {
    try {
      const currentRaw = localStorage.getItem('excalidraw');
      let currentElements = [];
      if (currentRaw) {
        currentElements = JSON.parse(currentRaw);
      }

      // Shift coordinates of new elements to place them in the center of the current screen view
      // Let's compute average center offset
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      newElements.forEach(el => {
        if (el.x < minX) minX = el.x;
        if (el.y < minY) minY = el.y;
        if (el.x + el.width > maxX) maxX = el.x + el.width;
        if (el.y + el.height > maxY) maxY = el.y + el.height;
      });

      const diagramWidth = maxX - minX;
      const diagramHeight = maxY - minY;

      // Position diagram nicely near coordinate 0,0 or shift if needed
      const shiftX = 100 - minX;
      const shiftY = 100 - minY;

      const processedNew = newElements.map(el => {
        const id = 'ai_' + Math.random().toString(36).substr(2, 9);
        const copy = {
          ...el,
          id: id,
          x: el.x + shiftX,
          y: el.y + shiftY,
          seed: Math.floor(Math.random() * 1e9)
        };
        // Fix bindings ids
        if (copy.containerId) {
          copy.containerId = 'ai_' + Math.random().toString(36).substr(2, 9);
        }
        return copy;
      });

      const mergedElements = [...currentElements, ...processedNew];
      localStorage.setItem('excalidraw', JSON.stringify(mergedElements));

      // Dispatch a storage update event or window reload event to force Excalidraw canvas to redraw immediately
      window.dispatchEvent(new Event('storage'));
      
      // Highlight imported elements by notifying user
      showToast(`Loaded ${processedNew.length} shapes. Drawing generated!`);
    } catch (e) {
      console.error("Failed to inject elements to Excalidraw storage:", e);
    }
  }

  // Attach button trigger to Excalidraw UI
  function checkAndInjectFloatingButton() {
    if (document.getElementById('excalidraw-plus-ai-trigger-btn')) return;

    // Look for top navigation menu actions container
    const headerActions = document.querySelector('.App-menu_top');
    if (headerActions) {
      const aiBtn = document.createElement('button');
      aiBtn.id = 'excalidraw-plus-ai-trigger-btn';
      aiBtn.className = 'excalidraw-plus-ai-btn';
      aiBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
          <polyline points="2 17 12 22 22 17"></polyline>
          <polyline points="2 12 12 17 22 12"></polyline>
        </svg>
        <span>AI Draw</span>
      `;

      aiBtn.addEventListener('click', openAiModal);
      headerActions.appendChild(aiBtn);
    }
  }

  // Listen to DOM mutations to inject button dynamically when Excalidraw mounts its menus
  const uiObserver = new MutationObserver(() => {
    checkAndInjectFloatingButton();
  });
  uiObserver.observe(document.documentElement, { childList: true, subtree: true });

  // Expose global trigger just in case
  window.openExcalidrawPlusAiModal = openAiModal;

})();
