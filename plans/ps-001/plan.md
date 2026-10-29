# Plan: PageSnap v0.3.0 Architecture Refactor, Spin-Off & Release Pipeline

status: completed (2026-10-23) — all static checks (10/10) and Chromium E2E (4/4) pass
 - src/content/style-extractor/style-extractor.js
 - src/content/inspector/motion-identify.js

## 1. Objectives
- **Repo 1 (`PageSnap` - Current Repo):** Rebrand from Web2MD to **PageSnap** (*Web to Clean Markdown & Offline HTML Snapshot*). Eliminate all MAIN-world network monkey patching and remove `<all_urls>` permission to permanently fix website API interference.
- **Repo 2 (`PageReplica`):** Separate all developer-centric capabilities (API Sniffing & Mocking, Component Inspector, React VFS Extractor, Interactive App Cloner) into a dedicated repository at `/Users/hiepleh.n/p-source/pagereplica-extension`.
- **E2E Browser Verification:** Integrate Playwright E2E smoke tests into the test pipeline to verify unpatched native fetch/XHR, article parsing, and clean snapshot generation on Chromium.
- **Automated SemVer Release Pipeline:** Adopt the MemoryGrid `release-please-semver-pipeline` blueprint to automate version bumps, changelog generation, and GitHub Release ZIP package attachment.

---

## 2. Architecture & Scope of Repositories

### 📁 Repo 1: `PageSnap` (Current Repository)
- **Path:** `/Users/hiepleh.n/p-source/web2md-extension` (branch: `feat/v0.3.0-clean-web2md`)
- **Display Name:** PageSnap — Web to Markdown & HTML Snapshot
- **Target Audience:** AI Prompt Engineers, Obsidian/Notion users, Content Researchers, Offline Archivers.
- **Retained Core Capabilities:**
  1. *F1: Web to Clean Markdown (Core)*: Mozilla Readability extraction, YAML frontmatter, token estimation, table/code formatting.
  2. *F2: Visual Region Selection*: Click-to-pick specific DOM containers/tables for scoped Markdown export.
  3. *F3: Clean HTML Snapshot*: Self-contained offline single-file HTML or ZIP with Base64 assets, zero mock scripts.
- **Permissions Surface:** Strictly bounded to `["activeTab", "clipboardWrite", "storage", "scripting", "downloads", "contextMenus"]`. No `<all_urls>`.

### 📁 Repo 2: `PageReplica` (Standalone DevTool Repository)
- **Path:** `/Users/hiepleh.n/p-source/pagereplica-extension`
- **Display Name:** PageReplica — In-Browser Frontend Cloner & Mock DevTool
- **Target Audience:** Frontend Developers, QA Engineers, Testers, Reverse-engineers.
- **Transferred Capabilities:**
  1. *D1: In-Browser API Sniffing & Mocking*: Intercept and edit response status/headers/body of Fetch & XHR.
  2. *D2: Interactive Component Inspector*: React Fiber tree and Vue instance traversal linked to network calls.
  3. *D3: React VFS Workspace Extractor*: Reconstruct source file trees from StackBlitz, Sandpack, and v0.dev into ZIP.
  4. *D4: Full App Cloner*: Clone web apps with offline mock server (`mock_apis.json`).

---

## 3. Implementation Phases

### Phase 1: Scaffold & Initialize PageReplica (Completed)
- Initialized standalone Git repository at `/Users/hiepleh.n/p-source/pagereplica-extension`.
- Migrated `main-world/`, `mock-bridge/`, `api-mock-store.js`, `project-store.js`, `inspector.js`, and `vfs-scanner.js`.
- Authored custom `manifest.json`, `popup.html`, `popup.css`, and developer `README.md`.

### Phase 2: Refactor & Clean PageSnap (Completed)
- Removed all MAIN-world interceptors and background mock stores from PageSnap.
- Removed `<all_urls>` permission from `manifest.json`.
- Established `APP_CONFIG` in `src/shared/constants.js` as the Single Source of Truth for naming.
- Synced `window.PageSnap` namespace with `window.Web2MD` backward-compatibility alias.
- Added MIT License, `package.json`, `PRIVACY.md`, and `STORE_LISTING.md`.

### Phase 3: Verification & Test Automation (Completed)
- Upgraded `tests/static-checks.mjs`: all 10 checks pass.
- Authored `tests/e2e/e2e-smoke.mjs`: verified 4/4 acceptance scenarios against real Chromium.
- Created `scripts/package.mjs` (`npm run package`): builds `dist/pagesnap-v0.3.0.zip` (135.6 KB).

