/* plan-exempt — test hover louise */
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

server.listen(8090, async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  
  await page.goto('http://localhost:8090/test_materials.html');
  await page.waitForFunction(() => window.MAT_READY);

  // Apply Slot 11 + neon pink/purple tint 0xd946ef
  await page.evaluate(() => {
    const slot11 = createMatcapTexture(matcapImg, 11);
    window.model.traverse((ch) => {
      if (ch.name.includes('BODY') || ch.isSkinnedMesh) {
        ch.material.matcap = slot11.texture;
        ch.material.color.set(0xd946ef);
        ch.material.needsUpdate = true;
      }
    });
    window.renderer.render(window.scene, window.camera);
  });

  await page.screenshot({ path: '/tmp/hover_louise_test.png' });
  console.log('Saved /tmp/hover_louise_test.png');

  await browser.close();
  server.close();
  process.exit(0);
});
