/**
 * Web2MD popup header toggles: Visual Edit, Inspect, Select Region.
 * Mutually exclusive; live-synced with the active tab's current state on load.
 */
import { ensureInjected } from './inject.js';
import { showError } from './extract.js';

const btnToggleEdit = document.getElementById('btn-toggle-edit');
const btnToggleInspect = document.getElementById('btn-toggle-inspect');
const btnToggleSelectRegion = document.getElementById('btn-toggle-select-region');

function disableOther(action, tabId) {
  chrome.tabs.sendMessage(tabId, { action, enabled: false }, () => {
    if (chrome.runtime.lastError) {}
  });
}

export function initModeToggles() {
  // Query active tab's edit mode, inspect mode, and region selection state on popup load
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0) {
      const activeTab = tabs[0];
      if (activeTab.url && !activeTab.url.startsWith('chrome://') && !activeTab.url.startsWith('chrome-extension://')) {
        chrome.tabs.sendMessage(activeTab.id, { action: "getVisualEditState" }, (response) => {
          if (!chrome.runtime.lastError && response && response.active !== undefined) {
            if (btnToggleEdit) {
              btnToggleEdit.checked = response.active;
            }
          }
        });
        chrome.tabs.sendMessage(activeTab.id, { action: "getInspectState" }, (response) => {
          if (!chrome.runtime.lastError && response && response.active !== undefined) {
            if (btnToggleInspect) {
              btnToggleInspect.checked = response.active;
            }
          }
        });
        chrome.tabs.sendMessage(activeTab.id, { action: "getRegionSelectionState" }, (response) => {
          if (!chrome.runtime.lastError && response && response.active !== undefined) {
            if (btnToggleSelectRegion) {
              btnToggleSelectRegion.checked = response.active;
            }
          }
        });
      }
    }
  });

  if (btnToggleEdit) {
    btnToggleEdit.addEventListener('change', () => {
      const enabled = btnToggleEdit.checked;
      // Mutual exclusion: disable inspect mode when visual edit is enabled
      if (enabled && btnToggleInspect && btnToggleInspect.checked) {
        btnToggleInspect.checked = false;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs.length > 0) disableOther("toggleInspect", tabs[0].id);
        });
      }
      // Mutual exclusion: disable region selection mode when visual edit is enabled
      if (enabled && btnToggleSelectRegion && btnToggleSelectRegion.checked) {
        btnToggleSelectRegion.checked = false;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs.length > 0) disableOther("toggleRegionSelection", tabs[0].id);
        });
      }
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        const activeTab = tabs[0];
        if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://'))) {
          showError("Cannot edit Chrome system pages.");
          btnToggleEdit.checked = false;
          return;
        }

        chrome.tabs.sendMessage(activeTab.id, { action: "toggleVisualEdit", enabled: enabled }, (response) => {
          if (chrome.runtime.lastError) {
            ensureInjected(activeTab.id, 0, null).then((result) => {
              if (!result || !result.success) {
                console.error("Script injection failed: ");
                showError("Please refresh the page before editing.");
                btnToggleEdit.checked = false;
                return;
              }
              setTimeout(() => {
                chrome.tabs.sendMessage(activeTab.id, { action: "toggleVisualEdit", enabled: enabled });
              }, 200);
            });
          }
        });
      });
    });
  }

  if (btnToggleInspect) {
    btnToggleInspect.addEventListener('change', () => {
      const enabled = btnToggleInspect.checked;
      // Mutual exclusion: disable visual edit when inspect mode is enabled
      if (enabled && btnToggleEdit && btnToggleEdit.checked) {
        btnToggleEdit.checked = false;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs.length > 0) disableOther("toggleVisualEdit", tabs[0].id);
        });
      }
      // Mutual exclusion: disable region selection mode when inspect mode is enabled
      if (enabled && btnToggleSelectRegion && btnToggleSelectRegion.checked) {
        btnToggleSelectRegion.checked = false;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs.length > 0) disableOther("toggleRegionSelection", tabs[0].id);
        });
      }
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        const activeTab = tabs[0];
        if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://'))) {
          showError("Cannot inspect Chrome system pages.");
          btnToggleInspect.checked = false;
          return;
        }

        chrome.tabs.sendMessage(activeTab.id, { action: "toggleInspect", enabled: enabled }, (response) => {
          if (chrome.runtime.lastError) {
            ensureInjected(activeTab.id, 0, { api: true, vfs: true, inspector: true }).then((result) => {
              if (!result || !result.success) {
                console.error("Script injection failed: ");
                showError("Please refresh the page before inspecting.");
                btnToggleInspect.checked = false;
                return;
              }
              setTimeout(() => {
                chrome.tabs.sendMessage(activeTab.id, { action: "toggleInspect", enabled: enabled });
              }, 200);
            });
          }
        });
      });
    });
  }

  if (btnToggleSelectRegion) {
    btnToggleSelectRegion.addEventListener('change', () => {
      const enabled = btnToggleSelectRegion.checked;

      // Mutual exclusion: disable visual edit and inspect when region selection is enabled
      if (enabled) {
        if (btnToggleEdit && btnToggleEdit.checked) {
          btnToggleEdit.checked = false;
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) disableOther("toggleVisualEdit", tabs[0].id);
          });
        }
        if (btnToggleInspect && btnToggleInspect.checked) {
          btnToggleInspect.checked = false;
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) disableOther("toggleInspect", tabs[0].id);
          });
        }
      }

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
                console.error("Script injection failed: ");
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
