/**
 * Web2MD Background Service Worker (entry point).
 * Wires per-feature handler maps into the message router and keeps
 * context menus + persistently-registered content scripts in sync with
 * the current feature flags.
 */

import { registerAll } from './router.js';
import { handlers as apiMockHandlers } from './api-mock-store.js';
import { handlers as projectHandlers } from './project-store.js';
import { handlers as assetProxyHandlers } from './asset-proxy.js';
import { handlers as downloadHandlers } from './downloads.js';
import { handlers as injectorHandlers, syncRegisteredScripts } from './injector.js';
import { syncContextMenus } from './context-menus.js';
import { getFlags, onFlagsChanged } from '../shared/feature-flags.js';

registerAll({
  ...apiMockHandlers,
  ...projectHandlers,
  ...assetProxyHandlers,
  ...downloadHandlers,
  ...injectorHandlers
});

async function syncAll(flags) {
  const resolvedFlags = flags || await getFlags();
  await syncRegisteredScripts(resolvedFlags);
  await syncContextMenus(resolvedFlags);
}

chrome.runtime.onInstalled.addListener(() => {
  syncAll();
});

onFlagsChanged((flags) => {
  syncAll(flags);
});

syncAll();
