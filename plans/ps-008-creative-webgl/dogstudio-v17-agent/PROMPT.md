# Goal
Rebuild the Dogstudio hero component from the PageSnap export in `BASE/input/*`.

# Rules
- BASE = /Users/hiepleh.n/p-source/web2md-extension/plans/ps-008-creative-webgl/dogstudio-v17-agent
- Only inputs: `BASE/input/*` (`AI-PROMPT.md`, `preview.png`, `styles.css`, `index.html`, etc.) and the 3D assets in `BASE/assets/`.
- MUST NOT open or fetch from dogstudio.co. Public CDNs (three.js r128, DRACOLoader, GLTFLoader, Google Fonts) are allowed.
- Follow instructions in `AI-PROMPT.md`:
  1. Use `BASE/input/preview.png` to visually align camera framing, zoom, wolf eye-direction (head looking towards front-left, eye contact with viewer), and lighting atmosphere.
  2. Use assets as classified in Section 3b: load `dog.drc.glb` with DRACOLoader, map `matcap` and `normal-map`.
  3. Keep the 14 hover rules from `styles.css`.
  4. Ensure no horizontal overflow at 420, 700, 1500 px.
- Output: `BASE/index.html` (standalone, assets loaded from `./assets/`).
- Self-check: render with Playwright at 1500x900 and save screenshot to `BASE/out/rebuild-1500x900.png`. Compare against `BASE/input/preview.png`.
