// plan-exempt — split developer features into pagereplica-extension approved by user
/**
 * Web2MD Background Service Worker (entry point).
 * Wires per-feature handler maps into the message router and keeps
 * context menus in sync with the current feature flags.
 */

import { registerAll } from './router.js';
import { handlers as assetProxyHandlers } from './asset-proxy.js';
import { handlers as downloadHandlers } from './downloads.js';
import { handlers as injectorHandlers, syncRegisteredScripts } from './injector.js';
import { syncContextMenus } from './context-menus.js';
import { getFlags, onFlagsChanged } from '../shared/feature-flags.js';

registerAll({
  ...assetProxyHandlers,
  ...downloadHandlers,
  ...injectorHandlers
});

async function syncAll(flags) {
  const resolvedFlags = flags || await getFlags();
  await syncRegisteredScripts();
  await syncContextMenus(resolvedFlags);
}

chrome.runtime.onInstalled.addListener(() => {
  syncAll();
});

onFlagsChanged((flags) => {
  syncAll(flags);
});

syncAll();
