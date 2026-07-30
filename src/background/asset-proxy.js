/**
 * CORS proxy fetch handlers for HTML cloning (stylesheets, scripts, assets).
 * Moved verbatim from background.js.
 */

import { ACTIONS } from '../shared/constants.js';

export function resolveCssUrls(cssText, baseUrl) {
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

export async function fetchStyleSheetRecursively(url, visited = new Set()) {
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

export const handlers = {
  [ACTIONS.FETCH_EXTERNAL_STYLESHEET](message, sender, sendResponse) {
    fetchStyleSheetRecursively(message.url)
      .then(text => sendResponse({ success: true, text }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  },

  [ACTIONS.FETCH_ASSET_AS_BASE64](message, sender, sendResponse) {
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
  },

  [ACTIONS.FETCH_EXTERNAL_SCRIPT](message, sender, sendResponse) {
    fetch(message.url)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then(text => sendResponse({ success: true, text }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
};
