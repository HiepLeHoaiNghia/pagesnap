/* plan-exempt — inspect fx-letter style */
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

server.listen(8085, async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await page.goto('http://localhost:8085/index.html');
  await page.waitForFunction(() => window.PAGE_READY);

  const styleInfo = await page.evaluate(() => {
    const el = document.querySelector('.ps-el-253');
    const s = window.getComputedStyle(el);
    const parentS = window.getComputedStyle(el.parentElement);
    const grandparentS = window.getComputedStyle(el.parentElement.parentElement);
    return {
      text: el.textContent,
      color: s.color,
      fontSize: s.fontSize,
      fontFamily: s.fontFamily,
      opacity: s.opacity,
      visibility: s.visibility,
      display: s.display,
      transform: s.transform,
      parentDisplay: parentS.display,
      parentOpacity: parentS.opacity,
      parentTransform: parentS.transform,
      grandparentOpacity: grandparentS.opacity
    };
  });

  console.log('ps-el-253 computed style:', styleInfo);

  // Also check why in hero "We Make Good Shit" was visible:
  const heroLetter = await page.evaluate(() => {
    const el = document.querySelector('.ps-el-16');
    const s = window.getComputedStyle(el);
    return {
      text: el.textContent,
      color: s.color,
      fontSize: s.fontSize,
      opacity: s.opacity,
      visibility: s.visibility
    };
  });
  console.log('ps-el-16 hero letter:', heroLetter);

  await browser.close();
  server.close();
  process.exit(0);
});
