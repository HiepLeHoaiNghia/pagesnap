// plan-exempt — ps-008: test interaction manifest and 3D submesh mapper contract. routing-override: skipped — user requested SOLID architecture update.
/**
 * Test that PageSnap decomposes extraction into focused SOLID modules:
 * - interaction-manifest.js: captures cross-layer state transitions across hoverable elements
 * - mesh-mapper.js: maps 3D submeshes (eyes, body, leaves) to texture roles preventing material overwrites
 */
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { margin: 0; background: #090a0f; }
  .item { display: block; color: #fff; padding: 10px; }
  .scene { opacity: 0; display: none; }
  .scene.is-visible { opacity: 1; display: block; }
</style>
</head><body>
<canvas id="c" width="1500" height="900" data-engine="three.js r128"></canvas>
<main id="target">
  <div class="cases">
    <a href="#" class="item" data-matcap="11, 11" data-theme="louise">Louise</a>
    <a href="#" class="item" data-matcap="4, 4" data-theme="tomorrowland">Tomorrowland</a>
  </div>
  <div id="scene-louise" class="scene">
    <img src="/assets/cases/louise-bg.png">
    <p>Louise description text</p>
  </div>
</main>
<script>
  fetch('/assets/dog.drc.glb');
  fetch('/assets/dog_diffuse.dds');
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

  const res = await p.evaluate(() => {
    const el = document.getElementById('target');
    const comp = window.PageSnap.extractComponentStyleAndMotion(el);
    return {
      manifest: comp.interactionManifest || null,
      meshMapping: comp.meshMapping || null,
      prompt: comp.promptMarkdown
    };
  });

  await check('PageSnap.interactionManifest captures hover state transitions (SRP)', () => {
    assert.ok(res.manifest !== null, 'missing interactionManifest');
    assert.ok(Array.isArray(res.manifest.items) && res.manifest.items.length >= 2, 'manifest must capture items');
    assert.ok(res.manifest.items.some(i => i.theme === 'louise' && i.matcapIndex === 11), 'louise matcap 11 mapped');
  });

  await check('PageSnap.meshMapper generates dedicated 3D submesh material map (SRP)', () => {
    assert.ok(res.meshMapping !== null, 'missing meshMapping');
    assert.ok(Array.isArray(res.meshMapping.submeshes), 'meshMapping must have submeshes array');
    assert.ok(res.meshMapping.submeshes.some(m => m.name === 'eyes' && m.keepDiffuse === true), 'eye mesh keeps diffuse texture');
  });

  await check('AI-PROMPT.md includes structured Interaction Manifest section and Submesh table', () => {
    assert.ok(res.prompt.includes('## 3c. Interaction Manifest'), 'missing Interaction Manifest in prompt');
    assert.ok(res.prompt.includes('## 3d. 3D Submesh & Material Binding'), 'missing 3D Submesh table in prompt');
  });

  assert.equal(failures.length, 0, `${failures.length} check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\nSOLID architecture tests passed');
} catch (err) {
  console.error('\nSOLID architecture FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
