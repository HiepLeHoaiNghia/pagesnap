# ps-006: responsive export (lessons from ui-clone-skills)

## Why

Measured gap: an export is a snapshot of computed pixels. On a real region it had **0 `@media` rules and 261 fixed pixel widths**, so a component captured on a wide window did not reflow on a narrow one. The open-source project ui-clone-skills (Apache-2.0) collects the page's authored `@media` rules and verifies at several real window widths. We learned the idea (no code copied) and applied it to a browser extension that cannot resize the window: read the authored rules from the stylesheets and replay them in cascade order.

## What changes

| Piece | Change |
| --- | --- |
| `src/content/style-extractor/authored-css.js` (new) | reads every readable rule (recursing into `@layer`, `@media`, `@supports`, `@container`, `@import`, adopted sheets), keeps those that match the component, emits layout declarations in cascade order on `.ps-el-N`, un-pins sizes nobody sets, `max-width: 100%` on the root |
| `src/content/style-extractor/style-collect.js` | appends the authored layer after the pinned rules |
| `src/shared/constants.js`, `tests/e2e/e2e-smoke.mjs`, `tests/e2e/e2e-download.mjs` | load the new module |
| `src/background/injector.js`, `src/content/core/namespace.js` | `buildId` `20261030-v12` |
| `tests/e2e/e2e-responsive-export.mjs` (new), `npm run test:e2e:responsive` | red first: opens the export at 1400, 1000, 600 px |
| `docs/features/component-studio/feature.md` | what the layer does and its limits |

## Evidence (headless, 2026-10-30)

- Red before: 4 of 13 checks failed (overflow 200 px at 1000, still 3 columns and 600 px overflow at 600, the `@media` padding change ignored). Green after.
- Versus the REAL page region at the capture width (share of pixels that differ): cursor.com 13.34% → 8.83%, resend.com 6.07% → 5.14%, raycast.com 14.86% → 15.08% (unchanged).
- resend.com export overflow: 970 → 714 px at 420 px, 690 → 434 px at 700 px. cursor.com: no change (one stylesheet is unreadable, so nothing is un-pinned).
- Linear click-through unchanged: stack table identical, fan replay 16.3 → 133.3.
- A wrong reading corrected on the way: comparing against the OLD export suggested an 8% regression; comparing against the real page showed the new layer is closer to it. Always compare with the real page.

## Not in this ticket

Cross-origin stylesheets (needs a fetch and host permission), real-width sweeps of the live page to detect breakpoints (the extension cannot resize the window), replaying JS-set layout, scroll- or container-driven layout beyond the stated conditions.

## Changelog

- 2026-10-30: built test-first; verified as above. Branch `fix/nested-keyframes`, local commits only (no push, no PR).
- 2026-10-30 (looking at a real clone): exporting a region of cursor.com and checking it by eye showed underlined links the page does not underline. Cause: `style-collect.js` captured a short property list and dropped every computed `none`/`normal`. Fixed (test `e2e-style-fidelity`, 9 of 10 red before, green after; all other suites and the Linear click-through unchanged). The clone of cursor.com is in `plans/ps-005/evidence/clones/cursor/` (not committed).
