/**
 * triggerDownload handler — moved verbatim from background.js.
 */

import { ACTIONS } from '../shared/constants.js';

export const handlers = {
  [ACTIONS.TRIGGER_DOWNLOAD](message, sender, sendResponse) {
// plan-exempt — support configurable saveAs parameter with false default to avoid macOS hangs
    chrome.downloads.download({
      url: message.url,
      filename: message.filename,
      saveAs: typeof message.saveAs === 'boolean' ? message.saveAs : false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
    return true; // plan-exempt — keep channel open for async response
  }
};

// plan-exempt — enforce filename determination on macOS to prevent .com.google.Chrome.* temp files
if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.onDeterminingFilename) {
  chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    if (item.filename) {
      suggest({ filename: item.filename, conflictAction: 'uniquify' });
    } else {
      suggest();
    }
  });
}
