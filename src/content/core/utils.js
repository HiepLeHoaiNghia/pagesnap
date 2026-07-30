/**
 * Web2MD content shared utilities: toast notifications and clipboard copy.
 */

/**
 * Injects a modern floating toast notification on the page
 */
Web2MD.showToast = function (message, isWarning = false) {
  // Remove existing toast if any
  const existingToast = document.getElementById('web2md-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.id = 'web2md-toast';
  toast.innerText = message;

  // Custom styles for premium look
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '12px 24px',
    borderRadius: '12px',
    background: isWarning
      ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
      : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    zIndex: '2147483647', // Maximum z-index
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'translateY(100px)',
    opacity: '0',
    pointerEvents: 'none',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  });

  document.body.appendChild(toast);

  // Trigger animation (reflow then style changes)
  toast.offsetHeight; // force reflow
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';

  // Fade out and remove
  setTimeout(() => {
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2500);
};

/**
 * Robustly copies text to clipboard, falling back to document.execCommand if navigator.clipboard is unavailable or restricted.
 */
Web2MD.copyTextToClipboard = async function (text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("navigator.clipboard.writeText failed, trying fallback:", err);
    }
  }

  // Fallback using textarea and execCommand
  const textArea = document.createElement("textarea");
  textArea.value = text;

  // Keep it off-screen and static
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.width = "2em";
  textArea.style.height = "2em";
  textArea.style.padding = "0";
  textArea.style.border = "none";
  textArea.style.outline = "none";
  textArea.style.boxShadow = "none";
  textArea.style.background = "transparent";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) return true;
    throw new Error("execCommand('copy') returned false");
  } catch (err) {
    document.body.removeChild(textArea);
    console.error("Fallback copy failed:", err);
    throw err;
  }
};
