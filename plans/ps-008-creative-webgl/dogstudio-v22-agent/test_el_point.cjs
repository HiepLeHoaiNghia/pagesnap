/* plan-exempt — check elementFromPoint */
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

server.listen(8086, async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await page.goto('http://localhost:8086/index.html');
  await page.waitForFunction(() => window.PAGE_READY);

  await page.evaluate(() => window.scrollTo(0, 2400));
  await page.waitForTimeout(500);

  const elInfo = await page.evaluate(() => {
    const el = document.elementFromPoint(300, 500);
    return {
      tagName: el ? el.tagName : null,
      className: el ? el.className : null,
      id: el ? el.id : null,
      outerHTML: el ? el.outerHTML.slice(0, 200) : null
    };
  });

  console.log('Element at (300, 500):', elInfo);

  // Take screenshot of just DOM text
  await page.screenshot({ path: '/tmp/test_bottom_direct.png' });

  await browser.close();
  server.close();
  process.exit(0);
});
