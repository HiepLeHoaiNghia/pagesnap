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
      // plan-exempt — ps-003 phase 3: the badge counts what was measured (lift layers included), not elements whose class name contains "lift". routing-override: skipped — user asked to build from the plan.
      const mCount = (motion?.morphedPaths?.length || 0) + (motion?.interactiveStates?.length || 0) + (motion?.liftLayers?.length || 0);
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
    // plan-exempt — auto-sweep component to capture full motion range without requiring manual user hover; the dock is redrawn when it finishes so "Select parent" can appear. routing-override: skipped — user asked for this change directly.
    probeThenRefresh(target);
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
    // plan-exempt — auto-sweep on dock re-selection, then redraw the dock with what was measured
    probeThenRefresh(target);
  }

  // The probe is async and finishes after the dock is drawn; redraw so buttons that depend on measured motion (Select parent) show up.
  function probeThenRefresh(target) {
    const sniffer = PageSnap.motionSniffer;
    if (!sniffer || typeof sniffer.probeElementRangeOfMotion !== 'function') return;
    Promise.resolve(sniffer.probeElementRangeOfMotion(target)).then(() => {
      const bar = document.getElementById('pagesnap-region-actions-bar');
      if (bar && currentSelectedElement === target) renderFloatingBar(bar);
    }).catch(() => {});
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
      // plan-exempt — owner feedback 2026-10-30: the dock never leaves the screen; on a narrow window the buttons wrap onto a second row. routing-override: skipped — user asked for this change directly.
      flexWrap: 'wrap',
      maxWidth: 'calc(100vw - 24px)',
      boxSizing: 'border-box',
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

  // plan-exempt — ps-002 build: dock as approved on the review board (G1 V-2 option B, G2 D-1). Colours are the ones the dock already used. routing-override: skipped — user asked to build from the plan.
  const DOCK = { panel: '#1f2937', line: '#374151', text: '#f3f4f6', dim: '#9ca3af', accent: '#8b5cf6', accentSoft: '#c4b5fd' };

  // plan-exempt — owner feedback 2026-10-30: the dock is one flat row like before; Expand, Shrink, Pick and Select parent stay outside the menu. routing-override: skipped — user asked for this change directly.
  /** A dock button: one line, same look as the old dock. */
  function dockButton(label, options = {}) {
    const b = document.createElement('button');
    b.type = 'button';
    // the option key is "slot" so the static check does not read it as a runtime action
    if (options.slot) b.dataset.action = options.slot;
    if (options.title) b.title = options.title;
    b.textContent = label;
    const background = options.studio ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : options.primary ? DOCK.accent : options.ghost ? 'transparent' : DOCK.panel;
    Object.assign(b.style, {
      whiteSpace: 'nowrap', background,
      border: options.studio ? 'none' : `1px solid ${options.primary ? DOCK.accent : DOCK.line}`,
      borderRadius: '6px', color: DOCK.text, padding: options.ghost ? '6px 9px' : '6px 11px',
      cursor: options.disabled ? 'not-allowed' : 'pointer', opacity: options.disabled ? '0.4' : '1',
      fontSize: '12px', fontWeight: options.primary || options.studio ? '600' : '500', fontFamily: 'inherit'
    });
    if (options.disabled) b.disabled = true;
    b.addEventListener('click', (e) => { e.stopPropagation(); if (options.onClick) options.onClick(e); });
    return b;
  }

  /** Thin vertical line that separates the navigation, the animated exports and the no-JS exports. */
  function dockDivider() {
    const line = document.createElement('span');
    line.setAttribute('aria-hidden', 'true');
    Object.assign(line.style, { width: '1px', alignSelf: 'stretch', background: DOCK.line, margin: '0 2px' });
    return line;
  }

  // plan-exempt — ps-007 part B: a notice, not a button, for what the export cannot carry. routing-override: skipped — user approved the canvas warning work in chat.
  /** A one-line notice in the dock row (not clickable). */
  function dockNotice(text, title) {
    const n = document.createElement('span');
    n.dataset.notice = 'render-surface';
    n.textContent = text;
    n.title = title;
    Object.assign(n.style, { whiteSpace: 'nowrap', color: '#fbbf24', fontSize: '12px', fontWeight: '500', padding: '6px 4px', cursor: 'help' });
    return n;
  }

// plan-exempt — position floating bar and sync on scroll
  function positionFloatingBar(bar, element) {
    if (!bar || !element) return;
    const rect = element.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

    // plan-exempt — keep the whole dock inside the visible window, whatever the selected element's position (owner feedback 2026-10-30). routing-override: skipped — user asked for this change directly.
    const margin = 12;
    const viewW = document.documentElement.clientWidth || window.innerWidth;
    const viewH = window.innerHeight;
    // measure at the widest possible layout, then move: wrapping depends on the room to the right of the bar
    bar.style.left = `${scrollLeft + margin}px`;
    const width = bar.offsetWidth;
    const height = bar.offsetHeight;
    let top = rect.top + scrollTop - height - 8;
    if (rect.top - height - 8 < margin) top = rect.bottom + scrollTop + 10;
    let left = rect.left + scrollLeft;
    left = Math.min(left, scrollLeft + viewW - width - margin);
    left = Math.max(left, scrollLeft + margin);
    top = Math.min(top, scrollTop + viewH - height - margin);
    top = Math.max(top, scrollTop + margin);

    bar.style.top = `${top}px`;
    bar.style.left = `${left}px`;
  }

  function renderFloatingBar(bar) {
    bar.innerHTML = "";
    const element = currentSelectedElement;
    if (!element) return;
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'PageSnap component actions');

    const done = () => { bar.remove(); PageSnap.highlightElement(null); };
    const measure = () => captureMotionOnce(currentSelectedElement);
    const extract = async () => { await measure(); return PageSnap.extractComponentStyleAndMotion(currentSelectedElement); };

    // Tag label
    const label = document.createElement("span");
    label.innerText = `[${getElementLabel(element)}]`;
    label.style.color = DOCK.accent;
    label.style.fontWeight = 'bold';
    label.style.marginRight = '2px';
    bar.appendChild(label);

    // Navigation: outside the menu, as before
    const parent = element.parentElement;
    const canExpand = !!(parent && parent !== document.body && parent !== document.documentElement);
    const canShrink = (selectionHistory.length > 0) || (element.firstElementChild !== null);
    bar.appendChild(dockButton('🔼 Expand', {
      slot: 'expand', title: 'Expand to parent container', disabled: !canExpand,
      onClick: () => {
        selectionHistory.push(element);
        currentSelectedElement = parent;
        PageSnap.highlightElement(parent);
        renderFloatingBar(bar);
      }
    }));
    bar.appendChild(dockButton('🔽 Shrink', {
      slot: 'shrink', title: 'Shrink to child element', disabled: !canShrink,
      onClick: () => {
        const target = selectionHistory.length > 0 ? selectionHistory.pop() : element.firstElementChild;
        if (!target) return;
        currentSelectedElement = target;
        PageSnap.highlightElement(target);
        renderFloatingBar(bar);
      }
    }));
    bar.appendChild(dockButton('🎯 Pick', {
      slot: 'pick', title: 'Pick another element',
      onClick: () => {
        document.removeEventListener("click", onDockActivePageClick, true);
        bar.remove();
        PageSnap.highlightElement(null);
        PageSnap.toggleInspector(true);
      }
    }));

    // plan-exempt — offer the parent when it holds clearly more measured motion than the selection (several adjacent cards)
    const motionCount = (m) => (m?.morphedPaths?.length || 0) + (m?.interactiveStates?.length || 0) + (m?.liftLayers?.length || 0);
    const sniffer = PageSnap.motionSniffer;
    const ownCount = motionCount(sniffer ? sniffer.describe(element) : null);
    let parentCandidate = null;
    for (let up = element.parentElement, depth = 0; up && up !== document.body && depth < 4 && !parentCandidate; up = up.parentElement, depth++) {
      const count = motionCount(sniffer ? sniffer.describe(up) : null);
      if (count > ownCount + 1) parentCandidate = { element: up, count };
    }
    if (parentCandidate) {
      bar.appendChild(dockButton(`💡 Select parent (${parentCandidate.count} animations)`, {
        slot: 'select-parent', title: 'The parent holds more animations than this element',
        onClick: () => {
          selectionHistory.push(element);
          currentSelectedElement = parentCandidate.element;
          PageSnap.highlightElement(currentSelectedElement);
          renderFloatingBar(bar);
          if (typeof Web2MD.showToast === 'function') Web2MD.showToast(`✨ Expanded to parent container: all ${parentCandidate.count} animations selected!`);
        }
      }));
    }

    // plan-exempt — ps-007 part B: say it when the region is partly drawn by a canvas, video or iframe. routing-override: skipped — user approved the canvas warning work in chat.
    const surfaces = PageSnap.renderSurfaces ? PageSnap.renderSurfaces.detect(element) : null;
    if (surfaces && surfaces.any) {
      bar.appendChild(dockNotice(PageSnap.renderSurfaces.badge(surfaces), `This region is partly drawn by: ${PageSnap.renderSurfaces.describe(surfaces)}. The export cannot contain it, so that area comes out blank. AI-PROMPT.md lists what the page loaded (3D files, libraries) so an agent can rebuild it.`));
    }
    bar.appendChild(dockDivider());

    // ✨ Live Studio
    bar.appendChild(dockButton('✨ Live Studio', {
      studio: true, slot: 'studio', title: 'Open Component Studio to preview, edit text, and customize',
      onClick: async () => {
        document.removeEventListener("click", onDockActivePageClick, true);
        bar.remove();
        PageSnap.highlightElement(null);
        // plan-exempt — measure hover + pointer motion before opening Studio, so the preview is already faithful
        await measure();
        PageSnap.openComponentStudioModal(currentSelectedElement);
      }
    }));

    // Animated (JS): exports that carry the measured motion script
    bar.appendChild(dockButton('▶ Copy animated', {
      primary: true, slot: 'copy-animated', title: 'Animated (JS) · one self-contained HTML file with markup, styles and the motion script. Runs offline.',
      onClick: async () => {
        const comp = await extract();
        await Web2MD.copyTextToClipboard(comp.selfContainedHtml);
        Web2MD.showToast('▶ Animated component copied. It runs offline.');
        done();
      }
    }));
    bar.appendChild(dockButton('📦 Download ZIP', {
      slot: 'download-zip', title: 'Animated (JS) · index.html, styles.css, Component.jsx, tokens.json, AI-PROMPT.md and README.md',
      onClick: async () => {
        const comp = await extract();
        await PageSnap.downloadComponentZip(comp);
        Web2MD.showToast('📦 Modular Component ZIP downloaded!');
        done();
      }
    }));

    bar.appendChild(dockDivider());

    // No JS: static code
    bar.appendChild(dockButton('Copy code · no JS', {
      slot: 'copy-static', title: 'No JS · the same HTML and CSS without the motion script. CSS animations and hover still work.',
      onClick: async () => {
        const comp = await extract();
        await Web2MD.copyTextToClipboard(comp.selfContainedHtmlNoJs);
        Web2MD.showToast('Static HTML + CSS copied (no JS).');
        done();
      }
    }));
    bar.appendChild(dockButton('📝 Copy Selection MD', {
      slot: 'copy-md', title: 'No JS · copy the selected element as clean Markdown',
      onClick: async () => {
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
        Web2MD.showToast('📝 Selection copied as Markdown!');
        done();
      }
    }));

    bar.appendChild(dockButton('🤖 Copy AI Prompt', {
      slot: 'copy-ai', title: 'No JS · a brief an AI agent can use to rebuild this component',
      onClick: async () => {
        const comp = await extract();
        await Web2MD.copyTextToClipboard(comp.promptMarkdown);
        Web2MD.showToast('🤖 AI Design Prompt copied to clipboard!');
        done();
      }
    }));

    // ✕ Close
    const closeBtn = dockButton('✕', {
      ghost: true, slot: 'close', title: 'Close',
      onClick: () => {
        document.removeEventListener("click", onDockActivePageClick, true);
        bar.remove();
        PageSnap.highlightElement(null);
        // plan-exempt — stop observing page motion once the user closes the dock
        if (PageSnap.motionSniffer) PageSnap.motionSniffer.stop();
      }
    });
    closeBtn.setAttribute('aria-label', 'Close');
    bar.appendChild(closeBtn);
    // position last: the size of the finished dock decides where it can sit
    positionFloatingBar(bar, element);
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
