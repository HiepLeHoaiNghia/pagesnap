# Goal
Rebuild the interactive Dogstudio webpage with exact 3D wolf choreography, cross-layer hover color-shifts, and authentic background tone from the PageSnap v21 package in `BASE/input/*`.

# Rules
- BASE = /Users/hiepleh.n/p-source/web2md-extension/plans/ps-008-creative-webgl/dogstudio-v21-agent
- Only inputs: `BASE/input/*` (`AI-PROMPT.md`, `preview-hero.png`, `preview-mid.png`, `preview-bottom.png`, `styles.css`, `index.html`, etc.) and the assets in `BASE/assets/`.
- Public CDNs (three.js r128, DRACOLoader, GLTFLoader, Google Fonts) are allowed.

# Critical Implementation Guidelines from AI-PROMPT.md:
1. Deep Dark Background:
   - Body background is deep black/slate (`#090a0f`).
   - Use `./assets/background-xl.png` as a fixed subtle background image (`opacity: 0.4; mix-blend-mode: screen` or subtle overlay) so the hero matches `preview-hero.png` perfectly (DO NOT paint an artificial bright purple/cyan gradient).
2. Midnight Indigo Wolf Body & Amber Eyes:
   - Apply a deep midnight navy/indigo tint (`0x161c28`) to the wolf matcap material so the body is dark and moody with subtle rim sheen, exactly matching `preview-hero.png`.
   - Wolf eyes: dedicated material with glowing amber/gold pupils looking directly at the viewer.
3. Cross-Layer 3D Hover Binding:
   - When hovering any project link in `.home-cases-list a` (e.g. "This Was Louise's Phone" with `data-matcap="11, 11"`):
     * Smoothly transition the 3D wolf matcap material to the corresponding matcap cell index (Index 11: vibrant iridescent pink/purple neon, Index 4: electric cyan/blue, etc.) using a 0.4s ease.
     * On mouseleave, smoothly restore the resting midnight matcap.
4. Exact Spline Choreography:
   - Connect `window.scrollY` to interpolate between the 6 poses in `Exact Choreography Spline Poses`:
     * Depth: `[1, 18, 30, 35, 25, 20]`
     * Rotation Y: `[60, 36.7, 53, 53, -80, -150]` deg
     * At 2400px bottom scroll, the wolf rotates 180° showing its back matching `preview-bottom.png`.

# Output & Self-Check:
- Write `BASE/index.html` (standalone, assets loaded from `./assets/`).
- Self-check with Playwright:
  1. `BASE/out/v21-hero.png` (scroll 0px)
  2. `BASE/out/v21-hover-louise.png` (scroll 1400px, hover over "This Was Louise's Phone" to capture the pink/purple 3D color shift)
  3. `BASE/out/v21-bottom.png` (scroll 2400px)
