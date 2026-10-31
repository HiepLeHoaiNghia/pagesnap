# Goal
Rebuild the interactive Dogstudio webpage with exact 3D wolf choreography from the PageSnap v20 package in `BASE/input/*`.

# Rules
- BASE = /Users/hiepleh.n/p-source/web2md-extension/plans/ps-008-creative-webgl/dogstudio-v20-agent
- Only inputs: `BASE/input/*` (`AI-PROMPT.md`, `preview-hero.png`, `preview-mid.png`, `preview-bottom.png`, `styles.css`, `index.html`, etc.) and the 3D assets in `BASE/assets/`.
- MUST NOT open or fetch from dogstudio.co. Public CDNs (three.js r128, DRACOLoader, GLTFLoader, Google Fonts) are allowed.
- Follow instructions in `AI-PROMPT.md`:
  1. Inspect the 3 Visual Grounding frames (`preview-hero.png`, `preview-mid.png`, `preview-bottom.png`).
  2. Implement EXACT Spline Choreography:
     - Read the JSON in section `Exact Choreography Spline Poses (Observed)` in `AI-PROMPT.md`:
       * `DEPTH: [1, 18, 30, 35, 25, 20]` -> interpolate `camera.position.z`
       * `V_ROTATION: [60, 36.7, 53, 53, -80, -150]` -> interpolate `dog.rotation.y` in radians (`deg * Math.PI / 180`)
       * `H_ROTATION: [0, -7.8, -2.2, 14, 25, 12]` -> interpolate `dog.rotation.x` in radians
       * `X_OFFSET: [2, -1.5, -0.4, -0.4, -1, -1]` -> interpolate `dog.position.x`
       * `Y_OFFSET: [-5, -1.2, 0.9, 0, 0, 0]` -> interpolate `dog.position.y`
     - As user scrolls from 0px to maxScroll, interpolate smoothly across these 6 poses.
  3. Visual & Material Detailing:
     - Hero framing: Close-up wolf with dark navy tint (`0x253048` or `0x324058`) on matcap material.
     - Eyes: Dedicated material with glowing amber/gold pupils making direct eye contact.
  4. Ensure no horizontal overflow at 420, 700, 1500 px. Keep all 14 hover rules.
- Output: `BASE/index.html` (standalone, assets loaded from `./assets/`).
- Self-check with Playwright:
  - Take screenshot at scroll 0px: `BASE/out/v20-hero.png`
  - Take screenshot at scroll 1400px: `BASE/out/v20-mid.png`
  - Take screenshot at scroll 2400px: `BASE/out/v20-bottom.png`
