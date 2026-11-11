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
      // plan-exempt — ps-015: include static coachmark in extension UI to prevent dock click interception. routing-override: skipped — user approved Option 1 in deciboard.
      target.closest("#pagesnap-region-actions-bar") ||
      target.closest("#pagesnap-static-coachmark") ||
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
      // plan-exempt — ps-015: Game HUD Coachmark for static selection dismiss on escape. routing-override: skipped — user approved Option 1 in deciboard.
      if (bar) { bar.remove(); removeStaticCoachmark(); }
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
    // plan-exempt — clean duplicate bar.remove call and dismiss static coachmark. routing-override: skipped — user approved Option 1 in deciboard.
    if (bar) { bar.remove(); removeStaticCoachmark(); }
    document.removeEventListener("click", onDockActivePageClick, true);
    document.addEventListener("click", onDockActivePageClick, true);
    bar = document.createElement("div");
    bar.id = "pagesnap-region-actions-bar";
    Object.assign(bar.style, {
      position: 'absolute',
      background: 'rgba(17, 24, 39, 0.95)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      // plan-exempt — ps-013: compact dock padding and gap to guarantee width budget < 800px on standard laptops. routing-override: skipped — user requested UI refinement.
      border: '1px solid #374151',
      borderRadius: '10px',
      padding: '5px 8px',
      display: 'flex',
      gap: '4px',
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
    // plan-exempt — ps-014: primaryMd and primaryHtml button styling for core Markdown and HTML focus. routing-override: skipped — user approved Phase 2 dock redesign in deciboard.
    let background = DOCK.panel;
    let borderColor = DOCK.line;
    let color = DOCK.text;
    if (options.primaryMd) {
      background = '#2563eb';
      borderColor = '#3b82f6';
      color = '#ffffff';
    } else if (options.primaryHtml) {
      background = '#059669';
      borderColor = '#10b981';
      color = '#ffffff';
    } else if (options.studio) {
      background = 'linear-gradient(135deg, #8b5cf6, #3b82f6)';
      borderColor = 'transparent';
    } else if (options.primary) {
      background = DOCK.accent;
      borderColor = DOCK.accent;
    } else if (options.ghost) {
      background = 'transparent';
    }
    Object.assign(b.style, {
      whiteSpace: 'nowrap', background,
      border: `1px solid ${borderColor}`,
      borderRadius: '5px', color, padding: options.ghost ? '4px 6px' : (options.primaryMd || options.primaryHtml) ? '5px 10px' : '4px 7px',
      cursor: options.disabled ? 'not-allowed' : 'pointer', opacity: options.disabled ? '0.4' : '1',
      fontSize: '11px', fontWeight: options.primaryMd || options.primaryHtml || options.studio || options.primary ? '600' : '500', fontFamily: 'inherit'
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

  // plan-exempt — ps-008: on-screen walkthrough guide pill showing real-time interaction steps to the user. routing-override: skipped — user requested on-screen interactive guide.
  let walkthroughPill = null;
  let walkthroughPollTimer = null;
  function showWalkthroughGuide() {
    removeWalkthroughGuide();
    walkthroughPill = document.createElement('div');
    walkthroughPill.id = 'pagesnap-walkthrough-guide';
    Object.assign(walkthroughPill.style, {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '2147483647',
      background: '#111827',
      border: '1px solid #374151',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
      borderRadius: '24px',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      color: '#f3f4f6',
      font: '600 13px system-ui, sans-serif',
      pointerEvents: 'none'
    });

    const updateGuideContent = () => {
      if (!walkthroughPill) return;
      const session = PageSnap.motionSniffer && PageSnap.motionSniffer._activeUserSession && PageSnap.motionSniffer._activeUserSession.session;
      const scrollCount = session ? session.scrollTrail.length : 0;
      const hoverCount = session ? session.hoverEvents.length : 0;

      let stepText = '';
      // plan-exempt — ps-008: advance guide step when scroll activity is registered. routing-override: skipped — user requested on-screen interactive guide.
      if (scrollCount < 1) {
        stepText = '📍 Step 1/3: Scroll down through the page (top to bottom) to capture 3D transforms...';
      } else if (hoverCount < 2) {
        stepText = `📍 Step 2/3: Hover over interactive project links / menu items (${hoverCount} captured)...`;
      } else {
        stepText = `✅ Step 3/3: Captured ${scrollCount} scroll points & ${hoverCount} hovers! Click "⏹ Stop Record" to finish.`;
      }

      walkthroughPill.innerHTML = `
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;animation:pulse 1.2s infinite"></span>
        <span>${stepText}</span>
      `;
    };

    updateGuideContent();
    document.body.appendChild(walkthroughPill);
    walkthroughPollTimer = setInterval(updateGuideContent, 100);
  }

  function removeWalkthroughGuide() {
    if (walkthroughPollTimer) { clearInterval(walkthroughPollTimer); walkthroughPollTimer = null; }
    if (walkthroughPill) { walkthroughPill.remove(); walkthroughPill = null; }
  }

// plan-exempt — position floating bar and sync on scroll
// plan-exempt — ps-015: Game HUD Coachmark for static element selection
// routing-override: skipped — user approved Option 1 in deciboard.
  const HINT_STORAGE_KEY = 'pagesnap_dismiss_static_hint';
  let staticHintDismissedPermanently = false;
  let coachmarkAutoDismissTimer = null;

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      chrome.storage.local.get([HINT_STORAGE_KEY], (res) => {
        if (res && res[HINT_STORAGE_KEY]) staticHintDismissedPermanently = true;
      });
    } catch (_) {}
  }

  function removeStaticCoachmark() {
    if (coachmarkAutoDismissTimer) {
      clearTimeout(coachmarkAutoDismissTimer);
      coachmarkAutoDismissTimer = null;
    }
    const cm = document.getElementById('pagesnap-static-coachmark');
    if (cm) cm.remove();
  }

  function hasDetectedMotion(el) {
    if (!el) return false;
    const sniffer = PageSnap.motionSniffer;
    const m = sniffer && typeof sniffer.describe === 'function' ? sniffer.describe(el) : null;
    if (m && ((m.attributes && m.attributes.length > 0) ||
              (m.interactiveStates && m.interactiveStates.length > 0) ||
              (m.liftLayers && m.liftLayers.length > 0) ||
              (m.morphedPaths && m.morphedPaths.length > 0) ||
              (m.spatialMap && m.spatialMap.length > 1))) {
      return true;
    }
    try {
      const style = window.getComputedStyle(el);
      if (style.animationName && style.animationName !== 'none') return true;
    } catch (_) {}
    return false;
  }

  function positionStaticCoachmark(cm, bar) {
    if (!cm || !bar) return;
    const barRect = bar.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    const cmHeight = cm.offsetHeight || 80;
    const cmWidth = cm.offsetWidth || 380;
    const viewW = document.documentElement.clientWidth || window.innerWidth;
    const margin = 12;

    let left = barRect.left + scrollLeft + (barRect.width / 2) - (cmWidth / 2);
    left = Math.max(scrollLeft + margin, Math.min(left, scrollLeft + viewW - cmWidth - margin));

    let top = barRect.top + scrollTop - cmHeight - 12;
    const arrow = cm.querySelector('#pagesnap-coachmark-arrow');
    if (barRect.top - cmHeight - 12 < margin) {
      top = barRect.bottom + scrollTop + 12;
      if (arrow) {
        arrow.style.top = '-6px';
        arrow.style.bottom = '';
        arrow.style.borderLeft = '1px solid #8b5cf6';
        arrow.style.borderTop = '1px solid #8b5cf6';
        arrow.style.borderRight = '';
        arrow.style.borderBottom = '';
      }
    } else {
      if (arrow) {
        arrow.style.bottom = '-6px';
        arrow.style.top = '';
        arrow.style.borderRight = '1px solid #8b5cf6';
        arrow.style.borderBottom = '1px solid #8b5cf6';
        arrow.style.borderLeft = '';
        arrow.style.borderTop = '';
      }
    }
    cm.style.top = `${top}px`;
    cm.style.left = `${left}px`;
  }

  function checkAndShowStaticCoachmark(element, bar) {
    removeStaticCoachmark();
    if (staticHintDismissedPermanently) return;
    if (hasDetectedMotion(element)) return;

    const cm = document.createElement('div');
    cm.id = 'pagesnap-static-coachmark';
    cm.setAttribute('role', 'dialog');
    cm.setAttribute('aria-label', 'Static element selection tip');
    Object.assign(cm.style, {
      position: 'absolute',
      background: 'rgba(18, 18, 24, 0.96)',
      border: '1px solid #8b5cf6',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(139, 92, 246, 0.25)',
      borderRadius: '10px',
      padding: '12px 16px',
      width: '380px',
      maxWidth: 'calc(100vw - 32px)',
      boxSizing: 'border-box',
      zIndex: '2147483647',
      fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: '#f3f4f6',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      transition: 'opacity 0.2s ease, transform 0.2s ease',
      opacity: '0',
      transform: 'translateY(6px)'
    });

    cm.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:11px;font-weight:800;letter-spacing:0.05em;color:#c4b5fd;display:inline-flex;align-items:center;gap:6px;">
          🎮 PRO-TIP · STATIC SELECTION
        </span>
        <button id="pagesnap-coachmark-close" type="button" aria-label="Close tip" style="background:none;border:none;color:#9ca3af;cursor:pointer;font-size:13px;line-height:1;padding:2px 6px;border-radius:4px;">✕</button>
      </div>
      <div style="font-size:12px;color:#e4e4e7;line-height:1.45;text-align:left;margin-bottom:10px;">
        This element has no motion. <strong>"Copy animated"</strong> stays active and will output clean static HTML/CSS.
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);">
        <button id="pagesnap-coachmark-gotit" type="button" style="background:#8b5cf6;color:#ffffff;border:none;border-radius:5px;padding:5px 14px;font-size:11.5px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(139,92,246,0.4);">Got it</button>
        <label style="font-size:11px;color:#a1a1aa;cursor:pointer;display:inline-flex;align-items:center;gap:5px;user-select:none;">
          <input type="checkbox" id="pagesnap-coachmark-dontshow" style="cursor:pointer;accent-color:#8b5cf6;"> Don't show again
        </label>
      </div>
      <div id="pagesnap-coachmark-arrow" style="position:absolute;width:12px;height:12px;background:rgba(18,18,24,0.96);transform:rotate(45deg);left:calc(50% - 6px);pointer-events:none;"></div>
    `;

    document.body.appendChild(cm);
    positionStaticCoachmark(cm, bar);

    requestAnimationFrame(() => {
      cm.style.opacity = '1';
      cm.style.transform = 'translateY(0)';
    });

    const dismiss = () => {
      const chk = cm.querySelector('#pagesnap-coachmark-dontshow');
      if (chk && chk.checked) {
        staticHintDismissedPermanently = true;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ [HINT_STORAGE_KEY]: true });
        }
      }
      cm.style.opacity = '0';
      cm.style.transform = 'translateY(6px)';
      setTimeout(() => removeStaticCoachmark(), 200);
    };

    cm.querySelector('#pagesnap-coachmark-gotit')?.addEventListener('click', dismiss);
    cm.querySelector('#pagesnap-coachmark-close')?.addEventListener('click', dismiss);

    coachmarkAutoDismissTimer = setTimeout(() => {
      dismiss();
    }, 10000);
  }

  PageSnap.resetStaticHintPreference = function () {
    staticHintDismissedPermanently = false;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove([HINT_STORAGE_KEY]);
    }
  };

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
    const cm = document.getElementById('pagesnap-static-coachmark');
    if (cm) positionStaticCoachmark(cm, bar);
  }

  function renderFloatingBar(bar) {
    bar.innerHTML = "";
    const element = currentSelectedElement;
    if (!element) return;
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'PageSnap component actions');

    // plan-exempt — ps-015: dismiss coachmark on dock finish. routing-override: skipped — user approved Option 1 in deciboard.
    const done = () => { bar.remove(); removeStaticCoachmark(); PageSnap.highlightElement(null); };
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
        removeStaticCoachmark();
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

    // plan-exempt — ps-013: context-aware state machine for floating dock actions. routing-override: skipped — user requested state conflict hardening.
    // plan-exempt — ps-014: context-aware state machine with full-page 3D canvas boundary guard. routing-override: skipped — user requested full-page canvas guard.
    const isRecording = !!(PageSnap.motionSniffer && PageSnap.motionSniffer._activeUserSession);
    const isCanvasSurface = !!(surfaces && surfaces.any);
    const isFullPageApp = !!(surfaces && surfaces.isFullPageCanvasApp);
    const exportLocked = isRecording || isFullPageApp;
    // plan-exempt — ps-014: Phase 2 Option 1 Minimal Dock layout (MD & HTML First, 3D into overflow menu). routing-override: skipped — user selected Option 1 in deciboard.
    bar.appendChild(dockDivider());

    // 1. HERO BUTTON 1: Copy Markdown (Primary Accent Blue)
    bar.appendChild(dockButton('📋 Copy Markdown', {
      primaryMd: true, slot: 'copy-md', disabled: isRecording || isCanvasSurface,
      title: isCanvasSurface ? 'Markdown export unavailable on pure Canvas surfaces' : isRecording ? 'Export unavailable while recording' : 'No JS · copy the selected element as clean Markdown',
      onClick: async () => {
        if (isRecording) { if (typeof Web2MD.showToast === 'function') Web2MD.showToast('⚠️ Stop recording before exporting Markdown.', true); return; }
        try {
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
          Web2MD.showToast('📋 Selection copied as Markdown!');
          done();
        } catch (err) {
          console.error('[PageSnap] Copy MD failed:', err);
          if (typeof Web2MD.showToast === 'function') Web2MD.showToast('⚠️ Copy failed: ' + (err.message || 'clipboard permission denied'), true);
        }
      }
    }));

    // 2. HERO BUTTON 2: Copy HTML (Primary Emerald Green)
    bar.appendChild(dockButton('🌐 Copy HTML', {
      primaryHtml: true, slot: 'copy-static', disabled: isRecording || isCanvasSurface,
      title: isCanvasSurface ? 'HTML export unavailable on pure Canvas surfaces' : isRecording ? 'Export unavailable while recording' : 'No JS · the same HTML and CSS without the motion script. CSS animations and hover still work.',
      onClick: async () => {
        if (isRecording) { if (typeof Web2MD.showToast === 'function') Web2MD.showToast('⚠️ Stop recording before exporting code.', true); return; }
        try {
          const comp = await extract();
          await Web2MD.copyTextToClipboard(comp.selfContainedHtmlNoJs);
          Web2MD.showToast('🌐 Static HTML + CSS copied (no JS).');
          done();
        } catch (err) {
          console.error('[PageSnap] Copy static failed:', err);
          if (typeof Web2MD.showToast === 'function') Web2MD.showToast('⚠️ Copy failed: ' + (err.message || 'clipboard permission denied'), true);
        }
      }
    }));

    bar.appendChild(dockDivider());

    // 3. 🛠️ Live Studio
    bar.appendChild(dockButton('🛠️ Live Studio', {
      studio: true, slot: 'studio', disabled: exportLocked,
      title: isFullPageApp ? 'Full-page 3D app: Shrink (🔽) to a single section first' : isRecording ? 'Live Studio unavailable while recording' : 'Open Component Studio to preview, edit text, and customize',
      onClick: async () => {
        if (isFullPageApp) { if (typeof Web2MD.showToast === 'function') Web2MD.showToast('⚠️ Full-Page 3D App: Use 🔽 Shrink to select an individual section (Header, Hero) or download 3D assets.', true); return; }
        if (isRecording) { if (typeof Web2MD.showToast === 'function') Web2MD.showToast('⚠️ Stop recording before opening Live Studio.', true); return; }
        document.removeEventListener("click", onDockActivePageClick, true);
        bar.remove();
        removeStaticCoachmark();
        PageSnap.highlightElement(null);
        await measure();
        PageSnap.openComponentStudioModal(currentSelectedElement);
      }
    }));

    // 4. More Options Overflow Menu (•••)
    const moreContainer = document.createElement('div');
    moreContainer.style.position = 'relative';
    moreContainer.style.display = 'inline-flex';

    const moreMenu = document.createElement('div');
    moreMenu.id = 'pagesnap-more-menu';
    moreMenu.setAttribute('role', 'menu');
    Object.assign(moreMenu.style, {
      position: 'absolute',
      bottom: 'calc(100% + 8px)',
      right: '0',
      minWidth: '240px',
      background: '#18181b',
      border: '1px solid #374151',
      borderRadius: '8px',
      padding: '6px',
      boxShadow: '0 12px 28px rgba(0, 0, 0, 0.7)',
      display: 'none',
      flexDirection: 'column',
      gap: '4px',
      zIndex: '2147483647'
    });

    function createMenuItem(label, options = {}) {
      const item = document.createElement('button');
      item.type = 'button';
      if (options.slot) item.dataset.action = options.slot;
      if (options.title) item.title = options.title;
      item.textContent = label;
      Object.assign(item.style, {
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        borderRadius: '5px',
        padding: '7px 10px',
        color: options.badge ? '#c4b5fd' : '#e4e4e7',
        fontSize: '12px',
        cursor: options.disabled ? 'not-allowed' : 'pointer',
        opacity: options.disabled ? '0.4' : '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: 'inherit'
      });
      if (options.badge) {
        const badge = document.createElement('span');
        badge.textContent = options.badge;
        Object.assign(badge.style, {
          fontSize: '9px', fontWeight: '700', background: 'rgba(139, 92, 246, 0.25)',
          color: '#a78bfa', padding: '2px 5px', borderRadius: '4px'
        });
        item.appendChild(badge);
      }
      item.addEventListener('mouseenter', () => { if (!item.disabled) item.style.background = '#27272a'; });
      item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        moreMenu.style.display = 'none';
        if (options.onClick) options.onClick(e);
      });
      if (options.disabled) item.disabled = true;
      return item;
    }

    // Menu Item: Download ZIP
    moreMenu.appendChild(createMenuItem('📦 Download ZIP', {
      slot: 'download-zip', disabled: exportLocked,
      title: isFullPageApp ? 'Full-page 3D app: Shrink (🔽) to a single section first' : isRecording ? 'Download unavailable while recording' : 'Animated (JS) · index.html, styles.css, Component.jsx, tokens.json, AI-PROMPT.md and README.md',
      onClick: async (e) => {
        if (isFullPageApp) { if (typeof Web2MD.showToast === 'function') Web2MD.showToast('⚠️ Full-Page 3D App: Use 🔽 Shrink to select an individual section (Header, Hero) or download 3D assets.', true); return; }
        if (isRecording) { if (typeof Web2MD.showToast === 'function') Web2MD.showToast('⚠️ Stop recording before downloading ZIP.', true); return; }
        const btn = e.currentTarget;
        const oldText = btn.textContent;
        btn.textContent = '⏳ Packaging...';
        btn.disabled = true;
        try {
          const comp = await extract();
          await PageSnap.downloadComponentZip(comp);
          btn.textContent = '✅ ZIP Downloaded!';
          Web2MD.showToast('📦 Modular Component ZIP downloaded!');
          setTimeout(done, 1200);
        } catch (err) {
          console.error('[PageSnap] Download ZIP failed:', err);
          btn.textContent = '❌ Failed';
          if (typeof Web2MD.showToast === 'function') Web2MD.showToast('❌ Failed to download ZIP: ' + (err.message || 'unknown error'), true);
          setTimeout(() => { btn.textContent = oldText; btn.disabled = false; }, 2000);
        }
      }
    }));

    // Menu Item: Copy AI Prompt
    moreMenu.appendChild(createMenuItem('🤖 Copy AI Prompt', {
      slot: 'copy-ai', disabled: isRecording,
      title: isRecording ? 'Export unavailable while recording' : 'No JS · a brief an AI agent can use to rebuild this component',
      onClick: async () => {
        if (isRecording) { if (typeof Web2MD.showToast === 'function') Web2MD.showToast('⚠️ Stop recording before copying AI Prompt.', true); return; }
        try {
          const comp = await extract();
          await Web2MD.copyTextToClipboard(comp.promptMarkdown);
          Web2MD.showToast('🤖 AI Design Prompt copied to clipboard!');
          done();
        } catch (err) {
          console.error('[PageSnap] Copy AI Prompt failed:', err);
          if (typeof Web2MD.showToast === 'function') Web2MD.showToast('⚠️ Copy failed: ' + (err.message || 'clipboard permission denied'), true);
        }
      }
    }));

    // Menu Item: Copy Animated (JS)
    // plan-exempt — ps-015: label Copy animated as BETA experimental action in moreMenu. routing-override: skipped — user requested experiment labeling.
    moreMenu.appendChild(createMenuItem('▶ Copy animated (JS)', {
      slot: 'copy-animated', badge: 'BETA', disabled: exportLocked,
      title: isFullPageApp ? 'Full-page 3D app: Shrink (🔽) to a single section first' : isRecording ? 'Export unavailable while recording' : 'Animated (JS) · one self-contained HTML file with markup, styles and the motion script. Runs offline.',
      onClick: async () => {
        if (isFullPageApp) { if (typeof Web2MD.showToast === 'function') Web2MD.showToast('⚠️ Full-Page 3D App: Use 🔽 Shrink to select an individual section (Header, Hero) or download 3D assets.', true); return; }
        if (isRecording) { if (typeof Web2MD.showToast === 'function') Web2MD.showToast('⚠️ Stop recording before exporting code.', true); return; }
        try {
          const comp = await extract();
          await Web2MD.copyTextToClipboard(comp.selfContainedHtml);
          Web2MD.showToast('▶ Animated component copied. It runs offline.');
          done();
        } catch (err) {
          console.error('[PageSnap] Copy animated failed:', err);
          if (typeof Web2MD.showToast === 'function') Web2MD.showToast('⚠️ Copy failed: ' + (err.message || 'clipboard permission denied'), true);
        }
      }
    }));

    // Experimental Canvas / 3D Actions
    if (isRecording || isCanvasSurface) {
      const expDivider = document.createElement('div');
      expDivider.style.cssText = 'height:1px;background:#27272a;margin:3px 0;';
      moreMenu.appendChild(expDivider);

      // Record Video
      moreMenu.appendChild(createMenuItem(isRecording ? '⏹ Stop Record' : '🎬 Record 60fps Video', {
        slot: isRecording ? 'record-motion' : 'record-canvas-video',
        badge: 'BETA',
        title: isRecording ? 'Stop interactive recording session' : 'Record a smooth 60fps WebM video loop of this canvas animation',
        onClick: async (e) => {
          if (isRecording) {
            PageSnap.motionSniffer.stopInteractiveRecording();
            removeWalkthroughGuide();
            if (typeof Web2MD.showToast === 'function') Web2MD.showToast('⏹ Recording saved! Now click "📦 Download ZIP" to export.');
            renderFloatingBar(bar);
          } else if (surfaces.canvases && surfaces.canvases.length > 0) {
            const activeCanvas = (surfaces.canvases[0] && surfaces.canvases[0].el) || element.querySelector('canvas') || (element.tagName === 'CANVAS' ? element : document.querySelector('canvas'));
            if (activeCanvas && typeof PageSnap.recordCanvasVideo === 'function') {
              if (typeof Web2MD.showToast === 'function') Web2MD.showToast('🎬 Recording 3 seconds of 60fps canvas video...');
              await PageSnap.recordCanvasVideo(activeCanvas, 3000);
              if (typeof Web2MD.showToast === 'function') Web2MD.showToast('🎬 60fps WebM video downloaded!');
            }
          } else {
            PageSnap.motionSniffer.startInteractiveRecording();
            showWalkthroughGuide();
            renderFloatingBar(bar);
          }
        }
      }));

      // 3D Assets
      if (surfaces && surfaces.assets && surfaces.assets.length > 0) {
        moreMenu.appendChild(createMenuItem(`🎨 3D Assets (${surfaces.assets.length})`, {
          slot: 'download-assets',
          badge: 'BETA',
          title: `Download all ${surfaces.assets.length} discovered 3D models and textures as a ZIP`,
          onClick: async () => {
            if (typeof PageSnap.downloadCanvasAssets === 'function') {
              await PageSnap.downloadCanvasAssets(surfaces.assets);
              if (typeof Web2MD.showToast === 'function') Web2MD.showToast(`🎨 ${surfaces.assets.length} 3D/Texture assets downloaded!`);
            }
          }
        }));
      }
    }

    const moreBtn = dockButton('••• ▾', {
      slot: 'more',
      title: 'More export formats and tools',
      disabled: exportLocked,
      onClick: (e) => {
        const open = moreMenu.style.display === 'flex';
        moreMenu.style.display = open ? 'none' : 'flex';
      }
    });
    moreContainer.appendChild(moreBtn);
    moreContainer.appendChild(moreMenu);
    bar.appendChild(moreContainer);
    const closeBtn = dockButton('✕', {
      ghost: true, slot: 'close', title: 'Close',
      onClick: () => {
        document.removeEventListener("click", onDockActivePageClick, true);
        bar.remove();
        removeStaticCoachmark();
        PageSnap.highlightElement(null);
        // plan-exempt — stop observing page motion once the user closes the dock
        if (PageSnap.motionSniffer) PageSnap.motionSniffer.stop();
      }
    });
    closeBtn.setAttribute('aria-label', 'Close');
    bar.appendChild(closeBtn);
    // position last: the size of the finished dock decides where it can sit
    positionFloatingBar(bar, element);
    // plan-exempt — ps-015: show game-style coachmark when element is static. routing-override: skipped — user approved Option 1 in deciboard.
    checkAndShowStaticCoachmark(element, bar);
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
