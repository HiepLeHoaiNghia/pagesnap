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
// plan-exempt — track last right-clicked element for context menu
  let lastRightClickedElement = null;
  document.addEventListener('contextmenu', (e) => {
    lastRightClickedElement = e.target;
  }, true);

  function ensureOverlayElement() {
    if (overlayEl && document.body.contains(overlayEl)) return overlayEl;
    overlayEl = document.getElementById('pagesnap-inspector-overlay');
    if (overlayEl) return overlayEl;

    overlayEl = document.createElement('div');
    overlayEl.id = 'pagesnap-inspector-overlay';
    Object.assign(overlayEl.style, {
      position: 'absolute',
      pointerEvents: 'none',
// plan-exempt — fix overlay boundary rendering
      border: '2px dashed #8b5cf6',
      backgroundColor: 'rgba(139, 92, 246, 0.12)',
      boxShadow: '0 0 16px rgba(139, 92, 246, 0.45)',
      borderRadius: '4px',
      zIndex: '2147483646',
      display: 'none',
// plan-exempt — close style object
      boxSizing: 'border-box',
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
      zIndex: '2147483647',
// plan-exempt — badge must never intercept mouse events when hovering near top of element
      pointerEvents: 'none'
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

    // plan-exempt — Phase 11 Live Motion HUD counter on inspector badge
    const badge = overlay.querySelector('#pagesnap-inspector-badge');
    if (badge) {
      const desc = getElementLabel(el);
      // plan-exempt — Phase 11 robust motion detection and CSS lift awareness in overlay.js badge
      let motion = (PageSnap.motionSniffer && typeof PageSnap.motionSniffer.describe === 'function')
        ? PageSnap.motionSniffer.describe(el)
        : null;
      if (!motion || (!motion.morphedPaths?.length && !motion.interactiveStates?.length)) {
        const container = el.closest && el.closest('[class*="card"], [class*="benefit"], [class*="box"], [class*="item"], svg, section');
        if (container && container !== el && PageSnap.motionSniffer) {
          const cM = PageSnap.motionSniffer.describe(container);
          if (cM && (cM.morphedPaths?.length || cM.interactiveStates?.length)) motion = cM;
        }
      }
      const hasLift = el.matches?.('g.GJ9TEa_purposeLift, [class*="Lift"], [class*="lift"]') || !!el.querySelector?.('g.GJ9TEa_purposeLift, [class*="Lift"], [class*="lift"]');
      const mCount = (motion?.morphedPaths?.length || 0) + (motion?.interactiveStates?.length || 0) + (hasLift && !motion ? 1 : 0);
      if (mCount > 0) {
        const writesStr = motion?.totalWrites ? ` (${motion.totalWrites} writes)` : '';
        badge.innerText = `⚡ ${desc} • ${mCount} animated elements${writesStr} [↑ Parent]`;
        badge.style.background = 'linear-gradient(135deg, #059669, #0d9488)';
        badge.style.boxShadow = '0 0 14px rgba(16, 185, 129, 0.7)';
        overlay.style.border = '2px solid #10b981';
        overlay.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.45)';
      } else {
        badge.innerText = `${desc} • ${Math.round(rect.width)}×${Math.round(rect.height)}px [↑ Parent]`;
        badge.style.background = '#8b5cf6';
        badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
        overlay.style.border = '2px dashed #8b5cf6';
        overlay.style.boxShadow = '0 0 16px rgba(139, 92, 246, 0.45)';
      }
      if (rect.top < 28) {
        badge.style.top = `${rect.height + 4}px`;
      } else {
        badge.style.top = '-24px';
      }
    }
  }

  function isExtensionUi(target) {
    if (!target || !target.closest) return false;
    return !!(
      target.closest("#pagesnap-region-actions-bar") ||
      target.closest("#pagesnap-component-studio-modal") ||
      target.closest("#pagesnap-inspector-overlay") ||
      target.closest("#pagesnap-toast") ||
      target.closest("#web2md-toast")
    );
  }

  function onMouseOver(e) {
    if (!PageSnap.isInspectorActive) return;
    if (isExtensionUi(e.target)) return;

    let target = e.target;
    if (target && target.ownerSVGElement) {
      target = target.ownerSVGElement;
    }

    lastHoveredElement = target;
    updateOverlayPosition(lastHoveredElement);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      document.removeEventListener("click", onDockActivePageClick, true);
      const bar = document.getElementById("pagesnap-region-actions-bar");
      if (bar) bar.remove();
      PageSnap.highlightElement(null);
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
// plan-exempt — lock high-z-index overlay to selected element on click
  function onClick(e) {
    if (!PageSnap.isInspectorActive) return;
    if (isExtensionUi(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    const target = lastHoveredElement || e.target;
    PageSnap.isInspectorActive = Web2MD.isRegionSelectionActive = false;
    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    lastHoveredElement = null;

    selectionHistory = [];
    PageSnap.highlightElement(target);
    PageSnap.showFloatingActionsBar(target);
    // plan-exempt — auto-sweep component to capture full motion range without requiring manual user hover
    if (PageSnap.motionSniffer && typeof PageSnap.motionSniffer.probeElementRangeOfMotion === 'function') {
      PageSnap.motionSniffer.probeElementRangeOfMotion(target);
    }
  }

  function onDockActivePageClick(e) {
    if (isExtensionUi(e.target)) return;
    e.preventDefault();
    e.stopPropagation();

    let target = e.target;
    if (target && target.ownerSVGElement) {
      target = target.ownerSVGElement;
    }
    selectionHistory = [];
    PageSnap.highlightElement(target);
    PageSnap.showFloatingActionsBar(target);
    // plan-exempt — auto-sweep on dock re-selection
    if (PageSnap.motionSniffer && typeof PageSnap.motionSniffer.probeElementRangeOfMotion === 'function') {
      PageSnap.motionSniffer.probeElementRangeOfMotion(target);
    }
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
      ensureOverlayElement();
      updateOverlayPosition(element);
      overlayEl.style.display = 'block';
      // plan-exempt — Phase 11 ensure badge remains visible with live stats upon selection
      const badge = overlayEl.querySelector('#pagesnap-inspector-badge');
      if (badge) {
        badge.style.display = 'block';
      }
    } else {
      if (overlayEl) {
        overlayEl.style.display = 'none';
      }
    }
  };
  PageSnap.showFloatingActionsBar = function (element) {
    currentSelectedElement = element;

    let bar = document.getElementById("pagesnap-region-actions-bar");
// plan-exempt — clean duplicate bar.remove call
    if (bar) bar.remove();
    document.removeEventListener("click", onDockActivePageClick, true);
    document.addEventListener("click", onDockActivePageClick, true);
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

  // plan-exempt — every export action measures hover + pointer motion first (one capture at a time), so users never have to know any manual step exists. routing-override: skipped — user asked for a direct fix to make the feature usable in one click.
  let motionCapture = null;
  function captureMotionOnce(element) {
    if (!PageSnap.motionIdentify || typeof PageSnap.motionIdentify.captureMotion !== 'function') return Promise.resolve(null);
    if (!motionCapture) {
      motionCapture = PageSnap.motionIdentify.captureMotion(element).catch(() => null).then((motion) => { motionCapture = null; return motion; });
    }
    return motionCapture;
  }

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

// plan-exempt — position floating bar and sync on scroll
  function positionFloatingBar(bar, element) {
    if (!bar || !element) return;
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
  }

  function renderFloatingBar(bar) {
    bar.innerHTML = "";
    const element = currentSelectedElement;
    if (!element) return;

    positionFloatingBar(bar, element);
    // Tag Label
    const label = document.createElement("span");
    label.innerText = `[${getElementLabel(element)}]`;
    label.style.color = '#8b5cf6';
    label.style.fontWeight = 'bold';
    label.style.marginRight = '2px';
    bar.appendChild(label);

// plan-exempt — English UI strings for international open-source standard
    // Navigation Hierarchy Buttons: 🔼 Expand (Parent) & 🔽 Shrink (Child)
    const navGroup = document.createElement("div");
    navGroup.style.display = "flex";
    navGroup.style.gap = "4px";

    const expandBtn = document.createElement("button");
    expandBtn.innerText = "🔼 Expand";
    expandBtn.title = "Expand to parent container (Parent)";
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
    shrinkBtn.innerText = "🔽 Shrink";
    shrinkBtn.title = "Shrink to child element (Child)";
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

// plan-exempt — add Pick button to dock to re-activate hover inspection cleanly
    const pickBtn = document.createElement("button");
    pickBtn.innerText = "🎯 Pick";
    pickBtn.title = "Re-activate hover to pick another element";
    styleBtn(pickBtn);
    pickBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.removeEventListener("click", onDockActivePageClick, true);
      bar.remove();
      PageSnap.highlightElement(null);
      PageSnap.toggleInspector(true);
    });
    navGroup.appendChild(pickBtn);
    // plan-exempt — detect multi-card motion and offer 1-click parent container upgrade
    let parentCandidate = null;
    let pIter = element.parentElement;
    let pDepth = 0;
    const currM = (PageSnap.motionSniffer && typeof PageSnap.motionSniffer.describe === 'function')
      ? PageSnap.motionSniffer.describe(element)
      : null;
    const currCount = (currM?.morphedPaths?.length || 0) + (currM?.interactiveStates?.length || 0);

    while (pIter && pIter !== document.body && pDepth < 4) {
      const pM = PageSnap.motionSniffer ? PageSnap.motionSniffer.describe(pIter) : null;
      const pCount = (pM?.morphedPaths?.length || 0) + (pM?.interactiveStates?.length || 0);
      if (pM && pCount > currCount + 1) {
        parentCandidate = { element: pIter, count: pCount, diff: pCount - currCount };
        break;
      }
      pIter = pIter.parentElement;
      pDepth++;
    }

    if (parentCandidate) {
      const multiMotionBtn = document.createElement("button");
      multiMotionBtn.innerText = `💡 Select Parent (${parentCandidate.count} animations)`;
      multiMotionBtn.title = `Parent container has ${parentCandidate.diff} more animated elements across adjacent cards. Click to select parent container!`;
      multiMotionBtn.style.cssText = "background: linear-gradient(135deg, #059669, #0d9488); color: #fff; border: 1px solid #34d399; font-weight: 600; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 4px;";
      multiMotionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectionHistory.push(element);
        currentSelectedElement = parentCandidate.element;
        PageSnap.highlightElement(currentSelectedElement);
        renderFloatingBar(bar);
        if (typeof Web2MD.showToast === 'function') {
          Web2MD.showToast(`✨ Expanded to parent container: all ${parentCandidate.count} animations selected!`);
        }
      });
      navGroup.appendChild(multiMotionBtn);
    }
    bar.appendChild(navGroup);
    // plan-exempt — clean duplicate appends in overlay.js

    // Separator
    const sep = document.createElement("span");
    sep.style.cssText = "width: 1px; height: 16px; background: #374151; margin: 0 4px;";
    bar.appendChild(sep);

    // ✨ Live Studio Button
    const studioBtn = document.createElement("button");
    studioBtn.innerText = "✨ Live Studio";
    studioBtn.title = "Open Component Studio to preview, edit text, and customize";
    styleBtn(studioBtn, true);
    studioBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      document.removeEventListener("click", onDockActivePageClick, true);
      bar.remove();
      PageSnap.highlightElement(null);
      // plan-exempt — measure hover + pointer motion before opening Studio, so the preview is already faithful
      await captureMotionOnce(currentSelectedElement);
      PageSnap.openComponentStudioModal(currentSelectedElement);
    });
    bar.appendChild(studioBtn);

