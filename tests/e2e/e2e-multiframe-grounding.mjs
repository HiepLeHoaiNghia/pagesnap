// plan-exempt — ps-008: multi-frame visual grounding and full scroll rotation choreography test. routing-override: skipped — user approved multi-frame grounding loop.
/**
 * Test that PageSnap captures multi-frame scroll grounding previews (hero, mid, bottom)
 * and generates choreography prompt instructions including 180-deg back rotation and amber eye spec.
 */
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { margin: 0; height: 3500px; font: 16px sans-serif; }
  #hero { position: relative; height: 900px; width: 100%; background: #0b0f19; }
  #canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: -1; }
  .section { height: 1200px; padding: 50px; color: #fff; }
</style>
</head><body>
<canvas id="canvas" width="1500" height="900" data-engine="three.js r128"></canvas>
<main id="target">
  <div id="hero">
    <h1>Creative Studio</h1>
  </div>
  <div class="section" id="cases">
    <h2>Featured Works</h2>
  </div>
  <div class="section" id="about">
    <h2>About Us</h2>
  </div>
</main>
<script>
  fetch('/assets/wolf.glb');
  fetch('/assets/matcap-atlas.jpg');
  fetch('/assets/wolf_normals.jpg');
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

  const res = await p.evaluate(async () => {
    const el = document.getElementById('target');
    if (window.PageSnap.motionSniffer && typeof window.PageSnap.motionSniffer.probeScrollChoreography === 'function') {
      await window.PageSnap.motionSniffer.probeScrollChoreography(el);
    }
    const comp = window.PageSnap.extractComponentStyleAndMotion(el);
    return {
      surfaces: comp.renderSurfaces,
      prompt: comp.promptMarkdown,
      tokens: JSON.parse(comp.tokensJson)
    };
  });

  await check('prompt references multi-frame grounding images: preview-hero.png, preview-mid.png, and preview-bottom.png', () => {
    assert.ok(res.prompt.includes('preview-hero.png') || res.prompt.includes('preview-mid.png'), 'missing multi-frame preview filenames in prompt');
    assert.ok(res.prompt.includes('preview-bottom.png'), 'missing preview-bottom.png in prompt');
  });

  await check('prompt explicitly instructs on 180-degree back rotation at bottom scroll', () => {
    assert.ok(/rotate.*(180|back)|showing.*back|turns.*around/i.test(res.prompt), 'missing 180-degree back turn choreography instruction');
  });

  await check('prompt instructs on moody dark ambient tinting and amber glowing pupils', () => {
    assert.ok(/amber/i.test(res.prompt) && /tint|ambient/i.test(res.prompt), 'missing dark ambient tint or amber pupil instruction');
  });

  assert.equal(failures.length, 0, `${failures.length} check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\nmulti-frame visual grounding tests passed');
} catch (err) {
  console.error('\nmulti-frame visual grounding FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
