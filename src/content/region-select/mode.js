// plan-exempt — PageSnap branding update
/**
 * PageSnap Region Selection Mode: hover/click element picking and context-menu entry point.
 */
PageSnap.isRegionSelectionActive = Web2MD.isRegionSelectionActive = false;
let lastHoveredElement = null;
let lastRightClickedElement = null;

// Track the last right-clicked element for the context menu
document.addEventListener("contextmenu", (e) => {
  lastRightClickedElement = e.target;
}, true);

// Inject custom region CSS rules once
(function injectRegionStyles() {
  const id = "pagesnap-region-select-styles";
  if (document.getElementById(id) || document.getElementById("web2md-region-select-styles")) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    .pagesnap-region-highlighted, .web2md-region-highlighted {
      outline: 2px dashed #8b5cf6 !important;
      outline-offset: -2px !important;
      cursor: crosshair !important;
    }
  `;
  document.documentElement.appendChild(style);
})();

/**
 * Region Selection Mode Helpers and Logic
 */
let currentIntent = 'region';

// plan-exempt — support distinct intent for studio vs region selection
Web2MD.toggleRegionSelectionMode = function (forceValue, intent = 'region') {
  const enabled = forceValue !== undefined ? forceValue : !Web2MD.isRegionSelectionActive;
  Web2MD.isRegionSelectionActive = enabled;
  currentIntent = intent || 'region';

  if (enabled) {
    document.addEventListener("mouseover", handleRegionMouseOver, true);
    document.addEventListener("mouseout", handleRegionMouseOut, true);
    document.addEventListener("click", handleRegionClick, true);
    document.addEventListener("keydown", handleRegionKeyDown, true);

    const msg = currentIntent === 'studio'
      ? "✨ Component Studio: Click any component to inspect & customize."
      : "🎯 Select Region: Click any element to export. Press Esc to cancel.";
    Web2MD.showToast(msg);
  } else {
    document.removeEventListener("mouseover", handleRegionMouseOver, true);
    document.removeEventListener("mouseout", handleRegionMouseOut, true);
    document.removeEventListener("click", handleRegionClick, true);
    document.removeEventListener("keydown", handleRegionKeyDown, true);

    hideInspectorOverlay();
    if (lastHoveredElement) {
      lastHoveredElement.classList.remove("pagesnap-region-highlighted", "web2md-region-highlighted");
      lastHoveredElement = null;
    }
  }
};

// plan-exempt — DevTools-grade inspector overlay for modern dynamic sites like Linear
let inspectorOverlay = null;

function ensureInspectorOverlay() {
  if (inspectorOverlay && document.body.contains(inspectorOverlay)) return inspectorOverlay;
  inspectorOverlay = document.getElementById('pagesnap-inspector-overlay');
  if (inspectorOverlay) return inspectorOverlay;

  inspectorOverlay = document.createElement('div');
  inspectorOverlay.id = 'pagesnap-inspector-overlay';
  Object.assign(inspectorOverlay.style, {
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
  inspectorOverlay.appendChild(badge);
  document.body.appendChild(inspectorOverlay);
  return inspectorOverlay;
}

function updateInspectorOverlay(el) {
  if (!el || el === document.body || el === document.documentElement) {
    hideInspectorOverlay();
    return;
  }
  const overlay = ensureInspectorOverlay();
  const rect = el.getBoundingClientRect();
  const scrollX = window.scrollX || document.documentElement.scrollLeft;
  const scrollY = window.scrollY || document.documentElement.scrollTop;

  overlay.style.top = `${rect.top + scrollY}px`;
  overlay.style.left = `${rect.left + scrollX}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
  overlay.style.display = 'block';

  const badge = overlay.querySelector('#pagesnap-inspector-badge');
// plan-exempt — fix badge position logic
  if (badge) {
    const desc = Web2MD.getElementDescription(el);
    const hint = currentIntent === 'studio' ? '✨ Open Studio' : '↑ Parent';
    badge.innerText = `${desc} • ${Math.round(rect.width)}×${Math.round(rect.height)}px [${hint}]`;
    if (rect.top < 28) {
      badge.style.top = `${rect.height + 4}px`;
    } else {
      badge.style.top = '-24px';
    }
  }
}

// plan-exempt — clean hideInspectorOverlay
function hideInspectorOverlay() {
  if (inspectorOverlay) {
    inspectorOverlay.style.display = 'none';
  }
}
function handleRegionKeyDown(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    Web2MD.toggleRegionSelectionMode(false);
    Web2MD.showToast("🎯 Selection mode cancelled.");
  } else if (e.key === "ArrowUp") {
    // Expand to parent element via keyboard
    if (lastHoveredElement && lastHoveredElement.parentElement && lastHoveredElement.parentElement !== document.body) {
      e.preventDefault();
      lastHoveredElement = lastHoveredElement.parentElement;
      updateInspectorOverlay(lastHoveredElement);
    }
  } else if (e.key === "ArrowDown") {
    // Shrink to first child element via keyboard
    if (lastHoveredElement && lastHoveredElement.firstElementChild) {
      e.preventDefault();
      lastHoveredElement = lastHoveredElement.firstElementChild;
      updateInspectorOverlay(lastHoveredElement);
    }
  }
}

