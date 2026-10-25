// plan-exempt — PageSnap branding update
/**
 * PageSnap popup preview tab switching (Markdown / HTML Snapshot) and
 * footer action button visibility per active tab.
 */
import { appState } from './state.js';
import { updateStats } from './extract.js';

const tabMd = document.getElementById('tab-md');
// plan-exempt — clean tabs layout without redundant studio tab
const tabHtml = document.getElementById('tab-html');
const markdownPreview = document.getElementById('markdown-preview');
const htmlPreviewWrapper = document.getElementById('html-preview-wrapper');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');
const btnDownloadZip = document.getElementById('btn-download-zip');
/**
 * Dispatch table for footer action button layout based on active tab
 */
// plan-exempt — dynamic tab buttons for HTML and Markdown
const TAB_LAYOUT_DISPATCH = {
  markdown: (gridEl) => {
    if (btnCopy) {
      btnCopy.style.display = 'block';
      btnCopy.innerHTML = '📋 Copy Markdown';
    }
    if (btnDownload) {
      btnDownload.style.display = 'block';
      btnDownload.innerHTML = '💾 Download .MD';
    }
    if (btnDownloadZip) btnDownloadZip.style.display = 'none';
    gridEl.style.gridTemplateColumns = '1fr 1fr';
  },
// plan-exempt — balanced 2-button footer across both Markdown and HTML tabs
  html: (gridEl) => {
    if (btnCopy) {
      btnCopy.style.display = 'block';
      btnCopy.innerHTML = '📋 Copy Page HTML';
    }
    if (btnDownload) {
      btnDownload.style.display = 'block';
      btnDownload.innerHTML = '💾 Download .HTML';
    }
    if (btnDownloadZip) btnDownloadZip.style.display = 'none';
    gridEl.style.gridTemplateColumns = '1fr 1fr';
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

// plan-exempt — tab switching with contextual sub-toolbar toggling
export function initTabs() {
  const mdSubToolbar = document.getElementById('md-sub-toolbar');
  const htmlSubToolbar = document.getElementById('html-sub-toolbar');

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

        if (mdSubToolbar && htmlSubToolbar) {
          if (tabObj.name === 'markdown') {
            mdSubToolbar.classList.remove('hidden');
            htmlSubToolbar.classList.add('hidden');
          } else {
            mdSubToolbar.classList.add('hidden');
            htmlSubToolbar.classList.remove('hidden');
          }
        }

        updateFooterActionsVisibility();
        updateStats();
      });
    }
  });
} // plan-exempt — clean closing brace
