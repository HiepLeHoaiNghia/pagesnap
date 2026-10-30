# ps-005: compatibility fixes from testing real animation sites

## Why

The owner asked to test the extension on animation-heavy sites. Findings (headless, real sites, 2026-10-30):

| Site | Finding | Fix |
| --- | --- | --- |
| cursor.com | 36 CSS animations ran in the chosen region, the export had 0 `@keyframes` (they live inside `@layer`) | `extractKeyframeRules` recurses into grouping rules and reads adopted stylesheets |
| gsap.com | a GSAP timeline was labelled `pointer-x` (the hover sweep itself moves the pointer) and got a pointless spring fit; Studio said "spring fitted (0 animated values)" | driver decided by a stillness probe; Studio and prompt say "time-driven, not replayed" |

## What changes

- `src/content/style-extractor/style-collect.js`: recursive keyframe scan.
- `src/content/inspector/motion-sniffer.js`: `measureStillness`, idle-write share, driver rule.
- `src/content/inspector/motion-identify.js`: stillness check after the sweep, only when `pointer-x` is suspected.
- `src/content/inspector/studio-modal.js`, `src/content/style-extractor/ai-prompt.js`: honest wording.
- `tests/e2e/e2e-motion-export.mjs`: nested keyframes, time-driven and pointer-driven driver scenarios (red before, green after).
- `docs/features/component-studio/feature.md`: what is and is not replayed.

## Not in this ticket

Replaying timeline motion in the export (a new feature: record keyframes, replay with the Web Animations API); scroll-driven, WebGL and canvas motion; reading cross-origin stylesheets (needs a fetch and host permission).

## Verification plan for the owner

Run from the extension folder. Browser tests are headless. Sites need network.

1. Automatic suites, about 5 minutes:
   - `node tests/static-checks.mjs` → `13 checks passed`
   - `node tests/contract-integrity.test.mjs` → `fail 0`
   - `node tests/e2e/e2e-motion-export.mjs` → ends with `motion export characterization passed` and lists `[nested keyframes]` and two `[driver]` lines
   - `node tests/e2e/e2e-ui-contract.mjs` → `UI contract passed`
   - `node tests/e2e/e2e-smoke.mjs` → `ALL 9 E2E BROWSER ACCEPTANCE TESTS PASSED`
2. By hand in Chrome (load the unpacked extension from this folder, reload it first so the new `buildId` applies):
   - **cursor.com**: inspect the left sidebar list (the element with the shimmering dots), press `Download ZIP`. Open `index.html` from the ZIP: the shimmer and the three dots must animate. `styles.css` must contain `@keyframes shimmer`. Before the fix it contained none.
   - **gsap.com** hero: select the big hero block, press `Live Studio`. The footer status must read `time-driven JS motion (N writes) · described in AI Specs, not replayed` and must NOT say `spring fitted`. Open the `AI Specs` tab: section 3 must say `Autonomous Time-Loop … first frame only`.
   - **linear.app** (regression): select the isometric figure row, `Live Studio`. Hover the figure: the plates must lift as before; the footer must say `spring fitted (… animated values)` with a number above 0.
3. What should NOT work (so a failure here is expected, not a bug): gsap.com `index.html` does not animate; scroll-driven or WebGL parts of any site are not exported; a site whose stylesheet is blocked cross-origin may still miss keyframes.

## Changelog

- 2026-10-30: fixes built with tests written first; verified on cursor.com (36/36 animations replay), gsap.com (`time-loop`), and Linear (stack table identical, fan replay 16.3 → 133.3).
- 2026-10-30 (before/after check): comparing `develop` with this branch on gsap.com showed one run still labelled `pointer-x` (3848 writes), so the first stillness window (0.7 s, 15 batches) was unreliable on bursty timelines. Now 1.2 s rest + 1.8 s window, 6 batches. gsap.com: 3 of 3 runs `time-loop` (310, 328, 394 writes); one earlier run before this change was `pointer-x`, so reliability is shown by 4 runs only, not proven. Linear unchanged (stack identical, fan 16.3 → 133.3). cursor.com before/after: 0 → 4 keyframes, 0 → 36 of 36 animations replay.
