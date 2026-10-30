# ps-003: reorganise the component-export code so the new UI (ps-002) can be built without breaking the rest

status: phases 1-4 done (2026-10-30). Decided by the owner: UI design first (ps-002, approved G0-G2), then this refactor, then build the UI; one PR at the end, not one per phase.

## Why (measured, `plans/ps-002/ui/rounds/g0-sources.md`)

- `extractComponentStyleAndMotion` is one 548-line function (`src/content/style-extractor/style-extractor.js:76-624`): style collection, lift CSS, prompt text and file templates in one scope.
- 11 hard-coded Linear class names (`GJ9TEa`, `_9PBFba`, `_3fVNxW`) in generic code: 6 in the extractor, 4 in `studio-modal.js`, 1 in `overlay.js`. Hit areas and lift layers are found by those names, so any other site gets the positional guess.
- Lift behaviour exists in two places (extractor CSS, Studio fallback in `studio-modal.js`). They drifted once already (blanket `-34px` lift on top of measured CSS).
- `overlay.js` touches `PageSnap.*` 96 times; `studio-modal.js` is 972 lines of imperative DOM with inline styles.
- The hover/export checks that proved the Linear fixes lived in `/tmp`, not in the repo, and needed network.

## Rule for every phase

Behaviour must not change. Phase 1 adds the net; phases 2-4 only move code, and each must keep the phase 1 test and `npm run test:e2e` green. One PR per phase.

## Phases

| # | Work | Done when |
|---|---|---|
| 1 | Offline characterization test: a local fixture that reacts to hover like React does (cumulative lift from `mouseover`/`relatedTarget`), then one `captureMotion`, one export, and a comparison of the hover table, transition, and `tokens.json` validity between the live fixture and the exported page | `node tests/e2e/e2e-motion-export.mjs` passes, and fails when `hoverMap` is dropped |
| 2 | One source for lift: Studio consumes the extractor output only; remove the Studio blanket-lift fallback and its duplicate hover handlers | Phase 1 test and `e2e-smoke` pass; no `translateY(-34px)` left in `src/` |
| 3 | Remove Linear class names from generic code: hit areas come from `hoverMap` (the element under the real pointer), lift layers from recorded `transform`/class toggles; site-specific hints move to one adapter file | `grep GJ9TEa src/` finds only the adapter; phase 1 test still passes; the Linear click-through (manual, needs network) gives the same hover table |
| 4 | Split the 548-line function into modules (style collection, lift CSS, prompt, file templates) behind the same `PageSnap.extractComponentStyleAndMotion` facade | Public return object unchanged (contract test); each module under 200 lines |

Not in this ticket: building the new UI (that is the ps-002 build step), the popup layout, the motion engine.

## Risks

- Phase 3 changes how hit areas are found. Mitigation: phase 1 fixture uses the Linear class names today; add a second fixture with arbitrary class names before phase 3 and require both to pass.
- The test relies on a system Chrome (`tests/bench/lib.mjs`, `CHROME_PATH` override). On machines without it the test cannot run.

## Changelog

- 2026-10-30: plan written; phase 1 started.
- 2026-10-30: phase 1 done. Added `tests/e2e/e2e-motion-export.mjs` (`npm run test:e2e:motion`, about 13 s, offline, system Chrome). Proved it goes red on three broken variants: hover map discarded, sweep skipped, lift direction inverted in the exported CSS. `launch()` in `tests/bench/lib.mjs` now takes options so each e2e file states `headless: true` itself (the repo's static check reads every e2e file's own source). Static 13/13, contract 11/11, e2e-smoke 9/9, new test passing. Not covered yet: the real Linear markup (needs network), the `ps-el-N` class loss inside the fitted motion model, and the Studio preview.
- 2026-10-30: phase 2 done. Removed both Studio-only lift blocks from `studio-modal.js` (the blanket demo lift and the hover handler); Studio now shows only what the extractor's measured CSS does.
- 2026-10-30: phase 3 done. `src/` has no Linear class name, no `--purpose-lift`, no `--lift-delay` left (checked by scan: 0 hits). Lift layers are now MEASURED: `motion-sniffer.js` records each layer's translation when its class first toggles and again after the hover settles (`liftLayers`), waiting for running transitions first. New `src/content/style-extractor/lift-css.js` builds the hover CSS from `liftLayers` + `hoverMap` and handles the four hover/target relationships (same, contains, inside, sibling). Hit areas keep the page's own `pointer-events`. Test now runs twice (first site's names, then unrelated class names and CSS variable): both identical to the live fixture. Found by the test while doing this: reading the rest position while a previous hover was still transitioning gave +30/-5/+24 instead of -30; the sweep now waits for running transitions first. Real Linear click-through after the change: stack hover table identical on all 5 hit areas, fan replay 16.3 to 133.3 unchanged. Behaviour differences accepted: the inspector badge no longer counts an element as animated just because a class contains "lift" (it counts measured layers); the Studio scrub region is found from the measured spatial map.
- 2026-10-30: phase 4 done. `style-extractor.js` went from 718 to 187 lines and is now a facade over five modules, each moved unchanged by cut and paste (no retyping): `style-collect.js` (189 lines: computed styles, tokens, keyframes, scoped clone), `markup-export.js` (89: formatted markup, motion notes, Component.jsx), `pointer-player.js` (100: spatial-map player script), `ai-prompt.js` (154: AI-PROMPT.md), `lift-css.js` (136). The public result of `extractComponentStyleAndMotion` is unchanged (contract test, smoke and characterization tests pass). Added a test for the spatial-map player first, because nothing covered it before it moved. Found while moving, not fixed (behaviour-preserving move): a stray internal comment line sits inside the prompt text, so it appears in users' `AI-PROMPT.md` (`ai-prompt.js`, the line before "## 5. Instruction for AI Agent").
- Not verified here: `window.Web2MD` aliasing is untouched; the Studio preview still needs the same bundle order as the export (both lists updated).
