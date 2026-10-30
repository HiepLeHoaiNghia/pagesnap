// plan-exempt — ps-003 phases 1 and 3: characterization test of the one-click motion export on offline fixtures. routing-override: skipped — user asked to build from the plan.
/**
 * Offline fixture that reacts to hover the way React does: a plate lift is toggled from `mouseover` using
 * `relatedTarget` (never from a plain `mouseenter`), and hovering hit area k lifts plate k AND every plate above it
 * (cumulative, bottom-up). This is exactly the behaviour that an index-based guess gets wrong.
 *
 * It runs twice: once with the class names and CSS variable of the first real site it was built for, once with
 * unrelated names. The export must behave the same, because it may only rely on what it MEASURED.
 *
 * What it guards (each was a real, user-visible bug on linear.app):
 *   1. captureMotion replays enter/leave faithfully enough that the page's own handlers fire;
 *   2. the export reproduces the SAME hover -> lifted-plates table as the live page (not hit k -> plate k);
 *   3. the measured transition (duration + easing) is replayed instead of a hard-coded one;
 *   4. tokens.json stays serialisable even when DOM nodes carry circular framework keys (__reactFiber$...);
 *   5. the lift is recognised from measured movement, not from class names or page CSS variables.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launch, injectBundle } from '../bench/lib.mjs';

const FIXTURE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#08090a}
  #root{padding:30px}
  svg{display:block}
  .GJ9TEa_purposeLift{transition:transform .7s cubic-bezier(.32,.72,0,1);pointer-events:none}
  .GJ9TEa_purposeLifted{transform:translateY(calc(var(--purpose-lift) * -1))}
  .GJ9TEa_purposeHitArea path{pointer-events:stroke}
</style></head><body>
<div id="root"><svg width="300" height="220" viewBox="0 0 300 220" style="--purpose-lift:30px">
  <g class="GJ9TEa_purposeLift"><path d="M40 20h220v40H40z" fill="#15171a" stroke="#d0d6e0"/></g>
  <g class="GJ9TEa_purposeLift"><path d="M40 80h220v40H40z" fill="#15171a" stroke="#d0d6e0"/></g>
  <g class="GJ9TEa_purposeLift"><path d="M40 140h220v40H40z" fill="#15171a" stroke="#d0d6e0"/></g>
  <g class="GJ9TEa_purposeHitArea">
    <path d="M40 40H260" stroke="rgba(0,0,0,.01)" stroke-width="40" fill="none"/>
    <path d="M40 100H260" stroke="rgba(0,0,0,.01)" stroke-width="40" fill="none"/>
    <path d="M40 160H260" stroke="rgba(0,0,0,.01)" stroke-width="40" fill="none"/>
  </g>
</svg></div>
<script>
  const hits = [...document.querySelectorAll('.GJ9TEa_purposeHitArea > path')];
  const lifts = [...document.querySelectorAll('svg > g.GJ9TEa_purposeLift')];
  const n = lifts.length;
  hits.forEach((h, k) => {
    h.addEventListener('mouseover', (e) => { if (h.contains(e.relatedTarget)) return; lifts.forEach((l, i) => l.classList.toggle('GJ9TEa_purposeLifted', i >= n - 1 - k)); });
    h.addEventListener('mouseout', (e) => { if (h.contains(e.relatedTarget)) return; lifts.forEach((l) => l.classList.remove('GJ9TEa_purposeLifted')); });
    const fiber = {}; fiber.self = fiber; h['__reactFiber$test'] = fiber; // circular key, like React puts on real nodes
  });
</script></body></html>`;

const SCHEMES = [
  { name: 'first-site names', lift: 'GJ9TEa_purposeLift', lifted: 'GJ9TEa_purposeLifted', hit: 'GJ9TEa_purposeHitArea', cssVar: '--purpose-lift' },
  { name: 'unrelated names', lift: 'tray', lifted: 'tray-raised', hit: 'sensor', cssVar: '--rise' }
];
const render = (s) => FIXTURE
  .replaceAll('GJ9TEa_purposeLifted', s.lifted)
  .replaceAll('GJ9TEa_purposeLift', s.lift)
  .replaceAll('GJ9TEa_purposeHitArea', s.hit)
  .replaceAll('--purpose-lift', s.cssVar);

// hit k lifts plates (n-1-k) .. n-1 ; index-based guess would give [k]
const EXPECTED = [[2], [1, 2], [0, 1, 2]];

async function hoverTable(page, s) {
  const points = await page.evaluate((s) => {
    const svg = [...document.querySelectorAll('svg')].find((el) => el.querySelector('g.' + s.hit) && el.getBoundingClientRect().width > 50);
    window.__LIFTS__ = [...svg.querySelectorAll('g.' + s.lift)];
    return [...svg.querySelectorAll('g.' + s.hit + ' > path')].map((hit) => {
      const b = hit.getBoundingClientRect();
      for (let gy = 0; gy <= 16; gy++) for (let gx = 0; gx <= 16; gx++) {
        const x = b.x + (b.width * gx) / 16;
        const y = b.y + (b.height * gy) / 16;
        if (document.elementFromPoint(x, y) === hit) return { x, y };
      }
      return null;
    });
  }, s);
  assert.ok(points.every(Boolean), 'every hit area must be reachable by a real pointer');
  const table = [];
  for (const p of points) {
    await page.mouse.move(5, 5);
    await page.waitForTimeout(700);
    await page.mouse.move(p.x, p.y, { steps: 3 });
    await page.waitForTimeout(700);
    table.push(await page.evaluate(() => window.__LIFTS__
      .map((l, i) => { const m = String(getComputedStyle(l).transform).match(/matrix\(([^)]+)\)/); return m && Number(m[1].split(',')[5]) < -15 ? i : null; })
      .filter((v) => v !== null)));
  }
  await page.mouse.move(5, 5);
  return table;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pagesnap-motion-export-'));
const browser = await launch({ headless: true });
try {
  for (const s of SCHEMES) {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    await page.setContent(render(s));
    await injectBundle(page);

    const live = await hoverTable(page, s);
    assert.deepEqual(live, EXPECTED, `[${s.name}] fixture itself must lift cumulatively (test premise)`);

    const exported = await page.evaluate(async () => {
      const root = document.getElementById('root');
      await window.PageSnap.motionIdentify.captureMotion(root, { quiet: true });
      const data = window.PageSnap.extractComponentStyleAndMotion(root);
      return { indexHtml: data.indexHtml, cssOnly: data.cssOnly, tokensJson: data.tokensJson, hoverMap: (data.jsMotion && data.jsMotion.hoverMap) || [], liftLayers: (data.jsMotion && data.jsMotion.liftLayers) || [] };
    });

    assert.doesNotThrow(() => JSON.parse(exported.tokensJson), `[${s.name}] tokens.json must stay valid JSON`);
    assert.equal(exported.hoverMap.filter((e) => e.lifted.length > 0).length, 3, `[${s.name}] captureMotion must record all three hover relations`);
    assert.deepEqual(exported.liftLayers.map((l) => [l.dx, Math.round(l.dy)]), [[0, -30], [0, -30], [0, -30]], `[${s.name}] lift amount must be measured from the settled position`);
    assert.match(exported.cssOnly, /transform 0\.7s cubic-bezier\(0\.32, 0\.72, 0, 1\)/, `[${s.name}] the measured transition must be replayed`);
    console.log(`  ✓ [${s.name}] capture: 3 hover relations, 3 measured lift layers, tokens.json valid, measured transition replayed`);

    const dir = path.join(tmp, s.lift);
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), exported.indexHtml);
    fs.writeFileSync(path.join(dir, 'styles.css'), exported.cssOnly);
    const exportPage = await browser.newPage({ viewport: { width: 900, height: 700 } });
    await exportPage.goto('file://' + path.join(dir, 'index.html'));
    await exportPage.waitForTimeout(500);
    const replay = await hoverTable(exportPage, s);
    assert.deepEqual(replay, live, `[${s.name}] exported hover table must equal the live page, not an index-based guess`);
    console.log(`  ✓ [${s.name}] export: hover table identical to the live page ${JSON.stringify(replay)}`);
    await page.close();
    await exportPage.close();
  }

  // plan-exempt — ps-003 phase 4: the pointer-x spatial-map player (used when no fitted model exists) had no test; it is moved in this phase. routing-override: skipped — user asked to build from the plan.
  // Pointer X must scrub the recorded states in order, and leaving must return the path to rest.
  {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    await page.setContent('<div id="host"><svg width="300" height="120"><path d="M0 0 L10 10"></path></svg></div>');
    await injectBundle(page);
    const html = await page.evaluate(() => {
      window.PageSnap.motionSniffer.describe = () => ({
        driver: 'pointer-x',
        spatialMap: [{ px: 0, states: { 2: 'M0 0 L10 10' } }, { px: 0.5, states: { 2: 'M0 0 L55 55' } }, { px: 1, states: { 2: 'M0 0 L110 110' } }],
        attributes: [], samples: [], morphedPaths: [], interactiveStates: [], annotatedElements: [], totalWrites: 10, hoverMap: [], liftLayers: []
      });
      return window.PageSnap.extractComponentStyleAndMotion(document.getElementById('host')).indexHtml;
    });
    assert.match(html, /<script>/, 'a pointer-driven export without a fitted model must carry the spatial-map player');
    const dir = path.join(tmp, 'spatial');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    const exportPage = await browser.newPage({ viewport: { width: 900, height: 700 } });
    await exportPage.goto('file://' + path.join(dir, 'index.html'));
    const result = await exportPage.evaluate(async () => {
      const wrapper = document.querySelector('.pagesnap-component-wrapper');
      const pathEl = document.querySelector('path');
      const rect = wrapper.getBoundingClientRect();
      const rest = pathEl.getAttribute('d');
      const at = async (u) => {
        wrapper.dispatchEvent(new PointerEvent('pointermove', { clientX: rect.left + rect.width * u, clientY: rect.top + rect.height / 2, bubbles: true }));
        await new Promise((r) => setTimeout(r, 600));
        return Number((pathEl.getAttribute('d').match(/L(\d+)/) || [])[1]);
      };
      const quarter = await at(0.25);
      const middle = await at(0.5);
      const end = await at(1);
      wrapper.dispatchEvent(new Event('pointerleave'));
      await new Promise((r) => setTimeout(r, 1500));
      return { quarter, middle, end, backToRest: pathEl.getAttribute('d') === rest };
    });
    assert.ok(result.quarter < result.middle && result.middle < result.end, `pointer X must scrub the recorded states in order, got ${JSON.stringify(result)}`);
    assert.equal(result.backToRest, true, 'leaving the component must return the path to its rest state');
    console.log(`  ✓ [spatial-map player] pointer X scrubs ${result.quarter} < ${result.middle} < ${result.end}, then returns to rest`);
    await page.close();
    await exportPage.close();
  }
  console.log('\nmotion export characterization passed');
} catch (err) {
  console.error('\nmotion export characterization FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
