/**
 * Web2MD popup extraction pipeline: queries the active tab, requests content
 * extraction + (optional) HTML clone, converts to Markdown, and renders the
 * preview. Also owns copy/download of the current preview and error display.
 */
import { appState, loadSettings } from './state.js';
import { getFlags } from '../shared/feature-flags.js';
import { ensureInjected } from './inject.js';
import { renderProjectBanner, hideProjectBanner } from './project.js';

const btnExtract = document.getElementById('btn-extract');
const btnCopy = document.getElementById('btn-copy');
const btnDownload = document.getElementById('btn-download');
const btnDownloadZip = document.getElementById('btn-download-zip');
const btnDeploy = document.getElementById('btn-deploy');
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
  if (btnDeploy) btnDeploy.disabled = true;
  hideProjectBanner();
  btnExtract.innerHTML = '<span class="btn-icon">⚡</span> Extract Page';
  btnExtract.disabled = false;
}

/**
 * Helper to download file using chrome.downloads if available, falling back to <a> link
 */
export function downloadFile(content, filename, mimeType = 'text/markdown;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });

  if (typeof chrome !== 'undefined' && chrome.downloads) {
    const reader = new FileReader();
    reader.onload = function(e) {
      chrome.downloads.download({
        url: e.target.result,
        filename: filename,
        saveAs: true
      });
    };
    reader.readAsDataURL(blob);
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 10000);
  }
}

export function updateStats() {
  let text = '';
  if (appState.activePreviewTab === 'markdown') {
    text = appState.currentMarkdown;
  } else if (appState.activePreviewTab === 'html') {
    text = appState.currentHtml;
  }
  const charCount = text ? text.length : 0;
  const estTokens = Math.ceil(charCount / 4);
  charCountEl.innerText = charCount.toLocaleString();
  tokenCountEl.innerText = estTokens.toLocaleString();
}

function finalizeAndDisplayMarkdown(markdown, data, settings) {
  try {
    // Fallback: if Turndown produced very little content compared to visible page text,
    // use the pre-extracted visible text from content script
    if (data.visibleText && data.visibleTextLength > 500) {
      const contentOnly = markdown.replace(/^---[\s\S]*?---\s*/, '').trim();
      if (contentOnly.length < data.visibleTextLength * 0.15 && data.visibleText.length > contentOnly.length) {
        console.warn('[Web2MD Popup] Using visible text fallback (' + contentOnly.length + ' vs ' + data.visibleTextLength + ' visible chars)');
        if (settings.frontmatter) {
          const fm = [
            '---',
            `title: "${data.title.replace(/"/g, '\\"')}"`,
            `url: ${data.url}`,
            `date: ${new Date().toISOString().split('T')[0]}`,
            data.byline ? `author: "${data.byline.replace(/"/g, '\\"')}"` : null,
            data.siteName ? `site: "${data.siteName.replace(/"/g, '\\"')}"` : null,
            '---',
            '',
            ''
          ].filter(val => val !== null).join('\n');
          markdown = fm + data.visibleText;
        } else {
          markdown = data.visibleText;
        }
      }
    }

    appState.currentMarkdown = markdown;
    markdownPreview.value = appState.currentMarkdown;

    // Update stats counts using current tab state
    updateStats();

    const isRawMode = settings.rawMode;
    previewModeEl.innerText = isRawMode ? "Full Page Mode" : (data.readabilitySuccess ? "Article Mode" : "Raw Fallback");
    previewModeEl.style.backgroundColor = isRawMode
      ? "rgba(139, 92, 246, 0.15)"
      : (data.readabilitySuccess ? "var(--bg-tertiary)" : "rgba(239, 68, 68, 0.1)");
    previewModeEl.style.color = isRawMode
      ? "#a78bfa"
      : (data.readabilitySuccess ? "var(--accent-blue)" : "#ef4444");

    // Enable action buttons
    if (btnCopy) btnCopy.disabled = false;
    if (btnDownload) btnDownload.disabled = false;
    if (btnDownloadZip) btnDownloadZip.disabled = false;
    if (btnDeploy) btnDeploy.disabled = false;

    // Manage VFS Project Banner
    renderProjectBanner(data);

    // Re-enable extract button
    btnExtract.innerHTML = '<span class="btn-icon">⚡</span> Extract Page';
    btnExtract.disabled = false;
  } catch (e) {
    console.error(e);
    showError(`Display/Conversion error: ${e.message}`);

    // Make sure extract button is re-enabled anyway
    btnExtract.innerHTML = '<span class="btn-icon">⚡</span> Extract Page';
    btnExtract.disabled = false;
  }
}

