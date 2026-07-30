/**
 * Web2MD popup API Mocks tab: list/search captured calls, edit/delete/reset a
 * mock, clear all mocks, and relay inspect-mode "jump to call" messages.
 */
const apiListContainer = document.getElementById('api-list-container');
const apiSearchInput = document.getElementById('api-search');
const btnRefreshApi = document.getElementById('btn-refresh-api');
const apiListView = document.getElementById('api-list-view');
const apiEditorView = document.getElementById('api-editor-view');
const btnEditorBack = document.getElementById('btn-editor-back');
const editorUrl = document.getElementById('editor-url');
const editorMethod = document.getElementById('editor-method');
const editorStatus = document.getElementById('editor-status');
const editorBody = document.getElementById('editor-body');
const btnEditorFormat = document.getElementById('btn-editor-format');
const btnEditorDelete = document.getElementById('btn-editor-delete');
const btnEditorSave = document.getElementById('btn-editor-save');
const btnEditorReset = document.getElementById('btn-editor-reset');
const btnClearAllMocks = document.getElementById('btn-clear-all-mocks');
const tabApi = document.getElementById('tab-api');

let activeEditingCall = null;

export function showApiListView() {
  if (apiListView) apiListView.classList.remove('hidden');
  if (apiEditorView) apiEditorView.classList.add('hidden');
  activeEditingCall = null;
}

function showApiEditorView(call) {
  if (!apiListView || !apiEditorView) return;

  activeEditingCall = call;

  editorUrl.textContent = call.url;
  editorUrl.title = call.url;
  editorMethod.value = call.method || 'GET';
  editorStatus.value = call.status || 200;
  editorBody.value = call.responseText || '';

  apiListView.classList.add('hidden');
  apiEditorView.classList.remove('hidden');
}

export function fetchAndRenderApiCalls(searchQuery = '') {
  if (!apiListContainer) return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    const activeTab = tabs[0];

    chrome.runtime.sendMessage({ action: "getApiCalls", tabId: activeTab.id }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        apiListContainer.innerHTML = '<div class="api-empty-state">Unable to load API history. Make sure to click Extract Page first.</div>';
        return;
      }

      const apiCalls = response.apiCalls || [];
      if (apiCalls.length === 0) {
        apiListContainer.innerHTML = `
          <div class="api-empty-state-guide">
            <div class="guide-icon">💡</div>
            <h4>How to Capture & Mock APIs:</h4>
            <ol>
              <li>Turn on <strong>Preserve JS & Mock APIs</strong> toggle above.</li>
              <li>Reload the page to start capturing early requests.</li>
              <li>Interact with the page (or let it load).</li>
              <li>Click <strong>⚡ Extract Page</strong> in this extension.</li>
              <li>Switch to <strong>HTML Clone</strong> tab, download <strong>ZIP Package</strong> or <strong>Deploy Netlify</strong> to run live mock!</li>
            </ol>
          </div>`;
        return;
      }

      const listWithIndex = apiCalls.map((item, idx) => ({ ...item, originalIndex: idx }));
      const filtered = listWithIndex.filter(call => call.url.toLowerCase().includes(searchQuery.toLowerCase()));

      if (filtered.length === 0) {
        apiListContainer.innerHTML = '<div class="api-empty-state">No matching API requests.</div>';
        return;
      }

      apiListContainer.innerHTML = '';
      filtered.forEach(call => {
        const card = document.createElement('div');
        card.className = 'api-card';

        const meta = document.createElement('div');
        meta.className = 'api-card-meta';

        const methodBadge = document.createElement('span');
        methodBadge.className = `api-badge ${call.method.toLowerCase()}`;
        methodBadge.textContent = call.method;

        const statusBadge = document.createElement('span');
        const isSuccess = call.status >= 200 && call.status < 300;
        statusBadge.className = `api-status ${isSuccess ? 'success' : 'error'}`;
        statusBadge.textContent = call.status;

        const indicator = document.createElement('span');
        if (call.isMocked) {
          if (call.status >= 400) {
            indicator.className = 'api-indicator error-mock';
            indicator.textContent = '🔴 Mocked';
            indicator.title = 'Mocked Error Response';
          } else {
            indicator.className = 'api-indicator mocked';
            indicator.textContent = '🟡 Mocked';
            indicator.title = 'Mocked Success Response';
          }
        } else {
          indicator.className = 'api-indicator live';
          indicator.textContent = '🟢 Live';
          indicator.title = 'Live captured request';
        }

        const urlSpan = document.createElement('span');
        urlSpan.className = 'api-url';
        urlSpan.textContent = call.url;
        urlSpan.title = call.url;

        meta.appendChild(methodBadge);
        meta.appendChild(statusBadge);
        meta.appendChild(indicator);
        meta.appendChild(urlSpan);
        card.appendChild(meta);

        const editIndicator = document.createElement('span');
        editIndicator.className = 'api-card-edit-indicator';
        editIndicator.innerHTML = '✎';
        card.appendChild(editIndicator);

        card.addEventListener('click', () => {
          showApiEditorView(call);
        });

        apiListContainer.appendChild(card);
      });
    });
  });
}

function deleteApiCall(index) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    chrome.runtime.sendMessage({ action: "deleteApiCall", tabId: tabs[0].id, index: index }, (res) => {
      fetchAndRenderApiCalls(apiSearchInput ? apiSearchInput.value : '');
    });
  });
}

