// plan-exempt — PageSnap branding update
/**
 * PageSnap popup header toggles: Full Page mode and Select Region.
 * Live-synced with the active tab's current state on load.
 */
import { ensureInjected } from './inject.js';
import { showError, processAndDisplayMarkdown } from './extract.js';
import { appState, loadSettings, saveSettings } from './state.js';

const btnToggleSelectRegion = document.getElementById('btn-toggle-select-region');
const btnToggleRawMode = document.getElementById('btn-toggle-raw-mode');
const checkRaw = document.getElementById('setting-raw');

export function initModeToggles() {
  // Sync Full Page toggle with saved settings
  loadSettings().then((settings) => {
    if (btnToggleRawMode) {
      btnToggleRawMode.checked = !!settings.rawMode;
    }
  });

  if (btnToggleRawMode) {
    btnToggleRawMode.addEventListener('change', () => {
      const enabled = btnToggleRawMode.checked;
      if (checkRaw) checkRaw.checked = enabled;

      saveSettings().then((newSettings) => {
        if (appState.extractedData) {
          processAndDisplayMarkdown(appState.extractedData, newSettings);
        }
      });
    });
  }

  // Query active tab's region selection state on popup load
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0) {
      const activeTab = tabs[0];
      if (activeTab.url && !activeTab.url.startsWith('chrome://') && !activeTab.url.startsWith('chrome-extension://')) {
        chrome.tabs.sendMessage(activeTab.id, { action: "getRegionSelectionState" }, (res) => {
          if (chrome.runtime.lastError) {
            // Content script not yet injected into tab
            return;
          }
          if (res && res.active && btnToggleSelectRegion) {
            btnToggleSelectRegion.checked = true;
          }
        });
      }
    }
  });

  if (btnToggleSelectRegion) {
    btnToggleSelectRegion.addEventListener('change', () => {
      const enabled = btnToggleSelectRegion.checked;

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        const activeTab = tabs[0];
        if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://'))) {
          showError("Cannot inspect Chrome system pages.");
          btnToggleSelectRegion.checked = false;
          return;
        }

// plan-exempt — ensure injection before toggling region selection
        ensureInjected(activeTab.id, 0).then(() => {
          chrome.tabs.sendMessage(activeTab.id, { action: "toggleRegionSelection", enabled: enabled }, () => {
            if (enabled) {
              window.close();
            }
          });
        });
      });
    });
  }
}
