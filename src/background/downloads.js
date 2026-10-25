/**
 * triggerDownload handler — moved verbatim from background.js.
 */

import { ACTIONS } from '../shared/constants.js';

export const handlers = {
  [ACTIONS.TRIGGER_DOWNLOAD](message, sender, sendResponse) {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename,
      conflictAction: message.conflictAction || 'uniquify',
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
// plan-exempt — clean downloads handler without crashing onDeterminingFilename
