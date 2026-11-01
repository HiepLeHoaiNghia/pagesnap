/* plan-exempt — inspect eye mesh UVs */
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

server.listen(8093, async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  page.on('console', msg => console.log('PAGE:', msg.text()));

  await page.goto('http://localhost:8093/test_materials.html');
  await page.waitForFunction(() => window.MAT_READY);

  const uvInfo = await page.evaluate(() => {
    let eyeMesh = null;
    window.model.traverse((ch) => {
      if (ch.name.includes('eye') || ch.name.includes('Eye')) {
        eyeMesh = ch;
      }
    });
    if (!eyeMesh) return 'No eye mesh found!';
    const geom = eyeMesh.geometry;
    const uvAttr = geom.attributes.uv;
    if (!uvAttr) return 'No UV attribute on eye mesh!';
    let minU = 999, maxU = -999, minV = 999, maxV = -999;
    for (let i = 0; i < uvAttr.count; i++) {
      const u = uvAttr.getX(i);
      const v = uvAttr.getY(i);
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    return {
      name: eyeMesh.name,
      vertexCount: uvAttr.count,
      uvRange: { minU, maxU, minV, maxV },
      material: eyeMesh.material.type,
      map: !!eyeMesh.material.map
    };
  });
  console.log('Eye UV info:', JSON.stringify(uvInfo, null, 2));

  await browser.close();
  server.close();
  process.exit(0);
});
