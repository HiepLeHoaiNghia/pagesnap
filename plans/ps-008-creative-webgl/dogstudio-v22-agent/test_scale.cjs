/* plan-exempt — scale test */
/* routing-override: skipped — test script */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

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

server.listen(8098, async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  
  const scales = [1, 5, 8, 10, 12, 15];
  for (const s of scales) {
    await page.goto(`http://localhost:8098/test_framing.html?scale=${s}`);
    await page.waitForFunction(() => window.FRAMING_READY, { timeout: 10000 });
    await page.screenshot({ path: `/tmp/scale_${s}.png` });
    console.log(`Saved /tmp/scale_${s}.png`);
  }
  
  await browser.close();
  server.close();
});
