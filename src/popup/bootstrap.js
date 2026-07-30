/**
 * Web2MD popup bootstrap (plain script, loaded before shared content files).
 * Provides the window.Web2MD namespace that the shared markdown scripts
 * (turndown-config.js, dom-preprocess.js) attach to, without pulling in
 * src/content/core/namespace.js (which registers a chrome.runtime.onMessage
 * listener meant for the page's content-script context, not the popup).
 */
window.Web2MD = window.Web2MD || {};
