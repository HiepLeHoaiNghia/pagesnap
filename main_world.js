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

  // React Component Inspect Engine
  function getReactFiberNode(el) {
    if (!el) return null;
    const key = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    return key ? el[key] : null;
  }

  function getClosestReactFiber(el) {
    let curr = el;
    while (curr) {
      const fiber = getReactFiberNode(curr);
      if (fiber) return fiber;
      curr = curr.parentElement;
    }
    return null;
  }

  function getReactHierarchy(fiber) {
    const path = [];
    let curr = fiber;
    while (curr) {
      let name = '';
      if (typeof curr.type === 'string') {
        name = curr.type;
      } else if (curr.type) {
        name = curr.type.displayName || curr.type.name || 'Anonymous';
      } else if (curr.elementType && typeof curr.elementType === 'function') {
        name = curr.elementType.displayName || curr.elementType.name || 'Anonymous';
      } else if (curr.tag === 3) {
        name = 'FiberRoot';
      }
      
      if (name) {
        let source = null;
        if (curr._debugSource) {
          source = {
            fileName: curr._debugSource.fileName,
            lineNumber: curr._debugSource.lineNumber
          };
        }
        path.push({ name, source });
      }
      curr = curr.return;
    }
    return path;
  }

  function findMatchingApis(componentHierarchy) {
    const componentNames = componentHierarchy.map(c => c.name.toLowerCase());
    const matches = [];
    const seen = new Set();
    
    const addIfMatch = (call) => {
      if (!call || !call.url || !call.method) return;
      const key = `${call.method.toUpperCase()}:${call.url}`;
      if (seen.has(key)) return;
      
      let isMatch = false;
      
      // Match 1: Stack trace callers
      if (call.callers) {
        isMatch = call.callers.some(caller => {
          if (!caller || !caller.functionName) return false;
          const callerFunc = caller.functionName.toLowerCase();
          return componentNames.some(compName => {
            if (compName.length < 3) {
              return callerFunc === compName;
            }
            return callerFunc.includes(compName) || compName.includes(callerFunc);
          });
        });
      }
      
      // Match 2: Semantic URL match (if no callers stack matched)
      if (!isMatch) {
        const urlLower = call.url.toLowerCase();
        isMatch = componentNames.some(compName => {
          if (compName === 'anonymous' || compName === 'fiberroot') return false;
          if (compName.length < 3) return false;
          return urlLower.includes(compName) || compName.includes(urlLower);
        });
      }
      
      if (isMatch) {
        seen.add(key);
        // Supplement active mock data from apiMocks if available
        const activeMock = apiMocks.find(m => m.url === call.url && m.method.toUpperCase() === call.method.toUpperCase());
        if (activeMock) {
          matches.push({
            ...call,
            isMocked: true,
            status: activeMock.status,
            responseText: activeMock.responseText,
            originalStatus: call.originalStatus || call.status,
            originalResponseText: call.originalResponseText !== undefined ? call.originalResponseText : (call.responseText || '')
          });
        } else {
          matches.push(call);
        }
      }
    };
    
    for (const call of apiCalls) {
      addIfMatch(call);
    }
    for (const mock of apiMocks) {
      addIfMatch(mock);
    }
    return matches;
  }

  let highlighterEl = null;
  let tooltipEl = null;
  let isInspectModeActive = false;
  let hoveredElement = null;
  let modalRoot = null;

  function createHighlighterAndTooltip() {
    if (!highlighterEl) {
      highlighterEl = document.createElement('div');
      highlighterEl.id = 'web2md-highlighter';
      highlighterEl.style.cssText = `
        position: fixed;
        pointer-events: none;
        border: 2px dashed #6366f1;
        background-color: rgba(99, 102, 241, 0.08);
        z-index: 2147483646;
        border-radius: 6px;
        transition: all 0.1s ease-out;
        display: none;
      `;
      document.body.appendChild(highlighterEl);
    }
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.id = 'web2md-tooltip';
      tooltipEl.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 2147483647;
        background: rgba(15, 23, 42, 0.9);
        backdrop-filter: blur(12px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        padding: 12px 16px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 13px;
        max-width: 380px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
        display: none;
        line-height: 1.4;
      `;
      document.body.appendChild(tooltipEl);
    }
  }

  function removeHighlighterAndTooltip() {
    if (highlighterEl) {
      highlighterEl.remove();
      highlighterEl = null;
    }
    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = null;
    }
  }

  function handleWindowMouseOver(e) {
    if (!isInspectModeActive) return;
    if (e.target.id === 'web2md-highlighter' || e.target.id === 'web2md-tooltip' || e.target.closest('#web2md-modal-root')) {
      return;
    }
    
    const fiber = getClosestReactFiber(e.target);
    if (!fiber) {
      highlighterEl.style.display = 'none';
      tooltipEl.style.display = 'none';
      hoveredElement = null;
      return;
    }
    
    hoveredElement = e.target;
    const rect = e.target.getBoundingClientRect();
    
    highlighterEl.style.top = rect.top + 'px';
    highlighterEl.style.left = rect.left + 'px';
    highlighterEl.style.width = rect.width + 'px';
    highlighterEl.style.height = rect.height + 'px';
    highlighterEl.style.display = 'block';
    
    const hierarchy = getReactHierarchy(fiber);
    if (hierarchy.length === 0) return;
    
    const componentsOnly = hierarchy.filter(item => {
      const firstChar = item.name[0];
      return firstChar === firstChar.toUpperCase() && item.name !== 'FiberRoot' && item.name !== 'Anonymous';
    });
    
    const componentPathStr = componentsOnly.length > 0
      ? componentsOnly.map(c => c.name).reverse().join(' › ')
      : hierarchy[0].name;

    const sourceInfo = componentsOnly.find(c => c.source)?.source;
    const sourceStr = sourceInfo 
      ? `<div style="color: #94a3b8; font-size: 11px; margin-top: 4px; font-family: monospace;">📍 ${sourceInfo.fileName.split('/').pop()}:${sourceInfo.lineNumber}</div>`
      : '';
      
    const matchedApis = findMatchingApis(hierarchy);
    let apiListHtml = '';
    if (matchedApis.length > 0) {
      apiListHtml = `
        <div style="margin-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 8px;">
          <div style="font-weight: 600; color: #818cf8; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Associated APIs (${matchedApis.length})</div>
          <div style="max-height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">
            ${matchedApis.map(api => {
              let path = api.url;
              try {
                const parsed = new URL(api.url, window.location.href);
                path = parsed.pathname + parsed.search;
              } catch(e) {}
              const statusText = api.status !== undefined ? api.status : 'pending';
              const isSuccess = api.status ? (api.status >= 200 && api.status < 300) : false;
              const statusColor = api.status ? (isSuccess ? '#10b981' : '#ef4444') : '#6366f1';
              return `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-family: monospace; font-size: 11px; background: rgba(255, 255, 255, 0.05); padding: 4px 6px; border-radius: 4px;">
                  <span style="color: ${api.method === 'GET' ? '#34d399' : '#f59e0b'}; font-weight: bold;">${api.method}</span>
                  <span style="flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;" title="${api.url}">${path}</span>
                  <span style="color: ${statusColor}; font-weight: 500;">${statusText}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else {
      apiListHtml = `
        <div style="margin-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 6px; color: #64748b; font-size: 11px; font-style: italic;">
          No direct APIs sniffed for this component.
        </div>
      `;
    }
    
    tooltipEl.innerHTML = `
      <div style="font-weight: bold; color: #fff; font-size: 14px;">⚛️ ${componentsOnly[0]?.name || hierarchy[0].name}</div>
      <div style="color: #cbd5e1; font-size: 12px; word-break: break-all; margin-top: 2px;">${componentPathStr}</div>
      ${sourceStr}
      ${apiListHtml}
      <div style="margin-top: 8px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px;">
        Click component to Mock APIs
      </div>
    `;
    
    const tooltipWidth = 320;
    let tooltipLeft = rect.right + 10;
    if (tooltipLeft + tooltipWidth > window.innerWidth) {
      tooltipLeft = rect.left - tooltipWidth - 10;
    }
    if (tooltipLeft < 10) tooltipLeft = 10;
    
    let tooltipTop = rect.top;
    if (tooltipTop + 200 > window.innerHeight) {
      tooltipTop = window.innerHeight - 220;
    }
    if (tooltipTop < 10) tooltipTop = 10;
    
    tooltipEl.style.left = tooltipLeft + 'px';
    tooltipEl.style.top = tooltipTop + 'px';
    tooltipEl.style.display = 'block';
  }

  function handleWindowMouseOut(e) {
    if (!isInspectModeActive) return;
    if (e.toElement === null || e.relatedTarget === null) {
      if (highlighterEl) highlighterEl.style.display = 'none';
      if (tooltipEl) tooltipEl.style.display = 'none';
      hoveredElement = null;
    }
  }

  function handleWindowClick(e) {
    if (!isInspectModeActive) return;
    if (e.target.closest('#web2md-modal-root')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    const fiber = getClosestReactFiber(e.target);
    if (fiber) {
      const hierarchy = getReactHierarchy(fiber);
      const matchedApis = findMatchingApis(hierarchy);
      const componentsOnly = hierarchy.filter(item => {
        const firstChar = item.name[0];
        return firstChar === firstChar.toUpperCase() && item.name !== 'FiberRoot' && item.name !== 'Anonymous';
      });
      const componentName = componentsOnly[0]?.name || hierarchy[0].name;
      
      // Extract code snippet if it's a custom React component
      let codeSnippet = '';
      if (fiber.type && typeof fiber.type === 'function') {
        codeSnippet = fiber.type.toString();
      } else if (fiber.elementType && typeof fiber.elementType === 'function') {
        codeSnippet = fiber.elementType.toString();
      } else if (fiber.return) {
        // Fallback to parent fiber if current is a simple DOM fiber node
        let parent = fiber.return;
        while (parent && !codeSnippet) {
          if (parent.type && typeof parent.type === 'function') {
            codeSnippet = parent.type.toString();
          } else if (parent.elementType && typeof parent.elementType === 'function') {
            codeSnippet = parent.elementType.toString();
          }
          parent = parent.return;
        }
      }
      
      if (!codeSnippet) {
        codeSnippet = '// Compiled/native component or no local source found.';
      } else {
        // Limit size and escape for safe display
        if (codeSnippet.length > 500) {
          codeSnippet = codeSnippet.substring(0, 500) + '\n\n// ... [truncated for preview]';
        }
      }
      
      // Get a friendly selector for the clicked element
      let elementSelector = e.target.tagName.toLowerCase();
      if (e.target.id) {
        elementSelector += `#${e.target.id}`;
      } else if (e.target.className && typeof e.target.className === 'string') {
        const classes = e.target.className.split(/\s+/).filter(c => c && !c.includes('web2md')).slice(0, 2).join('.');
        if (classes) {
          elementSelector += `.${classes}`;
        }
      }
      
      // Helper to extract search terms from clicked element and its parent
      const searchTerms = [];
      const extractTerms = (el) => {
        if (!el) return;
        const text = el.textContent ? el.textContent.trim() : '';
        if (text && text.length > 2 && text.length < 100) {
          searchTerms.push(text);
          const cleaned = text.replace(/[$,%\s]/g, '');
          if (cleaned && cleaned !== text && cleaned.length > 2) {
            searchTerms.push(cleaned);
          }
          if (cleaned.includes('.')) {
            const integerPart = cleaned.split('.')[0];
            if (integerPart.length > 2) {
              searchTerms.push(integerPart);
            }
          }
        }
      };
      
      extractTerms(e.target);
      if (e.target.parentElement) {
        extractTerms(e.target.parentElement);
      }
      
      const uniqueTerms = Array.from(new Set(searchTerms));
      
      openInlineMockEditor(componentName, matchedApis, codeSnippet, elementSelector, uniqueTerms);
    }
  }

  function openInlineMockEditor(componentName, matchedApis, codeSnippet, elementSelector, uniqueTerms) {
    isInspectModeActive = false;
    if (highlighterEl) highlighterEl.style.display = 'none';
    if (tooltipEl) tooltipEl.style.display = 'none';
    
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.id = 'web2md-modal-root';
      document.body.appendChild(modalRoot);
    }
    
    const shadow = modalRoot.shadowRoot || modalRoot.attachShadow({ mode: 'open' });
    shadow.innerHTML = '';
    
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #e2e8f0;
      }
      .backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(8, 10, 18, 0.6);
        backdrop-filter: blur(8px);
      }
      .modal-box {
        position: relative;
        width: 90%;
        max-width: 600px;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(99, 102, 241, 0.2);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.1);
        border-radius: 20px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        box-sizing: border-box;
      }
      @keyframes modalFadeIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 12px;
      }
      .title {
        font-size: 18px;
        font-weight: 700;
        background: linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .subtitle {
        color: #94a3b8;
        font-size: 12px;
        margin-top: 4px;
      }
      .close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 20px;
        cursor: pointer;
        transition: color 0.2s;
      }
      .close-btn:hover { color: #f43f5e; }
      
      .field-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      label {
        font-size: 12px;
        font-weight: 600;
        color: #a5b4fc;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      select, input, textarea {
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: #fff;
        padding: 10px 12px;
        font-size: 13px;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }
      select:focus, input:focus, textarea:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
      }
      
      .row {
        display: flex;
        gap: 12px;
      }
      .col-6 { width: 50%; }
      .col-3 { width: 25%; }
      .col-9 { width: 75%; }
      
      textarea {
        font-family: monospace;
        font-size: 12px;
        resize: vertical;
        min-height: 150px;
      }
      
      .api-selector-bar {
        display: flex;
        flex-direction: column;
        gap: 6px;
        background: rgba(255, 255, 255, 0.03);
        padding: 12px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      
      .actions {
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
      }
      .btn {
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid transparent;
      }
      .btn-secondary {
        background: rgba(255, 255, 255, 0.05);
        color: #cbd5e1;
        border-color: rgba(255, 255, 255, 0.1);
      }
      .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      .btn-primary {
        background: #6366f1;
        color: #fff;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
      }
      .btn-primary:hover {
        background: #4f46e5;
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.5);
      }
      .btn-danger {
        background: rgba(244, 63, 94, 0.1);
        color: #f43f5e;
        border-color: rgba(244, 63, 94, 0.2);
      }
      .btn-danger:hover {
        background: #f43f5e;
        color: #fff;
      }
    `;
    shadow.appendChild(style);
    
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    shadow.appendChild(backdrop);
    
    const modalBox = document.createElement('div');
    modalBox.className = 'modal-box';
    shadow.appendChild(modalBox);
    
    // Combine matched APIs and other captured APIs
    const allSelectableApis = [];
    
    const checkContentMatch = (api) => {
      if (!api.responseText || !uniqueTerms || uniqueTerms.length === 0) return false;
      return uniqueTerms.some(term => {
        return api.responseText.toLowerCase().includes(term.toLowerCase());
      });
    };
    
    matchedApis.forEach(api => {
      const matchesContent = checkContentMatch(api);
      allSelectableApis.push({
        ...api,
        isMatched: true,
        matchesContent: matchesContent
      });
    });
    
    apiCalls.forEach(api => {
      const alreadyAdded = allSelectableApis.some(item => item.url === api.url && item.method === api.method);
      if (!alreadyAdded) {
        const matchesContent = checkContentMatch(api);
        allSelectableApis.push({
          ...api,
          isMatched: false,
          matchesContent: matchesContent
        });
      }
    });
    
    // Sort all selectable APIs: content matches first, then matched/suggested, then the rest
    allSelectableApis.sort((a, b) => {
      if (a.matchesContent && !b.matchesContent) return -1;
      if (!a.matchesContent && b.matchesContent) return 1;
      if (a.isMatched && !b.isMatched) return -1;
      if (!a.isMatched && b.isMatched) return 1;
      return 0;
    });
    
    let selectedApi = allSelectableApis[0] || null;
    let apiSelectorHtml = '';
    
    if (allSelectableApis.length > 0) {
      apiSelectorHtml = `
        <div class="api-selector-bar">
          <label>Select API Endpoint to Mock</label>
          <select id="api-selector" style="width: 100%;">
            ${allSelectableApis.map((api, idx) => {
              let urlPath = api.url;
              try {
                urlPath = new URL(api.url, window.location.href).pathname + new URL(api.url, window.location.href).search;
              } catch(e) {}
              
              let prefix = '';
              if (api.matchesContent) {
                prefix = '🔥 [Content Match] ';
              } else if (api.isMatched) {
                prefix = '✨ [Suggested] ';
              }
              
              return `<option value="${idx}">${prefix}${api.method} ${urlPath}</option>`;
            }).join('')}
          </select>
        </div>
      `;
    }
    
    modalBox.innerHTML = `
      <div class="header">
        <div>
          <div class="title">Mock API for: ${elementSelector || 'Selected Element'}</div>
          <div class="subtitle">React Component Name: <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: #a5b4fc;">${componentName}</code></div>
        </div>
        <button class="close-btn" id="close-modal">&times;</button>
      </div>
      
      <div class="field-group">
        <label>React Component Code Preview</label>
        <pre style="background: #0f172a; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); font-family: monospace; font-size: 11px; overflow-y: auto; max-height: 80px; color: #38bdf8; margin: 0; white-space: pre-wrap; word-break: break-all;">${escapeHtml(codeSnippet)}</pre>
      </div>
      
      ${apiSelectorHtml}
      
      <div class="field-group">
        <label>Request Endpoint URL</label>
        <input type="text" id="api-url" readonly value="${selectedApi ? selectedApi.url : ''}">
      </div>
      
      <div class="row">
        <div class="field-group col-6">
          <label>Method</label>
          <input type="text" id="api-method" readonly value="${selectedApi ? selectedApi.method : 'GET'}">
        </div>
        <div class="field-group col-6">
          <label>HTTP Response Status</label>
          <input type="number" id="api-status" value="${selectedApi ? (selectedApi.status || 200) : 200}">
        </div>
      </div>
      
      <div class="field-group" style="flex-grow: 1;">
        <label>Mock Response Body (JSON / Text)</label>
        <textarea id="api-body" placeholder="Enter JSON response or raw text here...">${selectedApi ? (selectedApi.responseText || '') : ''}</textarea>
      </div>
      
      <div class="actions">
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" id="btn-format">✨ Format JSON</button>
          <button class="btn btn-secondary" id="btn-reset">🔄 Reset</button>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" id="btn-cancel">Cancel</button>
          <button class="btn btn-primary" id="btn-save">💾 Save Mock</button>
        </div>
      </div>
    `;
    
    const shadowQuery = (selector) => shadow.getElementById(selector) || shadow.querySelector(selector);
    
    const closeModal = () => {
      modalRoot.remove();
      modalRoot = null;
      isInspectModeActive = true;
    };
    
    shadowQuery('close-modal').onclick = closeModal;
    shadowQuery('btn-cancel').onclick = closeModal;
    backdrop.onclick = closeModal;
    
    const apiSelector = shadowQuery('api-selector');
    const apiUrlInput = shadowQuery('api-url');
    const apiMethodInput = shadowQuery('api-method');
    const apiStatusInput = shadowQuery('api-status');
    const apiBodyInput = shadowQuery('api-body');
    
    if (apiSelector) {
      apiSelector.onchange = (e) => {
        selectedApi = allSelectableApis[parseInt(e.target.value, 10)];
        if (selectedApi) {
          apiUrlInput.value = selectedApi.url;
          apiMethodInput.value = selectedApi.method;
          apiStatusInput.value = selectedApi.status || 200;
          apiBodyInput.value = selectedApi.responseText || '';
        }
      };
    }
    
    shadowQuery('btn-format').onclick = () => {
      try {
        const parsed = JSON.parse(apiBodyInput.value);
        apiBodyInput.value = JSON.stringify(parsed, null, 2);
      } catch (e) {
        alert("Invalid JSON format");
      }
    };
    
    shadowQuery('btn-reset').onclick = () => {
      if (selectedApi) {
        apiStatusInput.value = selectedApi.originalStatus || 200;
        apiBodyInput.value = selectedApi.originalResponseText || '';
      }
    };
    
    shadowQuery('btn-save').onclick = (e) => {
      const btn = e.target;
      btn.disabled = true;
      btn.innerText = 'Saving & Reloading...';
      
      const mockUrl = apiUrlInput.value;
      const mockMethod = apiMethodInput.value;
      const mockStatus = parseInt(apiStatusInput.value, 10);
      const mockBody = apiBodyInput.value;
      
      const mockData = {
        url: mockUrl,
        method: mockMethod,
        status: mockStatus,
        responseText: mockBody,
        originalStatus: selectedApi ? (selectedApi.originalStatus || selectedApi.status || 200) : 200,
        originalResponseText: selectedApi ? (selectedApi.originalResponseText || selectedApi.responseText || '') : '',
        isMocked: true
      };
      
      if (selectedApi) {
        selectedApi.status = mockStatus;
        selectedApi.responseText = mockBody;
        selectedApi.isMocked = true;
      }
      
      const localIdx = apiCalls.findIndex(c => c.url === mockUrl && c.method === mockMethod);
      if (localIdx !== -1) {
        apiCalls[localIdx] = { ...apiCalls[localIdx], ...mockData };
      }
      
      // Update local apiMocks and sessionStorage synchronously to survive reload race conditions
      const mockIdx = apiMocks.findIndex(m => m.url === mockUrl && m.method === mockMethod);
      if (mockIdx !== -1) {
        apiMocks[mockIdx] = { ...apiMocks[mockIdx], ...mockData };
      } else {
        apiMocks.push(mockData);
      }
      try {
        sessionStorage.setItem('web2md_api_mocks', JSON.stringify(apiMocks));
      } catch (e) {}
      
      window.postMessage({
        type: 'WEB2MD_UPDATE_MOCK_SAVE',
        mock: mockData
      }, '*');
      
      window.postMessage({
        type: 'WEB2MD_INSPECTED_ELEMENT_CLICKED',
        call: mockData
      }, '*');
      
      setTimeout(() => {
        closeModal();
        window.location.reload();
      }, 150);
    };
  }

  function toggleInspectMode(enabled) {
    isInspectModeActive = enabled;
    if (enabled) {
      createHighlighterAndTooltip();
      window.addEventListener('mouseover', handleWindowMouseOver, true);
      window.addEventListener('mouseout', handleWindowMouseOut, true);
      window.addEventListener('click', handleWindowClick, true);
    } else {
      removeHighlighterAndTooltip();
      window.removeEventListener('mouseover', handleWindowMouseOver, true);
      window.removeEventListener('mouseout', handleWindowMouseOut, true);
      window.removeEventListener('click', handleWindowClick, true);
      if (modalRoot) {
        modalRoot.remove();
        modalRoot = null;
      }
    }
  }

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
      } else if (event.data.type === 'WEB2MD_TOGGLE_INSPECT') {
        toggleInspectMode(event.data.enabled);
      }
    }
  });
})();