### Phase 4: Release Please Blueprint Adoption (Completed)
- Added `release-please-config.json` with `"extra-files": ["manifest.json"]`.
- Added `.release-please-manifest.json` pinned to `0.3.0`.
- Added `.github/workflows/release-please.yml` to build and upload ZIP artifacts on release.
- Added `scripts/release/full-release.sh` (`npm run release`) for automated step-by-step release.
- Authored `docs/release-guide.md` and `.claude/rules/release-and-breaking-change-rules.md`.

### Phase 5: Layered Review & Hardening (Completed)
- Executed multi-agent review (`SpecAcReviewer`, `SecurityReviewer`, `DesignImpactReviewer`, `DocsImpactReviewer`, `RuleComplianceReviewer`).
- Resolved all findings (fixed `checkPreserveJsQuick`, removed `projectFiles`, corrected property mappings, updated Mermaid diagrams).
- Enforced 100% English language invariant across all repository documentation and rules.

### Phase 6: JavaScript-driven Motion Capture (Completed 2026-10-26)
- Added `src/content/inspector/motion-sniffer.js`: observes attribute rewrites only while inspector mode is active (auto-stops after 120 s or when the dock closes).
- `extractComponentStyleAndMotion` now adds an "observed JavaScript-driven motion" section to `AI-PROMPT.md` and a `jsMotion` summary to `tokens.json`.
- Bumped the content-script build id to `20261026-v1` so already-open tabs re-inject the new bundle.
- Added E2E TEST 9 (fixture page; mutation-checked) and the living doc `docs/features/component-studio/feature.md`.

### Phase 7: Live Motion Player Prototyping (Superseded 2026-10-26)
- Explored embedding raw `setTimeout` frame players into `index.html` and `Component.jsx`, which caused file bloat (~1 MB) and lacked physics spring fidelity compared to native Framer Motion.

### Phase 8: Clean Static Code + AI-PROMPT Motion Spec Architecture (Completed 2026-10-26)
- Keep `index.html`, `styles.css`, and `Component.jsx` 100% pure static code without synthetic `setTimeout` players or `data-ps-id` pollution.
- Inject concise inline `[PageSnap Motion Note]` comments into `index.html` and `Component.jsx` directly above elements that exhibited JavaScript-driven attribute mutations or interactive state toggles during inspection.
- Enrich `AI-PROMPT.md` and `tokens.json` with exact before/after coordinates, timing cadence, interactive class/style toggles, and ready-to-use Framer Motion & GSAP code blueprints so AI coding agents can reconstruct animations faithfully.

### Phase 9: Parametric Motion Engine & Authentic Framer Motion Generation (Completed 2026-10-26)
- Enhanced `motion-sniffer.js` to observe pointer coordinates, compute true style diffs (rest vs active), and detect spring physics parameters without hardcoded selectors.
- Updated `style-extractor.js` to generate authentic, production-grade Framer Motion code in `Component.jsx` and parametric specifications in `AI-PROMPT.md`.
- In Component Studio, provide silky-smooth in-modal visual preview and clear navigation to AI Specs.
- Verified end-to-end against live `linear.app` with real headless Chrome following the exact user inspection flow until fidelity matches production.

### Phase 10: Auto-Sweep Probing & Dual-State Architecture (In Progress 2026-10-26)
- Add `probeElementRangeOfMotion` in `motion-sniffer.js` to automatically sweep pointer coordinates across the component's bounding box on selection.
- Wire auto-sweep probing into `overlay.js` on selection so peak motion is captured without requiring manual user hover.
- Update `style-extractor.js` to embed Dual-State (Resting vs Peak Hover) geometry and vision comparisons in `AI-PROMPT.md`.

### Phase 11: Real Reverse Engineering for Web Motion (3 Exploration Paths) (Planned 2026-10-27)
- **Goal:** Permanently solve the animation reverse-engineering bottleneck by moving beyond lossy dual-state AI guessing. Iteratively explore all three foundational mechanical paradigms until production fidelity is achieved.
- **Path 1: React Fiber & Framework Runtime Introspection (Source-Level Extraction)**
  - Inspect `el.__reactFiber$*` to traverse internal component fiber tree.
  - Directly capture Framer Motion / GSAP `memoizedProps` (`variants`, `whileHover`, `initial`, `transition: { type: "spring", stiffness, damping, mass }`) as authored by developers.
- **Path 2: Native WAAPI Extraction (Engine-Level Extraction)**
  - Query `element.getAnimations({ subtree: true })` from Chromium's C++ rendering engine.
  - Extract exact `KeyframeEffect` frames, timings, and `cubic-bezier` easing without parsing stylesheets.
