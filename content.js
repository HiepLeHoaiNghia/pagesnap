/**
 * Web2MD Content Script
 * Responsible for DOM extraction and page/selection conversion.
 */

// Listen for messages from popup or background script
let isVisualEditActive = false;
let isInspectActive = false;
let isRegionSelectionActive = false;
let lastHoveredElement = null;
let currentSelectedElement = null;
let selectionHistory = [];
let lastRightClickedElement = null;

// Track the last right-clicked element for the context menu
document.addEventListener("contextmenu", (e) => {
  lastRightClickedElement = e.target;
}, true);

// Inject custom region CSS rules once
(function injectRegionStyles() {
  const id = "web2md-region-select-styles";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    .web2md-region-highlighted {
      outline: 2px dashed #8b5cf6 !important;
      outline-offset: -2px !important;
      cursor: crosshair !important;
    }
  `;
  document.documentElement.appendChild(style);
})();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({ success: true });
  } else if (request.action === "getVisualEditState") {
    sendResponse({ active: isVisualEditActive });
  } else if (request.action === "toggleVisualEdit") {
    toggleVisualEditMode(request.enabled);
    sendResponse({ success: true, active: isVisualEditActive });
  } else if (request.action === "getRegionSelectionState") {
    sendResponse({ active: isRegionSelectionActive });
  } else if (request.action === "toggleRegionSelection") {
    toggleRegionSelectionMode(request.enabled);
    sendResponse({ success: true, active: isRegionSelectionActive });
  } else if (request.action === "contextMenuCopyRegion") {
    if (lastRightClickedElement) {
      handleRegionAction(lastRightClickedElement, request.format);
    } else {
      showToast("❌ No element selected to copy", true);
    }
    sendResponse({ success: true });
  } else if (request.action === "getInspectState") {
    sendResponse({ active: isInspectActive });
  } else if (request.action === "toggleInspect") {
    isInspectActive = request.enabled;
    if (isInspectActive) {
      if (isRegionSelectionActive) {
        toggleRegionSelectionMode(false);
      }
      if (isVisualEditActive) {
        toggleVisualEditMode(false);
      }
    }
    window.postMessage({ type: 'WEB2MD_TOGGLE_INSPECT', enabled: request.enabled }, '*');
    sendResponse({ success: true, active: isInspectActive });
  } else if (request.action === "getApiCalls") {
    getApiCallsFromMainWorld().then(calls => {
      sendResponse({ success: true, apiCalls: calls });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep channel open for async response
  } else if (request.action === "updateApiCall") {
    window.postMessage({ type: 'WEB2MD_UPDATE_API_CALL', index: request.index, updatedCall: request.updatedCall }, '*');
    sendResponse({ success: true });
  } else if (request.action === "deleteApiCall") {
    window.postMessage({ type: 'WEB2MD_DELETE_API_CALL', index: request.index }, '*');
    sendResponse({ success: true });
  } else if (request.action === "syncMocks") {
    window.postMessage({ type: 'WEB2MD_SET_MOCKS', mocks: request.mocks }, '*');
    sendResponse({ success: true });
  } else if (request.action === "syncMockingEnabled") {
    window.postMessage({ type: 'WEB2MD_SET_MOCKING_ENABLED', enabled: request.enabled }, '*');
    sendResponse({ success: true });
  } else if (request.action === "extractContent") {
    handleExtractContentRequest(sendResponse);
  } else if (request.action === "convertSelection") {
    handleSelectionConversion();
  } else if (request.action === "convertPage") {
    handlePageConversion();
  } else if (request.action === "clonePage") {
    serializePageToSelfContainedHtml({ preserveJs: request.preserveJs, apiCalls: request.apiCalls || [] })
      .then(res => sendResponse({ success: true, html: res.html, package: res.package }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  } else if (request.action === "convertHtmlToMarkdown") {
    try {
      const markdown = htmlToMarkdown(request.html, request.metadata, request.settings);
      sendResponse({ success: true, markdown: markdown });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
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
 * Synchronizes current values of input, select, textarea elements from original DOM to cloned DOM
 */
function syncFormValues(originalDoc, clonedNode) {
  const clonedInputs = Array.from(clonedNode.querySelectorAll('input, select, textarea'));
  clonedInputs.forEach(clone => {
    let orig = null;
    if (clone.id) {
      orig = originalDoc.getElementById(clone.id);
    }
    if (!orig) return;
    
    if (orig.tagName === 'INPUT') {
      const type = (orig.getAttribute('type') || '').toLowerCase();
      if (type === 'checkbox' || type === 'radio') {
        clone.checked = orig.checked;
        if (orig.checked) {
          clone.setAttribute('checked', 'checked');
        } else {
          clone.removeAttribute('checked');
        }
      } else {
        clone.value = orig.value;
        clone.setAttribute('value', orig.value);
      }
    } else if (orig.tagName === 'TEXTAREA') {
      clone.value = orig.value;
      clone.textContent = orig.value;
    } else if (orig.tagName === 'SELECT') {
      clone.selectedIndex = orig.selectedIndex;
      const origOptions = orig.options;
      const cloneOptions = clone.options;
      if (origOptions && cloneOptions) {
        const minOpts = Math.min(origOptions.length, cloneOptions.length);
        for (let j = 0; j < minOpts; j++) {
          if (origOptions[j].selected) {
            cloneOptions[j].setAttribute('selected', 'selected');
          } else {
            cloneOptions[j].removeAttribute('selected');
          }
        }
      }
    }
  });
}

/**
 * Preprocesses all form controls globally in the cloned DOM, replacing them with static text representations
 */
function preProcessFormControls(rootNode, originalDoc) {
  const doc = rootNode.ownerDocument || rootNode;
  const candidates = Array.from(rootNode.querySelectorAll('input, select, textarea, button, .x-btn, .x-form-item-label, label'));
  
  candidates.forEach(el => {
    if (!el.parentNode) return;
    
    // Ignore hidden inputs
    if (el.tagName === 'INPUT' && el.getAttribute('type') === 'hidden') {
      el.parentNode.removeChild(el);
      return;
    }
    
    // Check if element is hidden by style
    let parent = el;
    let isHidden = false;
    while (parent && parent !== rootNode) {
      const styleAttr = parent.getAttribute && parent.getAttribute('style') || '';
      if (styleAttr.includes('display: none') || styleAttr.includes('display:none') || 
          styleAttr.includes('visibility: hidden') || styleAttr.includes('visibility:hidden')) {
        isHidden = true;
        break;
      }
      parent = parent.parentNode;
    }
    if (isHidden) {
      el.parentNode.removeChild(el);
      return;
    }
    
    let replacementText = '';
    
    if (el.tagName === 'BUTTON' || el.classList.contains('x-btn')) {
      const btnText = el.textContent.trim();
      if (el.querySelector('[class*="plus"]') || btnText === '+') {
        replacementText = '[ + ]';
      } else if (el.querySelector('[class*="close"]') || el.querySelector('[class*="remove"]') || btnText === 'x' || btnText === '×') {
        replacementText = '[ ✖ ]';
      } else {
        replacementText = `[ ${btnText || 'Button'} ]`;
      }
    } 
    else if (el.tagName === 'LABEL' || el.classList.contains('x-form-item-label')) {
      const labelText = el.textContent.replace(/:$/, '').trim();
      if (labelText) {
        const strongEl = doc.createElement('strong');
        strongEl.textContent = labelText + ': ';
        el.parentNode.replaceChild(strongEl, el);
        return;
      } else {
        el.parentNode.removeChild(el);
        return;
      }
    } 
    else if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
      const type = el.getAttribute('type') ? el.getAttribute('type').toLowerCase() : 'text';
      
      if (type === 'checkbox' || type === 'radio') {
        const isChecked = el.checked || el.hasAttribute('checked');
        replacementText = isChecked ? '[x]' : '[ ]';
      } else if (type === 'password') {
        replacementText = '[ •••••• ]';
      } else {
        let val = el.value || el.getAttribute('value') || '';
        const isSelect = el.tagName === 'SELECT' || 
                         el.getAttribute('role') === 'combobox' || 
                         el.classList.contains('x-form-combobox') ||
                         (el.closest('.x-field') && el.closest('.x-field').querySelector('[class*="trigger"]') !== null);
                         
        if (isSelect) {
          let selectedText = val;
          let optionsList = [];
          
          if (el.tagName === 'SELECT') {
            if (el.selectedIndex >= 0 && el.options[el.selectedIndex]) {
              selectedText = el.options[el.selectedIndex].text.trim();
            }
            optionsList = Array.from(el.options || []).map(opt => opt.text.trim());
          } else {
            const comboId = el.id || '';
            let pickerEl = null;
            if (comboId && originalDoc) {
              const pickerId = comboId.replace('-inputEl', '').replace('-input', '') + '-picker';
              pickerEl = originalDoc.getElementById(pickerId) || originalDoc.querySelector(`[id*="${comboId.replace('-inputEl', '').replace('-input', '')}"]`);
            }
            if (!pickerEl && el.getAttribute('aria-owns') && originalDoc) {
              pickerEl = originalDoc.getElementById(el.getAttribute('aria-owns'));
            }
            if (pickerEl) {
              const items = pickerEl.querySelectorAll('.x-boundlist-item, .x-combo-list-item, [role="option"], li');
              optionsList = Array.from(items).map(item => item.textContent.trim()).filter(Boolean);
            }
            if (optionsList.length === 0 && originalDoc) {
              const activeLists = originalDoc.querySelectorAll('.x-boundlist:not([style*="display: none"]), .x-combo-list:not([style*="display: none"])');
              if (activeLists.length === 1) {
                const items = activeLists[0].querySelectorAll('.x-boundlist-item, .x-combo-list-item, [role="option"]');
                optionsList = Array.from(items).map(item => item.textContent.trim()).filter(Boolean);
              }
            }
          }
          
          if (optionsList.length > 0) {
            replacementText = `[ ${selectedText || ' '} ▾ ] (${optionsList.join(' | ')})`;
          } else {
            replacementText = `[ ${selectedText || ' '} ▾ ]`;
          }
        } else {
          replacementText = `[ ${val || '    '} ]`;
        }
      }
    }
    
    if (replacementText) {
      const spanEl = doc.createElement('span');
      spanEl.textContent = replacementText;
      el.parentNode.replaceChild(spanEl, el);
    }
  });
}

/**
 * Full preprocessing pipeline to apply to DOM tree before Readability/Turndown conversion
 */
function preProcessDOMForConversion(clonedNode, originalDoc) {
  try {
    syncFormValues(originalDoc, clonedNode);
  } catch (e) {
    console.error("syncFormValues failed:", e);
  }
  try {
    // Step 1: Identify and mark layout tables bottom-up
    const tables = Array.from(clonedNode.querySelectorAll('table'));
    tables.reverse().forEach(table => {
      if (isLayoutTable(table)) {
        table.setAttribute('data-web2md-layout-table', 'true');
      }
    });
  } catch (e) {
    console.error("Marking layout tables failed:", e);
  }
  try {
    // Step 2: Process form controls globally in-place
    preProcessFormControls(clonedNode, originalDoc);
  } catch (e) {
    console.error("preProcessFormControls failed:", e);
  }
  try {
    // Step 3: Flatten layout tables
    preProcessLayoutTables(clonedNode);
  } catch (e) {
    console.error("preProcessLayoutTables failed:", e);
  }
}

/**
 * Helper to check if a table is used for form layout rather than displaying data
 */
function isLayoutTable(table) {
  // If it has th headers, it's a data table
  if (table.querySelector('th') !== null) {
    return false;
  }

  // Check for common data-grid or data-table class names or attributes on the table itself
  const classStr = (table.getAttribute('class') || '').toLowerCase();
  const idStr = (table.id || '').toLowerCase();
  const gridClasses = [
    'x-grid-table', 'x-grid-view', 'x-grid-body', 'x-grid-row', 'x-grid-header-ct', 'x-grid-inner',
    'x-data-grid', 'data-grid', 'data-table', 'grid-table', 'gridview', 'datagrid'
  ];
  if (gridClasses.some(cls => classStr.includes(cls) || idStr.includes(cls))) {
    return false;
  }

  // If it contains any child elements that have grid-related classes, it's probably a data table wrapper
  if (table.querySelector('[class*="x-grid-table"], [class*="x-grid-view"], [class*="x-grid-row"], [class*="data-grid"], [class*="grid-table"]')) {
    return false;
  }

  // If it contains nested tables that are NOT layout tables
  const nestedTables = Array.from(table.querySelectorAll('table')).filter(t => t !== table);
  const hasNestedDataTables = nestedTables.some(t => t.getAttribute('data-web2md-layout-table') !== 'true');
  if (hasNestedDataTables) {
    return false;
  }

  // Row/column structure:
  // Data grids usually have many columns, or columns that contain data.
  // Layout tables usually have a simple key-value structure, with at most 3 columns (e.g., Label, Field, Help/Error).
  const directRows = Array.from(table.querySelectorAll('tr')).filter(tr => tr.closest('table') === table);
  if (directRows.length > 0) {
    let hasMoreThanThreeCols = false;
    for (const row of directRows) {
      const cols = Array.from(row.querySelectorAll('td')).filter(td => td.closest('tr') === row);
      if (cols.length > 3) {
        hasMoreThanThreeCols = true;
        break;
      }
    }
    if (hasMoreThanThreeCols) {
      return false; // More than 3 columns in a row suggests a data grid, not a layout table
    }

    // Tighten conditions for tables with more than 3 rows to avoid falsely flattening data tables/matrices
    if (directRows.length > 3) {
      // Check for label presence (form layouts usually have labels/form-item-labels in most rows)
      let labelCount = 0;
      directRows.forEach(row => {
        if (row.querySelector('label, .x-form-item-label, .x-form-cb-label, strong')) {
          labelCount++;
        }
      });
      // If less than half of the rows have labels, it's likely a data grid/matrix
      if (labelCount < directRows.length / 2) {
        return false;
      }

      // Check for repetitive checkbox/radio/input matrix structures
      let firstRowColCount = -1;
      let sameColCount = true;
      let inputRowCount = 0;
      
      for (const row of directRows) {
        const cols = Array.from(row.querySelectorAll('td')).filter(td => td.closest('tr') === row);
        if (cols.length > 0) {
          if (firstRowColCount === -1) {
            firstRowColCount = cols.length;
          } else if (cols.length !== firstRowColCount) {
            sameColCount = false;
          }
          if (row.querySelector('input, select, textarea')) {
            inputRowCount++;
          }
        }
      }
      
      // If all rows have the same column count (>1) and almost all rows contain inputs (like a checkbox matrix),
      // it is a data table, not a layout table.
      if (sameColCount && firstRowColCount > 1 && inputRowCount > directRows.length * 0.7) {
        return false;
      }
    }
  }

  // A layout table should contain form elements (labels, fields, buttons)
  const inputs = table.querySelectorAll('input, select, textarea, button, .x-btn, .x-form-item-label, label');
  if (inputs.length === 0) {
    return false;
  }

  // Default fallback: if it has inputs, no headers, <= 3 columns, and doesn't look like a grid, it's a layout table.
  return true;
}

/**
 * Preprocesses form layout tables at DOM level into paragraphs with alignment
 */
function preProcessLayoutTables(rootNode) {
  const tables = Array.from(rootNode.querySelectorAll('table[data-web2md-layout-table="true"]'));
  const doc = rootNode.ownerDocument || rootNode;
  
  // Process bottom-up to handle nested tables
  tables.reverse().forEach(table => {
    const directRows = Array.from(table.querySelectorAll('tr')).filter(tr => tr.closest('table') === table);
    
    let maxCol0Len = 0;
    const rowInfo = [];
    
    directRows.forEach(row => {
      const cols = Array.from(row.querySelectorAll('td')).filter(td => td.closest('tr') === row);
      
      // Filter active columns that have content or form controls
      const activeCols = cols.filter(col => {
        let parent = col;
        let isHidden = false;
        while (parent && parent !== table) {
          const styleAttr = parent.getAttribute && parent.getAttribute('style') || '';
          if (styleAttr.includes('display: none') || styleAttr.includes('display:none') || 
              styleAttr.includes('visibility: hidden') || styleAttr.includes('visibility:hidden')) {
            isHidden = true;
            break;
          }
          parent = parent.parentNode;
        }
        if (isHidden) return false;
        return col.textContent.trim().length > 0 || col.querySelector('input, select, textarea, button, img, a, span, strong, del, s, strike') !== null;
      });
      
      if (activeCols.length > 0) {
        rowInfo.push({ row, cols: activeCols });
        if (activeCols.length > 1) {
          const len = activeCols[0].textContent.trim().length;
          if (len > maxCol0Len) {
            maxCol0Len = len;
          }
        }
      }
    });
    
    const replacementPara = doc.createElement('p');
    replacementPara.className = 'web2md-processed-form-layout';
    
    let addedRow = false;
    rowInfo.forEach(({ row, cols }) => {
      if (addedRow) {
        replacementPara.appendChild(doc.createElement('br'));
      }
      
      cols.forEach((col, colIdx) => {
        if (colIdx > 0) {
          // Separator between columns
          replacementPara.appendChild(doc.createTextNode('\u00A0\u00A0'));
        }
        
        // If it is the first column and there are other columns, pad it
        if (colIdx === 0 && cols.length > 1) {
          const textLen = col.textContent.trim().length;
          const paddingLen = maxCol0Len - textLen;
          
          while (col.firstChild) {
            replacementPara.appendChild(col.firstChild);
          }
          if (paddingLen > 0) {
            replacementPara.appendChild(doc.createTextNode('\u00A0'.repeat(paddingLen)));
          }
        } else {
          // Just move all children
          while (col.firstChild) {
            replacementPara.appendChild(col.firstChild);
          }
        }
      });
      
      addedRow = true;
    });
    
    if (addedRow) {
      table.parentNode.replaceChild(replacementPara, table);
    } else {
      // If table is completely empty/hidden, just remove it
      table.parentNode.removeChild(table);
    }
  });
}

/**
 * Extracts clean article content using Mozilla Readability
 */
function extractPageContent(projectFiles = null) {
  // Clone DOM to prevent affecting the active page
  const docClone = document.cloneNode(true);
  
  try {
    preProcessDOMForConversion(docClone, document);
  } catch (err) {
    console.error("DOM pre-processing failed: ", err);
  }
  
  let article = null;
  let useRaw = false;
  try {
    // Readability is loaded via manifest content_scripts before content.js
    if (typeof Readability !== 'undefined') {
      const reader = new Readability(docClone);
      article = reader.parse();
      
      if (article) {
        const articleText = article.textContent ? article.textContent.trim() : "";
        const originalText = docClone.body ? docClone.body.innerText.trim() : "";
        
        // Heuristic: If Readability stripped out almost the entire page (less than 15% text remaining or < 200 chars remaining while original page is large),
        // we fallback to raw HTML representation to avoid losing important dashboard/application data.
        if (originalText.length > 500 && (articleText.length < 200 || (articleText.length / originalText.length) < 0.15)) {
          useRaw = true;
        }
      } else {
        useRaw = true;
      }
    } else {
      useRaw = true;
    }
  } catch (e) {
    console.error("Readability parsing failed: ", e);
    useRaw = true;
  }

  const pageTitle = document.title || "Untitled Page";
  const pageUrl = window.location.href;
  const hasBody = document.body ? true : false;
  const visibleTextLength = document.body ? document.body.innerText.trim().length : 0;

  // Pre-extract visible form content for fallback (only if page is complex enough to need it)
  let visibleText = null;
  if (useRaw && visibleTextLength > 500) {
    try {
      visibleText = extractVisibleFormContent();
    } catch (e) {
      console.error("extractVisibleFormContent failed:", e);
    }
  }

  return {
    title: article ? (article.title || pageTitle) : pageTitle,
    content: (article && !useRaw) ? article.content : (docClone.body ? docClone.body.innerHTML : ""), // Clean article content
    rawContent: docClone.body ? docClone.body.innerHTML : "", // Full raw body HTML
    visibleText: visibleText, // Fallback: structured visible text for complex web apps
    visibleTextLength: visibleTextLength, // Length of body.innerText for ratio check
    url: pageUrl,
    excerpt: article ? (article.excerpt || "") : "",
    byline: article ? (article.byline || "") : "",
    siteName: article ? (article.siteName || new URL(pageUrl).hostname) : new URL(pageUrl).hostname,
    success: hasBody,
    readabilitySuccess: (article && !useRaw) ? true : false,
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

  // Rule to ignore elements marked for deletion/suppression
  turndownService.addRule('ignoreProcessed', {
    filter: (node) => node.getAttribute && node.getAttribute('data-web2md-ignore') === 'true',
    replacement: () => ''
  });

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

  // Custom image rule to strip images if disabled and filter transparent/spacer images
  turndownService.addRule('imageFilter', {
    filter: 'img',
    replacement: (content, node) => {
      if (!settings.includeImages) return '';
      const src = node.getAttribute('src') || '';
      const width = node.getAttribute('width') || '';
      const height = node.getAttribute('height') || '';
      
      // Filter out transparent 1x1 base64 GIFs/PNGs and tiny spacer pixels
      if (!src || src.includes('data:image/gif;base64,R0lGODlhAQABA') || src.includes('data:image/png;base64,iVBORw0KGgoAAA') || width === '1' || height === '1') {
        return '';
      }
      
      const alt = node.getAttribute('alt') || 'image';
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

  // Custom table rule to handle data grids (headerless or normal) and form layouts
  turndownService.addRule('tableFilter', {
    filter: 'table',
    replacement: (content, node) => {
      // 1. Detect if it is a layout table containing inputs
      if (isLayoutTable(node)) {
        // Let's get the direct rows of this table
        const directRows = Array.from(node.querySelectorAll('tr')).filter(tr => tr.closest('table') === node);
        
        const formatNodeInline = (el) => {
          // Ignore hidden inputs
          if (el.tagName === 'INPUT' && el.getAttribute('type') === 'hidden') {
            return null;
          }
          
          // Ignore elements hidden by inline style on themselves or parents
          let parent = el;
          while (parent && parent !== node) {
            const styleAttr = parent.getAttribute('style') || '';
            if (styleAttr.includes('display: none') || styleAttr.includes('display:none') || 
                styleAttr.includes('visibility: hidden') || styleAttr.includes('visibility:hidden')) {
              return null;
            }
            parent = parent.parentElement;
          }

          if (el.tagName === 'BUTTON' || el.classList.contains('x-btn')) {
            const btnText = el.textContent.trim();
            if (el.querySelector('[class*="plus"]') || btnText === '+') return '[ + ]';
            if (el.querySelector('[class*="close"]') || el.querySelector('[class*="remove"]') || btnText === 'x' || btnText === '×') return '[ ✖ ]';
            return `[ ${btnText || 'Button'} ]`;
          }
          
          if (el.tagName === 'LABEL' || el.classList.contains('x-form-item-label')) {
            return `**${el.textContent.replace(/:$/, '').trim()}**:`;
          }
          
          if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
            const type = el.getAttribute('type') ? el.getAttribute('type').toLowerCase() : 'text';
            if (type === 'checkbox' || type === 'radio') {
              return el.checked ? '[x]' : '[ ]';
            }
            const val = el.value || el.getAttribute('value') || '';
            const isSelect = el.tagName === 'SELECT' || 
                             el.getAttribute('role') === 'combobox' || 
                             el.classList.contains('x-form-combobox') ||
                             (el.closest('.x-field') && el.closest('.x-field').querySelector('[class*="trigger"]') !== null);
            if (isSelect) {
              let selectedText = val;
              let optionsList = [];
              
              if (el.tagName === 'SELECT') {
                if (el.selectedIndex >= 0 && el.options[el.selectedIndex]) {
                  selectedText = el.options[el.selectedIndex].text.trim();
                }
                optionsList = Array.from(el.options).map(opt => opt.text.trim());
              } else {
                // Query live DOM for custom combobox options
                const realEl = el.id ? document.getElementById(el.id) : null;
                const targetEl = realEl || el;
                if (targetEl.value) {
                  selectedText = targetEl.value;
                } else if (targetEl.getAttribute('value')) {
                  selectedText = targetEl.getAttribute('value');
                } else {
                  selectedText = targetEl.textContent.trim();
                }
                
                const comboId = targetEl.id || '';
                let pickerEl = null;
                if (comboId) {
                  const pickerId = comboId.replace('-inputEl', '').replace('-input', '') + '-picker';
                  pickerEl = document.getElementById(pickerId) || document.querySelector(`[id*="${comboId.replace('-inputEl', '').replace('-input', '')}"]`);
                }
                if (!pickerEl) {
                  const ariaOwns = targetEl.getAttribute('aria-owns') || targetEl.getAttribute('aria-controls');
                  if (ariaOwns) {
                    pickerEl = document.getElementById(ariaOwns);
                  }
                }
                if (pickerEl) {
                  const items = pickerEl.querySelectorAll('.x-boundlist-item, .x-combo-list-item, [role="option"], li');
                  optionsList = Array.from(items).map(item => item.textContent.trim()).filter(Boolean);
                }
                if (optionsList.length === 0) {
                  const activeLists = document.querySelectorAll('.x-boundlist:not([style*="display: none"]), .x-combo-list:not([style*="display: none"])');
                  if (activeLists.length === 1) {
                    const items = activeLists[0].querySelectorAll('.x-boundlist-item, .x-combo-list-item, [role="option"]');
                    optionsList = Array.from(items).map(item => item.textContent.trim()).filter(Boolean);
                  }
                }
              }
              
              if (optionsList.length > 0) {
                return `[ ${selectedText || ' '} ▾ ] (${optionsList.join(' | ')})`;
              }
              return `[ ${selectedText || ' '} ▾ ]`;
            }
            return `[ ${val || '    '} ]`;
          }
          
          return null;
        };

        const getLeafNodes = (root) => {
          const leaves = [];
          const walk = (n) => {
            if (n.nodeType === 3) { // Text Node
              if (n.textContent.trim()) {
                leaves.push(n);
              }
              return;
            }
            if (n.nodeType === 1) { // Element Node
              const tagName = n.tagName;
              if (tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA' || tagName === 'BUTTON' || 
                  n.classList.contains('x-btn') || n.classList.contains('x-form-item-label') || tagName === 'LABEL') {
                leaves.push(n);
                return;
              }
              n.childNodes.forEach(walk);
            }
          };
          root.childNodes.forEach(walk);
          return leaves;
        };

        const rowsCols = [];
        directRows.forEach(row => {
          const cols = Array.from(row.querySelectorAll('td')).filter(td => td.closest('tr') === row);
          const colTexts = [];
          
          cols.forEach(col => {
            // Check if this column contains a nested table
            const nestedTable = col.querySelector('table');
            if (nestedTable) {
              // Recursively convert the nested table using the same rule logic, but strip newlines so it stays inline!
              const nestedMarkdown = turndownService.turndown(nestedTable.outerHTML).trim();
              if (nestedMarkdown) {
                colTexts.push(nestedMarkdown.replace(/\n+/g, ' '));
              }
            } else {
              // No nested table: format the contents of this column inline
              const leaves = getLeafNodes(col);
              if (leaves.length > 0) {
                const formattedItems = [];
                leaves.forEach(leaf => {
                  if (leaf.nodeType === 3) {
                    const txt = leaf.textContent.trim();
                    if (txt) {
                      formattedItems.push({ type: 'text', value: txt, text: txt });
                    }
                  } else {
                    const formatted = formatNodeInline(leaf);
                    if (formatted) {
                      formattedItems.push({ type: 'interactive', value: formatted, text: (leaf.value || leaf.textContent || '').trim() });
                    } else {
                      const txt = leaf.textContent.trim();
                      if (txt) {
                        formattedItems.push({ type: 'text', value: txt, text: txt });
                      }
                    }
                  }
                });
                
                // Deduplicate items in this column
                const filteredItems = [];
                formattedItems.forEach((item, idx) => {
                  if (item.type === 'text') {
                    const isDuplicate = formattedItems.some((other, oIdx) => {
                      if (other.type === 'interactive') {
                        const val = (other.text || '').trim();
                        return val.includes(item.text) || item.text.includes(val);
                      }
                      if (other.type === 'text' && oIdx < idx) {
                        return other.text === item.text;
                      }
                      return false;
                    });
                    if (isDuplicate) return;
                  } else {
                    const isDuplicate = formattedItems.some((other, oIdx) => {
                      return other.type === 'interactive' && oIdx < idx && other.value === item.value;
                    });
                    if (isDuplicate) return;
                  }
                  filteredItems.push(item.value);
                });
                
                if (filteredItems.length > 0) {
                  colTexts.push(filteredItems.join(' '));
                }
              }
            }
          });
          
          if (colTexts.length > 0) {
            rowsCols.push(colTexts);
          }
        });
        
        // Find max length of Col 0 for rows with >= 2 columns
        let maxCol0Len = 0;
        rowsCols.forEach(cols => {
          if (cols.length > 1) {
            const col0Len = cols[0].length;
            if (col0Len > maxCol0Len) {
              maxCol0Len = col0Len;
            }
          }
        });
        
        let tableText = '';
        rowsCols.forEach(cols => {
          if (cols.length > 1) {
            const paddedCol0 = cols[0] + ' '.repeat(maxCol0Len - cols[0].length);
            tableText += [paddedCol0, ...cols.slice(1)].join('  ') + '\n';
          } else if (cols.length === 1) {
            tableText += cols[0] + '\n';
          }
        });
        
        return '\n\n' + tableText.trim() + '\n\n';
      }

      // 2. Data table formatting into clean Markdown tables
      const rows = Array.from(node.querySelectorAll('tr'));
      if (rows.length === 0) return '';

      let maxCols = 0;
      let hasRealThHeader = false;
      const tableData = [];

      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('th, td')).map(cell => {
          return cell.textContent.replace(/\s+/g, ' ').replace(/\xa0/g, ' ').trim();
        });
        
        // Filter out completely empty rows (sizers)
        if (cells.length === 0 || cells.every(cell => cell === '')) {
          return;
        }

        if (cells.length > maxCols) maxCols = cells.length;
        
        // Check if this row actually has a th element (meaning it's a header row)
        if (row.querySelector('th') !== null) {
          hasRealThHeader = true;
        }

        tableData.push(cells);
      });

      if (tableData.length === 0) return '';

      let markdownTable = '\n\n';
      let headers = [];
      let startIdx = 0;

      if (hasRealThHeader) {
        headers = tableData[0];
        startIdx = 1;
        if (headers.length > maxCols) {
          headers = headers.slice(0, maxCols);
        } else {
          while (headers.length < maxCols) {
            headers.push('');
          }
        }
      } else {
        let headerTexts = [];
        let foundHeaders = false;

        // Helper to extract texts from a header container
        const extractTexts = (container) => {
          let cells = Array.from(container.querySelectorAll('.x-column-header-text'));
          if (cells.length === 0) {
            cells = Array.from(container.querySelectorAll('.x-column-header'));
          }
          if (cells.length === 0) {
            cells = Array.from(container.querySelectorAll('th, td'));
          }
          return cells.map(c => c.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
        };

        // 1. Try to find header container in the temporary parsed tree (so we can also ignore it)
        let tempParent = node.parentElement;
        let tempHeaderContainer = null;
        while (tempParent) {
          tempHeaderContainer = tempParent.querySelector('.x-grid-header-container, [class*="header-container"], [class*="grid-header"], thead');
          if (tempHeaderContainer && tempHeaderContainer !== node.querySelector('thead')) {
            break;
          }
          tempParent = tempParent.parentElement;
        }

        if (tempHeaderContainer) {
          headerTexts = extractTexts(tempHeaderContainer);
          if (headerTexts.length > 0) {
            headers = headerTexts;
            foundHeaders = true;
            tempHeaderContainer.setAttribute('data-web2md-ignore', 'true');
          }
        }

        // 2. Fallback: If not found in temporary tree, find the corresponding real node in live DOM
        if (!foundHeaders) {
          const getRealElement = (tempNode) => {
            if (!tempNode) return null;
            if (tempNode.id) {
              const real = document.getElementById(tempNode.id);
              if (real) return real;
            }
            if (tempNode.className) {
              const selector = tempNode.tagName.toLowerCase() + '.' + Array.from(tempNode.classList).join('.');
              try {
                const candidates = Array.from(document.querySelectorAll(selector));
                if (candidates.length === 1) return candidates[0];
                for (const cand of candidates) {
                  if (cand.textContent.trim().substring(0, 50) === tempNode.textContent.trim().substring(0, 50)) {
                    return cand;
                  }
                }
              } catch (e) {}
            }
            return null;
          };

          const realNode = getRealElement(node);
          if (realNode) {
            let liveParent = realNode.parentElement;
            let liveHeaderContainer = null;
            while (liveParent && liveParent !== document.body) {
              liveHeaderContainer = liveParent.querySelector('.x-grid-header-container, [class*="header-container"], [class*="grid-header"], thead');
              if (liveHeaderContainer && liveHeaderContainer !== realNode.querySelector('thead')) {
                break;
              }
              liveParent = liveParent.parentElement;
            }

            if (liveHeaderContainer) {
              headerTexts = extractTexts(liveHeaderContainer);
              if (headerTexts.length > 0) {
                headers = headerTexts;
                foundHeaders = true;
              }
            }
          }
        }

        if (foundHeaders) {
          if (headers.length > maxCols) {
            headers = headers.slice(0, maxCols);
          } else {
            while (headers.length < maxCols) {
              headers.push('');
            }
          }
          
          // Check if headers match the first row in tableData
          let headersMatchFirstRow = false;
          if (tableData.length > 0) {
            const firstRowNormalized = tableData[0].map(c => c.toLowerCase());
            const headersNormalized = headers.map(c => c.toLowerCase());
            headersMatchFirstRow = (firstRowNormalized.length === headersNormalized.length) &&
                                   firstRowNormalized.every((val, idx) => val === headersNormalized[idx]);
          }
          if (headersMatchFirstRow) {
            startIdx = 1;
          } else {
            startIdx = 0;
          }
        } else {
          headers = Array(maxCols).fill('');
          startIdx = 0;
        }
      }

      markdownTable += '| ' + headers.map(h => h || ' ').join(' | ') + ' |\n';
      markdownTable += '| ' + Array(maxCols).fill('---').join(' | ') + ' |\n';
      
      for (let i = startIdx; i < tableData.length; i++) {
        const row = tableData[i];
        while (row.length < maxCols) row.push('');
        markdownTable += '| ' + row.map(cell => cell || ' ').join(' | ') + ' |\n';
      }
      
      return markdownTable + '\n';
    }
  });

  // Parse the input HTML string into a temporary DOM tree for preprocessing
  let preprocessedHtml = html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Look for all tables inside the parsed tree
    const tables = doc.querySelectorAll('table');
    tables.forEach(table => {
      // Find if there's an external header container in the parsed tree
      let parent = table.parentElement;
      let headerContainer = null;
      while (parent) {
        headerContainer = parent.querySelector('.x-grid-header-container, [class*="header-container"], [class*="grid-header"]');
        if (headerContainer && !table.contains(headerContainer)) {
          break;
        }
        parent = parent.parentElement;
      }
      
      if (headerContainer) {
        headerContainer.setAttribute('data-web2md-ignore', 'true');
      }
    });

    // Flag loaders, masks, and loading messages
    const allElements = doc.querySelectorAll('*');
    allElements.forEach(el => {
      const cls = el.className || '';
      const id = el.id || '';
      const text = el.textContent ? el.textContent.trim() : '';
      
      if (
        text === 'Loading...' || 
        (typeof cls === 'string' && (cls.includes('x-mask') || cls.includes('loading') || cls.includes('loadmask'))) ||
        (typeof id === 'string' && (id.includes('mask') || id.includes('loading')))
      ) {
        el.setAttribute('data-web2md-ignore', 'true');
      }
    });
    
    preprocessedHtml = doc.body.innerHTML;
  } catch (e) {
    console.error("Error preprocessing HTML for Turndown:", e);
  }

  let markdown = turndownService.turndown(preprocessedHtml);

  // Post-processing cleaning
  markdown = markdown.replace(/\xa0/g, ' '); // Convert non-breaking spaces to standard spaces
  markdown = markdown.replace(/^[ \t]+$/gm, ''); // Strip trailing/empty line spaces
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
  try {
    preProcessDOMForConversion(container, document);
  } catch (err) {
    console.error("Selection DOM pre-processing failed: ", err);
  }
  const selectedHtml = container.innerHTML;

  try {
    const settings = await getSettings();
    const metadata = {
      title: document.title,
      url: window.location.href,
      siteName: new URL(window.location.href).hostname
    };
    
    const markdown = htmlToMarkdown(selectedHtml, metadata, settings);
    await copyTextToClipboard(markdown);
    showToast("⚡ Selection copied as Markdown!");
  } catch (error) {
    console.error("Selection conversion failed: ", error);
    showToast("❌ Failed to copy selection", true);
  }
}

/**
 * Extracts visible text content from the live DOM, preserving form field values.
 * Used as a fallback when Turndown produces too little content from complex web app pages.
 */
function extractVisibleFormContent() {
  const lines = [];
  const seen = new Set();
  
  const isVisible = (el) => {
    if (!el || el.nodeType !== 1) return true;
    try {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    } catch (e) {}
    return true;
  };
  
  const addLine = (text, allowDupe) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!allowDupe && seen.has(trimmed)) return;
    seen.add(trimmed);
    lines.push(trimmed);
  };

  const walkNode = (node, depth) => {
    if (depth > 100) return; // ExtJS DOMs can be 50+ levels deep
    if (node.nodeType === 1) {
      if (!isVisible(node)) return;
      const tag = node.tagName;
      const cls = (typeof node.className === 'string') ? node.className : '';
      
      // Skip non-content elements
      if (['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'LINK', 'META', 'HEAD'].includes(tag)) return;
      // Skip ExtJS masks/loading overlays
      if (cls.includes('x-mask') || cls.includes('x-load-mask') || cls.includes('x-splitter')) return;
      
      // Headings
      if (/^H[1-6]$/.test(tag)) {
        const text = node.textContent.trim();
        if (text) {
          const level = parseInt(tag[1]);
          addLine('#'.repeat(level) + ' ' + text);
        }
        return;
      }
      
      // Labels
      if (tag === 'LABEL' || cls.includes('x-form-item-label')) {
        const text = node.textContent.replace(/:$/, '').trim();
        if (text) addLine('**' + text + '**: ', true);
        return;
      }
      
      // ExtJS display fields (read-only text values)
      if (cls.includes('x-form-display-field')) {
        const text = node.textContent.trim();
        if (text) addLine(text, true);
        return;
      }
      
      // Buttons
      if (tag === 'BUTTON' || (tag === 'A' && cls.includes('x-btn')) || (tag === 'DIV' && cls.includes('x-btn'))) {
        const text = node.textContent.trim();
        if (text && text.length < 100) addLine('[ ' + text + ' ]');
        return;
      }
      
      // Tab headers
      if (cls.includes('x-tab') && !cls.includes('x-tab-bar') && !cls.includes('x-tabpanel')) {
        const text = node.textContent.trim();
        if (text && text.length < 100) addLine('### ' + text);
        return;
      }
      
      // Tree nodes
      if (cls.includes('x-tree-node-text') || cls.includes('x-grid-cell-inner')) {
        const text = node.textContent.trim();
        if (text) addLine('- ' + text, true);
        return;
      }
      
      // Form inputs
      if (tag === 'INPUT') {
        const type = (node.getAttribute('type') || 'text').toLowerCase();
        if (type === 'hidden') return;
        if (type === 'checkbox' || type === 'radio') {
          // Try to find associated label
          const formItem = node.closest('.x-form-item, .x-field');
          const label = formItem ? formItem.querySelector('.x-form-item-label, label') : null;
          const labelText = label ? label.textContent.replace(/:$/, '').trim() : '';
          const prefix = labelText ? labelText + ': ' : '';
          addLine(prefix + (node.checked ? '[x]' : '[ ]'), true);
        } else if (type === 'password') {
          addLine('[ •••••• ]', true);
        } else {
          const val = node.value || '';
          const role = node.getAttribute('role') || '';
          const isCombo = role === 'combobox' || cls.includes('x-form-combobox') || cls.includes('x-trigger-noedit');
          if (isCombo) {
            // Try to find label
            const formItem = node.closest('.x-form-item, .x-field');
            const label = formItem ? formItem.querySelector('.x-form-item-label, label') : null;
            const labelText = label ? label.textContent.replace(/:$/, '').trim() : '';
            const prefix = labelText ? labelText + ': ' : '';
            addLine(prefix + '[ ' + (val || ' ') + ' ▾ ]', true);
          } else if (val) {
            addLine('[ ' + val + ' ]', true);
          }
        }
        return;
      }
      
      if (tag === 'SELECT') {
        const selected = node.selectedIndex >= 0 && node.options[node.selectedIndex] 
          ? node.options[node.selectedIndex].text.trim() : '';
        addLine('[ ' + (selected || ' ') + ' ▾ ]', true);
        return;
      }
      
      if (tag === 'TEXTAREA') {
        if (node.value) addLine('[ ' + node.value + ' ]', true);
        return;
      }
      
      // Recurse into children
      for (const child of node.childNodes) {
        walkNode(child, depth + 1);
      }
    } else if (node.nodeType === 3) {
      // Text node
      const text = node.textContent.trim();
      if (text && text.length > 0 && text.length < 500) {
        if (isVisible(node.parentElement)) {
          addLine(text, true);
        }
      }
    }
  };
  
  walkNode(document.body, 0);
  return lines.join('\n');
}

/**
 * Handle converting the whole page and copying to clipboard
 */
async function handlePageConversion() {
  try {
    const pageData = extractPageContent();
    const settings = await getSettings();
    
    const htmlToConvert = settings.rawMode ? pageData.rawContent : pageData.content;
    let markdown = htmlToMarkdown(htmlToConvert, pageData, settings);
    
    // Fallback: if Turndown produced very little content compared to visible page text,
    // use direct visible text extraction (critical for complex web apps like ExtJS)
    const visibleTextLength = document.body ? document.body.innerText.trim().length : 0;
    // Strip frontmatter to measure actual content length
    const contentOnly = markdown.replace(/^---[\s\S]*?---\s*/, '').trim();
    if (visibleTextLength > 500 && contentOnly.length < visibleTextLength * 0.15) {
      console.warn('[Web2MD] Turndown produced too little content (' + contentOnly.length + ' chars vs ' + visibleTextLength + ' visible chars). Using visible text fallback.');
      const fallbackContent = extractVisibleFormContent();
      if (fallbackContent.length > contentOnly.length) {
        // Re-add frontmatter if enabled
        if (settings.frontmatter) {
          const fm = [
            '---',
            `title: "${pageData.title.replace(/"/g, '\\"')}"`,
            `url: ${pageData.url}`,
            `date: ${new Date().toISOString().split('T')[0]}`,
            pageData.siteName ? `site: "${pageData.siteName.replace(/"/g, '\\"')}"` : null,
            '---',
            '',
            ''
          ].filter(val => val !== null).join('\n');
          markdown = fm + fallbackContent;
        } else {
          markdown = fallbackContent;
        }
      }
    }
    
    await copyTextToClipboard(markdown);
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
  if (event.source === window && event.data) {
    if (event.data.type === 'WEB2MD_VFS_EXTRACTED') {
      window.extractedProjectFiles = event.data.files;
      try {
        chrome.runtime.sendMessage({
          action: "registerProject",
          projectFiles: event.data.files
        });
      } catch (e) {
        // Ignore extension context invalidated errors
      }
    } else if (event.data.type === 'WEB2MD_INSPECT_MODE_DISABLED') {
      isInspectActive = false;
    } else if (event.data.type === 'WEB2MD_UPDATE_MOCK_SAVE') {
      try {
        chrome.runtime.sendMessage({
          action: "saveMockFromWeb",
          mock: event.data.mock
        });
      } catch (e) {
        // Ignore extension context invalidated errors
      }
    }
  }
});