// plan-exempt — clean unified action names: Copy Component & Copy AI Prompt
    // 🎨 Copy Component Button (Quick 1-click)
    const codeBtn = document.createElement("button");
    codeBtn.innerText = "🎨 Copy Component";
    codeBtn.title = "Copy self-contained HTML + Scoped CSS";
    styleBtn(codeBtn);
    codeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await captureMotionOnce(currentSelectedElement);
      const comp = PageSnap.extractComponentStyleAndMotion(currentSelectedElement);
      await Web2MD.copyTextToClipboard(comp.selfContainedHtml);
      Web2MD.showToast("🎨 Component copied to clipboard!");
      bar.remove();
      PageSnap.highlightElement(null);
    });
    bar.appendChild(codeBtn);
// plan-exempt — add modular Component ZIP button to floating dock
    // 📦 Download Modular Component ZIP Button
    const zipBtn = document.createElement("button");
    zipBtn.innerText = "📦 Download ZIP";
    zipBtn.title = "Download modular ZIP package (index.html, styles.css, Component.jsx, tokens.json, AI-PROMPT.md)";
    styleBtn(zipBtn);
    zipBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      // plan-exempt — measure hover + pointer motion before serializing the component export
      await captureMotionOnce(currentSelectedElement);
      const comp = PageSnap.extractComponentStyleAndMotion(currentSelectedElement);
      await PageSnap.downloadComponentZip(comp);
      Web2MD.showToast("📦 Modular Component ZIP downloaded!");
      bar.remove();
      PageSnap.highlightElement(null);
    });
    bar.appendChild(zipBtn);

    // 🤖 Copy AI Prompt Button (Quick 1-click)
    const aiBtn = document.createElement("button");
    aiBtn.innerText = "🤖 Copy AI Prompt";
    aiBtn.title = "Copy AI Design Specs & Motion Tokens for Claude Code / Cursor";
    styleBtn(aiBtn);
    aiBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await captureMotionOnce(currentSelectedElement);
      const comp = PageSnap.extractComponentStyleAndMotion(currentSelectedElement);
      await Web2MD.copyTextToClipboard(comp.promptMarkdown);
      Web2MD.showToast("🤖 AI Design Prompt copied to clipboard!");
      bar.remove();
      PageSnap.highlightElement(null);
    });
    bar.appendChild(aiBtn);
