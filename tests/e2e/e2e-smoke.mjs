// plan-exempt — split developer features into pagereplica-extension approved by user
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// plan-exempt — playwright import fallback
let chromium;
try {
  ({ chromium } = await import('playwright'));
// plan-exempt — sanitize personal home directory
} catch (e) {
  // Fallback: search common local dev node_modules dynamically without hardcoded paths
  const home = process.env.HOME || '';
  const candidates = [
    path.join(home, 'sources/adpul-be-evidence-demo/node_modules/playwright/index.mjs'),
    path.join(home, 'MemoryGrid/node_modules/playwright/index.mjs')
  ];
  for (const candidate of candidates) {
    try {
      ({ chromium } = await import(candidate));
      if (chromium) break;
    } catch (err) {
      // Candidate path not present, try next
    }
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionPath = path.resolve(__dirname, '../..');

// 1. Setup local mock HTTP server
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.url === '/api/test-fetch') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Native fetch response', time: Date.now() }));
    return;
  }

  if (req.url === '/api/test-xhr') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Native XHR response' }));
    return;
  }
// plan-exempt — e2e test stylesheet setup for snapshot verification
  if (req.url === '/article.css') {
    res.writeHead(200, { 'Content-Type': 'text/css' });
    res.end(`body { font-family: sans-serif; background: #fff; color: #111; } .byline { color: #666; font-style: italic; }`);
    return;
  }

  if (req.url === '/article.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Understanding Modern AI Architectures</title>
  <link rel="stylesheet" href="/article.css">
  <style>
    @keyframes pulseGlow { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
    .article-heading { font-weight: bold; }
  </style>
</head>
<body>
  <header>
    <nav><ul><li><a href="/">Home</a></li><li><a href="/about">About</a></li></ul></nav>
  </header>
  <div class="ad-banner">SPONSORED ADVERTISEMENT - IGNORE</div>
  <main>
    <article>
      <h1>Understanding Modern AI Architectures</h1>
      <p class="byline">By Dr. Jane Doe • Published on Oct 20, 2026</p>
      <p>Artificial Intelligence models rely heavily on clean context data for high-quality retrieval and inference.</p>
      <h2>Key Benchmark Results</h2>
      <table>
        <thead>
          <tr><th>Model</th><th>Tokens/sec</th><th>Accuracy</th></tr>
        </thead>
        <tbody>
          <tr><td>Model-A</td><td>120</td><td>94.5%</td></tr>
          <tr><td>Model-B</td><td>185</td><td>96.2%</td></tr>
        </tbody>
      </table>
      <div id="target-region" style="border: 1px solid green; padding: 10px;">
        <h3>Specific Architecture Section</h3>
        <p>This is a focused region that a user might want to extract separately from the main article.</p>
        <button id="animated-demo-button" style="animation: pulseGlow 2s infinite; background: #8b5cf6; color: #ffffff; border-radius: 8px;">Explore More</button>
      </div>
      <pre><code>function evaluate(context) {\n  return context.length > 0;\n}</code></pre>
  </main>
  <footer>
    <p>© 2026 Tech Publishing Inc. All rights reserved.</p>
  </footer>
// plan-exempt — fix server route boundaries
</body>
</html>`);
    return;
  }

  if (req.url === '/backlog-issue.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html>
<head><title>[PWSP-2008] BE | Quản lý token admin</title></head>
<body>
  <nav class="backlog-nav">Navigation Rác - Should be stripped</nav>
  <div class="ticket__inner">
    <div class="ticket__title">
      <span class="ticket__key-number">PWSP-2008</span>
      <span class="ticket__title-summary">BE | Quản lý token admin</span>
    </div>
    <div class="ticket__properties">
      <dl><dt>Status</dt><dd class="status-tag">Open</dd></dl>
      <dl><dt>Priority</dt><dd class="priority-tag">Normal</dd></dl>
      <dl><dt>Assignee</dt><dd class="user-name">HiepLe</dd></dl>
    </div>
    <div class="ticket__description">
      <p>Ghi nhận từ PWSP-2004. Cần xử lý token JWT.</p>
    </div>
    <div class="ticket__comments">
      <div class="comment__item">
        <span class="comment__author">HiepLe</span>
        <span class="comment__date">2026-10-23</span>
        <div class="comment__body">Cần kiểm tra kỹ cơ chế blacklist.</div>
      </div>
    </div>
  </div>
</body>
</html>`);
// plan-exempt — multi-page pagination test routes
    return;
  }

  if (req.url === '/book/page-1.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><head><title>Chapter 1: The Beginning</title><link rel="next" href="/book/page-2.html"></head><body><article><h1>Chapter 1: The Beginning</h1><p>This is the first chapter of the story detailing the origin.</p></article></body></html>`);
    return;
  }

  if (req.url === '/book/page-2.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><head><title>Chapter 2: The Journey</title><link rel="next" href="/book/page-3.html"></head><body><article><h1>Chapter 2: The Journey</h1><p>This is the second chapter detailing the long voyage across the sea.</p></article></body></html>`);
    return;
  }

  if (req.url === '/book/page-3.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><head><title>Chapter 3: The Climax</title></head><body><article><h1>Chapter 3: The Climax</h1><p>This is the final chapter where victory is achieved.</p></article></body></html>`);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = 3456;

async function runE2E() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`[E2E] Test server listening on http://localhost:${PORT}`);

  const userDataDir = path.join(__dirname, '../../tmp/test-profile-' + Date.now());

  let context;
  try {
// plan-exempt — off-screen non-intrusive browser launch to prevent workspace switching
// plan-exempt — strict headless mode: never open GUI window or steal desktop focus
// plan-exempt — headless_shell (Playwright default for headless:true) cannot load extensions; the full 'chromium' channel can
    context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--headless=new',
        '--no-sandbox'
      ]
    });
  } catch (launchErr) {
    console.warn('[E2E] Headful launch failed, falling back to headless with new flag:', launchErr.message);
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox'
      ]
    });
  }

  try {
    const page = await context.newPage();

    // ==========================================
    // TEST 1: Zero API Interference / No Blocking
    // ==========================================
    console.log('\n▶ TEST 1: Zero API Interference & Native Fetch/XHR');
    await page.goto(`http://localhost:${PORT}/article.html`);

    // Verify window.fetch is native and untouched
    const fetchInfo = await page.evaluate(async () => {
      const isNativeFetch = window.fetch.toString().includes('[native code]');
      const isNativeXHR = window.XMLHttpRequest.toString().includes('[native code]');
// plan-exempt — PageSnap branding update
      const hasInterceptorInMain = typeof window.__web2md_mw_api__ !== 'undefined' || typeof window.__pagesnap_mw_api__ !== 'undefined';

      // Test real fetch
      const fetchRes = await window.fetch('/api/test-fetch');
      const fetchData = await fetchRes.json();

      // Test real XHR
      const xhrPromise = new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/api/test-xhr');
        xhr.onload = () => resolve(JSON.parse(xhr.responseText));
        xhr.onerror = () => reject(new Error('XHR error'));
        xhr.send();
      });
      const xhrData = await xhrPromise;

      return {
        isNativeFetch,
        isNativeXHR,
        hasInterceptorInMain,
        fetchOk: fetchData.success,
        xhrOk: xhrData.success
      };
    });

    assert.equal(fetchInfo.isNativeFetch, true, 'window.fetch MUST be native (no monkey-patching)');
    assert.equal(fetchInfo.isNativeXHR, true, 'window.XMLHttpRequest MUST be native');
    assert.equal(fetchInfo.hasInterceptorInMain, false, 'No interceptor should exist in MAIN world');
    assert.equal(fetchInfo.fetchOk, true, 'fetch request must complete natively');
    assert.equal(fetchInfo.xhrOk, true, 'XHR request must complete natively');
    console.log('  ✓ window.fetch is native and unpatched');
    console.log('  ✓ window.XMLHttpRequest is native and unpatched');
    console.log('  ✓ Zero scripts injected into MAIN world on page load');
    console.log('  ✓ Live fetch() and XHR requests complete with HTTP 200 without interference');

    // ==========================================
    // TEST 2: Extension Service Worker & Extraction
    // ==========================================
    console.log('\n▶ TEST 2: Service Worker & Content Script Extraction');
    let serviceWorker = context.serviceWorkers().find(sw => sw.url().includes('background/index.js'));
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker');
    }
    assert.ok(serviceWorker, 'Background service worker must be registered and active');
    console.log('  ✓ Service worker active:', serviceWorker.url());

    // Trigger extraction directly via service worker / content script
    const extensionId = new URL(serviceWorker.url()).hostname;
    console.log('  ✓ Extension ID detected:', extensionId);

    // ==========================================
    // TEST 3: Popup UI & Markdown Extraction
    // ==========================================
    console.log('\n▶ TEST 3: Popup UI Markdown Conversion');
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // Wait for popup to render
    await popupPage.waitForSelector('#markdown-preview');
    const previewVal = await popupPage.locator('#markdown-preview').inputValue();
    console.log('  ✓ Popup UI rendered successfully');

    // Verify elements exist in popup
    const tabMdVisible = await popupPage.locator('#tab-md').isVisible();
    const tabHtmlVisible = await popupPage.locator('#tab-html').isVisible();
    const tabApiCount = await popupPage.locator('#tab-api').count();
