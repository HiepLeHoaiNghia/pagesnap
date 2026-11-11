// plan-exempt — ps-007: an agent given the export of dogstudio.co reported "styles.css has no :hover rules, I invented them". routing-override: skipped — user asked to export the page's own hover/focus rules so agents do not have to guess.
/**
 * The export must carry the page's own state rules (:hover, :focus, :active), not only the pixels of the idle state.
 * Each case hovers/focuses the real page and the exported file and compares the computed value.
 */
import assert from 'node:assert/strict';
import { launch, injectBundle } from '../bench/lib.mjs';

const FIXTURE = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body{margin:0;font:16px sans-serif}
  a.btn{display:inline-block;padding:8px 14px;color:#111;background:#eee;text-decoration:none;transition:background .1s,color .1s}
  a.btn:hover{background:#f60;color:#fff}
  .card{width:300px;padding:16px;background:#fff}
  .card:hover{box-shadow:0 8px 20px rgba(0,0,0,.3)}
  .card:hover .title{color:rgb(200,0,0);transform:translateY(-4px)}
  .card .title{display:block;transition:transform .1s,color .1s}
  input.f{border:1px solid #999;outline:none}
  input.f:focus{outline:2px solid rgb(0,0,255)}
  button.b{background:#ddd;border:0;padding:6px}
  button.b:active{background:rgb(10,20,30)}
  body:hover .outside{color:red}
  .only-wide:hover{letter-spacing:3px}
  @media (min-width:600px){ .wide:hover{background:rgb(1,2,3)} }
  .wide{display:block;background:#fff}
</style></head><body><div id="root">
  <a class="btn" href="#">Hover me</a>
  <div class="card"><span class="title">Title</span><p>text</p></div>
  <input class="f" value="x">
  <button class="b">press</button>
  <span class="outside">outside rule</span>
  <div class="wide">wide only</div>
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

  const read = (page, selector, prop) => page.evaluate(([s, p]) => getComputedStyle(document.querySelector(s)).getPropertyValue(p), [selector, prop]);
  const act = async (page, scope, how, target) => {
    const sel = scope + target;
    if (how === 'hover') await page.hover(sel);
    else if (how === 'focus') await page.focus(sel);
    else if (how === 'active') { await page.hover(sel); await page.mouse.down(); }
    await page.waitForTimeout(350);
  };
  const release = async (page) => { await page.mouse.up(); await page.mouse.move(850, 650); await page.waitForTimeout(350); };
  const sameAfter = async (how, target, readSel, prop) => {
    await act(live, '#root ', how, target);
    const want = await read(live, '#root ' + readSel, prop);
    await release(live);
    await act(out, '', how, target);
    const got = await read(out, readSel, prop);
    await release(out);
    assert.equal(got, want, `${readSel} { ${prop} } while ${how}ing ${target}: page "${want}", export "${got}"`);
    return want;
  };

  await check('a:hover background and colour are exported', async () => {
    await sameAfter('hover', 'a.btn', 'a.btn', 'background-color');
    await sameAfter('hover', 'a.btn', 'a.btn', 'color');
  });
  await check('hovering the card exports its box-shadow', () => sameAfter('hover', '.card', '.card', 'box-shadow'));
  await check('hovering the card changes the child title (ancestor hover)', async () => {
    await sameAfter('hover', '.card', '.card .title', 'color');
    await sameAfter('hover', '.card', '.card .title', 'transform');
  });
  await check('input:focus outline is exported', () => sameAfter('focus', 'input.f', 'input.f', 'outline-style'));
  await check('button:active background is exported', () => sameAfter('active', 'button.b', 'button.b', 'background-color'));
  await check('media-conditional hover rule is exported (min-width 600)', () => sameAfter('hover', '.wide', '.wide', 'background-color'));
  await check('idle state is unchanged (no hover leaks into the idle look)', async () => {
    await release(out);
    assert.equal(await read(out, 'a.btn', 'background-color'), await read(live, '#root a.btn', 'background-color'));
    assert.equal(await read(out, '.card .title', 'color'), await read(live, '#root .card .title', 'color'));
  });
  await check('a hover rule whose subject is outside the component (body:hover) does not break the export', async () => {
    assert.ok(html.includes('ps-el-'), 'export produced');
  });

  assert.equal(failures.length, 0, `${failures.length} hover export check(s) failed:\n  - ${failures.join('\n  - ')}`);
  console.log('\nhover export passed');
} catch (err) {
  console.error('\nhover export FAILED:', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
