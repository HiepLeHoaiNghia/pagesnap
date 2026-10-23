// plan-exempt — remove vestigial getApiCallsFromMainWorld
/**
 * Web2MD Region Selection actions bar: floating toolbar shown after picking an element.
 */
let currentSelectedElement = null;
let selectionHistory = [];

Web2MD.showRegionActionsBar = function (element) {
  currentSelectedElement = element;
  selectionHistory = [];

// plan-exempt — PageSnap branding update
  let bar = document.getElementById("pagesnap-region-actions-bar") || document.getElementById("web2md-region-actions-bar");
  if (bar) bar.remove();

  bar = document.createElement("div");
  bar.id = "pagesnap-region-actions-bar";

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
};

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
  label.innerText = `[${Web2MD.getElementDescription(element)}]`;
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
      Web2MD.highlightElement(parent);
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
      Web2MD.highlightElement(prev);
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

// plan-exempt — add Style Code and AI Prompt buttons to region actions bar
  const buttons = [
    { text: "📝 Copy MD", action: () => Web2MD.handleRegionAction(element, "markdown") },
    { text: "🎨 Style Code", title: "Copy self-contained component HTML + CSS with animations", action: () => Web2MD.handleRegionAction(element, "style-component") },
    { text: "🤖 AI Prompt", title: "Copy reverse-engineering design tokens & motion prompt for AI", action: () => Web2MD.handleRegionAction(element, "ai-prompt") },
    { text: "🌐 Copy HTML", action: () => Web2MD.handleRegionAction(element, "html") },
    { text: "📥 HTML", title: "Download self-contained HTML page", action: () => Web2MD.handleRegionAction(element, "download-html") },
    { text: "📦 ZIP", title: "Download structured zip package", action: () => Web2MD.handleRegionAction(element, "download-zip") }
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
      Web2MD.highlightElement(null);
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
    Web2MD.highlightElement(null);
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
    Web2MD.highlightElement(null);
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

Web2MD.handleRegionAction = async function (element, action) {
  // Temporarily flag elements hidden by CSS stylesheets in the live DOM
  const markedElements = [];
  try {
    const allDescendants = element.querySelectorAll('*');
    allDescendants.forEach(desc => {
      const style = window.getComputedStyle(desc);
      if (style.display === 'none' || style.visibility === 'hidden') {
        desc.setAttribute('data-pagesnap-ignore', 'true');
        markedElements.push(desc);
      }
    });
  } catch (e) {}

  try {
    const settings = await Web2MD.getSettings();
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
        Web2MD.preProcessDOMForConversion(clone, document);
      } catch (err) {
        console.error("Region DOM pre-processing failed: ", err);
      }
      let markdown = Web2MD.htmlToMarkdown(clone.outerHTML, metadata, settings);

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

      await Web2MD.copyTextToClipboard(markdown);
      Web2MD.showToast("⚡ Region copied as Markdown!");
    }
    else if (action === "style-component") {
      if (typeof PageSnap.extractComponentStyleAndMotion === 'function') {
        const componentData = PageSnap.extractComponentStyleAndMotion(element);
        await Web2MD.copyTextToClipboard(componentData.selfContainedHtml);
        Web2MD.showToast("🎨 Component with styles & keyframes copied!");
      } else {
        Web2MD.showToast("❌ Style extractor module not loaded", true);
      }
    }
    else if (action === "ai-prompt") {
      if (typeof PageSnap.extractComponentStyleAndMotion === 'function') {
        const componentData = PageSnap.extractComponentStyleAndMotion(element);
        await Web2MD.copyTextToClipboard(componentData.promptMarkdown);
        Web2MD.showToast("🤖 AI Reverse-Engineering Design Prompt copied!");
      } else {
        Web2MD.showToast("❌ Style extractor module not loaded", true);
      }
// plan-exempt — fix action html branch
    }
    else if (action === "html") {
      const res = await Web2MD.serializePageToSelfContainedHtml({ preserveJs: false, targetElement: element });
      await Web2MD.copyTextToClipboard(res.nodeHtml);
      Web2MD.showToast("⚡ Region HTML copied to clipboard!");
    }
    else if (action === "download-html") {
      const res = await Web2MD.serializePageToSelfContainedHtml({ preserveJs: false, targetElement: element });
      const blob = new Blob([res.html], { type: 'text/html;charset=utf-8' });
      const reader = new FileReader();
      reader.onload = function(e) {
        chrome.runtime.sendMessage({
          action: "triggerDownload",
          url: e.target.result,
          filename: `${baseFilename}-region.html`
        });
        Web2MD.showToast("📥 Region HTML download triggered!");
      };
      reader.readAsDataURL(blob);
    }
    else if (action === "download-zip") {
      if (typeof JSZip === 'undefined') {
        Web2MD.showToast("❌ JSZip not loaded", true);
        return;
      }

      Web2MD.showToast("📦 Packaging region assets into ZIP...");
      const res = await Web2MD.serializePageToSelfContainedHtml({ preserveJs: false, targetElement: element });

      await Web2MD.buildZipFromPackage(res.package, null, `${baseFilename}-region-package.zip`);
    }
  } catch (error) {
    console.error("Region action failed:", error);
    Web2MD.showToast("❌ Failed to process region", true);
  } finally {
    // Restore live DOM
    markedElements.forEach(desc => {
      desc.removeAttribute('data-pagesnap-ignore');
      desc.removeAttribute('data-web2md-ignore');
    });
  }
};