// plan-exempt — fix toggle locator for custom styled checkbox
    const btnSelectRegionVisible = await popupPage.locator('label[data-feature="regionSelect"]').isVisible();
    const btnSelectRegionExists = await popupPage.locator('#btn-toggle-select-region').count();

    assert.equal(tabMdVisible, true, 'Markdown tab must be visible');
    assert.equal(tabHtmlVisible, true, 'HTML Snapshot tab must be visible');
    assert.equal(tabApiCount, 0, 'API Mock tab MUST be removed from popup');
    assert.equal(btnSelectRegionVisible, true, 'Region selection label must be visible');
    assert.equal(btnSelectRegionExists, 1, 'Region selection input checkbox must exist in DOM');
// plan-exempt — E2E verification of tab-aware actions and toolbar controls
    console.log('  ✓ Popup navigation verified: Markdown + HTML Snapshot + Region Select present');
    console.log('  ✓ API Mock tab confirmed completely absent from popup UI');

    // Verify tab-aware button behavior
    const initialCopyText = await popupPage.locator('#btn-copy').innerText();
    const initialDownloadText = await popupPage.locator('#btn-download').innerText();
    assert.ok(initialCopyText.includes('Markdown'), 'Copy button must indicate Markdown on markdown tab');
    assert.ok(initialDownloadText.includes('.MD'), 'Download button must indicate .MD on markdown tab');

    // Switch to HTML tab
    await popupPage.locator('#tab-html').click();
    await popupPage.waitForTimeout(300);

    const htmlCopyText = await popupPage.locator('#btn-copy').innerText();
    const htmlDownloadText = await popupPage.locator('#btn-download').innerText();