- **Path 3: Trajectory Stream & Damped Harmonic Oscillator Fitting (Physics Discovery)**
  - Capture high-frequency 60fps frame trajectory streams ($t_0 \rightarrow t_n$) for custom `requestAnimationFrame` SVG/canvas mutations.
  - *Sub-path 3A (Lossless Baking):* Compile frame streams directly into pure Lottie JSON or multi-stop Framer Motion keyframe arrays.
  - *Sub-path 3B (Physics Curve Fitting):* Fit displacement curves to damped harmonic oscillation equations to calculate exact `stiffness` and `damping` coefficients.


### Phase 12: Driver-Aware Kinematics Engine (Pointer-Driven Spatial Mapping) (Planned 2026-10-28)
- **Problem:** Animations on modern flagship websites (Linear, Apple, Vercel) are not 1D time-based movie timelines ($t \in [0, T]$); they are interactive spatial functions driven by input vectors ($DOM = f(\text{pointerX}, \text{pointerY})$). Treating them as static timelines forces interactive waves into rigid, canned video playback that ignores live cursor movements.
- **Architecture:**
  - **1. Driver Correlation:** Correlate every observed DOM mutation with normalized element coordinates $(px, py) \in [0.0, 1.0]$.
  - **2. Motion Classification:** Distinguish between `TIME_BASED` autonomous loops (spinners, dot matrices) vs `POINTER_DRIVEN` kinematics (interactive fin waves, 3D tilts, hover parallax).
  - **3. Spatial Cluster Snapshotting:** Instead of storing independent, truncated path arrays, store synchronized 2D Spatial Mesh Snapshots across all child elements keyed by pointer position $px$.
  - **4. Interactive Pointer-Reactive Output:**
    - In Component Studio: scrub spatial frames directly on `pointermove` across the preview canvas.
    - In `Component.jsx`: export pointer-reactive React components using `pointerX` state and spring physics.
    - In `AI-PROMPT.md`: specify pointer driver axis, spatial bounding box, and `useMotionValue` implementation blueprint.

### Phase 13: Black-Box System Identification + Pixel Scorer (Planned 2026-10-28)
- **Why:** Phases 11-12 recorded a *trace* of one mouse path. Reading Linear's shipped source (`CY_0qoQo.js`, component `Oi`) showed the motion is a pure function: `mouseX -> per-fin target height (tent profile) -> independent Framer Motion spring {damping:18, mass:1}`. A recorded trace cannot be turned into that function, so every replay drifted.
- **Corrections to earlier claims (do not repeat):** (1) "no Framer Motion, custom rAF loop" was wrong; `motion.path` + `MotionValue d` exist under the svg. (2) `document.querySelector('.GJ9TEa_momentum')` returns the hidden mobile carousel svg; always scope to the desktop `.GJ9TEa_benefit` card. (3) Gating morph samples on end-state delta hid moving elements; gate on peak amplitude.
- **A. System identification (`src/content/inspector/motion-identify.js`):** drive synthetic pointer events across N positions, wait for settle, read the settled state of every animated attribute -> `target[element][position]`; apply one cursor step to fit a 2nd-order spring (zeta, omega_n); drive the same position from both sides to detect path dependence.
- **D. Scorer (`tests/bench/`):** replay the identical synthetic pointer path on the original page and on the clone, compare frames; report a percentage per component instead of eyeballing.
- **Benchmark:** 8-10 real components (pointer-spring, CSS hover, carousel, scroll parallax, canvas) -> table of supported / partial / unsupported. The README lists only what the table proves.
- **Non-goals / hard limits:** canvas, WebGL, video, Lottie, noise-driven and stateful (history-dependent) motion are classified `unsupported` and fall back to static export plus evidence in `AI-PROMPT.md`. No claim of "any animation".
- **Measured results (2026-10-28, `node tests/bench/run.mjs`, headless Chromium 1440x900, scorer = energy-weighted pixel delta vs rest, real mouse along the same frame-relative path on both pages):**

  | case | expected honest outcome | engine said | score | verdict |
  |---|---|---|---|---|
  | bars-spring (rAF spring, X) | reproduce | supported, high | 99.4 | PASS |
  | linear-fins (real linear.app, Framer springs, X) | reproduce | supported, medium | 63.0 | PARTIAL |
  | tilt-2axis (inline transform, X+Y) | partial | supported, partial | 50.9 | PASS (self-labelled) |
  | css-hover (no script writes) | reject | unsupported | - | PASS |
  | stateful-slider (integrates deltas) | reject | unsupported | - | PASS |
  | autonomous rAF loop | reject | unsupported | - | PASS |
  | canvas wave | reject | unsupported | - | PASS |
  | random jumps | reject | unsupported | - | PASS |

