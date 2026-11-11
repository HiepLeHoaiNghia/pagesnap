// plan-exempt — ps-008: test wavefront shader transition and diffuse texture binding in webgl-scaffold.js. routing-override: skipped — user requested wavefront shader upgrade.
/**
 * Test that webgl-scaffold.js includes GLSL sampleTransition wavefront shader logic
 * and separates dogDiffuse and branchesDiffuse texture bindings.
 */
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body { margin: 0; background: #090a0f; }</style>
</head><body>
<canvas id="c" width="1500" height="900" data-engine="three.js r128"></canvas>
<main id="target">
  <div class="cases">
    <a href="#" class="item" data-matcap="11, 11">Louise</a>
  </div>
</main>
<script>
  fetch('/assets/dog.drc.glb');
  fetch('/assets/dog_diffuse.dds');
  fetch('/assets/dog_normals.jpg');
  fetch('/assets/branches_diffuse.dds');
  fetch('/assets/branches_normals.dds');
  fetch('/assets/matcap-combined-resized.jpg');
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

  await check('webgl-scaffold includes sampleTransition wavefront distance shader algorithm', () => {
    assert.ok(scaffold.includes('sampleTransition') || scaffold.includes('wavefront') || scaffold.includes('transitionProgress'), 'missing wavefront transition logic in scaffold');
    assert.ok(scaffold.includes('branches_diffuse') || scaffold.includes('branchesDiffuse'), 'missing branchesDiffuse texture binding');
  });

  await check('webgl-scaffold implements progressive matcapTransition animation across model surface', () => {
    assert.ok(scaffold.includes('matcapTransition') || scaffold.includes('transitionProgress'), 'missing matcapTransition animation controller');
  });

  assert.equal(failures.length, 0, `${failures.length} check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\nwavefront shader scaffold tests passed');
} catch (err) {
  console.error('\nwavefront shader scaffold FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
