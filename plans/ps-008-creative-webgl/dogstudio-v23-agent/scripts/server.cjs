const http = require('http');
const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
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

const PORT = 3456;
server.listen(PORT, () => {
  console.log(`Test server running at http://127.0.0.1:${PORT}`);
});
