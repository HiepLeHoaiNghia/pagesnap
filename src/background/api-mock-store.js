/**
 * Per-tab API call capture + mocking store.
 * Moved verbatim from background.js (tabApiCalls / tabMockingEnabled sections).
 */

import { ACTIONS } from '../shared/constants.js';

// Cache for captured API calls keyed by tab ID
const tabApiCalls = {};
// Cache for whether mocking is enabled keyed by tab ID
const tabMockingEnabled = {};

// Clean up cache when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabApiCalls[tabId];
  delete tabMockingEnabled[tabId];
});

export const handlers = {
  [ACTIONS.RESET_API_CALLS](message, sender, sendResponse) {
    if (!sender.tab) return;
    const tabId = sender.tab.id;
    if (tabApiCalls[tabId]) {
      // Keep only calls that are user-edited mocks to preserve them across reloads
      tabApiCalls[tabId] = tabApiCalls[tabId].filter(call => call.isMocked);
    }
    sendResponse({ success: true });
  },

  [ACTIONS.RECORD_API_CALL](message, sender, sendResponse) {
    if (!sender.tab) return;
    const tabId = sender.tab.id;
    if (!tabApiCalls[tabId]) {
      tabApiCalls[tabId] = [];
    }
    // Check for duplicates to avoid adding identical calls
    const isDuplicate = tabApiCalls[tabId].some(call =>
      call.url === message.call.url &&
      call.method === message.call.method &&
      Math.abs(call.timestamp - message.call.timestamp) < 1000
    );
    if (!isDuplicate) {
      tabApiCalls[tabId].push(message.call);
    }
    sendResponse({ success: true });
  },

  [ACTIONS.GET_API_CALLS](message, sender, sendResponse) {
    const tabId = message.tabId || (sender.tab ? sender.tab.id : null);
    sendResponse({ success: true, apiCalls: tabApiCalls[tabId] || [] });
  },

  [ACTIONS.SAVE_MOCK_FROM_WEB](message, sender, sendResponse) {
    if (!sender.tab) return;
    const tabId = sender.tab.id;
    const { mock } = message;
    if (!tabApiCalls[tabId]) {
      tabApiCalls[tabId] = [];
    }
    const idx = tabApiCalls[tabId].findIndex(call => call.url === mock.url && call.method === mock.method);
    if (idx !== -1) {
      tabApiCalls[tabId][idx] = { ...tabApiCalls[tabId][idx], ...mock };
    } else {
      tabApiCalls[tabId].push(mock);
    }
    try {
      chrome.tabs.sendMessage(tabId, { action: ACTIONS.SYNC_MOCKS, mocks: tabApiCalls[tabId] });
    } catch (e) {}
    sendResponse({ success: true });
  },

  [ACTIONS.UPDATE_API_CALL](message, sender, sendResponse) {
    const { tabId, index, updatedCall } = message;
    if (tabApiCalls[tabId] && tabApiCalls[tabId][index]) {
      tabApiCalls[tabId][index] = { ...tabApiCalls[tabId][index], ...updatedCall };
      // Broadcast mocks update to the content script in this tab
      try {
        chrome.tabs.sendMessage(tabId, { action: ACTIONS.SYNC_MOCKS, mocks: tabApiCalls[tabId] });
      } catch (e) {}
    }
    sendResponse({ success: true });
  },

  [ACTIONS.DELETE_API_CALL](message, sender, sendResponse) {
    const { tabId, index } = message;
    if (tabApiCalls[tabId] && tabApiCalls[tabId][index]) {
      tabApiCalls[tabId].splice(index, 1);
      // Broadcast mocks update to the content script in this tab
      try {
        chrome.tabs.sendMessage(tabId, { action: ACTIONS.SYNC_MOCKS, mocks: tabApiCalls[tabId] });
      } catch (e) {}
    }
    sendResponse({ success: true });
  },

  [ACTIONS.SET_MOCKING_ENABLED](message, sender, sendResponse) {
    const { tabId, enabled } = message;
    tabMockingEnabled[tabId] = enabled;
    try {
      chrome.tabs.sendMessage(tabId, { action: ACTIONS.SYNC_MOCKING_ENABLED, enabled: enabled });
    } catch (e) {}
    sendResponse({ success: true });
  },

  [ACTIONS.GET_MOCKING_ENABLED](message, sender, sendResponse) {
    if (!sender.tab) return;
    const tabId = sender.tab.id;
    const enabled = tabMockingEnabled[tabId] !== false;
    sendResponse({ success: true, enabled: enabled });
  },

  [ACTIONS.CLEAR_ALL_MOCKS](message, sender, sendResponse) {
    const { tabId } = message;
    if (tabApiCalls[tabId]) {
      tabApiCalls[tabId].forEach(call => {
        if (call.isMocked) {
          call.isMocked = false;
          call.status = call.originalStatus || call.status;
          call.responseText = call.originalResponseText !== undefined ? call.originalResponseText : call.responseText;
        }
      });
      tabApiCalls[tabId] = tabApiCalls[tabId].filter(call => call.originalStatus !== undefined);
      try {
        chrome.tabs.sendMessage(tabId, { action: ACTIONS.SYNC_MOCKS, mocks: tabApiCalls[tabId] });
      } catch (e) {}
    }
    sendResponse({ success: true });
  }
};
