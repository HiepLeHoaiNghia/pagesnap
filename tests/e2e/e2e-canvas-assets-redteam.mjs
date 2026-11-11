// plan-exempt — ps-014: Red-team test suite for Canvas 3D assets download, video capture, and preloader resilience.
// routing-override: skipped — test-first red team verification before code changes.
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const FIXTURE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Canvas 3D & Asset Fixture</title>
  <style>
    body { margin: 0; background: #0b0f19; overflow: hidden; }
    #canvas { width: 800px; height: 600px; display: block; margin: 40px auto; background: #000; }
  </style>
</head>
<body>
  <canvas id="canvas" width="800" height="600" data-engine="three.js r158"></canvas>
  <script>
    // Animate canvas to verify 60fps video capture
    const c = document.getElementById('canvas');
    const ctx = c.getContext('2d');
    let x = 0;
    function draw() {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(400 + Math.sin(x) * 200, 300 + Math.cos(x) * 100, 40, 0, Math.PI * 2);
      ctx.fill();
      x += 0.05;
      requestAnimationFrame(draw);
    }
    draw();

    // Mock resource timing entries for textures and video
    const mockResources = [
      { name: 'https://lusion.dev/assets/textures/home/matcap.exr', initiatorType: 'fetch' },
      { name: 'https://lusion.dev/assets/textures/reel/desktop.mp4', initiatorType: 'video' },
      { name: 'https://lusion.dev/assets/textures/tunnels/white_matcap.jpg', initiatorType: 'img' }
    ];
    window.performance.getEntriesByType = (type) => {
      if (type === 'resource') return mockResources;
      return [];
    };
  </script>
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
  console.log("🔴 RUNNING PRE-FIX RED TEAM SUITE FOR CANVAS 3D/ASSETS");
  console.log("========================================================\n");

  // ── TC-1: Dock displays 3D Assets button when textures/models exist on canvas ──
  await redCheck("TC-1: Dock displays dedicated 🎨 Assets button on 3D canvas regions", async () => {
    await page.evaluate(() => {
      const el = document.getElementById("canvas");
      window.PageSnap.showFloatingActionsBar(el);
    });
    await page.waitForTimeout(300);

    const assetBtnFound = await page.evaluate(() => {
      const bar = document.getElementById("pagesnap-region-actions-bar");
      const btn = bar ? bar.querySelector('[data-action="download-assets"]') : null;
      return !!btn && btn.offsetWidth > 0;
    });

    assert.ok(assetBtnFound, "Dock should display dedicated '🎨 Assets' button when canvas has textures/models!");
  });

  // ── TC-2: Download Canvas Assets Package ──
  await redCheck("TC-2: PageSnap.downloadCanvasAssets packages textures and video into downloadable ZIP", async () => {
    const downloadSuccess = await page.evaluate(async () => {
      if (typeof window.PageSnap.downloadCanvasAssets !== 'function') return false;
      const canvas = document.getElementById("canvas");
      const surfaces = window.PageSnap.renderSurfaces.detect(canvas);
      const pkg = await window.PageSnap.downloadCanvasAssets(surfaces.assets);
      return pkg && pkg.zipSize > 0;
    });

    assert.ok(downloadSuccess, "PageSnap.downloadCanvasAssets() is not implemented or failed to package assets!");
  });

  // ── TC-3: Canvas Video Screencast (captureStream 60fps) ──
  await redCheck("TC-3: PageSnap.recordCanvasVideo records 60fps WebM video from canvas", async () => {
    const videoRecorded = await page.evaluate(async () => {
      if (typeof window.PageSnap.recordCanvasVideo !== 'function') return false;
      const canvas = document.getElementById("canvas");
      const blob = await window.PageSnap.recordCanvasVideo(canvas, 1000); // record 1 second
      return blob && blob.size > 1000;
    });

    assert.ok(videoRecorded, "PageSnap.recordCanvasVideo() is not implemented or failed to record video!");
  });

  // ── TC-4: Dock displays 🎬 Record Video button on canvas ──
  await redCheck("TC-4: Dock displays '🎬 Record Video' action on animated canvas regions", async () => {
    await page.evaluate(() => {
      const el = document.getElementById("canvas");
      window.PageSnap.showFloatingActionsBar(el);
    });
    await page.waitForTimeout(200);

    const videoBtnFound = await page.evaluate(() => {
      const bar = document.getElementById("pagesnap-region-actions-bar");
      const btn = bar ? bar.querySelector('[data-action="record-canvas-video"]') : null;
      return !!btn && btn.offsetWidth > 0;
    });

    assert.ok(videoBtnFound, "Dock should display '🎬 Record Video' button on animated canvas!");
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
