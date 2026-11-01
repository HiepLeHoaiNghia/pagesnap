/* plan-exempt — test normalize eye UVs */
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

server.listen(8092, async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  
  await page.goto('http://localhost:8092/test_materials.html');
  await page.waitForFunction(() => window.MAT_READY);

  // Normalize eye UVs and adjust brightness
  await page.evaluate(() => {
    window.model.traverse((ch) => {
      if (ch.geometry && ch.geometry.attributes && ch.geometry.attributes.uv && (ch.name.includes('eye') || ch.name.includes('Eye'))) {
        const uv = ch.geometry.attributes.uv;
        let minU = 999, maxU = -999, minV = 999, maxV = -999;
        for (let i = 0; i < uv.count; i++) {
          minU = Math.min(minU, uv.getX(i));
          maxU = Math.max(maxU, uv.getX(i));
          minV = Math.min(minV, uv.getY(i));
          maxV = Math.max(maxV, uv.getY(i));
        }
        for (let i = 0; i < uv.count; i++) {
          const u = (uv.getX(i) - minU) / (maxU - minU);
          const v = (uv.getY(i) - minV) / (maxV - minV);
          uv.setXY(i, u, v);
        }
        uv.needsUpdate = true;
      }
      // Also adjust body color brightness: matcap tint
      if (ch.name && (ch.name.includes('BODY') || ch.isSkinnedMesh) && ch.material) {
        ch.material.color.set(0x607aa6); // brighter midnight navy
      }
    });
    window.renderer.render(window.scene, window.camera);
  });

  await page.screenshot({ path: '/tmp/normalized_eye_render.png' });
  console.log('Saved /tmp/normalized_eye_render.png');

  await browser.close();
  server.close();
  process.exit(0);
});
