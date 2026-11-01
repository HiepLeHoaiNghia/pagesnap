# Goal
Rebuild the interactive Dogstudio webpage based strictly on the PageSnap v22 export in `BASE/input/*`.

# Constraints & Rules
- BASE = /Users/hiepleh.n/p-source/web2md-extension/plans/ps-008-creative-webgl/dogstudio-v22-agent
- Only inputs: `BASE/input/*` (`AI-PROMPT.md`, `preview-hero.png`, `preview-mid.png`, `preview-bottom.png`, `styles.css`, `index.html`, etc.) and the assets in `BASE/assets/`.
- Public CDNs (three.js r128, DRACOLoader, GLTFLoader, GSAP 3, Google Fonts) are allowed.

# Architecture & Implementation Instructions from AI-PROMPT.md:
1. Exact Hero Framing & Midnight Scene:
   - Body background: `#090a0f`.
   - Behind canvas: use `./assets/background-xl.png` (opacity 0.85) to reproduce the authentic deep midnight background with subtle aurora glow.
   - Camera: PerspectiveCamera (FOV 35, width/height). Position camera at `(0.2, 1.6, 22.0)` looking at `(1.1, 1.8, 0)` so wolf head and chest occupy 1/2 right screen at close-up scale matching `preview-hero.png`.
2. Dedicated 3D Submesh Materials (Section 3d):
   - `eyes` submesh: MUST NOT be overwritten with body matcap! Bind an amber/gold glowing eye texture with dark central pupil so the wolf has sharp eye contact matching `preview-hero.png`.
   - `body` submesh: MeshMatcapMaterial using `./assets/matcap-combined-resized.jpg` (slot 1) + normalMap `dog_normals.jpg` with a dark midnight navy tint (`0x28344c`).
   - `foliage/branches` submesh: MeshMatcapMaterial with normalMap `branches_normals.dds`.
3. Cross-Layer 3D Hover & Case Scenes (Section 3c):
   - When hovering any project in `.home-cases-list a` (e.g. "This Was Louise's Phone"):
     * Smoothly transition the 3D wolf matcap to the target slot (Index 11 for Louise, Index 4 for Tomorrowland) and tint with neon pink/purple (`0xd946ef`).
     * On mouseleave, smoothly restore resting midnight matcap (Slot 1, tint `0x28344c`).
     * Dim inactive case links to opacity 0.2.
4. Exact Spline Choreography:
   - Interpolate camera distance and wolf rotation across scroll progress matching Section 3 Poses:
     * Depth: `[22, 28, 34, 38, 30, 25]`
     * Rotation Y: `[35, 20, 30, 30, -50, -145]` degrees.
     * At 2400px bottom scroll, the wolf rotates 180° showing its back matching `preview-bottom.png`.

# Output & Self-Check:
- Write `BASE/index.html` (standalone, assets loaded from `./assets/`).
- Self-check with Playwright:
  1. `BASE/out/v22-hero.png` (scroll 0px)
  2. `BASE/out/v22-hover-louise.png` (scroll 1400px, hover over "This Was Louise's Phone")
  3. `BASE/out/v22-bottom.png` (scroll 2400px)
