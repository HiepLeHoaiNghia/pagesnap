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
// plan-exempt — add Live Studio to region action bar buttons
  const buttons = [
    { text: "✨ Live Studio", title: "Open interactive Component Studio to edit text, preview, and export", action: () => openComponentStudioModal(element) },
    { text: "🎨 Style Code", title: "Copy self-contained component HTML + CSS with animations", action: () => Web2MD.handleRegionAction(element, "style-component") },
    { text: "🤖 AI Prompt", title: "Copy reverse-engineering design tokens & motion prompt for AI", action: () => Web2MD.handleRegionAction(element, "ai-prompt") },
    { text: "📝 Copy MD", action: () => Web2MD.handleRegionAction(element, "markdown") },
    { text: "🌐 Copy HTML", action: () => Web2MD.handleRegionAction(element, "html") },
    { text: "📥 HTML", title: "Download self-contained HTML page", action: () => Web2MD.handleRegionAction(element, "download-html") }
// plan-exempt — fix forEach loop opener
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

// plan-exempt — interactive Component Studio modal implementation
Web2MD.openComponentStudioModal = PageSnap.openComponentStudioModal = function openComponentStudioModal(element) {
  const existingModal = document.getElementById("pagesnap-component-studio-modal");
  if (existingModal) existingModal.remove();

  if (typeof PageSnap.extractComponentStyleAndMotion !== 'function') {
    Web2MD.showToast("❌ Style extractor module not loaded", true);
    return;
  }

  const componentData = PageSnap.extractComponentStyleAndMotion(element);
  if (!componentData) {
    Web2MD.showToast("❌ Failed to extract component data", true);
    return;
  }

  const modal = document.createElement("div");
  modal.id = "pagesnap-component-studio-modal";
  Object.assign(modal.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
    color: '#f3f4f6'
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    background: '#111827',
    border: '1px solid #374151',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '850px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    overflow: 'hidden'
  });

  // Header
  const header = document.createElement("div");
  Object.assign(header.style, {
    padding: '14px 20px',
    borderBottom: '1px solid #1f2937',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#182234'
  });

  const title = document.createElement("div");
  title.innerHTML = `<strong>✨ PageSnap Component Studio</strong> <span style="color: #9ca3af; font-size: 12px; margin-left: 8px;">&lt;${componentData.tagName}&gt; • ${componentData.width}×${componentData.height}px</span>`;

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✕";
  Object.assign(closeBtn.style, {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px'
  });
  closeBtn.addEventListener('click', () => modal.remove());
  header.appendChild(title);
  header.appendChild(closeBtn);
  card.appendChild(header);

  // Toolbar
  const toolbar = document.createElement("div");
  Object.assign(toolbar.style, {
    padding: '10px 20px',
    borderBottom: '1px solid #1f2937',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    background: '#131b2a',
    fontSize: '12px'
  });

  const editToggleBtn = document.createElement("button");
  editToggleBtn.innerText = "✏️ Sửa trực tiếp chữ (Off)";
  Object.assign(editToggleBtn.style, {
    background: '#1f2937',
    border: '1px solid #374151',
    color: '#e5e7eb',
    borderRadius: '6px',
    padding: '5px 10px',
    cursor: 'pointer',
    fontSize: '12px'
  });

  const canvas = document.createElement("div");
  Object.assign(canvas.style, {
    flex: '1',
    minHeight: '260px',
    maxHeight: '450px',
    overflow: 'auto',
    padding: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#090d16',
    transition: 'background 0.2s ease'
  });

  let isEditing = false;
  editToggleBtn.addEventListener('click', () => {
    isEditing = !isEditing;
    editToggleBtn.innerText = isEditing ? "✏️ Sửa trực tiếp chữ (ĐANG BẬT)" : "✏️ Sửa trực tiếp chữ (Off)";
    editToggleBtn.style.background = isEditing ? '#8b5cf6' : '#1f2937';
    editToggleBtn.style.color = '#ffffff';

    const previewWrapper = canvas.querySelector('.pagesnap-component-wrapper');
    if (previewWrapper) {
      previewWrapper.querySelectorAll('*').forEach(el => {
        el.contentEditable = isEditing ? 'true' : 'false';
        el.style.outline = isEditing ? '1px dashed #8b5cf6' : 'none';
      });
    }
  });
  toolbar.appendChild(editToggleBtn);

  const bgSwitchBtn = document.createElement("button");
  bgSwitchBtn.innerText = "🌓 Đổi nền Canvas";
  Object.assign(bgSwitchBtn.style, {
    background: '#1f2937',
    border: '1px solid #374151',
    color: '#e5e7eb',
    borderRadius: '6px',
    padding: '5px 10px',
    cursor: 'pointer',
    fontSize: '12px'
  });
  let isLight = false;
  bgSwitchBtn.addEventListener('click', () => {
    isLight = !isLight;
    canvas.style.background = isLight ? '#f8fafc' : '#090d16';
  });
  toolbar.appendChild(bgSwitchBtn);
  card.appendChild(toolbar);

  canvas.innerHTML = componentData.selfContainedHtml;
  card.appendChild(canvas);

  // Footer
  const footer = document.createElement("div");
  Object.assign(footer.style, {
    padding: '12px 20px',
    borderTop: '1px solid #1f2937',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    background: '#182234'
  });

  const copyCodeBtn = document.createElement("button");
  copyCodeBtn.innerText = "🎨 Copy Scoped HTML & CSS";
  Object.assign(copyCodeBtn.style, {
    background: '#374151',
    border: 'none',
    color: '#ffffff',
    borderRadius: '6px',
    padding: '7px 14px',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer'
  });
  copyCodeBtn.addEventListener('click', async () => {
    const previewWrapper = canvas.querySelector('.pagesnap-component-wrapper');
    const htmlToCopy = previewWrapper ? previewWrapper.outerHTML : componentData.selfContainedHtml;
    await Web2MD.copyTextToClipboard(htmlToCopy);
    copyCodeBtn.innerText = "✅ Đã Copy Code!";
    setTimeout(() => { copyCodeBtn.innerText = "🎨 Copy Scoped HTML & CSS"; }, 2000);
  });
  footer.appendChild(copyCodeBtn);

  const copyPromptBtn = document.createElement("button");
  copyPromptBtn.innerText = "🤖 Copy Prompt cho AI";
  Object.assign(copyPromptBtn.style, {
    background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
    border: 'none',
    color: '#ffffff',
    borderRadius: '6px',
    padding: '7px 16px',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)'
  });
  copyPromptBtn.addEventListener('click', async () => {
    await Web2MD.copyTextToClipboard(componentData.promptMarkdown);
    copyPromptBtn.innerText = "✅ Đã Copy AI Prompt!";
    setTimeout(() => { copyPromptBtn.innerText = "🤖 Copy Prompt cho AI"; }, 2000);
  });
  footer.appendChild(copyPromptBtn);

  card.appendChild(footer);
  modal.appendChild(card);
  document.body.appendChild(modal);
}
