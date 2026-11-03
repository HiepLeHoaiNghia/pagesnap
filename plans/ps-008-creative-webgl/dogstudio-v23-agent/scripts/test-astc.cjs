const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/ASTCLoader.js"></script>
      </head>
      <body>
        <script>
          const loader = new THREE.ASTCLoader();
          loader.load('/assets/branches_normals.dds', (tex) => {
            console.log('ASTC loaded:', tex);
            window.astcResult = { ok: true, width: tex.image.width, height: tex.image.height };
          }, undefined, (err) => {
            console.error('ASTC error:', err);
            window.astcResult = { ok: false, error: String(err) };
          });
        </script>
      </body>
      </html>
    `);
    return;
  }
  let filePath = path.join(baseDir, reqPath);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  const types = { '.dds': 'image/x-dds', '.jpg': 'image/jpeg', '.png': 'image/png', '.glb': 'model/gltf-binary', '.json': 'application/json', '.html': 'text/html', '.js': 'application/javascript' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(8928, async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERR:', err));

  await page.goto('http://127.0.0.1:8928/test');
  await page.waitForFunction(() => window.astcResult, { timeout: 10000 });
  const data = await page.evaluate(() => window.astcResult);
  console.log('ASTC Result:', data);
  await browser.close();
  server.close();
});