/**
 * Serializes the entire DOM into a single, self-contained HTML page
 * with inline-replaced stylesheets, adoptedStyleSheets, and inlined images/fonts.
 */
async function serializePageToSelfContainedHtml(options = {}) {
  const preserveJs = !!options.preserveJs;
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

  // Helper to map CSS URLs based on a mapper function (e.g. mapping to base64 or local paths)
  function mapCssUrls(cssText, baseUrl, urlMapper) {
    return cssText.replace(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g, (match, url) => {
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        return match;
      }
      try {
        const absUrl = new URL(url, baseUrl).href;
        const mapped = urlMapper(absUrl);
        if (mapped) {
          return `url("${mapped}")`;
        }
      } catch (e) {}
      return match;
    });
  }

  // Helper to get correct file extension from dataurl or file URL
  function getAssetExtension(url, dataUrl) {
    if (dataUrl && dataUrl.startsWith('data:')) {
      const mime = dataUrl.split(';')[0].split(':')[1];
      if (mime) {
        const parts = mime.split('/');
        if (parts[1]) {
          const extMap = {
            'svg+xml': 'svg',
            'javascript': 'js',
            'typescript': 'ts',
            'plain': 'txt',
            'x-icon': 'ico',
            'vnd.microsoft.icon': 'ico',
          };
          return extMap[parts[1]] || parts[1];
        }
      }
    }
    try {
      const pathname = new URL(url).pathname;
      const ext = pathname.split('.').pop();
      if (ext && ext.length < 5 && /^[a-zA-Z0-9]+$/.test(ext)) {
        return ext;
      }
    } catch (e) {}
    return 'png'; // default fallback
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

  // 2. Fetch API cache if preserveJs is active
  let apiCache = [];
  if (preserveJs) {
    apiCache = options.apiCalls || [];
  }

  // 3. Fetch/Inline Scripts if preserveJs is active
  const scriptContentMap = new Map();
  const scriptPromises = [];
  const TRACKER_REGEX = /google-analytics\.com|googletagmanager\.com|sentry\.io|mixpanel\.com|facebook\.net|doubleclick\.net|hotjar\.com|amplitude\.com|browser\.sentry-cdn\.com/i;

  if (preserveJs) {
    document.querySelectorAll('script').forEach(script => {
      const src = script.getAttribute('src');
      if (src) {
        try {
          const absUrl = new URL(src, baseHref).href;
          if (!TRACKER_REGEX.test(absUrl)) {
            scriptPromises.push(
              new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: "fetchExternalScript", url: absUrl }, (response) => {
                  if (response && response.success) {
                    scriptContentMap.set(script, response.text);
                  } else {
                    scriptContentMap.set(script, `/* Failed to load external script: ${absUrl} */`);
                  }
                  resolve();
                });
              })
            );
          } else {
            scriptContentMap.set(script, null); // Skip tracker
          }
        } catch (e) {
          scriptContentMap.set(script, `/* Failed to resolve URL: ${src} */`);
        }
      } else {
        const inlineText = script.textContent || '';
        if (!TRACKER_REGEX.test(inlineText)) {
          scriptContentMap.set(script, inlineText);
        } else {
          scriptContentMap.set(script, null); // Skip tracker
        }
      }
    });

    await Promise.race([
      Promise.all(scriptPromises),
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);
  }

  // 4. Extract asset URLs (images and fonts)
  const assetUrls = new Set();

  // From <img> tags
  const assetScope = options.targetElement || document;
  assetScope.querySelectorAll('img').forEach(img => {
    if (img.src && !img.src.startsWith('data:')) {
      assetUrls.add(img.src);
    }
  });
  if (options.targetElement && options.targetElement.tagName && options.targetElement.tagName.toLowerCase() === 'img') {
    if (options.targetElement.src && !options.targetElement.src.startsWith('data:')) {
      assetUrls.add(options.targetElement.src);
    }
  }

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

  // 5. Fetch assets in parallel and convert to Base64
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

  // Generate mapping from original asset URL to their local filename for structured mode
  const assetPathMap = new Map(); // originalUrl -> "assets/asset_N.ext"
  let assetCounter = 0;
  for (const [url, dataUrl] of assetMap.entries()) {
    const ext = getAssetExtension(url, dataUrl);
    const filename = `assets/asset_${assetCounter++}.${ext}`;
    assetPathMap.set(url, filename);
  }

  // Assemble global CSS for structured mode
  let globalCss = '';
  for (const [node, cssText] of styleMap.entries()) {
    if (node.getRootNode() === document) {
      globalCss += `/* StyleSheet: ${node.tagName.toLowerCase()}${node.id ? '#' + node.id : ''} */\n`;
      globalCss += mapCssUrls(cssText, node.href || baseHref, (absUrl) => assetPathMap.get(absUrl)) + '\n\n';
    }
  }
  if (document.adoptedStyleSheets && document.adoptedStyleSheets.length > 0) {
    let adoptedCss = '';
    for (const sheet of document.adoptedStyleSheets) {
      try {
        adoptedCss += Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n') + '\n';
      } catch (e) {}
    }
    if (adoptedCss) {
      globalCss += `/* Adopted Document StyleSheet */\n`;
      globalCss += mapCssUrls(resolveCssUrls(adoptedCss, baseHref), baseHref, (absUrl) => assetPathMap.get(absUrl)) + '\n\n';
    }
  }

  // Assemble global JS for structured mode
  let globalJs = '';
  if (preserveJs) {
    globalJs += generateMockInterceptorCode() + '\n\n';
    document.querySelectorAll('script').forEach(script => {
      if (script.getRootNode() === document) {
        if (scriptContentMap.has(script)) {
          const content = scriptContentMap.get(script);
          if (content) {
            const src = script.getAttribute('src');
            globalJs += `// --- Script: ${src || 'Inline'} ---\n`;
            globalJs += content + '\n\n';
          }
        }
      }
    });
  }

  // 6. Adopted stylesheets serialization helper
  function serializeAdoptedStyleSheets(container, isStructured) {
    if (isStructured && container === document) {
      return ''; // In structured mode, document adopted sheets go to styles.css
    }
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
            const mapped = isStructured ? assetPathMap.get(absUrl) : assetMap.get(absUrl);
            if (mapped) {
              return `url("${mapped}")`;
            }
          } catch (e) {}
          return match;
        });
        return `<style class="web2md-adopted-styles">${inlined}</style>`;
      }
    }
    return '';
  }

  function generateMockInterceptorCode() {
    return `
(function() {
  const apiCache = ${JSON.stringify(apiCache)};
  
  function matchUrl(reqUrl) {
    try {
      const parsedReq = new URL(reqUrl, window.location.href);
      const reqPath = parsedReq.origin + parsedReq.pathname;
      
      for (const entry of apiCache) {
        try {
          const parsedCache = new URL(entry.url, window.location.href);
          const cachePath = parsedCache.origin + parsedCache.pathname;
          if (reqPath === cachePath) {
            return entry;
          }
        } catch(e) {}
      }
    } catch(e) {}
    
    for (const entry of apiCache) {
      if (reqUrl.includes(entry.url) || entry.url.includes(reqUrl)) {
        return entry;
      }
    }
    return null;
  }

  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    let url = '';
    let method = 'GET';
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else if (input && typeof input === 'object' && 'url' in input) {
      url = input.url;
      method = input.method || 'GET';
    }
    if (init && init.method) {
      method = init.method;
    }
    
    const matched = matchUrl(url);
    if (matched) {
      console.log('[Web2MD Mock Fetch] Intercepted:', url);
      const responseText = matched.responseText || '';
      return new Response(responseText, {
        status: matched.status || 200,
        statusText: matched.statusText || 'OK',
        headers: new Headers(matched.responseHeaders || {})
      });
    }
    
    console.log('[Web2MD Mock Fetch] Request not in cache, falling back to network:', url);
    return originalFetch.apply(this, arguments);
  };

  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    let matchedEntry = null;
    let requestMethod = 'GET';
    let requestUrl = '';

    const originalOpen = xhr.open;
    xhr.open = function(method, url, ...rest) {
      requestMethod = method.toUpperCase();
      requestUrl = url;
      matchedEntry = matchUrl(url);
      if (matchedEntry) {
        Object.defineProperties(xhr, {
          status: {
            get: () => matchedEntry.status || 200,
            configurable: true
          },
          statusText: {
            get: () => matchedEntry.statusText || 'OK',
            configurable: true
          },
          responseText: {
            get: () => matchedEntry.responseText || '',
            configurable: true
          },
          response: {
            get: () => {
              const text = matchedEntry.responseText || '';
              if (xhr.responseType === 'json') {
                try { return JSON.parse(text); } catch (e) { return null; }
              }
              return text;
            },
            configurable: true
          },
          readyState: {
            get: () => 4,
            configurable: true
          },
          getAllResponseHeaders: {
            value: () => {
              if (!matchedEntry.responseHeaders) return '';
              return Object.entries(matchedEntry.responseHeaders)
                .map(([k, v]) => k + ': ' + v)
                .join('\r\n');
            },
            configurable: true
          },
          getResponseHeader: {
            value: (header) => {
              if (!matchedEntry.responseHeaders) return null;
              return matchedEntry.responseHeaders[header.toLowerCase()] || null;
            },
            configurable: true
          }
        });
      }
      return originalOpen.apply(this, [method, url, ...rest]);
    };

    const originalSend = xhr.send;
    xhr.send = function(body) {
      if (matchedEntry) {
        console.log('[Web2MD Mock XHR] Intercepted:', requestUrl);
        setTimeout(() => {
          if (xhr.onreadystatechange) xhr.onreadystatechange();
          if (xhr.onload) xhr.onload();
          xhr.dispatchEvent(new Event('load'));
          xhr.dispatchEvent(new Event('readystatechange'));
        }, 1);
      } else {
        return originalSend.apply(this, arguments);
      }
    };

    return xhr;
  };
  window.XMLHttpRequest.prototype = originalXHR.prototype;
  Object.keys(originalXHR).forEach(key => {
    window.XMLHttpRequest[key] = originalXHR[key];
  });

  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    console.log('[Web2MD Mock WebSocket] Blocked connection to:', url);
    const self = this;
    this.url = url;
    this.readyState = 1;
    this.send = function(data) {
      console.log('[Web2MD Mock WebSocket] Sent data:', data);
    };
    this.close = function() {
      self.readyState = 3;
      if (self.onclose) self.onclose({ wasClean: true, code: 1000, reason: 'Offline Mode' });
    };
    setTimeout(() => {
      if (self.onopen) self.onopen();
    }, 1);
  };
  window.WebSocket.prototype = originalWebSocket.prototype;
  window.WebSocket.CONNECTING = 0;
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSING = 2;
  window.WebSocket.CLOSED = 3;

  const originalEventSource = window.EventSource;
  window.EventSource = function(url, configuration) {
    console.log('[Web2MD Mock EventSource] Blocked connection to:', url);
    this.url = url;
    this.readyState = 1;
    this.close = function() {
      this.readyState = 2;
    };
  };
  window.EventSource.prototype = originalEventSource.prototype;
  window.EventSource.CONNECTING = 0;
  window.EventSource.OPEN = 1;
  window.EventSource.CLOSED = 2;
})();
`;
  }

  // 7. Recursively serialize DOM including Shadow DOM
  function serializeNode(node, isStructured) {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent);
    }
    if (node.nodeType === Node.COMMENT_NODE) {
      return `<!--${node.textContent}-->`;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    if (node.getAttribute && node.getAttribute('data-web2md-ignore') === 'true') {
      return '';
    }
    if (node.id && node.id.startsWith('web2md-')) {
      return '';
    }
    if (node.classList && (node.classList.contains('web2md-highlight-overlay') || node.classList.contains('web2md-outline-overlay'))) {
      return '';
    }

    const tagName = node.tagName.toLowerCase();

    // Ignore or inline script tags
    if (tagName === 'script') {
      if (preserveJs) {
        if (isStructured) {
          // In structured mode, main document scripts go to scripts.js
          if (node.getRootNode() === document) {
            return '';
          }
          // Inside shadow root, keep inline script to preserve context/scoping
          if (scriptContentMap.has(node)) {
            const content = scriptContentMap.get(node);
            if (content === null) return '';
            const safeContent = content.replace(/<\/script>/gi, '<\\/script>');
            return `<script>${safeContent}</script>`;
          }
        } else {
          // Self-contained mode
          if (scriptContentMap.has(node)) {
            const content = scriptContentMap.get(node);
            if (content === null) return '';
            const safeContent = content.replace(/<\/script>/gi, '<\\/script>');
            return `<script>${safeContent}</script>`;
          }
        }
      }
      return '';
    }

    // Convert canvas to static img
    if (tagName === 'canvas') {
      try {
        const dataUrl = node.toDataURL('image/png');
        let srcVal = dataUrl;
        if (isStructured) {
          const filename = `assets/canvas_${Math.random().toString(36).substr(2, 5)}.png`;
          assetMap.set(filename, dataUrl);
          assetPathMap.set(filename, filename);
          srcVal = filename;
        }
        let canvasHtml = `<img src="${srcVal}"`;
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
        if (isStructured && node.getRootNode() === document) {
          return ''; // Omit from HTML (goes to styles.css)
        }
        // Inside shadow root or self-contained mode, inline the resolved CSS rules
        const cssRules = styleMap.get(node);
        const resolvedCss = mapCssUrls(cssRules, node.href || baseHref, (absUrl) => {
          return isStructured ? assetPathMap.get(absUrl) : assetMap.get(absUrl);
        });
        return `<style id="web2md-inlined-${Math.random().toString(36).substr(2, 5)}">${resolvedCss}</style>`;
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
      if (node.id === 'web2md-visual-edit-styles') {
        return '';
      }
      if (isStructured && node.getRootNode() === document) {
        return ''; // Omit from HTML (goes to styles.css)
      }
      let cssRules = '';
      if (styleMap.has(node)) {
        cssRules = styleMap.get(node);
      } else {
        cssRules = node.textContent;
      }
      const resolvedCss = mapCssUrls(cssRules, baseHref, (absUrl) => {
        return isStructured ? assetPathMap.get(absUrl) : assetMap.get(absUrl);
      });
      return `<style>${resolvedCss}</style>`;
    }

    let html = `<${tagName}`;

    // Serialize attributes
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      let value = attr.value;

      // Clean up our visual edit hover/highlight classes if present
      if (attr.name === 'class') {
        value = value.replace(/\b(web2md-hover-active|web2md-region-highlighted)\b/g, '').trim();
        if (!value) continue;
      }

      // Skip srcset to force img fallback to inlined src
      if (tagName === 'img' && attr.name === 'srcset') {
        continue;
      }

      // Replace image src
      if (tagName === 'img' && attr.name === 'src') {
        try {
          const absSrc = new URL(value, baseHref).href;
          if (isStructured) {
            value = assetPathMap.get(absSrc) || absSrc;
          } else {
            value = assetMap.get(absSrc) || absSrc;
          }
        } catch(e) {}
      }

      // Replace inline background-image url()
      if (attr.name === 'style' && value.includes('url(')) {
        value = value.replace(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g, (match, url) => {
          try {
            const absUrl = new URL(url, baseHref).href;
            const mapped = isStructured ? assetPathMap.get(absUrl) : assetMap.get(absUrl);
            if (mapped) {
              return `url("${mapped}")`;
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
      html += serializeAdoptedStyleSheets(node.shadowRoot, isStructured);
      for (let i = 0; i < node.shadowRoot.childNodes.length; i++) {
        html += serializeNode(node.shadowRoot.childNodes[i], isStructured);
      }
      html += '</template>';
    }

    // Insert stylesheet reference or script references under the head tag
    if (tagName === 'head') {
      if (isStructured) {
        html += '<link rel="stylesheet" href="styles.css" />';
        if (preserveJs) {
          html += '<script src="scripts.js" defer></script>';
        }
      } else {
        html += serializeAdoptedStyleSheets(document, false);
        if (preserveJs) {
          html += `<script id="web2md-api-mock-db">${generateMockInterceptorCode()}</script>`;
        }
      }
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
          html += serializeNode(child, isStructured);
        }
      }
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        html += serializeNode(node.childNodes[i], isStructured);
      }
    }

    html += `</${tagName}>`;
    return html;
  }

  // Helper to escape HTML characters
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  let selfContainedHtml, structuredHtml;
  if (options.targetElement) {
    const serializedSelfContainedNode = serializeNode(options.targetElement, false);
    const serializedStructuredNode = serializeNode(options.targetElement, true);
    
    const headSelfContained = `
  <meta charset="UTF-8" />
  <title>${escapeHtml(document.title)} - Region</title>
  ${serializeAdoptedStyleSheets(document, false)}
  ${Array.from(styleMap.entries()).map(([node, cssText]) => {
    const href = node.href || baseHref;
    const resolvedCss = mapCssUrls(cssText, href, (absUrl) => assetMap.get(absUrl));
    return `<style>${resolvedCss}</style>`;
  }).join('\n')}
  ${preserveJs ? `<script id="web2md-api-mock-db">${generateMockInterceptorCode()}</script>` : ''}
  ${preserveJs ? Array.from(scriptContentMap.entries()).map(([script, content]) => {
    if (content === null) return '';
    const safeContent = content.replace(/<\/script>/gi, '<\\/script>');
    return `<script>${safeContent}</script>`;
  }).join('\n') : ''}
`;
    
    selfContainedHtml = `<!DOCTYPE html>
<html>
<head>
${headSelfContained}
</head>
<body>
  ${serializedSelfContainedNode}
</body>
</html>`;

    const headStructured = `
  <meta charset="UTF-8" />
  <title>${escapeHtml(document.title)} - Region</title>
  <link rel="stylesheet" href="styles.css" />
  ${preserveJs ? '<script src="scripts.js" defer></script>' : ''}
`;
    
    structuredHtml = `<!DOCTYPE html>
<html>
<head>
${headStructured}
</head>
<body>
  ${serializedStructuredNode}
</body>
</html>`;
  } else {
    selfContainedHtml = serializeNode(document.documentElement, false);
    structuredHtml = serializeNode(document.documentElement, true);
  }

  const packageAssets = [];
  for (const [url, dataUrl] of assetMap.entries()) {
    const filename = assetPathMap.get(url) || url;
    packageAssets.push({
      path: filename,
      dataUrl: dataUrl
    });
  }

  return {
    html: selfContainedHtml,
    nodeHtml: options.targetElement ? serializedSelfContainedNode : selfContainedHtml,
    package: {
      html: structuredHtml,
      css: globalCss,
      js: globalJs,
      assets: packageAssets
    }
  };
}

/**
 * Visual Edit Mode Implementation
 */
function toggleVisualEditMode(enabled) {
  isVisualEditActive = !!enabled;
  
  if (isVisualEditActive) {
    if (isRegionSelectionActive) {
      toggleRegionSelectionMode(false);
    }
    document.designMode = "on";
    
    // 1. Inject styling if not already present
    let styleEl = document.getElementById('web2md-visual-edit-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'web2md-visual-edit-styles';
      styleEl.textContent = `
        .web2md-hover-active {
          outline: 1px dashed #3b82f6 !important;
          cursor: text !important;
        }
      `;
      document.head.appendChild(styleEl);
    }
    
    // 2. Add event listeners
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleLinkClick, true);
    document.addEventListener('dblclick', handleImageDblClick, true);
    
    showToast("🎨 Visual Edit Mode enabled!");
  } else {
    document.designMode = "off";
    
    // Remove styling element
    const styleEl = document.getElementById('web2md-visual-edit-styles');
    if (styleEl) {
      styleEl.remove();
    }
    
    // Remove any leftover hover class from elements
    document.querySelectorAll('.web2md-hover-active').forEach(el => {
      el.classList.remove('web2md-hover-active');
    });
    
    // Remove event listeners
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('click', handleLinkClick, true);
    document.removeEventListener('dblclick', handleImageDblClick, true);
    
    showToast("🎨 Visual Edit Mode disabled.");
  }
}

