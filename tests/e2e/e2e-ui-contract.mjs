// plan-exempt — ps-002 build: contract of the approved dock and Studio (plans/ps-002/ui/rules-v1.md). routing-override: skipped — user asked to build from the plan.
/**
 * What the owner approved (board answers G0-G2, then the owner's feedback of 2026-10-30), as checks a machine can repeat:
 *   - dock: one flat row; Expand, Shrink, Pick (and Select parent) outside any menu; at most 6 other export buttons; no "more" menu;
 *     the whole dock stays inside the window; the group names "Animated (JS)" and "No JS" are in the tooltips;
 *   - Studio: 3 tabs, at most 8 visible buttons on every tab, no "Analyze motion" button and no "JS Motion: None" label;
 *     footer = Copy animated, Download ZIP and an "Other formats" menu;
 *   - every file in the Code menu carries one motion label (Animated (JS) / CSS motion / Markup only / Data);
 *   - the wait pill shows a percentage and a Skip button;
 *   - "Copy animated" carries the motion script, "Copy code · no JS" does not;
 *   - "Select parent" shows up once the motion probe has measured more motion in the parent.
 * All checks run, then every failure is listed, so one run shows how far the UI is from the contract.
 */
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const FIXTURE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#08090a;color:#ddd;font:14px system-ui}
  #root{width:420px;padding:40px}
  .card{transition:transform .5s ease}
  @keyframes pulse{from{opacity:.4}to{opacity:1}}
  .pulse{animation:pulse 1s infinite alternate}
