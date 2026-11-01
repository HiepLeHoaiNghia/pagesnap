/* plan-exempt — debug home-about visibility */
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

server.listen(8087, async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await page.goto('http://localhost:8087/index.html');
  await page.waitForFunction(() => window.PAGE_READY);

  await page.evaluate(() => window.scrollTo(0, 2400));
  await page.waitForTimeout(500);

  const debug = await page.evaluate(() => {
    const about = document.querySelector('.home-about');
    const title = document.querySelector('.home-about-title');
    const header = document.querySelector('.home-about-header');
    const text = document.querySelector('.home-about-text');

    function info(el) {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
        opacity: style.opacity,
        visibility: style.visibility,
        display: style.display,
        color: style.color,
        zIndex: style.zIndex
      };
    }

    return {
      about: info(about),
      header: info(header),
      title: info(title),
      text: info(text)
    };
  });

  console.log('Debug info:', JSON.stringify(debug, null, 2));

  await browser.close();
  server.close();
  process.exit(0);
});
