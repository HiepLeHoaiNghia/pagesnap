// plan-exempt — Phase 13 benchmark harness (plan ps-001): pixel scorer for reverse-engineered motion
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTENT_BUNDLE } from '../../src/shared/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const extensionPath = path.resolve(__dirname, '../..');

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch (e) {
  const home = process.env.HOME || '';
  for (const candidate of [
    path.join(home, '.claude/skills/gstack/node_modules/playwright/index.mjs'),
    path.join(home, 'sources/adpul-be-evidence-demo/node_modules/playwright/index.mjs')
  ]) {
    try { ({ chromium } = await import(candidate)); if (chromium) break; } catch (err) { /* try next */ }
  }
}
if (!chromium) throw new Error('playwright not found');

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export async function launch() {
  return chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
}

export async function injectBundle(page) {
  for (const file of CONTENT_BUNDLE) {
    await page.addScriptTag({ path: path.join(extensionPath, file) });
  }
}

// Both pages are driven with the REAL mouse along the same path expressed in FRAME coordinates (the element the
// engine identified as the pointer frame), and only a margin around that frame is compared. Layout differences of the
// static export are reported separately (restMatch) and do not leak into the motion score.
export const SCORE_PATH = [[0.1, 0.5], [0.3, 0.5], [0.5, 0.5], [0.7, 0.5], [0.9, 0.5], [0.5, 0.2], [0.5, 0.8]];

async function settleShot(page, clip) {
  let prev = null;
  for (let i = 0; i < 24; i++) {
    const shot = await page.screenshot({ clip });
    if (prev && shot.equals(prev)) return shot;
    prev = shot;
    await page.waitForTimeout(110);
  }
  return prev;
}

// frame: {x,y,width,height} the pointer path is expressed in; clip: region that is photographed
export async function captureStates(page, frame, clip, pathPoints = SCORE_PATH) {
  const out = [];
  await page.mouse.move(Math.max(2, clip.x - 40), Math.max(2, frame.y + frame.height / 2), { steps: 6 });
  await page.waitForTimeout(300);
  out.push({ key: 'rest', png: await settleShot(page, clip) });
  for (const [u, v] of pathPoints) {
    await page.mouse.move(frame.x + u * frame.width, frame.y + v * frame.height, { steps: 12 });
    out.push({ key: `${u},${v}`, png: await settleShot(page, clip) });
  }
  await page.mouse.move(Math.max(2, clip.x - 40), Math.max(2, frame.y + frame.height / 2), { steps: 8 });
  return out;
}

// Common clip for two pages: the frame plus a margin, shrunk until it fits inside both viewports.
export function commonClip(frameA, frameB, viewport, marginRatio = 0.14) {
  const m0 = Math.round(Math.max(frameA.width, frameA.height) * marginRatio);
  const room = (f) => Math.min(f.x, f.y, viewport.width - (f.x + f.width), viewport.height - (f.y + f.height));
  const m = Math.max(0, Math.min(m0, room(frameA), room(frameB)));
  const mk = (f) => ({ x: Math.round(f.x - m), y: Math.round(f.y - m), width: Math.round(f.width + 2 * m), height: Math.round(f.height + 2 * m) });
  return { a: mk(frameA), b: mk(frameB), margin: m };
}

const DECODE = `
  const decode = async (b64) => {
    const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
    const cv = new OffscreenCanvas(bmp.width, bmp.height);
    const cx = cv.getContext('2d');
    cx.drawImage(bmp, 0, 0);
    return cx.getImageData(0, 0, bmp.width, bmp.height);
  };`;

const enc = (arr) => arr.map((s) => ({ key: s.key, b64: s.png.toString('base64') }));

/**
 * Energy-weighted score. Raw pixel similarity is useless here (the static parts match on any clone), so each hover
 * state is compared as a CHANGE from that page's own rest frame:
 *   error  = sum |dOriginal - dClone|   (per channel, tiny anti-alias deltas ignored)
 *   energy = sum |dOriginal|
 *   score  = 1 - error/energy           (a static clone scores exactly 0, a perfect one 1)
 */
export async function scoreStates(scorerPage, original, clone) {
  return scorerPage.evaluate(async ({ O, C, DECODE_SRC }) => {
    const decode = new Function('return (async (b64) => {' + DECODE_SRC + ' return decode(b64); })')();
    const oImgs = await Promise.all(O.map((s) => decode(s.b64)));
    const cImgs = await Promise.all(C.map((s) => decode(s.b64)));
    const w = Math.min(oImgs[0].width, cImgs[0].width);
    const h = Math.min(oImgs[0].height, cImgs[0].height);
    const px = (img, x, y, c) => img.data[(y * img.width + x) * 4 + c];
    const NOISE = 6;
    let restDiff = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) restDiff += Math.abs(px(oImgs[0], x, y, c) - px(cImgs[0], x, y, c));
    const rows = [];
    let sumErr = 0;
    let sumEnergy = 0;
    for (let k = 1; k < oImgs.length; k++) {
      let err = 0;
      let energy = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          for (let c = 0; c < 3; c++) {
            let dO = px(oImgs[k], x, y, c) - px(oImgs[0], x, y, c);
            let dC = px(cImgs[k], x, y, c) - px(cImgs[0], x, y, c);
            if (Math.abs(dO) < NOISE) dO = 0;
            if (Math.abs(dC) < NOISE) dC = 0;
            energy += Math.abs(dO);
            err += Math.abs(dO - dC);
          }
        }
      }
      sumErr += err;
      sumEnergy += energy;
      rows.push({ key: O[k].key, energy, score: energy > 0 ? Math.max(0, 1 - err / energy) : null });
    }
    return {
      score: sumEnergy > 0 ? Math.max(0, 1 - sumErr / sumEnergy) : null,
      motionEnergyPct: Math.round((sumEnergy / (w * h * 3 * 255 * rows.length)) * 10000) / 100,
      restMatch: 1 - restDiff / (w * h * 3 * 255),
      width: w,
      height: h,
      perState: rows
    };
  }, { O: enc(original), C: enc(clone), DECODE_SRC: DECODE });
}

// Does the ORIGINAL react visibly to the pointer at all (independent of what we managed to rebuild)?
export async function originalReactsPct(scorerPage, original) {
  return scorerPage.evaluate(async ({ O, DECODE_SRC }) => {
    const decode = new Function('return (async (b64) => {' + DECODE_SRC + ' return decode(b64); })')();
    const imgs = await Promise.all(O.map((s) => decode(s.b64)));
    let changed = 0;
    for (let k = 1; k < imgs.length; k++) {
      for (let i = 0; i < imgs[0].data.length; i += 4) {
        const d = Math.abs(imgs[k].data[i] - imgs[0].data[i]) + Math.abs(imgs[k].data[i + 1] - imgs[0].data[i + 1]) + Math.abs(imgs[k].data[i + 2] - imgs[0].data[i + 2]);
        if (d > 18) changed++;
      }
    }
    return Math.round((changed / ((imgs.length - 1) * imgs[0].width * imgs[0].height)) * 10000) / 100;
  }, { O: enc(original), DECODE_SRC: DECODE });
}