- **Defects the benchmark found and fixed:** (1) exporter pinned computed `height/width/transform/fill` into class rules for SVG children, which beat the SVG presentation attribute the player writes, so the DOM moved but pixels did not (bars-spring 0 -> 99.4); now skipped when the attribute exists on an SVG child. (2) measured values of a discrete channel (`style: transform: perspective() rotateY() ...`) were replayed as nearest-neighbour steps; now interpolated when all measured values share one shape. (3) the engine claimed support for stateful and random motion; added a leave-and-re-enter path probe plus a decline on path spread >= 4% or hold-out error > 12%.
- **Known gaps (not fixed, stated):** the engine sweeps only X, so Y-dependent motion is capped at `partial` (tilt-2axis 50.9); Linear is 63 with the residual concentrated where fins are tall (0.5,0.5 = 48), the model's rest-frame drift is not yet attributed; CSS `:hover` is declined, not reproduced; the fixtures are local, so only one real site (Linear) backs the table.
- **Follow-up:** the downloaded Linear export showed the left stacked SVG uses separate `purposeLift` groups with per-layer `--lift-delay`; replay must preserve each group's transform and delay instead of applying one shared hover transform.
- **Implementation status:** per-layer lift replay now follows the hover relation measured from the user's real pointer (see Changelog 2026-10-29); exported and Studio hover verified identical to the original for all 5 hit areas.
## Changelog
- 2026-10-26: Phase 10 initiated — Auto-Sweep Probing & Dual-State Architecture.
- 2026-10-26: Phase 9 completed — Parametric Motion Engine and production-grade Framer Motion synthesis.
- 2026-10-27: Phase 11 planned — Real Reverse Engineering for Web Motion (3 Exploration Paths).
- 2026-10-28: Phase 12 planned — Driver-Aware Kinematics Engine (Pointer-Driven Spatial Mapping).
- 2026-10-28: Phase 13 planned — black-box identification, pixel scorer, honest capability table.
- 2026-10-28: Phase 13 executed — engine, scorer, 8-case benchmark; results table above.
- 2026-10-29: Stack replay fixed to match the original. Root cause: Linear drives hit areas from React state (`onMouseEnter`), where hovering hit *k* lifts layer *k* AND every layer above it (cumulative, bottom-up); the export mapped hit *k* to layer *k* only, so direction/grouping were inverted. The relation is now measured instead of guessed: `motion-sniffer.js` records the element under the pointer for every state-toggle write (non-enumerable, because React's circular `__reactFiber$` keys must not reach `tokens.json`) and `describe()` replays class writes in time order into `hoverMap`; `style-extractor.js` builds hit-area lift rules from it (positional guess only for hit areas with no measured relation). Studio Live Preview no longer runs its legacy blanket `-34px` lift when measured lift CSS exists. Lift transition/amount are replayed from measured computed values, and stroke toggles are scoped to the toggled element's `:hover`. Verified in headless Chromium: hit → lifted-layer table identical on original, export and Studio (`[4,9]`, `[3,4,8,9]`, `[2,3,4,7,8,9]`, `[1,2,3,4,6,7,8,9]` x2).
- Lesson: `querySelector('svg:has(hit-area)')` at document level returns a hidden zero-size duplicate svg; every earlier "no hover point" reading came from that, not from the extension. Always filter by `getBoundingClientRect().width > 0`.
- 2026-10-29: Motion capture is now one click, no manual steps. Every export action (Live Studio, Copy Component, Download ZIP, Copy AI Prompt) runs `PageSnap.motionIdentify.captureMotion(el)` first: (1) `motionSniffer.sweepHover` replays the browser's real enter/leave event sequence (`pointerover`/`mouseover` with `relatedTarget` = previous target, `null` from outside) on every distinct element a pointer can land on (found with a fine `elementFromPoint` grid, so stroke-only hit areas are covered), which makes React `onMouseEnter` handlers fire and fills `hoverMap`; (2) if the motion follows the pointer (`driver: pointer-x`) and no model is cached, `identify()` measures it as springs. A progress pill with Skip shows each stage; Skip falls back to the quick capture. Earlier "synthetic events cannot trigger React" conclusion was WRONG: the test passed `relatedTarget: document.body`, which React's EnterLeave plugin ignores. Verified by clicking the real Download ZIP button (39 s): stack hover table identical to the original for all 5 hit areas, fan replay rest 16.24 / peak 133.3, `tokens.json` valid.
- 2026-10-29: Fixed a second export bug found by that test. `identify()` records toggled `class` values (e.g. `purposeLifted`) as `discrete` model items, and `createPlayer` wrote them with `setAttribute('class', …)`, deleting the `ps-el-N` scoping classes the exported CSS is keyed on; after Analyze the bottom stack plate (layers 4 and 9) never lifted, in both the ZIP and Studio. `createPlayer` now keeps `ps-el-N` classes (`setDiscrete`).
- Limits: the sweep dispatches hover only (no clicks, drag, scroll or keyboard); motion that needs history, drag or time is not measured. Elements outside the viewport are scrolled into view and scroll is restored.
