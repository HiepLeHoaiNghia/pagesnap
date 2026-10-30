<!-- markdownlint-disable MD013 MD033 MD045 -->

# Component Studio

> Pick any element on a page and export it as standalone HTML, CSS, React JSX, design tokens and an AI reverse-engineering prompt.

<p>
  <img src="https://img.shields.io/badge/Status-Implemented-success?style=flat-square" />
  <img src="https://img.shields.io/badge/Version-0.5.0-blue?style=flat-square" />
</p>

Related: [README](../../../README.md) · [Markdown & HTML Extraction](../markdown-html-extraction/feature.md) · [Region Selection](../region-selection/feature.md)

---

## 1. Overview

|                      |                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope**            | Inspector overlay, floating action dock, Component Studio modal, modular export and AI prompt generation.                             |
| **Permissions**      | `activeTab` only. Content scripts are injected on demand when the user acts; nothing runs in the background on other pages.           |
| **Export files**     | `index.html`, `styles.css`, `Component.jsx`, `tokens.json`, `AI-PROMPT.md`, `README.md` (ZIP), or copy each part to the clipboard.    |
| **Captured motion**  | CSS `@keyframes`, transitions and animations from stylesheets, plus JavaScript-driven motion specifications (start/end coordinates, timing, and Framer Motion / GSAP blueprints). |
| **Clean Static Code**| `index.html`, `styles.css`, and `Component.jsx` remain 100% pure, lightweight static code with inline `[PageSnap Motion Note]` annotations pointing to `AI-PROMPT.md` for agent reconstruction. |

---

## 2. How-To Flows

### Export a component

1. Open the popup and start region selection (inspector mode).
2. Click the component to select it. Use the arrow keys to move to the parent or child element.
3. Choose **Live Studio** or an export button on the dock. The dock is one flat row: **Expand**, **Shrink**, **Pick** and, when the parent holds clearly more measured motion, **Select parent (N animations)**; then **Live Studio**; then **Copy animated** (one self-contained file that runs offline) and **Download ZIP**; then **Copy code · no JS** (the same HTML and CSS without the motion script; CSS animations and hover still work), **Copy Selection MD** and **Copy AI Prompt**; then **✕**. Button tooltips say which exports belong to "Animated (JS)" and which to "No JS". The dock always stays inside the window and wraps onto a second row on a narrow one. PageSnap measures the component's motion first. A pill shows "Measuring motion… N%" with a **Skip** button; you do not need to hover anything beforehand.
4. Keep the tab in front while the pill is visible. The first export of a pointer-driven component takes about 40 seconds; the result is cached for that element.

### Close without exporting

Press `Esc` to cancel inspection, or close the dock. Observation stops immediately.

---

## 3. JavaScript-driven Motion Capture

Some effects (SVG path morphs, inline-style tweens, carousels) are produced by page JavaScript that rewrites attributes every frame. They are invisible to CSS, so keyframes alone cannot describe them.

| Aspect            | Behavior                                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **When it runs**  | Only between starting inspector mode and closing the dock, `Esc`, or a 120 second safety timeout. Never in the background.                                           |
| **What it sees**  | Writes to `d`, `points`, `transform`, `style`, `class`, `stroke`, basic SVG geometry attributes and `opacity`. It records counts, timing, and start/end states only, never page text. |
| **What it skips** | CSS animations (already in the keyframes) and PageSnap's own outline highlight.                                                                                     |
| **Output**        | Production-ready Framer Motion code in `Component.jsx`, inline `[PageSnap Motion Note]` annotations, in-modal live visual preview, and Dual-State (Resting vs Peak Hover) reverse-engineering blueprints in `AI-PROMPT.md` and `tokens.json`. |
| **No motion**     | The prompt says "None observed". Every export action already sweeps hover over the component, so this means nothing reacted to hover or to the pointer.                |

**Auto-Sweep Probing & Dual-State Architecture.** Rather than requiring the user to manually hover with perfect precision, PageSnap performs an automatic micro-sweep across the component's bounding box when selected. This triggers the component's full range of motion (Peak Minimum and Maximum values) deterministically. The resulting resting and peak states are packaged into `AI-PROMPT.md` as dual-state geometric specifications and vision-ready comparisons for AI coding agents.

**Driver-Aware Kinematics Engine (Spatial State Mapping).** Distinguishes between autonomous time loops and pointer-reactive interactions ($DOM = f(\text{pointerX}, \text{pointerY})$). For pointer-driven components (such as Linear fin waves and 3D tilts), PageSnap captures spatial cluster snapshots keyed by normalized cursor coordinates $(px, py)$. The preview canvas and exported React component directly scrub across spatial keyframes on live `pointermove` instead of playing rigid canned timelines.

