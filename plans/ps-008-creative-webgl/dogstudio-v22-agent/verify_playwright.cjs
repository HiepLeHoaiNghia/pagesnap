/* plan-exempt — dogstudio v22 Playwright self-check */
/* routing-override: skipped — user requested self-check in PROMPT.md */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const baseDir = __dirname;
const outDir = path.join(baseDir, 'out');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

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
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(baseDir, reqPath);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*'
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(8089, async () => {
  console.log('Test server running at http://localhost:8089');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1500, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));

  try {
    console.log('Navigating to http://localhost:8089/index.html ...');
    await page.goto('http://localhost:8089/index.html', { waitUntil: 'networkidle' });

    console.log('Waiting for 3D model & materials to be ready ...');
    await page.waitForFunction(() => window.PAGE_READY === true, { timeout: 20000 });
    // Allow an extra 500ms for initial render frame to stabilize
    await page.waitForTimeout(500);

    // 1. Hero Screenshot (scroll 0px)
    console.log('Capturing v22-hero.png at scroll 0px ...');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, 'v22-hero.png') });
    console.log('Saved BASE/out/v22-hero.png');

    // 2. Hover Louise Screenshot (scroll 1400px, hover over "This Was Louise's Phone")
    console.log('Scrolling to 1400px and hovering Louise link ...');
    await page.evaluate(() => window.scrollTo(0, 1400));
    await page.waitForTimeout(400);

    // Find and hover the Louise link
    const louiseLink = await page.locator('.home-cases-list a:has-text("Louise")').first();
    await louiseLink.hover();
    // Wait for GSAP transition (0.5s duration) to complete
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, 'v22-hover-louise.png') });
    console.log('Saved BASE/out/v22-hover-louise.png');

    // 3. Bottom Screenshot (scroll 2400px)
    console.log('Scrolling to 2400px for bottom screenshot ...');
    // Clear hover first
    await page.mouse.move(0, 0);
    await page.evaluate(() => window.scrollTo(0, 2400));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, 'v22-bottom.png') });
    console.log('Saved BASE/out/v22-bottom.png');

    console.log('All screenshots captured successfully!');
  } catch (err) {
    console.error('Test run failed:', err);
  } finally {
    await browser.close();
    server.close();
    process.exit(0);
  }
});
