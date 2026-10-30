import { launch, injectBundle } from '../../../../tests/bench/lib.mjs';
const browser = await launch();
const page = await browser.newPage({viewport:{width:1440,height:900}});
await page.goto('https://linear.app',{waitUntil:'domcontentloaded'}); await page.waitForTimeout(4500);
await injectBundle(page);
await page.evaluate(() => {
  const root=[...document.querySelectorAll('div')].find(x=>{const rr=x.getBoundingClientRect(); return rr.width>1300&&rr.width<1400&&rr.height>440&&rr.height<500 && x.querySelector('svg.GJ9TEa_momentum');});
  root.scrollIntoView({block:'center',behavior:'instant'}); window.__ROOT__=root; window.PageSnap.showFloatingActionsBar(root);
});
await page.waitForTimeout(800);
const dock = await page.evaluate(() => [...document.querySelectorAll('#pagesnap-region-actions-bar button')].filter(b=>b.offsetParent!==null).map(b=>b.innerText.trim()));
console.log('DOCK visible buttons:', dock.length, JSON.stringify(dock));
await page.evaluate(() => { document.getElementById('pagesnap-region-actions-bar')?.remove(); window.PageSnap.openComponentStudioModal(window.__ROOT__); });
await page.waitForTimeout(1500);
const studio = await page.evaluate(() => {
  const m=document.getElementById('pagesnap-component-studio-modal');
  const vis=[...m.querySelectorAll('button')].filter(b=>b.offsetParent!==null && getComputedStyle(b).display!=='none');
  const tabs=vis.filter(b=>b.hasAttribute('data-studio-tab')).map(b=>b.innerText.trim());
  const others=vis.filter(b=>!b.hasAttribute('data-studio-tab')).map(b=>b.innerText.trim()||b.getAttribute('aria-label')||'(icon)');
  return {total:vis.length, tabs, others};
});
console.log('STUDIO (Live Preview tab) visible buttons:', studio.total, '| tabs:', studio.tabs.length, '| non-tab buttons:', studio.others.length);
console.log('  tabs  :', JSON.stringify(studio.tabs));
console.log('  others:', JSON.stringify(studio.others));
await page.evaluate(() => document.getElementById('pagesnap-component-studio-modal').querySelector('[data-studio-tab="html"]').click());
await page.waitForTimeout(400);
const htmlTab = await page.evaluate(() => { const m=document.getElementById('pagesnap-component-studio-modal'); return [...m.querySelectorAll('button')].filter(b=>b.offsetParent!==null && getComputedStyle(b).display!=='none').length; });
console.log('STUDIO (HTML tab) visible buttons:', htmlTab);
await browser.close();
