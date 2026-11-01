const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  let filePath = path.join(baseDir, reqPath);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
    return;
  }
  const ext = path.extname(filePath);
  const types = {
    '.dds': 'image/x-dds',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.glb': 'model/gltf-binary',
    '.json': 'application/json',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript'
  };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(8930, async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1190 } });
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.setContent(`
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

        loader.load('http://127.0.0.1:8930/assets/dog.drc.glb', (gltf) => {
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          window.sceneInfo = {
            boxMin: box.min,
            boxMax: box.max,
            size,
            center,
            sceneChildren: gltf.scene.children.map(c => ({ name: c.name, type: c.type, pos: c.position, rot: c.rotation }))
          };
        });
      </script>
    </body>
    </html>
  `);

  await page.waitForFunction(() => window.sceneInfo, { timeout: 30000 });
  const info = await page.evaluate(() => window.sceneInfo);
  console.log('Scene Info:', JSON.stringify(info, null, 2));
  await browser.close();
  server.close();
});
