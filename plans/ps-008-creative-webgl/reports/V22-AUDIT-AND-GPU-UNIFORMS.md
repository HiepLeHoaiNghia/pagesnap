# Dogstudio Ground Truth Audit: GPU Uniforms & Cross-Layer Hover Artwork

## 1. Ground Truth GPU Uniforms Captured from WebGL State
- **Hero State (y=0px):**
  - `firstMatcapIdx: 19`, `secondMatcapIdx: 1`
  - `depth: 1.0` (Camera pivot z=1.0, camera offset z=-1.0 for true close-up framing)
  - `firstDiffuseWeight: 0.0`, `secondDiffuseWeight: 0.52`
  - `firstSpecularWeight: 0.0`, `secondSpecularWeight: 0.52`
  - `specularAttenuation: 0.48`
- **Hover Case State ("This Was Louise's Phone"):**
  - `firstMatcapIdx: 1`, `secondMatcapIdx: 11` (Slot 11 in matcap atlas, NOT flat hex color)
  - `firstDiffuseWeight: 0.79`, `secondDiffuseWeight: 0.70`
  - `firstSpecularWeight: 0.79`, `secondSpecularWeight: 0.70`
  - `matcapTransition: 0 -> 1` smooth ease
- **Artwork Layer Trigger:**
  - Toggles `.is-visible` on `.home-cases-scene--this-was-louises-phone`
  - Reveals fixed background artwork `background-1440.png`

## 2. Next Pipeline Upgrade (v23)
1. Add GPU Uniform Snapshotting to `render-surfaces.js`.
2. Extract and bundle case artwork images (`background-1440.png`) in `interaction-manifest.js`.
3. Provide exact Three.js / DOM controller blueprint in `AI-PROMPT.md`.
