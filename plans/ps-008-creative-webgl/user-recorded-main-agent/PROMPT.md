# Goal
Rebuild the complete interactive Dogstudio page strictly using the files exported by the user in `BASE/input/*`.

# Constraints & Rules
- BASE = /Users/hiepleh.n/p-source/web2md-extension/plans/ps-008-creative-webgl/user-recorded-main-agent
- Only inputs: `BASE/input/*` (including `AI-PROMPT.md`, `interaction-recording.json`, `webgl-scaffold.js`, `styles.css`, `index.html`) and assets in `BASE/assets/`.
- Public CDNs (three.js r128, DRACOLoader, GLTFLoader, GSAP 3, Google Fonts) are allowed.

# Architecture & Implementation Instructions:
1. WebGL Three.js Setup (`webgl-scaffold.js`):
   - Reference or integrate `BASE/input/webgl-scaffold.js` directly:
     * Camera FOV 35 placed close-up (`0.2, 1.6, 22.0`) looking at (`1.1, 1.8, 0`).
     * Dedicated sharp ice-blue eye material for `Leye` and `Reye` (DO NOT overwrite with body matcap).
     * Body material: matcap slot 19/1 with subtle midnight navy tint (`0x28344c`).
     * Uses `sampleTransition` wavefront shader so hover color propagates from tail to head.
2. Layering Context:
   - `#bg-layer`: fixed deep black `#090a0f` with `./assets/background-xl.png` at z-index -3.
   - `#case-art-layer`: fixed artwork background at z-index -2 (hidden by default, opacity transition 0.5s).
   - `#canvas-container`: 3D WebGL canvas at z-index -1.
   - `#dom-wrapper`: DOM content at z-index 1.
3. User Recorded Interactions (`interaction-recording.json`):
   - Notice `BASE/input/interaction-recording.json`! It contains the real user's live scroll journey (119 samples, max 2964px) and 21 matcap hover events.
   - Connect `window.scrollY` to interpolate camera depth and wolf rotation smoothly across scroll progress:
     * When scroll reaches bottom (~2400-2964px), wolf rotates 180° showing its back.
4. Cross-Layer Hover:
   - When hovering `.home-cases-list a` (e.g. "This Was Louise's Phone" with `data-matcap="11, 11"`):
     * Set `#case-art-layer` background image to Louise's artwork (`https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-1440.png`) and make visible.
     * Call `PageSnapWebGLController.setMatcapSlot(11, 0xd946ef)`.
     * Dim other case links to opacity 0.2.
   - On mouseleave: hide case art layer, reset matcap to hero resting slot (`0x28344c`), and restore link opacity.
5. Output:
   - Write `BASE/index.html` (standalone, assets loaded from `./assets/`).
   - Self-check with Playwright:
     1. `BASE/out/main-hero.png` (scroll 0px)
     2. `BASE/out/main-hover-louise.png` (scroll 1400px, hover Louise)
     3. `BASE/out/main-bottom.png` (scroll 2600px, back turn)