function handleMouseOver(e) {
  if (!isVisualEditActive) return;
  const el = e.target;
  if (el && el !== document.body && el !== document.documentElement && !el.closest('#web2md-toast')) {
    el.classList.add('web2md-hover-active');
  }
}

function handleMouseOut(e) {
  const el = e.target;
  if (el) {
    el.classList.remove('web2md-hover-active');
  }
}

function handleLinkClick(e) {
  if (!isVisualEditActive) return;
  const anchor = e.target.closest('a');
  if (anchor) {
    e.preventDefault();
    e.stopPropagation();
    showToast("Link click blocked in Edit Mode");
  }
}

function handleImageDblClick(e) {
  if (!isVisualEditActive) return;
  if (e.target.tagName === 'IMG') {
    e.preventDefault();
    e.stopPropagation();
    const newSrc = prompt("Enter new image URL:", e.target.src);
    if (newSrc !== null && newSrc.trim() !== '') {
      e.target.src = newSrc.trim();
      showToast("Image source updated!");
    }
  }
}

/**
 * Helper to fetch captured XHR/Fetch API calls from main world context
 */
function getApiCallsFromMainWorld() {
  return new Promise((resolve) => {
    const onApiMessage = (event) => {
      if (event.source === window && event.data && event.data.type === 'WEB2MD_API_CALLS_RESPONSE') {
        window.removeEventListener('message', onApiMessage);
        resolve(event.data.apiCalls || []);
      }
    };
    window.addEventListener('message', onApiMessage);
    window.postMessage({ type: 'WEB2MD_REQUEST_API_CALLS' }, '*');
    setTimeout(() => {
      window.removeEventListener('message', onApiMessage);
      resolve([]);
    }, 500);
  });
}

