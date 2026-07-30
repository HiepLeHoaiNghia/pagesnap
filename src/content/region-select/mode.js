/**
 * Web2MD Region Selection Mode: hover/click element picking and context-menu entry point.
 */
Web2MD.isRegionSelectionActive = false;
let lastHoveredElement = null;
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

/**
 * Region Selection Mode Helpers and Logic
 */
Web2MD.toggleRegionSelectionMode = function (forceValue) {
  const enabled = forceValue !== undefined ? forceValue : !Web2MD.isRegionSelectionActive;
  Web2MD.isRegionSelectionActive = enabled;

  if (enabled) {
    if (Web2MD.isVisualEditActive) {
      Web2MD.toggleVisualEditMode(false);
    }
    if (Web2MD.isInspectActive) {
      Web2MD.isInspectActive = false;
      window.postMessage({ type: 'WEB2MD_TOGGLE_INSPECT', enabled: false }, '*');
    }

    document.addEventListener("mouseover", handleRegionMouseOver, true);
    document.addEventListener("mouseout", handleRegionMouseOut, true);
    document.addEventListener("click", handleRegionClick, true);
    document.addEventListener("keydown", handleRegionKeyDown, true);

    Web2MD.showToast("🎯 Selection mode active. Click any element to select. Press Esc to cancel.");
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
};

function handleRegionKeyDown(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    Web2MD.toggleRegionSelectionMode(false);
    Web2MD.showToast("🎯 Selection mode cancelled.");
  }
}

function handleRegionMouseOver(e) {
  if (!Web2MD.isRegionSelectionActive) return;
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
  if (!Web2MD.isRegionSelectionActive) return;
  if (lastHoveredElement === e.target) {
    lastHoveredElement.classList.remove("web2md-region-highlighted");
    lastHoveredElement = null;
  }
}

function handleRegionClick(e) {
  if (!Web2MD.isRegionSelectionActive) return;
  if (e.target.closest("#web2md-region-actions-bar") || e.target.closest("#web2md-toast")) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  const target = e.target;
  Web2MD.toggleRegionSelectionMode(false);
  Web2MD.highlightElement(target);
  Web2MD.showRegionActionsBar(target);
}

Web2MD.highlightElement = function (element) {
  document.querySelectorAll(".web2md-region-highlighted").forEach(el => {
    el.classList.remove("web2md-region-highlighted");
  });
  if (element) {
    element.classList.add("web2md-region-highlighted");
  }
};

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
    Web2MD.toggleRegionSelectionMode(request.enabled);
    sendResponse({ success: true, active: Web2MD.isRegionSelectionActive });
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
