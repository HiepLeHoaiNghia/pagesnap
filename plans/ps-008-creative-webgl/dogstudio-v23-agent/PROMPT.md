# Goal
Rebuild the interactive Dogstudio webpage with exact 3D wolf choreography, cross-layer hover case artwork, and authentic background tone from the PageSnap v23 package in `BASE/input/*`.

# Constraints & Rules
- BASE = /Users/hiepleh.n/p-source/web2md-extension/plans/ps-008-creative-webgl/dogstudio-v23-agent
- Only inputs: `BASE/input/*` (`AI-PROMPT.md`, `preview-hero.png`, `preview-mid.png`, `preview-bottom.png`, `styles.css`, `index.html`, etc.) and the assets in `BASE/assets/`.
- Public CDNs (three.js r128, DRACOLoader, GLTFLoader, GSAP 3, Google Fonts) are allowed.

# Architecture & Implementation Instructions from AI-PROMPT.md:
1. Exact Hero Framing & Midnight Scene:
   - Body background: `#090a0f`.
   - Behind canvas: use `./assets/background-xl.png` (opacity 0.85, fixed) to reproduce the authentic deep midnight background with subtle aurora glow.
   - Camera: PerspectiveCamera (FOV 35, width/height). Position camera at `(0.2, 1.6, 22.0)` looking at `(1.1, 1.8, 0)` so wolf head and chest occupy 1/2 right screen at close-up scale matching `preview-hero.png`.
2. Dedicated 3D Submesh Materials (Section 3d):
   - `eyes` submesh: MUST NOT be overwritten with body matcap! Bind an amber/gold glowing eye texture with dark central pupil so the wolf has sharp eye contact matching `preview-hero.png`.
   - `body` submesh: MeshMatcapMaterial using `./assets/matcap-combined-resized.jpg` (slot 1) + normalMap `dog_normals.jpg` with a dark midnight navy tint (`0x28344c`).
   - `foliage/branches` submesh: MeshMatcapMaterial with normalMap `branches_normals.dds`.
3. Cross-Layer 3D Hover & Case Artwork Reveal (Section 3c & Controller Blueprint):
   - Follow the Controller Blueprint in `AI-PROMPT.md`:
     * When hovering any project link in `.home-cases-list a` (e.g. "This Was Louise's Phone" with `data-matcap="11, 11"`):
       - Reveal the associated artwork scene (`.home-cases-scene--this-was-louises-phone`) by adding class `is-visible` (opacity 1).
       - Transition the 3D wolf matcap to target slot (Index 11 for Louise) with neon pink/purple tint (`0xd946ef`).
       - Dim inactive case links to opacity 0.2.
     * On mouseleave: restore resting midnight matcap (Slot 1, tint `0x28344c`), hide artwork scenes, and restore link opacities.
4. Exact Spline Choreography:
   - Interpolate camera distance and wolf rotation across scroll progress matching Section 3 Poses:
     * Depth: `[22, 28, 34, 38, 30, 25]`
     * Rotation Y: `[35, 20, 30, 30, -50, -145]` degrees.
     * At 2400px bottom scroll, the wolf rotates 180° showing its back matching `preview-bottom.png`.

# Output & Self-Check:
- Write `BASE/index.html` (standalone, assets loaded from `./assets/`).
- Self-check with Playwright:
  1. `BASE/out/v23-hero.png` (scroll 0px)
  2. `BASE/out/v23-hover-louise.png` (scroll 1400px, hover over "This Was Louise's Phone" to capture the pink 3D shift and case artwork)
  3. `BASE/out/v23-bottom.png` (scroll 2400px)