/**
 * Converts clean HTML to Markdown and updates UI preview
 */
export function processAndDisplayMarkdown(data, settings) {
  const htmlToConvert = settings.rawMode ? (data.rawContent || data.content) : (data.content || data.rawContent);

  if (appState.activeTabId !== null) {
    chrome.tabs.sendMessage(appState.activeTabId, {
      action: "convertHtmlToMarkdown",
      html: htmlToConvert,
      metadata: data,
      settings: settings
    }, { frameId: appState.activeFrameId }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        console.warn("[Web2MD Popup] Failed to convert via content script, using local fallback:", chrome.runtime.lastError || response?.error);
        const localMarkdown = Web2MD.htmlToMarkdown(htmlToConvert, data, settings);
        finalizeAndDisplayMarkdown(localMarkdown, data, settings);
      } else {
        finalizeAndDisplayMarkdown(response.markdown, data, settings);
      }
    });
  } else {
    const localMarkdown = Web2MD.htmlToMarkdown(htmlToConvert, data, settings);
    finalizeAndDisplayMarkdown(localMarkdown, data, settings);
  }
}

/**
 * Requests HTML cloning (if htmlClone flag enabled) then converts to Markdown.
 */
function cloneAndConvert(tabId, frameId, settings, data, flags) {
  if (!flags.htmlClone) {
    appState.currentHtml = "";
    appState.currentPackage = null;
    processAndDisplayMarkdown(data, settings);
    return;
  }

  chrome.runtime.sendMessage({ action: "getApiCalls", tabId: tabId }, (apiCallsResponse) => {
    const apiCalls = (apiCallsResponse && apiCallsResponse.apiCalls) || [];
    chrome.tabs.sendMessage(tabId, {
      action: "clonePage",
      preserveJs: settings.preserveJs,
      apiCalls: apiCalls
    }, { frameId: frameId }, (cloneResponse) => {
      if (cloneResponse && cloneResponse.success) {
        appState.currentHtml = cloneResponse.html;
        appState.currentPackage = cloneResponse.package || null;
        if (htmlPreviewFrame) {
          if (settings.preserveJs) {
            htmlPreviewFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
          } else {
            htmlPreviewFrame.setAttribute('sandbox', 'allow-same-origin');
          }
          htmlPreviewFrame.srcdoc = appState.currentHtml;
        }
      } else {
        console.error("HTML cloning failed:", cloneResponse ? cloneResponse.error : "Unknown error");
        appState.currentHtml = "<!-- HTML cloning failed -->";
        appState.currentPackage = null;
      }

      processAndDisplayMarkdown(data, settings);
    });
  });
}

/**
 * Helper to dynamically inject content scripts if not pre-loaded, then retry extraction
 */
