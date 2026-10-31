// plan-exempt — ps-008: verification test script
import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from '/Users/hiepleh.n/.bun/install/cache/playwright@1.64.1@@@1/index.mjs';

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*'
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(8099, async () => {
  console.log('Static server running on http://127.0.0.1:8099');
  try {
    const browser = await chromium.launch({ headless: true });
    
    // Check horizontal overflow at 420px, 700px, 1500px
    const testWidths = [420, 700, 1500];
    for (const w of testWidths) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await page.goto('http://127.0.0.1:8099/index.html');
      await page.waitForFunction(() => window.__DOG_READY__ === true, { timeout: 15000 });
      
      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth
        };
      });
      console.log(`Viewport ${w}px overflow test:`, overflow.hasOverflow ? 'FAILED' : 'PASSED', overflow);
      await page.close();
    }

    // Capture screenshots at 1500x1190 viewport
    const page = await browser.newPage({ viewport: { width: 1500, height: 1190 } });
    await page.goto('http://127.0.0.1:8099/index.html');
    await page.waitForFunction(() => window.__DOG_READY__ === true, { timeout: 15000 });

    // Wait a brief moment for materials & animation to settle
    await page.waitForTimeout(600);

    // 1. Scroll 0px: BASE/out/v20-hero.png
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(process.cwd(), 'out', 'v20-hero.png') });
    console.log('Saved: out/v20-hero.png');

    // 2. Scroll 1400px: BASE/out/v20-mid.png
    await page.evaluate(() => window.scrollTo(0, 1400));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(process.cwd(), 'out', 'v20-mid.png') });
    console.log('Saved: out/v20-mid.png');

    // 3. Scroll 2400px: BASE/out/v20-bottom.png
    await page.evaluate(() => window.scrollTo(0, 2400));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(process.cwd(), 'out', 'v20-bottom.png') });
    console.log('Saved: out/v20-bottom.png');

    // Verify 14 hover rules
    const hoverRules = await page.evaluate(() => {
      const rules = [];
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules || []) {
            if (rule.selectorText && rule.selectorText.includes(':hover')) {
              rules.push(rule.selectorText);
            }
          }
        } catch (err) {
          console.warn('Cannot read cross-origin stylesheet', err);
        }
      }
      return rules;
    });
    console.log(`Found ${hoverRules.length} hover rules in document:`, hoverRules);

    await browser.close();
  } catch (err) {
    console.error('Verification failed with error:', err);
  } finally {
    server.close();
  }
});
