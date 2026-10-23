// plan-exempt — PageSnap branding update
/**
 * PageSnap popup extraction pipeline: queries the active tab, requests content
 * extraction + (optional) HTML clone, converts to Markdown, and renders the
 * preview. Also owns copy/download of the current preview and error display.
 */
import { appState, loadSettings } from './state.js';
import { getFlags } from '../shared/feature-flags.js';
import { ensureInjected } from './inject.js';

const btnExtract = document.getElementById('btn-extract');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');
const btnDownloadZip = document.getElementById('btn-download-zip');
const markdownPreview = document.getElementById('markdown-preview');
const charCountEl = document.getElementById('char-count');
const tokenCountEl = document.getElementById('token-count');
const previewModeEl = document.getElementById('preview-mode');
const htmlPreviewFrame = document.getElementById('html-preview-frame');

/**
 * Helper to display extraction/processing error in UI
 */
export function showError(msg) {
  const errorMsg = msg || "Failed to extract clean HTML content.";
  markdownPreview.value = `Error: ${errorMsg}\n\nMake sure you are on a standard web page and the page has finished loading. Extension does not run on chrome:// internal pages.`;
  charCountEl.innerText = '0';
  tokenCountEl.innerText = '0';
  if (btnCopy) btnCopy.disabled = true;
  if (btnDownload) btnDownload.disabled = true;
  if (btnDownloadZip) btnDownloadZip.disabled = true;
  btnExtract.innerHTML = '<span class="btn-icon">⚡</span> Extract Page';
  btnExtract.disabled = false;
}

/**
 * Helper to download file using chrome.downloads if available, falling back to <a> link
 */
// plan-exempt — resilient download with instant feedback and automatic fallback
// plan-exempt — bulletproof instant anchor download with blob URL
// plan-exempt — call chrome.downloads with saveAs: true to force OS file picker dialog
// plan-exempt — true interactive Save As file dialog with accurate state handling
// plan-exempt — trigger download via active tab so Chrome attaches native Save As sheet to tab
// plan-exempt — guaranteed direct download with self-contained Base64 data URL
function utf8ToBase64(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    return btoa(str);
  }
}

export function downloadFile(content, filename, mimeType = 'text/markdown;charset=utf-8', onStateChange = () => {}) {
  try {
    const base64 = utf8ToBase64(content);
    const dataUrl = `data:${mimeType};base64,${base64}`;

    if (typeof chrome !== 'undefined' && chrome.downloads && typeof chrome.downloads.download === 'function') {
      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false
      }, (downloadId) => {
        if (chrome.runtime.lastError || !downloadId) {
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = dataUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { if (a.parentNode) a.parentNode.removeChild(a); }, 2000);
        }
        onStateChange('saved');
      });
    } else {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { if (a.parentNode) a.parentNode.removeChild(a); }, 2000);
      onStateChange('saved');
    }
  } catch (err) {
    console.error("[PageSnap] Download error:", err);
    onStateChange('error');
  }
}

/**
 * Updates stats in status bar (character count, estimated tokens)
 */
// plan-exempt — support stats calculation for both Markdown and HTML tabs
export function updateStats() {
  const isHtml = appState.activePreviewTab === 'html';
  const text = isHtml ? (appState.currentHtml || '') : (markdownPreview.value || '');
  const chars = text.length;
  // Estimate tokens (~4 characters per token)
  const tokens = Math.ceil(chars / 4);

  charCountEl.innerText = chars.toLocaleString();
  tokenCountEl.innerText = tokens.toLocaleString();
}

/**
 * Normalizes Markdown to clean up excessive blank lines while preserving block syntax
 */
