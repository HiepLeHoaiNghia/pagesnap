// plan-exempt — split developer features into pagereplica-extension approved by user
/**
 * Web2MD page content extraction: Readability-based extraction plus the
 * VFS (virtual file system) request bridge to the MAIN world scanner.
 */

/**
 * Handles extracting page content cleanly.
 */
Web2MD.handleExtractContentRequest = function (sendResponse) {
  try {
    const result = Web2MD.extractPageContent();
    sendResponse(result);
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
};

/**
 * Extracts clean article content using Mozilla Readability
 */
Web2MD.extractPageContent = function () {
  // Clone DOM to prevent affecting the active page
  const docClone = document.cloneNode(true);

  try {
    Web2MD.preProcessDOMForConversion(docClone, document);
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
      visibleText = Web2MD.extractVisibleFormContent();
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
// plan-exempt — fix projectFiles ReferenceError
    readabilitySuccess: (article && !useRaw) ? true : false
  };
};

/**
 * Extracts visible text content from the live DOM, preserving form field values.
 * Used as a fallback when Turndown produces too little content from complex web app pages.
 */
Web2MD.extractVisibleFormContent = function () {
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
};
