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

server.listen(8929, async () => {
  console.log('Server running on 8929');
});
