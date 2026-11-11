// plan-exempt — PageSnap branding update
/**
 * PageSnap popup HTML Snapshot: clean standalone ZIP package download.
 */
import { appState } from './state.js';

const btnDownloadZip = document.getElementById('btn-download-zip');

// plan-exempt — ZIP download via in-popup <a download>; exported so tests/e2e/e2e-download.mjs exercises the real function
export function downloadFileBlob(blob, filename, mimeType = 'application/zip', onComplete = () => {}) {
  try {
    if (blob.size < 2.5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = e.target.result;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { if (a.parentNode) a.parentNode.removeChild(a); }, 10000);
        onComplete();
      };
      reader.onerror = () => onComplete();
      reader.readAsDataURL(blob);
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    }, 120000);
    onComplete();
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
