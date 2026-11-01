# Goal
Rebuild the interactive Dogstudio component strictly using the files exported by the user in `BASE/input/*`.

# Constraints & Rules
- BASE = /Users/hiepleh.n/p-source/web2md-extension/plans/ps-008-creative-webgl/user-recorded-agent
- Only inputs: `BASE/input/*` (including `AI-PROMPT.md`, `interaction-recording.json`, `webgl-scaffold.js`, `styles.css`, `index.html`) and assets in `BASE/assets/`.
- Public CDNs (three.js r128, DRACOLoader, GLTFLoader, GSAP 3, Google Fonts) are allowed.

# Architecture & Implementation Instructions:
1. WebGL Three.js Setup (`webgl-scaffold.js`):
   - Reference or integrate `BASE/input/webgl-scaffold.js` directly:
     * Camera FOV 35 placed close-up (`0.2, 1.6, 22.0`) looking at (`1.1, 1.8, 0`).
     * Dedicated sharp ice-blue eye material for `Leye` and `Reye` (DO NOT overwrite with body matcap).
     * Body material: matcap slot 19/1 with subtle midnight navy tint (`0x28344c`).
2. Empirical Interaction Data (`interaction-recording.json`):
   - Notice `BASE/input/interaction-recording.json`! It contains the real user's live scroll journey (`scrollTrail`, max 2978px).
   - Connect `window.scrollY` to interpolate camera depth and wolf rotation smoothly across scroll progress:
     * When scroll reaches bottom (~2400-2970px), wolf rotates 180° showing its back.
3. Cross-Layer Hover:
   - When hovering `.home-cases-list a` (e.g. "This Was Louise's Phone"):
     * Smoothly transition matcap to slot 11 (vibrant neon pink/purple `0xd946ef`).
     * Reveal case artwork layer and dim inactive case links to opacity 0.2.
   - On mouseleave: restore resting matcap and link opacity.
4. Output:
   - Write `BASE/index.html` (standalone, assets loaded from `./assets/`).
   - Self-check with Playwright:
     1. `BASE/out/user-hero.png` (scroll 0px)
     2. `BASE/out/user-hover-louise.png` (scroll 1400px, hover Louise)
     3. `BASE/out/user-bottom.png` (scroll 2600px, back turn)