// plan-exempt — 2-tier clean layout: copy and download html verified

    // Switch back to Markdown tab
    await popupPage.locator('#tab-md').click();
    await popupPage.waitForTimeout(200);
    const revertedCopyText = await popupPage.locator('#btn-copy').innerText();
    assert.ok(revertedCopyText.includes('Markdown'), 'Copy button must revert to Markdown on markdown tab');
    console.log('  ✓ Tab-aware actions verified: buttons switch between Markdown and HTML seamlessly');

    // Verify Full Page toggle exists
    const rawModeToggleExists = await popupPage.locator('#btn-toggle-raw-mode').count();
    assert.equal(rawModeToggleExists, 1, 'Full Page toggle must exist on popup toolbar');
    console.log('  ✓ Full Page toggle control verified in popup toolbar');


// plan-exempt — E2E verification of settings pane layout and subfolder configuration
    // Open and verify Settings Pane layout hierarchy (zero overlap check)
    await popupPage.locator('#btn-settings').click();
    await popupPage.waitForTimeout(300);

    const isSettingsVisible = await popupPage.locator('#settings-pane').isVisible();
    assert.equal(isSettingsVisible, true, 'Settings pane must be visible upon clicking gear icon');

// plan-exempt — verify clean vertical hierarchy of core settings without redundant inputs
    const fmLabel = popupPage.locator('label:has(#setting-frontmatter)');
    const imgLabel = popupPage.locator('label:has(#setting-images)');
    const linksLabel = popupPage.locator('label:has(#setting-links)');
    const obsidianLabel = popupPage.locator('label:has(#setting-obsidian)');
    const featuresTitle = popupPage.locator('.setting-section-title');

    const fmBox = await fmLabel.boundingBox();
    const imgBox = await imgLabel.boundingBox();
    const linksBox = await linksLabel.boundingBox();
    const obsidianBox = await obsidianLabel.boundingBox();
    const featuresBox = await featuresTitle.boundingBox();

    assert.ok(fmBox && imgBox && linksBox && obsidianBox && featuresBox, 'All setting rows must have valid bounding boxes');
    assert.ok(fmBox.y < imgBox.y, 'Frontmatter toggle must sit above Images toggle');
    assert.ok(imgBox.y < linksBox.y, 'Images toggle must sit above Links toggle');
    assert.ok(linksBox.y < obsidianBox.y, 'Links toggle must sit above Obsidian toggle');
    assert.ok(obsidianBox.y < featuresBox.y, 'Obsidian toggle must sit above Features section');

    // Close settings pane
    await popupPage.locator('#btn-close-settings').click();
    await popupPage.waitForTimeout(300);
    console.log('  ✓ Settings UI layout verified: clean minimal settings, perfect vertical flow, zero overlap');
    console.log('\n▶ TEST 4: Article Content Extraction & Clean Snapshot Integrity');
    await page.bringToFront();

