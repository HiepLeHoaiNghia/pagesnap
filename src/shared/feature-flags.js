// plan-exempt — PageSnap branding update
/**
 * PageSnap Feature Flags (ES module — background + popup only).
 * Content scripts never read flags directly; the background
 * injector decides what gets injected based on these flags.
 */

export const FEATURE_DEFAULTS = {
  markdown: true,       // F1 Page → Markdown/HTML copy
  regionSelect: true,   // F2 Region selection copy + context menu
  htmlClone: true       // F3 Clean self-contained HTML snapshot / ZIP
};

const STORAGE_KEY = 'featureFlags';

export function getFlags() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(STORAGE_KEY, (data) => {
        resolve({ ...FEATURE_DEFAULTS, ...(data && data[STORAGE_KEY]) });
      });
    } catch (e) {
      // Storage access may fail if extension context is invalidated
      console.warn('[PageSnap] Failed to read flags from chrome.storage:', e);
      resolve({ ...FEATURE_DEFAULTS });
    }
  });
}

export async function setFlag(name, value) {
  const flags = await getFlags();
  flags[name] = value;
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: flags }, () => resolve(flags));
  });
}

export function onFlagsChanged(callback) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[STORAGE_KEY]) {
      callback({ ...FEATURE_DEFAULTS, ...changes[STORAGE_KEY].newValue });
    }
  });
}
