/**
 * Web2MD Visual Edit Mode Implementation
 */
Web2MD.isVisualEditActive = false;

Web2MD.toggleVisualEditMode = function (enabled) {
  Web2MD.isVisualEditActive = !!enabled;

  if (Web2MD.isVisualEditActive) {
    if (Web2MD.isRegionSelectionActive) {
      Web2MD.toggleRegionSelectionMode(false);
    }
    document.designMode = "on";

    // 1. Inject styling if not already present
    let styleEl = document.getElementById('web2md-visual-edit-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'web2md-visual-edit-styles';
      styleEl.textContent = `
        .web2md-hover-active {
          outline: 1px dashed #3b82f6 !important;
          cursor: text !important;
        }
      `;
      document.head.appendChild(styleEl);
    }

    // 2. Add event listeners
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleLinkClick, true);
    document.addEventListener('dblclick', handleImageDblClick, true);

    Web2MD.showToast("🎨 Visual Edit Mode enabled!");
  } else {
    document.designMode = "off";

    // Remove styling element
    const styleEl = document.getElementById('web2md-visual-edit-styles');
    if (styleEl) {
      styleEl.remove();
    }

    // Remove any leftover hover class from elements
    document.querySelectorAll('.web2md-hover-active').forEach(el => {
      el.classList.remove('web2md-hover-active');
    });

    // Remove event listeners
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('click', handleLinkClick, true);
    document.removeEventListener('dblclick', handleImageDblClick, true);

    Web2MD.showToast("🎨 Visual Edit Mode disabled.");
  }
};

function handleMouseOver(e) {
  if (!Web2MD.isVisualEditActive) return;
  const el = e.target;
  if (el && el !== document.body && el !== document.documentElement && !el.closest('#web2md-toast')) {
    el.classList.add('web2md-hover-active');
  }
}

function handleMouseOut(e) {
  const el = e.target;
  if (el) {
    el.classList.remove('web2md-hover-active');
  }
}

function handleLinkClick(e) {
  if (!Web2MD.isVisualEditActive) return;
  const anchor = e.target.closest('a');
  if (anchor) {
    e.preventDefault();
    e.stopPropagation();
    Web2MD.showToast("Link click blocked in Edit Mode");
  }
}

function handleImageDblClick(e) {
  if (!Web2MD.isVisualEditActive) return;
  if (e.target.tagName === 'IMG') {
    e.preventDefault();
    e.stopPropagation();
    const newSrc = prompt("Enter new image URL:", e.target.src);
    if (newSrc !== null && newSrc.trim() !== '') {
      e.target.src = newSrc.trim();
      Web2MD.showToast("Image source updated!");
    }
  }
}

Web2MD.registerHandlers({
  getVisualEditState: (request, sender, sendResponse) => {
    sendResponse({ active: Web2MD.isVisualEditActive });
    return true;
  },
  toggleVisualEdit: (request, sender, sendResponse) => {
    Web2MD.toggleVisualEditMode(request.enabled);
    sendResponse({ success: true, active: Web2MD.isVisualEditActive });
    return true;
  }
});
