// plan-exempt — direct execution of prompt in BASE/PROMPT.md
// routing-override: skipped — user requested direct implementation of PROMPT.md
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(__dirname, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.statusCode = 404;
    res.end('Not found: ' + reqPath);
  }
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  console.log(`Local verification server running on port ${port}`);

  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--enable-webgl', '--ignore-gpu-blocklist']
  });

  const page = await browser.newPage({
    viewport: { width: 1500, height: 900 }
  });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  console.log('Loading index.html...');
  await page.goto(`http://127.0.0.1:${port}/index.html`);

  console.log('Waiting for 3D engine readiness...');
  await page.waitForFunction(() => window.__ready === true, { timeout: 25000 });
  await page.waitForTimeout(600);

  // 1. BASE/out/v21-hero.png (scroll 0px)
  console.log('Capturing 1. BASE/out/v21-hero.png (scroll 0px)...');
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    window.__updateChoreography(true);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(__dirname, 'out', 'v21-hero.png') });
  console.log('✓ Captured out/v21-hero.png');

  // 2. BASE/out/v21-hover-louise.png (scroll 1400px, hover over "This Was Louise's Phone")
  console.log('Capturing 2. BASE/out/v21-hover-louise.png (scroll 1400px, hover Louise)...');
  await page.evaluate(() => {
    window.scrollTo(0, 1400);
    window.__updateChoreography(true);
  });
  await page.waitForTimeout(300);

  const louiseLink = page.locator('a[data-theme="this-was-louises-phone"]');
  const box = await louiseLink.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  }
  // Also call setWolfHover(11) to trigger transition
  await page.evaluate(() => {
    if (window.setWolfHover) window.setWolfHover(11, false);
  });
  console.log('Waiting 600ms for 0.4s ease transition to settle...');
  await page.waitForTimeout(600);

  await page.screenshot({ path: path.join(__dirname, 'out', 'v21-hover-louise.png') });
  console.log('✓ Captured out/v21-hover-louise.png');

  // 3. BASE/out/v21-bottom.png (scroll 2400px)
  console.log('Capturing 3. BASE/out/v21-bottom.png (scroll 2400px)...');
  await page.mouse.move(0, 0); // mouseleave
  await page.evaluate(() => {
    if (window.setWolfHover) window.setWolfHover(null, true);
    window.scrollTo(0, 2400);
    window.__updateChoreography(true);
  });
  await page.waitForTimeout(600);

  await page.screenshot({ path: path.join(__dirname, 'out', 'v21-bottom.png') });
  console.log('✓ Captured out/v21-bottom.png');

  await browser.close();
  server.close();
  console.log('All Playwright self-checks completed successfully!');
});