**One-click capture (hover sweep + automatic Analyze).** Every export action runs `PageSnap.motionIdentify.captureMotion(element)` first. Step 1, `motionSniffer.sweepHover`, replays the browser's real enter/leave event sequence (`pointerover`/`mouseover` with `relatedTarget` set to the previous element, `null` from outside) on every distinct element a pointer can land on, found with a fine `elementFromPoint` grid so stroke-only hit areas are included. Page frameworks that derive `onMouseEnter` from those events (React) respond, and the sniffer records which elements toggled for each hovered element (`hoverMap`). Hover relations can be cumulative (hovering one plate lifts it and every plate above it), so the export builds its hover CSS from this measured map instead of guessing by index. Step 2 runs only when the motion follows the pointer (`driver: pointer-x`): `identify()` measures it as springs and caches the model per element. Skip keeps the quick capture.

Limits: the sweep dispatches hover only (no click, drag, scroll or keyboard), so motion that depends on those or on history is not reproduced. The component is scrolled into view during the sweep and the scroll position is restored.

**What is and is not replayed (compatibility, measured 2026-10-30).**

| Animation kind | Export |
| --- | --- |
| CSS `@keyframes`, transitions (including `@keyframes` inside `@layer`, `@media`, `@supports`, `@container`, and adopted stylesheets) | Replayed from `styles.css` |
| JS motion that follows the pointer (springs) | Replayed by the fitted player |
| JS motion on a timeline (GSAP and similar) | Observed and written into `AI-PROMPT.md` (start and end states, cadence); **not replayed**: `index.html` shows the first frame. The driver is `time-loop` |
| Scroll-driven (ScrollTrigger), WebGL, canvas | Not captured |

The driver is decided by what the component does while the pointer rests: after the sweep, `motionSniffer.measureStillness` lets the pointer rest for 1.2 s, then counts for 1.8 s the write batches that still reach the component; 6 or more means a timeline (`time-loop`). The window is long because timelines often write in bursts (on gsap.com a 300 ms burst every 1.3 s): a 0.7 s window sometimes fell into the gap and labelled the same timeline `pointer-x`. Stylesheets blocked by cross-origin rules cannot be read, so their `@keyframes` are missing from the export.

**Responsive behaviour of the export (added 2026-10-30).** The pinned CSS in `styles.css` is the computed value of each property at capture time, so on its own it freezes every size. `src/content/style-extractor/authored-css.js` adds, after the pinned rules, the page's own layout rules for the elements of the component (declarations of `width`, `height`, `min/max-*`, `flex*`, `grid-*`, `gap`, `margin*`, `padding*`, `top/left/right/bottom`, `font-size`, `line-height`, `display`, `flex-direction`, `flex-wrap`, `position`), in cascade order (layer, specificity, source order, `!important`), mapped onto the `.ps-el-N` classes and wrapped in their `@media`, `@supports` or `@container` condition. Relative values (`%`, `vw`, `fr`, `auto`, `calc()`, `clamp()`, `repeat()`) are kept as authored, and an element whose size no readable rule sets loses its pinned width and height so it flows again. The component root keeps its captured width but gets `max-width: 100%`. Limits: stylesheets blocked by cross-origin rules are skipped and, when one exists, nothing is un-pinned (cursor.com has one, so its export gains the conditional rules but still overflows on a narrow window); `var()` is resolved to the value at capture time; the cascade is approximated; the layer is capped at 300 KB. Measured on real pages against the real region at the capture width: cursor.com 13.3% → 8.8% of pixels differ, resend.com 6.1% → 5.1%, raycast.com 14.9% → 15.1% (unchanged). On resend.com the horizontal overflow at a 420 px window drops from 970 px to 714 px. The idea of collecting the page's authored `@media` rules and checking at several real window widths comes from the open-source project ui-clone-skills (Apache-2.0); no code was copied.

---

### Studio layout

Three tabs share the title row: **Preview**, **Code ▾** and **AI Specs**. The Code tab opens the menu "Files in the export" (index.html, styles.css, Component.jsx, tokens.json); each file carries one label read from the data: **Animated (JS)** (the file has the motion script), **CSS motion** (keyframes or hover rules, no JavaScript), **Markup only**, or **Data**. The `⋯` menu in the header has Expand, Shrink, Direct Text Edit and Re-Inspect. The footer has **Copy animated** (the main action), **Download ZIP** and an **Other formats ▾** menu (**Copy code · no JS**, **Copy Selection MD**); between them a read-only status line summarises what was measured (spring fit, pointer positions, hover zones, lift layers, CSS `@keyframes`). **Copy AI Prompt** is on the AI Specs tab, next to Copy this file. There is no Analyze button: the spring fit runs inside the one-click measuring step.

