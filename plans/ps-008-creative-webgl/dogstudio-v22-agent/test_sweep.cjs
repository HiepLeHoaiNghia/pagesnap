/* plan-exempt — parameter sweep for framing */
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

server.listen(8097, async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });

  // Test combinations of scale, posX, posY
  // Let's create an interactive test page or evaluate in page
  await page.goto('http://localhost:8097/test_framing.html?scale=1');
  await page.waitForFunction(() => window.FRAMING_READY);

  // Let's test a few configurations
  const configs = [
    { scale: 12, posX: 1.5, posY: -0.5, rotY: 35, name: 'cfg1' },
    { scale: 14, posX: 2.0, posY: -0.8, rotY: 35, name: 'cfg2' },
    { scale: 16, posX: 2.2, posY: -1.0, rotY: 35, name: 'cfg3' },
    { scale: 18, posX: 2.5, posY: -1.2, rotY: 35, name: 'cfg4' },
    { scale: 20, posX: 2.8, posY: -1.5, rotY: 35, name: 'cfg5' },
    { scale: 15, posX: 2.5, posY: -0.5, rotY: 35, name: 'cfg6' },
    { scale: 17, posX: 2.0, posY: 0.0, rotY: 35, name: 'cfg7' },
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
});
