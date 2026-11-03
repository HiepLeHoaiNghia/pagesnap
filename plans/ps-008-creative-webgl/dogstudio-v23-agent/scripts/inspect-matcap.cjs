const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  let filePath = path.join(baseDir, req.url.split('?')[0]);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  const types = { '.jpg': 'image/jpeg', '.png': 'image/png', '.glb': 'model/gltf-binary', '.json': 'application/json', '.html': 'text/html' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(8925, async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8925/input/index.html');
  const slots = await page.evaluate(async () => {
    const img = new Image();
    img.src = '/assets/matcap-combined-resized.jpg';
    await new Promise(r => img.onload = r);
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const res = [];
    for (let i = 0; i < 20; i++) {
      const col = i % 10;
      const row = Math.floor(i / 10);
      const cx = col * 256 + 128;
      const cy = row * 256 + 128;
      const p = ctx.getImageData(cx, cy, 1, 1).data;
      res.push({ slot: i, col, row, rgb: [p[0], p[1], p[2]] });
    }
    return res;
  });
  console.log('Slots:', slots);
  await browser.close();
  server.close();
});
