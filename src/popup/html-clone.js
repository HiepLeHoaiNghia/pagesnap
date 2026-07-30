/**
 * Web2MD popup HTML Clone tab: ZIP package download + Netlify deploy.
 *
 * NOTE: keeps its own buildZipBlob/dataURLtoBlob (does not reuse
 * Web2MD.buildZipFromPackage from src/content/html-clone/zip-builder.js) —
 * the popup needs to (a) fall back to a plain index.html when currentPackage
 * is null, (b) fold in appState.extractedData.projectFiles, and (c) download
 * the resulting blob directly via chrome.downloads/anchor rather than via the
 * background "triggerDownload" message the content-script version uses. The
 * shapes diverge enough that a straight reuse would need its own branching
 * anyway, so the duplicate is kept (see brief).
 */
import { appState, safeStorage } from './state.js';

const btnDownloadZip = document.getElementById('btn-download-zip');
const btnDeploy = document.getElementById('btn-deploy');
const checkNetlifyToken = document.getElementById('setting-netlify-token');
const settingsPane = document.getElementById('settings-pane');

function downloadFileBlob(blob, filename) {
  if (typeof chrome !== 'undefined' && chrome.downloads) {
    const reader = new FileReader();
    reader.onload = function(e) {
      chrome.downloads.download({
        url: e.target.result,
        filename: filename,
        saveAs: true
      });
    };
    reader.readAsDataURL(blob);
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 10000);
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
    if (appState.currentPackage.js && appState.currentPackage.js.trim().length > 0) {
      zip.file("scripts.js", appState.currentPackage.js);
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
    zip.file("index.html", appState.currentHtml);
  }

  if (appState.extractedData && appState.extractedData.projectFiles && appState.extractedData.projectFiles.length > 0) {
    appState.extractedData.projectFiles.forEach(file => {
      zip.file(file.path, file.content);
    });
  }

  return await zip.generateAsync({ type: "blob" });
}

export function initHtmlClone() {
  // Load Netlify token on startup
  safeStorage.get('netlifyToken').then((token) => {
    if (checkNetlifyToken && token) {
      checkNetlifyToken.value = token;
    }
  });

  if (checkNetlifyToken) {
    checkNetlifyToken.addEventListener('input', () => {
      safeStorage.set('netlifyToken', checkNetlifyToken.value.trim());
    });
  }

  // ZIP Download Listener
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
        const filename = `${sanitizedTitle}-package.zip`;
        downloadFileBlob(blob, filename);
      }).catch(err => {
        console.error("ZIP creation failed:", err);
        alert("Failed to build ZIP file: " + err.message);
      });
    });
  }

  // Netlify Deploy Listener
  if (btnDeploy) {
    btnDeploy.addEventListener('click', async () => {
      if (!appState.currentHtml) return;

      const token = checkNetlifyToken ? checkNetlifyToken.value.trim() : '';
      if (!token) {
        if (settingsPane) settingsPane.classList.remove('hidden');
        if (checkNetlifyToken) checkNetlifyToken.focus();
        alert("Please configure your Netlify Personal Access Token in Settings first.");
        return;
      }

      btnDeploy.innerHTML = '<span class="spinner">🚀</span> Deploying...';
      btnDeploy.disabled = true;

      try {
        const zipBlob = await buildZipBlob();

        const pageKey = `netlifySiteId_${encodeURIComponent(appState.extractedData.url)}`;
        let siteId = await safeStorage.get(pageKey);
        let siteUrl = '';

        if (!siteId) {
          // Create new site
          const createRes = await fetch('https://api.netlify.com/api/v1/sites', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              custom_domain: null,
              name: `web2md-${Math.random().toString(36).substr(2, 8)}`
            })
          });

          if (!createRes.ok) {
            const errJson = await createRes.json().catch(() => ({}));
            throw new Error(errJson.message || `Failed to create site (${createRes.status})`);
          }

          const createData = await createRes.json();
          siteId = createData.id;
          siteUrl = createData.ssl_url || createData.url;
          await safeStorage.set(pageKey, siteId);
        } else {
          // Verify/Get existing site
          const siteRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (siteRes.ok) {
            const siteData = await siteRes.json();
            siteUrl = siteData.ssl_url || siteData.url;
          } else {
            // Site probably deleted, create a new one
            const createRes = await fetch('https://api.netlify.com/api/v1/sites', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                custom_domain: null,
                name: `web2md-${Math.random().toString(36).substr(2, 8)}`
              })
            });
            if (!createRes.ok) {
              const errJson = await createRes.json().catch(() => ({}));
              throw new Error(errJson.message || `Failed to recreate site (${createRes.status})`);
            }
            const createData = await createRes.json();
            siteId = createData.id;
            siteUrl = createData.ssl_url || createData.url;
            await safeStorage.set(pageKey, siteId);
          }
        }

        // Upload zip to Netlify deploy
        const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/zip'
          },
          body: zipBlob
        });

        if (!deployRes.ok) {
          const errJson = await deployRes.json().catch(() => ({}));
          throw new Error(errJson.message || `Deploy upload failed (${deployRes.status})`);
        }

        btnDeploy.innerHTML = 'Live! ✓';
        btnDeploy.classList.add('success-flash');
        setTimeout(() => {
          btnDeploy.innerHTML = '🚀 Deploy Netlify';
          btnDeploy.disabled = false;
          btnDeploy.classList.remove('success-flash');
        }, 3000);

        chrome.tabs.create({ url: siteUrl });
      } catch (err) {
        console.error("Netlify deployment failed:", err);
        alert("Deployment failed: " + err.message);
        btnDeploy.innerHTML = '🚀 Deploy Netlify';
        btnDeploy.disabled = false;
      }
    });
  }
}
