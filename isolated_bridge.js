/**
 * Web2MD Isolated Bridge Script
 * Forwards API call recorded events from MAIN world to background service worker.
 * Also synchronizes mock overrides between background and MAIN world.
 */

(function() {
  if (window.__web2md_isolated_bridge_initialized__) return;
  window.__web2md_isolated_bridge_initialized__ = true;

  // On script startup, reset non-mock logs and fetch preserved active mocks
  try {
    chrome.runtime.sendMessage({ action: "resetApiCalls" }, () => {
      chrome.runtime.sendMessage({ action: "getApiCalls" }, (response) => {
        if (response && response.success && response.apiCalls) {
          window.postMessage({ type: 'WEB2MD_SET_MOCKS', mocks: response.apiCalls }, '*');
        }
      });
      chrome.runtime.sendMessage({ action: "getMockingEnabled" }, (response) => {
        if (response && response.success) {
          window.postMessage({ type: 'WEB2MD_SET_MOCKING_ENABLED', enabled: response.enabled }, '*');
        }
      });
    });
  } catch (e) {
    // Ignore runtime errors if background isn't ready yet
  }

  // Listen to captured calls, mock saves, and inspected clicks from MAIN world
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    
    if (event.data.type === 'WEB2MD_API_CALL_RECORDED') {
      try {
        chrome.runtime.sendMessage({ action: "recordApiCall", call: event.data.call });
      } catch (e) {
        // Ignore extension context invalidated errors
      }
    } else if (event.data.type === 'WEB2MD_UPDATE_MOCK_SAVE') {
      try {
        chrome.runtime.sendMessage({ action: "saveMockFromWeb", mock: event.data.mock });
      } catch (e) {}
    } else if (event.data.type === 'WEB2MD_INSPECTED_ELEMENT_CLICKED') {
      try {
        chrome.runtime.sendMessage({ action: "inspectElementClicked", call: event.data.call });
      } catch (e) {}
    }
  });

  // Listen to mock updates from background and broadcast them to MAIN world
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "syncMocks" && message.mocks) {
      window.postMessage({ type: 'WEB2MD_SET_MOCKS', mocks: message.mocks }, '*');
    } else if (message.action === "syncMockingEnabled") {
      window.postMessage({ type: 'WEB2MD_SET_MOCKING_ENABLED', enabled: message.enabled }, '*');
    }
  });
})();
