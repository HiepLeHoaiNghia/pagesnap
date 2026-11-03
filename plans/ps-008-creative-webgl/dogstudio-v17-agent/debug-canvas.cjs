// plan-exempt — ps-008: debug canvas content and stacking context
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = path.resolve('.');
const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  let filePath = path.join(root, reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('404: ' + req.url);
    return;
  }
  const ext = path.extname(filePath);
  const mime = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.glb': 'model/gltf-binary',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.dds': 'application/octet-stream',
    '.svg': 'image/svg+xml'
  }[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(8132, async () => {
  try {
    const executablePath = '/Users/hiepleh.n/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
    const browser = await chromium.launch({ headless: true, executablePath });
    const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
    page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    await page.goto('http://127.0.0.1:8132/index.html');
    await page.waitForFunction(() => window.__DOG_READY__ === true, { timeout: 15000 });
    await page.waitForTimeout(1000);

    // Screenshot canvas directly
    const canvas = page.locator('#canvas-container canvas');
    await canvas.screenshot({ path: 'out/debug-canvas-only.png' });
    console.log('Saved debug-canvas-only.png');

    // What element is at point (1000, 300) where the wolf should be?
    const elemAtPoint = await page.evaluate(() => {
      const el = document.elementFromPoint(1000, 300);
      return el ? { tagName: el.tagName, className: el.className, id: el.id } : null;
    });
    console.log('Element at (1000, 300):', elemAtPoint);

    await browser.close();
  } catch (err) {
    console.error('Debug script error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
