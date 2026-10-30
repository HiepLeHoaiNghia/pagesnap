// plan-exempt — ps-006: found while looking at a real clone (cursor.com): link underlines came back because computed "none" values were dropped and text-decoration was never captured. routing-override: skipped — user asked to see a real clone and fix what shows.
/**
 * An export must not bring back browser defaults the page had switched off, and must not lose text styling.
 * Each case: the original page switches a default off (or on); the exported file, rendered alone, must compute the same value.
 */
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const FIXTURE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  a{color:#09f}
  .plain{text-decoration:none}
  .under{text-decoration:underline dotted #f60}
  ul.flat{list-style:none;padding:0}
  .hidden{display:none}
  em.upright{font-style:normal}
  .ghost{pointer-events:none}
  .upper{text-transform:uppercase}
  .nowrap{white-space:nowrap}
  img.cover{width:80px;height:40px;object-fit:cover}
  .pointer{cursor:pointer}
</style></head><body><div id="root">
  <a class="plain" href="#">plain link</a>
  <a class="under" href="#">underlined link</a>
  <ul class="flat"><li>one</li><li>two</li></ul>
  <p class="hidden">hidden</p>
  <em class="upright">upright</em>
  <span class="ghost">ghost</span>
  <span class="upper">upper</span>
  <span class="nowrap">no wrap</span>
  <img class="cover" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==">
  <span class="pointer">pointer</span>
</div></body></html>`;

const failures = [];
async function check(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); } catch (err) { failures.push(`${name}: ${err.message.split('\n')[0]}`); console.log(`  ✗ ${name}`); }
}

const browser = await launch({ headless: true });
try {
  const live = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await live.setContent(FIXTURE);
  await injectBundle(live);
  const html = await live.evaluate(() => window.PageSnap.extractComponentStyleAndMotion(document.getElementById('root')).selfContainedHtml);
  const out = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await out.setContent('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0">' + html + '</body></html>');

  const computed = (page, selector, prop) => page.evaluate(([s, p]) => { const e = document.querySelector(s); return e ? getComputedStyle(e).getPropertyValue(p) : 'MISSING'; }, [selector, prop]);
  const same = async (selector, prop) => {
    const want = await computed(live, '#root ' + selector, prop);
    const got = await computed(out, selector, prop);
    assert.equal(got, want, `${selector} { ${prop} } was "${want}" on the page, "${got}" in the export`);
  };

  await check('a link whose underline the page switched off stays without underline', () => same('a.plain', 'text-decoration-line'));
  await check('a link the page underlines keeps its underline (dotted, orange)', async () => { await same('a.under', 'text-decoration-line'); await same('a.under', 'text-decoration-style'); await same('a.under', 'text-decoration-color'); });
  await check('list bullets the page switched off stay off', () => same('ul.flat li', 'list-style-type'));
  await check('an element the page hides stays hidden', async () => { assert.equal(await computed(out, 'p.hidden', 'display'), 'none'); });
  await check('an <em> the page made upright stays upright', () => same('em.upright', 'font-style'));
  await check('pointer-events: none is kept', () => same('span.ghost', 'pointer-events'));
  await check('text-transform is kept', () => same('span.upper', 'text-transform'));
  await check('white-space is kept', () => same('span.nowrap', 'white-space'));
  await check('object-fit is kept', () => same('img.cover', 'object-fit'));
  await check('cursor is kept', () => same('span.pointer', 'cursor'));

  assert.equal(failures.length, 0, `${failures.length} style fidelity check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\nstyle fidelity passed');
} catch (err) {
  console.error('\nstyle fidelity FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
