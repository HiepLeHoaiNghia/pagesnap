// plan-exempt — ps-006: an export must keep responding to the window like the original (idea taken from ui-clone-skills: verify at several real viewport widths). routing-override: skipped — user asked to learn from ui-clone-skills and improve the repo.
/**
 * A component captured on a wide window must still reflow when it is opened in a narrower one.
 * The fixture has the three things that make a snapshot of computed pixels break:
 *   - a fluid grid (repeat(3, 1fr)) inside a centred max-width container,
 *   - a percentage width (50%) inside a card,
 *   - an @media rule that turns the grid into one column below 800 px.
 * The original page is measured at three widths first (the premise), then the exported file is measured at the same widths.
 * All checks run and every failure is listed.
 */
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const FIXTURE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body{margin:0;font:14px system-ui;background:#0b0c0e}
  .wrap{max-width:1200px;margin:0 auto;padding:0 16px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .card{padding:16px;background:#223;color:#fff;min-height:60px}
  .title{width:50%;background:#446;height:20px}
  @media (max-width:800px){.grid{grid-template-columns:1fr}.card{padding:8px}}
</style></head><body><div class="wrap"><div class="grid" id="root">
  <div class="card"><div class="title"></div></div><div class="card"><div class="title"></div></div><div class="card"><div class="title"></div></div>
</div></div></body></html>`;

const WIDTHS = [1400, 1000, 600];
const EXPECTED_COLUMNS = { 1400: 3, 1000: 3, 600: 1 };

const measure = (page) => page.evaluate(() => {
  const cards = [...document.querySelectorAll('.card')];
  const lefts = new Set(cards.map((c) => Math.round(c.getBoundingClientRect().left)));
  const t = document.querySelector('.title').getBoundingClientRect();
  const c0 = cards[0].getBoundingClientRect();
  const padding = parseFloat(getComputedStyle(cards[0]).paddingLeft) * 2;
  return { columns: lefts.size, overflowX: Math.max(0, document.documentElement.scrollWidth - innerWidth), titleRatio: +(t.width / Math.max(1, c0.width - padding)).toFixed(2), padLeft: parseFloat(getComputedStyle(cards[0]).paddingLeft) };
});

const failures = [];
async function check(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); } catch (err) { failures.push(`${name}: ${err.message.split('\n')[0]}`); console.log(`  ✗ ${name}`); }
}

const browser = await launch({ headless: true });
try {
  const live = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await live.setContent(FIXTURE);
  await injectBundle(live);
  const html = await live.evaluate(() => window.PageSnap.extractComponentStyleAndMotion(document.getElementById('root')).selfContainedHtml);

  // premise: the original page itself behaves as expected
  for (const w of WIDTHS) {
    await check(`[original @${w}] ${EXPECTED_COLUMNS[w]} column(s), no horizontal overflow`, async () => {
      await live.setViewportSize({ width: w, height: 900 });
      const m = await measure(live);
      assert.equal(m.columns, EXPECTED_COLUMNS[w], `columns ${m.columns}`);
      assert.equal(m.overflowX, 0, `overflow ${m.overflowX}px`);
    });
  }

  // the exported component, captured at 1400, opened at each width
  const out = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await out.setContent('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0">' + html + '</body></html>');
  for (const w of WIDTHS) {
    await out.setViewportSize({ width: w, height: 900 });
    await check(`[export @${w}] ${EXPECTED_COLUMNS[w]} column(s)`, async () => {
      assert.equal((await measure(out)).columns, EXPECTED_COLUMNS[w]);
    });
    await check(`[export @${w}] no horizontal overflow`, async () => {
      const m = await measure(out);
      assert.equal(m.overflowX, 0, `overflow ${m.overflowX}px`);
    });
    await check(`[export @${w}] the 50% title stays about half of its card`, async () => {
      const m = await measure(out);
      assert.ok(m.titleRatio > 0.45 && m.titleRatio < 0.55, `ratio ${m.titleRatio}`);
    });
  }
  await check('[export @600] the @media rule also changes the card padding (16 → 8)', async () => {
    await out.setViewportSize({ width: 600, height: 900 });
    assert.equal((await measure(out)).padLeft, 8);
  });

  assert.equal(failures.length, 0, `${failures.length} responsive check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\nresponsive export passed');
} catch (err) {
  console.error('\nresponsive export FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
