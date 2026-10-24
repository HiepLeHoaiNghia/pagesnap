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

  function onClick(e) {
    if (!PageSnap.isInspectorActive) return;
    if (isExtensionUi(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    const target = lastHoveredElement || e.target;
    PageSnap.toggleInspector(false);

    // Open unified Component Studio immediately
    if (typeof PageSnap.openComponentStudioModal === 'function') {
      PageSnap.openComponentStudioModal(target);
    }
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