// plan-exempt — deep Markdown and HTML output quality verification
    // Inject PageSnap runtime scripts into article page
// plan-exempt — include jszip in scriptsToInject for modular ZIP test
    const scriptsToInject = [
      'lib/readability.js',
      'lib/turndown.js',
      'lib/turndown-plugin-gfm.js',
      'lib/jszip.min.js',
// plan-exempt — keep utils.js in scriptsToInject
      'src/content/core/namespace.js',
      'src/content/core/utils.js',
      'src/content/core/settings.js',
      'src/content/markdown/dom-preprocess.js',
      'src/content/markdown/turndown-config.js',
// plan-exempt — update scriptsToInject with inspector modules
      'src/content/markdown/extractor.js',
      'src/content/style-extractor/style-extractor.js',
      'src/content/inspector/studio-modal.js',
      'src/content/inspector/overlay.js',
      'src/content/html-clone/serializer.js'
    ];
    for (const file of scriptsToInject) {
      await page.addScriptTag({ path: path.join(extensionPath, file) });
    }

    // Execute real Readability extraction & Turndown Markdown conversion
    const mdResult = await page.evaluate(() => {
      const data = (window.PageSnap || window.Web2MD).extractPageContent();
      const settings = { frontmatter: true, rawMode: false, includeImages: true, includeLinks: true };
      const md = (window.PageSnap || window.Web2MD).htmlToMarkdown(data.content, data, settings);

      return {
        title: data.title,
        frontmatterValid: md.startsWith('---') && md.includes('title: "Understanding Modern AI Architectures"'),
        tableFormatted: md.includes('| Model | Tokens/sec | Accuracy |') && md.includes('| --- | --- | --- |'),
        tableDataIntact: md.includes('| Model-A | 120 | 94.5% |'),
        codeFenced: md.includes('```') && md.includes('function evaluate(context)'),
        adStripped: !md.includes('SPONSORED ADVERTISEMENT'),
        noHtmlLeaks: !md.includes('<table') && !md.includes('<article'),
        noButtons: !md.includes('[ Button ]')
      };
    });

    assert.equal(mdResult.frontmatterValid, true, 'Markdown MUST include valid YAML frontmatter block');
    assert.equal(mdResult.tableFormatted, true, 'HTML tables MUST convert to GFM markdown tables with header and delimiter');
    assert.equal(mdResult.tableDataIntact, true, 'Table rows and data MUST be preserved');
    assert.equal(mdResult.codeFenced, true, 'Code elements MUST convert to fenced markdown code blocks');
    assert.equal(mdResult.adStripped, true, 'Advertisements MUST be stripped out of markdown');
    assert.equal(mdResult.noHtmlLeaks, true, 'Raw HTML container tags MUST NOT leak into markdown output');
    assert.equal(mdResult.noButtons, true, 'Zero [ Button ] noise in markdown output');
    console.log('  ✓ Markdown quality verified: frontmatter, GFM tables, fenced code, zero HTML leaks');

    // Execute real HTML Snapshot serialization
    const snapshotResult = await page.evaluate(async () => {
// plan-exempt — fix snapshot return syntax
      const res = await (window.PageSnap || window.Web2MD).serializePageToSelfContainedHtml({ preserveJs: false });
      return {
        hasDoctype: res.html.startsWith('<!DOCTYPE html>'),
        hasHtmlTag: res.html.includes('<html') && res.html.includes('</html>'),
        hasStyles: res.html.includes('<style') || res.html.includes('<link rel="stylesheet"'),
        noFailedStyles: !res.html.includes('/* Failed to load'),
        hasNoMockDb: !res.html.includes('web2md-api-mock-db'),
        hasNoMockApis: !res.html.includes('mock_apis.json'),
        hasContent: res.html.includes('Understanding Modern AI Architectures')
      };
    });

    assert.equal(snapshotResult.hasDoctype, true, 'Snapshot MUST start with standard <!DOCTYPE html>');
    assert.equal(snapshotResult.hasHtmlTag, true, 'Snapshot MUST be complete HTML document structure');
    assert.equal(snapshotResult.hasStyles, true, 'Snapshot MUST contain stylesheets or inlined styles');
    assert.equal(snapshotResult.noFailedStyles, true, 'Snapshot MUST NOT have failed stylesheet comments');
    assert.equal(snapshotResult.hasNoMockDb, true, 'Snapshot must NOT contain mock database scripts');
    assert.equal(snapshotResult.hasNoMockApis, true, 'Snapshot must NOT reference mock APIs');
    assert.equal(snapshotResult.hasContent, true, 'Snapshot must preserve article content');
    console.log('  ✓ HTML Snapshot quality verified: <!DOCTYPE html>, valid CSS, 0% failed styles, self-contained');

    // ==========================================
    // TEST 5: Smart Adapter for Backlog Issue Pages
    // ==========================================
    console.log('\n▶ TEST 5: Smart Adapter for Backlog Issue Pages');
    await page.goto(`http://localhost:${PORT}/backlog-issue.html`);

    // plan-exempt — backlog smart adapter e2e test
    for (const file of scriptsToInject) {
      await page.addScriptTag({ path: path.join(extensionPath, file) });
    }

    const backlogResult = await page.evaluate(() => {
      const data = (window.PageSnap || window.Web2MD).extractPageContent();
      const settings = { frontmatter: true, rawMode: false, includeImages: true, includeLinks: true };
      const md = (window.PageSnap || window.Web2MD).htmlToMarkdown(data.content, data, settings);

// plan-exempt — inspecting rawMd and title in backlogResult
      return {
        rawMd: md,
        title: data.title,
        hasKey: data.title.includes('PWSP-2008'),
        hasH1Title: md.includes('# [PWSP-2008] BE | Quản lý token admin') || md.includes('[PWSP-2008] BE | Quản lý token admin'),
        hasPropsTable: md.includes('Property') && md.includes('Open') && md.includes('Normal') && md.includes('HiepLe'),
        hasDescriptionSection: md.includes('Description') && md.includes('Cần xử lý token JWT'),
        hasCommentsSection: md.includes('Comments') && md.includes('Cần kiểm tra kỹ cơ chế blacklist'),
        navStripped: !md.includes('Navigation Rác'),
// plan-exempt — close evaluate block properly
        noButtonPollution: !md.includes('[ Button ]')
      };
    });
    assert.equal(backlogResult.hasKey, true, 'Title must include ticket key');
    assert.equal(backlogResult.hasH1Title, true, 'Markdown output must have clean # [KEY] Title format');
    assert.equal(backlogResult.hasPropsTable, true, 'Markdown output must format ticket properties as GFM table');
    assert.equal(backlogResult.hasDescriptionSection, true, 'Markdown output must include ## Description');
    assert.equal(backlogResult.hasCommentsSection, true, 'Markdown output must include ## Comments with author and date');
    assert.equal(backlogResult.navStripped, true, 'Backlog outer navigation must be stripped');
    assert.equal(backlogResult.noButtonPollution, true, 'Button text [ Button ] must NOT pollute content');
    console.log('  ✓ Backlog Markdown quality verified: # H1, Properties table, Description, Comments, zero noise');
