# ps-002: build the approved dock and Studio UI

status: building (2026-10-30). Design approved by the owner on the review board: G0 (brief), G1 (`rounds/g1.answers.json`), G2 (`rounds/g2.answers.json`). Refactor ps-003 phases 1-3 landed first, as the owner chose.

Sources of truth: `ui/brief.md`, `ui/rules-v1.md` (the checkable rules), `ui/mockups/build-g2.mjs` (the approved pictures, regenerate with `node plans/ps-002/ui/mockups/build-g2.mjs`).

## What changes

| Area | Today (measured) | After |
|---|---|---|
| Dock (`overlay.js`, `renderFloatingBar`) | 9 visible buttons | Live Studio, then two labelled groups: **Animated (JS)** = Copy animated (primary) + Download ZIP; **No JS** = Copy code · no JS + Copy Selection MD; then ⋯ and ✕. Copy AI Prompt, Expand, Shrink, Pick another go into ⋯ |
| Studio (`studio-modal.js`) | 6 tabs + 11 other buttons | 3 tabs (Preview, Code ▾, AI Specs) + ⋯ + ✕; footer in the same two groups; Expand, Shrink, Direct Text Edit, Re-Inspect go into ⋯ |
| Studio status line | "JS Motion: None" button and "Analyze motion" button | One read-only status line built from the measured result (spring, animated values, hover zones) |
| Code tab | 4 tabs with file names that say "Markup Only" | One tab with a file menu; each file carries one label: Animated (JS) / CSS motion / Markup only / Data, plus a "what is inside" line with real numbers |
| Wait pill | "Capturing hover & motion…" then a long technical line | "Measuring motion… N%" with "hover sweep, then spring fit · about 40 s" and Skip |
| New output | none | `Copy code · no JS`: self-contained HTML + CSS with the player script left out |
| Popup | tab "HTML Snapshot" has no motion label | label only, no layout change (UI-4 kept) |

## Order

1. Red-first tests (`tests/e2e/e2e-ui-contract.mjs`): button counts (dock <= 5, Studio <= 8, `✕` and `⋯` excluded), labels present, `Analyze motion` and `JS Motion: None` absent, wait pill has a percentage and Skip. They must fail on today's code.
2. Extractor: add the no-JS variant of the self-contained HTML.
3. Dock, then Studio, then wait pill. After each, the ps-003 phase 1 test and `e2e-smoke` stay green.
4. Make the red tests green; run every suite.

## Assumptions the owner has not seen drawn (flagged, easy to change)

- The popup tab label: shown as the existing text plus a small `CSS motion` chip (the snapshot keeps CSS animations and drops JS). No mock was drawn for the popup.
- `Copy animated` copies the same self-contained HTML as today's `Copy Component`; `Copy code · no JS` is the same HTML without the `<script>`.

## Not in this ticket

Popup layout, markdown extraction, the motion engine, adding other sites.

## Changelog

- 2026-10-30: plan written after G2 was answered (D-1, S-1, S-2 and W-1 approved; S-2 confirmed by the owner's "ok").
- 2026-10-30: built (no PR per plan, one commit at the end). Dock, Studio, wait pill and `selfContainedHtmlNoJs` done; `tests/e2e/e2e-ui-contract.mjs` (`npm run test:e2e:ui`) red 16/16 on the old code, green on the new. Smoke TEST 7/8 rewritten to data checks (UI is owned by the contract test). **Not done:** the popup `CSS motion` chip (flagged assumption, no layout drawn, left out). **Changed from plan:** "styles.css" with no keyframes/hover rules is labelled "Markup only" (the label set stays at the four approved). Studio spatial scrub now interpolates any two path states with equal commands; the fin-shaped templates (Linear geometry) are gone.
