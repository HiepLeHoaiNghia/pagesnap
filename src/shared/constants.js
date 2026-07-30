/**
 * Web2MD shared constants (ES module — background + popup only).
 * Content/main-world scripts use literal strings (no ESM support there);
 * this file is the canonical registry — keep them in sync when adding actions.
 */

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
  // F4 api mock
  // NOTE: getApiCalls is overloaded historically — background answers from its
  // per-tab store (popup passes tabId); content.js answers with a live pull from
  // the MAIN world when messaged directly via chrome.tabs.sendMessage.
  GET_API_CALLS: 'getApiCalls',
  RESET_API_CALLS: 'resetApiCalls',
  RECORD_API_CALL: 'recordApiCall',
  SAVE_MOCK_FROM_WEB: 'saveMockFromWeb',
  UPDATE_API_CALL: 'updateApiCall',
  DELETE_API_CALL: 'deleteApiCall',
  SET_MOCKING_ENABLED: 'setMockingEnabled',
  GET_MOCKING_ENABLED: 'getMockingEnabled',
  CLEAR_ALL_MOCKS: 'clearAllMocks',
  SYNC_MOCKS: 'syncMocks',
  SYNC_MOCKING_ENABLED: 'syncMockingEnabled',
  // F5 inspect
  GET_INSPECT_STATE: 'getInspectState',
  TOGGLE_INSPECT: 'toggleInspect',
  // F6 visual edit
  GET_VISUAL_EDIT_STATE: 'getVisualEditState',
  TOGGLE_VISUAL_EDIT: 'toggleVisualEdit',
  // F7 project detect
  REGISTER_PROJECT: 'registerProject',
  GET_PROJECT: 'getProject',
  // injection (new — popup asks background to inject)
  ENSURE_INJECTED: 'ensureInjected'
};

// window.postMessage types (MAIN world ⇄ ISOLATED world)
export const WINDOW_MESSAGES = {
  API_CALL_RECORDED: 'WEB2MD_API_CALL_RECORDED',
  UPDATE_MOCK_SAVE: 'WEB2MD_UPDATE_MOCK_SAVE',
  SET_MOCKS: 'WEB2MD_SET_MOCKS',
  SET_MOCKING_ENABLED: 'WEB2MD_SET_MOCKING_ENABLED',
  TOGGLE_INSPECT: 'WEB2MD_TOGGLE_INSPECT',
  REQUEST_VFS_SCAN: 'WEB2MD_REQUEST_VFS_SCAN',
  VFS_RESPONSE: 'WEB2MD_VFS_RESPONSE',
  REQUEST_API_CALLS: 'WEB2MD_REQUEST_API_CALLS',
  API_CALLS_RESPONSE: 'WEB2MD_API_CALLS_RESPONSE',
  UPDATE_API_CALL: 'WEB2MD_UPDATE_API_CALL',
  DELETE_API_CALL: 'WEB2MD_DELETE_API_CALL'
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
  'src/content/region-select/mode.js',
  'src/content/region-select/actions-bar.js',
  'src/content/html-clone/mock-stub.js',
  'src/content/html-clone/serializer.js',
  'src/content/html-clone/zip-builder.js',
  'src/content/visual-edit/visual-edit.js'
];

// Injected in addition to CONTENT_BUNDLE only when apiMock/inspect is enabled.
export const MOCK_BRIDGE_FILES = ['src/content/mock-bridge/relay.js'];
export const ISOLATED_BRIDGE_FILE = 'src/isolated-bridge.js';

// MAIN-world bundles (never injected unless the owning flag is on)
export const MAIN_WORLD_CORE = ['src/main-world/core.js'];
export const MAIN_WORLD_API = ['src/main-world/api-interceptor.js'];
export const MAIN_WORLD_VFS = ['src/main-world/vfs-scanner.js'];
export const MAIN_WORLD_INSPECTOR = ['src/main-world/inspector.js'];