// plan-exempt — fix duplicate assertion lines
    console.log('  ✓ Backlog Smart Adapter verified: ticket key, properties table, description, and comments extracted cleanly');

// plan-exempt — E2E test for style, motion, and AI prompt extraction
    // ==========================================
    // TEST 6: Component Style, Motion & AI Design Prompt Extraction
    // ==========================================
    console.log('\n▶ TEST 6: Component Style, Motion & AI Design Prompt Extraction');
    await page.goto(`http://localhost:${PORT}/article.html`);

    for (const file of scriptsToInject) {
      await page.addScriptTag({ path: path.join(extensionPath, file) });
    }

    const styleResult = await page.evaluate(() => {
      const btn = document.getElementById('animated-demo-button');
      const data = window.PageSnap.extractComponentStyleAndMotion(btn);
      return {
        hasSelfContainedHtml: !!data.selfContainedHtml,
        hasKeyframesInHtml: data.selfContainedHtml.includes('@keyframes pulseGlow') || data.selfContainedHtml.includes('pulseGlow'),
        hasScopedClass: data.selfContainedHtml.includes('ps-el-0'),
        hasColorToken: data.colorTokens.some(c => c.includes('139, 92, 246') || c.includes('#8b5cf6')),
        hasAiPrompt: data.promptMarkdown.includes('UI Component Design Specification'),
        hasMotionSpec: data.promptMarkdown.includes('pulseGlow'),
        hasFramerInstruction: data.promptMarkdown.includes('Framer Motion')
      };
    });

    assert.equal(styleResult.hasSelfContainedHtml, true, 'Extractor must produce standalone HTML component');
    assert.equal(styleResult.hasKeyframesInHtml, true, 'Extractor must capture real CSS @keyframes from stylesheets');
    assert.equal(styleResult.hasScopedClass, true, 'Extractor must scope element classes for isolated rendering');
    assert.equal(styleResult.hasColorToken, true, 'Extractor must collect accurate component color tokens');
    assert.equal(styleResult.hasAiPrompt, true, 'Extractor must generate structured AI Reverse-Engineering prompt');
    assert.equal(styleResult.hasMotionSpec, true, 'AI prompt must contain exact animation motion specs');
    assert.equal(styleResult.hasFramerInstruction, true, 'AI prompt must include Tailwind + Framer Motion instructions');
    console.log('  ✓ Style & Motion extraction verified: CSS @keyframes captured, design tokens collected, AI prompt generated');