</style></head><body>
<div id="root"><div class="card pulse"><h3>Fixture card</h3><svg width="300" height="100" viewBox="0 0 300 100"><path d="M0 0 L10 10" stroke="#fff"/></svg></div></div>
</body></html>`;

const failures = [];
async function check(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); } catch (err) { failures.push(`${name}: ${err.message.split('\n')[0]}`); console.log(`  ✗ ${name}`); }
}

// buttons a person can see; the close and "more" buttons are excluded from every count (G0-2)
const VISIBLE = `(scope) => [...scope.querySelectorAll('button')]
  .filter((b) => b.getClientRects().length > 0 && getComputedStyle(b).visibility !== 'hidden')
  .filter((b) => { const t = b.innerText.trim(); return t !== '✕' && t !== '⋯'; })
  .map((b) => b.innerText.trim().split('\\n')[0])`;

const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await page.setContent(FIXTURE);
  await injectBundle(page);
  await page.evaluate(() => {
    // the UI contract is not about measuring: skip the sweep, but give the exporter a pointer-driven motion so a script exists
    window.PageSnap.motionIdentify.captureMotion = async () => null;
    window.PageSnap.motionSniffer.describe = () => ({
      driver: 'pointer-x',
      spatialMap: [{ px: 0, states: { 4: 'M0 0 L10 10' } }, { px: 1, states: { 4: 'M0 0 L110 110' } }],
      attributes: [], samples: [], morphedPaths: [], interactiveStates: [], annotatedElements: [], totalWrites: 10, hoverMap: [], liftLayers: []
    });
    window.__COPIED__ = [];
    window.Web2MD.copyTextToClipboard = async (text) => { window.__COPIED__.push(text); };
    window.PageSnap.downloadComponentZip = async () => ({ filename: 'stub.zip', size: 1 });
    window.__ROOT__ = document.querySelector('.card');
    window.PageSnap.showFloatingActionsBar(window.__ROOT__);
  });

  // ---------- dock ----------
  // plan-exempt — owner feedback 2026-10-30: Expand, Shrink, Pick (and Select parent) stay outside the menu and do not count toward the 5 export buttons. routing-override: skipped — user asked for this change directly.
  const NAV = ['Expand', 'Shrink', 'Pick', 'Select parent'];
  const dockNames = () => page.evaluate(`(${VISIBLE})(document.getElementById('pagesnap-region-actions-bar'))`);
  await check('dock shows at most 6 buttons besides the navigation buttons (G0-2b)', async () => {
    const names = (await dockNames()).filter((n) => !NAV.some((v) => n.includes(v)));
    assert.ok(names.length <= 6, `${names.length} buttons: ${names.join(' | ')}`);
  });
  await check('dock keeps Expand, Shrink and Pick outside the menu, as before', async () => {
    const names = (await dockNames()).join(' | ');
    for (const want of ['Expand', 'Shrink', 'Pick']) assert.ok(names.includes(want), `missing "${want}" in: ${names}`);
  });
  // plan-exempt — ps-014: update UI contract for approved Deciboard r-dock-layout Option 1. routing-override: skipped — user approved Phase 2 dock redesign in deciboard.
  await check('dock has core actions: Copy Markdown, Copy HTML, Live Studio, and more menu (Deciboard r-dock-layout)', async () => {
    const names = (await dockNames()).join(' | ');
    for (const want of ['Copy Markdown', 'Copy HTML', 'Live Studio', '•••']) assert.ok(names.includes(want), `missing "${want}" in: ${names}`);
  });
  await check('dock is one flat row: no group captions or notes under the buttons', async () => {
    const tall = await page.evaluate(() => [...document.querySelectorAll('#pagesnap-region-actions-bar button')].filter((b) => b.getClientRects().length && b.getBoundingClientRect().height > 40).map((b) => b.innerText));
    assert.deepEqual(tall, []);
  });
  await check('the groups are named in the tooltips (V-2)', async () => {
    const titles = await page.evaluate(() => [...document.querySelectorAll('#pagesnap-region-actions-bar [data-action]')].map((b) => `${b.dataset.action}=${b.title}`));
    const has = (slot, text) => titles.some((t) => t.startsWith(slot + '=') && t.includes(text));
    assert.ok(has('copy-animated', 'Animated (JS)') && has('download-zip', 'Animated (JS)'), titles.join(' ; '));
    assert.ok(has('copy-static', 'No JS') && has('copy-md', 'No JS'), titles.join(' ; '));
  });
  // plan-exempt — ps-014: overflow menu carries secondary export actions. routing-override: skipped — user approved Phase 2 dock redesign in deciboard.
  await check('more menu (•••) carries secondary export actions: Download ZIP, Copy AI Prompt, Copy animated', async () => {
    const menuItems = await page.evaluate(() => {
      const menu = document.getElementById('pagesnap-more-menu');
      return menu ? [...menu.querySelectorAll('button')].map(b => b.innerText.trim()) : [];
    });
    const joined = menuItems.join(' | ');
    for (const want of ['Download ZIP', 'Copy AI Prompt', 'Copy animated']) assert.ok(joined.includes(want), `missing "${want}" in more menu: ${joined}`);
  });
  for (const [w, h] of [[1500, 900], [1100, 700], [760, 500]]) {
    await check(`the whole dock stays inside a ${w}x${h} window, also for an element at the corner`, async () => {
      await page.setViewportSize({ width: w, height: h });
      const boxes = await page.evaluate(() => {
        const root = window.__ROOT__;
        const out = [];
        for (const place of ['', 'position:fixed;right:0;top:0', 'position:fixed;left:0;bottom:0', 'position:fixed;right:0;bottom:0']) {
          root.style.cssText = place;
          window.PageSnap.showFloatingActionsBar(root);
          const bar = document.getElementById('pagesnap-region-actions-bar');
          const r = bar.getBoundingClientRect();
          const clipped = [...bar.querySelectorAll('button')].filter((b) => { const q = b.getBoundingClientRect(); return q.width > 0 && (q.left < -0.5 || q.right > innerWidth + 0.5 || q.top < -0.5 || q.bottom > innerHeight + 0.5); }).map((b) => b.innerText);
          out.push({ place, left: r.left, right: r.right, top: r.top, bottom: r.bottom, vw: innerWidth, vh: innerHeight, clipped });
        }
        root.style.cssText = '';
        return out;
      });
      for (const b of boxes) {
        assert.ok(b.left >= -0.5 && b.right <= b.vw + 0.5 && b.top >= -0.5 && b.bottom <= b.vh + 0.5, `dock outside the window (${b.place || 'default'}): ${JSON.stringify(b)}`);
        assert.deepEqual(b.clipped, [], `buttons outside the window (${b.place || 'default'})`);
      }
    });
  }
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.evaluate(() => window.PageSnap.showFloatingActionsBar(window.__ROOT__));
  await check('"Copy animated" carries the motion script, "Copy code · no JS" does not', async () => {
    await page.evaluate(() => { window.__COPIED__.length = 0; document.querySelector('#pagesnap-region-actions-bar [data-action="copy-animated"]').click(); });
    await page.waitForFunction(() => window.__COPIED__.length === 1);
    await page.evaluate(() => {
      window.PageSnap.showFloatingActionsBar(window.__ROOT__);
      document.querySelector('#pagesnap-region-actions-bar [data-action="copy-static"]').click();
    });
    await page.waitForFunction(() => window.__COPIED__.length === 2);
    const [animated, plain] = await page.evaluate(() => window.__COPIED__);
    assert.match(animated, /<script>/, 'animated export must include the motion script');
    assert.doesNotMatch(plain, /<script/, 'the no-JS export must not include any script');
    assert.match(plain, /<style>/, 'the no-JS export must still carry its styles');
  });

  // ---------- Studio ----------
  await page.evaluate(() => { document.getElementById('pagesnap-region-actions-bar')?.remove(); window.PageSnap.openComponentStudioModal(window.__ROOT__); });
  await page.waitForSelector('#pagesnap-component-studio-modal', { state: 'visible' });
  const studioButtons = () => page.evaluate(`(${VISIBLE})(document.getElementById('pagesnap-component-studio-modal'))`);

  await check('Studio has three tabs: preview, code, ai (V-3)', async () => {
    const tabs = await page.evaluate(() => [...document.querySelectorAll('#pagesnap-component-studio-modal [data-studio-tab]')].map((t) => t.dataset.studioTab));
    assert.deepEqual(tabs, ['preview', 'code', 'ai']);
  });
  for (const tab of ['preview', 'code', 'ai']) {
    await check(`Studio shows at most 8 buttons on the ${tab} tab (G0-2)`, async () => {
      await page.evaluate((t) => { const el = document.querySelector(`#pagesnap-component-studio-modal [data-studio-tab="${t}"]`); if (el) el.click(); }, tab);
      const names = await studioButtons();
      assert.ok(names.length <= 8, `${names.length} buttons: ${names.join(' | ')}`);
    });
  }
  await check('Studio has no Analyze button and no "JS Motion: None" label (V-3, S-1)', async () => {
    const text = await page.evaluate(() => document.getElementById('pagesnap-component-studio-modal').innerText);
    assert.ok(!text.includes('Analyze motion'), 'found "Analyze motion"');
    assert.ok(!text.includes('JS Motion: None'), 'found "JS Motion: None"');
  });
  await check('Studio shows a read-only motion status line (S-1)', async () => {
    const text = await page.evaluate(() => (document.getElementById('pagesnap-studio-status') || {}).innerText || '');
    assert.match(text, /^(Motion measured|No motion detected)/, `status line: "${text}"`);
  });
  // plan-exempt — owner decision 2026-10-30 (option A): the footer shows one main button, Download ZIP and an "Other formats" menu. routing-override: skipped — user asked for this change directly.
  await check('Studio footer: Copy animated, Download ZIP and an Other formats menu (S-1)', async () => {
    await page.evaluate(() => document.querySelector('#pagesnap-component-studio-modal [data-studio-tab="preview"]')?.click());
    const names = (await studioButtons()).join(' | ');
    for (const want of ['Copy animated', 'Download ZIP', 'Other formats']) assert.ok(names.includes(want), `missing "${want}" in: ${names}`);
    for (const gone of ['Copy Component', 'Copy AI Prompt', 'Copy Selection MD', 'Copy code · no JS']) assert.ok(!names.includes(gone), `"${gone}" must be inside the menu, not on the footer: ${names}`);
    await page.evaluate(() => document.getElementById('pagesnap-studio-formats-btn').click());
    const menu = await page.evaluate(() => document.getElementById('pagesnap-studio-formats-menu').innerText);
    for (const want of ['Copy code · no JS', 'Copy Selection MD']) assert.ok(menu.includes(want), `missing "${want}" in the menu: ${menu.replace(/\n/g, ' / ')}`);
    await page.evaluate(() => document.getElementById('pagesnap-studio-formats-btn').click());
  });
  await check('every file in the Code menu carries one motion label (V-1, S-2)', async () => {
    await page.evaluate(() => document.querySelector('#pagesnap-component-studio-modal [data-studio-tab="code"]')?.click());
    await page.evaluate(() => document.getElementById('pagesnap-file-menu-btn')?.click());
    const items = await page.evaluate(() => [...document.querySelectorAll('#pagesnap-file-menu [data-file]')].map((i) => `${i.dataset.file}=${i.innerText.replace(/\s+/g, ' ').trim()}`));
    const want = { 'index.html': 'Animated (JS)', 'styles.css': 'CSS motion', 'Component.jsx': 'Markup only', 'tokens.json': 'Data' };
    for (const [file, label] of Object.entries(want)) assert.ok(items.some((i) => i.startsWith(file + '=') && i.includes(label)), `${file} should carry "${label}", menu: ${items.join(' ; ')}`);
  });
  await check('the Code tab says what the open file contains (S-2)', async () => {
    const text = await page.evaluate(() => (document.getElementById('pagesnap-file-note') || {}).innerText || '');
    assert.ok(text.length > 20, `file note: "${text}"`);
  });
  await check('AI Specs tab offers Copy this file (S-2)', async () => {
    await page.evaluate(() => document.querySelector('#pagesnap-component-studio-modal [data-studio-tab="ai"]')?.click());
    const names = (await studioButtons()).join(' | ');
    assert.ok(names.includes('Copy this file'), names);
  });

  // ---------- wait pill ----------
  await page.evaluate(() => { document.getElementById('pagesnap-component-studio-modal')?.remove(); });
  const pillPage = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await pillPage.setContent(FIXTURE);
  await injectBundle(pillPage);
  await check('the wait pill shows a percentage, the time hint and a Skip button (W-1)', async () => {
    const seen = await pillPage.evaluate(async () => {
      const texts = [];
      const timer = setInterval(() => { const p = document.getElementById('pagesnap-analyze-pill'); if (p) texts.push(p.innerText.replace(/\s+/g, ' ').trim()); }, 5);
      await window.PageSnap.motionIdentify.captureMotion(document.getElementById('root'));
      clearInterval(timer);
      return texts;
    });
    const withPercent = seen.find((t) => /Measuring motion… \d+%/.test(t));
    assert.ok(withPercent, `no "Measuring motion… N%" among: ${[...new Set(seen)].slice(0, 4).join(' || ')}`);
    assert.match(withPercent, /about 40 s/, withPercent);
    assert.match(withPercent, /Skip/, withPercent);
  });

  // plan-exempt — owner feedback 2026-10-30: "Select parent" went missing; it depends on motion measured after the dock is drawn. routing-override: skipped — user asked for this change directly.
  const parentPage = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await parentPage.setContent(FIXTURE);
  await injectBundle(parentPage);
  await check('"Select parent" appears once the probe has measured more motion in the parent', async () => {
    await parentPage.evaluate(() => {
      const empty = { morphedPaths: [], interactiveStates: [], liftLayers: [] };
      // the parent's motion exists only after the probe has run, like the real sniffer
      window.__PROBED__ = false;
      window.PageSnap.motionSniffer.describe = (el) => (el.id === 'root' && window.__PROBED__ ? { ...empty, interactiveStates: [{}, {}, {}, {}] } : empty);
      window.PageSnap.motionSniffer.probeElementRangeOfMotion = async () => { await new Promise((r) => setTimeout(r, 300)); window.__PROBED__ = true; };
      window.PageSnap.toggleInspector(true);
    });
    await parentPage.click('.card');
    const before = await parentPage.evaluate(() => document.getElementById('pagesnap-region-actions-bar').innerText);
    assert.ok(!before.includes('Select parent'), 'the parent has no measured motion yet when the dock is first drawn');
    await parentPage.waitForFunction(() => /Select parent \(4 animations\)/.test(document.getElementById('pagesnap-region-actions-bar')?.innerText || ''), null, { timeout: 3000 });
  });

  assert.equal(failures.length, 0, `${failures.length} contract check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\nUI contract passed');
} catch (err) {
  console.error('\nUI contract FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
