(function () {
  if (window.__web2md_mock_bridge_initialized__) return;
  window.__web2md_mock_bridge_initialized__ = true;

  /**
   * Web2MD Mock Bridge: relays API mock / inspect messages between the popup,
   * background, and MAIN world. Only injected when the apiMock/inspect feature is enabled.
   */
  Web2MD.isInspectActive = false;

  // Listen to postMessage from the page context script (inspect + mock save)
  window.addEventListener('message', (event) => {
    if (event.source === window && event.data) {
      if (event.data.type === 'WEB2MD_INSPECT_MODE_DISABLED') {
        Web2MD.isInspectActive = false;
      } else if (event.data.type === 'WEB2MD_UPDATE_MOCK_SAVE') {
        try {
          chrome.runtime.sendMessage({
            action: "saveMockFromWeb",
            mock: event.data.mock
          });
        } catch (e) {
          // Ignore extension context invalidated errors
        }
      }
    }
  });

  /**
   * Helper to fetch captured XHR/Fetch API calls from main world context
   */
  Web2MD.getApiCallsFromMainWorld = function () {
    return new Promise((resolve) => {
      const onApiMessage = (event) => {
        if (event.source === window && event.data && event.data.type === 'WEB2MD_API_CALLS_RESPONSE') {
          window.removeEventListener('message', onApiMessage);
          resolve(event.data.apiCalls || []);
        }
      };
      window.addEventListener('message', onApiMessage);
      window.postMessage({ type: 'WEB2MD_REQUEST_API_CALLS' }, '*');
      setTimeout(() => {
        window.removeEventListener('message', onApiMessage);
        resolve([]);
      }, 500);
    });
  };

  Web2MD.registerHandlers({
    getInspectState: (request, sender, sendResponse) => {
      sendResponse({ active: Web2MD.isInspectActive });
      return true;
    },
    toggleInspect: (request, sender, sendResponse) => {
      Web2MD.isInspectActive = request.enabled;
      if (Web2MD.isInspectActive) {
        if (Web2MD.isRegionSelectionActive) {
          Web2MD.toggleRegionSelectionMode(false);
        }
        if (Web2MD.isVisualEditActive) {
          Web2MD.toggleVisualEditMode(false);
        }
      }
      window.postMessage({ type: 'WEB2MD_TOGGLE_INSPECT', enabled: request.enabled }, '*');
      sendResponse({ success: true, active: Web2MD.isInspectActive });
      return true;
    },
    getApiCalls: (request, sender, sendResponse) => {
      Web2MD.getApiCallsFromMainWorld().then(calls => {
        sendResponse({ success: true, apiCalls: calls });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true; // Keep channel open for async response
    },
    updateApiCall: (request, sender, sendResponse) => {
      window.postMessage({ type: 'WEB2MD_UPDATE_API_CALL', index: request.index, updatedCall: request.updatedCall }, '*');
      sendResponse({ success: true });
      return true;
    },
    deleteApiCall: (request, sender, sendResponse) => {
      window.postMessage({ type: 'WEB2MD_DELETE_API_CALL', index: request.index }, '*');
      sendResponse({ success: true });
      return true;
    },
    syncMocks: (request, sender, sendResponse) => {
      window.postMessage({ type: 'WEB2MD_SET_MOCKS', mocks: request.mocks }, '*');
      sendResponse({ success: true });
      return true;
    },
    syncMockingEnabled: (request, sender, sendResponse) => {
      window.postMessage({ type: 'WEB2MD_SET_MOCKING_ENABLED', enabled: request.enabled }, '*');
      sendResponse({ success: true });
      return true;
    }
  });
})();
