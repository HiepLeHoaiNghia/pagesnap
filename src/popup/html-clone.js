// plan-exempt — PageSnap branding update
/**
 * PageSnap popup HTML Snapshot: clean standalone ZIP package download.
 */
import { appState } from './state.js';

const btnDownloadZip = document.getElementById('btn-download-zip');

// plan-exempt — clean native ZIP blob download without popup context timeout
// plan-exempt — safe self-contained data URL download for ZIP packages
function downloadFileBlob(blob, filename, onComplete = () => {}) {
  try {
    const blobWithMime = new Blob([blob], { type: 'application/zip' });
    const reader = new FileReader();
    reader.onload = function(e) {
      if (typeof chrome !== 'undefined' && chrome.downloads && typeof chrome.downloads.download === 'function') {
        chrome.downloads.download({
          url: e.target.result,
          filename: filename,
          saveAs: false
        }, () => {
          onComplete();
        });
      } else {
        onComplete();
      }
    };
    reader.readAsDataURL(blobWithMime);
  } catch (err) {
    console.error("[PageSnap] ZIP download failed:", err);
    onComplete();
  }
}

function dataURLtoBlob(dataUrl) {
  if (!dataUrl) return null;
  const parts = dataUrl.split(',');
  if (parts.length < 2) return null;
  const mime = parts[0].match(/:(.*?);/)[1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

async function buildZipBlob() {
  const zip = new JSZip();

  if (appState.currentPackage) {
    zip.file("index.html", appState.currentPackage.html);
    if (appState.currentPackage.css && appState.currentPackage.css.trim().length > 0) {
      zip.file("styles.css", appState.currentPackage.css);
    }
    if (appState.currentPackage.assets && appState.currentPackage.assets.length > 0) {
      appState.currentPackage.assets.forEach(file => {
        const blob = dataURLtoBlob(file.dataUrl);
        if (blob) {
          zip.file(file.path, blob);
        }
      });
    }
  } else {
    zip.file("index.html", appState.currentHtml || '');
  }

  return await zip.generateAsync({ type: "blob" });
}

export function initHtmlClone() {
  if (btnDownloadZip) {
    btnDownloadZip.addEventListener('click', async () => {
      if (!appState.currentHtml) return;
      const origHtml = btnDownloadZip.innerHTML;
      btnDownloadZip.innerHTML = '⏳ Packaging...';
      btnDownloadZip.disabled = true;

      try {
        const blob = await buildZipBlob();
        const sanitizedTitle = (appState.extractedData ? appState.extractedData.title : 'webpage')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 50) || 'webpage';
        const filename = `${sanitizedTitle}-snapshot.zip`;
        downloadFileBlob(blob, filename, () => {
          btnDownloadZip.innerHTML = '✅ Saved!';
          setTimeout(() => {
            btnDownloadZip.innerHTML = origHtml;
            btnDownloadZip.disabled = false;
          }, 2000);
        });
      } catch (err) {
        console.error("ZIP creation failed:", err);
        btnDownloadZip.innerHTML = origHtml;
        btnDownloadZip.disabled = false;
      }
    });
  }
}
