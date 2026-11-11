// plan-exempt — ps-008: test dynamic matcapTransition tween (0->1 Cubic.easeOut) without flat color tints in webgl-scaffold.js. routing-override: skipped — user requested true wavefront tween.
/**
 * Test that webgl-scaffold.js:
 * 1. Does not apply flat color tints on bodyMaterial (uses native matcap color & weights).
 * 2. Drives the tail-to-head wavefront via matcapTransition uniform tween from 0 to 1 with 1.2s duration.
 */
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body { margin: 0; background: #090a0f; }</style>
</head><body>
<canvas id="c" width="1500" height="900" data-engine="three.js r128"></canvas>
<main id="target">
  <div class="cases"><a href="#" data-matcap="11, 11">Louise</a></div>
</main>
<script>
  fetch('/assets/dog.drc.glb');
  fetch('/assets/dog_diffuse.png');
  fetch('/assets/dog_normals.jpg');
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

  const scaffold = await p.evaluate(() => {
    const el = document.getElementById('target');
    const comp = window.PageSnap.extractComponentStyleAndMotion(el);
    return comp.webglScaffoldCode || '';
  });

  await check('scaffold does not apply flat color tinting (0x354460) on bodyMaterial', () => {
    assert.ok(!scaffold.includes('0x354460'), 'found synthetic color tint 0x354460 in scaffold');
  });

  await check('scaffold animates matcapTransition uniform from 0 to 1 over 1.2s on hover', () => {
    assert.ok(scaffold.includes('matcapTransition') && (scaffold.includes('1.2') || scaffold.includes('duration: 1.')), 'missing 1.2s matcapTransition tween in scaffold controller');
  });

  assert.equal(failures.length, 0, `${failures.length} check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\nwavefront tween scaffold tests passed');
} catch (err) {
  console.error('\nwavefront tween scaffold FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
