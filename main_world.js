(function() {
  if (window.__web2md_main_world_initialized__) {
    return;
  }
  window.__web2md_main_world_initialized__ = true;

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function findVFS(obj, depth = 0, visited = new Map()) {
    if (depth > 12) return null;
    if (!obj || typeof obj !== 'object') return null;

    const prevDepth = visited.get(obj);
    if (prevDepth !== undefined && prevDepth <= depth) return null;
    visited.set(obj, depth);

    // Support Map objects
    if (obj instanceof Map) {
      try {
        const keys = Array.from(obj.keys());
        if (keys.length >= 2) {
          let fileKeysCount = 0;
          let isValidVFS = true;
          
          for (const k of keys) {
            if (typeof k === 'string' && (k.includes('/') || k.includes('.'))) {
              fileKeysCount++;
              const val = obj.get(k);
              const isString = typeof val === 'string';
              const isFileObj = val && typeof val === 'object' && (typeof val.content === 'string' || typeof val.text === 'string' || typeof val.source === 'string');
              if (!isString && !isFileObj) {
                isValidVFS = false;
                break;
              }
            }
          }

          if (isValidVFS && fileKeysCount >= 2) {
            const norm = {};
            obj.forEach((val, key) => {
              norm[key] = val;
            });
            return norm;
          }
        }
      } catch (e) {}
    }

    const keys = Object.keys(obj);
    if (keys.length >= 2) {
      let fileKeysCount = 0;
      let isValidVFS = true;
      
      for (const k of keys) {
        if (typeof k === 'string' && (k.includes('/') || k.includes('.'))) {
          fileKeysCount++;
          const val = obj[k];
          const isString = typeof val === 'string';
          const isFileObj = val && typeof val === 'object' && (typeof val.content === 'string' || typeof val.text === 'string' || typeof val.source === 'string');
          if (!isString && !isFileObj) {
            isValidVFS = false;
            break;
          }
        }
      }

      if (isValidVFS && fileKeysCount >= 2) {
        return obj;
      }
    }

    if (Array.isArray(obj) && obj.length > 0) {
      const first = obj[0];
      if (first && typeof first === 'object' && ('path' in first || 'name' in first) && ('content' in first || 'text' in first || 'source' in first)) {
        return obj;
      }
    }

    // Traverse keys recursively
    for (const k of keys) {
      try {
        const res = findVFS(obj[k], depth + 1, visited);
        if (res) return res;
      } catch (e) {}
    }
    return null;
  }

  function scoreVFS(vfs) {
    if (!vfs) return -1;
    let score = 0;
    let fileCount = 0;
    let keys = [];
    
    if (vfs instanceof Map) {
      keys = Array.from(vfs.keys());
    } else if (Array.isArray(vfs)) {
      keys = vfs.map(f => f.path || f.name || '');
    } else {
      keys = Object.keys(vfs);
    }
    
    for (const k of keys) {
      if (typeof k === 'string') {
        const lowerK = k.toLowerCase();
        if (lowerK.endsWith('.tsx') || lowerK.endsWith('.ts') || lowerK.endsWith('.jsx') || lowerK.endsWith('.js') || lowerK.endsWith('.html') || lowerK.endsWith('.css') || lowerK.endsWith('.json')) {
          score += 15; // High points for code files
          fileCount++;
        }
        
        let content = '';
        if (vfs instanceof Map) {
          const val = vfs.get(k);
          content = typeof val === 'string' ? val : (val.content || val.text || val.source || '');
        } else if (Array.isArray(vfs)) {
          const item = vfs.find(f => (f.path || f.name) === k);
          content = item ? (item.content || item.text || item.source || '') : '';
        } else {
          const val = vfs[k];
          content = typeof val === 'string' ? val : (val.content || val.text || val.source || '');
        }
        
        if (content.trim().startsWith('http://') || content.trim().startsWith('https://')) {
          score -= 20; // Penalize import map mappings
        } else {
          score += Math.min(content.length / 50, 30); // Add points based on code size
        }
      }
    }
    
    if (fileCount === 0) return -1;
    return score;
  }

  function getAllElements(root = document, list = []) {
    if (!root) return list;
    try {
      const elements = root.querySelectorAll('*');
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        list.push(el);
        if (el.shadowRoot) {
          getAllElements(el.shadowRoot, list);
        }
      }
    } catch (e) {}
    return list;
  }

  function scanDOMForVFS() {
    const candidates = [];
    const globalVisited = new Map();

    // Helper to evaluate and track a VFS candidate
    function trackCandidate(obj) {
      if (!obj) return;
      const score = scoreVFS(obj);
      if (score > 0) {
        candidates.push({ obj, score });
      }
    }

    // 1. Scan global window properties
    const windowKeys = Object.keys(window);
    for (const k of windowKeys) {
      if (k !== 'window' && k !== 'self' && k !== 'top' && k !== 'parent' && k !== 'frames' && k !== 'globalThis') {
        try {
          const vfs = findVFS(window[k], 0, globalVisited);
          if (vfs) trackCandidate(vfs);
        } catch (e) {}
      }
    }

    // 2. Scan DOM elements including Shadow DOM
    const allElements = getAllElements(document);
    for (const el of allElements) {
      const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
      if (fiberKey) {
        const fiber = el[fiberKey];
        let curr = fiber;
        while (curr) {
          if (curr.memoizedProps) {
            const vfs = findVFS(curr.memoizedProps, 0, globalVisited);
            if (vfs) trackCandidate(vfs);
          }
          if (curr.memoizedState) {
            const vfs = findVFS(curr.memoizedState, 0, globalVisited);
            if (vfs) trackCandidate(vfs);
          }
          curr = curr.return;
        }
      }
    }

    if (candidates.length === 0) return null;
    
    // Sort by score descending and return the best candidate
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].obj;
  }

  // Define global scan function for manual user debugging in DevTools
  window.web2mdScan = function() {
    console.log("[Web2MD] Running manual VFS diagnostic scan...");
    const vfs = scanDOMForVFS();
    if (vfs) {
      console.log("[Web2MD] Match found:", vfs);
      return vfs;
    }
    console.warn("[Web2MD] No VFS found in React Fiber trees.");
    return null;
  };

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

  window.addEventListener('message', (event) => {
    if (event.source === window && event.data) {
      if (event.data.type === 'WEB2MD_SET_MOCKS') {
        apiMocks = event.data.mocks || [];
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
    // Enrichment will be applied by Phase 2 patch below (if loaded)
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

  // Listen to scan request and API call request from Content Script
  window.addEventListener('message', (event) => {
    if (event.source === window && event.data) {
      if (event.data.type === 'WEB2MD_REQUEST_VFS_SCAN') {
        const vfs = scanDOMForVFS();
        let files = [];
        if (vfs) {
          if (Array.isArray(vfs)) {
            files = vfs.map(f => ({
              path: f.path || f.name || '',
              content: f.content || f.text || f.source || ''
            }));
          } else {
            Object.keys(vfs).forEach(path => {
              const val = vfs[path];
              const content = typeof val === 'string' ? val : (val.content || val.text || val.source || '');
              files.push({ path, content });
            });
          }
        }
        window.postMessage({ type: 'WEB2MD_VFS_RESPONSE', files: files }, '*');
      } else if (event.data.type === 'WEB2MD_REQUEST_API_CALLS') {
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

  // ======================================================================
  //  PHASE 2: Enhanced Stack Trace + Temporal API Tracking
  // ======================================================================

  // Enhanced: Extract file basenames from stack trace for API-DOM matching
  function extractSourceFiles(callers) {
    const files = new Set();
    for (const c of callers) {
      if (!c.location) continue;
      try {
        const match = c.location.match(/([^\/\s]+\.[a-z]+)(?:[:?#]|$)/i);
        if (match) files.add(match[1]);
      } catch(e) {}
    }
    return Array.from(files);
  }

  // Temporal event tracker: ring buffer of recent DOM events
  const recentDomEvents = [];
  const MAX_DOM_EVENTS = 50;
  const TEMPORAL_WINDOW_MS = 500;

  function buildSelector(el) {
    if (!el || !el.tagName) return '';
    const parts = [];
    let current = el;
    let depth = 0;
    while (current && current.tagName && depth < 3) {
      let sel = current.tagName.toLowerCase();
      if (current.id) {
        sel += '#' + current.id;
      } else if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\s+/).filter(c => c && !c.startsWith('web2md')).slice(0, 2);
        if (classes.length) sel += '.' + classes.join('.');
      }
      parts.unshift(sel);
      current = current.parentElement;
      depth++;
    }
    return parts.join(' > ');
  }

  // Capture DOM events for temporal correlation
  ['click', 'submit', 'input', 'change'].forEach(evtType => {
    document.addEventListener(evtType, (e) => {
      if (e.target && e.target.closest && (e.target.closest('#web2md-highlighter') || e.target.closest('#web2md-tooltip'))) return;
      recentDomEvents.push({
        timestamp: Date.now(),
        eventType: evtType,
        targetSelector: buildSelector(e.target),
        targetRef: typeof WeakRef !== 'undefined' ? new WeakRef(e.target) : null
      });
      if (recentDomEvents.length > MAX_DOM_EVENTS) recentDomEvents.shift();
    }, true);
  });

  // Register enrichment hook for recordCall
  window.__web2md_enrichRecordCall = function(callLog) {
    // Add sourceFiles from stack trace
    callLog.sourceFiles = extractSourceFiles(callLog.callers || []);

    // Find temporally correlated DOM event
    const now = callLog.timestamp || Date.now();
    for (let i = recentDomEvents.length - 1; i >= 0; i--) {
      const evt = recentDomEvents[i];
      if (now - evt.timestamp <= TEMPORAL_WINDOW_MS) {
        callLog.correlatedEvent = {
          eventTimestamp: evt.timestamp,
          eventType: evt.eventType,
          targetSelector: evt.targetSelector
        };
        break;
      }
      if (now - evt.timestamp > TEMPORAL_WINDOW_MS * 2) break;
    }
  };

  // ======================================================================
  //  PHASE 3: Universal Inspector Engine
  // ======================================================================

  let isInspectMode = false;
  let highlighterEl = null;
  let tooltipEl = null;
  let inspectDebounceTimer = null;
  let lastInspectedEl = null;
  let modalHostEl = null;
  let activeApiIndex = -1;

  // --- Layered Framework Detection ---

  function detectReact(el) {
    let current = el;
    let depth = 0;
    while (current && depth < 10) {
      const fiberKey = Object.keys(current).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
      if (fiberKey) {
        const fiber = current[fiberKey];
        const components = [];
        let f = fiber;
        while (f && components.length < 5) {
          if (f.type && typeof f.type === 'function') {
            const name = f.type.displayName || f.type.name || null;
            if (name) {
              const info = { name };
              if (f._debugSource) {
                info.source = f._debugSource.fileName + ':' + f._debugSource.lineNumber;
              }
              components.push(info);
            }
          }
          f = f.return;
        }
        if (components.length > 0) {
          return { componentName: components[0].name, components, source: components[0].source || null };
        }
        return { componentName: 'Unknown React', components: [], source: null };
      }
      current = current.parentElement;
      depth++;
    }
    return null;
  }

  function detectVue(el) {
    let current = el;
    let depth = 0;
    while (current && depth < 10) {
      // Vue 2
      if (current.__vue__) {
        const vm = current.__vue__;
        const name = vm.$options && vm.$options.name ? vm.$options.name : (vm.$options && vm.$options._componentTag ? vm.$options._componentTag : null);
        return { componentName: name || 'Vue Component', components: [{ name: name || 'Vue Component' }], source: null };
      }
      // Vue 3
      if (current.__vueParentComponent) {
        const comp = current.__vueParentComponent;
        const name = comp.type && comp.type.name ? comp.type.name : (comp.type && comp.type.__name ? comp.type.__name : null);
        return { componentName: name || 'Vue3 Component', components: [{ name: name || 'Vue3 Component' }], source: null };
      }
      current = current.parentElement;
      depth++;
    }
    return null;
  }

  function detectAngular(el) {
    let current = el;
    let depth = 0;
    while (current && depth < 10) {
      if (current.__ngContext__ || current.getAttribute && current.getAttribute('ng-version')) {
        let compName = 'Angular Component';
        try {
          if (typeof ng !== 'undefined' && ng.getComponent) {
            const comp = ng.getComponent(current);
            if (comp && comp.constructor) {
              compName = comp.constructor.name || compName;
            }
          }
        } catch(e) {}
        return { componentName: compName, components: [{ name: compName }], source: null };
      }
      current = current.parentElement;
      depth++;
    }
    return null;
  }

  function getDomInfo(el) {
    const parts = [];
    let current = el;
    let depth = 0;
    while (current && current.tagName && depth < 5) {
      let sel = current.tagName.toLowerCase();
      if (current.id) {
        sel += '#' + current.id;
      } else if (current.className && typeof current.className === 'string') {
        const cls = current.className.trim().split(/\s+/).filter(c => c && !c.startsWith('web2md')).slice(0, 2);
        if (cls.length) sel += '.' + cls.join('.');
      }
      parts.unshift(sel);
      current = current.parentElement;
      depth++;
    }
    const role = el.getAttribute && el.getAttribute('role');
    const ariaLabel = el.getAttribute && el.getAttribute('aria-label');
    return {
      componentName: null,
      components: [],
      source: null,
      selectorPath: parts.join(' > '),
      role: role,
      ariaLabel: ariaLabel
    };
  }

  function detectFrameworkInfo(el) {
    const reactResult = detectReact(el);
    if (reactResult) return { framework: 'react', ...reactResult, selectorPath: buildSelector(el) };

    const vueResult = detectVue(el);
    if (vueResult) return { framework: 'vue', ...vueResult, selectorPath: buildSelector(el) };

    const angularResult = detectAngular(el);
    if (angularResult) return { framework: 'angular', ...angularResult, selectorPath: buildSelector(el) };

    const domInfo = getDomInfo(el);
    return { framework: 'dom', ...domInfo };
  }

  // --- API Association Engine ---

  function scoreStackTraceMatch(call, element, fwInfo) {
    if (!call.callers || call.callers.length === 0) return 0;
    let score = 0;
    // If framework detected with component name, check if any caller's functionName contains the component name
    if (fwInfo.componentName) {
      for (const c of call.callers) {
        if (c.functionName && c.functionName.includes(fwInfo.componentName)) {
          score += 30;
          break;
        }
      }
    }
    return score;
  }

  function scoreTemporalMatch(call, element) {
    if (!call.correlatedEvent) return 0;
    // Check if the correlated event's target matches the inspected element or its ancestors
    const elSelector = buildSelector(element);
    if (call.correlatedEvent.targetSelector === elSelector) return 20;
    // Check if the event target is an ancestor
    if (elSelector.includes(call.correlatedEvent.targetSelector) || call.correlatedEvent.targetSelector.includes(elSelector)) {
      return 10;
    }
    return 0;
  }

  function scoreContentMatch(call, element) {
    if (!call.responseText || !element.textContent) return 0;
    const elText = element.textContent.trim().substring(0, 100);
    if (elText.length < 3) return 0;
    try {
      if (call.responseText.includes(elText)) return 5;
    } catch(e) {}
    return 0;
  }

  function findAssociatedApis(element, frameworkInfo) {
    const results = [];
    for (let i = 0; i < apiCalls.length; i++) {
      const call = apiCalls[i];
      let score = 0;
      const matchType = [];

      const stackScore = scoreStackTraceMatch(call, element, frameworkInfo);
      score += stackScore;
      if (stackScore > 0) matchType.push('stack');

      const temporalScore = scoreTemporalMatch(call, element);
      score += temporalScore;
      if (temporalScore > 0) matchType.push('temporal');

      const contentScore = scoreContentMatch(call, element);
      score += contentScore;
      if (contentScore > 0) matchType.push('content');

      if (score > 0) {
        results.push({ ...call, originalIndex: i, matchScore: score, matchType });
      }
    }
    return results.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
  }

  // --- UI Overlay ---

  function createHighlighter() {
    if (highlighterEl) return;
    highlighterEl = document.createElement('div');
    highlighterEl.id = 'web2md-highlighter';
    highlighterEl.style.cssText = 'position:fixed;pointer-events:none;border:2px dashed #8b5cf6;background:rgba(139,92,246,0.08);z-index:2147483646;transition:all 0.1s ease-out;display:none;border-radius:4px;';
    document.documentElement.appendChild(highlighterEl);
  }

  function createTooltip() {
    if (tooltipEl) return;
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'web2md-tooltip';
    tooltipEl.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:11px;line-height:1.4;color:#e5e7eb;background:#1f2937;border:1px solid #374151;border-radius:8px;padding:8px 10px;max-width:380px;box-shadow:0 8px 24px rgba(0,0,0,0.4);display:none;word-break:break-all;';
    document.documentElement.appendChild(tooltipEl);
  }

  function updateHighlighter(el) {
    if (!highlighterEl || !el) return;
    const rect = el.getBoundingClientRect();
    highlighterEl.style.left = rect.left + 'px';
    highlighterEl.style.top = rect.top + 'px';
    highlighterEl.style.width = rect.width + 'px';
    highlighterEl.style.height = rect.height + 'px';
    highlighterEl.style.display = 'block';
  }

  function updateTooltip(el, fwInfo, apis) {
    if (!tooltipEl) return;
    const rect = el.getBoundingClientRect();
    let html = '';

    // DOM selector (always shown)
    const selectorPath = fwInfo.selectorPath || buildSelector(el);
    html += '<div style="color:#9ca3af;font-size:10px;margin-bottom:4px;">🔍 ' + escapeHtml(selectorPath) + '</div>';

    // Framework info (if detected)
    const fwIcons = { react: '⚛️', vue: '💚', angular: '🅰️', dom: '' };
    if (fwInfo.framework !== 'dom' && fwInfo.componentName) {
      html += '<div style="color:#a78bfa;font-weight:600;">' + (fwIcons[fwInfo.framework] || '') + ' ' + escapeHtml(fwInfo.framework.charAt(0).toUpperCase() + fwInfo.framework.slice(1)) + ': ' + escapeHtml(fwInfo.componentName) + '</div>';
      if (fwInfo.source) {
        html += '<div style="color:#6b7280;font-size:10px;">📍 ' + escapeHtml(fwInfo.source) + '</div>';
      }
    }

    // Semantic info for DOM fallback
    if (fwInfo.framework === 'dom') {
      if (fwInfo.role) html += '<div style="color:#60a5fa;font-size:10px;">role: ' + escapeHtml(fwInfo.role) + '</div>';
      if (fwInfo.ariaLabel) html += '<div style="color:#60a5fa;font-size:10px;">aria-label: ' + escapeHtml(fwInfo.ariaLabel) + '</div>';
    }

    // Associated APIs
    if (apis.length > 0) {
      html += '<div style="border-top:1px solid #374151;margin:4px 0;padding-top:4px;color:#9ca3af;font-size:10px;">📡 Associated APIs (' + apis.length + ')</div>';
      apis.forEach(api => {
        const method = api.method || 'GET';
        const statusColor = (api.status >= 200 && api.status < 300) ? '#34d399' : '#f87171';
        const matchTags = api.matchType.map(t => {
          const colors = { stack: '#a78bfa', temporal: '#fbbf24', content: '#60a5fa' };
          return '<span style="color:' + (colors[t] || '#9ca3af') + ';font-size:9px;">' + t + '</span>';
        }).join(' ');
        let shortUrl = api.url;
        try { shortUrl = new URL(api.url, window.location.href).pathname; } catch(e) {}
        if (shortUrl.length > 40) shortUrl = '…' + shortUrl.slice(-38);
        html += '<div style="font-size:10px;display:flex;gap:4px;align-items:center;margin:2px 0;">';
        html += '<span style="color:#60a5fa;font-weight:700;font-size:9px;">' + method + '</span>';
        html += '<span style="color:#e5e7eb;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(shortUrl) + '</span>';
        html += '<span style="color:' + statusColor + ';font-size:9px;">' + api.status + '</span>';
        html += matchTags;
        html += '</div>';
      });
      html += '<div style="color:#6b7280;font-size:9px;margin-top:4px;font-style:italic;">Click to open Mock Editor</div>';
    } else {
      html += '<div style="border-top:1px solid #374151;margin:4px 0;padding-top:4px;color:#6b7280;font-size:10px;font-style:italic;">No associated APIs detected</div>';
    }

    tooltipEl.innerHTML = html;
    tooltipEl.style.display = 'block';

    // Position tooltip: prefer below-right, fallback above/left if near viewport edge
    const tooltipRect = tooltipEl.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 8;

    if (top + tooltipRect.height > window.innerHeight) {
      top = rect.top - tooltipRect.height - 8;
    }
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - 8;
    }
    if (left < 4) left = 4;
    if (top < 4) top = 4;

    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
  }

  // --- Inspect Event Handlers ---

  function isInspectOverlay(el) {
    if (!el) return false;
    if (el.id === 'web2md-highlighter' || el.id === 'web2md-tooltip' || el.id === 'web2md-modal-root') {
      return true;
    }
    let current = el;
    while (current) {
      if (current.id === 'web2md-modal-root') return true;
      if (current.parentNode) {
        current = current.parentNode;
      } else if (current.host) {
        current = current.host;
      } else {
        break;
      }
    }
    return false;
  }

  function showToast(message, type = 'success') {
    if (!modalHostEl) return;
    const shadow = modalHostEl.shadowRoot;
    const container = shadow.querySelector('.toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'error') {
      toast.style.background = '#ef4444';
    } else if (type === 'warning') {
      toast.style.background = '#f59e0b';
    } else {
      toast.style.background = '#10b981';
    }
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 2500);
  }

  function ensureModalHost() {
    if (modalHostEl) return modalHostEl;

    modalHostEl = document.createElement('div');
    modalHostEl.id = 'web2md-modal-root';
    document.documentElement.appendChild(modalHostEl);

    const shadow = modalHostEl.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
      }
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        z-index: 2147483640;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        animation: fadeIn 0.2s ease-out;
      }
      .modal-container {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 12px;
        width: 580px;
        max-width: 90vw;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #f1f5f9;
        animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .modal-header {
        padding: 16px 20px;
        border-bottom: 1px solid #334155;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #0f172a;
      }
      .modal-title {
        font-size: 15px;
        font-weight: 600;
        color: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .modal-title-main {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .modal-subtitle {
        font-size: 11px;
        color: #94a3b8;
        font-weight: normal;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 500px;
      }
      .close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 20px;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
        line-height: 1;
      }
      .close-btn:hover {
        background: #334155;
        color: #f1f5f9;
      }
      .modal-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: 60vh;
        overflow-y: auto;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .form-label {
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .form-select, .form-input, .form-textarea {
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 8px;
        color: #f1f5f9;
        padding: 10px 12px;
        font-size: 13px;
        outline: none;
        font-family: inherit;
        transition: border-color 0.15s;
      }
      .form-select:focus, .form-input:focus, .form-textarea:focus {
        border-color: #8b5cf6;
      }
      .form-textarea {
        resize: vertical;
        min-height: 140px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        line-height: 1.5;
      }
      .form-row {
        display: grid;
        grid-template-columns: 100px 1fr;
        gap: 16px;
      }
      .read-only-field {
        background: #1e293b;
        border-color: #1e293b;
        color: #64748b;
        cursor: not-allowed;
      }
      .btn-row {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 4px;
      }
      .btn-action {
        background: #334155;
        border: none;
        color: #f1f5f9;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 500;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        outline: none;
      }
      .btn-action:hover {
        background: #475569;
      }
      .modal-footer {
        padding: 16px 20px;
        border-top: 1px solid #334155;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #0f172a;
      }
      .btn-group-left {
        display: flex;
        gap: 10px;
      }
      .btn-group-right {
        display: flex;
        gap: 10px;
      }
      .btn-footer {
        border: none;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 600;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        outline: none;
      }
      .btn-cancel {
        background: #334155;
        color: #f1f5f9;
      }
      .btn-cancel:hover {
        background: #475569;
      }
      .btn-save {
        background: #8b5cf6;
        color: #ffffff;
      }
      .btn-save:hover {
        background: #7c3aed;
      }
      .btn-save-reload {
        background: #10b981;
        color: #ffffff;
      }
      .btn-save-reload:hover {
        background: #059669;
      }
      .toast-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      }
      .toast {
        background: #10b981;
        color: #ffffff;
        padding: 12px 18px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 8px;
        animation: toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        opacity: 1;
        transition: opacity 0.2s, transform 0.2s;
        pointer-events: auto;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes toastSlideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    shadow.appendChild(style);

    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    shadow.appendChild(toastContainer);

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.style.display = 'none';
    backdrop.innerHTML = `
      <div class="modal-container">
        <div class="modal-header">
          <div class="modal-title">
            <div class="modal-title-main">
              <span>🛠️ API Mock Editor</span>
            </div>
            <div class="modal-subtitle" id="inspected-el-subtitle"></div>
          </div>
          <button class="close-btn" id="close-modal-x">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Select Captured / Associated API</label>
            <select class="form-select" id="api-select"></select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Method</label>
              <input type="text" class="form-input read-only-field" id="api-method" readonly />
            </div>
            <div class="form-group">
              <label class="form-label">URL</label>
              <input type="text" class="form-input read-only-field" id="api-url" readonly />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Status Code</label>
              <input type="number" class="form-input" id="api-status" min="100" max="599" placeholder="200" />
            </div>
            <div class="form-group">
              <!-- Empty spacer to align layout -->
            </div>
          </div>
          <div class="form-group">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label class="form-label">Response Body (JSON or Text)</label>
              <div class="btn-row" style="margin:0;">
                <button class="btn-action" id="btn-format-json">Format JSON</button>
                <button class="btn-action" id="btn-reset-original">Reset to Original</button>
              </div>
            </div>
            <textarea class="form-textarea" id="api-response-body" placeholder="Response text..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <div class="btn-group-left">
            <button class="btn-footer btn-cancel" id="btn-close-modal">Cancel</button>
          </div>
          <div class="btn-group-right">
            <button class="btn-footer btn-save" id="btn-save-mock">Save (Live)</button>
            <button class="btn-footer btn-save-reload" id="btn-save-reload-mock">Save & Reload</button>
          </div>
        </div>
      </div>
    `;
    shadow.appendChild(backdrop);

    const closeX = shadow.querySelector('#close-modal-x');
    const closeBtn = shadow.querySelector('#btn-close-modal');
    closeX.addEventListener('click', hideMockEditorModal);
    closeBtn.addEventListener('click', hideMockEditorModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) hideMockEditorModal();
    });

    return modalHostEl;
  }

  function hideMockEditorModal() {
    if (!modalHostEl) return;
    const shadow = modalHostEl.shadowRoot;
    const backdrop = shadow.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.style.display = 'none';
    }
    if (modalHostEl._handleKeyDown) {
      document.removeEventListener('keydown', modalHostEl._handleKeyDown);
      delete modalHostEl._handleKeyDown;
    }
  }

  function loadApiFields(originalIndex) {
    if (!modalHostEl) return;
    const shadow = modalHostEl.shadowRoot;
    const methodInput = shadow.querySelector('#api-method');
    const urlInput = shadow.querySelector('#api-url');
    const statusInput = shadow.querySelector('#api-status');
    const bodyTextarea = shadow.querySelector('#api-response-body');

    activeApiIndex = parseInt(originalIndex);
    const call = apiCalls[activeApiIndex];

    if (!call) {
      methodInput.value = '';
      urlInput.value = '';
      statusInput.value = '';
      bodyTextarea.value = '';
      return;
    }

    methodInput.value = call.method || 'GET';
    urlInput.value = call.url || '';
    
    const currentMock = apiMocks.find(m => m.url === call.url && m.method === call.method);
    if (currentMock) {
      statusInput.value = currentMock.status || 200;
      bodyTextarea.value = currentMock.responseText || '';
    } else {
      statusInput.value = call.status || 200;
      bodyTextarea.value = call.responseText || '';
    }
  }

  function saveMock(reload = false) {
    if (activeApiIndex === -1 || !modalHostEl) return;
    const call = apiCalls[activeApiIndex];
    if (!call) return;

    const shadow = modalHostEl.shadowRoot;
    const statusInput = shadow.querySelector('#api-status');
    const bodyTextarea = shadow.querySelector('#api-response-body');

    const statusVal = parseInt(statusInput.value) || 200;
    const responseTextVal = bodyTextarea.value;

    const mock = {
      url: call.url,
      method: call.method,
      status: statusVal,
      responseText: responseTextVal,
      isMocked: true
    };

    const existingIndex = apiMocks.findIndex(m => m.url === call.url && m.method === call.method);
    if (existingIndex > -1) {
      apiMocks[existingIndex] = { ...apiMocks[existingIndex], ...mock };
    } else {
      apiMocks.push(mock);
    }

    window.postMessage({
      type: 'WEB2MD_UPDATE_MOCK_SAVE',
      mock: mock
    }, '*');

    if (reload) {
      showToast('Mock saved! Tải lại trang...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      showToast('Mock saved successfully (Live)', 'success');
      setTimeout(() => {
        hideMockEditorModal();
      }, 800);
    }
  }

  function resetToOriginal() {
    if (activeApiIndex === -1 || !modalHostEl) return;
    const call = apiCalls[activeApiIndex];
    if (!call) return;

    const shadow = modalHostEl.shadowRoot;
    const statusInput = shadow.querySelector('#api-status');
    const bodyTextarea = shadow.querySelector('#api-response-body');

    statusInput.value = call.originalStatus || call.status || 200;
    bodyTextarea.value = call.originalResponseText !== undefined ? call.originalResponseText : (call.responseText || '');
    showToast('Reset to original response values', 'success');
  }

  function populateDropdown(selectEl, associated, allCalls) {
    selectEl.innerHTML = '';
    
    if (associated.length === 0 && allCalls.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No captured API calls found';
      selectEl.appendChild(opt);
      return;
    }
    
    if (associated.length > 0) {
      const group = document.createElement('optgroup');
      group.label = '🎯 Associated APIs (Framework/Temporal Match)';
      associated.forEach(api => {
        const opt = document.createElement('option');
        opt.value = api.originalIndex;
        let cleanUrl = api.url;
        try { cleanUrl = new URL(api.url, window.location.href).pathname + new URL(api.url, window.location.href).search; } catch (e) {}
        if (cleanUrl.length > 60) cleanUrl = cleanUrl.substring(0, 57) + '...';
        opt.textContent = `${api.method} ${cleanUrl} (${api.status}) [Score: ${api.matchScore}]`;
        group.appendChild(opt);
      });
      selectEl.appendChild(group);
    }
    
    const associatedIndices = new Set(associated.map(api => api.originalIndex));
    const otherCalls = allCalls
      .map((call, idx) => ({ ...call, originalIndex: idx }))
      .filter(call => !associatedIndices.has(call.originalIndex));
      
    if (otherCalls.length > 0) {
      const group = document.createElement('optgroup');
      group.label = '📡 Other Captured APIs';
      otherCalls.reverse().forEach(api => {
        const opt = document.createElement('option');
        opt.value = api.originalIndex;
        let cleanUrl = api.url;
        try { cleanUrl = new URL(api.url, window.location.href).pathname + new URL(api.url, window.location.href).search; } catch (e) {}
        if (cleanUrl.length > 60) cleanUrl = cleanUrl.substring(0, 57) + '...';
        opt.textContent = `${api.method} ${cleanUrl} (${api.status})`;
        group.appendChild(opt);
      });
      selectEl.appendChild(group);
    }
  }

  function showMockEditorModal(el, fwInfo, apis) {
    ensureModalHost();
    const shadow = modalHostEl.shadowRoot;
    const backdrop = shadow.querySelector('.modal-backdrop');
    backdrop.style.display = 'flex';

    // Subtitle details
    const subtitle = shadow.querySelector('#inspected-el-subtitle');
    const selector = buildSelector(el);
    let fwDesc = fwInfo ? `${fwInfo.framework} Component` : 'Vanilla DOM Element';
    if (fwInfo && fwInfo.componentName) {
      fwDesc += `: <${fwInfo.componentName}>`;
    }
    subtitle.textContent = `${fwDesc} | ${selector}`;

    const selectEl = shadow.querySelector('#api-select');
    populateDropdown(selectEl, apis, apiCalls);

    // Default select & load
    if (apis.length > 0) {
      selectEl.value = apis[0].originalIndex;
      loadApiFields(apis[0].originalIndex);
    } else if (apiCalls.length > 0) {
      selectEl.value = apiCalls.length - 1;
      loadApiFields(apiCalls.length - 1);
    } else {
      loadApiFields(-1);
    }

    // Bind event listeners (clone/replace elements to prevent duplicate listeners)
    const selectChangeHandler = (e) => {
      loadApiFields(e.target.value);
    };
    selectEl.removeEventListener('change', selectEl._handler);
    selectEl.addEventListener('change', selectChangeHandler);
    selectEl._handler = selectChangeHandler;

    const btnFormat = shadow.querySelector('#btn-format-json');
    const formatHandler = () => {
      const textarea = shadow.querySelector('#api-response-body');
      try {
        const parsed = JSON.parse(textarea.value);
        textarea.value = JSON.stringify(parsed, null, 2);
        showToast('JSON Formatted', 'success');
      } catch (err) {
        showToast('Invalid JSON: Cannot Format', 'error');
      }
    };
    const newBtnFormat = btnFormat.cloneNode(true);
    btnFormat.parentNode.replaceChild(newBtnFormat, btnFormat);
    newBtnFormat.addEventListener('click', formatHandler);

    const btnReset = shadow.querySelector('#btn-reset-original');
    const resetHandler = () => {
      resetToOriginal();
    };
    const newBtnReset = btnReset.cloneNode(true);
    btnReset.parentNode.replaceChild(newBtnReset, btnReset);
    newBtnReset.addEventListener('click', resetHandler);

    const btnSave = shadow.querySelector('#btn-save-mock');
    const saveHandler = () => {
      saveMock(false);
    };
    const newBtnSave = btnSave.cloneNode(true);
    btnSave.parentNode.replaceChild(newBtnSave, btnSave);
    newBtnSave.addEventListener('click', saveHandler);

    const btnSaveReload = shadow.querySelector('#btn-save-reload-mock');
    const saveReloadHandler = () => {
      saveMock(true);
    };
    const newBtnSaveReload = btnSaveReload.cloneNode(true);
    btnSaveReload.parentNode.replaceChild(newBtnSaveReload, btnSaveReload);
    newBtnSaveReload.addEventListener('click', saveReloadHandler);

    // Attach shortcuts
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        hideMockEditorModal();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveMock(false);
      }
    };
    if (modalHostEl._handleKeyDown) {
      document.removeEventListener('keydown', modalHostEl._handleKeyDown);
    }
    modalHostEl._handleKeyDown = handleKeyDown;
    document.addEventListener('keydown', handleKeyDown);
  }

  function handleInspectMouseOver(e) {
    if (!isInspectMode) return;
    if (isInspectOverlay(e.target)) return;

    clearTimeout(inspectDebounceTimer);
    inspectDebounceTimer = setTimeout(() => {
      if (!isInspectMode) return;
      lastInspectedEl = e.target;
      const fwInfo = detectFrameworkInfo(e.target);
      const apis = findAssociatedApis(e.target, fwInfo);

      updateHighlighter(e.target);
      updateTooltip(e.target, fwInfo, apis);
    }, 50);
  }

  function handleInspectMouseOut(e) {
    if (!isInspectMode) return;
    if (e.relatedTarget && !isInspectOverlay(e.relatedTarget)) {
    }
  }

  function handleInspectClick(e) {
    if (!isInspectMode) return;
    if (isInspectOverlay(e.target)) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const el = lastInspectedEl || e.target;
    const fwInfo = detectFrameworkInfo(el);
    const apis = findAssociatedApis(el, fwInfo);

    showMockEditorModal(el, fwInfo, apis);
  }

  function enableInspectMode() {
    if (isInspectMode) return;
    isInspectMode = true;
    createHighlighter();
    createTooltip();
    document.addEventListener('mouseover', handleInspectMouseOver, true);
    document.addEventListener('mouseout', handleInspectMouseOut, true);
    document.addEventListener('click', handleInspectClick, true);
    document.body.style.cursor = 'crosshair';
  }

  function disableInspectMode() {
    isInspectMode = false;
    clearTimeout(inspectDebounceTimer);
    document.removeEventListener('mouseover', handleInspectMouseOver, true);
    document.removeEventListener('mouseout', handleInspectMouseOut, true);
    document.removeEventListener('click', handleInspectClick, true);
    if (highlighterEl) { highlighterEl.style.display = 'none'; highlighterEl.remove(); highlighterEl = null; }
    if (tooltipEl) { tooltipEl.style.display = 'none'; tooltipEl.remove(); tooltipEl = null; }
    document.body.style.cursor = '';
    lastInspectedEl = null;
  }

  // Listen for toggle from content script
  window.addEventListener('message', (event) => {
    if (event.source === window && event.data && event.data.type === 'WEB2MD_TOGGLE_INSPECT') {
      if (event.data.enabled) {
        enableInspectMode();
      } else {
        disableInspectMode();
      }
    }
  });

})();
