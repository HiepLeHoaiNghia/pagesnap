# SOLID & Clean Architecture Invariants for PageSnap

These engineering standards are permanent operational contracts to prevent spaghetti code, tangled functions, and monolithic files in this repository.

---

## 1. Single Responsibility Principle (SRP)
- **One Reason to Change:** Every file and module must have exactly ONE clear responsibility:
  - `render-surfaces.js`: Detects and describes non-DOM rendering surfaces (Canvas, WebGL, Video, Iframes). It does NOT format prompts or package ZIPs.
  - `ai-prompt.js`: Formats markdown instructions for AI models. It does NOT crawl DOM or execute network fetches.
  - `style-collect.js`: Reads computed CSS styles. It does NOT handle 3D math or ZIP archiving.
  - `motion-sniffer.js`: Measures DOM mutation events and pointer/scroll activity. It does NOT generate component JSX.
- **Maximum File Length Cap:** No single source file in `src/` should exceed 500 lines of code. When a file approaches this threshold, decompose it into focused domain submodules (e.g. `state-snapshotter.js`, `mesh-mapper.js`).

---

## 2. Open/Closed Principle (OCP)
- **Extensible via Pipelines, Closed for Mutation:**
  - The extraction pipeline (`extractComponentStyleAndMotion`) must orchestrate pluggable extraction stages rather than containing hundreds of lines of nested conditional checks.
  - Adding a new extraction capability (such as `interactionManifest` or `3D asset caching`) must be done by introducing a new focused module and registering it into `CONTENT_BUNDLE`, not by bloating existing core files.

---

## 3. Liskov Substitution Principle (LSP) & Clean Data Contracts
- **Strict Data Contracts:**
  - Modules passing data across the pipeline must adhere to documented schemas (e.g., `renderSurfaces`, `scrollChoreography`, `interactionManifest`).
  - Optional or missing stages must return standard neutral objects (e.g. `{ any: false, items: [] }`), NEVER `undefined` or unpredictable shapes that force ad-hoc `if (x && x.y && x.y.z)` defensive checks everywhere.

---

## 4. Interface Segregation Principle (ISP)
- **Small, Focused Module Interfaces:**
  - Never expose a giant kitchen-sink object on `PageSnap`.
  - Modules expose only minimal public entry points (e.g., `PageSnap.renderSurfaces = { detect, describe, promptSection };`).
  - Internal helper functions must remain scoped within module IIFEs and never leak into global scope.

---

## 5. Dependency Inversion Principle (DIP)
- **High-Level Orchestration depends on Abstractions:**
  - UI triggers (Dock buttons, Component Studio) depend on high-level extraction facades (`PageSnap.extractComponentStyleAndMotion`), never on deep internal helper functions of submodules.
  - Constants, bundle ordering, and message action IDs must always originate from `src/shared/constants.js`.
