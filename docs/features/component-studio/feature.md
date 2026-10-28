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
2. Move the pointer over the component. Hover effects run as they normally would and are observed (section 3).
3. Click to select it. Use the arrow keys to move to the parent or child element.
4. Choose **Live Studio**, **Download ZIP**, **Copy Component**, or **Copy AI Prompt**.

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
| **No motion**     | The prompt says "None observed" and explains how to capture it (hover the component while the inspector is active).                                                  |

**Auto-Sweep Probing & Dual-State Architecture.** Rather than requiring the user to manually hover with perfect precision, PageSnap performs an automatic micro-sweep across the component's bounding box when selected. This triggers the component's full range of motion (Peak Minimum and Maximum values) deterministically. The resulting resting and peak states are packaged into `AI-PROMPT.md` as dual-state geometric specifications and vision-ready comparisons for AI coding agents.
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
