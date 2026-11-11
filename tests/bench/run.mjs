// plan-exempt — Phase 13 benchmark runner (plan ps-001): honest capability table for reverse-engineered motion
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, injectBundle, captureStates, commonClip, scoreStates, originalReactsPct } from './lib.mjs';
import { CASES } from './cases.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv.slice(2);
const cases = only.length ? CASES.filter((c) => only.includes(c.id)) : CASES;
const VIEW = { width: 1440, height: 900 };

const round = (n, d = 1) => (n === null || n === undefined ? null : Math.round(n * 10 ** d) / 10 ** d);

async function runCase(browser, c) {
  const res = { id: c.id, label: c.label, kind: c.kind, expect: c.expect, source: c.url ? 'real site' : 'local fixture' };
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const scorer = await ctx.newPage();
  try {
    await page.goto(c.url || ('file://' + path.join(__dirname, 'fixtures', c.fixture)), { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(c.settleMs || 2500);
    if (c.prepare) await c.prepare(page);
    await injectBundle(page);
    await page.locator(c.selector).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // 1) identify on the live page (this is what the Studio "Analyze" button runs)
    const t0 = Date.now();
    const model = await page.evaluate(async (sel) => {
      const root = document.querySelector(sel);
      try { return await window.PageSnap.motionIdentify.identify(root, {}); } catch (e) { return { supported: false, reason: 'engine error: ' + e.message }; }
    }, c.selector);
    res.identifyMs = Date.now() - t0;
    res.supported = !!model.supported;
    res.reason = model.reason || '';
    if (model.supported) {
      res.quality = model.quality;
      res.animatedValues = model.series.length + model.discrete.length;
      res.positions = model.measuredPositions;
      res.spring = model.spring ? `k=${model.spring.stiffness} c=${model.spring.damping}` : 'none';
      res.stateless = model.stateless;
      res.axisYPct = model.axisYPct;
      res.holdoutMaxPct = model.selfCheck.maxErrPct;
    }

    // 2) frame the model uses, in page coordinates, and the original's behaviour under a REAL mouse
    await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center', inline: 'center' }), c.selector);
    await page.waitForTimeout(400);
    const frameIdx = model.supported ? model.frameElIndex : 0;
    const frameO = await page.evaluate(({ sel, idx }) => {
      const root = document.querySelector(sel);
      const all = [root, ...Array.from(root.querySelectorAll('*'))];
      const r = (all[idx] || root).getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
    }, { sel: c.selector, idx: frameIdx });
    res.frame = `${frameO.width}x${frameO.height}`;

    // 3) clone from the real export (selfContainedHtml + the same player the exporter emits)
    const exported = await page.evaluate(({ sel, model }) => {
      const root = document.querySelector(sel);
      if (model && model.supported) window.PageSnap.motionIdentify.setModel(root, model);
      const comp = window.PageSnap.extractComponentStyleAndMotion(root);
      return {
        html: comp.selfContainedHtml,
        bg: comp.effectiveBg,
        width: root.getBoundingClientRect().width,
        hasTokensModel: !!JSON.parse(comp.tokensJson).motionModel,
        player: model && model.supported ? window.PageSnap.motionIdentify.buildPlayerScript(model) : ''
      };
    }, { sel: c.selector, model });
    res.tokensCarryModel = exported.hasTokensModel;

    const clonePage = await ctx.newPage();
    await clonePage.setViewportSize(VIEW);
    const left = Math.max(60, Math.min(VIEW.width - exported.width - 60, 120));
    const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:${exported.bg}}#host{position:absolute;left:${left}px;top:140px;width:${exported.width}px}</style></head><body><div id="host">${exported.html}</div><script>${exported.player}</script></body></html>`;
    await clonePage.setContent(doc, { waitUntil: 'load' });
    await clonePage.waitForTimeout(700);
    const frameC = await clonePage.evaluate((idx) => {
      const root = document.querySelector('.ps-el-0');
      const all = [root, ...Array.from(root.querySelectorAll('*'))];
      const r = (all[idx] || root).getBoundingClientRect();
      return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
    }, frameIdx);

    const clip = commonClip(frameO, frameC, VIEW);
    const original = await captureStates(page, frameO, clip.a);
    res.originalReactsPct = await originalReactsPct(scorer, original);
    const clone = await captureStates(clonePage, frameC, clip.b);
    const sc = await scoreStates(scorer, original, clone);
    res.score = sc.score === null ? null : round(sc.score * 100);
    res.restMatchPct = round(sc.restMatch * 100);
    res.motionEnergyPct = sc.motionEnergyPct;
    res.perState = sc.perState.map((s) => ({ at: s.key, score: s.score === null ? null : round(s.score * 100) }));
    await clonePage.close();
  } catch (e) {
    res.error = String(e.message || e).slice(0, 220);
  }
  await ctx.close();
  return res;
}

// What an HONEST tool should have done, as a verdict that does not depend on how we feel about the number.
function verdict(r) {
  if (r.error) return 'ERROR';
  const reacts = (r.originalReactsPct || 0) > 0.05;
  if (r.expect === 'reject') return !r.supported ? 'PASS (declined honestly)' : 'FAIL (claimed support it cannot have)';
  if (r.expect === 'partial') {
    if (!r.supported) return 'FAIL (declined a case it can half-do)';
    return r.quality === 'partial' ? 'PASS (self-labelled partial)' : 'FAIL (overclaimed ' + r.quality + ' on a two-axis response)';
  }
  if (!reacts) return 'FAIL (no visible reaction to measure)';
  if (!r.supported) return 'FAIL (declined but the original reacts)';
  if (r.score === null) return 'FAIL (unscorable)';
  return r.score >= 85 ? 'PASS' : r.score >= 60 ? 'PARTIAL' : 'FAIL';
}

const browser = await launch();
const results = [];
for (const c of cases) {
  process.stdout.write(`> ${c.id} ... `);
  const r = await runCase(browser, c);
  r.verdict = verdict(r);
  results.push(r);
  console.log(r.error ? 'ERROR ' + r.error : `${r.verdict} | supported=${r.supported} quality=${r.quality || '-'} score=${r.score} reacts=${r.originalReactsPct}%`);
}
await browser.close();
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
console.log('\nwrote tests/bench/results.json');
console.table(results.map((r) => ({ id: r.id, expect: r.expect, supported: r.supported, quality: r.quality || '-', score: r.score, reacts: r.originalReactsPct, verdict: r.verdict })));
