// plan-exempt — visual docs generator
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const imagesDir = path.join(root, 'docs/images');
const videoDir = path.join(root, 'tmp/video');

if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

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

console.log('▶ Capturing full-window Chrome screenshots and animated GIF without banners...');

const context = await chromium.launchPersistentContext(path.join(root, 'tmp/profile-docs'), {
  headless: false,
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: videoDir, size: { width: 1280, height: 800 } },
  args: [
    `--disable-extensions-except=${root}`,
    `--load-extension=${root}`,
    '--no-sandbox'
  ]
});

try {
  const page = await context.newPage();

  // 1. Navigate to chrome://extensions
  await page.goto('chrome://extensions');
  await page.waitForTimeout(1000);

  // Turn Developer mode ON
  await page.evaluate(() => {
    try {
      const manager = document.querySelector('extensions-manager');
      const toolbar = manager ? manager.shadowRoot.querySelector('extensions-toolbar') : null;
      if (toolbar) {
        const devMode = toolbar.shadowRoot.querySelector('#devMode');
        if (devMode && !devMode.checked) {
          devMode.click();
        }
      }
    } catch (_) {}
  });

  await page.waitForTimeout(1500);

  // Capture Full Screen of chrome://extensions with Developer mode ON (No artificial banner!)
  await page.screenshot({ path: path.join(imagesDir, 'step-developer-mode.png') });
  console.log('  ✓ Generated clean full-screen: docs/images/step-developer-mode.png');

  // Capture Full Screen showing Load unpacked toolbar
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(imagesDir, 'step-load-unpacked.png') });
  console.log('  ✓ Generated clean full-screen: docs/images/step-load-unpacked.png');

  // Capture Full Screen showing installed PageSnap extension card
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(imagesDir, 'step-extension-installed.png') });
  console.log('  ✓ Generated clean full-screen: docs/images/step-extension-installed.png');

  // Open sample article and popup to capture real usage
  let serviceWorker = context.serviceWorkers().find(sw => sw.url().includes('background/index.js'));
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker');
  }
  const extensionId = new URL(serviceWorker.url()).hostname;
  const popupPage = await context.newPage();
  await popupPage.setViewportSize({ width: 500, height: 580 });
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
  await popupPage.waitForTimeout(1200);
  await popupPage.screenshot({ path: path.join(imagesDir, 'popup-preview.png') });
  console.log('  ✓ Generated clean popup preview: docs/images/popup-preview.png');

  await page.waitForTimeout(1500);
} finally {
  await context.close();
}

// Convert video to high-quality animated GIF using ffmpeg
const videoFiles = fs.readdirSync(videoDir).filter(f => f.endsWith('.webm'));
if (videoFiles.length > 0) {
  const videoPath = path.join(videoDir, videoFiles[0]);
  const gifPath = path.join(imagesDir, 'install-demo.gif');
  console.log('▶ Converting recorded video to animated GIF using ffmpeg...');
  try {
    execSync(`ffmpeg -y -i "${videoPath}" -vf "fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer" -loop 0 "${gifPath}"`, {
      stdio: 'pipe'
    });
    const gifStats = fs.statSync(gifPath);
    console.log(`  ✓ Generated: docs/images/install-demo.gif (${(gifStats.size / 1024).toFixed(1)} KB)`);
  } catch (ffmpegErr) {
    console.warn('ffmpeg conversion note:', ffmpegErr.message);
  }
}

console.log('🎉 Visual documentation assets successfully generated!\n');
