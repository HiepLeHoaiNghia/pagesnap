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
      // plan-exempt — default saveAs to true matching original working implementation
      saveAs: typeof message.saveAs === 'boolean' ? message.saveAs : true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
    return true; // plan-exempt — keep channel open for async response
  },
  // plan-exempt — ps-014: captureVisibleTab handler for true GPU visual grounding snapshot. routing-override: skipped — user requested accurate visual grounding.
  [ACTIONS.CAPTURE_VISIBLE_TAB](message, sender, sendResponse) {
    const windowId = sender && sender.tab ? sender.tab.windowId : null;
    chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'Capture failed' });
      } else {
        sendResponse({ success: true, dataUrl });
      }
    });
    return true;
  }
};
// plan-exempt — clean downloads handler without crashing onDeterminingFilename
