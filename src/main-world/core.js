(function() {
  if (window.__web2md_mw_core__) {
    return;
  }
  window.__web2md_mw_core__ = true;

  // Shared namespace for cross-file references between main-world modules.
  window.__web2mdMW = window.__web2mdMW || {};

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  window.__web2mdMW.escapeHtml = escapeHtml;

  function showToast(message, type = 'success') {
    const modalHostEl = window.__web2mdMW.modalHostEl;
    if (!modalHostEl) return;
    const shadow = modalHostEl.shadowRoot;
    const container = shadow.querySelector('.toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'error') {
      toast.style.background = '#ef4444';
    } else if (type === 'warning') {
      toast.style.background = '#f59e0b';
    } else {
      toast.style.background = '#10b981';
    }
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 2500);
  }
  window.__web2mdMW.showToast = showToast;

})();
