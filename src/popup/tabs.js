/**
 * Web2MD popup preview tab switching (Markdown / HTML Clone / API Mocks) and
 * footer action button visibility per active tab.
 */
import { appState } from './state.js';
import { updateStats } from './extract.js';
import { showApiListView, fetchAndRenderApiCalls } from './api-mocks.js';

const tabMd = document.getElementById('tab-md');
const tabHtml = document.getElementById('tab-html');
const tabApi = document.getElementById('tab-api');
const markdownPreview = document.getElementById('markdown-preview');
const htmlPreviewWrapper = document.getElementById('html-preview-wrapper');
const apiPreviewWrapper = document.getElementById('api-preview-wrapper');
const apiSearchInput = document.getElementById('api-search');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');
const btnDownloadZip = document.getElementById('btn-download-zip');
const btnDeploy = document.getElementById('btn-deploy');

/**
 * Helper to dynamically show/hide buttons in actions-grid based on tab
 */
export function updateFooterActionsVisibility() {
  const gridEl = document.querySelector('.actions-grid');
  if (!gridEl) return;

  if (appState.activePreviewTab === 'markdown') {
    if (btnCopy) btnCopy.style.display = 'block';
    if (btnDownload) btnDownload.style.display = 'block';
    if (btnDownloadZip) btnDownloadZip.style.display = 'none';
    if (btnDeploy) btnDeploy.style.display = 'none';
    gridEl.style.gridTemplateColumns = '1fr 1fr';
  } else if (appState.activePreviewTab === 'html') {
    if (btnCopy) btnCopy.style.display = 'block';
    if (btnDownload) btnDownload.style.display = 'block';
    if (btnDownloadZip) btnDownloadZip.style.display = 'block';
    if (btnDeploy) btnDeploy.style.display = 'block';
    gridEl.style.gridTemplateColumns = '1fr 1fr';
  } else if (appState.activePreviewTab === 'api') {
    if (btnCopy) btnCopy.style.display = 'none';
    if (btnDownload) btnDownload.style.display = 'none';
    if (btnDownloadZip) btnDownloadZip.style.display = 'block';
    if (btnDeploy) btnDeploy.style.display = 'block';
    gridEl.style.gridTemplateColumns = '1fr 1fr';
  }
}

export function initTabs() {
  const previewTabs = [
    { btn: tabMd, view: markdownPreview, name: 'markdown' },
    { btn: tabHtml, view: htmlPreviewWrapper, name: 'html' },
    { btn: tabApi, view: apiPreviewWrapper, name: 'api' }
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

        // Hide/show buttons based on the active tab
        updateFooterActionsVisibility();

        if (tabObj.name === 'api') {
          showApiListView();
          fetchAndRenderApiCalls(apiSearchInput ? apiSearchInput.value : '');
        }

        updateStats();
      });
    }
  });
}
