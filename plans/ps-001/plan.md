# Plan: PageSnap v0.3.0 Architecture Refactor, Spin-Off & Release Pipeline

status: completed (2026-10-23) — all static checks (10/10) and Chromium E2E (4/4) pass

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

## Changelog
- 2026-10-26: Phase 6 shipped. JS-driven motion is described in the AI prompt; it is not reproduced (see the doc's limits).
