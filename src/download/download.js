// plan-exempt — dedicated background download execution tab
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
    }, 4000);
  });
})();
