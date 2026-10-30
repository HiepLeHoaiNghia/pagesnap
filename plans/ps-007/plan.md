# ps-007: hand agents what the page really does (hover/focus rules, render-surface warning)

## Why
An agent rebuilt dogstudio.co from the PageSnap export alone (5 min 32 s) and reported two gaps that the export could have answered:
1. `styles.css` had no `:hover` rules, so every hover state was invented.
2. The export and `AI-PROMPT.md` never mention that the page draws its hero in a WebGL canvas; `data-matcap` attributes hinted at three.js but nothing said so.

## Scope
- Part A (done): export the page's own `:hover`, `:focus`, `:focus-visible`, `:focus-within`, `:active` rules as `.ps-el-N:state` (incl. a hovered ancestor inside the component and conditional `@media`).
- Part B: detect canvas/video/iframe/3D assets in or behind the selected region; say so in the dock, in Studio, in `AI-PROMPT.md` and `tokens.json`. Warn, do not block.

## Out of scope
Pseudo-elements (`::before:hover`), hovered elements outside the component, sibling-combinator hover, scroll/timeline replay, rebuilding canvases.

## Acceptance
- A: `npm run test:e2e:hover` — page and export compute the same value while hovering/focusing/pressing (6 of 8 checks failed before, all pass now).
- B: see the test added in Part B.
- All other suites unchanged; idle-state difference to the real page unchanged on the 6-site benchmark.

## Changelog
- 2026-10-31: Part A built test-first. Benchmark after Part A (idle state, headless, one run): linear 4.9%, stripe 39.3% / 45.3%, vercel 6.2% / 6.6%, framer 12.5%, resend 6.1% / 10.0% — no regression versus before Part A.
- 2026-10-31: Part B built test-first (`e2e-render-surfaces`, 11 checks: 7 detection/prompt/tokens, 4 dock and Studio; all red before). The content script runs in an isolated world, so detection avoids page globals: it reads the DOM, `data-engine` (three.js writes it on its canvas), script file names and resource timing, and never calls `canvas.getContext`.
- 2026-10-31: found on the real dogstudio.co export (not by the fixture): a viewport-sized background canvas covers only 23% of the 3870px-tall `<main>`, below the 25% threshold, so the canvas line was missing while the 3D files and `data-matcap` were listed. Rule widened to "the region covers at least half of the canvas"; regression case added (`TALL` page, red before). Re-export of dogstudio.co now lists "Canvas behind the region 1500×900 px", the loaded `.dds`/`.jpg`/`.glb` files and `data-matcap`.
