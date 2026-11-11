// plan-exempt — ps-014: Red-team test suite for Full-Page Canvas WebGL App Boundary Guard.
// routing-override: skipped — test-first red team verification before code changes.
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const FIXTURE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Full Page WebGL App Fixture</title>
  <style>
    body { margin: 0; background: #000; overflow: hidden; height: 5000px; }
    #bg-canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: -1; }
    #page-container { position: relative; width: 100%; height: 5000px; }
    #header { height: 100px; background: rgba(255,255,255,0.1); padding: 20px; }
    #hero { height: 800px; background: transparent; padding: 40px; }
  </style>
</head>
<body>
  <canvas id="bg-canvas" width="1400" height="900" data-engine="three.js r158"></canvas>
  <div id="page-container">
    <header id="header">
      <h2>Lusion Brand Logo</h2>
    </header>
    <section id="hero">
      <h1>We create 3D visual storytelling</h1>
    </section>
  </div>
</body>
</html>`;

const failures = [];
async function redCheck(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push({ name, error: err.message.split('\n')[0] });
    console.log(`  ✗ ${name} (EXPECTED RED): ${err.message.split('\n')[0]}`);
  }
}

const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.setContent(FIXTURE_HTML);
  await injectBundle(page);

  console.log("\n========================================================");
  console.log("🔴 RUNNING PRE-FIX RED TEAM SUITE FOR FULL-PAGE CANVAS GUARD");
  console.log("========================================================\n");

  // ── TC-1: Detects Full-Page Canvas App on massive container over WebGL canvas ──
  await redCheck("TC-1: renderSurfaces detects isFullPageCanvasApp on massive container", async () => {
    const isFullPageApp = await page.evaluate(() => {
      const container = document.getElementById("page-container");
      const s = window.PageSnap.renderSurfaces.detect(container);
      return !!s.isFullPageCanvasApp;
    });

    assert.ok(isFullPageApp, "renderSurfaces.detect() should flag isFullPageCanvasApp = true on 5,000px container over canvas!");
  });

  // ── TC-2: Dock displays prominent boundary warning notice ──
  await redCheck("TC-2: Dock displays boundary guidance notice for Full-Page Canvas App", async () => {
    await page.evaluate(() => {
      const container = document.getElementById("page-container");
      window.PageSnap.showFloatingActionsBar(container);
    });
    await page.waitForTimeout(300);

    const noticeText = await page.evaluate(() => {
      const bar = document.getElementById("pagesnap-region-actions-bar");
      const notice = bar ? bar.querySelector('[data-notice="render-surface"]') : null;
      return notice ? notice.innerText : "";
    });

    assert.ok(noticeText.includes("Full-Page 3D") || noticeText.includes("Shrink") || noticeText.includes("unsupported"), `Expected Full-Page Canvas notice on dock, got: "${noticeText}"`);
  });

  // ── TC-3: Locks full-page export actions to prevent distorted 50,000px code output ──
  await redCheck("TC-3: Full-page export actions are locked with guidance on Full-Page Canvas App", async () => {
    const isExportBlocked = await page.evaluate(() => {
      const bar = document.getElementById("pagesnap-region-actions-bar");
      const copyAnimated = bar ? bar.querySelector('[data-action="copy-animated"]') : null;
      const downloadZip = bar ? bar.querySelector('[data-action="download-zip"]') : null;
      return (!copyAnimated || copyAnimated.disabled) && (!downloadZip || downloadZip.disabled);
    });

    assert.ok(isExportBlocked, "Full-page export actions should be disabled on Full-Page Canvas App to prevent broken code output!");
  });

  // ── TC-4: Shrinking to a scoped child element (< 1500px) enables clean component export ──
  await redCheck("TC-4: Shrinking to scoped component (e.g. Header) enables export actions", async () => {
    await page.evaluate(() => {
      const header = document.getElementById("header");
      window.PageSnap.showFloatingActionsBar(header);
    });
    await page.waitForTimeout(300);

    const isHeaderExportable = await page.evaluate(() => {
      const bar = document.getElementById("pagesnap-region-actions-bar");
      const copyAnimated = bar ? bar.querySelector('[data-action="copy-animated"]') : null;
      const downloadZip = bar ? bar.querySelector('[data-action="download-zip"]') : null;
      return !!copyAnimated && !copyAnimated.disabled && !!downloadZip && !downloadZip.disabled;
    });

    assert.ok(isHeaderExportable, "Scoped component (< 1500px) should have active export actions!");
  });

  console.log("\n========================================================");
  console.log(`RED TEAM PROBE COMPLETED: ${failures.length} DEFECTS MECHANICALLY PROVEN.`);
  console.log("========================================================\n");
  for (const f of failures) {
    console.log(`❌ PROVEN FLAW: ${f.name}\n   -> Reason: ${f.error}\n`);
  }

} finally {
  await browser.close();
}
