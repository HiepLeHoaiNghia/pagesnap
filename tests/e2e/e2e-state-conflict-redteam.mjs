// plan-exempt — ps-013: Red-team test suite for context-aware dock states, recording mode isolation, and error resilience.
// routing-override: skipped — test-first red team verification before code changes.
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const FIXTURE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Red Team Test Fixture</title>
  <style>
    body { margin: 0; padding: 40px; font-family: sans-serif; background: #0b0f19; color: #fff; }
    .normal-card { width: 400px; padding: 20px; background: #1e293b; border-radius: 8px; }
    .canvas-card { position: relative; width: 600px; height: 400px; background: #000; }
    canvas { width: 100%; height: 100%; display: block; }
    @keyframes pulse { 0% { opacity: 0.2; } 100% { opacity: 1; } }
    .animated-box { animation: pulse 0.5s infinite alternate; }
  </style>
</head>
<body>
  <div id="normal-target" class="normal-card">
    <h2>Standard Card</h2>
    <p>Standard text and buttons for extraction.</p>
  </div>

  <div id="canvas-target" class="canvas-card">
    <canvas id="webgl-canvas" width="600" height="400" data-engine="three.js r128"></canvas>
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.setContent(FIXTURE_HTML);
  await injectBundle(page);

  console.log("\n========================================================");
  console.log("🔴 RUNNING PRE-FIX RED TEAM SUITE (EXPECTING FAILURES)");
  console.log("========================================================\n");

  // ── TC-1: Dock Button Ceiling (G0-2b <= 6 non-nav buttons) ──
  await redCheck("TC-1: Dock shows at most 6 non-navigation buttons on standard component", async () => {
    await page.evaluate(() => {
      const el = document.getElementById("normal-target");
      window.PageSnap.showFloatingActionsBar(el);
    });
    await page.waitForTimeout(300);

    const nonNavCount = await page.evaluate(() => {
      const bar = document.getElementById("pagesnap-region-actions-bar");
      if (!bar) return -1;
      const nav = ['Expand', 'Shrink', 'Pick', 'Select parent', '✕'];
      const buttons = Array.from(bar.querySelectorAll("button")).filter(b => b.offsetWidth > 0);
      const nonNav = buttons.filter(b => !nav.some(n => b.innerText.includes(n)));
      return nonNav.length;
    });

    assert.ok(nonNavCount <= 6, `Expected <= 6 non-nav buttons, but got ${nonNavCount}`);
  });

  // ── TC-2: Dock Total Width Budget (< 1150px on standard laptop) ──
  await redCheck("TC-2: Dock width is bounded (< 1150px) to prevent multi-line wrapping on 1280px displays", async () => {
    const dockWidth = await page.evaluate(() => {
      const bar = document.getElementById("pagesnap-region-actions-bar");
      return bar ? bar.getBoundingClientRect().width : 9999;
    });
    assert.ok(dockWidth < 1150, `Dock width ${dockWidth.toFixed(1)}px exceeds 1150px budget`);
  });

  // ── TC-3: Recording Mode Conflict Guard ──
  await redCheck("TC-3: When recording is active, export buttons are locked/disabled to prevent corrupted state", async () => {
    await page.evaluate(() => {
      window.PageSnap.motionSniffer.startInteractiveRecording();
      const el = document.getElementById("normal-target");
      window.PageSnap.showFloatingActionsBar(el);
    });
    await page.waitForTimeout(300);

    const conflictState = await page.evaluate(() => {
      const bar = document.getElementById("pagesnap-region-actions-bar");
      const exportBtns = Array.from(bar.querySelectorAll('[data-action^="copy-"], [data-action="download-zip"], [data-action="studio"]'));
      const activeRecordBtn = bar.querySelector('[data-action="record-motion"]');
      const allLocked = exportBtns.every(b => b.disabled || b.classList.contains("is-disabled") || b.style.opacity === "0.4");
      return {
        hasRecordBtn: !!activeRecordBtn,
        exportCount: exportBtns.length,
        allLocked
      };
    });

    // Cleanup recording
    await page.evaluate(() => {
      if (window.PageSnap.motionSniffer && window.PageSnap.motionSniffer.stopInteractiveRecording) {
        window.PageSnap.motionSniffer.stopInteractiveRecording();
      }
    });

    assert.ok(conflictState.allLocked, `Export buttons are not locked during recording! Found ${conflictState.exportCount} active conflicting buttons`);
  });

  // ── TC-4: Canvas / WebGL Surface Adaptation ──
  await redCheck("TC-4: Pure canvas/WebGL regions disable or hide useless static/markdown actions", async () => {
    await page.evaluate(() => {
      const el = document.getElementById("canvas-target");
      window.PageSnap.showFloatingActionsBar(el);
    });
    await page.waitForTimeout(300);

    const canvasAdaptation = await page.evaluate(() => {
      const bar = document.getElementById("pagesnap-region-actions-bar");
      const copyStatic = bar ? bar.querySelector('[data-action="copy-static"]') : null;
      const copyMd = bar ? bar.querySelector('[data-action="copy-md"]') : null;
      const copyAi = bar ? bar.querySelector('[data-action="copy-ai"]') : null;
      
      const staticBlocked = !copyStatic || copyStatic.disabled || copyStatic.style.display === 'none';
      const mdBlocked = !copyMd || copyMd.disabled || copyMd.style.display === 'none';
      const aiAvailable = !!copyAi && copyAi.offsetWidth > 0;
      
      return { staticBlocked, mdBlocked, aiAvailable };
    });

    assert.ok(canvasAdaptation.staticBlocked && canvasAdaptation.mdBlocked, "Static/Markdown export buttons should be disabled or hidden on pure Canvas surfaces!");
  });

  // ── TC-5: Packaging State Feedback on Dock ──
  await redCheck("TC-5: Clicking Download ZIP on dock shows packaging state and locks button", async () => {
    await page.evaluate(() => {
      const el = document.getElementById("normal-target");
      window.PageSnap.showFloatingActionsBar(el);
    });
    await page.waitForTimeout(300);

    const packagingState = await page.evaluate(async () => {
      const bar = document.getElementById("pagesnap-region-actions-bar");
      const zipBtn = bar ? bar.querySelector('[data-action="download-zip"]') : null;
      if (!zipBtn) return { found: false };

      // Trigger click and immediately observe button text before settle
      zipBtn.click();
      const textDuringClick = zipBtn.innerText;
      const isDisabled = zipBtn.disabled;
      return { found: true, textDuringClick, isDisabled };
    });

    assert.ok(packagingState.found, "Download ZIP button not found on dock");
    assert.ok(packagingState.textDuringClick.includes("Packaging") || packagingState.isDisabled, `Download ZIP button did not show packaging state (got "${packagingState.textDuringClick}")`);
  });

  // ── TC-6: Clipboard Failure Graceful Handling ──
  await redCheck("TC-6: Clipboard write failure shows warning toast instead of unhandled rejection", async () => {
    await page.evaluate(() => {
      const el = document.getElementById("normal-target");
      window.PageSnap.showFloatingActionsBar(el);
      // Simulate clipboard rejection
      window.Web2MD.copyTextToClipboard = () => Promise.reject(new Error("Permission denied"));
    });
    await page.waitForTimeout(300);

    const errorToastHandled = await page.evaluate(async () => {
      const bar = document.getElementById("pagesnap-region-actions-bar");
      const copyBtn = bar ? bar.querySelector('[data-action="copy-static"]') : null;
      if (!copyBtn) return false;
      
      try {
        await copyBtn.click();
        await new Promise(r => setTimeout(r, 400));
        const toast = document.getElementById("pagesnap-toast");
        return toast ? toast.innerText : null;
      } catch (e) {
        return "unhandled-throw:" + e.message;
      }
    });

    assert.ok(typeof errorToastHandled === 'string' && !errorToastHandled.startsWith("unhandled-throw"), "Copy failure resulted in unhandled throw instead of handled error toast");
    assert.ok(errorToastHandled && (errorToastHandled.includes("failed") || errorToastHandled.includes("denied") || errorToastHandled.includes("⚠️")), `Toast did not indicate copy failure (got: "${errorToastHandled}")`);
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
