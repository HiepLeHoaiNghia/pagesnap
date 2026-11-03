// plan-exempt — ps-008: test user-driven interactive recording mode (scroll and hover session). routing-override: skipped — user requested interactive recording mode.
/**
 * Test that PageSnap provides startInteractiveRecording() and stopInteractiveRecording(),
 * capturing real user scroll positions, hover targets, and WebGL state changes into interaction-recording.json.
 */
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { margin: 0; height: 3000px; font: 16px sans-serif; background: #0b0f19; }
  .item { display: block; padding: 20px; color: #fff; text-decoration: none; }
  .item:hover { color: #f43f5e; }
  #canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: -1; }
</style>
</head><body>
<canvas id="canvas" width="1500" height="900" data-engine="three.js r128"></canvas>
<main id="target">
  <div style="height: 600px;">
    <h1>Interactive Recording Page</h1>
  </div>
  <div class="list">
    <a href="#" class="item" id="item-1" data-matcap="11, 11">First Project</a>
    <a href="#" class="item" id="item-2" data-matcap="4, 4">Second Project</a>
  </div>
</main>
<script>
  window.addEventListener('scroll', () => {
    document.getElementById('canvas').setAttribute('data-scroll-state', String(window.scrollY));
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

  // 1. Test starting interactive recording mode
  await p.evaluate(() => {
    window.PageSnap.motionSniffer.startInteractiveRecording();
  });

  // 2. Perform simulated real user actions: scroll and hover
  await p.evaluate(() => window.scrollTo(0, 800));
  await p.waitForTimeout(100);
  await p.hover('#item-1');
  await p.waitForTimeout(100);
  await p.hover('#item-2');
  await p.waitForTimeout(100);
  await p.evaluate(() => window.scrollTo(0, 1500));
  await p.waitForTimeout(100);

  // 3. Stop recording and extract component
  const recordingData = await p.evaluate(() => {
    const session = window.PageSnap.motionSniffer.stopInteractiveRecording();
    const el = document.getElementById('target');
    const comp = window.PageSnap.extractComponentStyleAndMotion(el);
    return {
      session,
      tokens: JSON.parse(comp.tokensJson),
      prompt: comp.promptMarkdown
    };
  });

  await check('Interactive recording captures user scroll journey and hover events', () => {
    const sess = recordingData.session;
    assert.ok(sess, 'missing recording session data');
    assert.ok(sess.scrollTrail && sess.scrollTrail.length >= 2, 'must capture scroll trail');
    assert.ok(sess.hoverEvents && sess.hoverEvents.length >= 2, 'must capture hover events');
    assert.ok(sess.hoverEvents.some(h => h.text.includes('First Project')), 'captured First Project hover');
  });

  await check('tokens.json includes userSessionRecording with empirical interaction data', () => {
    assert.ok(recordingData.tokens.userSessionRecording !== undefined, 'missing userSessionRecording in tokens.json');
  });

  await check('AI-PROMPT.md includes Empirical Interaction Log section', () => {
    assert.ok(recordingData.prompt.includes('Empirical Human Interaction Log') || recordingData.prompt.includes('User Interaction Recording'), 'missing interaction log in prompt');
  });

  assert.equal(failures.length, 0, `${failures.length} check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\ninteractive recording mode tests passed');
} catch (err) {
  console.error('\ninteractive recording mode FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