### Module layout (`src/content/style-extractor/`)

`style-extractor.js` is a facade. `style-collect.js` gathers styles and tokens, `lift-css.js` builds hover CSS from measured lift layers and the hover map, `markup-export.js` formats markup and Component.jsx, `pointer-player.js` builds the spatial-map player script, `ai-prompt.js` assembles AI-PROMPT.md. No file contains a site-specific class name or variable: hover and lift come from `motion-sniffer.js` measurements.

## 4. Verification

`npm run test:e2e` (headless): TEST 9 drives a fixture page with a script-morphed SVG, a CSS-only animation, an outline-only change and an inline-style tween. It asserts the exact write count, the quoted before/after states, that CSS-only and outline-only changes are not reported, and that `stop()` records nothing further. `npm run test:e2e:motion` replays hover against a fixture that reacts like React (cumulative lift, two naming schemes, a pointer-driven spatial map). `npm run test:e2e:ui` checks the layout: a flat dock with at most 6 export buttons besides the navigation buttons, the whole dock inside the window at three window sizes and four element positions, "Select parent" appearing after the probe, three Studio tabs with at most 8 buttons on each, no Analyze button, file labels, the wait pill percentage, the footer's Other formats menu, and that "Copy animated" carries the script while "Copy code · no JS" does not.

---

## 5. Changelog

| Date       | Change                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| 2026-10-26 | Implemented Phase 10 Auto-Sweep Probing & Dual-State Architecture to capture full motion range automatically without manual hover reliance. |
| 2026-10-26 | Implemented Phase 9 Parametric Motion Engine: authentic Framer Motion component generation and pointer-spring reverse-engineering specs. |
| 2026-10-27 | Implemented Phase 11 Trajectory Stream Recording: captures 60fps frame timelines across all morphing paths and replays them smoothly in Component Studio and export specs without lossy guessing. |
| 2026-10-28 | Implemented Phase 12 Driver-Aware Kinematics Engine: correlated DOM mutations with normalized pointer vectors $(px, py)$, captured spatial cluster snapshots, and enabled live cursor scrubbing in Studio and React exports. |
| 2026-10-29 | One-click motion capture: every export action sweeps hover and, for pointer-driven motion, measures springs automatically (progress pill with Skip). Stack hover is rebuilt from a measured hover map (cumulative lift groups match the original), lift transitions replay the measured easing, and the Studio preview no longer applies a blanket lift. Fixed the motion model deleting the `ps-el-N` scoping classes, which stopped the bottom plate from lifting after Analyze. |
| 2026-10-30 | Redesigned dock and Studio: flat dock (navigation, Live Studio, Copy animated, Download ZIP, Copy code · no JS, Copy Selection MD, Copy AI Prompt) that stays inside the window and redraws when the motion probe finishes; Studio with tabs in the title row, a Code file menu, a status line and a footer with one main action plus an Other formats menu; new "Copy code · no JS" export; wait pill shows a percentage. Removed every site-specific literal from `src/` (hover and lift are measured) and split `style-extractor.js` into six modules. |
| 2026-10-30 | Content-script `buildId` is now `20261030-v10`, so tabs opened before the update re-inject the split extractor modules. The wait pill's percentage never goes backwards (the `outside` identify stage now has its own range). `npm run test:e2e:download` loads the split extractor modules. |
| 2026-10-30 | Compatibility fixes found by testing real sites: `@keyframes` nested in `@layer`/`@media`/`@supports`/`@container` and in adopted stylesheets are now exported (cursor.com: 0 → 4 keyframes, 36 of 36 animations replay); a timeline is no longer labelled pointer-driven (gsap.com: `time-loop`, no pointless spring fit); Studio says "time-driven JS motion … not replayed" instead of "spring fitted (0 animated values)"; the AI prompt says the export holds the first frame only. |
| 2026-10-30 | Responsive export: `authored-css.js` adds the page's own layout rules (conditional `@media`/`@supports`/`@container` and relative sizes) after the pinned computed rules and un-pins sizes no readable rule sets; `npm run test:e2e:responsive` opens an export at 1400, 1000 and 600 px and checks columns, overflow, a 50% width and an `@media` padding change (4 of 13 checks failed before, all pass now). Content-script `buildId` is `20261030-v12`. |
