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

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const h = Web2MD.handlers[request.action];
    if (!h) return;
    return h(request, sender, sendResponse) === true;
  });
}

// plan-exempt — send buildId in ping response for dynamic injection invalidation
Web2MD.registerHandlers({
  ping: (request, sender, sendResponse) => {
    sendResponse({ success: true, buildId: '20261024-studio-1' });
    return true;
  }
});

