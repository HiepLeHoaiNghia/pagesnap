/**
 * Web2MD Content Script
 * Responsible for DOM extraction and page/selection conversion.
 */

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({ success: true });
  } else if (request.action === "extractContent") {
    handleExtractContentRequest(sendResponse);
  } else if (request.action === "convertSelection") {
    handleSelectionConversion();
  } else if (request.action === "convertPage") {
    handlePageConversion();
  } else if (request.action === "clonePage") {
    serializePageToSelfContainedHtml()
      .then(html => sendResponse({ success: true, html }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }
  return true; // Keep channel open for async response
});

/**
 * Handles extracting page content asynchronously, asking the main world to scan VFS first.
 */
function handleExtractContentRequest(sendResponse) {
  let responded = false;
  
  const onMainWorldMessage = (event) => {
    if (event.source === window && event.data && event.data.type === 'WEB2MD_VFS_RESPONSE') {
      if (responded) return;
      responded = true;
      window.removeEventListener('message', onMainWorldMessage);
      
      try {
        const result = extractPageContent(event.data.files);
        sendResponse(result);
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    }
  };
  
  window.addEventListener('message', onMainWorldMessage);
  
  // Post the message to trigger scanning in the main world
  window.postMessage({ type: 'WEB2MD_REQUEST_VFS_SCAN' }, '*');
  
  // Timeout in case main_world.js is not loaded or doesn't respond
  setTimeout(() => {
    if (responded) return;
    responded = true;
    window.removeEventListener('message', onMainWorldMessage);
    
    try {
      const result = extractPageContent(null);
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }, 500);
}

/**
 * Extracts clean article content using Mozilla Readability
 */
function extractPageContent(projectFiles = null) {
  // Clone DOM to prevent affecting the active page
  const docClone = document.cloneNode(true);
  
  let article = null;
  try {
    // Readability is loaded via manifest content_scripts before content.js
    if (typeof Readability !== 'undefined') {
      const reader = new Readability(docClone);
      article = reader.parse();
    }
  } catch (e) {
    console.error("Readability parsing failed: ", e);
  }

  const pageTitle = document.title || "Untitled Page";
  const pageUrl = window.location.href;
  const hasBody = document.body ? true : false;

  return {
    title: article ? (article.title || pageTitle) : pageTitle,
    content: article ? article.content : (document.body ? document.body.innerHTML : ""), // Clean article content
    rawContent: document.body ? document.body.innerHTML : "", // Full raw body HTML
    url: pageUrl,
    excerpt: article ? (article.excerpt || "") : "",
    byline: article ? (article.byline || "") : "",
    siteName: article ? (article.siteName || new URL(pageUrl).hostname) : new URL(pageUrl).hostname,
    success: hasBody,
    readabilitySuccess: article ? true : false,
    projectFiles: projectFiles || window.extractedProjectFiles || null
  };
}

/**
 * Helper to fetch settings from chrome.storage
 */
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('settings', (data) => {
      const defaults = {
        frontmatter: false,
        rawMode: false,
        includeImages: true,
        includeLinks: true,
        obsidianMode: false,
        headingStyle: 'atx',
        bulletStyle: '-',
        codeBlockStyle: 'fenced'
      };
      resolve(data.settings ? { ...defaults, ...data.settings } : defaults);
    });
  });
}

/**
 * Converts HTML string to Markdown based on current settings
 */
