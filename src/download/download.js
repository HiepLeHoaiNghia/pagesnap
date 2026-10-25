// plan-exempt — robust download execution tab with visible feedback and safe completion delay
(function() {
  const statusEl = document.getElementById('status');

  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    if (statusEl) statusEl.innerText = 'Storage API unavailable';
    return;
  }

  chrome.storage.local.get('pendingDownload', (data) => {
    const item = data && data.pendingDownload;
    if (!item || (!item.content && !item.dataUrl) || !item.filename) {
      if (statusEl) statusEl.innerText = 'No pending download found.';
      setTimeout(() => window.close(), 1500);
      return;
    }

    // Clean up storage key
    chrome.storage.local.remove('pendingDownload');

    if (statusEl) statusEl.innerText = `Saving ${item.filename}...`;

    let downloadUrl = '';
    let isBlob = false;

    if (item.isDataUrl && item.dataUrl) {
      downloadUrl = item.dataUrl;
    } else {
      const mime = item.mimeType || 'application/octet-stream';
      const blob = new Blob([item.content], { type: mime });
      downloadUrl = URL.createObjectURL(blob);
      isBlob = true;
    }

    if (typeof chrome !== 'undefined' && chrome.downloads && typeof chrome.downloads.download === 'function') {
      chrome.downloads.download({
        url: downloadUrl,
        filename: item.filename,
        conflictAction: 'uniquify',
        saveAs: false
      }, (downloadId) => {
        if (chrome.runtime.lastError || !downloadId) {
          const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : 'no downloadId';
          if (statusEl) {
            statusEl.innerText = `❌ Download failed: ${err}`;
            statusEl.style.color = '#ef4444';
          }
          return;
        }

        // Wait until Chrome finishes writing bytes AND renames the file
        const listener = (delta) => {
          if (delta.id === downloadId && delta.state) {
            if (delta.state.current === 'complete') {
              chrome.downloads.onChanged.removeListener(listener);
              if (statusEl) {
                statusEl.innerText = `✅ Successfully saved as ${item.filename}!`;
                statusEl.style.color = '#34d399';
              }
              // Keep blob alive and keep tab open for 8s to let macOS finalize rename
              setTimeout(() => {
                if (isBlob) URL.revokeObjectURL(downloadUrl);
                window.close();
              }, 8000);
            } else if (delta.state.current === 'interrupted') {
              chrome.downloads.onChanged.removeListener(listener);
              const errReason = delta.error ? delta.error.current : 'unknown';
              if (statusEl) {
                statusEl.innerText = `❌ Download interrupted: ${errReason}`;
                statusEl.style.color = '#ef4444';
              }
              // Do NOT close tab on error so user can inspect
            }
          }
        };
        chrome.downloads.onChanged.addListener(listener);
      });
    } else {
      // Fallback anchor
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
        if (isBlob) URL.revokeObjectURL(downloadUrl);
        window.close();
      }, 5000);
    }
  });
})();
