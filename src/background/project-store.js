/**
 * Cache for detected React VFS projects across frames, keyed by tab ID.
 * Moved verbatim from background.js.
 */

import { ACTIONS } from '../shared/constants.js';

const tabProjects = {};

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabProjects[tabId];
});

export const handlers = {
  [ACTIONS.REGISTER_PROJECT](message, sender, sendResponse) {
    if (!sender.tab) return;
    tabProjects[sender.tab.id] = {
      files: message.projectFiles,
      title: sender.tab.title || "Project"
    };
    sendResponse({ success: true });
  },

  [ACTIONS.GET_PROJECT](message, sender, sendResponse) {
    const tabId = message.tabId;
    if (tabProjects[tabId]) {
      sendResponse({
        hasProject: true,
        projectFiles: tabProjects[tabId].files,
        title: tabProjects[tabId].title
      });
    } else {
      sendResponse({ hasProject: false });
    }
  }
};