function isPageSnapUiElement(target) {
  if (!target) return false;
  return !!(
    target.closest("#pagesnap-region-actions-bar") ||
    target.closest("#web2md-region-actions-bar") ||
    target.closest("#pagesnap-toast") ||
    target.closest("#web2md-toast") ||
    target.closest("#pagesnap-component-studio-modal") ||
    target.closest("#pagesnap-inspector-overlay")
  );
}

function handleRegionMouseOver(e) {
  if (!Web2MD.isRegionSelectionActive) return;
  if (isPageSnapUiElement(e.target)) return;

  lastHoveredElement = e.target;
  updateInspectorOverlay(lastHoveredElement);
}

function handleRegionMouseOut(e) {
  if (!Web2MD.isRegionSelectionActive) return;
  if (isPageSnapUiElement(e.target)) return;
}

function handleRegionClick(e) {
  if (!Web2MD.isRegionSelectionActive) return;
  if (isPageSnapUiElement(e.target)) return;

  e.preventDefault();
  e.stopPropagation();

  const target = lastHoveredElement || e.target;
  const intent = currentIntent;

  Web2MD.toggleRegionSelectionMode(false);
  hideInspectorOverlay();

  if (intent === 'studio' && typeof Web2MD.openComponentStudioModal === 'function') {
    Web2MD.openComponentStudioModal(target);
  } else {
    Web2MD.highlightElement(target);
    Web2MD.showRegionActionsBar(target);
  }
}
Web2MD.highlightElement = function (element) {
  document.querySelectorAll(".pagesnap-region-highlighted, .web2md-region-highlighted").forEach(el => {
    el.classList.remove("pagesnap-region-highlighted", "web2md-region-highlighted");
  });
  if (element) {
    element.classList.add("pagesnap-region-highlighted");
  }
};
// plan-exempt — remove duplicate highlightElement definition
Web2MD.getElementDescription = function (el) {
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
};

Web2MD.registerHandlers({
  getRegionSelectionState: (request, sender, sendResponse) => {
    sendResponse({ active: Web2MD.isRegionSelectionActive });
    return true;
  },
  toggleRegionSelection: (request, sender, sendResponse) => {
    Web2MD.toggleRegionSelectionMode(request.enabled, request.intent);
    sendResponse({ success: true, active: Web2MD.isRegionSelectionActive, intent: currentIntent });
    return true;
  },
  contextMenuCopyRegion: (request, sender, sendResponse) => {
    if (lastRightClickedElement) {
      Web2MD.handleRegionAction(lastRightClickedElement, request.format);
    } else {
      Web2MD.showToast("❌ No element selected to copy", true);
    }
    sendResponse({ success: true });
    return true;
  }
});
