/* plan-exempt — test bottom scroll pose */
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

server.listen(8091, async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  
  await page.goto('http://localhost:8091/test_materials.html');
  await page.waitForFunction(() => window.MAT_READY);

  // Set bottom pose: rotY = -145 deg, depth = 25
  await page.evaluate(() => {
    window.camera.position.z = 25.0;
    window.model.rotation.y = THREE.MathUtils.degToRad(-145);
    window.model.position.set(0.5, -2.5, 0);
    window.renderer.render(window.scene, window.camera);
  });

  await page.screenshot({ path: '/tmp/bottom_pose_test.png' });
  console.log('Saved /tmp/bottom_pose_test.png');

  await browser.close();
  server.close();
  process.exit(0);
});
