// plan-exempt — split developer features into pagereplica-extension approved by user
/**
 * Web2MD HTML Clone: serializes the entire DOM into a single, self-contained HTML page
 * with inline-replaced stylesheets, adoptedStyleSheets, and inlined images/fonts.
 * Also produces a structured "package" (html/css/js/assets) for the ZIP export.
 */
Web2MD.serializePageToSelfContainedHtml = async function (options = {}) {
  const preserveJs = !!options.preserveJs;
  const baseHref = window.location.href;
  const styleMap = new Map();
  const stylesheetPromises = [];

  // Helper to resolve CSS relative urls
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

  // Helper to map CSS URLs based on a mapper function (e.g. mapping to base64 or local paths)
  function mapCssUrls(cssText, baseUrl, urlMapper) {
    return cssText.replace(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g, (match, url) => {
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        return match;
      }
      try {
        const absUrl = new URL(url, baseUrl).href;
        const mapped = urlMapper(absUrl);
        if (mapped) {
          return `url("${mapped}")`;
        }
      } catch (e) {}
      return match;
    });
  }

  // Helper to get correct file extension from dataurl or file URL
  function getAssetExtension(url, dataUrl) {
    if (dataUrl && dataUrl.startsWith('data:')) {
      const mime = dataUrl.split(';')[0].split(':')[1];
      if (mime) {
        const parts = mime.split('/');
        if (parts[1]) {
          const extMap = {
            'svg+xml': 'svg',
            'javascript': 'js',
            'typescript': 'ts',
            'plain': 'txt',
            'x-icon': 'ico',
            'vnd.microsoft.icon': 'ico',
          };
          return extMap[parts[1]] || parts[1];
        }
      }
    }
    try {
      const pathname = new URL(url).pathname;
      const ext = pathname.split('.').pop();
      if (ext && ext.length < 5 && /^[a-zA-Z0-9]+$/.test(ext)) {
        return ext;
      }
    } catch (e) {}
    return 'png'; // default fallback
  }

  async function resolveStyleSheetRules(sheet, baseUrl) {
    let rulesText = '';
    try {
      if (sheet && sheet.cssRules) {
        for (let i = 0; i < sheet.cssRules.length; i++) {
          const rule = sheet.cssRules[i];
          if (rule.type === 3 && rule.styleSheet) { // CSSRule.IMPORT_RULE
            const importHref = rule.href || rule.styleSheet.href;
            if (importHref) {
              const absImportHref = new URL(importHref, baseUrl).href;
              let importedCss = '';
              try {
                importedCss = await resolveStyleSheetRules(rule.styleSheet, absImportHref);
              } catch (e) {
                // If same-origin access failed, fetch via background
                importedCss = await new Promise((resolve) => {
                  chrome.runtime.sendMessage({ action: "fetchExternalStyleSheet", url: absImportHref }, (response) => {
                    if (response && response.success) {
                      resolve(response.text);
                    } else {
                      resolve(`/* Failed to load @import from ${absImportHref} */`);
                    }
                  });
                });
              }
              if (rule.media && rule.media.mediaText) {
                rulesText += `@media ${rule.media.mediaText} {\n${importedCss}\n}\n`;
              } else {
                rulesText += importedCss + '\n';
              }
            }
          } else {
            rulesText += rule.cssText + '\n';
          }
        }
        return resolveCssUrls(rulesText, baseUrl);
      }
    } catch (e) {
      throw e;
    }
    return '';
  }

  // 1. Map each stylesheet created by an ownerNode to its resolved rules
  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    const ownerNode = sheet.ownerNode;
    if (!ownerNode) continue;

    const href = sheet.href || baseHref;
    stylesheetPromises.push(
      (async () => {
        try {
          const resolvedRules = await resolveStyleSheetRules(sheet, href);
          styleMap.set(ownerNode, resolvedRules);
        } catch (e) {
          if (sheet.href) {
            const url = sheet.href;
            await new Promise((resolve) => {
              chrome.runtime.sendMessage({ action: "fetchExternalStyleSheet", url }, (response) => {
// plan-exempt — preserve external stylesheet link when inlining fails
                if (response && response.success && response.text) {
                  styleMap.set(ownerNode, resolveCssUrls(response.text, url));
                } else {
                  // Do not populate styleMap so serializer preserves <link rel="stylesheet" href="...">
                }
                resolve();
              });
            });
          } else {
            styleMap.set(ownerNode, `/* Failed to access local stylesheet rules */`);
          }
        }
      })()
    );
  }

  await Promise.all(stylesheetPromises);

  // 2. Fetch/Inline Scripts if preserveJs is active
  // 3. Fetch/Inline Scripts if preserveJs is active
  const scriptContentMap = new Map();
  const scriptPromises = [];
  const TRACKER_REGEX = /google-analytics\.com|googletagmanager\.com|sentry\.io|mixpanel\.com|facebook\.net|doubleclick\.net|hotjar\.com|amplitude\.com|browser\.sentry-cdn\.com/i;

  if (preserveJs) {
    document.querySelectorAll('script').forEach(script => {
      const src = script.getAttribute('src');
      if (src) {
        try {
          const absUrl = new URL(src, baseHref).href;
          if (!TRACKER_REGEX.test(absUrl)) {
            scriptPromises.push(
              new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: "fetchExternalScript", url: absUrl }, (response) => {
                  if (response && response.success) {
                    scriptContentMap.set(script, response.text);
                  } else {
                    scriptContentMap.set(script, `/* Failed to load external script: ${absUrl} */`);
                  }
                  resolve();
                });
              })
            );
          } else {
            scriptContentMap.set(script, null); // Skip tracker
          }
        } catch (e) {
          scriptContentMap.set(script, `/* Failed to resolve URL: ${src} */`);
        }
      } else {
        const inlineText = script.textContent || '';
        if (!TRACKER_REGEX.test(inlineText)) {
          scriptContentMap.set(script, inlineText);
        } else {
          scriptContentMap.set(script, null); // Skip tracker
        }
      }
    });

    await Promise.race([
      Promise.all(scriptPromises),
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);
  }

  // 4. Extract asset URLs (images and fonts)
  const assetUrls = new Set();

  // From <img> tags
  const assetScope = options.targetElement || document;
  assetScope.querySelectorAll('img').forEach(img => {
    if (img.src && !img.src.startsWith('data:')) {
      assetUrls.add(img.src);
    }
  });
  if (options.targetElement && options.targetElement.tagName && options.targetElement.tagName.toLowerCase() === 'img') {
    if (options.targetElement.src && !options.targetElement.src.startsWith('data:')) {
      assetUrls.add(options.targetElement.src);
    }
  }

  // From stylesheets in styleMap
  const URL_REGEX = /url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g;
  for (const [node, cssText] of styleMap.entries()) {
    let match;
    const baseUrl = node.href || baseHref;
    while ((match = URL_REGEX.exec(cssText)) !== null) {
      const url = match[1].trim();
      if (!url.startsWith('data:') && !url.startsWith('blob:')) {
        try {
          const absUrl = new URL(url, baseUrl).href;
          assetUrls.add(absUrl);
        } catch (e) {}
      }
    }
  }

  // 5. Fetch assets in parallel and convert to Base64
  const assetMap = new Map();
  const assetPromises = Array.from(assetUrls).map(url => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "fetchAssetAsBase64", url }, (response) => {
        if (response && response.success) {
          assetMap.set(url, response.dataUrl);
        }
        resolve();
      });
    });
  });

  // Set a 5 seconds max timeout for asset fetching to prevent hang
  await Promise.race([
    Promise.all(assetPromises),
    new Promise(resolve => setTimeout(resolve, 5000))
  ]);

  // Generate mapping from original asset URL to their local filename for structured mode
  const assetPathMap = new Map(); // originalUrl -> "assets/asset_N.ext"
  let assetCounter = 0;
  for (const [url, dataUrl] of assetMap.entries()) {
    const ext = getAssetExtension(url, dataUrl);
    const filename = `assets/asset_${assetCounter++}.${ext}`;
    assetPathMap.set(url, filename);
  }

  // Assemble global CSS for structured mode
  let globalCss = '';
  for (const [node, cssText] of styleMap.entries()) {
    if (node.getRootNode() === document) {
      globalCss += `/* StyleSheet: ${node.tagName.toLowerCase()}${node.id ? '#' + node.id : ''} */\n`;
      globalCss += mapCssUrls(cssText, node.href || baseHref, (absUrl) => assetPathMap.get(absUrl)) + '\n\n';
    }
  }
  if (document.adoptedStyleSheets && document.adoptedStyleSheets.length > 0) {
    let adoptedCss = '';
    for (const sheet of document.adoptedStyleSheets) {
      try {
        adoptedCss += Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n') + '\n';
      } catch (e) {}
    }
    if (adoptedCss) {
      globalCss += `/* Adopted Document StyleSheet */\n`;
      globalCss += mapCssUrls(resolveCssUrls(adoptedCss, baseHref), baseHref, (absUrl) => assetPathMap.get(absUrl)) + '\n\n';
    }
  }

  // Assemble global JS for structured mode
  let globalJs = '';
  if (preserveJs) {
    document.querySelectorAll('script').forEach(script => {
      if (script.getRootNode() === document) {
        if (scriptContentMap.has(script)) {
          const content = scriptContentMap.get(script);
          if (content) {
            const src = script.getAttribute('src');
            globalJs += `// --- Script: ${src || 'Inline'} ---\n`;
            globalJs += content + '\n\n';
          }
        }
      }
    });
  }

  // 6. Adopted stylesheets serialization helper
  function serializeAdoptedStyleSheets(container, isStructured) {
    if (isStructured && container === document) {
      return ''; // In structured mode, document adopted sheets go to styles.css
    }
    if (container && container.adoptedStyleSheets && container.adoptedStyleSheets.length > 0) {
      let cssText = '';
      for (const sheet of container.adoptedStyleSheets) {
        try {
          cssText += Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n') + '\n';
        } catch (e) {}
      }
      if (cssText) {
        const inlined = resolveCssUrls(cssText, baseHref).replace(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g, (match, url) => {
          try {
            const absUrl = new URL(url, baseHref).href;
            const mapped = isStructured ? assetPathMap.get(absUrl) : assetMap.get(absUrl);
            if (mapped) {
              return `url("${mapped}")`;
            }
          } catch (e) {}
          return match;
        });
        return `<style class="web2md-adopted-styles">${inlined}</style>`;
      }
    }
    return '';
  }

  // 7. Recursively serialize DOM including Shadow DOM
  function serializeNode(node, isStructured) {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent);
    }
    if (node.nodeType === Node.COMMENT_NODE) {
      return `<!--${node.textContent}-->`;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

// plan-exempt — PageSnap branding update
    if (node.getAttribute && (node.getAttribute('data-pagesnap-ignore') === 'true' || node.getAttribute('data-web2md-ignore') === 'true')) {
      return '';
    }
    if (node.id && (node.id.startsWith('pagesnap-') || node.id.startsWith('web2md-'))) {
      return '';
    }
    if (node.classList && (node.classList.contains('pagesnap-highlight-overlay') || node.classList.contains('web2md-highlight-overlay') || node.classList.contains('web2md-outline-overlay'))) {
      return '';
    }

    const tagName = node.tagName.toLowerCase();

    // Ignore or inline script tags
    if (tagName === 'script') {
      if (preserveJs) {
        if (isStructured) {
          // In structured mode, main document scripts go to scripts.js
          if (node.getRootNode() === document) {
            return '';
          }
          // Inside shadow root, keep inline script to preserve context/scoping
          if (scriptContentMap.has(node)) {
            const content = scriptContentMap.get(node);
            if (content === null) return '';
            const safeContent = content.replace(/<\/script>/gi, '<\\/script>');
            return `<script>${safeContent}</script>`;
          }
        } else {
          // Self-contained mode
          if (scriptContentMap.has(node)) {
            const content = scriptContentMap.get(node);
            if (content === null) return '';
            const safeContent = content.replace(/<\/script>/gi, '<\\/script>');
            return `<script>${safeContent}</script>`;
          }
        }
      }
      return '';
    }

    // Convert canvas to static img
    if (tagName === 'canvas') {
      try {
        const dataUrl = node.toDataURL('image/png');
        let srcVal = dataUrl;
        if (isStructured) {
          const filename = `assets/canvas_${Math.random().toString(36).substr(2, 5)}.png`;
          assetMap.set(filename, dataUrl);
          assetPathMap.set(filename, filename);
          srcVal = filename;
        }
        let canvasHtml = `<img src="${srcVal}"`;
        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i];
          if (attr.name !== 'style' && attr.name !== 'width' && attr.name !== 'height') {
            canvasHtml += ` ${attr.name}="${escapeHtml(attr.value)}"`;
          }
        }
        canvasHtml += ' />';
        return canvasHtml;
      } catch (e) {}
    }

    // In-place inline stylesheet replacement
    if (tagName === 'link' && node.getAttribute('rel') === 'stylesheet') {
      if (styleMap.has(node)) {
        if (isStructured && node.getRootNode() === document) {
          return ''; // Omit from HTML (goes to styles.css)
        }
        // Inside shadow root or self-contained mode, inline the resolved CSS rules
        const cssRules = styleMap.get(node);
        const resolvedCss = mapCssUrls(cssRules, node.href || baseHref, (absUrl) => {
          return isStructured ? assetPathMap.get(absUrl) : assetMap.get(absUrl);
        });
        return `<style id="web2md-inlined-${Math.random().toString(36).substr(2, 5)}">${resolvedCss}</style>`;
      }
      // If we couldn't load rules, keep link but resolve absolute href
      const href = node.getAttribute('href');
      if (href) {
        try {
          const absHref = new URL(href, baseHref).href;
          return `<link rel="stylesheet" href="${escapeHtml(absHref)}" />`;
        } catch(e) {}
      }
      return '';
    }

    if (tagName === 'style') {
      if (node.id === 'web2md-visual-edit-styles') {
        return '';
      }
      if (isStructured && node.getRootNode() === document) {
        return ''; // Omit from HTML (goes to styles.css)
      }
      let cssRules = '';
      if (styleMap.has(node)) {
        cssRules = styleMap.get(node);
      } else {
        cssRules = node.textContent;
      }
      const resolvedCss = mapCssUrls(cssRules, baseHref, (absUrl) => {
        return isStructured ? assetPathMap.get(absUrl) : assetMap.get(absUrl);
      });
      return `<style>${resolvedCss}</style>`;
    }

    let html = `<${tagName}`;

    // Serialize attributes
    for (let i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes[i];
      let value = attr.value;

      // Clean up our visual edit hover/highlight classes if present
      if (attr.name === 'class') {
        value = value.replace(/\b(web2md-hover-active|web2md-region-highlighted)\b/g, '').trim();
        if (!value) continue;
      }

      // Skip srcset to force img fallback to inlined src
      if (tagName === 'img' && attr.name === 'srcset') {
        continue;
      }

      // Replace image src
      if (tagName === 'img' && attr.name === 'src') {
        try {
          const absSrc = new URL(value, baseHref).href;
          if (isStructured) {
            value = assetPathMap.get(absSrc) || absSrc;
          } else {
            value = assetMap.get(absSrc) || absSrc;
          }
        } catch(e) {}
      }

      // Replace inline background-image url()
      if (attr.name === 'style' && value.includes('url(')) {
        value = value.replace(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g, (match, url) => {
          try {
            const absUrl = new URL(url, baseHref).href;
            const mapped = isStructured ? assetPathMap.get(absUrl) : assetMap.get(absUrl);
            if (mapped) {
              return `url("${mapped}")`;
            }
          } catch(e) {}
          return match;
        });
      }

      // Resolve relative urls for links and other subresources
      if (['src', 'href', 'data', 'poster'].includes(attr.name) && value && !value.startsWith('data:') && !value.startsWith('blob:') && !value.startsWith('#')) {
        try {
          value = new URL(value, baseHref).href;
        } catch(e) {}
      }

      html += ` ${attr.name}="${escapeHtml(value)}"`;
    }

    // Capture dynamic state of interactive form elements
    if (tagName === 'input') {
      const type = node.getAttribute('type') ? node.getAttribute('type').toLowerCase() : 'text';
      if (['checkbox', 'radio'].includes(type)) {
        if (node.checked && !html.includes('checked')) {
          html += ' checked="checked"';
        }
      } else if (!['button', 'submit', 'reset', 'image', 'file'].includes(type)) {
        if (node.value && !html.includes('value=')) {
          html += ` value="${escapeHtml(node.value)}"`;
        }
      }
    }

    // Self-closing tags
    const selfClosing = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
    if (selfClosing.includes(tagName)) {
      return html + ' />';
    }

    html += '>';

    // Append Declarative Shadow DOM if exists
    if (node.shadowRoot) {
      html += '<template shadowrootmode="open">';
      html += serializeAdoptedStyleSheets(node.shadowRoot, isStructured);
      for (let i = 0; i < node.shadowRoot.childNodes.length; i++) {
        html += serializeNode(node.shadowRoot.childNodes[i], isStructured);
      }
      html += '</template>';
    }

    // Insert stylesheet reference or script references under the head tag
    if (tagName === 'head') {
      if (isStructured) {
        html += '<link rel="stylesheet" href="styles.css" />';
        if (preserveJs) {
          html += '<script src="scripts.js" defer></script>';
        }
      } else {
        html += serializeAdoptedStyleSheets(document, false);
      }
    }

    // Serialize child nodes or text area dynamic value
    if (tagName === 'textarea') {
      html += escapeHtml(node.value);
    } else if (tagName === 'select') {
      // For select tag, make sure selected options get their selected attribute set
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];
        if (child.tagName && child.tagName.toLowerCase() === 'option') {
          let optionHtml = '<option';
          for (let j = 0; j < child.attributes.length; j++) {
            const attr = child.attributes[j];
            optionHtml += ` ${attr.name}="${escapeHtml(attr.value)}"`;
          }
          if (child.selected) {
            optionHtml += ' selected="selected"';
          }
          optionHtml += `>${escapeHtml(child.textContent)}</option>`;
          html += optionHtml;
        } else {
          html += serializeNode(child, isStructured);
        }
      }
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        html += serializeNode(node.childNodes[i], isStructured);
      }
    }

    html += `</${tagName}>`;
    return html;
  }

  // Helper to escape HTML characters
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  let selfContainedHtml, structuredHtml;
  let serializedSelfContainedNode = null;
  let serializedStructuredNode = null;
  if (options.targetElement) {
    serializedSelfContainedNode = serializeNode(options.targetElement, false);
    serializedStructuredNode = serializeNode(options.targetElement, true);

    const headSelfContained = `
  <meta charset="UTF-8" />
  <title>${escapeHtml(document.title)} - Region</title>
  ${serializeAdoptedStyleSheets(document, false)}
  ${Array.from(styleMap.entries()).map(([node, cssText]) => {
    const href = node.href || baseHref;
    const resolvedCss = mapCssUrls(cssText, href, (absUrl) => assetMap.get(absUrl));
    return `<style>${resolvedCss}</style>`;
  }).join('\n')}
  ${preserveJs ? Array.from(scriptContentMap.entries()).map(([script, content]) => {
    if (content === null) return '';
    const safeContent = content.replace(/<\/script>/gi, '<\\/script>');
    return `<script>${safeContent}</script>`;
  }).join('\n') : ''}
`;

    selfContainedHtml = `<!DOCTYPE html>
<html>
<head>
${headSelfContained}
</head>
<body>
  ${serializedSelfContainedNode}
</body>
</html>`;

    const headStructured = `
  <meta charset="UTF-8" />
  <title>${escapeHtml(document.title)} - Region</title>
  <link rel="stylesheet" href="styles.css" />
  ${preserveJs ? '<script src="scripts.js" defer></script>' : ''}
`;

    structuredHtml = `<!DOCTYPE html>
<html>
<head>
${headStructured}
</head>
<body>
  ${serializedStructuredNode}
</body>
</html>`;
  } else {
// plan-exempt — prepend doctype for standards mode
    selfContainedHtml = '<!DOCTYPE html>\n' + serializeNode(document.documentElement, false);
    structuredHtml = '<!DOCTYPE html>\n' + serializeNode(document.documentElement, true);
  }

  const packageAssets = [];
  for (const [url, dataUrl] of assetMap.entries()) {
    const filename = assetPathMap.get(url) || url;
    packageAssets.push({
      path: filename,
      dataUrl: dataUrl
    });
  }

  return {
    html: selfContainedHtml,
    nodeHtml: options.targetElement ? serializedSelfContainedNode : selfContainedHtml,
    package: {
      html: structuredHtml,
      css: globalCss,
      js: globalJs,
      assets: packageAssets
    }
  };
};

