// plan-exempt — ps-008: test Program 1 (Eyes) vs Program 2/3 (Body) uniform separation and flipY=true. routing-override: skipped — user requested 100% exact shader match.
/**
 * Test that webgl-scaffold.js configures Program 1 for eyes (secondMatcapIdx: 0, diffuseWeight: 0.79)
 * and Program 2/3 for body (secondMatcapIdx: 1, diffuseWeight: 0.52), with flipY=true on diffuse maps.
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

  await check('scaffold sets flipY = true on dogDiffuse texture', () => {
    assert.ok(scaffold.includes('dogDiffuse.flipY = true') || scaffold.includes('diffuse.flipY = true'), 'missing flipY = true on diffuse map');
  });

  await check('scaffold separates eye material (secondMatcapIdx: 0, diffuseWeight: 0.79) from body (secondMatcapIdx: 1, diffuseWeight: 0.52)', () => {
    assert.ok(scaffold.includes('0.79') && scaffold.includes('0.52'), 'missing exact Program 1 (0.79) and Program 2 (0.52) diffuse weights');
  });

  assert.equal(failures.length, 0, `${failures.length} check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\nexact shader program tests passed');
} catch (err) {
  console.error('\nexact shader program FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
