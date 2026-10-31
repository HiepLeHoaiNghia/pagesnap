// plan-exempt — ps-008: test scroll choreography tracking and mesh eye material guidance. routing-override: skipped — user approved scroll choreography tracker.
/**
 * Test that PageSnap captures scroll choreography checkpoints and emits eye material guidance in prompt.
 */
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { margin: 0; height: 3000px; font: 16px sans-serif; }
  #hero { position: relative; height: 800px; width: 100%; background: #111; }
  #canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: -1; }
  .section { height: 1000px; padding: 50px; color: #fff; }
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
</main>
<script>
  fetch('/assets/wolf.glb');
  fetch('/assets/matcap-atlas.jpg');
  fetch('/assets/wolf_normals.jpg');
  // Simulate scroll choreography by altering attributes on scroll
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    document.getElementById('canvas').setAttribute('data-scroll-depth', String(Math.round(y / 100)));
  });
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

  // Probe scroll choreography on the target element
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

  await check('prompt contains Scroll Choreography section with keypoint checkpoints', () => {
    assert.ok(res.prompt.includes('Scroll Choreography') || res.prompt.includes('scroll-state'), 'missing scroll choreography section in prompt');
    assert.ok(res.prompt.includes('keypoint') || res.prompt.includes('scroll checkpoints') || res.prompt.includes('checkpoints'), 'missing keypoints/checkpoints');
  });

  await check('prompt provides specific 3D Eye Material and glowing pupil instructions', () => {
    assert.ok(/eye/i.test(res.prompt) && /pupil|glowing|specular|amber|cyan/i.test(res.prompt), 'missing specific eye material guidance');
  });

  await check('tokens.json includes choreography scroll checkpoints', () => {
    assert.ok(res.tokens.scrollChoreography !== undefined, 'missing scrollChoreography in tokens.json');
  });

  assert.equal(failures.length, 0, `${failures.length} check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\nscroll choreography & eye tests passed');
} catch (err) {
  console.error('\nscroll choreography & eye FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