function htmlToMarkdown(html, metadata, settings) {
  if (typeof TurndownService === 'undefined') {
    throw new Error("TurndownService not loaded");
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

  // Use GitHub Flavored Markdown plugin if loaded
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

  // Custom code block rule with language detection
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

  // Custom image rule to strip images if disabled
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

  // Custom link rule to strip link markup if disabled or formatting as Obsidian wikilink
  turndownService.addRule('linkFilter', {
    filter: 'a',
    replacement: (content, node) => {
      const href = node.getAttribute('href');
      if (!href) return content;

      if (!settings.includeLinks) return content;

      if (settings.obsidianMode) {
        // If it's a relative/anchor link or internal wiki-style link
        if (href.startsWith('#') || !href.startsWith('http')) {
          const cleanHref = decodeURIComponent(href.replace(/^\.\//, ''));
          return `[[${cleanHref}${content && content !== cleanHref ? '|' + content : ''}]]`;
        }
      }
      
      const title = node.getAttribute('title') ? ` "${node.getAttribute('title')}"` : '';
      return `[${content}](${href}${title})`;
    }
  });

  let markdown = turndownService.turndown(html);

  // Post-processing cleaning
  markdown = markdown.replace(/\n{3,}/g, '\n\n'); // Max 2 newlines
  markdown = markdown.trim();

  // Add YAML frontmatter if enabled
  if (settings.frontmatter && metadata) {
    const fm = [
      '---',
      `title: "${metadata.title.replace(/"/g, '\\"')}"`,
      `url: ${metadata.url}`,
      `date: ${new Date().toISOString().split('T')[0]}`,
      metadata.byline ? `author: "${metadata.byline.replace(/"/g, '\\"')}"` : null,
      metadata.siteName ? `site: "${metadata.siteName.replace(/"/g, '\\"')}"` : null,
      '---',
      '',
      ''
    ].filter(val => val !== null).join('\n');
    markdown = fm + markdown;
  }

  return markdown;
}

/**
 * Handle converting selection to Markdown and copying to clipboard
 */
async function handleSelectionConversion() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || selection.toString().trim() === '') {
    showToast("⚠️ Please select text first!", true);
    return;
  }

  const range = selection.getRangeAt(0);
  const container = document.createElement('div');
  container.appendChild(range.cloneContents());
  const selectedHtml = container.innerHTML;

  try {
    const settings = await getSettings();
    const metadata = {
      title: document.title,
      url: window.location.href,
      siteName: new URL(window.location.href).hostname
    };
    
    const markdown = htmlToMarkdown(selectedHtml, metadata, settings);
    await navigator.clipboard.writeText(markdown);
    showToast("⚡ Selection copied as Markdown!");
  } catch (error) {
    console.error("Selection conversion failed: ", error);
    showToast("❌ Failed to copy selection", true);
  }
}

/**
 * Handle converting the whole page and copying to clipboard
 */
async function handlePageConversion() {
  try {
    const pageData = extractPageContent();
    const settings = await getSettings();
    
    const htmlToConvert = settings.rawMode ? pageData.rawContent : pageData.content;
    const markdown = htmlToMarkdown(htmlToConvert, pageData, settings);
    await navigator.clipboard.writeText(markdown);
    showToast("⚡ Page copied as Markdown!");
  } catch (error) {
    console.error("Page conversion failed: ", error);
    showToast("❌ Failed to copy page", true);
  }
}

/**
 * Injects a modern floating toast notification on the page
 */
function showToast(message, isWarning = false) {
  // Remove existing toast if any
  const existingToast = document.getElementById('web2md-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'web2md-toast';
  toast.innerText = message;
  
  // Custom styles for premium look
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '12px 24px',
    borderRadius: '12px',
    background: isWarning 
      ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' 
      : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    zIndex: '2147483647', // Maximum z-index
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'translateY(100px)',
    opacity: '0',
    pointerEvents: 'none',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  });

  document.body.appendChild(toast);

  // Trigger animation (reflow then style changes)
  toast.offsetHeight; // force reflow
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';

  // Fade out and remove
  setTimeout(() => {
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2500);
}

// Global variable to hold extracted project files in the page context
window.extractedProjectFiles = null;

// Listen to postMessage from the page context script
window.addEventListener('message', (event) => {
  if (event.source === window && event.data && event.data.type === 'WEB2MD_VFS_EXTRACTED') {
    window.extractedProjectFiles = event.data.files;
    try {
      chrome.runtime.sendMessage({
        action: "registerProject",
        projectFiles: event.data.files
      });
    } catch (e) {
      // Ignore extension context invalidated errors
    }
  }
});

/**
 * Serializes the entire DOM into a single, self-contained HTML page
 * with inline-replaced stylesheets, adoptedStyleSheets, and inlined images/fonts.
 */
async function serializePageToSelfContainedHtml() {
  const baseHref = window.location.href;
  const styleMap = new Map();
  const stylesheetPromises = [];

  // Helper to resolve CSS relative urls
  function resolveCssUrls(cssText, baseUrl) {
    return cssText.replace(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g, (match, url) => {
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        return match;
      }
      try {
        const absUrl = new URL(url, baseUrl).href;
        return `url("${absUrl}")`;
      } catch (e) {
        return match;
      }
    });
  }

  async function resolveStyleSheetRules(sheet, baseUrl) {
    let rulesText = '';
    try {
      if (sheet && sheet.cssRules) {
        for (let i = 0; i < sheet.cssRules.length; i++) {
          const rule = sheet.cssRules[i];
          if (rule.type === 3 && rule.styleSheet) { // CSSRule.IMPORT_RULE
            const importHref = rule.href || rule.styleSheet.href;
            if (importHref) {
              const absImportHref = new URL(importHref, baseUrl).href;
              let importedCss = '';
              try {
                importedCss = await resolveStyleSheetRules(rule.styleSheet, absImportHref);
              } catch (e) {
                // If same-origin access failed, fetch via background
                importedCss = await new Promise((resolve) => {
                  chrome.runtime.sendMessage({ action: "fetchExternalStyleSheet", url: absImportHref }, (response) => {
                    if (response && response.success) {
                      resolve(response.text);
                    } else {
                      resolve(`/* Failed to load @import from ${absImportHref} */`);
                    }
                  });
                });
              }
              if (rule.media && rule.media.mediaText) {
                rulesText += `@media ${rule.media.mediaText} {\n${importedCss}\n}\n`;
              } else {
                rulesText += importedCss + '\n';
              }
            }
          } else {
            rulesText += rule.cssText + '\n';
          }
        }
        return resolveCssUrls(rulesText, baseUrl);
      }
    } catch (e) {
      throw e;
    }
    return '';
  }

  // 1. Map each stylesheet created by an ownerNode to its resolved rules
  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    const ownerNode = sheet.ownerNode;
    if (!ownerNode) continue;

    const href = sheet.href || baseHref;
    stylesheetPromises.push(
      (async () => {
        try {
          const resolvedRules = await resolveStyleSheetRules(sheet, href);
          styleMap.set(ownerNode, resolvedRules);
        } catch (e) {
          if (sheet.href) {
            const url = sheet.href;
            await new Promise((resolve) => {
              chrome.runtime.sendMessage({ action: "fetchExternalStyleSheet", url }, (response) => {
                if (response && response.success) {
                  styleMap.set(ownerNode, resolveCssUrls(response.text, url));
                } else {
                  styleMap.set(ownerNode, `/* Failed to load styles from ${url} */`);
                }
                resolve();
              });
            });
          } else {
            styleMap.set(ownerNode, `/* Failed to access local stylesheet rules */`);
          }
        }
      })()
    );
  }

  await Promise.all(stylesheetPromises);

  // 2. Extract asset URLs (images and fonts)
  const assetUrls = new Set();

  // From <img> tags
  document.querySelectorAll('img').forEach(img => {
    if (img.src && !img.src.startsWith('data:')) {
      assetUrls.add(img.src);
    }
  });

  // From stylesheets in styleMap
  const URL_REGEX = /url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g;
  for (const [node, cssText] of styleMap.entries()) {
    let match;
    const baseUrl = node.href || baseHref;
    while ((match = URL_REGEX.exec(cssText)) !== null) {
      const url = match[1].trim();
      if (!url.startsWith('data:') && !url.startsWith('blob:')) {
        try {
          const absUrl = new URL(url, baseUrl).href;
          assetUrls.add(absUrl);
        } catch (e) {}
      }
    }
  }

  // 3. Fetch assets in parallel and convert to Base64
  const assetMap = new Map();
  const assetPromises = Array.from(assetUrls).map(url => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "fetchAssetAsBase64", url }, (response) => {
        if (response && response.success) {
          assetMap.set(url, response.dataUrl);
        }
        resolve();
      });
    });
  });

  // Set a 5 seconds max timeout for asset fetching to prevent hang
  await Promise.race([
    Promise.all(assetPromises),
    new Promise(resolve => setTimeout(resolve, 5000))
  ]);

  // 4. Inline assets in CSS rules inside styleMap
  for (const [node, cssText] of styleMap.entries()) {
    const baseUrl = node.href || baseHref;
    const inlinedCss = cssText.replace(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g, (match, url) => {
      try {
        const absUrl = new URL(url, baseUrl).href;
        if (assetMap.has(absUrl)) {
          return `url("${assetMap.get(absUrl)}")`;
        }
      } catch (e) {}
      return match;
    });
    styleMap.set(node, inlinedCss);
  }

  // 5. Serialize adoptedStyleSheets helper
  function serializeAdoptedStyleSheets(container) {
    if (container && container.adoptedStyleSheets && container.adoptedStyleSheets.length > 0) {
      let cssText = '';
      for (const sheet of container.adoptedStyleSheets) {
        try {
          cssText += Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n') + '\n';
        } catch (e) {}
      }
      if (cssText) {
        const inlined = resolveCssUrls(cssText, baseHref).replace(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g, (match, url) => {
          try {
            const absUrl = new URL(url, baseHref).href;
            if (assetMap.has(absUrl)) {
              return `url("${assetMap.get(absUrl)}")`;
            }
          } catch (e) {}
          return match;
        });
        return `<style class="web2md-adopted-styles">${inlined}</style>`;
      }
    }
    return '';
  }

  // 6. Recursively serialize DOM including Shadow DOM
  function serializeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent);
    }
    if (node.nodeType === Node.COMMENT_NODE) {
      return `<!--${node.textContent}-->`;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const tagName = node.tagName.toLowerCase();

    // Ignore script tags
    if (tagName === 'script') {
      return '';
    }

    // Convert canvas to static img
    if (tagName === 'canvas') {
      try {
        const dataUrl = node.toDataURL('image/png');
        let canvasHtml = `<img src="${dataUrl}"`;
        // Copy other attributes except style/width/height (to let it fit container)
        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i];
          if (attr.name !== 'style' && attr.name !== 'width' && attr.name !== 'height') {
            canvasHtml += ` ${attr.name}="${escapeHtml(attr.value)}"`;
          }
        }
        canvasHtml += ' />';
        return canvasHtml;
      } catch (e) {}
    }

    // In-place inline stylesheet replacement
    if (tagName === 'link' && node.getAttribute('rel') === 'stylesheet') {
      if (styleMap.has(node)) {
        return `<style id="web2md-inlined-${Math.random().toString(36).substr(2, 5)}">${styleMap.get(node)}</style>`;
      }
      // If we couldn't load rules, keep link but resolve absolute href
      const href = node.getAttribute('href');
      if (href) {
        try {
          const absHref = new URL(href, baseHref).href;
          return `<link rel="stylesheet" href="${escapeHtml(absHref)}" />`;
        } catch(e) {}
      }
      return '';
    }

    if (tagName === 'style') {
      if (styleMap.has(node)) {
        return `<style>${styleMap.get(node)}</style>`;
      }
      return `<style>${resolveCssUrls(node.textContent, baseHref)}</style>`;
    }

    let html = `<${tagName}`;

    // Serialize attributes
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      let value = attr.value;

      // Skip srcset to force img fallback to inlined src
      if (tagName === 'img' && attr.name === 'srcset') {
        continue;
      }

      // Replace image src with base64
      if (tagName === 'img' && attr.name === 'src') {
        try {
          const absSrc = new URL(value, baseHref).href;
          if (assetMap.has(absSrc)) {
            value = assetMap.get(absSrc);
          } else {
            value = absSrc;
          }
        } catch(e) {}
      }

      // Replace inline background-image url() with base64
      if (attr.name === 'style' && value.includes('url(')) {
        value = value.replace(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g, (match, url) => {
          try {
            const absUrl = new URL(url, baseHref).href;
            if (assetMap.has(absUrl)) {
              return `url("${assetMap.get(absUrl)}")`;
            }
          } catch(e) {}
          return match;
        });
      }

      // Resolve relative urls for links and other subresources
      if (['src', 'href', 'data', 'poster'].includes(attr.name) && value && !value.startsWith('data:') && !value.startsWith('blob:') && !value.startsWith('#')) {
        try {
          value = new URL(value, baseHref).href;
        } catch(e) {}
      }

      html += ` ${attr.name}="${escapeHtml(value)}"`;
    }

    // Capture dynamic state of interactive form elements
    if (tagName === 'input') {
      const type = node.getAttribute('type') ? node.getAttribute('type').toLowerCase() : 'text';
      if (['checkbox', 'radio'].includes(type)) {
        if (node.checked && !html.includes('checked')) {
          html += ' checked="checked"';
        }
      } else if (!['button', 'submit', 'reset', 'image', 'file'].includes(type)) {
        if (node.value && !html.includes('value=')) {
          html += ` value="${escapeHtml(node.value)}"`;
        }
      }
    }

    // Self-closing tags
    const selfClosing = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
    if (selfClosing.includes(tagName)) {
      return html + ' />';
    }

    html += '>';

    // Append Declarative Shadow DOM if exists
    if (node.shadowRoot) {
      html += '<template shadowrootmode="open">';
      html += serializeAdoptedStyleSheets(node.shadowRoot);
      for (let i = 0; i < node.shadowRoot.childNodes.length; i++) {
        html += serializeNode(node.shadowRoot.childNodes[i]);
      }
      html += '</template>';
    }

    // Insert document adoptedStyleSheets under the head tag
    if (tagName === 'head') {
      html += serializeAdoptedStyleSheets(document);
    }

    // Serialize child nodes or text area dynamic value
    if (tagName === 'textarea') {
      html += escapeHtml(node.value);
    } else if (tagName === 'select') {
      // For select tag, make sure selected options get their selected attribute set
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.tagName && child.tagName.toLowerCase() === 'option') {
          let optionHtml = '<option';
          for (let j = 0; j < child.attributes.length; j++) {
            const attr = child.attributes[j];
            optionHtml += ` ${attr.name}="${escapeHtml(attr.value)}"`;
          }
          if (child.selected) {
            optionHtml += ' selected="selected"';
          }
          optionHtml += `>${escapeHtml(child.textContent)}</option>`;
          html += optionHtml;
        } else {
          html += serializeNode(child);
        }
      }
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        html += serializeNode(node.childNodes[i]);
      }
    }

    html += `</${tagName}>`;
    return html;
  }

  // Helper to escape HTML characters
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return serializeNode(document.documentElement);
}