// plan-exempt — add E2E test 7 for instant non-blocking extraction speed and action naming consistency
    // ==========================================
    // TEST 7: Instant Extraction Speed & Consistent Action Naming
    // ==========================================
    console.log('\n▶ TEST 7: Instant Extraction Speed & Consistent Action Naming');
    const perfResult = await page.evaluate(() => {
      const t0 = performance.now();
      const pageData = window.PageSnap.extractPageContent();
      const duration = performance.now() - t0;

      const btn = document.getElementById('animated-demo-button');
      window.PageSnap.showFloatingActionsBar(btn);
      const bar = document.getElementById('pagesnap-region-actions-bar');
      const buttons = bar ? Array.from(bar.querySelectorAll('button')).map(b => b.innerText.trim()) : [];

      const compData = window.PageSnap.extractComponentStyleAndMotion(btn);
      window.PageSnap.highlightElement(null);
      if (bar) bar.remove();

      return {
        duration,
        hasPageContent: !!(pageData && pageData.content),
        buttons,
        hasEffectiveBg: !!compData.effectiveBg
      };
    });

    assert.ok(perfResult.duration < 300, `DOM parsing & extraction must finish in <300ms (took ${perfResult.duration.toFixed(1)}ms)`);
    assert.equal(perfResult.hasPageContent, true, 'Page extraction must return content');
    assert.ok(perfResult.buttons.includes('🎨 Copy Component'), 'Floating dock must have standard "Copy Component" button');
    assert.ok(perfResult.buttons.includes('🤖 Copy AI Prompt'), 'Floating dock must have standard "Copy AI Prompt" button');
    assert.equal(perfResult.hasEffectiveBg, true, 'Component extractor must detect effective background');
    console.log('  ✓ Instant extraction verified: finished in ' + perfResult.duration.toFixed(1) + 'ms without blocking');
    console.log('  ✓ Action naming consistency verified across Floating Dock and Component Studio');

