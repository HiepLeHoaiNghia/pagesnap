/* plan-exempt — anim sweep */
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

server.listen(8095, async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  await page.goto('http://localhost:8095/test_anim.html');
  await page.waitForFunction(() => window.FRAMING_READY);

  const configs = [
    { scale: 12, posX: 2.0, posY: -4.5, rotY: 35, name: 'a1' },
    { scale: 12, posX: 2.0, posY: -4.5, rotY: 0, name: 'a2' },
    { scale: 12, posX: 2.0, posY: -4.5, rotY: -35, name: 'a3' },
    { scale: 12, posX: 2.0, posY: -4.5, rotY: 60, name: 'a4' },
    { scale: 12, posX: 1.5, posY: -3.8, rotY: 45, name: 'a5' },
  ];

  for (const cfg of configs) {
    await page.evaluate((c) => {
      const model = window.model;
      if (model) {
        model.scale.set(c.scale, c.scale, c.scale);
        model.position.set(c.posX, c.posY, 0);
        model.rotation.y = THREE.MathUtils.degToRad(c.rotY);
      }
      if (window.mixer) {
        window.mixer.setTime(0.5);
      }
      window.renderer.render(window.scene, window.camera);
    }, cfg);
    await page.screenshot({ path: `/tmp/anim_${cfg.name}.png` });
    console.log(`Saved /tmp/anim_${cfg.name}.png`);
  }

  await browser.close();
  server.close();
  process.exit(0);
});
