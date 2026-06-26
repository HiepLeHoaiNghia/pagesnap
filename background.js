/**
 * Web2MD Background Service Worker
 * Manages context menus and extension lifecycle.
 */

// Register context menus on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "web2md-selection",
    title: "Convert Selection to Markdown",
    contexts: ["selection"]
  });
  
  chrome.contextMenus.create({
    id: "web2md-page",
    title: "Convert Page to Markdown",
    contexts: ["page", "frame"]
  });
  
  console.log("Web2MD extension context menus registered.");
});

// Helper to dynamically inject content scripts if not pre-loaded
async function ensureScriptsInjected(tabId, frameId = 0) {
  try {
    // Check if the script is already loaded by pinging it
    await chrome.tabs.sendMessage(tabId, { action: "ping" }, { frameId });
    return true;
  } catch (err) {
    // Inject main world script first (catch but continue if blocked by CSP / rules)
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId, frameIds: [frameId] },
        files: ["main_world.js"],
        world: "MAIN"
      });
    } catch (e) {
      console.warn("Dynamic main world injection warning from background: ", e);
    }

    // Inject regular scripts
    try {
      const scripts = ["lib/readability.js", "lib/turndown.js", "lib/turndown-plugin-gfm.js", "isolated_bridge.js", "content.js"];
      for (const script of scripts) {
        await chrome.scripting.executeScript({
          target: { tabId: tabId, frameIds: [frameId] },
          files: [script]
        });
      }
      return true;
    } catch (e) {
      console.error("Script injection failed from background: ", e);
      return false;
    }
  }
}

// Listen for context menu click events
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;

  const frameId = info.frameId !== undefined ? info.frameId : 0;
  const injected = await ensureScriptsInjected(tab.id, frameId);
  if (!injected) return;

  const options = { frameId };
  if (info.menuItemId === "web2md-selection") {
    chrome.tabs.sendMessage(tab.id, {
      action: "convertSelection"
    }, options);
  } else if (info.menuItemId === "web2md-page") {
    chrome.tabs.sendMessage(tab.id, {
      action: "convertPage"
    }, options);
  }
});

// Cache for detected React VFS projects across frames
const tabProjects = {};
// Cache for captured API calls keyed by tab ID
const tabApiCalls = {};

// Clean up cache when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabProjects[tabId];
  delete tabApiCalls[tabId];
});

// Handle registration, query of project files, and CORS fetching for HTML cloning
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "resetApiCalls" && sender.tab) {
    const tabId = sender.tab.id;
    delete tabApiCalls[tabId];
    sendResponse({ success: true });
  } else if (message.action === "recordApiCall" && sender.tab) {
    const tabId = sender.tab.id;
    if (!tabApiCalls[tabId]) {
      tabApiCalls[tabId] = [];
    }
    // Check for duplicates to avoid adding identical calls
    const isDuplicate = tabApiCalls[tabId].some(call => 
      call.url === message.call.url && 
      call.method === message.call.method && 
      Math.abs(call.timestamp - message.call.timestamp) < 1000
    );
    if (!isDuplicate) {
      tabApiCalls[tabId].push(message.call);
    }
    sendResponse({ success: true });
  } else if (message.action === "getApiCalls") {
    const tabId = message.tabId;
    sendResponse({ success: true, apiCalls: tabApiCalls[tabId] || [] });
  } else if (message.action === "updateApiCall") {
    const { tabId, index, updatedCall } = message;
    if (tabApiCalls[tabId] && tabApiCalls[tabId][index]) {
      tabApiCalls[tabId][index] = { ...tabApiCalls[tabId][index], ...updatedCall };
    }
    sendResponse({ success: true });
  } else if (message.action === "deleteApiCall") {
    const { tabId, index } = message;
    if (tabApiCalls[tabId] && tabApiCalls[tabId][index]) {
      tabApiCalls[tabId].splice(index, 1);
    }
    sendResponse({ success: true });
  } else if (message.action === "registerProject" && sender.tab) {
    tabProjects[sender.tab.id] = {
      files: message.projectFiles,
      title: sender.tab.title || "Project"
    };
    sendResponse({ success: true });
  } else if (message.action === "getProject") {
    const tabId = message.tabId;
    if (tabProjects[tabId]) {
      sendResponse({
        hasProject: true,
        projectFiles: tabProjects[tabId].files,
        title: tabProjects[tabId].title
      });
    } else {
      sendResponse({ hasProject: false });
    }
  } else if (message.action === "fetchExternalStyleSheet") {
    fetchStyleSheetRecursively(message.url)
      .then(text => sendResponse({ success: true, text }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  } else if (message.action === "fetchAssetAsBase64") {
    fetch(message.url)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const contentType = response.headers.get("content-type") || "application/octet-stream";
        return response.arrayBuffer().then(buffer => ({ buffer, contentType }));
      })
      .then(({ buffer, contentType }) => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, chunk);
        }
        const base64 = btoa(binary);
        const dataUrl = `data:${contentType};base64,${base64}`;
        sendResponse({ success: true, dataUrl });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  } else if (message.action === "fetchExternalScript") {
    fetch(message.url)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then(text => sendResponse({ success: true, text }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  return true;
});

function resolveCssUrls(cssText, baseUrl) {
  return cssText.replace(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g, (match, url) => {
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return match;
    }
    try {
      const absUrl = new URL(url, baseUrl).href;
      return `url("${absUrl}")`;
    } catch (e) {
      return match;
    }
  });
}

async function fetchStyleSheetRecursively(url, visited = new Set()) {
  if (visited.has(url)) return "";
  visited.add(url);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let cssText = await response.text();

    // Resolve relative URLs in this stylesheet first to absolute URLs
    cssText = resolveCssUrls(cssText, url);

    // Find and resolve all @import statements
    const importRegex = /@import\s+(?:url\(\s*['"]?([^'")\s]+)['"]?\s*\)|['"]([^'"]+)['"])\s*([^;]*);/gi;
    let match;
    const imports = [];
    while ((match = importRegex.exec(cssText)) !== null) {
      const importUrl = match[1] || match[2];
      const mediaQuery = match[3] || "";
      imports.push({
        fullMatch: match[0],
        url: new URL(importUrl, url).href,
        mediaQuery: mediaQuery.trim()
      });
    }

    for (const imp of imports) {
      try {
        let importedCss = await fetchStyleSheetRecursively(imp.url, visited);
        if (imp.mediaQuery) {
          importedCss = `@media ${imp.mediaQuery} {\n${importedCss}\n}`;
        }
        cssText = cssText.replace(imp.fullMatch, importedCss);
      } catch (err) {
        console.warn(`Failed to recursively import stylesheet: ${imp.url}`, err);
        cssText = cssText.replace(imp.fullMatch, `/* Failed to import ${imp.url} */`);
      }
    }

    return cssText;
  } catch (error) {
    throw error;
  }
}
