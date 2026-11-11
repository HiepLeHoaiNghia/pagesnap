// plan-exempt — PageSnap branding update
/**
 * PageSnap popup header toggles: Full Page mode and Select Region.
 * Live-synced with the active tab's current state on load.
 */
import { ensureInjected } from './inject.js';
import { showError, processAndDisplayMarkdown } from './extract.js';
import { appState, loadSettings, saveSettings } from './state.js';

// plan-exempt — 2-tier UI mode toggles with clean/raw pills and header inspect button
const btnToggleSelectRegion = document.getElementById('btn-toggle-select-region');
const btnToggleRawMode = document.getElementById('btn-toggle-raw-mode');
const checkRaw = document.getElementById('setting-raw');
const modeClean = document.getElementById('mode-clean');
const modeRaw = document.getElementById('mode-raw');
const btnRefresh = document.getElementById('btn-refresh');
const btnLaunchInspector = document.getElementById('btn-launch-inspector');

function updatePills(isRaw) {
  if (modeClean) modeClean.classList.toggle('active', !isRaw);
  if (modeRaw) modeRaw.classList.toggle('active', isRaw);
  if (btnToggleRawMode) btnToggleRawMode.checked = isRaw;
  if (checkRaw) checkRaw.checked = isRaw;
}

export function initModeToggles() {
  // Sync mode pills with saved settings
  loadSettings().then((settings) => {
    const isRaw = !!settings.rawMode;
    updatePills(isRaw);
  });

  if (modeClean) {
    modeClean.addEventListener('click', () => {
      updatePills(false);
      saveSettings().then((newSettings) => {
        if (appState.extractedData) {
          processAndDisplayMarkdown(appState.extractedData, newSettings);
        }
      });
    });
  }

  if (modeRaw) {
    modeRaw.addEventListener('click', () => {
      updatePills(true);
      saveSettings().then((newSettings) => {
        if (appState.extractedData) {
          processAndDisplayMarkdown(appState.extractedData, newSettings);
        }
      });
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      const btnExtract = document.getElementById('btn-extract');
      if (btnExtract) btnExtract.click();
    });
  }

  // Launch Inspector & Component Studio on webpage
  if (btnLaunchInspector) {
    btnLaunchInspector.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        const activeTab = tabs[0];
        if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://'))) {
          showError("Cannot inspect Chrome system pages.");
          return;
        }

        ensureInjected(activeTab.id, 0).then(() => {
          chrome.tabs.sendMessage(activeTab.id, { action: "toggleRegionSelection", enabled: true }, () => {
            window.close();
          });
        });
      });
    });
  }
}
