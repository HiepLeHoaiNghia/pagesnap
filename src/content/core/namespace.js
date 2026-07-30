/**
 * Web2MD content namespace + message router (ISOLATED world).
 * Must load first; every other content module attaches to window.Web2MD.
 */
window.Web2MD = window.Web2MD || {};
Web2MD.handlers = Web2MD.handlers || {};
Web2MD.registerHandlers = Web2MD.registerHandlers || function (map) {
  Object.assign(Web2MD.handlers, map);
};

if (!window.__web2md_content_initialized__) {
  window.__web2md_content_initialized__ = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const h = Web2MD.handlers[request.action];
    if (!h) return;
    return h(request, sender, sendResponse) === true;
  });
}

Web2MD.registerHandlers({
  ping: (request, sender, sendResponse) => {
    sendResponse({ success: true });
    return true;
  }
});

// Default stub — overridden by mock-bridge/relay.js when the apiMock/inspect
// feature is enabled. Without the MAIN-world interceptor there are no captured
// calls, so region/clone exports proceed with an empty API cache.
Web2MD.getApiCallsFromMainWorld = function () {
  return Promise.resolve([]);
};
