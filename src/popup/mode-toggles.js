// plan-exempt — split developer features into pagereplica-extension approved by user
/**
 * Web2MD popup header toggles: Select Region.
 * Live-synced with the active tab's current state on load.
 */
import { ensureInjected } from './inject.js';
import { showError } from './extract.js';

const btnToggleSelectRegion = document.getElementById('btn-toggle-select-region');

export function initModeToggles() {
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

        chrome.tabs.sendMessage(activeTab.id, { action: "toggleRegionSelection", enabled: enabled }, (response) => {
          if (chrome.runtime.lastError) {
            ensureInjected(activeTab.id, 0, null).then((result) => {
              if (!result || !result.success) {
                console.error("Script injection failed");
                showError("Please refresh the page before selecting region.");
                btnToggleSelectRegion.checked = false;
                return;
              }
              setTimeout(() => {
                chrome.tabs.sendMessage(activeTab.id, { action: "toggleRegionSelection", enabled: enabled });
                if (enabled) {
                  window.close();
                }
              }, 200);
            });
          } else {
            if (enabled) {
              window.close();
            }
          }
        });
      });
    });
  }
}
