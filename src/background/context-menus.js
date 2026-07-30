/**
 * Region-select context menus — creation gated by the regionSelect feature
 * flag, and the click handler that triggers region copy.
 */

import { ACTIONS } from '../shared/constants.js';
import { ensureContentInjected } from './injector.js';

const MENU_MD = 'web2md-region-md';
const MENU_HTML = 'web2md-region-html';

export async function syncContextMenus(flags) {
  await new Promise(resolve => chrome.contextMenus.removeAll(resolve));
  if (flags.regionSelect) {
    chrome.contextMenus.create({
      id: MENU_MD,
      title: "Copy this region as Markdown",
      contexts: ["all"]
    });
    chrome.contextMenus.create({
      id: MENU_HTML,
      title: "Copy this region as HTML",
      contexts: ["all"]
    });
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_MD || info.menuItemId === MENU_HTML) {
    const success = await ensureContentInjected(tab.id);
    if (success) {
      chrome.tabs.sendMessage(tab.id, {
        action: ACTIONS.CONTEXT_MENU_COPY_REGION,
        format: info.menuItemId === MENU_MD ? "markdown" : "html"
      });
    }
  }
});
