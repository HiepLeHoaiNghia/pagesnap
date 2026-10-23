// plan-exempt — PageSnap branding update
/**
 * PageSnap popup window resize: restores saved popup size and wires the
 * drag-to-resize handle.
 */
import { safeStorage } from './state.js';

export function initResize() {
  // Load and apply custom popup size
  Promise.all([
    safeStorage.get('popupWidth'),
    safeStorage.get('popupHeight')
  ]).then(([w, h]) => {
    if (w) document.body.style.width = w;
    if (h) document.body.style.height = h;
  });

  // Drag to Resize Logic
  const resizeHandle = document.getElementById('resize-handle');
  if (resizeHandle) {
    let isResizing = false;
    let startWidth, startHeight, startX, startY;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startWidth = document.body.clientWidth;
      startHeight = document.body.clientHeight;
      startX = e.clientX;
      startY = e.clientY;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      e.preventDefault();
    });

    function handleMouseMove(e) {
      if (!isResizing) return;
      const newWidth = Math.min(800, Math.max(400, startWidth + (e.clientX - startX)));
      const newHeight = Math.min(600, Math.max(350, startHeight + (e.clientY - startY)));
      document.body.style.width = newWidth + 'px';
      document.body.style.height = newHeight + 'px';
    }

    function handleMouseUp() {
      if (!isResizing) return;
      isResizing = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Save dimensions
      safeStorage.set('popupWidth', document.body.style.width);
      safeStorage.set('popupHeight', document.body.style.height);
    }
  }
}