export function initApiMocks() {
  // Hook search & refresh controls
  if (apiSearchInput) {
    apiSearchInput.addEventListener('input', () => {
      fetchAndRenderApiCalls(apiSearchInput.value);
    });
  }

  if (btnRefreshApi) {
    btnRefreshApi.addEventListener('click', () => {
      fetchAndRenderApiCalls(apiSearchInput ? apiSearchInput.value : '');
    });
  }

  // Hook Sub-Editor Controls
  if (btnEditorBack) {
    btnEditorBack.addEventListener('click', showApiListView);
  }

  if (btnEditorFormat) {
    btnEditorFormat.addEventListener('click', () => {
      try {
        const obj = JSON.parse(editorBody.value);
        editorBody.value = JSON.stringify(obj, null, 2);
      } catch (err) {
        const originalText = btnEditorFormat.textContent;
        btnEditorFormat.textContent = '⚠️ Invalid JSON';
        btnEditorFormat.style.color = '#f87171';
        setTimeout(() => {
          btnEditorFormat.textContent = originalText;
          btnEditorFormat.style.color = '';
        }, 1500);
      }
    });
  }

  if (btnEditorReset) {
    btnEditorReset.addEventListener('click', () => {
      if (!activeEditingCall) return;
      if (confirm('Revert this mock and restore the live API calls?')) {
        const origMethod = activeEditingCall.originalMethod || activeEditingCall.method || 'GET';
        const origStatus = activeEditingCall.originalStatus || activeEditingCall.status || 200;
        const origBody = activeEditingCall.originalResponseText !== undefined ? activeEditingCall.originalResponseText : (activeEditingCall.responseText || '');

        editorMethod.value = origMethod;
        editorStatus.value = origStatus;
        editorBody.value = origBody;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || tabs.length === 0) return;
          chrome.runtime.sendMessage({
            action: "updateApiCall",
            tabId: tabs[0].id,
            index: activeEditingCall.originalIndex,
            updatedCall: {
              method: origMethod,
              status: origStatus,
              responseText: origBody,
              isMocked: false
            }
          }, (res) => {
            const originalText = btnEditorReset.textContent;
            btnEditorReset.textContent = 'Reverted ✓';
            btnEditorReset.style.color = '#10b981';
            setTimeout(() => {
              btnEditorReset.textContent = originalText;
              btnEditorReset.style.color = '';
            }, 1500);
            fetchAndRenderApiCalls(apiSearchInput ? apiSearchInput.value : '');
          });
        });
      }
    });
  }

  if (btnEditorDelete) {
    btnEditorDelete.addEventListener('click', () => {
      if (activeEditingCall && confirm('Are you sure you want to delete this mock?')) {
        deleteApiCall(activeEditingCall.originalIndex);
        showApiListView();
      }
    });
  }

  if (btnEditorSave) {
    btnEditorSave.addEventListener('click', () => {
      if (!activeEditingCall) return;
      const newMethod = editorMethod.value;
      const newStatus = parseInt(editorStatus.value, 10) || 200;
      const newBody = editorBody.value;

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        chrome.runtime.sendMessage({
          action: "updateApiCall",
          tabId: tabs[0].id,
          index: activeEditingCall.originalIndex,
          updatedCall: {
            method: newMethod,
            status: newStatus,
            responseText: newBody,
            isMocked: true
          }
        }, (res) => {
          // Highlight save button success
          const originalText = btnEditorSave.textContent;
          btnEditorSave.textContent = 'Saved ✓';
          btnEditorSave.style.background = '#10b981';
          setTimeout(() => {
            btnEditorSave.textContent = originalText;
            btnEditorSave.style.background = '';
          }, 1500);

          // Refresh list to reflect changes on back button
          fetchAndRenderApiCalls(apiSearchInput ? apiSearchInput.value : '');
        });
      });
    });
  }

  if (btnClearAllMocks) {
    btnClearAllMocks.addEventListener('click', () => {
      if (confirm('Clear all mock API overrides for this page and restore live API calls? This will reload the web page.')) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || tabs.length === 0) return;
          const tabId = tabs[0].id;
          chrome.runtime.sendMessage({
            action: "clearAllMocks",
            tabId: tabId
          }, (res) => {
            chrome.tabs.reload(tabId);
            window.close();
          });
        });
      }
    });
  }

  // Handle messages from page context / isolated bridge
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "inspectElementClicked" && message.call) {
      if (tabApi) {
        tabApi.click();
      }
      if (apiSearchInput) {
        try {
          const parsed = new URL(message.call.url);
          apiSearchInput.value = parsed.pathname;
        } catch(e) {
          apiSearchInput.value = message.call.url;
        }
        apiSearchInput.dispatchEvent(new Event('input'));
      }

      setTimeout(() => {
        const cards = apiListContainer.querySelectorAll('.api-card');
        for (const card of cards) {
          const urlEl = card.querySelector('.api-url');
          const methodEl = card.querySelector('.api-badge');
          if (urlEl && methodEl &&
              methodEl.textContent.trim().toUpperCase() === message.call.method.toUpperCase() &&
              (message.call.url.includes(urlEl.textContent.trim()) || urlEl.textContent.trim().includes(message.call.url))) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('highlight-flash');
            setTimeout(() => {
              card.classList.remove('highlight-flash');
            }, 3000);
            break;
          }
        }
      }, 300);
    } else if (message.action === "syncMocks") {
      fetchAndRenderApiCalls(apiSearchInput ? apiSearchInput.value : '');
    }
  });
}
