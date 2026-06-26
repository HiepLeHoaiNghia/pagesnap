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

  // State Variables
  let extractedData = null;
  let currentMarkdown = '';

  // Default Settings
  const defaultSettings = {
    frontmatter: false,
    rawMode: false,
    includeImages: true,
    includeLinks: true,
    obsidianMode: false,
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
  });

  // 2. Event Listeners
  if (btnExtract) {
    btnExtract.addEventListener('click', autoExtractPage);
  }
  
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      if (!currentMarkdown) return;
      navigator.clipboard.writeText(currentMarkdown).then(() => {
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
      if (!currentMarkdown || !extractedData) return;
      
      // Sanitize title for filename
      const sanitizedTitle = extractedData.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50) || 'webpage';

      const filename = `${sanitizedTitle}.md`;
      const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
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
  [checkFrontmatter, checkRaw, checkImages, checkLinks, checkObsidian].forEach(checkbox => {
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        saveSettings().then((newSettings) => {
          if (extractedData) {
            processAndDisplayMarkdown(extractedData, newSettings);
          }
        });
      });
    }
  });

  /**
   * Loads settings from safe storage
   */
  function loadSettings() {
    return safeStorage.get('settings').then((settings) => {
      return settings ? { ...defaultSettings, ...settings } : defaultSettings;
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
      headingStyle: 'atx',
      bulletStyle: '-',
      codeBlockStyle: 'fenced'
    };

    return safeStorage.set('settings', settings).then(() => settings);
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
  }

  /**
   * Queries active tab and requests content script extraction
   */
  function autoExtractPage() {
    btnExtract.innerHTML = '<span class="spinner">⚡</span> Extracting...';
    btnExtract.disabled = true;
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

        // Send extraction request to content.js (target top-level frame only)
        chrome.tabs.sendMessage(activeTab.id, { action: "extractContent" }, { frameId: 0 }, (response) => {
          // Handle runtime error (e.g. content script not loaded yet)
          if (chrome.runtime.lastError) {
            console.warn("Content script not ready, injecting and retrying...", chrome.runtime.lastError);
            injectScriptsAndRetry(activeTab.id);
            return;
          }

          if (response && response.success) {
            extractedData = response;
            if (cachedProjectFiles) {
              extractedData.projectFiles = cachedProjectFiles;
            }
            loadSettings().then((settings) => {
              processAndDisplayMarkdown(extractedData, settings);
            });
          } else {
            showError(response ? response.error : "Failed to extract clean HTML content.");
          }
        });
      });
    });
  }

  /**
   * Helper to dynamically inject content scripts if not pre-loaded, then retry extraction
   */
  function injectScriptsAndRetry(tabId) {
    const scripts = ["lib/readability.js", "lib/turndown.js", "lib/turndown-plugin-gfm.js", "content.js"];
    
    // Inject scripts sequentially
    let p = Promise.resolve();
    
    // Inject main world script first to top-level frame only
    p = p.then(() => {
      return chrome.scripting.executeScript({
        target: { tabId: tabId, frameIds: [0] },
        files: ["main_world.js"],
        world: "MAIN"
      });
    }).catch(err => {
      console.warn("Dynamic main world injection warning: ", err);
    });

    scripts.forEach(script => {
      p = p.then(() => {
        return chrome.scripting.executeScript({
          target: { tabId: tabId, frameIds: [0] },
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

          chrome.tabs.sendMessage(tabId, { action: "extractContent" }, { frameId: 0 }, (response) => {
            if (chrome.runtime.lastError) {
              showError("Could not connect to page. Refresh the page and try again.");
              return;
            }

            if (response && response.success) {
              extractedData = response;
              if (cachedProjectFiles) {
                extractedData.projectFiles = cachedProjectFiles;
              }
              loadSettings().then((settings) => {
                processAndDisplayMarkdown(extractedData, settings);
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

      currentMarkdown = markdown;
      markdownPreview.value = currentMarkdown;
      
      // Update stats counts
      const charCount = currentMarkdown.length;
      const estTokens = Math.ceil(charCount / 4);
      charCountEl.innerText = charCount.toLocaleString();
      tokenCountEl.innerText = estTokens.toLocaleString();

      const isRawMode = settings.rawMode;
      previewModeEl.innerText = isRawMode ? "Full Page Mode" : (data.readabilitySuccess ? "Article Mode" : "Raw Fallback");
      previewModeEl.style.backgroundColor = isRawMode 
        ? "rgba(139, 92, 246, 0.15)"
        : (data.readabilitySuccess ? "var(--bg-tertiary)" : "rgba(239, 68, 68, 0.1)");
      previewModeEl.style.color = isRawMode 
        ? "#a78bfa"
        : (data.readabilitySuccess ? "var(--accent-blue)" : "#ef4444");

      // Enable action buttons
      btnCopy.disabled = false;
      btnDownload.disabled = false;
      
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

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const sanitizedTitle = (appTitle || 'project')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50) || 'project';
    a.href = url;
    a.download = `${sanitizedTitle}-all-files.md`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  /**
   * Helper to display extraction/processing error in UI
   */
  function showError(msg) {
    const errorMsg = msg || "Failed to extract clean HTML content.";
    markdownPreview.value = `Error: ${errorMsg}\n\nMake sure you are on a standard web page and the page has finished loading. Extension does not run on chrome:// internal pages.`;
    charCountEl.innerText = '0';
    tokenCountEl.innerText = '0';
    btnCopy.disabled = true;
    btnDownload.disabled = true;
    if (projectBanner) projectBanner.classList.add('hidden');
    btnExtract.innerHTML = '<span class="btn-icon">⚡</span> Extract Page';
    btnExtract.disabled = false;
  }
});
