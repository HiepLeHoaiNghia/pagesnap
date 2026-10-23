// plan-exempt — split developer features into pagereplica-extension approved by user
/**
 * Web2MD Popup entry point (ES module).
 */
import { appState, loadSettings, updateSettingsUI, initSettingsUI } from './state.js';
import { initFeatureGates } from './feature-gate.js';
import { initTabs, updateFooterActionsVisibility } from './tabs.js';
import { initModeToggles } from './mode-toggles.js';
import { initExtract, processAndDisplayMarkdown } from './extract.js';
import { initHtmlClone } from './html-clone.js';
import { initResize } from './resize.js';

initFeatureGates();

// Initial Load: load settings
loadSettings().then((settings) => {
  updateSettingsUI(settings);
  updateFooterActionsVisibility();
});

initSettingsUI((newSettings) => {
  if (appState.extractedData) {
    processAndDisplayMarkdown(appState.extractedData, newSettings);
  }
});

initTabs();
initModeToggles();
initExtract();
initHtmlClone();
initResize();
