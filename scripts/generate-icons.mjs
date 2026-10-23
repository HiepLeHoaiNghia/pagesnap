// plan-exempt — icon generator
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'docs/images/pagesnap-logo.svg');
const iconsDir = path.join(root, 'icons');

if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch (e) {
  const home = process.env.HOME || '';
  const candidates = [
    path.join(home, 'sources/adpul-be-evidence-demo/node_modules/playwright/index.mjs'),
    path.join(home, 'MemoryGrid/node_modules/playwright/index.mjs')
  ];
  for (const c of candidates) {
    try {
      ({ chromium } = await import(c));
      if (chromium) break;
    } catch (_) {}
  }
}

if (!chromium) {
  console.error('Playwright not found');
  process.exit(1);
}

const svgContent = fs.readFileSync(svgPath, 'utf8');

console.log('▶ Rasterizing PageSnap logo to PNG icons (128x128, 48x48, 16x16)...');

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  
  const sizes = [128, 48, 16];
  for (const size of sizes) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; }
    body { background: transparent; overflow: hidden; display: flex; justify-content: center; align-items: center; width: ${size}px; height: ${size}px; }
    svg { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`);

    const outPath = path.join(iconsDir, `icon-${size}.png`);
    await page.screenshot({ path: outPath, omitBackground: true });
    const stats = fs.statSync(outPath);
    console.log(`  ✓ Generated: icons/icon-${size}.png (${stats.size} bytes)`);
  }
} finally {
  await browser.close();
}

console.log('🎉 Brand icons generated successfully!\n');