function injectScriptsAndRetry(tabId, frameId, flags) {
  appState.activeTabId = tabId;
  appState.activeFrameId = frameId;

  ensureInjected(tabId, frameId, flags.projectDetect ? { vfs: true } : null).then((result) => {
    if (!result || !result.success) {
      console.error("Script injection failed from background.");
      showError("Please refresh the page before using the extension.");
      return;
    }

    // Retry message sending after a small delay to ensure injection initialized
    setTimeout(() => {
      const proceed = (cachedProjectFiles) => {
        chrome.tabs.sendMessage(tabId, { action: "extractContent" }, { frameId: frameId }, (response) => {
          if (chrome.runtime.lastError) {
            showError("Could not connect to page. Refresh the page and try again.");
            return;
          }

          if (response && response.success) {
            appState.extractedData = response;
            if (cachedProjectFiles) {
              appState.extractedData.projectFiles = cachedProjectFiles;
            }

            loadSettings().then((settings) => {
              cloneAndConvert(tabId, frameId, settings, appState.extractedData, flags);
            });
          } else {
            showError(response ? response.error : "Fallback injection extraction failed.");
          }
        });
      };

      if (flags.projectDetect) {
        chrome.runtime.sendMessage({ action: "getProject", tabId: tabId }, (projResponse) => {
          proceed(projResponse && projResponse.hasProject ? projResponse.projectFiles : null);
        });
      } else {
        proceed(null);
      }
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
  if (btnDeploy) btnDeploy.disabled = true;
  markdownPreview.placeholder = "Querying DOM and parsing content...";

  getFlags().then((flags) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        showError("No active tab found.");
        return;
      }

      const activeTab = tabs[0];

      // Prevent running on restricted chrome pages
      if (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://') || activeTab.url.startsWith('https://chrome.google.com/webstore')) {
        showError("Extraction not supported on Chrome system pages or Web Store.");
        return;
      }

      const proceedWithFrame = (cachedProjectFiles) => {
        // Determine target frameId dynamically
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
          let targetFrameId = 0;
          if (results && results.length > 0) {
            let bestFrame = null;
            // Filter out internal about: urls if possible
            const validFrames = results.filter(r => r.result && r.result.url && !r.result.url.startsWith('about:'));
            const candidates = validFrames.length > 0 ? validFrames : results;

            // Try to find a focused frame with substantial content first
            bestFrame = candidates.find(r => r.result && r.result.isFocused && r.result.htmlLength > 200);

            // Otherwise, pick the frame with the maximum HTML length (most likely the main content frame)
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

          // Send extraction request to content.js in target frame
          appState.activeTabId = activeTab.id;
          appState.activeFrameId = targetFrameId;
          chrome.tabs.sendMessage(activeTab.id, { action: "extractContent" }, { frameId: targetFrameId }, (response) => {
            // Handle runtime error (e.g. content script not loaded yet)
            if (chrome.runtime.lastError) {
              console.warn("Content script not ready, injecting and retrying...", chrome.runtime.lastError);
              injectScriptsAndRetry(activeTab.id, targetFrameId, flags);
              return;
            }

            if (response && response.success) {
              appState.extractedData = response;
              if (cachedProjectFiles) {
                appState.extractedData.projectFiles = cachedProjectFiles;
              }

              loadSettings().then((settings) => {
                cloneAndConvert(activeTab.id, targetFrameId, settings, appState.extractedData, flags);
              });
            } else {
              showError(response ? response.error : "Failed to extract clean HTML content.");
            }
          });
        });
      };

      // Check if background service worker has cached VFS project files for this tab
      if (flags.projectDetect) {
        chrome.runtime.sendMessage({ action: "getProject", tabId: activeTab.id }, (projResponse) => {
          proceedWithFrame(projResponse && projResponse.hasProject ? projResponse.projectFiles : null);
        });
      } else {
        proceedWithFrame(null);
      }
    });
  });
}

export function initExtract() {
  if (btnExtract) {
    btnExtract.addEventListener('click', autoExtractPage);
  }

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const textToCopy = appState.activePreviewTab === 'markdown' ? appState.currentMarkdown : appState.currentHtml;
      if (!textToCopy) return;
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = btnCopy.innerText;
        btnCopy.innerText = 'Copied! ✓';
        btnCopy.classList.add('success-flash');
        setTimeout(() => {
          btnCopy.innerText = originalText;
          btnCopy.classList.remove('success-flash');
        }, 1500);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      if (!appState.extractedData) return;

      // Sanitize title for filename
      const sanitizedTitle = appState.extractedData.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50) || 'webpage';

      if (appState.activePreviewTab === 'markdown') {
        if (!appState.currentMarkdown) return;
        const filename = `${sanitizedTitle}.md`;
        downloadFile(appState.currentMarkdown, filename);
      } else {
        if (!appState.currentHtml) return;
        const filename = `${sanitizedTitle}.html`;
        downloadFile(appState.currentHtml, filename, 'text/html;charset=utf-8');
      }
    });
  }
}
