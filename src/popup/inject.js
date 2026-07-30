/**
 * Web2MD popup script-injection helper: asks the background service worker to
 * ensure content/main-world scripts are injected into a tab before messaging it.
 */

/**
 * @param {number} tabId
 * @param {number} [frameId]
 * @param {{api?:boolean, vfs?:boolean, inspector?:boolean}|null} [mainWorld]
 * @returns {Promise<{success:boolean}>}
 */
export function ensureInjected(tabId, frameId = 0, mainWorld = null) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'ensureInjected',
      tabId,
      frameId,
      mainWorld
    }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false });
        return;
      }
      resolve(response || { success: false });
    });
  });
}
