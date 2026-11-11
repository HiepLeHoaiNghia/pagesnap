// plan-exempt — ps-008: test on-screen walkthrough guide during interactive recording. routing-override: skipped — user requested on-screen interactive guide.
/**
 * Test that clicking "🔴 Record" displays a floating on-screen Walkthrough Guide pill
 * that shows live progress: Step 1 (Scroll page), Step 2 (Hover interactive items), Step 3 (Stop & Download).
 */
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body { margin: 0; height: 2500px; font: 16px sans-serif; }</style>
</head><body>
<main id="target" style="padding: 40px;">
  <h1>Test Page for Walkthrough</h1>
  <a href="#" id="link-1">Hover Item 1</a>
</main>
</body></html>`;

const failures = [];
async function check(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); } catch (err) { failures.push(`${name}: ${err.message.split('\n')[0]}`); console.log(`  ✗ ${name}`); }
}

const browser = await launch({ headless: true });
try {
  const p = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await p.route('http://ps.test/**', (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/') return route.fulfill({ contentType: 'text/html', body: PAGE });
    return route.fulfill({ contentType: 'application/octet-stream', body: Buffer.from([1, 2, 3]) });
  });

  await p.goto('http://ps.test/');
  await p.waitForTimeout(600);
  await injectBundle(p);

  // Open floating dock bar on target
  await p.evaluate(() => {
    window.PageSnap.showFloatingActionsBar(document.getElementById('target'));
  });

  // 1. Click Record button
  await p.evaluate(() => {
    const btn = document.querySelector('#pagesnap-region-actions-bar [data-action="record-motion"]');
    if (btn) btn.click();
  });
  await p.waitForTimeout(100);

  // Check that the on-screen walkthrough guide pill is visible
  const guideVisible = await p.evaluate(() => {
    const g = document.getElementById('pagesnap-walkthrough-guide');
    return g ? {
      visible: getComputedStyle(g).display !== 'none',
      text: g.innerText
    } : null;
  });

  await check('on-screen walkthrough guide pill appears when recording starts', () => {
    assert.ok(guideVisible !== null, 'guide element not found');
    assert.ok(guideVisible.visible === true, 'guide is not visible');
    assert.ok(guideVisible.text.includes('Step 1') || guideVisible.text.includes('Scroll'), 'must mention Step 1 or Scroll');
  });

  // 2. Simulate scrolling
  await p.evaluate(() => window.scrollTo(0, 1000));
  await p.waitForTimeout(150);

  const guideAfterScroll = await p.evaluate(() => {
    const g = document.getElementById('pagesnap-walkthrough-guide');
    return g ? g.innerText : '';
  });

  await check('guide updates live to Step 2 (Hover items) after user scrolls', () => {
    assert.ok(guideAfterScroll.includes('Step 2') || guideAfterScroll.includes('Hover'), `text: "${guideAfterScroll}"`);
  });

  // 3. Stop recording
  await p.evaluate(() => {
    const btn = document.querySelector('#pagesnap-region-actions-bar [data-action="record-motion"]');
    if (btn) btn.click();
  });
  await p.waitForTimeout(100);

  const guideAfterStop = await p.evaluate(() => document.getElementById('pagesnap-walkthrough-guide'));
  await check('guide is removed when recording stops', () => {
    assert.equal(guideAfterStop, null);
  });

  assert.equal(failures.length, 0, `${failures.length} check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\non-screen walkthrough guide tests passed');
} catch (err) {
  console.error('\non-screen walkthrough guide FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
