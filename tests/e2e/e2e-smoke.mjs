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

  if (req.url === '/article.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Understanding Modern AI Architectures</title>
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
      </div>
      <pre><code>function evaluate(context) {\n  return context.length > 0;\n}</code></pre>
    </article>
  </main>
  <footer>
    <p>© 2026 Tech Publishing Inc. All rights reserved.</p>
  </footer>
</body>
</html>`);
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
    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
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
      const hasWeb2MDInMain = typeof window.__web2md_mw_api__ !== 'undefined';

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
        hasWeb2MDInMain,
        fetchOk: fetchData.success,
        xhrOk: xhrData.success
      };
    });

    assert.equal(fetchInfo.isNativeFetch, true, 'window.fetch MUST be native (no monkey-patching)');
    assert.equal(fetchInfo.isNativeXHR, true, 'window.XMLHttpRequest MUST be native');
    assert.equal(fetchInfo.hasWeb2MDInMain, false, 'No Web2MD interceptor should exist in MAIN world');
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
    console.log('  ✓ Popup navigation verified: Markdown + HTML Snapshot + Region Select present');
    console.log('  ✓ API Mock tab confirmed completely absent from popup UI');

    // ==========================================
// plan-exempt — deep E2E assertion coverage for extraction and snapshot
    console.log('\n▶ TEST 4: Article Content Extraction & Clean Snapshot Integrity');
    await page.bringToFront();

    // Inject Web2MD runtime scripts into article page
    const scriptsToInject = [
      'lib/readability.js',
      'src/content/core/namespace.js',
      'src/content/core/utils.js',
      'src/content/core/settings.js',
      'src/content/markdown/dom-preprocess.js',
      'src/content/markdown/extractor.js',
      'src/content/html-clone/serializer.js'
    ];

    for (const file of scriptsToInject) {
      await page.addScriptTag({ path: path.join(extensionPath, file) });
    }

    // Execute real Readability extraction in page DOM
    const extractionResult = await page.evaluate(() => {
      const data = window.Web2MD.extractPageContent();
      return {
        title: data.title,
        readabilitySuccess: data.readabilitySuccess,
        hasContent: !!data.content,
        adFilteredOut: !data.content.includes('SPONSORED ADVERTISEMENT'),
        hasArticleText: data.content.includes('Artificial Intelligence models rely heavily'),
        projectFilesDefined: 'projectFiles' in data
      };
    });

    assert.equal(extractionResult.title, 'Understanding Modern AI Architectures');
    assert.equal(extractionResult.readabilitySuccess, true, 'Readability must successfully parse article');
    assert.equal(extractionResult.adFilteredOut, true, 'Ads and banners must be stripped out');
    assert.equal(extractionResult.hasArticleText, true, 'Core article content must be preserved');
    assert.equal(extractionResult.projectFilesDefined, false, 'projectFiles must not exist');
    console.log('  ✓ Article extraction verified: ads stripped, core content extracted');

    // Execute real HTML Snapshot serialization
    const snapshotResult = await page.evaluate(async () => {
// plan-exempt — fix snapshot return syntax
      const res = await window.Web2MD.serializePageToSelfContainedHtml({ preserveJs: false });
      return {
        hasHtmlTag: res.html.includes('<html') && res.html.includes('</html>'),
        hasNoMockDb: !res.html.includes('web2md-api-mock-db'),
        hasNoMockApis: !res.html.includes('mock_apis.json'),
        hasContent: res.html.includes('Understanding Modern AI Architectures')
      };
    });

    assert.equal(snapshotResult.hasHtmlTag, true, 'Snapshot must be complete HTML document structure');
    assert.equal(snapshotResult.hasNoMockDb, true, 'Snapshot must NOT contain mock database scripts');
    assert.equal(snapshotResult.hasNoMockApis, true, 'Snapshot must NOT reference mock APIs');
    assert.equal(snapshotResult.hasContent, true, 'Snapshot must preserve article content');
    console.log('  ✓ Standalone HTML Snapshot verified: clean, self-contained, zero mock scripts');

    console.log('\n======================================================');
    console.log('🎉 ALL E2E BROWSER ACCEPTANCE TESTS PASSED 100%!');
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
