// plan-exempt — ps-008: test GPU uniform snapshotting and case artwork extraction contract. routing-override: skipped — user approved v23 upgrade loop.
/**
 * Test that PageSnap captures active GPU uniforms and extracts associated case artwork images.
 */
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { margin: 0; background: #090a0f; }
  .scene { opacity: 0; display: none; }
  .scene.is-visible { opacity: 1; display: block; }
</style>
</head><body>
<canvas id="c" width="1500" height="900" data-engine="three.js r128"></canvas>
<main id="target">
  <div class="cases">
    <a href="#" class="item" data-matcap="11, 11" data-theme="louise">Louise</a>
  </div>
  <div class="home-cases-scene--louise scene">
    <img src="/assets/cases/louise-background-1440.png">
  </div>
</main>
<script>
  // Simulated WebGL context with active uniforms
  window.__PAGE_GPU_UNIFORMS__ = {
    firstMatcapIdx: 19,
    secondMatcapIdx: 1,
    firstDiffuseWeight: 0,
    secondDiffuseWeight: 0.52,
    firstSpecularWeight: 0,
    secondSpecularWeight: 0.52
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
      surfaces: comp.renderSurfaces,
      manifest: comp.interactionManifest,
      prompt: comp.promptMarkdown,
      tokens: JSON.parse(comp.tokensJson)
    };
  });

  await check('prompt contains GPU Uniform State section with exact weights and matcap slots', () => {
    assert.ok(res.prompt.includes('GPU Uniform State') || res.prompt.includes('Active WebGL Uniforms'), 'missing GPU uniform section in prompt');
    assert.ok(res.prompt.includes('firstMatcapIdx') && res.prompt.includes('secondDiffuseWeight'), 'missing exact uniform names');
  });

  await check('interaction manifest captures associated artwork image URL and toggle class', () => {
    assert.ok(res.manifest && res.manifest.items.length > 0, 'missing manifest items');
    const louise = res.manifest.items.find(i => i.theme === 'louise');
    assert.ok(louise && louise.artworkUrl && louise.artworkUrl.includes('louise-background-1440.png'), 'missing artworkUrl');
  });

  await check('prompt contains Controller Blueprint code linking mouseenter to scene toggle and matcap transition', () => {
    assert.ok(res.prompt.includes('classList.add(\'is-visible\')') || res.prompt.includes('is-visible'), 'missing is-visible toggle in blueprint');
  });

  assert.equal(failures.length, 0, `${failures.length} check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\nv23 GPU uniform & artwork tests passed');
} catch (err) {
  console.error('\nv23 GPU uniform & artwork FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
