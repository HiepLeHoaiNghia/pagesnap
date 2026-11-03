# Dogstudio v19 Rebuild Case Study: Multi-Frame Choreography & Color Shift Findings

## 1. Accomplishments in v19
- **Scroll Choreography 180° Rotation:** In the bottom scroll section (`preview-bottom.png`), the 3D wolf successfully rotates 180° showing its curved back and tail facing front, matching the core choreography of Dogstudio.
- **Amber Glowing Pupil:** Replaced blown-out cyan LED eye texture with refined amber glowing pupils.
- **Multi-Frame Previews:** Automatic export of `preview-hero.png`, `preview-mid.png`, and `preview-bottom.png` enabled the AI agent to understand spatial and pose transitions across the scroll lifecycle without manual code intervention.

## 2. Identified Discrepancies & Next Research Challenges
- **Background & Lighting Shift:** Dogstudio dynamically adjusts background radial gradients and canvas post-processing tones across scroll keypoints.
- **Matcap Color Transition (Texture Transition):** At different scroll sections and hover states, Dogstudio transitions the uniform `matcapTransition` between matcap indices (e.g., from Index 19/0 to other colored matcaps).
- **Depth / Proximity Dynamics:** The exact z-depth zoom curve (`DEPTH: [1, 18, 30, 35, 25, 20]`) requires tighter spline interpolation rather than linear approximations.
