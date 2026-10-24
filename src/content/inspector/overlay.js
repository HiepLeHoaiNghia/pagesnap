// plan-exempt — DevTools-grade inspector overlay and element picker
/**
 * PageSnap Inspector Overlay: provides an independent viewport-anchored highlight
 * overlay with tag badge and keyboard hierarchy traversal (ArrowUp / ArrowDown).
 * On click, automatically opens the unified PageSnap Component Studio.
 */

window.PageSnap = window.PageSnap || {};
window.Web2MD = window.Web2MD || window.PageSnap;

(function (PageSnap) {
  'use strict';

  PageSnap.isInspectorActive = false;
  let lastHoveredElement = null;
  let overlayEl = null;

  function ensureOverlayElement() {
    if (overlayEl && document.body.contains(overlayEl)) return overlayEl;
    overlayEl = document.getElementById('pagesnap-inspector-overlay');
    if (overlayEl) return overlayEl;

    overlayEl = document.createElement('div');
    overlayEl.id = 'pagesnap-inspector-overlay';
    Object.assign(overlayEl.style, {
      position: 'absolute',
      pointerEvents: 'none',
      border: '2px solid #8b5cf6',
      backgroundColor: 'rgba(139, 92, 246, 0.15)',
      boxShadow: '0 0 16px rgba(139, 92, 246, 0.5)',
      borderRadius: '4px',
      zIndex: '2147483646',
      display: 'none',
      transition: 'top 0.08s ease-out, left 0.08s ease-out, width 0.08s ease-out, height 0.08s ease-out'
    });

    const badge = document.createElement('div');
    badge.id = 'pagesnap-inspector-badge';
    Object.assign(badge.style, {
      position: 'absolute',
      top: '-24px',
      left: '0',
      background: '#8b5cf6',
      color: '#ffffff',
      padding: '2px 8px',
      fontSize: '11px',
      fontWeight: 'bold',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      borderRadius: '4px',
      whiteSpace: 'nowrap',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      zIndex: '2147483647'
    });
    overlayEl.appendChild(badge);
    document.body.appendChild(overlayEl);
    return overlayEl;
  }

  function getElementLabel(el) {
    if (!el) return '';
    let desc = el.tagName.toLowerCase();
    if (el.id) {
      desc += `#${el.id}`;
    } else if (el.className && typeof el.className === 'string') {
      const firstClass = el.className.trim().split(/\s+/)[0];
      if (firstClass && !firstClass.startsWith('pagesnap') && !firstClass.startsWith('web2md')) {
        desc += `.${firstClass}`;
      }
    }
    return desc;
  }

  function updateOverlayPosition(el) {
    if (!el || el === document.body || el === document.documentElement) {
      if (overlayEl) overlayEl.style.display = 'none';
      return;
    }
    const overlay = ensureOverlayElement();
    const rect = el.getBoundingClientRect();
    const scrollX = window.scrollX || document.documentElement.scrollLeft;
    const scrollY = window.scrollY || document.documentElement.scrollTop;

    overlay.style.top = `${rect.top + scrollY}px`;
    overlay.style.left = `${rect.left + scrollX}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.display = 'block';

    const badge = overlay.querySelector('#pagesnap-inspector-badge');
    if (badge) {
      const desc = getElementLabel(el);
      badge.innerText = `${desc} • ${Math.round(rect.width)}×${Math.round(rect.height)}px [↑ Parent]`;
      if (rect.top < 28) {
        badge.style.top = `${rect.height + 4}px`;
      } else {
        badge.style.top = '-24px';
      }
    }
  }

  function isExtensionUi(target) {
    if (!target) return false;
    return !!(
      target.closest("#pagesnap-component-studio-modal") ||
      target.closest("#pagesnap-inspector-overlay") ||
      target.closest("#pagesnap-toast") ||
      target.closest("#web2md-toast")
    );
  }

  function onMouseOver(e) {
    if (!PageSnap.isInspectorActive) return;
    if (isExtensionUi(e.target)) return;

    lastHoveredElement = e.target;
    updateOverlayPosition(lastHoveredElement);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      PageSnap.toggleInspector(false);
      if (typeof Web2MD.showToast === 'function') {
        Web2MD.showToast("🎯 Inspector cancelled.");
      }
    } else if (e.key === "ArrowUp") {
      // Expand to parent container
      if (lastHoveredElement && lastHoveredElement.parentElement && lastHoveredElement.parentElement !== document.body) {
        e.preventDefault();
        lastHoveredElement = lastHoveredElement.parentElement;
        updateOverlayPosition(lastHoveredElement);
      }
    } else if (e.key === "ArrowDown") {
      // Shrink to child container
      if (lastHoveredElement && lastHoveredElement.firstElementChild) {
        e.preventDefault();
        lastHoveredElement = lastHoveredElement.firstElementChild;
        updateOverlayPosition(lastHoveredElement);
      }
    }
  }

// plan-exempt — show floating actions dock with hierarchy navigation on click
  function onClick(e) {
    if (!PageSnap.isInspectorActive) return;
    if (isExtensionUi(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    const target = lastHoveredElement || e.target;
    PageSnap.toggleInspector(false);
    selectionHistory = [];

    PageSnap.highlightElement(target);
    PageSnap.showFloatingActionsBar(target);
  }

  let currentSelectedElement = null;
  let selectionHistory = [];

  PageSnap.highlightElement = function (element) {
    document.querySelectorAll(".pagesnap-region-highlighted").forEach(el => {
      el.classList.remove("pagesnap-region-highlighted");
      el.style.outline = '';
    });
    if (element) {
      element.classList.add("pagesnap-region-highlighted");
      element.style.outline = '2px dashed #8b5cf6';
    }
  };

  PageSnap.showFloatingActionsBar = function (element) {
    currentSelectedElement = element;

    let bar = document.getElementById("pagesnap-region-actions-bar");
    if (bar) bar.remove();

    bar = document.createElement("div");
    bar.id = "pagesnap-region-actions-bar";
    Object.assign(bar.style, {
      position: 'absolute',
      background: 'rgba(17, 24, 39, 0.95)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid #374151',
      borderRadius: '12px',
      padding: '8px 14px',
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
      zIndex: '2147483647',
      fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: '12px',
      color: '#f3f4f6',
      transition: 'top 0.15s ease, left 0.15s ease'
    });

    document.body.appendChild(bar);
    renderFloatingBar(bar);
  };

  function styleBtn(b, isPrimary = false) {
    Object.assign(b.style, {
      background: isPrimary ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : 'transparent',
      border: isPrimary ? 'none' : '1px solid #374151',
      borderRadius: '6px',
      color: '#ffffff',
      padding: '5px 9px',
      cursor: 'pointer',
      fontSize: '11px',
      fontWeight: '600',
      transition: 'all 0.15s ease'
    });
    if (!isPrimary) {
      b.addEventListener('mouseover', () => { b.style.background = '#8b5cf6'; b.style.borderColor = '#8b5cf6'; });
      b.addEventListener('mouseout', () => { b.style.background = 'transparent'; b.style.borderColor = '#374151'; });
    }
  }

  function renderFloatingBar(bar) {
    bar.innerHTML = "";
    const element = currentSelectedElement;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

    let top = rect.top + scrollTop - 52;
    if (top < scrollTop) {
      top = rect.bottom + scrollTop + 10;
    }
    let left = rect.left + scrollLeft;
    if (left + 580 > window.innerWidth + scrollLeft) {
      left = Math.max(10, window.innerWidth + scrollLeft - 600);
    }
    if (left < scrollLeft) left = scrollLeft + 10;

    bar.style.top = `${top}px`;
    bar.style.left = `${left}px`;

    // Tag Label
    const label = document.createElement("span");
    label.innerText = `[${getElementLabel(element)}]`;
    label.style.color = '#8b5cf6';
    label.style.fontWeight = 'bold';
    label.style.marginRight = '2px';
    bar.appendChild(label);

    // Navigation Hierarchy Buttons: 🔼 Ra ngoài (Parent) & 🔽 Vào trong (Child)
    const navGroup = document.createElement("div");
    navGroup.style.display = "flex";
    navGroup.style.gap = "4px";

    const expandBtn = document.createElement("button");
    expandBtn.innerText = "🔼 Ra ngoài";
    expandBtn.title = "Mở rộng ra thẻ cha bao quanh (Parent)";
    styleBtn(expandBtn);

    const parent = element.parentElement;
    if (parent && parent !== document.body && parent !== document.documentElement) {
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectionHistory.push(element);
        currentSelectedElement = parent;
        PageSnap.highlightElement(parent);
        renderFloatingBar(bar);
      });
    } else {
      expandBtn.disabled = true;
      expandBtn.style.opacity = "0.4";
      expandBtn.style.cursor = "not-allowed";
    }
    navGroup.appendChild(expandBtn);

    const shrinkBtn = document.createElement("button");
    shrinkBtn.innerText = "🔽 Vào trong";
    shrinkBtn.title = "Thu hẹp vào thẻ con (Child)";
    styleBtn(shrinkBtn);

    const hasChild = (selectionHistory.length > 0) || (element.firstElementChild !== null);
    if (hasChild) {
      shrinkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let targetChild = null;
        if (selectionHistory.length > 0) {
          targetChild = selectionHistory.pop();
        } else if (element.firstElementChild) {
          targetChild = element.firstElementChild;
        }
        if (targetChild) {
          currentSelectedElement = targetChild;
          PageSnap.highlightElement(targetChild);
          renderFloatingBar(bar);
        }
      });
    } else {
      shrinkBtn.disabled = true;
      shrinkBtn.style.opacity = "0.4";
      shrinkBtn.style.cursor = "not-allowed";
    }
    navGroup.appendChild(shrinkBtn);
    bar.appendChild(navGroup);

    // Separator
    const sep = document.createElement("span");
    sep.style.cssText = "width: 1px; height: 16px; background: #374151; margin: 0 4px;";
    bar.appendChild(sep);

    // ✨ Live Studio Button
    const studioBtn = document.createElement("button");
    studioBtn.innerText = "✨ Live Studio";
    studioBtn.title = "Mở phòng thí nghiệm để xem thử, sửa chữ, và tuỳ biến component";
    styleBtn(studioBtn, true);
    studioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      bar.remove();
      PageSnap.highlightElement(null);
      PageSnap.openComponentStudioModal(currentSelectedElement);
    });
    bar.appendChild(studioBtn);

    // 🤖 AI Prompt Button
    const aiBtn = document.createElement("button");
    aiBtn.innerText = "🤖 AI Prompt";
    aiBtn.title = "Copy Design Specs & Motion Tokens cho Claude Code / Cursor";
    styleBtn(aiBtn);
    aiBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const comp = PageSnap.extractComponentStyleAndMotion(currentSelectedElement);
      await Web2MD.copyTextToClipboard(comp.promptMarkdown);
      Web2MD.showToast("🤖 AI Design Prompt đã được copy!");
      bar.remove();
      PageSnap.highlightElement(null);
    });
    bar.appendChild(aiBtn);

    // 🎨 Copy Code Button
    const codeBtn = document.createElement("button");
    codeBtn.innerText = "🎨 Copy Code";
    codeBtn.title = "Copy HTML + Scoped CSS tự chạy";
    styleBtn(codeBtn);
    codeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const comp = PageSnap.extractComponentStyleAndMotion(currentSelectedElement);
      await Web2MD.copyTextToClipboard(comp.selfContainedHtml);
      Web2MD.showToast("🎨 Component Code đã được copy!");
      bar.remove();
      PageSnap.highlightElement(null);
    });
    bar.appendChild(codeBtn);

    // 📝 Copy MD Button
    const mdBtn = document.createElement("button");
    mdBtn.innerText = "📝 Copy MD";
    styleBtn(mdBtn);
    mdBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const clone = currentSelectedElement.cloneNode(true);
      if (typeof Web2MD.preProcessDOMForConversion === 'function') {
        try { Web2MD.preProcessDOMForConversion(clone, document); } catch (err) {}
      }
      let md = '';
      if (typeof Web2MD.htmlToMarkdown === 'function') {
        const settings = await Web2MD.getSettings();
        md = Web2MD.htmlToMarkdown(clone.outerHTML, { title: document.title, url: window.location.href }, settings);
      } else {
        md = clone.textContent || '';
      }
      await Web2MD.copyTextToClipboard(md);
      Web2MD.showToast("📝 Markdown đã được copy!");
      bar.remove();
      PageSnap.highlightElement(null);
    });
    bar.appendChild(mdBtn);

    // ✕ Close Button
    const closeBtn = document.createElement("button");
    closeBtn.innerText = "✕";
    styleBtn(closeBtn);
    closeBtn.style.padding = '4px 6px';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      bar.remove();
      PageSnap.highlightElement(null);
    });
    bar.appendChild(closeBtn);
  }

  /**
   * Toggles element inspection mode on or off
   */
  PageSnap.toggleInspector = Web2MD.toggleRegionSelectionMode = function (forceValue) {
    const enabled = forceValue !== undefined ? forceValue : !PageSnap.isInspectorActive;
    PageSnap.isInspectorActive = Web2MD.isRegionSelectionActive = enabled;

    if (enabled) {
      document.addEventListener("mouseover", onMouseOver, true);
      document.addEventListener("click", onClick, true);
      document.addEventListener("keydown", onKeyDown, true);

      ensureOverlayElement();
      if (typeof Web2MD.showToast === 'function') {
        Web2MD.showToast("🎯 Click any component on page to open Studio. Press Esc to cancel.");
      }
    } else {
      document.removeEventListener("mouseover", onMouseOver, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);

      if (overlayEl) {
        overlayEl.style.display = 'none';
      }
      lastHoveredElement = null;
    }
  };

  // Wire runtime message listeners
  if (typeof PageSnap.registerHandlers === 'function') {
    PageSnap.registerHandlers({
      getRegionSelectionState: (request, sender, sendResponse) => {
        sendResponse({ active: PageSnap.isInspectorActive });
        return true;
      },
      toggleRegionSelection: (request, sender, sendResponse) => {
        PageSnap.toggleInspector(request.enabled);
        sendResponse({ success: true, active: PageSnap.isInspectorActive });
        return true;
      }
    });
  }

})(window.PageSnap);