/**
 * Region Selection Mode Helpers and Logic
 */
/**
 * Region Selection Mode Helpers and Logic
 */
function toggleRegionSelectionMode(forceValue) {
  const enabled = forceValue !== undefined ? forceValue : !isRegionSelectionActive;
  isRegionSelectionActive = enabled;
  
  if (enabled) {
    if (isVisualEditActive) {
      toggleVisualEditMode(false);
    }
    if (isInspectActive) {
      isInspectActive = false;
      window.postMessage({ type: 'WEB2MD_TOGGLE_INSPECT', enabled: false }, '*');
    }
    
    document.addEventListener("mouseover", handleRegionMouseOver, true);
    document.addEventListener("mouseout", handleRegionMouseOut, true);
    document.addEventListener("click", handleRegionClick, true);
    document.addEventListener("keydown", handleRegionKeyDown, true);
    
    showToast("🎯 Selection mode active. Click any element to select. Press Esc to cancel.");
  } else {
    document.removeEventListener("mouseover", handleRegionMouseOver, true);
    document.removeEventListener("mouseout", handleRegionMouseOut, true);
    document.removeEventListener("click", handleRegionClick, true);
    document.removeEventListener("keydown", handleRegionKeyDown, true);
    
    if (lastHoveredElement) {
      lastHoveredElement.classList.remove("web2md-region-highlighted");
      lastHoveredElement = null;
    }
  }
}

