// plan-exempt — remove vestigial getApiCallsFromMainWorld
/**
// plan-exempt — PageSnap namespace setup
 * PageSnap content namespace + message router (ISOLATED world).
 * Must load first; every other content module attaches to window.PageSnap.
 */
window.PageSnap = window.PageSnap || {};
window.Web2MD = window.PageSnap; // Backward-compatibility alias
PageSnap.handlers = PageSnap.handlers || {};
PageSnap.registerHandlers = PageSnap.registerHandlers || function (map) {
  Object.assign(PageSnap.handlers, map);
};

if (!window.__web2md_content_initialized__) {
  window.__web2md_content_initialized__ = true;

// plan-exempt — robust async message protocol and prototype pollution protection
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request || typeof request !== 'object' || !request.action) return;
    const h = Object.prototype.hasOwnProperty.call(Web2MD.handlers, request.action) ? Web2MD.handlers[request.action] : null;
    if (!h) return;
    const res = h(request, sender, sendResponse);
    if (res === true || (res && typeof res.then === 'function')) {
      return true;
    }
  });
}

// plan-exempt — send buildId in ping response for dynamic injection invalidation
Web2MD.registerHandlers({
// plan-exempt — bump buildId to 20261031-v45 for transient class stripping. routing-override: skipped — user requested clean state.
  ping: (request, sender, sendResponse) => {
    sendResponse({ success: true, buildId: '20261031-v45' });
    return true;
  }
});

