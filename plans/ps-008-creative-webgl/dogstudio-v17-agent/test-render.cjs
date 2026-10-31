// plan-exempt — ps-008: test and verification script
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { spawnSync } = require('child_process');

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

server.listen(8130, async () => {
  console.log('HTTP server running on 8130');
  try {
    const executablePath = '/Users/hiepleh.n/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
    const browser = await chromium.launch({ headless: true, executablePath });
    
    // 1. Check overflow at 1500, 700, 420
    for (const w of [1500, 700, 420]) {
      const page = await browser.newPage({ viewport: { width: w, height: 900 } });
      await page.goto('http://127.0.0.1:8130/index.html');
      await page.waitForFunction(() => window.__DOG_READY__ === true, { timeout: 15000 });
      
      const metrics = await page.evaluate(() => {
        return {
          innerWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth
        };
      });
      console.log(`Viewport ${w}px metrics:`, metrics);
      if (metrics.hasOverflow) {
        console.error(`WARNING: Horizontal overflow detected at ${w}px!`);
      } else {
        console.log(`SUCCESS: No horizontal overflow at ${w}px.`);
      }
      await page.close();
    }

    // 2. Capture screenshot at 1500x900
    const page1500 = await browser.newPage({ viewport: { width: 1500, height: 900 } });
    await page1500.goto('http://127.0.0.1:8130/index.html');
    await page1500.waitForFunction(() => window.__DOG_READY__ === true, { timeout: 15000 });
    // wait 1 second for initial render settling
    await page1500.waitForTimeout(1000);
    
    fs.mkdirSync('out', { recursive: true });
    await page1500.screenshot({ path: 'out/rebuild-1500x900.png' });
    console.log('Saved screenshot to out/rebuild-1500x900.png');

    await browser.close();

    // 3. Compare with preview.png via ffmpeg overlay
    console.log('Generating comparison diff...');
    spawnSync('ffmpeg', [
      '-y',
      '-i', 'input/preview.png',
      '-i', 'out/rebuild-1500x900.png',
      '-filter_complex', 'blend=all_mode=difference',
      'out/diff-1500x900.png'
    ]);
    spawnSync('ffmpeg', [
      '-y',
      '-i', 'input/preview.png',
      '-i', 'out/rebuild-1500x900.png',
      '-filter_complex', 'blend=all_mode=addition:all_opacity=0.5',
      'out/blend-1500x900.png'
    ]);
    console.log('Done!');
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