function handleRegionKeyDown(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    toggleRegionSelectionMode(false);
    showToast("🎯 Selection mode cancelled.");
  }
}

function handleRegionMouseOver(e) {
  if (!isRegionSelectionActive) return;
  if (e.target.closest("#web2md-region-actions-bar") || e.target.closest("#web2md-toast")) {
    return;
  }
  if (lastHoveredElement && lastHoveredElement !== e.target) {
    lastHoveredElement.classList.remove("web2md-region-highlighted");
  }
  lastHoveredElement = e.target;
  lastHoveredElement.classList.add("web2md-region-highlighted");
}

function handleRegionMouseOut(e) {
  if (!isRegionSelectionActive) return;
  if (lastHoveredElement === e.target) {
    lastHoveredElement.classList.remove("web2md-region-highlighted");
    lastHoveredElement = null;
  }
}

function handleRegionClick(e) {
  if (!isRegionSelectionActive) return;
  if (e.target.closest("#web2md-region-actions-bar") || e.target.closest("#web2md-toast")) {
    return;
  }
  
  e.preventDefault();
  e.stopPropagation();
  
  const target = e.target;
  toggleRegionSelectionMode(false);
  highlightElement(target);
  showRegionActionsBar(target);
}

function highlightElement(element) {
  document.querySelectorAll(".web2md-region-highlighted").forEach(el => {
    el.classList.remove("web2md-region-highlighted");
  });
  if (element) {
    element.classList.add("web2md-region-highlighted");
  }
}

