/**
 * Dynamic content-script injection for the ISOLATED world (content bundle +
 * mock bridge) and the MAIN world (core/api/vfs/inspector), plus persistent
 * document_start registration for the API-mock feature.
 */

import {
  ACTIONS,
  CONTENT_BUNDLE,
  MOCK_BRIDGE_FILES,
  ISOLATED_BRIDGE_FILE,
  MAIN_WORLD_CORE,
  MAIN_WORLD_API,
  MAIN_WORLD_VFS,
  MAIN_WORLD_INSPECTOR
} from '../shared/constants.js';
import { getFlags } from '../shared/feature-flags.js';

const MW_CORE_ID = 'web2md-mw-core';
const MW_API_ID = 'web2md-mw-api';
const BRIDGE_ID = 'web2md-bridge';
const REGISTERED_IDS = [MW_CORE_ID, MW_API_ID, BRIDGE_ID];

// Inject ISOLATED-world content scripts if not already loaded (pinged first).
export async function ensureContentInjected(tabId, frameId = 0) {
  try {
    // Check if the script is already loaded by pinging it
    await chrome.tabs.sendMessage(tabId, { action: ACTIONS.PING }, { frameId });
    return true;
  } catch (err) {
    try {
      const flags = await getFlags();
      const files = [...CONTENT_BUNDLE];
      if (flags.apiMock || flags.inspect) {
        files.push(...MOCK_BRIDGE_FILES);
      }
      for (const script of files) {
        await chrome.scripting.executeScript({
          target: { tabId: tabId, frameIds: [frameId] },
          files: [script]
        });
      }
      if (flags.apiMock || flags.inspect) {
        await chrome.scripting.executeScript({
          target: { tabId: tabId, frameIds: [frameId] },
          files: [ISOLATED_BRIDGE_FILE]
        });
      }
      return true;
    } catch (e) {
      console.error("Script injection failed from background: ", e);
      return false;
    }
  }
}

// Inject MAIN-world scripts (core + conditionally api/vfs/inspector).
export async function ensureMainWorldInjected(tabId, frameId = 0, parts = {}) {
  try {
    const files = [...MAIN_WORLD_CORE];
    if (parts.api) files.push(...MAIN_WORLD_API);
    if (parts.vfs) files.push(...MAIN_WORLD_VFS);
    if (parts.inspector) files.push(...MAIN_WORLD_INSPECTOR);
    await chrome.scripting.executeScript({
      target: { tabId: tabId, frameIds: [frameId] },
      files: files,
      world: "MAIN"
    });
  } catch (e) {
    console.warn("Dynamic main world injection warning from background: ", e);
  }
}

// Persistently register document_start scripts for the API-mock feature
// (needed so fetch/XHR interception is in place before page scripts run).
export async function syncRegisteredScripts(flags) {
  if (flags.apiMock) {
    try {
      const existing = await chrome.scripting.getRegisteredContentScripts({ ids: REGISTERED_IDS });
      const existingIds = new Set(existing.map(s => s.id));
      const toRegister = [];
      if (!existingIds.has(MW_CORE_ID)) {
        toRegister.push({
          id: MW_CORE_ID,
          js: MAIN_WORLD_CORE,
          world: 'MAIN',
          runAt: 'document_start',
          allFrames: true,
          matches: ['<all_urls>'],
          persistAcrossSessions: true
        });
      }
      if (!existingIds.has(MW_API_ID)) {
        toRegister.push({
          id: MW_API_ID,
          js: MAIN_WORLD_API,
          world: 'MAIN',
          runAt: 'document_start',
          allFrames: true,
          matches: ['<all_urls>'],
          persistAcrossSessions: true
        });
      }
      if (!existingIds.has(BRIDGE_ID)) {
        toRegister.push({
          id: BRIDGE_ID,
          js: [ISOLATED_BRIDGE_FILE],
          runAt: 'document_start',
          allFrames: true,
          matches: ['<all_urls>'],
          persistAcrossSessions: true
        });
      }
      if (toRegister.length) {
        await chrome.scripting.registerContentScripts(toRegister);
      }
    } catch (e) {
      console.warn("registerContentScripts failed: ", e);
    }
  } else {
    try {
      await chrome.scripting.unregisterContentScripts({ ids: REGISTERED_IDS });
    } catch (e) {
      // ignore if scripts were never registered
    }
  }
}

export const handlers = {
  [ACTIONS.ENSURE_INJECTED](message, sender, sendResponse) {
    (async () => {
      const { tabId, frameId = 0, mainWorld } = message;
      const success = await ensureContentInjected(tabId, frameId);
      if (success && mainWorld) {
        await ensureMainWorldInjected(tabId, frameId, mainWorld);
      }
      sendResponse({ success });
    })();
    return true; // Keep channel open for async response
  }
};
