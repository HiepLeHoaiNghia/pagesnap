# Goal
Rebuild the interactive Dogstudio hero component from the PageSnap v18 export in `BASE/input/*`.

# Rules
- BASE = /Users/hiepleh.n/p-source/web2md-extension/plans/ps-008-creative-webgl/dogstudio-v18-agent
- Only inputs: `BASE/input/*` (`AI-PROMPT.md`, `preview.png`, `styles.css`, `index.html`, etc.) and the 3D assets in `BASE/assets/`.
- MUST NOT open or fetch from dogstudio.co. Public CDNs (three.js r128, DRACOLoader, GLTFLoader, Google Fonts) are allowed.
- Follow instructions in `AI-PROMPT.md`:
  1. Visual Grounding: Use `BASE/input/preview.png` to match camera framing, wolf head angle (tilted towards front-left, eyes making direct contact with the viewer), and dark moody atmosphere.
  2. 3D Eye & Specular Detailing: Give the wolf eyes a dedicated bright/reflective material with glowing pupils (cyan/amber) making piercing direct eye contact, clearly visible and sharp.
  3. Interactive Motion:
     - Mouse Parallax: Connect mouse movement (`mousemove`) to wolf head and eyes subtly turning and following the cursor.
     - Scroll Choreography: Connect `window.scrollY` to 3D camera / wolf transforms according to the Scroll Choreography checkpoints in `AI-PROMPT.md` so the 3D wolf recedes/rotates smoothly as the user scrolls.
  4. Ensure no horizontal overflow at 420, 700, 1500 px. Keep all 14 hover rules.
- Output: `BASE/index.html` (standalone, assets loaded from `./assets/`).
- Self-check: render with Playwright at 1500x900 and save screenshot to `BASE/out/v18-1500x900.png`. Also take a screenshot at scroll 600px saved to `BASE/out/v18-scroll600.png`.
