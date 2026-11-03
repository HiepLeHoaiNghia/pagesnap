/* plan-exempt — measure DOM positions */
/* routing-override: skipped — test script */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.dds': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  const filePath = path.join(baseDir, reqPath);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(8088, async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await page.goto('http://localhost:8088/index.html');
  await page.waitForFunction(() => window.PAGE_READY);

  const rects = await page.evaluate(() => {
    const hero = document.querySelector('.home-hero');
    const cases = document.querySelector('.home-cases');
    const casesList = document.querySelector('.home-cases-list');
    const about = document.querySelector('.home-about');
    const louise = document.querySelector('a[data-theme="this-was-louises-phone"]');
    const aboutTitle = document.querySelector('.home-about-title');

    function getAbsTop(el) {
      if (!el) return null;
      let top = 0;
      let cur = el;
      while (cur) {
        top += cur.offsetTop;
        cur = cur.offsetParent;
      }
      return top;
    }

    return {
      heroTop: getAbsTop(hero),
      heroHeight: hero ? hero.offsetHeight : null,
      casesTop: getAbsTop(cases),
      casesHeight: cases ? cases.offsetHeight : null,
      casesListTop: getAbsTop(casesList),
      casesListHeight: casesList ? casesList.offsetHeight : null,
      louiseTop: getAbsTop(louise),
      aboutTop: getAbsTop(about),
      aboutHeight: about ? about.offsetHeight : null,
      aboutTitleTop: getAbsTop(aboutTitle),
      docHeight: document.documentElement.scrollHeight
    };
  });

  console.log('DOM positions:', JSON.stringify(rects, null, 2));

  await browser.close();
  server.close();
  process.exit(0);
});
