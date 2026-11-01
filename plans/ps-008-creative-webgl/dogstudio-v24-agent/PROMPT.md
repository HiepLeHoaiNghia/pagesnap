# Goal
Rebuild the interactive Dogstudio webpage based strictly on the PageSnap v24 package in `BASE/input/*`.

# Constraints & Rules
- BASE = /Users/hiepleh.n/p-source/web2md-extension/plans/ps-008-creative-webgl/dogstudio-v24-agent
- Only inputs: `BASE/input/*` (including `webgl-scaffold.js`, `AI-PROMPT.md`, `preview-hero.png`, `preview-mid.png`, `preview-bottom.png`, `styles.css`, `index.html`) and assets in `BASE/assets/`.
- Public CDNs (three.js r128, DRACOLoader, GLTFLoader, GSAP 3, Google Fonts) are allowed.

# Architecture & Implementation Instructions from AI-PROMPT.md:
1. WebGL Scaffold Integration:
   - Notice `BASE/input/webgl-scaffold.js`! It contains the pre-configured Three.js setup with:
     * Correct camera perspective & framing (`0.2, 1.6, 22.0`).
     * Preserved sharp ice-blue eye material on `Leye` and `Reye`.
     * Multi-matcap atlas cropper for smooth slot transitions.
     * `PageSnapWebGLController.setMatcapSlot(slot, tintHex)` and `resetMatcap()`.
   - Integrate or reference `webgl-scaffold.js` directly to avoid re-inventing WebGL boilerplate.
2. Layering & Artwork Stacking Context:
   - `#bg-layer`: fixed deep black `#090a0f` with `./assets/background-xl.png` at z-index -3.
   - `#case-art-layer`: fixed artwork background at z-index -2 (hidden by default, opacity transition 0.5s).
   - `#canvas-container`: 3D WebGL canvas at z-index -1.
   - `#dom-wrapper`: DOM content at z-index 1.
3. Cross-Layer Hover:
   - When hovering `.home-cases-list a` (e.g. "This Was Louise's Phone"):
     * Set `#case-art-layer` background image to Louise's artwork (`https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-1440.png`) and make visible.
     * Call `PageSnapWebGLController.setMatcapSlot(11, 0xd946ef)` (or transition matcap to slot 11 with neon pink).
     * Dim other case links to opacity 0.2.
   - On mouseleave: hide case art layer, reset matcap to hero resting slot (`0x28344c`), and restore link opacity.
4. Scroll Choreography:
   - Interpolate camera depth `[22, 28, 34, 38, 30, 25]` and rotation Y `[35, 20, 30, 30, -50, -145]` degrees across scroll so the wolf turns 180° showing its back at 2400px bottom matching `preview-bottom.png`.

# Output & Self-Check:
- Write `BASE/index.html` (standalone, assets loaded from `./assets/`).
- Self-check with Playwright:
  1. `BASE/out/v24-hero.png` (scroll 0px)
  2. `BASE/out/v24-hover-louise.png` (scroll 1400px, hover over "This Was Louise's Phone")
  3. `BASE/out/v24-bottom.png` (scroll 2400px)
