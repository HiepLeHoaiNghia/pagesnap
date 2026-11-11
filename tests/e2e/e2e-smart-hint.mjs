// plan-exempt — ps-015: test Game HUD Coachmark for static element selection
// routing-override: skipped — user approved Option 1 in deciboard.
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const FIXTURE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body { margin: 0; background: #08090a; color: #ddd; font: 14px system-ui; padding: 40px; }
  .static-box { padding: 20px; background: #1f2937; margin-bottom: 20px; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .animated-box { padding: 20px; background: #374151; animation: spin 2s linear infinite; }
</style></head><body>
  <div id="static-el" class="static-box">
    <h3>Pure Static Heading</h3>
    <p>This is a plain paragraph with no CSS or JS animations.</p>
  </div>
  <div id="animated-el" class="animated-box">
    <p>Animated box</p>
  </div>
</body></html>`;

const failures = [];
async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push(`${name}: ${err.message.split('\n')[0]}`);
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.setContent(FIXTURE);
  await injectBundle(page);

  await page.evaluate(() => {
    window.PageSnap.motionIdentify.captureMotion = async () => null;
    window.PageSnap.resetStaticHintPreference();
  });

  await check('selecting a static element shows the Game HUD Coachmark', async () => {
    await page.evaluate(() => {
      const staticEl = document.getElementById('static-el');
      window.PageSnap.showFloatingActionsBar(staticEl);
    });

    const cm = await page.waitForSelector('#pagesnap-static-coachmark', { state: 'attached', timeout: 2000 });
    assert.ok(cm, 'Coachmark element not found');

    const text = await page.evaluate(() => document.getElementById('pagesnap-static-coachmark')?.innerText || '');
    assert.ok(text.includes('PRO-TIP · STATIC SELECTION'), 'Missing game badge text');
    assert.ok(text.includes('This element has no motion'), 'Missing explanation message');
    assert.ok(text.includes('Got it'), 'Missing Got it button');
    assert.ok(text.includes("Don't show again"), 'Missing Don\'t show again checkbox');
  });

  await check('clicking Got it dismisses the coachmark', async () => {
    await page.click('#pagesnap-coachmark-gotit');
    await page.waitForFunction(() => !document.getElementById('pagesnap-static-coachmark'), { timeout: 2000 });
    const exists = await page.evaluate(() => !!document.getElementById('pagesnap-static-coachmark'));
    assert.equal(exists, false, 'Coachmark should be removed after clicking Got it');
  });

  await check('re-selecting static element without "Don\'t show again" shows coachmark again', async () => {
    await page.evaluate(() => {
      const staticEl = document.getElementById('static-el');
      window.PageSnap.showFloatingActionsBar(staticEl);
    });
    await page.waitForSelector('#pagesnap-static-coachmark', { state: 'attached', timeout: 2000 });
    const exists = await page.evaluate(() => !!document.getElementById('pagesnap-static-coachmark'));
    assert.equal(exists, true, 'Coachmark should appear again');
  });

  await check('checking "Don\'t show again" permanently suppresses coachmark across selections', async () => {
    await page.click('#pagesnap-coachmark-dontshow');
    await page.click('#pagesnap-coachmark-gotit');
    await page.waitForFunction(() => !document.getElementById('pagesnap-static-coachmark'), { timeout: 2000 });

    // Re-select static element
    await page.evaluate(() => {
      const staticEl = document.getElementById('static-el');
      window.PageSnap.showFloatingActionsBar(staticEl);
    });
    await page.waitForTimeout(400);

    const exists = await page.evaluate(() => !!document.getElementById('pagesnap-static-coachmark'));
    assert.equal(exists, false, 'Coachmark should not appear when permanently dismissed');
  });

  await check('resetStaticHintPreference restores the coachmark for static elements', async () => {
    await page.evaluate(() => {
      window.PageSnap.resetStaticHintPreference();
      const staticEl = document.getElementById('static-el');
      window.PageSnap.showFloatingActionsBar(staticEl);
    });
    await page.waitForSelector('#pagesnap-static-coachmark', { state: 'attached', timeout: 2000 });
    const exists = await page.evaluate(() => !!document.getElementById('pagesnap-static-coachmark'));
    assert.equal(exists, true, 'Coachmark should appear again after resetting preference');
  });

  await check('selecting an animated element does NOT show the coachmark', async () => {
    await page.evaluate(() => {
      const bar = document.getElementById('pagesnap-region-actions-bar');
      if (bar) bar.remove();
      const animEl = document.getElementById('animated-el');
      window.PageSnap.showFloatingActionsBar(animEl);
    });
    await page.waitForTimeout(400);

    const exists = await page.evaluate(() => !!document.getElementById('pagesnap-static-coachmark'));
    assert.equal(exists, false, 'Animated element must not trigger static coachmark');
  });

  assert.equal(failures.length, 0, `${failures.length} check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\nAll Smart Hint E2E checks passed!');
} finally {
  await browser.close();
}