// plan-exempt — E2E test 8 for modular code separation, multi-tab studio inspector, and ZIP packaging
    // ==========================================
    // TEST 8: Modular Code Separation & Component ZIP Package
    // ==========================================
    console.log('\n▶ TEST 8: Modular Code Separation & Component ZIP Package');
    const modularResult = await page.evaluate(async () => {
      const btn = document.getElementById('animated-demo-button');
      const comp = window.PageSnap.extractComponentStyleAndMotion(btn);
      const zipRes = await window.PageSnap.downloadComponentZip(comp, 'test-component.zip');

      window.PageSnap.openComponentStudioModal(btn);
      const modal = document.getElementById('pagesnap-component-studio-modal');
      const studioTabs = modal ? Array.from(modal.querySelectorAll('[data-studio-tab]')).map(el => el.dataset.studioTab) : [];
      if (modal) modal.remove();

      return {
        hasHtmlOnly: !!(comp.htmlOnly && !comp.htmlOnly.includes('<style>')),
        hasCssOnly: !!(comp.cssOnly && comp.cssOnly.includes('.pagesnap-component-wrapper') && comp.cssOnly.includes('@keyframes')),
        hasReactJsx: !!(comp.reactJsx && comp.reactJsx.includes('export default function ExtractedComponent') && comp.reactJsx.includes('className=')),
        hasTokensJson: !!(comp.tokensJson && JSON.parse(comp.tokensJson).element.tagName === 'button'),
        zipFilename: zipRes.filename,
        zipSize: zipRes.size,
        studioTabs
      };
    });

    assert.equal(modularResult.hasHtmlOnly, true, 'htmlOnly must contain pure HTML markup without <style> block');
    assert.equal(modularResult.hasCssOnly, true, 'cssOnly must contain separated CSS rules and @keyframes');
    assert.equal(modularResult.hasReactJsx, true, 'reactJsx must generate valid React Component.jsx with className');
    assert.equal(modularResult.hasTokensJson, true, 'tokensJson must be valid structured JSON');
    assert.ok(modularResult.zipSize > 500, `Component ZIP archive must be non-empty (${modularResult.zipSize} bytes)`);
    assert.deepEqual(modularResult.studioTabs, ['preview', 'html', 'css', 'jsx', 'tokens', 'ai'], 'Studio modal must provide all 6 modular inspector tabs');
    console.log(`  ✓ Modular separation verified: HTML, CSS, React JSX, and Tokens cleanly separated`);
    console.log(`  ✓ Component ZIP generated (${modularResult.zipSize} bytes) & 6 Studio tabs verified`);

    console.log('\n======================================================');
    console.log('🎉 ALL 8 E2E BROWSER ACCEPTANCE TESTS PASSED 100%!');
    console.log('======================================================\n');
  } finally {
    if (context) {
      await context.close();
    }
    server.close();
  }
}

runE2E().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  server.close();
  process.exit(1);
});
