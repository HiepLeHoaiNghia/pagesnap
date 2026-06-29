/**
 * Web2MD Popup Logic
 * Handles UI interactions, settings management, and conversion coordination.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const btnExtract = document.getElementById('btn-extract');
  const btnCopy = document.getElementById('btn-copy');
  const btnDownload = document.getElementById('btn-download');
  const btnSettings = document.getElementById('btn-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const settingsPane = document.getElementById('settings-pane');
  const markdownPreview = document.getElementById('markdown-preview');
  const charCountEl = document.getElementById('char-count');
  const tokenCountEl = document.getElementById('token-count');
  const previewModeEl = document.getElementById('preview-mode');
  
  // Tab elements
  const tabMd = document.getElementById('tab-md');
  const tabHtml = document.getElementById('tab-html');
  const tabApi = document.getElementById('tab-api');
  const htmlPreviewWrapper = document.getElementById('html-preview-wrapper');
  const htmlPreviewFrame = document.getElementById('html-preview-frame');
  const apiPreviewWrapper = document.getElementById('api-preview-wrapper');
  
  // API Manager Elements
  const apiListContainer = document.getElementById('api-list-container');
  const apiSearchInput = document.getElementById('api-search');
  const btnRefreshApi = document.getElementById('btn-refresh-api');
  const apiListView = document.getElementById('api-list-view');
  const apiEditorView = document.getElementById('api-editor-view');
  const btnEditorBack = document.getElementById('btn-editor-back');
  const editorUrl = document.getElementById('editor-url');
  const editorMethod = document.getElementById('editor-method');
  const editorStatus = document.getElementById('editor-status');
  const editorBody = document.getElementById('editor-body');
  const btnEditorFormat = document.getElementById('btn-editor-format');
  const btnEditorDelete = document.getElementById('btn-editor-delete');
  const btnEditorSave = document.getElementById('btn-editor-save');
  const btnEditorReset = document.getElementById('btn-editor-reset');
  const btnClearAllMocks = document.getElementById('btn-clear-all-mocks');
  
  // Zip and Deploy Elements
  const btnDownloadZip = document.getElementById('btn-download-zip');
  const btnDeploy = document.getElementById('btn-deploy');
  const checkNetlifyToken = document.getElementById('setting-netlify-token');
  
  // Project Banner Elements
  const projectBanner = document.getElementById('project-banner');
  const projectBannerText = document.getElementById('project-banner-text');
  const btnDownloadProject = document.getElementById('btn-download-project');

  // Setting Checkboxes
  const checkFrontmatter = document.getElementById('setting-frontmatter');
  const checkRaw = document.getElementById('setting-raw');
  const checkImages = document.getElementById('setting-images');
  const checkLinks = document.getElementById('setting-links');
  const checkObsidian = document.getElementById('setting-obsidian');
  const checkPreserveJs = document.getElementById('setting-preserve-js');
  const checkPreserveJsQuick = document.getElementById('setting-preserve-js-quick');
  const btnToggleEdit = document.getElementById('btn-toggle-edit');

  // State Variables
  let extractedData = null;
  let currentMarkdown = '';
  let currentHtml = '';
  let currentPackage = null;
  let activePreviewTab = 'markdown';
  let editingApiIndex = -1;

  // Default Settings
  const defaultSettings = {
    frontmatter: false,
    rawMode: false,
    includeImages: true,
    includeLinks: true,
    obsidianMode: false,
    preserveJs: false,
    headingStyle: 'atx',
    bulletStyle: '-',
    codeBlockStyle: 'fenced'
  };

  // Safe storage helper fallback (sync -> local -> localStorage)
  const safeStorage = {
    get: (key) => {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const area = chrome.storage.sync || chrome.storage.local;
          if (area) {
            area.get(key, (data) => {
              resolve(data[key] || null);
            });
            return;
          }
        }
        try {
          const val = localStorage.getItem(key);
          resolve(val ? JSON.parse(val) : null);
        } catch (e) {
          resolve(null);
        }
      });
    },
    set: (key, val) => {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const area = chrome.storage.sync || chrome.storage.local;
          if (area) {
            area.set({ [key]: val }, () => {
              resolve();
            });
            return;
          }
        }
        try {
          localStorage.setItem(key, JSON.stringify(val));
          resolve();
        } catch (e) {
          resolve();
        }
      });
    }
  };

  // 1. Initial Load: load settings
  loadSettings().then((settings) => {
    updateSettingsUI(settings);
    updateFooterActionsVisibility();
    notifyTabMockingState(settings.preserveJs);
  });

  // Query active tab's edit mode state on popup load
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
      }
    }
  });

  if (btnToggleEdit) {
    btnToggleEdit.addEventListener('change', () => {
      const enabled = btnToggleEdit.checked;
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
            injectScriptsAndToggle(activeTab.id, enabled);
          }
        });
      });
    });
  }

  const btnSelectRegion = document.getElementById('btn-select-region');
  if (btnSelectRegion) {
    btnSelectRegion.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        const activeTab = tabs[0];
        if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://'))) {
          showError("Cannot inspect Chrome system pages.");
          return;
        }

        chrome.tabs.sendMessage(activeTab.id, { action: "toggleRegionSelection" }, (response) => {
          if (chrome.runtime.lastError) {
            const scripts = ["lib/readability.js", "lib/turndown.js", "lib/turndown-plugin-gfm.js", "lib/jszip.min.js", "isolated_bridge.js", "content.js"];
            let p = Promise.resolve();
            p = p.then(() => {
              return chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ["main_world.js"],
                world: "MAIN"
              });
            }).catch(err => console.warn("Dynamic main world injection warning: ", err));

            scripts.forEach(script => {
              p = p.then(() => {
                return chrome.scripting.executeScript({
                  target: { tabId: activeTab.id },
                  files: [script]
                });
              });
            });

            p.then(() => {
              setTimeout(() => {
                chrome.tabs.sendMessage(activeTab.id, { action: "toggleRegionSelection" });
                window.close();
              }, 200);
            }).catch(err => {
              console.error("Script injection failed: ", err);
              showError("Please refresh the page before selecting region.");
            });
          } else {
            window.close();
          }
        });
      });
    });
  }

  // 2. Event Listeners
  if (btnExtract) {
    btnExtract.addEventListener('click', autoExtractPage);
  }

  const previewTabs = [
    { btn: tabMd, view: markdownPreview, name: 'markdown' },
    { btn: tabHtml, view: htmlPreviewWrapper, name: 'html' },
    { btn: tabApi, view: apiPreviewWrapper, name: 'api' }
  ];

  previewTabs.forEach(tabObj => {
    if (tabObj.btn) {
      tabObj.btn.addEventListener('click', () => {
        activePreviewTab = tabObj.name;
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

  function updateStats() {
    let text = '';
    if (activePreviewTab === 'markdown') {
      text = currentMarkdown;
    } else if (activePreviewTab === 'html') {
      text = currentHtml;
    }
    const charCount = text ? text.length : 0;
    const estTokens = Math.ceil(charCount / 4);
    charCountEl.innerText = charCount.toLocaleString();
    tokenCountEl.innerText = estTokens.toLocaleString();
  }
  
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const textToCopy = activePreviewTab === 'markdown' ? currentMarkdown : currentHtml;
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
      if (!extractedData) return;
      
      // Sanitize title for filename
      const sanitizedTitle = extractedData.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50) || 'webpage';

      if (activePreviewTab === 'markdown') {
        if (!currentMarkdown) return;
        const filename = `${sanitizedTitle}.md`;
        downloadFile(currentMarkdown, filename);
      } else {
        if (!currentHtml) return;
        const filename = `${sanitizedTitle}.html`;
        downloadFile(currentHtml, filename, 'text/html;charset=utf-8');
      }
    });
  }

  // Settings pane slide-in / slide-out
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      if (settingsPane) settingsPane.classList.remove('hidden');
    });
  }

  if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
      if (settingsPane) settingsPane.classList.add('hidden');
    });
  }

  // Save settings on checkbox changes and re-convert
  [checkFrontmatter, checkRaw, checkImages, checkLinks, checkObsidian, checkPreserveJs].forEach(checkbox => {
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        if (checkbox === checkPreserveJs && checkPreserveJsQuick) {
          checkPreserveJsQuick.checked = checkPreserveJs.checked;
        }
        saveSettings().then((newSettings) => {
          if (extractedData) {
            processAndDisplayMarkdown(extractedData, newSettings);
          }
        });
      });
    }
  });

  if (checkPreserveJsQuick) {
    checkPreserveJsQuick.addEventListener('change', () => {
      if (checkPreserveJs) {
        checkPreserveJs.checked = checkPreserveJsQuick.checked;
      }
      saveSettings().then((newSettings) => {
        if (extractedData) {
          processAndDisplayMarkdown(extractedData, newSettings);
        }
      });
    });
  }

  /**
   * Loads settings from safe storage
   */
  function loadSettings() {
    return safeStorage.get('settings').then((settings) => {
      return settings ? { ...defaultSettings, ...settings } : defaultSettings;
    });
  }

  function notifyTabMockingState(enabled) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      const tabId = tabs[0].id;
      chrome.runtime.sendMessage({
        action: "setMockingEnabled",
        tabId: tabId,
        enabled: enabled
      });
    });
  }

  /**
   * Saves UI checkbox states to settings storage
   */
  function saveSettings() {
    const settings = {
      frontmatter: checkFrontmatter ? checkFrontmatter.checked : false,
      rawMode: checkRaw ? checkRaw.checked : false,
      includeImages: checkImages ? checkImages.checked : true,
      includeLinks: checkLinks ? checkLinks.checked : true,
      obsidianMode: checkObsidian ? checkObsidian.checked : false,
      preserveJs: checkPreserveJs ? checkPreserveJs.checked : false,
      headingStyle: 'atx',
      bulletStyle: '-',
      codeBlockStyle: 'fenced'
    };

    return safeStorage.set('settings', settings).then(() => {
      notifyTabMockingState(settings.preserveJs);
      return settings;
    });
  }

  /**
   * Syncs UI checkbox states with settings object
   */
  function updateSettingsUI(settings) {
    if (checkFrontmatter) checkFrontmatter.checked = settings.frontmatter;
    if (checkRaw) checkRaw.checked = settings.rawMode || false;
    if (checkImages) checkImages.checked = settings.includeImages;
    if (checkLinks) checkLinks.checked = settings.includeLinks;
    if (checkObsidian) checkObsidian.checked = settings.obsidianMode;
    if (checkPreserveJs) checkPreserveJs.checked = settings.preserveJs || false;
    if (checkPreserveJsQuick) checkPreserveJsQuick.checked = settings.preserveJs || false;
  }

  /**
   * Helper to dynamically show/hide buttons in actions-grid based on tab
   */
  function updateFooterActionsVisibility() {
    const gridEl = document.querySelector('.actions-grid');
    if (!gridEl) return;

    if (activePreviewTab === 'markdown') {
      if (btnCopy) btnCopy.style.display = 'block';
      if (btnDownload) btnDownload.style.display = 'block';
      if (btnDownloadZip) btnDownloadZip.style.display = 'none';
      if (btnDeploy) btnDeploy.style.display = 'none';
      gridEl.style.gridTemplateColumns = '1fr 1fr';
    } else if (activePreviewTab === 'html') {
      if (btnCopy) btnCopy.style.display = 'block';
      if (btnDownload) btnDownload.style.display = 'block';
      if (btnDownloadZip) btnDownloadZip.style.display = 'block';
      if (btnDeploy) btnDeploy.style.display = 'block';
      gridEl.style.gridTemplateColumns = '1fr 1fr';
    } else if (activePreviewTab === 'api') {
      if (btnCopy) btnCopy.style.display = 'none';
      if (btnDownload) btnDownload.style.display = 'none';
      if (btnDownloadZip) btnDownloadZip.style.display = 'block';
      if (btnDeploy) btnDeploy.style.display = 'block';
      gridEl.style.gridTemplateColumns = '1fr 1fr';
    }
  }

  /**
   * Queries active tab and requests content script extraction
   */
  function autoExtractPage() {
    btnExtract.innerHTML = '<span class="spinner">⚡</span> Extracting...';
    btnExtract.disabled = true;
    if (btnCopy) btnCopy.disabled = true;
    if (btnDownload) btnDownload.disabled = true;
    if (btnDownloadZip) btnDownloadZip.disabled = true;
    if (btnDeploy) btnDeploy.disabled = true;
    markdownPreview.placeholder = "Querying DOM and parsing content...";

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

      // Check if background service worker has cached VFS project files for this tab
      chrome.runtime.sendMessage({ action: "getProject", tabId: activeTab.id }, (projResponse) => {
        let cachedProjectFiles = null;
        if (projResponse && projResponse.hasProject) {
          cachedProjectFiles = projResponse.projectFiles;
        }

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
          chrome.tabs.sendMessage(activeTab.id, { action: "extractContent" }, { frameId: targetFrameId }, (response) => {
            // Handle runtime error (e.g. content script not loaded yet)
            if (chrome.runtime.lastError) {
              console.warn("Content script not ready, injecting and retrying...", chrome.runtime.lastError);
              injectScriptsAndRetry(activeTab.id, targetFrameId);
              return;
            }

            if (response && response.success) {
              extractedData = response;
              if (cachedProjectFiles) {
                extractedData.projectFiles = cachedProjectFiles;
              }
              
              // Request page clone HTML
              loadSettings().then((settings) => {
                chrome.runtime.sendMessage({ action: "getApiCalls", tabId: activeTab.id }, (apiCallsResponse) => {
                  const apiCalls = (apiCallsResponse && apiCallsResponse.apiCalls) || [];
                  chrome.tabs.sendMessage(activeTab.id, {
                    action: "clonePage",
                    preserveJs: settings.preserveJs,
                    apiCalls: apiCalls
                  }, { frameId: targetFrameId }, (cloneResponse) => {
                    if (cloneResponse && cloneResponse.success) {
                      currentHtml = cloneResponse.html;
                      currentPackage = cloneResponse.package || null;
                      if (htmlPreviewFrame) {
                        if (settings.preserveJs) {
                          htmlPreviewFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
                        } else {
                          htmlPreviewFrame.setAttribute('sandbox', 'allow-same-origin');
                        }
                        htmlPreviewFrame.srcdoc = currentHtml;
                      }
                    } else {
                      console.error("HTML cloning failed:", cloneResponse ? cloneResponse.error : "Unknown error");
                      currentHtml = "<!-- HTML cloning failed -->";
                      currentPackage = null;
                    }
                    
                    processAndDisplayMarkdown(extractedData, settings);
                  });
                });
              });
            } else {
              showError(response ? response.error : "Failed to extract clean HTML content.");
            }
          });
        });
      });
    });
  }

  /**
   * Helper to dynamically inject content scripts if not pre-loaded, then retry extraction
   */
  function injectScriptsAndRetry(tabId, frameId = 0) {
    const scripts = ["lib/readability.js", "lib/turndown.js", "lib/turndown-plugin-gfm.js", "lib/jszip.min.js", "isolated_bridge.js", "content.js"];
    
    // Inject scripts sequentially
    let p = Promise.resolve();
    
    // Inject main world script first to target frame only
    p = p.then(() => {
      return chrome.scripting.executeScript({
        target: { tabId: tabId, frameIds: [frameId] },
        files: ["main_world.js"],
        world: "MAIN"
      });
    }).catch(err => {
      console.warn("Dynamic main world injection warning: ", err);
    });

    scripts.forEach(script => {
      p = p.then(() => {
        return chrome.scripting.executeScript({
          target: { tabId: tabId, frameIds: [frameId] },
          files: [script]
        });
      });
    });

    p.then(() => {
      // Retry message sending after a small delay to ensure injection initialized
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: "getProject", tabId: tabId }, (projResponse) => {
          let cachedProjectFiles = null;
          if (projResponse && projResponse.hasProject) {
            cachedProjectFiles = projResponse.projectFiles;
          }

          chrome.tabs.sendMessage(tabId, { action: "extractContent" }, { frameId: frameId }, (response) => {
            if (chrome.runtime.lastError) {
              showError("Could not connect to page. Refresh the page and try again.");
              return;
            }

            if (response && response.success) {
              extractedData = response;
              if (cachedProjectFiles) {
                extractedData.projectFiles = cachedProjectFiles;
              }
              
              // Request HTML cloning on retry
              loadSettings().then((settings) => {
                chrome.runtime.sendMessage({ action: "getApiCalls", tabId: tabId }, (apiCallsResponse) => {
                  const apiCalls = (apiCallsResponse && apiCallsResponse.apiCalls) || [];
                  chrome.tabs.sendMessage(tabId, {
                    action: "clonePage",
                    preserveJs: settings.preserveJs,
                    apiCalls: apiCalls
                  }, { frameId: frameId }, (cloneResponse) => {
                    if (cloneResponse && cloneResponse.success) {
                      currentHtml = cloneResponse.html;
                      currentPackage = cloneResponse.package || null;
                      if (htmlPreviewFrame) {
                        if (settings.preserveJs) {
                          htmlPreviewFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
                        } else {
                          htmlPreviewFrame.setAttribute('sandbox', 'allow-same-origin');
                        }
                        htmlPreviewFrame.srcdoc = currentHtml;
                      }
                    } else {
                      currentHtml = "<!-- HTML cloning failed -->";
                      currentPackage = null;
                    }
                    
                    processAndDisplayMarkdown(extractedData, settings);
                  });
                });
              });
            } else {
              showError(response ? response.error : "Fallback injection extraction failed.");
            }
          });
        });
      }, 200);
    }).catch(err => {
      console.error("Script injection failed: ", err);
      showError("Please refresh the page before using the extension.");
    });
  }

  /**
   * Converts clean HTML to Markdown and updates UI preview
   */
  function processAndDisplayMarkdown(data, settings) {
    try {
      if (typeof TurndownService === 'undefined') {
        throw new Error("TurndownService core library is not loaded.");
      }

      const turndownService = new TurndownService({
        headingStyle: settings.headingStyle,
        hr: '---',
        bulletListMarker: settings.bulletStyle,
        codeBlockStyle: settings.codeBlockStyle,
        emDelimiter: '*',
        strongDelimiter: '**',
        br: '  '
      });

      // Integrate GitHub Flavored Markdown support
      if (typeof turndownPluginGfm !== 'undefined' && turndownPluginGfm.gfm) {
        turndownService.use(turndownPluginGfm.gfm);
      }

      // Remove unwanted elements (but preserve buttons, forms, and nav text content)
      turndownService.remove(['script', 'style', 'iframe', 'noscript']);

      // Custom Monaco Editor rule to preserve code formatting
      turndownService.addRule('monacoEditor', {
        filter: (node) => node.classList && node.classList.contains('monaco-editor'),
        replacement: (content, node) => {
          const lines = node.querySelectorAll('.view-line');
          if (lines.length === 0) return '';
          
          const codeLines = Array.from(lines).map(line => line.textContent || '');
          const codeText = codeLines.join('\n');
          
          // Try to find the file extension from active tabs/headers
          let language = '';
          const activeTab = document.querySelector('.tab.active, .editor-tab.active, [class*="active-tab"], [class*="tab-active"]');
          if (activeTab) {
            const name = activeTab.textContent.trim();
            const ext = name.split('.').pop();
            if (ext && ext.length < 10) language = ext;
          }
          
          return `\n\n\`\`\`${language}\n${codeText}\n\`\`\`\n\n`;
        }
      });

      // Fenced code blocks rule
      turndownService.addRule('fencedCodeBlock', {
        filter: (node) => node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE',
        replacement: (content, node, options) => {
          const code = node.firstChild;
          const className = code.getAttribute('class') || '';
          const language = (className.match(/language-(\S+)/) || [null, ''])[1];
          const text = code.textContent;
          const fenceChar = options.codeBlockStyle === 'indented' ? '    ' : '```';
          
          if (fenceChar === '    ') {
            return '\n\n    ' + text.replace(/\n/g, '\n    ') + '\n\n';
          }
          return `\n\n\`\`\`${language}\n${text.replace(/\n$/, '')}\n\`\`\`\n\n`;
        }
      });

      // Keep/Remove images based on settings
      turndownService.addRule('imageFilter', {
        filter: 'img',
        replacement: (content, node) => {
          if (!settings.includeImages) return '';
          const alt = node.getAttribute('alt') || 'image';
          const src = node.getAttribute('src') || '';
          const title = node.getAttribute('title') ? ` "${node.getAttribute('title')}"` : '';
          return src ? `![${alt}](${src}${title})` : '';
        }
      });

      // Keep/Remove/Format links based on settings
      turndownService.addRule('linkFilter', {
        filter: 'a',
        replacement: (content, node) => {
          const href = node.getAttribute('href');
          if (!href) return content;

          if (!settings.includeLinks) return content;

          if (settings.obsidianMode) {
            if (href.startsWith('#') || !href.startsWith('http')) {
              const cleanHref = decodeURIComponent(href.replace(/^\.\//, ''));
              return `[[${cleanHref}${content && content !== cleanHref ? '|' + content : ''}]]`;
            }
          }

          const title = node.getAttribute('title') ? ` "${node.getAttribute('title')}"` : '';
          return `[${content}](${href}${title})`;
        }
      });

      // Convert HTML content: use raw HTML if rawMode is enabled
      const htmlToConvert = settings.rawMode ? (data.rawContent || data.content) : (data.content || data.rawContent);
      let markdown = turndownService.turndown(htmlToConvert);

      // Clean excessive newlines
      markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

      // Add YAML frontmatter header if configured
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
        markdown = fm + markdown;
      }

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

      currentMarkdown = markdown;
      markdownPreview.value = currentMarkdown;
      
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
      if (projectBanner) {
        if (data.projectFiles && data.projectFiles.length > 0) {
          projectBanner.classList.remove('hidden');
          if (projectBannerText) {
            projectBannerText.innerText = `Project Detected (${data.projectFiles.length} files)`;
          }
          const oldBtn = document.getElementById('btn-download-project');
          if (oldBtn) {
            const newBtn = oldBtn.cloneNode(true);
            oldBtn.parentNode.replaceChild(newBtn, oldBtn);
            newBtn.addEventListener('click', () => {
              downloadProjectMarkdown(data.projectFiles, data.title);
            });
          }
        } else {
          projectBanner.classList.add('hidden');
        }
      } else {
        if (projectBanner) projectBanner.classList.add('hidden');
      }

      // Re-enable extract button
      btnExtract.innerHTML = '<span class="btn-icon">⚡</span> Extract Page';
      btnExtract.disabled = false;
    } catch (e) {
      console.error(e);
      showError(`Conversion error: ${e.message}`);
    }
  }

  /**
   * Consolidates and downloads all project files from VFS as a single Markdown file
   */
  function downloadProjectMarkdown(projectFiles, appTitle) {
    let markdown = `# Project: ${appTitle || 'Applet'}\n\n`;
    markdown += `Extracted on: ${new Date().toISOString().split('T')[0]}\n\n`;
    markdown += `## Project Structure\n\n`;
    projectFiles.forEach(file => {
      markdown += `- \`${file.path}\` (${file.content.length} chars)\n`;
    });
    markdown += `\n---\n\n`;

    projectFiles.forEach(file => {
      const ext = file.path.split('.').pop() || '';
      markdown += `### File: ${file.path}\n\n`;
      markdown += `\`\`\`${ext}\n${file.content}\n\`\`\`\n\n`;
      markdown += `---\n\n`;
    });

    const sanitizedTitle = (appTitle || 'project')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) || 'project';
    const filename = `${sanitizedTitle}-all-files.md`;
    downloadFile(markdown, filename);
  }

  /**
   * Helper to download file using chrome.downloads if available, falling back to <a> link
   */
  function downloadFile(content, filename, mimeType = 'text/markdown;charset=utf-8') {
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

  /**
   * Helper to dynamically inject content scripts if not pre-loaded, then toggle edit mode
   */
  function injectScriptsAndToggle(tabId, enabled) {
    const scripts = ["lib/readability.js", "lib/turndown.js", "lib/turndown-plugin-gfm.js", "lib/jszip.min.js", "isolated_bridge.js", "content.js"];
    let p = Promise.resolve();

    p = p.then(() => {
      return chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ["main_world.js"],
        world: "MAIN"
      });
    }).catch(err => console.warn("Dynamic main world injection warning: ", err));

    scripts.forEach(script => {
      p = p.then(() => {
        return chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: [script]
        });
      });
    });

    p.then(() => {
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: "toggleVisualEdit", enabled: enabled });
      }, 200);
    }).catch(err => {
      console.error("Script injection failed: ", err);
      showError("Please refresh the page before editing.");
      if (btnToggleEdit) btnToggleEdit.checked = false;
    });
  }


  /**
   * Helper to display extraction/processing error in UI
   */
  function showError(msg) {
    const errorMsg = msg || "Failed to extract clean HTML content.";
    markdownPreview.value = `Error: ${errorMsg}\n\nMake sure you are on a standard web page and the page has finished loading. Extension does not run on chrome:// internal pages.`;
    charCountEl.innerText = '0';
    tokenCountEl.innerText = '0';
    if (btnCopy) btnCopy.disabled = true;
    if (btnDownload) btnDownload.disabled = true;
    if (btnDownloadZip) btnDownloadZip.disabled = true;
    if (btnDeploy) btnDeploy.disabled = true;
    if (projectBanner) projectBanner.classList.add('hidden');
    btnExtract.innerHTML = '<span class="btn-icon">⚡</span> Extract Page';
    btnExtract.disabled = false;
  }

  // --- Mock API Management & Deploy Functions ---

  let activeEditingCall = null;

  function showApiListView() {
    if (apiListView) apiListView.classList.remove('hidden');
    if (apiEditorView) apiEditorView.classList.add('hidden');
    activeEditingCall = null;
  }

  function showApiEditorView(call) {
    if (!apiListView || !apiEditorView) return;
    
    activeEditingCall = call;
    
    editorUrl.textContent = call.url;
    editorUrl.title = call.url;
    editorMethod.value = call.method || 'GET';
    editorStatus.value = call.status || 200;
    editorBody.value = call.responseText || '';
    
    apiListView.classList.add('hidden');
    apiEditorView.classList.remove('hidden');
  }

  function fetchAndRenderApiCalls(searchQuery = '') {
    if (!apiListContainer) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      const activeTab = tabs[0];
      
      chrome.runtime.sendMessage({ action: "getApiCalls", tabId: activeTab.id }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          apiListContainer.innerHTML = '<div class="api-empty-state">Unable to load API history. Make sure to click Extract Page first.</div>';
          return;
        }
        
        const apiCalls = response.apiCalls || [];
        if (apiCalls.length === 0) {
          apiListContainer.innerHTML = `
            <div class="api-empty-state-guide">
              <div class="guide-icon">💡</div>
              <h4>How to Capture & Mock APIs:</h4>
              <ol>
                <li>Turn on <strong>Preserve JS & Mock APIs</strong> toggle above.</li>
                <li>Reload the page to start capturing early requests.</li>
                <li>Interact with the page (or let it load).</li>
                <li>Click <strong>⚡ Extract Page</strong> in this extension.</li>
                <li>Switch to <strong>HTML Clone</strong> tab, download <strong>ZIP Package</strong> or <strong>Deploy Netlify</strong> to run live mock!</li>
              </ol>
            </div>`;
          return;
        }
        
        const listWithIndex = apiCalls.map((item, idx) => ({ ...item, originalIndex: idx }));
        const filtered = listWithIndex.filter(call => call.url.toLowerCase().includes(searchQuery.toLowerCase()));
        
        if (filtered.length === 0) {
          apiListContainer.innerHTML = '<div class="api-empty-state">No matching API requests.</div>';
          return;
        }
        
        apiListContainer.innerHTML = '';
        filtered.forEach(call => {
          const card = document.createElement('div');
          card.className = 'api-card';
          
          const meta = document.createElement('div');
          meta.className = 'api-card-meta';
          
          const methodBadge = document.createElement('span');
          methodBadge.className = `api-badge ${call.method.toLowerCase()}`;
          methodBadge.textContent = call.method;
          
          const statusBadge = document.createElement('span');
          const isSuccess = call.status >= 200 && call.status < 300;
          statusBadge.className = `api-status ${isSuccess ? 'success' : 'error'}`;
          statusBadge.textContent = call.status;
          
          const urlSpan = document.createElement('span');
          urlSpan.className = 'api-url';
          urlSpan.textContent = call.url;
          urlSpan.title = call.url;
          
          meta.appendChild(methodBadge);
          meta.appendChild(statusBadge);
          meta.appendChild(urlSpan);
          card.appendChild(meta);
          
          const editIndicator = document.createElement('span');
          editIndicator.className = 'api-card-edit-indicator';
          editIndicator.innerHTML = '✎';
          card.appendChild(editIndicator);
          
          card.addEventListener('click', () => {
            showApiEditorView(call);
          });
          
          apiListContainer.appendChild(card);
        });
      });
    });
  }

  function deleteApiCall(index) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      chrome.runtime.sendMessage({ action: "deleteApiCall", tabId: tabs[0].id, index: index }, (res) => {
        fetchAndRenderApiCalls(apiSearchInput ? apiSearchInput.value : '');
      });
    });
  }

  // Hook search & refresh controls
  if (apiSearchInput) {
    apiSearchInput.addEventListener('input', () => {
      fetchAndRenderApiCalls(apiSearchInput.value);
    });
  }

  if (btnRefreshApi) {
    btnRefreshApi.addEventListener('click', () => {
      fetchAndRenderApiCalls(apiSearchInput ? apiSearchInput.value : '');
    });
  }

  // Hook Sub-Editor Controls
  if (btnEditorBack) {
    btnEditorBack.addEventListener('click', showApiListView);
  }
  
  if (btnEditorFormat) {
    btnEditorFormat.addEventListener('click', () => {
      try {
        const obj = JSON.parse(editorBody.value);
        editorBody.value = JSON.stringify(obj, null, 2);
      } catch (err) {
        const originalText = btnEditorFormat.textContent;
        btnEditorFormat.textContent = '⚠️ Invalid JSON';
        btnEditorFormat.style.color = '#f87171';
        setTimeout(() => {
          btnEditorFormat.textContent = originalText;
          btnEditorFormat.style.color = '';
        }, 1500);
      }
    });
  }

  if (btnEditorReset) {
    btnEditorReset.addEventListener('click', () => {
      if (!activeEditingCall) return;
      if (confirm('Revert this mock and restore the live API calls?')) {
        const origMethod = activeEditingCall.originalMethod || activeEditingCall.method || 'GET';
        const origStatus = activeEditingCall.originalStatus || activeEditingCall.status || 200;
        const origBody = activeEditingCall.originalResponseText !== undefined ? activeEditingCall.originalResponseText : (activeEditingCall.responseText || '');
        
        editorMethod.value = origMethod;
        editorStatus.value = origStatus;
        editorBody.value = origBody;
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || tabs.length === 0) return;
          chrome.runtime.sendMessage({
            action: "updateApiCall",
            tabId: tabs[0].id,
            index: activeEditingCall.originalIndex,
            updatedCall: {
              method: origMethod,
              status: origStatus,
              responseText: origBody,
              isMocked: false
            }
          }, (res) => {
            const originalText = btnEditorReset.textContent;
            btnEditorReset.textContent = 'Reverted ✓';
            btnEditorReset.style.color = '#10b981';
            setTimeout(() => {
              btnEditorReset.textContent = originalText;
              btnEditorReset.style.color = '';
            }, 1500);
            fetchAndRenderApiCalls(apiSearchInput ? apiSearchInput.value : '');
          });
        });
      }
    });
  }
  
  if (btnEditorDelete) {
    btnEditorDelete.addEventListener('click', () => {
      if (activeEditingCall && confirm('Are you sure you want to delete this mock?')) {
        deleteApiCall(activeEditingCall.originalIndex);
        showApiListView();
      }
    });
  }
  
  if (btnEditorSave) {
    btnEditorSave.addEventListener('click', () => {
      if (!activeEditingCall) return;
      const newMethod = editorMethod.value;
      const newStatus = parseInt(editorStatus.value, 10) || 200;
      const newBody = editorBody.value;
      
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        chrome.runtime.sendMessage({
          action: "updateApiCall",
          tabId: tabs[0].id,
          index: activeEditingCall.originalIndex,
          updatedCall: {
            method: newMethod,
            status: newStatus,
            responseText: newBody,
            isMocked: true
          }
        }, (res) => {
          // Highlight save button success
          const originalText = btnEditorSave.textContent;
          btnEditorSave.textContent = 'Saved ✓';
          btnEditorSave.style.background = '#10b981';
          setTimeout(() => {
            btnEditorSave.textContent = originalText;
            btnEditorSave.style.background = '';
          }, 1500);
          
          // Refresh list to reflect changes on back button
          fetchAndRenderApiCalls(apiSearchInput ? apiSearchInput.value : '');
        });
      });
    });
  }

  // Load Netlify token on startup
  safeStorage.get('netlifyToken').then((token) => {
    if (checkNetlifyToken && token) {
      checkNetlifyToken.value = token;
    }
  });

  if (checkNetlifyToken) {
    checkNetlifyToken.addEventListener('input', () => {
      safeStorage.set('netlifyToken', checkNetlifyToken.value.trim());
    });
  }

  // ZIP Download Listener
  if (btnDownloadZip) {
    btnDownloadZip.addEventListener('click', () => {
      if (!currentHtml) return;
      
      buildZipBlob().then((blob) => {
        const sanitizedTitle = (extractedData ? extractedData.title : 'webpage')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 50) || 'webpage';
        const filename = `${sanitizedTitle}-package.zip`;
        downloadFileBlob(blob, filename);
      }).catch(err => {
        console.error("ZIP creation failed:", err);
        alert("Failed to build ZIP file: " + err.message);
      });
    });
  }

  function downloadFileBlob(blob, filename) {
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

  async function buildZipBlob() {
    const zip = new JSZip();
    
    if (currentPackage) {
      zip.file("index.html", currentPackage.html);
      if (currentPackage.css && currentPackage.css.trim().length > 0) {
        zip.file("styles.css", currentPackage.css);
      }
      if (currentPackage.js && currentPackage.js.trim().length > 0) {
        zip.file("scripts.js", currentPackage.js);
      }
      if (currentPackage.assets && currentPackage.assets.length > 0) {
        currentPackage.assets.forEach(file => {
          const blob = dataURLtoBlob(file.dataUrl);
          if (blob) {
            zip.file(file.path, blob);
          }
        });
      }
    } else {
      zip.file("index.html", currentHtml);
    }
    
    if (extractedData && extractedData.projectFiles && extractedData.projectFiles.length > 0) {
      extractedData.projectFiles.forEach(file => {
        zip.file(file.path, file.content);
      });
    }
    
    return await zip.generateAsync({ type: "blob" });
  }

  function dataURLtoBlob(dataUrl) {
    if (!dataUrl) return null;
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mime = parts[0].match(/:(.*?);/)[1];
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  // Netlify Deploy Listener
  if (btnDeploy) {
    btnDeploy.addEventListener('click', async () => {
      if (!currentHtml) return;
      
      const token = checkNetlifyToken ? checkNetlifyToken.value.trim() : '';
      if (!token) {
        if (settingsPane) settingsPane.classList.remove('hidden');
        if (checkNetlifyToken) checkNetlifyToken.focus();
        alert("Please configure your Netlify Personal Access Token in Settings first.");
        return;
      }
      
      btnDeploy.innerHTML = '<span class="spinner">🚀</span> Deploying...';
      btnDeploy.disabled = true;
      
      try {
        const zipBlob = await buildZipBlob();
        
        const pageKey = `netlifySiteId_${encodeURIComponent(extractedData.url)}`;
        let siteId = await safeStorage.get(pageKey);
        let siteUrl = '';
        
        if (!siteId) {
          // Create new site
          const createRes = await fetch('https://api.netlify.com/api/v1/sites', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              custom_domain: null,
              name: `web2md-${Math.random().toString(36).substr(2, 8)}`
            })
          });
          
          if (!createRes.ok) {
            const errJson = await createRes.json().catch(() => ({}));
            throw new Error(errJson.message || `Failed to create site (${createRes.status})`);
          }
          
          const createData = await createRes.json();
          siteId = createData.id;
          siteUrl = createData.ssl_url || createData.url;
          await safeStorage.set(pageKey, siteId);
        } else {
          // Verify/Get existing site
          const siteRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (siteRes.ok) {
            const siteData = await siteRes.json();
            siteUrl = siteData.ssl_url || siteData.url;
          } else {
            // Site probably deleted, create a new one
            const createRes = await fetch('https://api.netlify.com/api/v1/sites', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                custom_domain: null,
                name: `web2md-${Math.random().toString(36).substr(2, 8)}`
              })
            });
            if (!createRes.ok) {
              const errJson = await createRes.json().catch(() => ({}));
              throw new Error(errJson.message || `Failed to recreate site (${createRes.status})`);
            }
            const createData = await createRes.json();
            siteId = createData.id;
            siteUrl = createData.ssl_url || createData.url;
            await safeStorage.set(pageKey, siteId);
          }
        }
        
        // Upload zip to Netlify deploy
        const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/zip'
          },
          body: zipBlob
        });
        
        if (!deployRes.ok) {
          const errJson = await deployRes.json().catch(() => ({}));
          throw new Error(errJson.message || `Deploy upload failed (${deployRes.status})`);
        }
        
        btnDeploy.innerHTML = 'Live! ✓';
        btnDeploy.classList.add('success-flash');
        setTimeout(() => {
          btnDeploy.innerHTML = '🚀 Deploy Netlify';
          btnDeploy.disabled = false;
          btnDeploy.classList.remove('success-flash');
        }, 3000);
        
        chrome.tabs.create({ url: siteUrl });
      } catch (err) {
        console.error("Netlify deployment failed:", err);
        alert("Deployment failed: " + err.message);
        btnDeploy.innerHTML = '🚀 Deploy Netlify';
        btnDeploy.disabled = false;
      }
    });
  }

  // Load and apply custom popup size
  Promise.all([
    safeStorage.get('popupWidth'),
    safeStorage.get('popupHeight')
  ]).then(([w, h]) => {
    if (w) document.body.style.width = w;
    if (h) document.body.style.height = h;
  });

  // Drag to Resize Logic
  const resizeHandle = document.getElementById('resize-handle');
  if (resizeHandle) {
    let isResizing = false;
    let startWidth, startHeight, startX, startY;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startWidth = document.body.clientWidth;
      startHeight = document.body.clientHeight;
      startX = e.clientX;
      startY = e.clientY;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      e.preventDefault();
    });

    function handleMouseMove(e) {
      if (!isResizing) return;
      const newWidth = Math.min(800, Math.max(400, startWidth + (e.clientX - startX)));
      const newHeight = Math.min(600, Math.max(350, startHeight + (e.clientY - startY)));
      document.body.style.width = newWidth + 'px';
      document.body.style.height = newHeight + 'px';
    }

    function handleMouseUp() {
      if (!isResizing) return;
      isResizing = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Save dimensions
      safeStorage.set('popupWidth', document.body.style.width);
      safeStorage.set('popupHeight', document.body.style.height);
    }
  }

  // Handle messages from page context / isolated bridge
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "syncMocks") {
      fetchAndRenderApiCalls(apiSearchInput ? apiSearchInput.value : '');
    }
  });

  if (btnClearAllMocks) {
    btnClearAllMocks.addEventListener('click', () => {
      if (confirm('Clear all mock API overrides for this page and restore live API calls? This will reload the web page.')) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs || tabs.length === 0) return;
          const tabId = tabs[0].id;
          chrome.runtime.sendMessage({
            action: "clearAllMocks",
            tabId: tabId
          }, (res) => {
            chrome.tabs.reload(tabId);
            window.close();
          });
        });
      }
    });
  }
});

