// plan-exempt — real-Chrome download regression test replacing source-text regex tests
/**
 * Real download e2e. Drives a REAL Chrome binary with --headless=new (no window, never steals focus) over
 * raw DevTools — NOT Playwright, which installs its own download interceptor and renames files to GUIDs,
 * hiding exactly the bugs this test exists to catch. Downloads go through Chrome's standard pipeline
 * (no Browser.setDownloadBehavior override). It calls the extension's real downloadFile/downloadFileBlob and
 * asserts, using Chrome's own DownloadItem records plus the files on disk, that every download:
 *   1. reaches state=complete,  2. lands under the exact requested filename,
 *   3. has the exact byte size, 4. leaves no ".com.google.Chrome.*" temp file behind.
 *
 * Usage: npm run test:e2e:download     (override the binary with CHROME_BIN=/path/to/chrome)
 * If no Chrome is installed the test prints SKIP and exits 0 (it cannot run, it did not pass).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CANDIDATES = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const chromeBin = CANDIDATES.find((p) => fs.existsSync(p));
if (!chromeBin) {
  console.log('SKIP: no Chrome binary found (set CHROME_BIN). This test did NOT run.');
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pagesnap-dl-e2e-'));
const profile = path.join(tmp, 'profile');
const outDir = path.join(tmp, 'downloads');
fs.mkdirSync(path.join(profile, 'Default'), { recursive: true });
fs.mkdirSync(outDir);
fs.writeFileSync(path.join(profile, 'Default', 'Preferences'), JSON.stringify({
  download: { default_directory: outDir, prompt_for_download: false, directory_upgrade: true },
  savefile: { default_directory: outDir },
}));

const chrome = spawn(chromeBin, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--enable-unsafe-extension-debugging', '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank',
], { stdio: 'ignore' });
const exited = new Promise((r) => chrome.on('exit', r));

async function cdpEndpoint() {
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 80; i++) {
    if (fs.existsSync(portFile)) {
      const [port] = fs.readFileSync(portFile, 'utf8').split('\n');
      try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) return await r.json(); } catch { /* not ready */ }
    }
    await sleep(250);
  }
  throw new Error('Chrome did not expose DevTools within 20s');
}

// Cases call the extension's REAL functions. Sizes straddle the 2.5 MB data-URL / blob-URL branch boundary.
const MB3 = 3 * 1024 * 1024 + 123;
const CASES = [
  { file: 'md-small.md', bytes: new TextEncoder().encode('# Title\n\ncaf\u00e9 \u2014 utf8\n').length, // plan-exempt — real byte count, neutral unicode
    run: `(await import(U('src/popup/extract.js'))).downloadFile('# Title\\n\\ncaf\\u00e9 \\u2014 utf8\\n','md-small.md','text/markdown;charset=utf-8')` },
  { file: 'html-large.html', bytes: MB3,
    run: `(await import(U('src/popup/extract.js'))).downloadFile('h'.repeat(${MB3}),'html-large.html','text/html;charset=utf-8')` },
  { file: 'package-small.zip', bytes: null, // JSZip output size is not fixed; asserted via PK magic below
    run: `(async()=>{const z=new JSZip();z.file('index.html','<h1>x</h1>');z.file('README.md','# r');(await import(U('src/popup/html-clone.js'))).downloadFileBlob(await z.generateAsync({type:'blob'}),'package-small.zip')})()` },
  { file: 'package-large.zip', bytes: MB3,
    run: `(await import(U('src/popup/html-clone.js'))).downloadFileBlob(new Blob([new Uint8Array(${MB3})],{type:'application/zip'}),'package-large.zip')` },
  // plan-exempt — Component Studio "Download ZIP" (content-script path), data sized like a real Linear component.
  // saveAs:true opens a Save As dialog; headless Chrome has no UI and auto-cancels it, so no file can exist here.
  // This case therefore only proves the promise settles. Its saving behavior is covered by the stale-context case below.
  { file: 'component-healthy.zip', bytes: null, expectResolved: true, noFile: true,
    run: `race(PageSnap.downloadComponentZip(DATA,'component-healthy.zip'), 8000)` },
  // Extension reloaded while the page stays open: chrome.runtime.sendMessage throws. Used to hang "Packaging..." forever.
  { file: 'component-stale-context.zip', bytes: null, expectResolved: true,
    run: `(async()=>{const orig=chrome.runtime.sendMessage;chrome.runtime.sendMessage=()=>{throw new Error('Extension context invalidated.')};try{return await race(PageSnap.downloadComponentZip(DATA,'component-stale-context.zip'), 8000)}finally{chrome.runtime.sendMessage=orig}})()` },
];