function getElementDescription(el) {
  if (!el) return '';
  let desc = el.tagName.toLowerCase();
  if (el.id) {
    desc += `#${el.id}`;
  } else if (el.className) {
    const firstClass = el.className.split(/\s+/)[0];
    if (firstClass && typeof firstClass === 'string' && !firstClass.startsWith('web2md')) {
      desc += `.${firstClass}`;
    }
  }
  return desc;
}

function showRegionActionsBar(element) {
  currentSelectedElement = element;
  selectionHistory = [];
  
  let bar = document.getElementById("web2md-region-actions-bar");
  if (bar) bar.remove();
  
  bar = document.createElement("div");
  bar.id = "web2md-region-actions-bar";
  
  Object.assign(bar.style, {
    position: 'absolute',
    background: 'rgba(17, 24, 39, 0.95)',
    backdropFilter: 'blur(8px)',
    border: '1px solid #374151',
    borderRadius: '12px',
    padding: '8px 16px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
    zIndex: '2147483647',
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: '12px',
    color: '#f3f4f6',
    transition: 'top 0.2s ease, left 0.2s ease'
  });
  
  document.body.appendChild(bar);
  renderActionsBarContents(bar);
}

function renderActionsBarContents(bar) {
  bar.innerHTML = "";
  
  const element = currentSelectedElement;
  if (!element) return;
  
  const rect = element.getBoundingClientRect();
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
  
  let top = rect.top + scrollTop - 55;
  if (top < scrollTop) {
    top = rect.bottom + scrollTop + 10;
  }
  let left = rect.left + scrollLeft;
  
  if (left + 450 > window.innerWidth + scrollLeft) {
    left = window.innerWidth + scrollLeft - 470;
  }
  if (left < scrollLeft) left = scrollLeft + 10;
  
  bar.style.top = `${top}px`;
  bar.style.left = `${left}px`;
  
  const label = document.createElement("span");
  label.innerText = `[${getElementDescription(element)}]`;
  label.style.color = '#8b5cf6';
  label.style.fontWeight = 'bold';
  label.style.marginRight = '4px';
  bar.appendChild(label);
  
  const navGroup = document.createElement("div");
  navGroup.style.display = "flex";
  navGroup.style.gap = "4px";
  navGroup.style.marginRight = "8px";
  
  const expandBtn = document.createElement("button");
  expandBtn.innerText = "🔼 Expand";
  expandBtn.title = "Select parent container";
  styleNavButton(expandBtn);
  
  const parent = element.parentElement;
  if (parent && parent !== document.documentElement && parent !== document.body) {
    expandBtn.addEventListener('click', () => {
      selectionHistory.push(element);
      currentSelectedElement = parent;
      highlightElement(parent);
      renderActionsBarContents(bar);
    });
  } else {
    expandBtn.disabled = true;
    expandBtn.style.opacity = "0.4";
    expandBtn.style.cursor = "not-allowed";
  }
  navGroup.appendChild(expandBtn);
  
  const shrinkBtn = document.createElement("button");
  shrinkBtn.innerText = "🔽 Shrink";
  shrinkBtn.title = "Go back to nested child";
  styleNavButton(shrinkBtn);
  
  if (selectionHistory.length > 0) {
    shrinkBtn.addEventListener('click', () => {
      const prev = selectionHistory.pop();
      currentSelectedElement = prev;
      highlightElement(prev);
      renderActionsBarContents(bar);
    });
  } else {
    shrinkBtn.disabled = true;
    shrinkBtn.style.opacity = "0.4";
    shrinkBtn.style.cursor = "not-allowed";
  }
  navGroup.appendChild(shrinkBtn);
  
  bar.appendChild(navGroup);
  
  const sep = document.createElement("span");
  sep.style.width = "1px";
  sep.style.height = "16px";
  sep.style.background = "#374151";
  sep.style.margin = "0 4px";
  bar.appendChild(sep);
  
  const buttons = [
    { text: "📝 Copy MD", action: () => handleRegionAction(element, "markdown") },
    { text: "🌐 Copy HTML", action: () => handleRegionAction(element, "html") },
    { text: "📥 HTML", title: "Download self-contained HTML page", action: () => handleRegionAction(element, "download-html") },
    { text: "📦 ZIP", title: "Download structured zip package", action: () => handleRegionAction(element, "download-zip") }
  ];
  
  buttons.forEach(btnInfo => {
    const btn = document.createElement("button");
    btn.innerText = btnInfo.text;
    if (btnInfo.title) btn.title = btnInfo.title;
    
    Object.assign(btn.style, {
      background: 'transparent',
      border: '1px solid #374151',
      borderRadius: '6px',
      color: '#f3f4f6',
      padding: '4px 8px',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: '600',
      transition: 'all 0.15s ease'
    });
    
    btn.addEventListener('mouseover', () => {
      btn.style.background = '#8b5cf6';
      btn.style.borderColor = '#8b5cf6';
      btn.style.color = '#ffffff';
    });
    
    btn.addEventListener('mouseout', () => {
      btn.style.background = 'transparent';
      btn.style.borderColor = '#374151';
      btn.style.color = '#f3f4f6';
    });
    
    btn.addEventListener('click', () => {
      btnInfo.action();
      highlightElement(null);
      bar.remove();
    });
    
    bar.appendChild(btn);
  });
  
  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✕";
  Object.assign(closeBtn.style, {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: '14px',
    marginLeft: '6px',
    padding: '0 4px'
  });
  closeBtn.addEventListener('click', () => {
    highlightElement(null);
    bar.remove();
  });
  bar.appendChild(closeBtn);
}

