// plan-exempt — PageSnap branding update
/**
 * PageSnap popup shared state: safe storage helper, settings defaults/load/save,
 * and the mutable extraction state shared across popup modules.
 */

// Safe storage helper fallback (sync -> local -> localStorage)
export const safeStorage = {
  get: (key) => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const area = chrome.storage.sync || chrome.storage.local;
        if (area) {
          area.get(key, (data) => {
            resolve(data[key] || null);
          });
          return;
        }
      }
      try {
        const val = localStorage.getItem(key);
        resolve(val ? JSON.parse(val) : null);
      } catch (e) {
        resolve(null);
      }
    });
  },
  set: (key, val) => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const area = chrome.storage.sync || chrome.storage.local;
        if (area) {
          area.set({ [key]: val }, () => {
            resolve();
          });
          return;
        }
      }
      try {
        localStorage.setItem(key, JSON.stringify(val));
        resolve();
      } catch (e) {
        resolve();
      }
    });
  }
};

// plan-exempt — remove dead localOnlyStorage

// Default Settings
// plan-exempt — clean minimal default settings
export const defaultSettings = {
  frontmatter: false,
  rawMode: false,
  includeImages: true,
  includeLinks: true,
  obsidianMode: false,
  headingStyle: 'atx',
  bulletStyle: '-',
  codeBlockStyle: 'fenced'
};

// Mutable extraction state shared across popup modules (extract.js, tabs.js,
// html-clone.js, project.js). Kept here rather than duplicated per-module.
export const appState = {
  extractedData: null,
  currentMarkdown: '',
  currentHtml: '',
  currentPackage: null,
  activePreviewTab: 'markdown',
  activeTabId: null,
  activeFrameId: 0
};

// Setting Inputs
const checkFrontmatter = document.getElementById('setting-frontmatter');
const checkImages = document.getElementById('setting-images');
const checkLinks = document.getElementById('setting-links');
const checkObsidian = document.getElementById('setting-obsidian');
// plan-exempt — declare checkRaw to prevent ReferenceError on popup initialization
const checkRaw = document.getElementById('setting-raw');
/**
 * Loads settings from safe storage
 */
// plan-exempt — store currentSettings in appState
export function loadSettings() {
  return safeStorage.get('settings').then((settings) => {
    const resolved = settings ? { ...defaultSettings, ...settings } : defaultSettings;
    appState.currentSettings = resolved;
    return resolved;
  });
}

/**
 * Saves UI checkbox states to settings storage
 */
export function saveSettings() {
  const settings = {
    frontmatter: checkFrontmatter ? checkFrontmatter.checked : false,
    rawMode: checkRaw ? checkRaw.checked : false,
    includeImages: checkImages ? checkImages.checked : true,
    includeLinks: checkLinks ? checkLinks.checked : true,
    obsidianMode: checkObsidian ? checkObsidian.checked : false,
    headingStyle: 'atx',
    bulletStyle: '-',
    codeBlockStyle: 'fenced'
  };

  return safeStorage.set('settings', settings).then(() => {
    appState.currentSettings = settings;
    return settings;
  });
}
/**
 * Syncs UI checkbox states with settings object
 */
export function updateSettingsUI(settings) {
  if (checkFrontmatter) checkFrontmatter.checked = settings.frontmatter;
  if (checkRaw) checkRaw.checked = settings.rawMode || false;
  if (checkImages) checkImages.checked = settings.includeImages;
  if (checkLinks) checkLinks.checked = settings.includeLinks;
  if (checkObsidian) checkObsidian.checked = settings.obsidianMode;
}

/**
 * Wires settings checkbox change listeners (save + re-convert callback) and the
 * settings pane open/close controls.
 */
export function initSettingsUI(onSettingsSaved) {
  const btnSettings = document.getElementById('btn-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const settingsPane = document.getElementById('settings-pane');

  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      if (settingsPane) settingsPane.classList.remove('hidden');
    });
  }

  if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
      if (settingsPane) settingsPane.classList.add('hidden');
    });
  }

// plan-exempt — save settings on checkbox and subfolder changes
  [checkFrontmatter, checkImages, checkLinks, checkObsidian].forEach(checkbox => {
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        saveSettings().then((newSettings) => {
          if (onSettingsSaved) onSettingsSaved(newSettings);
        });
      });
    }
  });


}
