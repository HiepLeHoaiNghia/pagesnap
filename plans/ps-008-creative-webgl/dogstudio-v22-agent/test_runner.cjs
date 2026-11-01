/* plan-exempt — standalone test script for dogstudio v22 WebGL rebuild */
/* routing-override: skipped — user requested to carry out task directly in PROMPT.md */

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
  if (reqPath === '/') reqPath = '/test_model.html';
  const filePath = path.join(baseDir, reqPath);
  
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
    return;
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(8099, async () => {
  console.log('Server listening on port 8099');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  try {
    await page.goto('http://localhost:8099/test_model.html');
    await page.waitForFunction(() => window.TEST_DONE || window.TEST_ERROR, { timeout: 15000 });
  } catch (e) {
    console.error('Wait failed:', e);
  } finally {
    await browser.close();
    server.close();
  }
});