function styleNavButton(btn) {
  Object.assign(btn.style, {
    background: 'rgba(55, 65, 81, 0.5)',
    border: '1px solid #4b5563',
    borderRadius: '6px',
    color: '#e5e7eb',
    padding: '4px 6px',
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: '600',
    transition: 'all 0.15s ease'
  });
  
  btn.addEventListener('mouseover', () => {
    if (!btn.disabled) {
      btn.style.background = '#4b5563';
      btn.style.color = '#ffffff';
    }
  });
  btn.addEventListener('mouseout', () => {
    if (!btn.disabled) {
      btn.style.background = 'rgba(55, 65, 81, 0.5)';
      btn.style.color = '#e5e7eb';
    }
  });
}

// Global click-away listener to dismiss selection interface
document.addEventListener("click", (e) => {
  const bar = document.getElementById("web2md-region-actions-bar");
  if (bar && !bar.contains(e.target) && !e.target.classList.contains("web2md-region-highlighted")) {
    highlightElement(null);
    bar.remove();
  }
}, { capture: true, passive: true });

function findParentHeaders(element) {
  const levels = [];
  let current = element;
  const cleanText = (txt) => txt ? txt.trim().replace(/\s+/g, ' ') : '';
  
  const headerSelectors = [
    '.x-panel-header-text', '.x-panel-title', '.x-panel-header',
    '.x-fieldset-header-text', '.x-fieldset-header', 'legend',
    '.panel-title', '.panel-heading', '.section-title', '.section-heading',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
  ];
  
  while (current && current !== document.body) {
    const parent = current.parentElement;
    if (!parent) break;
    
    const levelHeaders = [];
    
    // 1. Check preceding siblings of current
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (/^H[1-6]$/i.test(sibling.tagName)) {
        const text = cleanText(sibling.textContent);
        if (text) {
          levelHeaders.unshift({ text, level: parseInt(sibling.tagName[1]) });
        }
      } else {
        for (const selector of headerSelectors) {
          const founds = sibling.matches(selector) ? [sibling] : Array.from(sibling.querySelectorAll(selector));
          founds.forEach(found => {
            const text = cleanText(found.textContent);
            if (text) {
              levelHeaders.unshift({ text, level: found.tagName.match(/^H[1-6]$/i) ? parseInt(found.tagName[1]) : null });
            }
          });
        }
      }
      sibling = sibling.previousElementSibling;
    }
    
    // 2. Check header elements inside parent (that are not inside current)
    for (const selector of headerSelectors) {
      const founds = parent.querySelectorAll(selector);
      founds.forEach(found => {
        if (!current.contains(found)) {
          const text = cleanText(found.textContent);
          if (text) {
            const position = found.compareDocumentPosition(current);
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
              levelHeaders.unshift({ text, level: found.tagName.match(/^H[1-6]$/i) ? parseInt(found.tagName[1]) : null });
            }
          }
        }
      });
    }
    
    if (levelHeaders.length > 0) {
      const seen = new Set();
      const uniqueLevelHeaders = [];
      levelHeaders.forEach(h => {
        if (!seen.has(h.text)) {
          seen.add(h.text);
          uniqueLevelHeaders.push(h);
        }
      });
      levels.push(uniqueLevelHeaders);
    }
    
    current = parent;
  }
  
  levels.reverse();
  
  const globalSeen = new Set();
  const finalHeaders = [];
  levels.forEach(levelList => {
    levelList.forEach(h => {
      if (!globalSeen.has(h.text)) {
        globalSeen.add(h.text);
        finalHeaders.push(h);
      }
    });
  });
  
  return finalHeaders;
}

