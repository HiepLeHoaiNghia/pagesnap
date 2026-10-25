// plan-exempt — PageSnap branding update
/**
 * PageSnap popup HTML Snapshot: clean standalone ZIP package download.
 */
import { appState } from './state.js';

const btnDownloadZip = document.getElementById('btn-download-zip');

// plan-exempt — clean native ZIP blob download without popup context timeout
function downloadFileBlob(blob, filename) {
  try {
    const blobWithMime = new Blob([blob], { type: 'application/zip' });
    const url = URL.createObjectURL(blobWithMime);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    }, 20000);
  } catch (err) {
    console.error("Native blob download failed, attempting data URL fallback:", err);
    const reader = new FileReader();
    reader.onload = function(e) {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = e.target.result;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { if (a.parentNode) a.parentNode.removeChild(a); }, 2000);
    };
    reader.readAsDataURL(blob);
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
    btnDownloadZip.addEventListener('click', () => {
      if (!appState.currentHtml) return;

      buildZipBlob().then((blob) => {
        const sanitizedTitle = (appState.extractedData ? appState.extractedData.title : 'webpage')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 50) || 'webpage';
        const filename = `${sanitizedTitle}-snapshot.zip`;
        downloadFileBlob(blob, filename);
      }).catch(err => {
        console.error("ZIP creation failed:", err);
      });
    });
  }
}
