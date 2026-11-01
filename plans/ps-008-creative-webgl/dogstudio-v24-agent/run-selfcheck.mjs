// plan-exempt — execute self-check screenshots in PROMPT.md. routing-override: skipped — direct test execution
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/Users/hiepleh.n/sources/adpul-be-evidence-demo/node_modules/playwright/index.mjs';

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.dds': 'application/octet-stream'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = 8088;
server.listen(PORT, async () => {
  console.log(`Test server listening on http://localhost:${PORT}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1500, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  console.log('Navigating to http://localhost:' + PORT + '/index.html...');
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' });

  // Wait for WebGL model and assets to load
  await page.waitForFunction(() => window.__webglReady === true, { timeout: 15000 });
  console.log('WebGL ready confirmed.');

  // Ensure out dir exists
  if (!fs.existsSync('out')) fs.mkdirSync('out', { recursive: true });

  // 1. Hero Checkpoint (scroll 0px)
  console.log('1. Capturing Hero Checkpoint (scroll 0px)...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'out/v24-hero.png' });
  console.log('Saved out/v24-hero.png');

  // 2. Hover Checkpoint (scroll 1400px, hover over "This Was Louise's Phone")
  console.log('2. Capturing Hover Checkpoint (scroll 1400px, hover Louise)...');
  await page.evaluate(() => window.scrollTo(0, 1400));
  await page.waitForTimeout(600);

  const louiseLink = page.locator('a[data-theme="this-was-louises-phone"]');
  await louiseLink.waitFor({ state: 'visible', timeout: 5000 });
  await louiseLink.hover();
  console.log("Hovered over This Was Louise's Phone");
  await page.waitForTimeout(1000); // Wait for GSAP matcap transition and art opacity
  await page.screenshot({ path: 'out/v24-hover-louise.png' });
  console.log('Saved out/v24-hover-louise.png');

  // 3. Bottom Checkpoint (scroll 2400px)
  console.log('3. Capturing Bottom Checkpoint (scroll 2400px)...');
  // Move mouse away to clear hover state
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo(0, 2400));
  await page.waitForTimeout(1000); // Wait for scroll animation to settle
  await page.screenshot({ path: 'out/v24-bottom.png' });
  console.log('Saved out/v24-bottom.png');

  await browser.close();
  server.close();
  console.log('All 3 self-check screenshots captured successfully!');
});
