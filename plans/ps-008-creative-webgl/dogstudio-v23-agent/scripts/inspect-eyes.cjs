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
        <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
      </head>
      <body>
        <script>
          const loader = new THREE.GLTFLoader();
          const draco = new THREE.DRACOLoader();
          draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.3/');
          loader.setDRACOLoader(draco);

          loader.load('/assets/dog.drc.glb', (gltf) => {
            console.log('GLB loaded successfully!');
            const meshes = [];
            gltf.scene.traverse((child) => {
              if (child.isMesh) {
                const uvs = child.geometry.attributes.uv;
                let uvRange = null;
                if (uvs) {
                  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
                  for (let i = 0; i < uvs.count; i++) {
                    const u = uvs.getX(i);
                    const v = uvs.getY(i);
                    minU = Math.min(minU, u); maxU = Math.max(maxU, u);
                    minV = Math.min(minV, v); maxV = Math.max(maxV, v);
                  }
                  uvRange = { minU, maxU, minV, maxV };
                }
                meshes.push({ name: child.name, verts: child.geometry.attributes.position.count, uvRange });
              }
            });
            window.meshData = meshes;
          }, undefined, (err) => {
            console.error('Load error', err);
            window.meshData = { error: String(err) };
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
  const types = { '.jpg': 'image/jpeg', '.png': 'image/png', '.glb': 'model/gltf-binary', '.json': 'application/json', '.html': 'text/html', '.js': 'application/javascript' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(8927, async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERR:', err));

  await page.goto('http://127.0.0.1:8927/test');
  await page.waitForFunction(() => window.meshData, { timeout: 30000 });
  const data = await page.evaluate(() => window.meshData);
  console.log('Results:', JSON.stringify(data.slice(0, 5), null, 2));
  await browser.close();
  server.close();
});
