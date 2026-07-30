(function() {
  if (window.__web2md_mw_api__) {
    return;
  }
  window.__web2md_mw_api__ = true;

  window.__web2mdMW = window.__web2mdMW || {};

  // Intercept Fetch and XHR calls to sniff API endpoints and payloads
  const apiCalls = [];
  window.__web2md_api_calls = apiCalls;

  function parseStackTrace(stack) {
    if (!stack) return [];
    const lines = stack.split('\n');
    const callers = [];
    for (const line of lines) {
      if (line.includes('main_world.js') || line.includes('XMLHttpRequest') || line.includes('originalFetch') || line.includes('at fetch') || line.includes('at window.fetch') || line.includes('Error')) {
        continue;
      }
      const matchWithCall = line.match(/^\s*at\s+([^\s(]+)\s*\((.+)\)/);
      const matchUrlOnly = line.match(/^\s*at\s+(.+)/);

      if (matchWithCall) {
        const funcName = matchWithCall[1];
        const urlAndCoords = matchWithCall[2];
        callers.push({ functionName: funcName, location: urlAndCoords });
      } else if (matchUrlOnly) {
        const urlAndCoords = matchUrlOnly[1];
        if (urlAndCoords.includes('anonymous')) continue;
        callers.push({ functionName: 'anonymous', location: urlAndCoords });
      }
    }
    return callers;
  }

  let isMockingEnabled = true;
  let apiMocks = [];

  try {
    const cachedMocks = sessionStorage.getItem('web2md_api_mocks');
    if (cachedMocks) {
      apiMocks = JSON.parse(cachedMocks) || [];
    }
    const cachedEnabled = sessionStorage.getItem('web2md_mocking_enabled');
    if (cachedEnabled !== null) {
      isMockingEnabled = cachedEnabled === 'true';
    }
  } catch (e) {
    console.warn('[Web2MD] Failed to load from sessionStorage:', e);
  }
  window.__web2mdMW.apiMocks = apiMocks;

  window.addEventListener('message', (event) => {
    if (event.source === window && event.data) {
      if (event.data.type === 'WEB2MD_SET_MOCKS') {
        apiMocks = event.data.mocks || [];
        window.__web2mdMW.apiMocks = apiMocks;
        try {
          sessionStorage.setItem('web2md_api_mocks', JSON.stringify(apiMocks));
        } catch(e) {}
      } else if (event.data.type === 'WEB2MD_SET_MOCKING_ENABLED') {
        isMockingEnabled = event.data.enabled !== false;
        try {
          sessionStorage.setItem('web2md_mocking_enabled', String(isMockingEnabled));
        } catch(e) {}
      }
    }
  });

  function matchMock(reqUrl, reqMethod) {
    if (!isMockingEnabled) return null;
    try {
      const parsedReq = new URL(reqUrl, window.location.href);
      const reqPath = parsedReq.origin + parsedReq.pathname;

      for (const entry of apiMocks) {
        if (!entry.isMocked) continue;
        if (entry.method && entry.method.toUpperCase() !== reqMethod.toUpperCase()) continue;
        try {
          const parsedCache = new URL(entry.url, window.location.href);
          const cachePath = parsedCache.origin + parsedCache.pathname;
          if (reqPath === cachePath) {
            return entry;
          }
        } catch(e) {}
      }
    } catch(e) {}

    for (const entry of apiMocks) {
      if (!entry.isMocked) continue;
      if (entry.method && entry.method.toUpperCase() !== reqMethod.toUpperCase()) continue;
      if (reqUrl.includes(entry.url) || entry.url.includes(reqUrl)) {
        return entry;
      }
    }
    return null;
  }

  function recordCall(callLog) {
    // Enrichment will be applied by inspector.js (if loaded)
    if (typeof window.__web2md_enrichRecordCall === 'function') {
      window.__web2md_enrichRecordCall(callLog);
    }
    apiCalls.push(callLog);
    window.postMessage({ type: 'WEB2MD_API_CALL_RECORDED', call: callLog }, '*');
  }

  // Intercept Fetch
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const stack = new Error().stack || '';
    const callers = parseStackTrace(stack);

    const input = args[0];
    const init = args[1];
    let url = '';
    let method = 'GET';
    let headers = {};
    let body = null;

    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else if (input && typeof input === 'object' && 'url' in input) {
      url = input.url;
      method = input.method || 'GET';
      headers = input.headers || {};
    }

    if (init) {
      if (init.method) method = init.method;
      if (init.headers) headers = init.headers;
      if (init.body) body = init.body;
    }

    // Format request body if possible
    let reqBodyStr = null;
    if (body) {
      if (typeof body === 'string') {
        reqBodyStr = body;
      } else if (body instanceof URLSearchParams) {
        reqBodyStr = body.toString();
      } else if (body instanceof FormData) {
        try {
          const obj = {};
          body.forEach((value, key) => { obj[key] = value; });
          reqBodyStr = JSON.stringify(obj);
        } catch (e) {}
      } else {
        try {
          reqBodyStr = JSON.stringify(body);
        } catch (e) {}
      }
    }

    const callLog = {
      type: 'fetch',
      url: url,
      method: method.toUpperCase(),
      originalMethod: method.toUpperCase(),
      requestHeaders: headers,
      requestBody: reqBodyStr,
      stack: stack,
      callers: callers,
      timestamp: Date.now()
    };

    const matched = matchMock(url, method);
    if (matched) {
      console.log('[Web2MD Live Mock] Intercepted Fetch:', url);
      const responseText = matched.responseText || '';
      const response = new Response(responseText, {
        status: matched.status || 200,
        statusText: matched.statusText || 'OK',
        headers: new Headers(matched.responseHeaders || {})
      });
      callLog.status = matched.status || 200;
      callLog.statusText = matched.statusText || 'OK';
      callLog.responseHeaders = matched.responseHeaders || {};
      callLog.responseText = responseText;
      callLog.originalStatus = matched.originalStatus || matched.status || 200;
      callLog.originalResponseText = matched.originalResponseText || responseText;
      callLog.isMocked = true;
      recordCall(callLog);
      return response;
    }

    try {
      const response = await originalFetch.apply(this, args);
      const clonedResponse = response.clone();
      callLog.status = clonedResponse.status;
      callLog.statusText = clonedResponse.statusText;

      const responseHeaders = {};
      clonedResponse.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      callLog.responseHeaders = responseHeaders;

      try {
        const text = await clonedResponse.text();
        callLog.responseText = text;
      } catch (e) {
        callLog.responseText = '';
      }
      callLog.originalStatus = callLog.status;
      callLog.originalResponseText = callLog.responseText;
      recordCall(callLog);
      return response;
    } catch (error) {
      callLog.error = error.message;
      recordCall(callLog);
      throw error;
    }
  };

  // Intercept XHR
  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const callLog = {
      type: 'xhr',
      method: 'GET',
      originalMethod: 'GET',
      url: '',
      requestHeaders: {},
      requestBody: null,
      timestamp: Date.now()
    };

    const originalOpen = xhr.open;
    xhr.open = function(method, url, ...rest) {
      callLog.method = method.toUpperCase();
      callLog.originalMethod = method.toUpperCase();
      callLog.url = url;
      return originalOpen.apply(this, [method, url, ...rest]);
    };

    const originalSetRequestHeader = xhr.setRequestHeader;
    xhr.setRequestHeader = function(header, value) {
      callLog.requestHeaders[header] = value;
      return originalSetRequestHeader.apply(this, [header, value]);
    };

    const originalSend = xhr.send;
    xhr.send = function(body) {
      const stack = new Error().stack || '';
      callLog.stack = stack;
      callLog.callers = parseStackTrace(stack);

      if (body) {
        if (typeof body === 'string') {
          callLog.requestBody = body;
        } else {
          try {
            callLog.requestBody = JSON.stringify(body);
          } catch (e) {}
        }
      }

      const matchedEntry = matchMock(callLog.url, callLog.method);
      if (matchedEntry) {
        console.log('[Web2MD Live Mock] Intercepted XHR:', callLog.url);
        Object.defineProperties(xhr, {
          status: {
            get: () => matchedEntry.status || 200,
            configurable: true
          },
          statusText: {
            get: () => matchedEntry.statusText || 'OK',
            configurable: true
          },
          readyState: {
            get: () => 4,
            configurable: true
          },
          responseText: {
            get: () => matchedEntry.responseText || '',
            configurable: true
          },
          response: {
            get: () => {
              if (xhr.responseType === 'json') {
                try {
                  return JSON.parse(matchedEntry.responseText || '{}');
                } catch(e) {
                  return matchedEntry.responseText || '';
                }
              }
              return matchedEntry.responseText || '';
            },
            configurable: true
          },
          responseXML: {
            get: () => null,
            configurable: true
          },
          getAllResponseHeaders: {
            value: () => {
              if (!matchedEntry.responseHeaders) return '';
              return Object.entries(matchedEntry.responseHeaders)
                .map(([k, v]) => k + ': ' + v)
                .join('\r\n');
            },
            configurable: true
          },
          getResponseHeader: {
            value: (headerName) => {
              if (!matchedEntry.responseHeaders) return null;
              return matchedEntry.responseHeaders[headerName.toLowerCase()] || null;
            },
            configurable: true
          }
        });

        // Trigger readystatechange and load handlers asynchronously to simulate completion
        setTimeout(() => {
          const stateEvent = new Event('readystatechange');
          xhr.dispatchEvent(stateEvent);
          const loadEvent = new Event('load');
          xhr.dispatchEvent(loadEvent);
        }, 0);

        // Record mock execution
        callLog.status = matchedEntry.status || 200;
        callLog.statusText = matchedEntry.statusText || 'OK';
        callLog.responseHeaders = matchedEntry.responseHeaders || {};
        callLog.responseText = matchedEntry.responseText || '';
        callLog.originalStatus = matchedEntry.originalStatus || matchedEntry.status || 200;
        callLog.originalResponseText = matchedEntry.originalResponseText || matchedEntry.responseText || '';
        callLog.isMocked = true;
        recordCall(callLog);
        return;
      }

      xhr.addEventListener('readystatechange', () => {
        if (xhr.readyState === 4) {
          callLog.status = xhr.status;
          callLog.statusText = xhr.statusText;

          const responseHeaders = {};
          const headersStr = xhr.getAllResponseHeaders();
          if (headersStr) {
            headersStr.split('\r\n').forEach(line => {
              const parts = line.split(': ');
              if (parts.length >= 2) {
                responseHeaders[parts[0].toLowerCase()] = parts.slice(1).join(': ');
              }
            });
          }
          callLog.responseHeaders = responseHeaders;

          try {
            callLog.responseText = xhr.responseText;
          } catch (e) {
            callLog.responseText = '';
          }
          callLog.originalStatus = callLog.status;
          callLog.originalResponseText = callLog.responseText;
          recordCall(callLog);
        }
      });

      return originalSend.apply(this, [body]);
    };

    return xhr;
  };
  window.XMLHttpRequest.prototype = originalXHR.prototype;
  Object.keys(originalXHR).forEach(key => {
    window.XMLHttpRequest[key] = originalXHR[key];
  });

  // Listen to API call requests from Content Script
  window.addEventListener('message', (event) => {
    if (event.source === window && event.data) {
      if (event.data.type === 'WEB2MD_REQUEST_API_CALLS') {
        window.postMessage({ type: 'WEB2MD_API_CALLS_RESPONSE', apiCalls: apiCalls }, '*');
      } else if (event.data.type === 'WEB2MD_UPDATE_API_CALL') {
        const { index, updatedCall } = event.data;
        if (apiCalls[index]) {
          apiCalls[index] = { ...apiCalls[index], ...updatedCall };
        }
      } else if (event.data.type === 'WEB2MD_DELETE_API_CALL') {
        const { index } = event.data;
        if (index >= 0 && index < apiCalls.length) {
          apiCalls.splice(index, 1);
        }
      }
    }
  });

})();
