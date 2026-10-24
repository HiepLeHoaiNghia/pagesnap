# Coding Principles & Engineering Standards for PageSnap

> Sourced from MemoryGrid knowledge/coding-principles.
> Applies to all JavaScript, CSS, and HTML files in this repository.

## 1. Core Principles (DRY, KISS, YAGNI)
- **KISS (Keep It Simple, Stupid):**
  - Prefer boring, obvious code over clever abstractions.
  - One clear entry point for an action; never create two UI buttons that trigger nearly identical behaviors.
- **YAGNI (You Aren't Gonna Need It):**
  - Delete dead weight, vestigial settings, and unused features immediately.
  - Do not add speculative configuration fields (like subfolder paths or unused toggles) that add surface area for bugs without proven utility.
- **DRY (Don't Repeat Yourself):**
  - Share inspection, overlay, and styling utilities across modules rather than duplicating logic.
  - Keep constants, action names, and script bundle lists in `src/shared/constants.js` as the Single Source of Truth.

## 2. Directory & Architecture Organization (Bounded Contexts)
```
src/
├── background/       # Background service worker (message routing, asset proxy, downloads)
├── content/          # Content scripts injected into web pages
│   ├── core/         # Essential runtime (namespace, utils, settings)
│   ├── markdown/     # Readability extraction, DOM preprocessing, Turndown GFM
│   ├── inspector/    # DevTools overlay, keyboard hierarchy navigation, Component Studio modal
│   ├── style-extractor/ # Computed CSS, CSS @keyframes, design tokens, AI prompts
│   └── html-clone/   # Self-contained page serializer and ZIP packager
├── popup/            # Extension popup UI (state, tabs, extraction controls)
└── shared/           # Cross-boundary constants and feature flags (ES modules)
```

## 3. DOM & Visual Inspection Invariants
- **Non-Invasive DOM:** Never inject styling classes directly onto third-party page elements that could break their layout. Always use an isolated floating overlay (`#pagesnap-inspector-overlay` with maximum z-index) for visual highlighting.
- **Safe Sandboxing:** Component Studio preview must isolate extracted CSS from the host page using scoped class namespaces (`.ps-comp-*`).
- **Resilient Fallbacks:** Every async operation (download, clipboard, injection) must have a deterministic fallback path.
