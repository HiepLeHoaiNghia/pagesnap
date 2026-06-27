(function() {
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

  function recordCall(callLog) {
    apiCalls.push(callLog);
    window.postMessage({ type: 'WEB2MD_API_CALL_RECORDED', call: callLog }, '*');
  }

  // Intercept Fetch
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
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
      requestHeaders: headers,
      requestBody: reqBodyStr,
      timestamp: Date.now()
    };

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
      url: '',
      requestHeaders: {},
      requestBody: null,
      timestamp: Date.now()
    };

    const originalOpen = xhr.open;
    xhr.open = function(method, url, ...rest) {
      callLog.method = method.toUpperCase();
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
      if (body) {
        if (typeof body === 'string') {
          callLog.requestBody = body;
        } else {
          try {
            callLog.requestBody = JSON.stringify(body);
          } catch (e) {}
        }
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
})();
