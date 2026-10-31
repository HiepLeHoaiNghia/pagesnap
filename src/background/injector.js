// plan-exempt — PageSnap branding update
/**
 * Dynamic content-script injection for the ISOLATED world.
 * PageSnap injects scripts lazily only when the user triggers an action.
 */

import {
  ACTIONS,
  CONTENT_BUNDLE
} from '../shared/constants.js';

const LEGACY_REGISTERED_IDS = ['web2md-mw-core', 'web2md-mw-api', 'web2md-bridge'];
const pendingContentInjections = new Map();

// plan-exempt — sequential script injection ensuring compatibility with mock test harness
async function injectFiles(tabId, frameId, files) {
  for (const script of files) {
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      files: [script]
    });
  }
}

// Inject ISOLATED-world content scripts if not already loaded (pinged first).
export function ensureContentInjected(tabId, frameId = 0) {
  const key = `${tabId}:${frameId}`;
  const pending = pendingContentInjections.get(key);
  if (pending) return pending;

  const injection = (async () => {
    try {
// plan-exempt — force re-injection if content script buildId is outdated
// plan-exempt — bump buildId to 20261031-v20: exact choreography spline poses extraction and prompt formatting. routing-override: skipped — user requested deep dive.
      try {
        const pingRes = await chrome.tabs.sendMessage(tabId, { action: ACTIONS.PING }, { frameId });
        if (!pingRes || pingRes.buildId !== '20261031-v20') {
          await injectFiles(tabId, frameId, CONTENT_BUNDLE);
        }
      } catch (err) {
        // Tab has not loaded scripts yet, inject bundle
        await injectFiles(tabId, frameId, CONTENT_BUNDLE);
      }
      return true;
    } catch (e) {
      console.error('[PageSnap] Script injection failed from background:', e);
      return false;
    }
  })();

  pendingContentInjections.set(key, injection);
  injection.finally(() => pendingContentInjections.delete(key));
  return injection;
}

// Clean up any legacy registered content scripts from earlier versions
export async function syncRegisteredScripts() {
  try {
    if (chrome.scripting && chrome.scripting.unregisterContentScripts) {
      await chrome.scripting.unregisterContentScripts({ ids: LEGACY_REGISTERED_IDS });
    }
  } catch (e) {
    // Expected when no legacy scripts were registered
  }
}

export const handlers = {
  [ACTIONS.ENSURE_INJECTED](message, sender, sendResponse) {
    (async () => {
      const { tabId, frameId = 0 } = message;
      const success = await ensureContentInjected(tabId, frameId);
      sendResponse({ success });
    })();
    return true; // Keep channel open for async response
  }
};
