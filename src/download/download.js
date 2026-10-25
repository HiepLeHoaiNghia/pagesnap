// plan-exempt — dedicated background download execution tab using official chrome.downloads API
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
          if (statusEl) statusEl.innerText = 'Download failed: ' + (chrome.runtime.lastError ? chrome.runtime.lastError.message : 'no downloadId');
          setTimeout(() => window.close(), 3000);
          return;
        }

        // Wait until Chrome finishes writing bytes AND renames the file!
        const listener = (delta) => {
          if (delta.id === downloadId && delta.state && (delta.state.current === 'complete' || delta.state.current === 'interrupted')) {
            chrome.downloads.onChanged.removeListener(listener);
            if (isBlob) URL.revokeObjectURL(downloadUrl);
            setTimeout(() => window.close(), 500);
          }
        };
        chrome.downloads.onChanged.addListener(listener);
      });
    } else {
      // Fallback only if chrome.downloads is unavailable
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
