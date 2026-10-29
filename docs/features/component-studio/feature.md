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
3. Choose **Live Studio**, **Download ZIP**, **Copy Component**, or **Copy AI Prompt**. PageSnap measures the component's motion first (a progress pill with a **Skip** button shows each stage); you do not need to hover anything beforehand.
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

---

## 4. Verification

`npm run test:e2e` (headless): TEST 9 drives a fixture page with a script-morphed SVG, a CSS-only animation, an outline-only change and an inline-style tween. It asserts the exact write count, the quoted before/after states, that CSS-only and outline-only changes are not reported, and that `stop()` records nothing further.

---

## 5. Changelog

| Date       | Change                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| 2026-10-26 | Implemented Phase 10 Auto-Sweep Probing & Dual-State Architecture to capture full motion range automatically without manual hover reliance. |
| 2026-10-26 | Implemented Phase 9 Parametric Motion Engine: authentic Framer Motion component generation and pointer-spring reverse-engineering specs. |
| 2026-10-27 | Implemented Phase 11 Trajectory Stream Recording: captures 60fps frame timelines across all morphing paths and replays them smoothly in Component Studio and export specs without lossy guessing. |
| 2026-10-28 | Implemented Phase 12 Driver-Aware Kinematics Engine: correlated DOM mutations with normalized pointer vectors $(px, py)$, captured spatial cluster snapshots, and enabled live cursor scrubbing in Studio and React exports. |
| 2026-10-29 | One-click motion capture: every export action sweeps hover and, for pointer-driven motion, measures springs automatically (progress pill with Skip). Stack hover is rebuilt from a measured hover map (cumulative lift groups match the original), lift transitions replay the measured easing, and the Studio preview no longer applies a blanket lift. Fixed the motion model deleting the `ps-el-N` scoping classes, which stopped the bottom plate from lifting after Analyze. |
