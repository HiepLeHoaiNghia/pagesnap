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
async function ensureScriptsInjected(tabId) {
  try {
    // Check if the script is already loaded by pinging it
    await chrome.tabs.sendMessage(tabId, { action: "ping" });
    return true;
  } catch (err) {
    // Inject main world script first (catch but continue if blocked by CSP / rules)
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId, allFrames: true },
        files: ["main_world.js"],
        world: "MAIN"
      });
    } catch (e) {
      console.warn("Dynamic main world injection warning from background: ", e);
    }

    // Inject regular scripts
    try {
      const scripts = ["lib/readability.js", "lib/turndown.js", "lib/turndown-plugin-gfm.js", "content.js"];
      for (const script of scripts) {
        await chrome.scripting.executeScript({
          target: { tabId: tabId, allFrames: true },
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

  const injected = await ensureScriptsInjected(tab.id);
  if (!injected) return;

  if (info.menuItemId === "web2md-selection") {
    chrome.tabs.sendMessage(tab.id, {
      action: "convertSelection"
    });
  } else if (info.menuItemId === "web2md-page") {
    chrome.tabs.sendMessage(tab.id, {
      action: "convertPage"
    });
  }
});

// Cache for detected React VFS projects across frames
const tabProjects = {};

// Clean up cache when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabProjects[tabId];
});

// Handle registration and query of project files
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "registerProject" && sender.tab) {
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
  }
  return true;
});
