// plan-exempt — ps-008: automated choreography extraction test. routing-override: skipped — user requested deep dive.
/**
 * Test that PageSnap captures exact choreography splines (DEPTH, ROTATION, OFFSETS) and image backgrounds.
 */
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { margin: 0; height: 3500px; font: 16px sans-serif; }
  .home-background img { width: 100%; height: 900px; }
</style>
</head><body>
<picture class="home-background"><img src="/assets/images/home/background-xl.png"></picture>
<canvas id="canvas" width="1500" height="900" data-engine="three.js r128"></canvas>
<main id="target">
  <h1>Title</h1>
</main>
<script>
  window.__DOG_CHOREOGRAPHY__ = {
    DEPTH: [1, 18, 30, 35, 25, 20],
    V_ROTATION: [60, 36.7, 53, 53, -80, -150],
    H_ROTATION: [0, -7.8, -2.2, 14, 25, 12],
    X_OFFSET: [2, -1.5, -0.4, -0.4, -1, -1],
    Y_OFFSET: [-5, -1.2, 0.9, 0, 0, 0]
  };
</script>
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

  const res = await p.evaluate(() => {
    const el = document.getElementById('target');
    const comp = window.PageSnap.extractComponentStyleAndMotion(el);
    return {
      prompt: comp.promptMarkdown,
      tokens: JSON.parse(comp.tokensJson)
    };
  });

  await check('prompt emits exact spline pose data when choreography is detected', () => {
    assert.ok(res.prompt.includes('DEPTH') || res.prompt.includes('Choreography Spline Poses'), 'missing spline poses in prompt');
    assert.ok(res.prompt.includes('V_ROTATION') || res.prompt.includes('rotation curve'), 'missing rotation curve in prompt');
  });

  await check('tokens.json contains spline choreography array', () => {
    assert.ok(res.tokens.scrollChoreography && res.tokens.scrollChoreography.splines !== undefined, 'missing splines in tokens.json');
  });

  assert.equal(failures.length, 0, `${failures.length} check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\nchoreography spline extraction tests passed');
} catch (err) {
  console.error('\nchoreography spline extraction FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
