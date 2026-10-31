# Goal
Rebuild the interactive Dogstudio webpage with 3D wolf choreography from the PageSnap v19 package in `BASE/input/*`.

# Rules
- BASE = /Users/hiepleh.n/p-source/web2md-extension/plans/ps-008-creative-webgl/dogstudio-v19-agent
- Only inputs: `BASE/input/*` (`AI-PROMPT.md`, `preview-hero.png`, `preview-mid.png`, `preview-bottom.png`, `styles.css`, `index.html`, etc.) and the 3D assets in `BASE/assets/`.
- MUST NOT open or fetch from dogstudio.co. Public CDNs (three.js r128, DRACOLoader, GLTFLoader, Google Fonts) are allowed.
- Follow instructions in `AI-PROMPT.md`:
  1. Inspect the 3 Visual Grounding frames:
     - `preview-hero.png` (Top/Hero): Close-up wolf, head tilted front-left making direct eye contact with viewer. Amber/golden glowing pupil. Dark navy/indigo ambient tint on matcap material.
     - `preview-mid.png` (Mid scroll ~1400px): Wolf recedes and glides left/right to yield room for project list.
     - `preview-bottom.png` (Bottom scroll ~2400px): Wolf rotates ~180 degrees showing its back, tail curving towards front.
  2. Implement Scroll Choreography: Connect `window.scrollY` smoothly to 3D model transforms (rotation, position, zoom) so scrolling between 0px and 2400px transitions seamlessly between the 3 preview poses.
  3. Implement Mouse Parallax: Subtle cursor tracking on pointermove.
  4. Ensure no horizontal overflow at 420, 700, 1500 px. Keep all 14 hover rules.
- Output: `BASE/index.html` (standalone, assets loaded from `./assets/`).
- Self-check with Playwright:
  - Take screenshot at scroll 0px: `BASE/out/v19-hero.png`
  - Take screenshot at scroll 1400px: `BASE/out/v19-mid.png`
  - Take screenshot at scroll 2400px: `BASE/out/v19-bottom.png`