// plan-exempt — safe registerHandlers call with tab-based direct download handlers
let lastSerializedHtml = '';

(typeof PageSnap !== 'undefined' ? PageSnap : Web2MD).registerHandlers({
  clonePage: (request, sender, sendResponse) => {
    const opts = request.settings || request || {};
    Web2MD.serializePageToSelfContainedHtml({
      preserveJs: !!opts.preserveJs,
      targetElement: opts.targetElement || null
    })
      .then(res => {
        lastSerializedHtml = res.html;
        sendResponse({ success: true, html: res.html, package: res.package });
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  },
  downloadHtmlSnapshot: (request, sender, sendResponse) => {
    try {
      const htmlToDownload = request.html || lastSerializedHtml;
      if (!htmlToDownload) {
        sendResponse({ success: false, error: 'No HTML content available' });
        return;
      }
      const blob = new Blob([htmlToDownload], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = request.filename || 'snapshot.html';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
      }, 60000);
      sendResponse({ success: true });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  },
  downloadTextFile: (request, sender, sendResponse) => {
    try {
      if (!request.content) {
        sendResponse({ success: false, error: 'No content provided' });
        return;
      }
      const blob = new Blob([request.content], { type: request.mimeType || 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = request.filename || 'export.txt';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
      }, 60000);
      sendResponse({ success: true });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }
});