const failures = [];
const check = (ok, msg) => { console.log(`${ok ? '  ok ' : ' FAIL'}  ${msg}`); if (!ok) failures.push(msg); };

try {
  const ver = await cdpEndpoint();
  console.log(`Chrome ${ver.Browser} (${chromeBin})\nstandard download pipeline, headless, profile+downloads in ${tmp}\n`);
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  let n = 0; const pending = new Map();
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } });
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = ++n; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); });

  const { id: extId } = await send('Extensions.loadUnpacked', { path: ROOT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${extId}/popup.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await sleep(1500);
  const evalPage = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, userGesture: true, returnByValue: true }, sessionId);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  await evalPage(`globalThis.U = (p) => chrome.runtime.getURL(p); true`);
  await evalPage(`(async()=>{ for (const f of ['src/content/core/namespace.js','src/content/style-extractor/style-extractor.js']) await new Promise((res,rej)=>{const s=document.createElement('script');s.src=chrome.runtime.getURL(f);s.onload=res;s.onerror=()=>rej(new Error('load '+f));document.head.appendChild(s)}); return true })()`);
  await evalPage(`window.DATA={tagName:'div',width:1260,height:360,indexHtml:'<div>'+'x'.repeat(42000)+'</div>',cssOnly:'a{}'.repeat(104000),reactJsx:'j'.repeat(46000),tokensJson:'{}'.repeat(1300),promptMarkdown:'p'.repeat(87000),readmeMd:'# r'};
    window.race=(p,ms)=>{const t0=performance.now();return Promise.race([p.then(v=>({status:'resolved',ms:Math.round(performance.now()-t0)}),e=>({status:'rejected',err:String(e.message||e)})),new Promise(r=>setTimeout(()=>r({status:'PENDING_FOREVER'}),ms))])}; true`);

  for (const c of CASES) { c.out = await evalPage(`(async()=>{ return await (${c.run}) })()`); await sleep(c.bytes && c.bytes > 1e6 ? 3500 : 2000); }
  await sleep(1500);

  const items = await evalPage(`new Promise(r=>chrome.downloads.search({},x=>r(x.map(i=>({state:i.state,error:i.error||'',filename:i.filename,fileSize:i.fileSize})))))`);
  const onDisk = fs.readdirSync(outDir);

  console.log('Chrome DownloadItems:'); items.forEach((i) => console.log(`   ${i.state.padEnd(11)} ${i.error || '-'}  ${path.basename(i.filename)}  ${i.fileSize}B`));
  console.log('Files on disk:', onDisk.join(', ') || '(none)', '\n');

  for (const c of CASES) {
    if (c.expectResolved) check(c.out?.status === 'resolved', `${c.file}: the UI promise settles instead of hanging (got ${JSON.stringify(c.out)})`);
    if (c.noFile) continue;
    const item = items.find((i) => path.basename(i.filename) === c.file);
    check(!!item, `${c.file}: Chrome registered a DownloadItem under the exact requested name`);
    check(item?.state === 'complete', `${c.file}: state is "complete" (got "${item?.state}")`);
    check(onDisk.includes(c.file), `${c.file}: file exists on disk under that exact name`);
    if (onDisk.includes(c.file)) {
      const buf = fs.readFileSync(path.join(outDir, c.file));
      if (c.bytes != null) check(buf.length === c.bytes, `${c.file}: byte size ${buf.length} === expected ${c.bytes}`);
      if (c.file.endsWith('.zip') && c.bytes == null) check(buf.subarray(0, 2).toString() === 'PK', `${c.file}: valid ZIP signature`);
    }
  }
  const leftovers = onDisk.filter((f) => f.startsWith('.com.google.Chrome.') || f.endsWith('.crdownload'));
  check(leftovers.length === 0, `no unfinished temp files left behind (${leftovers.join(', ') || 'none'})`);
  ws.close();
} catch (e) {
  failures.push(`harness error: ${e.message}`); console.log(` FAIL  harness error: ${e.message}`);
} finally {
  chrome.kill('SIGTERM'); await Promise.race([exited, sleep(5000)]);
  for (let i = 0; i < 5; i++) { try { fs.rmSync(tmp, { recursive: true, force: true }); break; } catch { await sleep(500); } }
}

if (failures.length) { console.error(`\n${failures.length} download check(s) FAILED`); process.exit(1); }
console.log('\nall download checks passed');
