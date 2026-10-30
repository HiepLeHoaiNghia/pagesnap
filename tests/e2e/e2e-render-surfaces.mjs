// plan-exempt — ps-007 part B: the AI prompt for dogstudio.co never said the hero is a WebGL canvas. routing-override: skipped — user approved the canvas warning work in chat.
/**
 * A region that is drawn (partly) outside HTML/CSS must say so: canvas inside or behind it, video, iframe, the 3D/media
 * files the page loaded and markup hints. The extension's content script cannot see page globals (isolated world), so the
 * detection may only use the DOM, resource timing and script file names; this test sets no global such as window.THREE.
 */
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const PAGE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;font:16px sans-serif}</style></head><body>
<canvas id="bg" data-engine="three.js r128" width="1500" height="900" style="position:fixed;inset:0;width:100vw;height:100vh;z-index:-1"></canvas>
<main id="target" style="position:relative;margin:100px auto;width:800px;height:400px">
  <h1 data-matcap="18, 18">Hello</h1>
  <canvas id="inner" width="300" height="150" style="display:block"></canvas>
  <video src="/clip.mp4" style="width:100px;height:60px"></video>
  <iframe src="about:blank" style="width:100px;height:60px"></iframe>
</main>
<script src="/vendor/three.min.js"></script>
<script>fetch('/assets/dog.drc.glb'); fetch('/assets/images/matcap-a.jpg');</script>
</body></html>`;
const PLAIN = `<!DOCTYPE html><html><body style="margin:0"><main id="target"><h1>Plain</h1><p>No canvas here.</p></main></body></html>`;
// plan-exempt — found on the real dogstudio.co export: the viewport-sized background canvas covers only 23% of a 3870px-tall <main>, below the first 25% threshold, so it was not reported. routing-override: skipped — user approved the canvas warning work in chat.
const TALL = `<!DOCTYPE html><html><head><style>body{margin:0}</style></head><body>
<canvas data-engine="three.js r128" width="1500" height="900" style="position:fixed;inset:0;width:100vw;height:100vh;z-index:-1"></canvas>
<main id="target" style="height:3870px"><h1>Tall page</h1></main></body></html>`;

const failures = [];
async function check(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); } catch (err) { failures.push(`${name}: ${err.message.split('\n')[0]}`); console.log(`  ✗ ${name}`); }
}

const browser = await launch({ headless: true });
try {
  const open = async (html) => {
    const p = await browser.newPage({ viewport: { width: 1500, height: 900 } });
    await p.route('http://ps.test/**', (route) => {
      const u = new URL(route.request().url());
      if (u.pathname === '/') return route.fulfill({ contentType: 'text/html', body: html });
      if (u.pathname.endsWith('.js')) return route.fulfill({ contentType: 'text/javascript', body: '' });
      return route.fulfill({ contentType: 'application/octet-stream', body: Buffer.from([1, 2, 3]) });
    });
    await p.goto('http://ps.test/');
    await p.waitForTimeout(600);
    await injectBundle(p);
    return p;
  };
  const extract = (p) => p.evaluate(() => { const c = window.PageSnap.extractComponentStyleAndMotion(document.getElementById('target')); return { surfaces: c.renderSurfaces, prompt: c.promptMarkdown, tokens: JSON.parse(c.tokensJson) }; });

  const richPage = await open(PAGE);
  const plainPage = await open(PLAIN);
  const rich = await extract(richPage);
  const plain = await extract(plainPage);
  const tall = await extract(await open(TALL));
  await check('a viewport-sized background canvas is reported for a region much taller than the viewport', () => {
    assert.equal(tall.surfaces.canvases.length, 1, JSON.stringify(tall.surfaces));
    assert.equal(tall.surfaces.canvases[0].where, 'behind');
  });

  await check('a canvas inside and one behind the region are both reported, with their place and size', () => {
    const c = rich.surfaces.canvases;
    assert.equal(c.length, 2);
    const inside = c.find((x) => x.where === 'inside');
    const behind = c.find((x) => x.where === 'behind');
    assert.ok(inside && inside.width === 300 && inside.height === 150, 'inside canvas 300x150');
    assert.ok(behind && behind.width === 1500 && behind.height === 900, 'behind canvas 1500x900');
    assert.equal(behind.engine, 'three.js r128');
  });
  await check('script file names point to the library (three.js)', () => assert.ok(rich.surfaces.libraries.includes('three.js'), JSON.stringify(rich.surfaces.libraries)));
  await check('the 3D and texture files the page loaded are listed with their kind', () => {
    const a = rich.surfaces.assets;
    assert.ok(a.some((x) => x.kind === 'model' && x.url.endsWith('/assets/dog.drc.glb')), JSON.stringify(a));
    assert.ok(a.some((x) => x.kind === 'texture' && x.url.endsWith('/assets/images/matcap-a.jpg')), JSON.stringify(a));
  });
  await check('markup hints (data-matcap), video and iframe counts are reported', () => {
    assert.ok(rich.surfaces.hints.includes('data-matcap'), JSON.stringify(rich.surfaces.hints));
    assert.equal(rich.surfaces.videos, 1);
    assert.equal(rich.surfaces.iframes, 1);
  });
  await check('AI-PROMPT.md has a "Render surfaces" section naming the canvas, library and model file', () => {
    assert.ok(rich.prompt.includes('## 3b. Render surfaces'), 'section heading');
    assert.ok(/three\.js/.test(rich.prompt) && rich.prompt.includes('dog.drc.glb') && /1500\s*×\s*900/.test(rich.prompt), 'details in the section');
    assert.ok(/not (part of|in) this export|NOT in this export/i.test(rich.prompt), 'says it is not exported');
  });
  await check('tokens.json carries the same facts for agents', () => assert.equal(rich.tokens.renderSurfaces.any, true));
  await check('a plain region reports nothing and the prompt has no such section', () => {
    assert.equal(plain.surfaces.any, false);
    assert.ok(!plain.prompt.includes('Render surfaces'));
    assert.equal(plain.tokens.renderSurfaces.any, false);
  });

  // ---------- dock and Studio say it too ----------
  // plan-exempt — ps-007 part B: the warning is also shown to the person, not only written into the files. routing-override: skipped — user approved the canvas warning work in chat.
  const prepare = (p) => p.evaluate(() => {
    window.PageSnap.motionIdentify.captureMotion = async () => null;
    window.PageSnap.motionSniffer.describe = () => ({ driver: 'time-loop', attributes: [], samples: [], morphedPaths: [], interactiveStates: [], annotatedElements: [], totalWrites: 0, hoverMap: [], liftLayers: [] });
    window.Web2MD.copyTextToClipboard = async () => {};
    window.__T__ = document.getElementById('target');
    window.PageSnap.showFloatingActionsBar(window.__T__);
  });
  await prepare(richPage);
  await prepare(plainPage);
  const dockNotice = (p) => p.evaluate(() => { const n = document.querySelector('#pagesnap-region-actions-bar [data-notice="render-surface"]'); return n ? { tag: n.tagName, text: n.innerText, title: n.title } : null; });
  await check('dock shows a notice (not a button) when the region has a canvas behind or inside it', async () => {
    const n = await dockNotice(richPage);
    assert.ok(n, 'no notice in the dock');
    assert.notEqual(n.tag, 'BUTTON');
    assert.ok(/canvas/i.test(n.text) && /not exported|blank/i.test(n.text), `notice text: "${n.text}"`);
    assert.ok(/AI-PROMPT/.test(n.title), `notice tooltip: "${n.title}"`);
  });
  await check('dock shows no notice for a plain region', async () => assert.equal(await dockNotice(plainPage), null));
  const studioStatus = async (p) => {
    await p.evaluate(() => { document.getElementById('pagesnap-region-actions-bar')?.remove(); window.PageSnap.openComponentStudioModal(window.__T__); });
    await p.waitForSelector('#pagesnap-studio-status', { state: 'attached' });
    return p.evaluate(() => document.getElementById('pagesnap-studio-status').textContent);
  };
  await check('Studio status line names the canvas that is not exported', async () => {
    const t = await studioStatus(richPage);
    assert.ok(/canvas/i.test(t) && /not exported/i.test(t), `status: "${t}"`);
  });
  await check('Studio status line for a plain region does not mention a canvas', async () => {
    const t = await studioStatus(plainPage);
    assert.ok(!/canvas/i.test(t), `status: "${t}"`);
  });

  assert.equal(failures.length, 0, `${failures.length} render-surface check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\nrender surfaces passed');
} catch (err) {
  console.error('\nrender surfaces FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
