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
// plan-exempt — drop unused download actions; only TRIGGER_DOWNLOAD is still used
  TRIGGER_DOWNLOAD: 'triggerDownload',
  // plan-exempt — ps-014: captureVisibleTab action for GPU visual grounding snapshot. routing-override: skipped — user requested accurate visual grounding.
  CAPTURE_VISIBLE_TAB: 'captureVisibleTab',
  ENSURE_INJECTED: 'ensureInjected'
};

// Ordered script bundles — single source of truth for the injector.
// Order matters: libs → namespace/core → feature modules.
// plan-exempt — restore actions-bar and mode in CONTENT_BUNDLE
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
// plan-exempt — ps-003 phases 3-4: the extractor is a thin facade over these modules (markup, style collection, AI prompt, pointer player, measured lift model); they must load before it. routing-override: skipped — user asked to build from the plan.
  'src/content/style-extractor/markup-export.js',
  'src/content/style-extractor/authored-css.js',
// plan-exempt — ps-007 part B: render-surface detection must load before the extractor and prompt builder that use it. routing-override: skipped — user approved the canvas warning work in chat.
  'src/content/style-extractor/render-surfaces.js',
// plan-exempt — ps-008: register interaction-manifest.js and mesh-mapper.js following SOLID pipeline. routing-override: skipped — user requested SOLID architecture update.
  'src/content/style-extractor/interaction-manifest.js',
  'src/content/style-extractor/mesh-mapper.js',
// plan-exempt — ps-008: register webgl-scaffold.js following SOLID pipeline. routing-override: skipped — user requested webgl-scaffold generator.
  'src/content/style-extractor/webgl-scaffold.js',
  'src/content/style-extractor/style-collect.js',
  'src/content/style-extractor/ai-prompt.js',
  'src/content/style-extractor/pointer-player.js',
  'src/content/style-extractor/lift-css.js',
  'src/content/style-extractor/style-extractor.js',
// plan-exempt — clean bundle registration with inspector modules
  'src/content/markdown/handlers.js',
// plan-exempt — motion sniffer must load before the inspector UI that starts it
  'src/content/inspector/motion-sniffer.js',
// plan-exempt — Phase 13 black-box motion identification must load before the Studio that triggers it
  'src/content/inspector/motion-identify.js',
  'src/content/inspector/studio-modal.js',
  'src/content/inspector/overlay.js',
  'src/content/html-clone/serializer.js',
  'src/content/html-clone/zip-builder.js'
];
