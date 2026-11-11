// plan-exempt — ps-007 general grounding: test that download ZIP includes preview.png and prompt instructions reference it. routing-override: skipped — user approved committing and adding general grounding features.
/**
 * Test that component package includes visual grounding preview.png and detailed 3D asset classification.
 */
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0}</style></head><body>
<main id="target" style="position:relative;margin:50px auto;width:600px;height:300px;background:#111">
  <canvas id="c" width="600" height="300" style="display:block"></canvas>
  <h1 style="color:#fff">3D Hero</h1>
</main>
<script>
  fetch('/assets/model.glb');
  fetch('/assets/matcap-crystal.png');
  fetch('/assets/surface_normals.jpg');
</script>
</body></html>`;

const failures = [];
async function check(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); } catch (err) { failures.push(`${name}: ${err.message.split('\n')[0]}`); console.log(`  ✗ ${name}`); }
}

const browser = await launch({ headless: true });
try {
  const p = await browser.newPage({ viewport: { width: 1200, height: 800 } });
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
      preview: comp.previewDataUrl || null
    };
  });

  await check('prompt contains Visual Grounding instructions referencing preview.png', () => {
    assert.ok(res.prompt.includes('preview.png'), 'missing preview.png mention in prompt');
    assert.ok(/visual (reference|grounding)/i.test(res.prompt), 'missing visual grounding instruction');
  });

  await check('3D assets are semantically classified as model, normal-map, or matcap', () => {
    const assets = res.surfaces.assets;
    assert.ok(assets.some(a => a.kind === 'model' && a.url.includes('model.glb')), 'model classified');
    assert.ok(assets.some(a => a.kind === 'normal-map' && a.url.includes('surface_normals.jpg')), 'normal-map classified');
    assert.ok(assets.some(a => a.kind === 'matcap' && a.url.includes('matcap-crystal.png')), 'matcap classified');
  });

  assert.equal(failures.length, 0, `${failures.length} check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\nvisual grounding checks passed');
} catch (err) {
  console.error('\nvisual grounding FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