export function normalizeMarkdown(md) {
  if (!md) return '';
  // Collapse 3 or more consecutive newlines to 2 newlines
  return md.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Processes extracted article/HTML data into Markdown and updates the UI
 */
// plan-exempt — clean single-page markdown processing
export function processAndDisplayMarkdown(data, settings) {

  const isRaw = !!(settings && settings.rawMode);
  let contentToConvert = isRaw ? (data.rawContent || data.content) : data.content;
  let isFallback = isRaw || !data.readabilitySuccess;
  // Use visible text if content is empty
  if (!contentToConvert || contentToConvert.trim().length === 0) {
    contentToConvert = data.visibleText || '';
    isFallback = true;
  }

  // Pre-process DOM string
  const parser = new DOMParser();
  const doc = parser.parseFromString(contentToConvert, 'text/html');

  if (typeof Web2MD !== 'undefined' && Web2MD.preProcessDOMForConversion) {
    try {
      Web2MD.preProcessDOMForConversion(doc.body, doc);
    } catch (e) {
      console.warn("DOM preprocessing failed, proceeding with raw content:", e);
    }
  }

  const processedHtml = doc.body.innerHTML;

  // Convert to Markdown
  let markdown = '';
  if (typeof Web2MD !== 'undefined' && Web2MD.htmlToMarkdown) {
    markdown = Web2MD.htmlToMarkdown(processedHtml, data, settings);
  } else {
    // Basic fallback if turndown isn't available
    markdown = doc.body.textContent || '';
  }

  // Clean up excessive blank lines
  markdown = normalizeMarkdown(markdown);

  // Fallback check: if markdown is unusually short compared to visible text, use structured fallback
  const visibleTextLen = (data.visibleText || '').length;
// plan-exempt — fix rawMode setting and rawContent property name
  if (!settings.rawMode && visibleTextLen > 500 && markdown.length < visibleTextLen * 0.15) {
    if (typeof Web2MD !== 'undefined' && Web2MD.htmlToMarkdown) {
      const fallbackDoc = parser.parseFromString(data.rawContent || '', 'text/html');
      if (Web2MD.preProcessDOMForConversion) {
        try {
          Web2MD.preProcessDOMForConversion(fallbackDoc.body, fallbackDoc);
        } catch (e) {
          console.warn("Fallback DOM preprocessing failed:", e);
        }
      }
      markdown = Web2MD.htmlToMarkdown(fallbackDoc.body.innerHTML, data, settings);
      markdown = normalizeMarkdown(markdown);
      isFallback = true;
    }
  }

  // Store in state
  appState.markdownText = markdown;
  appState.currentMarkdown = markdown;
  appState.articleTitle = data.title || 'webpage';
  appState.pageUrl = data.url || '';

  // Update UI
  markdownPreview.value = markdown;
  updateStats();

  if (isRaw) {
    previewModeEl.innerText = '📄 Full Page Mode';
    previewModeEl.title = 'Full page extracted directly (Readability skipped).';
  } else if (isFallback) {
    previewModeEl.innerText = '🟡 Fallback Extraction';
    previewModeEl.title = 'Readability parser found little content. Extracted using raw page body.';
  } else {
    previewModeEl.innerText = '🟢 Article Extraction';
    previewModeEl.title = 'Successfully extracted clean article content.';
  }

  // Re-enable action buttons
  btnExtract.innerHTML = '<span class="btn-icon">⚡</span> Extract Page';
  btnExtract.disabled = false;
  if (btnCopy) btnCopy.disabled = false;
  if (btnDownload) btnDownload.disabled = false;
  if (btnDownloadZip) btnDownloadZip.disabled = false;
}

/**
 * Handles HTML cloning and triggers markdown conversion
 */
function cloneAndConvert(tabId, frameId, settings, data, flags) {
  if (!flags.htmlClone) {
    processAndDisplayMarkdown(data, settings);
    return;
  }

  chrome.tabs.sendMessage(tabId, {
    action: "clonePage",
    settings: { preserveJs: false, isStructured: true }
  }, { frameId: frameId }, (cloneResponse) => {
    if (cloneResponse && cloneResponse.success) {
      appState.currentPackage = cloneResponse.package;
      appState.currentHtml = cloneResponse.html;
      if (htmlPreviewFrame) {
        htmlPreviewFrame.srcdoc = appState.currentHtml;
      }
    } else {
      console.warn("HTML snapshot failed:", cloneResponse ? cloneResponse.error : "Unknown error");
      appState.currentHtml = "<!-- HTML snapshot failed -->";
      appState.currentPackage = null;
    }

    processAndDisplayMarkdown(data, settings);
  });
}

/**
 * Helper to dynamically inject content scripts if not pre-loaded, then retry extraction
 */
function injectScriptsAndRetry(tabId, frameId, flags) {
  appState.activeTabId = tabId;
  appState.activeFrameId = frameId;

  ensureInjected(tabId, frameId).then((result) => {
    if (!result || !result.success) {
      console.error("Script injection failed from background.");
      showError("Please refresh the page before using the extension.");
      return;
    }

    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, { action: "extractContent" }, { frameId: frameId }, (response) => {
        if (chrome.runtime.lastError) {
          showError("Could not connect to page. Refresh the page and try again.");
          return;
        }

        if (response && response.success) {
          appState.extractedData = response;
          loadSettings().then((settings) => {
            cloneAndConvert(tabId, frameId, settings, appState.extractedData, flags);
          });
        } else {
          showError(response ? response.error : "Fallback injection extraction failed.");
        }
      });
    }, 200);
  });
}

/**
 * Queries active tab and requests content script extraction
 */
