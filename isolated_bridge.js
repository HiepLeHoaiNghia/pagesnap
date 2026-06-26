/**
 * Web2MD Isolated Bridge Script
 * Forwards API call recorded events from MAIN world to background service worker.
 */

// On script startup at document_start (top frame only), notify background to reset/clear captured calls
if (window.top === window) {
  try {
    chrome.runtime.sendMessage({ action: "resetApiCalls" });
  } catch (e) {
    // Ignore runtime errors if background isn't ready yet
  }
}

window.addEventListener('message', (event) => {
  if (event.source === window && event.data && event.data.type === 'WEB2MD_API_CALL_RECORDED') {
    try {
      chrome.runtime.sendMessage({ action: "recordApiCall", call: event.data.call });
    } catch (e) {
      // Ignore extension context invalidated errors
    }
  }
});

