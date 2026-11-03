// plan-exempt — ps-008: test cross-layer data-matcap hover binding and real background capture. routing-override: skipped — user requested cross-layer hover and color shift loop.
/**
 * Test that PageSnap captures data-matcap DOM elements and outputs a dedicated Cross-Layer Hover Bridge in AI-PROMPT.md.
 */
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { margin: 0; background: #090a0f; }
  .item { display: block; color: #fff; padding: 10px; }
</style>
</head><body>
<canvas id="c" width="1500" height="900" data-engine="three.js r128"></canvas>
<main id="target">
  <div class="cases">
    <a href="#" class="item" data-matcap="11, 11" data-theme="louise">This Was Louise's Phone</a>
    <a href="#" class="item" data-matcap="4, 4" data-theme="tomorrowland">Tomorrowland</a>
  </div>
</main>
<script>
  fetch('/assets/model.glb');
  fetch('/assets/matcap-combined.jpg');
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
      surfaces: comp.renderSurfaces,
      prompt: comp.promptMarkdown,
      tokens: JSON.parse(comp.tokensJson)
    };
  });

  await check('prompt contains dedicated Section "Cross-Layer 3D Hover Binding" with data-matcap mappings', () => {
    assert.ok(res.prompt.includes('Cross-Layer 3D Hover Binding'), 'missing dedicated Section header in prompt');
    assert.ok(res.prompt.includes('data-matcap="11, 11"') || res.prompt.includes('index 11'), 'missing data-matcap 11 mapping');
  });

  await check('prompt explicitly instructs on dark midnight navy body tint (0x121726 or similar)', () => {
    assert.ok(/0x1[0-9a-f]{5}|midnight|deep navy/i.test(res.prompt), 'missing specific dark midnight navy tint instruction');
  });

  assert.equal(failures.length, 0, `${failures.length} check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\ncross-layer hover bridge tests passed');
} catch (err) {
  console.error('\ncross-layer hover bridge FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