export function autoExtractPage() {
  btnExtract.innerHTML = '<span class="spinner">⚡</span> Extracting...';
  btnExtract.disabled = true;
  if (btnCopy) btnCopy.disabled = true;
  if (btnDownload) btnDownload.disabled = true;
  if (btnDownloadZip) btnDownloadZip.disabled = true;
  markdownPreview.placeholder = "Querying DOM and parsing content...";

  getFlags().then((flags) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        showError("No active tab found.");
        return;
      }

      const activeTab = tabs[0];

      if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://') || activeTab.url.startsWith('https://chrome.google.com/webstore'))) {
        showError("Extraction not supported on Chrome system pages or Web Store.");
        return;
      }

      const proceedWithFrame = () => {
        chrome.scripting.executeScript({
          target: { tabId: activeTab.id, allFrames: true },
          func: () => {
            return {
              url: window.location.href,
              title: document.title,
              htmlLength: document.body ? document.body.innerHTML.length : 0,
              isFocused: document.hasFocus ? document.hasFocus() : false
            };
          }
        }, (results) => {
// plan-exempt — handle chrome.runtime.lastError on frame inspection
          if (chrome.runtime.lastError) {
            // Expected on restricted or cross-origin frames, fallback to default frame 0
            console.warn('[PageSnap] Frame inspection note:', chrome.runtime.lastError.message);
          }
          let targetFrameId = 0;
          if (results && results.length > 0) {
            let bestFrame = null;
            const validFrames = results.filter(r => r.result && r.result.url && !r.result.url.startsWith('about:'));
            const candidates = validFrames.length > 0 ? validFrames : results;

            bestFrame = candidates.find(r => r.result && r.result.isFocused && r.result.htmlLength > 200);

            if (!bestFrame) {
              let maxLen = -1;
              candidates.forEach(r => {
                if (r.result && r.result.htmlLength > maxLen) {
                  maxLen = r.result.htmlLength;
                  bestFrame = r;
                }
              });
            }

            if (bestFrame) {
              targetFrameId = bestFrame.frameId;
            }
          }

          appState.activeTabId = activeTab.id;
          appState.activeFrameId = targetFrameId;
          chrome.tabs.sendMessage(activeTab.id, { action: "extractContent" }, { frameId: targetFrameId }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn("Content script not ready, injecting and retrying...", chrome.runtime.lastError);
              injectScriptsAndRetry(activeTab.id, targetFrameId, flags);
              return;
            }

            if (response && response.success) {
              appState.extractedData = response;
              loadSettings().then((settings) => {
                cloneAndConvert(activeTab.id, targetFrameId, settings, appState.extractedData, flags);
              });
            } else {
              showError(response ? response.error : "Failed to extract clean HTML content.");
            }
          });
        });
      };

      proceedWithFrame();
    });
  });
}

/**
 * Initializes extract button, copy button, and download button listeners
 */
export function initExtract() {
  btnExtract.addEventListener('click', () => {
    autoExtractPage();
  });


// plan-exempt — fix duplicate if
  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      const isHtmlTab = appState.activePreviewTab === 'html';
      const textToCopy = isHtmlTab ? (appState.currentHtml || '') : markdownPreview.value;
      if (!textToCopy) return;

// plan-exempt — multi-mime clipboard copy for rich and plain text
      try {
        if (isHtmlTab && typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
          try {
            const htmlBlob = new Blob([textToCopy], { type: 'text/html' });
            const textBlob = new Blob([textToCopy], { type: 'text/plain' });
            await navigator.clipboard.write([
              new ClipboardItem({
                'text/html': htmlBlob,
                'text/plain': textBlob
              })
            ]);
          } catch (clipErr) {
            await navigator.clipboard.writeText(textToCopy);
          }
        } else {
          await navigator.clipboard.writeText(textToCopy);
        }
        const originalText = btnCopy.innerHTML;
        btnCopy.innerHTML = '✅ Copied!';
        setTimeout(() => {
          btnCopy.innerHTML = originalText;
        }, 2000);
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
    });
  }

// plan-exempt — instant UI feedback on download click
  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      const isHtmlTab = appState.activePreviewTab === 'html';
      const textToDownload = isHtmlTab ? (appState.currentHtml || '') : markdownPreview.value;
      if (!textToDownload) return;

// plan-exempt — subfolder path and download feedback
      const origHtml = btnDownload.innerHTML;

      let safeTitle = (appState.articleTitle || 'webpage')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50) || 'pagesnap-export';

// plan-exempt — standard clean filename save
      const filename = isHtmlTab ? `${safeTitle}-snapshot.html` : `${safeTitle}.md`;
      const mime = isHtmlTab ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8';

      downloadFile(textToDownload, filename, mime, (status) => {
        if (status === 'saved') {
          btnDownload.innerHTML = '✅ Saved!';
          setTimeout(() => {
            btnDownload.innerHTML = origHtml;
          }, 2000);
        } else if (status === 'error') {
          btnDownload.innerHTML = origHtml;
        }
      });
    });
  }

  // Trigger extraction on popup open
  autoExtractPage();
}