async function handleRegionAction(element, action) {
  // Temporarily flag elements hidden by CSS stylesheets in the live DOM
  const markedElements = [];
  try {
    const allDescendants = element.querySelectorAll('*');
    allDescendants.forEach(desc => {
      const style = window.getComputedStyle(desc);
      if (style.display === 'none' || style.visibility === 'hidden') {
        desc.setAttribute('data-web2md-ignore', 'true');
        markedElements.push(desc);
      }
    });
  } catch (e) {}

  try {
    const settings = await getSettings();
    const metadata = {
      title: document.title,
      url: window.location.href,
      siteName: new URL(window.location.href).hostname
    };
    
    const getSafeFilename = (title) => {
      return title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50) || 'region';
    };
    const baseFilename = getSafeFilename(document.title);
    
    if (action === "markdown") {
      const clone = element.cloneNode(true);
      try {
        preProcessDOMForConversion(clone, document);
      } catch (err) {
        console.error("Region DOM pre-processing failed: ", err);
      }
      let markdown = htmlToMarkdown(clone.outerHTML, metadata, settings);
      
      // Find parent/preceding headings for context
      const headers = findParentHeaders(element);
      if (headers.length > 0) {
        let headerMarkdown = '';
        headers.forEach((h, index) => {
          const level = h.level || (index + 2); // Default to h2, h3...
          const hashes = '#'.repeat(Math.min(level, 6));
          headerMarkdown += `${hashes} ${h.text}\n\n`;
        });
        markdown = headerMarkdown + markdown;
      }
      
      await copyTextToClipboard(markdown);
      showToast("⚡ Region copied as Markdown!");
    } 
    else if (action === "html") {
      const apiCalls = await getApiCallsFromMainWorld();
      const res = await serializePageToSelfContainedHtml({ preserveJs: true, apiCalls, targetElement: element });
      await copyTextToClipboard(res.nodeHtml);
      showToast("⚡ Region HTML copied to clipboard!");
    } 
    else if (action === "download-html") {
      const apiCalls = await getApiCallsFromMainWorld();
      const res = await serializePageToSelfContainedHtml({ preserveJs: true, apiCalls, targetElement: element });
      
      const blob = new Blob([res.html], { type: 'text/html;charset=utf-8' });
      const reader = new FileReader();
      reader.onload = function(e) {
        chrome.runtime.sendMessage({
          action: "triggerDownload",
          url: e.target.result,
          filename: `${baseFilename}-region.html`
        });
        showToast("📥 Region HTML download triggered!");
      };
      reader.readAsDataURL(blob);
    } 
    else if (action === "download-zip") {
      if (typeof JSZip === 'undefined') {
        showToast("❌ JSZip not loaded", true);
        return;
      }
      
      showToast("📦 Packaging region assets into ZIP...");
      const apiCalls = await getApiCallsFromMainWorld();
      const res = await serializePageToSelfContainedHtml({ preserveJs: true, apiCalls, targetElement: element });
      
      const zip = new JSZip();
      zip.file("index.html", res.package.html);
      if (res.package.css && res.package.css.trim().length > 0) {
        zip.file("styles.css", res.package.css);
      }
      if (res.package.js && res.package.js.trim().length > 0) {
        zip.file("scripts.js", res.package.js);
      }
      if (res.package.assets && res.package.assets.length > 0) {
        res.package.assets.forEach(file => {
          const parts = file.dataUrl.split(',');
          if (parts.length >= 2) {
            const mime = parts[0].match(/:(.*?);/)[1];
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const assetBlob = new Blob([u8arr], { type: mime });
            zip.file(file.path, assetBlob);
          }
        });
      }
      
      if (apiCalls && apiCalls.length > 0) {
        zip.file("mock_apis.json", JSON.stringify(apiCalls, null, 2));
      }
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const reader = new FileReader();
      reader.onload = function(e) {
        chrome.runtime.sendMessage({
          action: "triggerDownload",
          url: e.target.result,
          filename: `${baseFilename}-region-package.zip`
        });
        showToast("📥 Region ZIP package download triggered!");
      };
      reader.readAsDataURL(zipBlob);
    }
  } catch (error) {
    console.error("Region action failed:", error);
    showToast("❌ Failed to process region", true);
  } finally {
    // Restore live DOM
    markedElements.forEach(desc => {
      desc.removeAttribute('data-web2md-ignore');
    });
  }
}

/**
 * Robustly copies text to clipboard, falling back to document.execCommand if navigator.clipboard is unavailable or restricted.
 */
async function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("navigator.clipboard.writeText failed, trying fallback:", err);
    }
  }
  
  // Fallback using textarea and execCommand
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Keep it off-screen and static
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.width = "2em";
  textArea.style.height = "2em";
  textArea.style.padding = "0";
  textArea.style.border = "none";
  textArea.style.outline = "none";
  textArea.style.boxShadow = "none";
  textArea.style.background = "transparent";
  
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) return true;
    throw new Error("execCommand('copy') returned false");
  } catch (err) {
    document.body.removeChild(textArea);
    console.error("Fallback copy failed:", err);
    throw err;
  }
}
