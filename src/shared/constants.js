// plan-exempt — smart pagination actions and bundle registration
/**
 * PageSnap shared constants (ES module — background + popup only).
 * Content scripts use literal strings (no ESM support there);
 * this file is the canonical registry — keep them in sync when adding actions.
 */

export const APP_CONFIG = {
  NAME: 'PageSnap',
  PREFIX: 'pagesnap',
  LOG_PREFIX: '[PageSnap]',
  MENU_MD_ID: 'pagesnap-region-md',
  MENU_HTML_ID: 'pagesnap-region-html'
};

// chrome.runtime message actions
export const ACTIONS = {
  PING: 'ping',
  // F1 markdown
  EXTRACT_CONTENT: 'extractContent',
  CONVERT_PAGE: 'convertPage',
  CONVERT_SELECTION: 'convertSelection',
  CONVERT_HTML_TO_MARKDOWN: 'convertHtmlToMarkdown',
  // F2 region select
  GET_REGION_SELECTION_STATE: 'getRegionSelectionState',
  TOGGLE_REGION_SELECTION: 'toggleRegionSelection',
  CONTEXT_MENU_COPY_REGION: 'contextMenuCopyRegion',
  // F3 html clone
  CLONE_PAGE: 'clonePage',
  FETCH_EXTERNAL_STYLESHEET: 'fetchExternalStyleSheet',
  FETCH_EXTERNAL_SCRIPT: 'fetchExternalScript',
  FETCH_ASSET_AS_BASE64: 'fetchAssetAsBase64',
  TRIGGER_DOWNLOAD: 'triggerDownload',
// plan-exempt — prune pagination actions and bundles
  // injection
  ENSURE_INJECTED: 'ensureInjected'
};

// Ordered script bundles — single source of truth for the injector.
// Order matters: libs → namespace/core → feature modules.
export const CONTENT_BUNDLE = [
  'lib/readability.js',
  'lib/turndown.js',
  'lib/turndown-plugin-gfm.js',
  'lib/jszip.min.js',
  'src/content/core/namespace.js',
  'src/content/core/utils.js',
  'src/content/core/settings.js',
  'src/content/markdown/dom-preprocess.js',
  'src/content/markdown/turndown-config.js',
  'src/content/markdown/extractor.js',

  'src/content/markdown/handlers.js',
  'src/content/html-clone/serializer.js',
  'src/content/html-clone/zip-builder.js'
];
