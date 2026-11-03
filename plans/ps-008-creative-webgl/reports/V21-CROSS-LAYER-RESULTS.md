# Dogstudio v21 Rebuild Case Study: Cross-Layer 3D Hover & Dark Tone Results

## 1. Accomplishments in v21
- **Authentic Midnight Dark Background:** Successfully eliminated synthetic CSS linear-gradients by binding the original `background-xl.png` over a deep `#090a0f` canvas, matching the original Dogstudio hero atmosphere.
- **Cross-Layer 3D Hover Bridge:** Detected `data-matcap` attributes on project links (e.g. `data-matcap="11, 11"` on "This Was Louise's Phone") and instructed Three.js to transition the matcap material to Index 11 on hover, reproducing the authentic iridescent neon pink/purple color-shift seen on the live website.
- **Resting Midnight Indigo Body Tone:** Applied `0x161c28` body tint to prevent washed-out white/cyan reflections and ground the wolf into the dark background scene.

## 2. Verification Evidence
- Live demo: `http://localhost:8804/index.html`
- Hero comparison: `plans/ps-008-creative-webgl/dogstudio-v21-agent/out/proof-v21-hero.png`
- Hover color-shift comparison: `plans/ps-008-creative-webgl/dogstudio-v21-agent/out/proof-v21-hover.png`
