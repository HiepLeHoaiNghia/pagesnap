/**
 * Web2MD Popup entry point (ES module).
 * Module scripts execute after the DOM has finished parsing, so no
 * DOMContentLoaded wrapper is needed here.
 */
import { appState, loadSettings, updateSettingsUI, notifyTabMockingState, initSettingsUI } from './state.js';
import { initFeatureGates } from './feature-gate.js';
import { initTabs, updateFooterActionsVisibility } from './tabs.js';
import { initModeToggles } from './mode-toggles.js';
import { initExtract, processAndDisplayMarkdown } from './extract.js';
import { initApiMocks } from './api-mocks.js';
import { initHtmlClone } from './html-clone.js';
import { initResize } from './resize.js';
// project.js has no init: it is wired lazily by extract.js (renderProjectBanner)

initFeatureGates();

// Initial Load: load settings
loadSettings().then((settings) => {
  updateSettingsUI(settings);
  updateFooterActionsVisibility();
  notifyTabMockingState(settings.preserveJs);
});

initSettingsUI((newSettings) => {
  if (appState.extractedData) {
    processAndDisplayMarkdown(appState.extractedData, newSettings);
  }
});

initTabs();
initModeToggles();
initExtract();
initApiMocks();
initHtmlClone();
initResize();
