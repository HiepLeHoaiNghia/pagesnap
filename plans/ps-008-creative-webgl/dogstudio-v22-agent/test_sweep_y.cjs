/* plan-exempt — sweep posY and scale */
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

server.listen(8096, async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await page.goto('http://localhost:8096/test_framing.html?scale=1');
  await page.waitForFunction(() => window.FRAMING_READY);

  const configs = [
    { scale: 11, posX: 1.8, posY: -3.0, rotY: 35, name: 'p1' },
    { scale: 11, posX: 1.8, posY: -4.0, rotY: 35, name: 'p2' },
    { scale: 12, posX: 2.0, posY: -4.5, rotY: 35, name: 'p3' },
    { scale: 12, posX: 2.0, posY: -5.0, rotY: 35, name: 'p4' },
    { scale: 13, posX: 2.2, posY: -5.5, rotY: 35, name: 'p5' },
    { scale: 10, posX: 1.5, posY: -3.5, rotY: 35, name: 'p6' },
  ];

  for (const cfg of configs) {
    await page.evaluate((c) => {
      const model = window.scene.children.find(ch => ch.type === 'Group' || ch.name === 'Scene' || ch.children.length > 0);
      if (model) {
        model.scale.set(c.scale, c.scale, c.scale);
        model.position.set(c.posX, c.posY, 0);
        model.rotation.y = THREE.MathUtils.degToRad(c.rotY);
      }
      window.renderer.render(window.scene, window.camera);
    }, cfg);
    await page.screenshot({ path: `/tmp/framing_${cfg.name}.png` });
    console.log(`Saved /tmp/framing_${cfg.name}.png`);
  }

  await browser.close();
  server.close();
  process.exit(0);
});
