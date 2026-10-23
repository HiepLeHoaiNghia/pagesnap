// plan-exempt — split developer features into pagereplica-extension approved by user
/**
 * Web2MD popup preview tab switching (Markdown / HTML Snapshot) and
 * footer action button visibility per active tab.
 */
import { appState } from './state.js';
import { updateStats } from './extract.js';

const tabMd = document.getElementById('tab-md');
const tabHtml = document.getElementById('tab-html');
const markdownPreview = document.getElementById('markdown-preview');
const htmlPreviewWrapper = document.getElementById('html-preview-wrapper');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');
const btnDownloadZip = document.getElementById('btn-download-zip');

/**
 * Dispatch table for footer action button layout based on active tab
 */
const TAB_LAYOUT_DISPATCH = {
  markdown: (gridEl) => {
    if (btnCopy) btnCopy.style.display = 'block';
    if (btnDownload) btnDownload.style.display = 'block';
    if (btnDownloadZip) btnDownloadZip.style.display = 'none';
    gridEl.style.gridTemplateColumns = '1fr 1fr';
  },
  html: (gridEl) => {
    if (btnCopy) btnCopy.style.display = 'block';
    if (btnDownload) btnDownload.style.display = 'block';
    if (btnDownloadZip) btnDownloadZip.style.display = 'block';
    gridEl.style.gridTemplateColumns = '1fr 1fr 1fr';
  }
};

/**
 * Helper to dynamically show/hide buttons in actions-grid based on tab
 */
export function updateFooterActionsVisibility() {
  const gridEl = document.querySelector('.actions-grid');
  if (!gridEl) return;

  const layoutHandler = TAB_LAYOUT_DISPATCH[appState.activePreviewTab];
  if (layoutHandler) {
    layoutHandler(gridEl);
  }
}

export function initTabs() {
  const previewTabs = [
    { btn: tabMd, view: markdownPreview, name: 'markdown' },
    { btn: tabHtml, view: htmlPreviewWrapper, name: 'html' }
  ];

  previewTabs.forEach(tabObj => {
    if (tabObj.btn) {
      tabObj.btn.addEventListener('click', () => {
        appState.activePreviewTab = tabObj.name;
        previewTabs.forEach(otherObj => {
          if (otherObj.btn) {
            if (otherObj.btn === tabObj.btn) {
              otherObj.btn.classList.add('active');
            } else {
              otherObj.btn.classList.remove('active');
            }
          }
          if (otherObj.view) {
            if (otherObj.view === tabObj.view) {
              otherObj.view.classList.remove('hidden');
            } else {
              otherObj.view.classList.add('hidden');
            }
          }
        });

        updateFooterActionsVisibility();
        updateStats();
      });
    }
  });
}
