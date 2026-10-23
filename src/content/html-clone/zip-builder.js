// plan-exempt — split developer features into pagereplica-extension approved by user
/**
 * Web2MD HTML Clone: builds a downloadable ZIP package from a serialized structured package.
 */

/**
 * Packages a structured serialization result (html/css/js/assets) into a ZIP file
 * and triggers its download via the background script.
 */
Web2MD.buildZipFromPackage = async function (pkg, apiCalls, filename) {
  const zip = new JSZip();
  zip.file("index.html", pkg.html);
  if (pkg.css && pkg.css.trim().length > 0) {
    zip.file("styles.css", pkg.css);
  }
  if (pkg.js && pkg.js.trim().length > 0) {
    zip.file("scripts.js", pkg.js);
  }
  if (pkg.assets && pkg.assets.length > 0) {
    pkg.assets.forEach(file => {
      const parts = file.dataUrl.split(',');
      if (parts.length >= 2) {
        const mime = parts[0].match(/:(.*?);/)[1];
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const assetBlob = new Blob([u8arr], { type: mime });
        zip.file(file.path, assetBlob);
      }
    });
  }


  const zipBlob = await zip.generateAsync({ type: "blob" });
  const reader = new FileReader();
  reader.onload = function(e) {
    chrome.runtime.sendMessage({
      action: "triggerDownload",
      url: e.target.result,
      filename: filename
    });
    Web2MD.showToast("📥 Region ZIP package download triggered!");
  };
  reader.readAsDataURL(zipBlob);
};
