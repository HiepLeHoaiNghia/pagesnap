/**
 * Web2MD HTML Clone: generates the offline API mock interceptor script that gets
 * injected into cloned/exported HTML pages (fetch/XHR/WebSocket/EventSource stubs).
 */
Web2MD.generateMockInterceptorCode = function (apiCache) {
  return `
(function() {
  const apiCache = ${JSON.stringify(apiCache)};

  function matchUrl(reqUrl) {
    try {
      const parsedReq = new URL(reqUrl, window.location.href);
      const reqPath = parsedReq.origin + parsedReq.pathname;

      for (const entry of apiCache) {
        try {
          const parsedCache = new URL(entry.url, window.location.href);
          const cachePath = parsedCache.origin + parsedCache.pathname;
          if (reqPath === cachePath) {
            return entry;
          }
        } catch(e) {}
      }
    } catch(e) {}

    for (const entry of apiCache) {
      if (reqUrl.includes(entry.url) || entry.url.includes(reqUrl)) {
        return entry;
      }
    }
    return null;
  }

  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    let url = '';
    let method = 'GET';
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else if (input && typeof input === 'object' && 'url' in input) {
      url = input.url;
      method = input.method || 'GET';
    }
    if (init && init.method) {
      method = init.method;
    }

    const matched = matchUrl(url);
    if (matched) {
      console.log('[Web2MD Mock Fetch] Intercepted:', url);
      const responseText = matched.responseText || '';
      return new Response(responseText, {
        status: matched.status || 200,
        statusText: matched.statusText || 'OK',
        headers: new Headers(matched.responseHeaders || {})
      });
    }

    console.log('[Web2MD Mock Fetch] Request not in cache, falling back to network:', url);
    return originalFetch.apply(this, arguments);
  };

  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    let matchedEntry = null;
    let requestMethod = 'GET';
    let requestUrl = '';

    const originalOpen = xhr.open;
    xhr.open = function(method, url, ...rest) {
      requestMethod = method.toUpperCase();
      requestUrl = url;
      matchedEntry = matchUrl(url);
      if (matchedEntry) {
        Object.defineProperties(xhr, {
          status: {
            get: () => matchedEntry.status || 200,
            configurable: true
          },
          statusText: {
            get: () => matchedEntry.statusText || 'OK',
            configurable: true
          },
          responseText: {
            get: () => matchedEntry.responseText || '',
            configurable: true
          },
          response: {
            get: () => {
              const text = matchedEntry.responseText || '';
              if (xhr.responseType === 'json') {
                try { return JSON.parse(text); } catch (e) { return null; }
              }
              return text;
            },
            configurable: true
          },
          readyState: {
            get: () => 4,
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
            value: (header) => {
              if (!matchedEntry.responseHeaders) return null;
              return matchedEntry.responseHeaders[header.toLowerCase()] || null;
            },
            configurable: true
          }
        });
      }
      return originalOpen.apply(this, [method, url, ...rest]);
    };

    const originalSend = xhr.send;
    xhr.send = function(body) {
      if (matchedEntry) {
        console.log('[Web2MD Mock XHR] Intercepted:', requestUrl);
        setTimeout(() => {
          if (xhr.onreadystatechange) xhr.onreadystatechange();
          if (xhr.onload) xhr.onload();
          xhr.dispatchEvent(new Event('load'));
          xhr.dispatchEvent(new Event('readystatechange'));
        }, 1);
      } else {
        return originalSend.apply(this, arguments);
      }
    };

    return xhr;
  };
  window.XMLHttpRequest.prototype = originalXHR.prototype;
  Object.keys(originalXHR).forEach(key => {
    window.XMLHttpRequest[key] = originalXHR[key];
  });

  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    console.log('[Web2MD Mock WebSocket] Blocked connection to:', url);
    const self = this;
    this.url = url;
    this.readyState = 1;
    this.send = function(data) {
      console.log('[Web2MD Mock WebSocket] Sent data:', data);
    };
    this.close = function() {
      self.readyState = 3;
      if (self.onclose) self.onclose({ wasClean: true, code: 1000, reason: 'Offline Mode' });
    };
    setTimeout(() => {
      if (self.onopen) self.onopen();
    }, 1);
  };
  window.WebSocket.prototype = originalWebSocket.prototype;
  window.WebSocket.CONNECTING = 0;
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSING = 2;
  window.WebSocket.CLOSED = 3;

  const originalEventSource = window.EventSource;
  window.EventSource = function(url, configuration) {
    console.log('[Web2MD Mock EventSource] Blocked connection to:', url);
    this.url = url;
    this.readyState = 1;
    this.close = function() {
      this.readyState = 2;
    };
  };
  window.EventSource.prototype = originalEventSource.prototype;
  window.EventSource.CONNECTING = 0;
  window.EventSource.OPEN = 1;
  window.EventSource.CLOSED = 2;
})();
`;
};