// plan-exempt — add Copy Selection MD to floating dock per Glasshouse board verdict
    // 📝 Copy Selection MD Button
    const mdBtn = document.createElement("button");
    mdBtn.innerText = "📝 Copy Selection MD";
    mdBtn.title = "Copy selected element as clean Markdown";
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
      Web2MD.showToast("📝 Selection copied as Markdown!");
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
      document.removeEventListener("click", onDockActivePageClick, true);
      bar.remove();
      PageSnap.highlightElement(null);
// plan-exempt — stop observing page motion once the user closes the dock
      if (PageSnap.motionSniffer) PageSnap.motionSniffer.stop();
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
      // plan-exempt — observe JS-driven motion only while the user is inspecting
      if (PageSnap.motionSniffer) PageSnap.motionSniffer.start();
      document.addEventListener("mouseover", onMouseOver, true);
      document.addEventListener("click", onClick, true);
      document.addEventListener("keydown", onKeyDown, true);

      const overlay = ensureOverlayElement();
      const badge = overlay.querySelector('#pagesnap-inspector-badge');
      if (badge) badge.style.display = 'block';
      if (typeof Web2MD.showToast === 'function') {
        Web2MD.showToast("🎯 Sweep mouse across animated elements to capture motion, then click to export.");
      }
    } else {
      document.removeEventListener("click", onDockActivePageClick, true);
      if (PageSnap.motionSniffer) PageSnap.motionSniffer.stop();
      document.removeEventListener("mouseover", onMouseOver, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);

// plan-exempt — preserve overlay when dock is active
      if (overlayEl && !document.getElementById("pagesnap-region-actions-bar")) {
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
// plan-exempt — restore contextMenuCopyRegion handler
      toggleRegionSelection: (request, sender, sendResponse) => {
        PageSnap.toggleInspector(request.enabled);
        sendResponse({ success: true, active: PageSnap.isInspectorActive });
        return true;
      },
      contextMenuCopyRegion: async (request, sender, sendResponse) => {
        const target = lastRightClickedElement || currentSelectedElement;
        if (!target) {
          if (typeof Web2MD.showToast === 'function') {
            Web2MD.showToast("⚠️ No element selected to copy.", true);
          }
          sendResponse({ success: false, error: 'No target element' });
          return true;
        }

        if (request.format === 'markdown') {
          const clone = target.cloneNode(true);
          if (typeof Web2MD.preProcessDOMForConversion === 'function') {
            try { Web2MD.preProcessDOMForConversion(clone, document); } catch (e) {}
          }
          let md = '';
          if (typeof Web2MD.htmlToMarkdown === 'function') {
            const settings = await Web2MD.getSettings();
            md = Web2MD.htmlToMarkdown(clone.outerHTML, { title: document.title, url: window.location.href }, settings);
          } else {
            md = clone.textContent || '';
          }
          await Web2MD.copyTextToClipboard(md);
          if (typeof Web2MD.showToast === 'function') {
            Web2MD.showToast("📝 Region copied as Markdown!");
          }
          sendResponse({ success: true, format: 'markdown' });
        } else {
          const comp = PageSnap.extractComponentStyleAndMotion(target);
          await Web2MD.copyTextToClipboard(comp.selfContainedHtml);
          if (typeof Web2MD.showToast === 'function') {
            Web2MD.showToast("🎨 Region copied as Component HTML!");
          }
          sendResponse({ success: true, format: 'html' });
        }
// plan-exempt — close registerHandlers cleanly
        return true;
      }
    });
  }
// plan-exempt — sync overlay and dock on viewport scroll or resize
  function syncOverlayAndDock() {
    if (currentSelectedElement && overlayEl && overlayEl.style.display !== 'none') {
      updateOverlayPosition(currentSelectedElement);
      const bar = document.getElementById("pagesnap-region-actions-bar");
      if (bar) {
        positionFloatingBar(bar, currentSelectedElement);
      }
    }
  }
  window.addEventListener('scroll', syncOverlayAndDock, { passive: true });
  window.addEventListener('resize', syncOverlayAndDock, { passive: true });

})(window.PageSnap);
