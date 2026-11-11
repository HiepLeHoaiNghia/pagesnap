# Browser Extension Local Development & Branching Workflow Rule

## 1. Single Primary Working Tree Invariant
- **Context:** The Chromium browser loads the unpacked extension directly from the primary working tree path (`/Users/hiepleh.n/p-source/web2md-extension`).
- **Rule:** All feature development, testing, and bug fixing MUST be performed directly on a dedicated feature branch checked out in the **primary working tree** (e.g., `git checkout -b feat/<feature-name>`).
- **Strict Prohibition:**
  - DO NOT create or delegate work into detached git worktrees for browser extension code that requires live user verification in the browser.
  - DO NOT perform local intermediate merges from feature branches directly into `develop` before user verification is complete. The local `develop` branch must stay synchronized with `origin/develop`.

## 2. Browser Verification & Invalidation Protocol
- **Browser State:** Reloading an unpacked extension in `chrome://extensions` refreshes background service workers and popups, but does NOT replace content scripts in already-open browser tabs.
- **Rule:** The background injector (`src/background/injector.js`) MUST verify a dynamic `buildId` during `PING` handshakes and force re-injection of the `CONTENT_BUNDLE` if a tab runs an outdated script version.
- **Testing Standard:** Every UI or DOM change must be accompanied by an E2E Playwright test (`tests/e2e/e2e-smoke.mjs`) verifying DOM coordinates, layout hierarchy, and element state.

## 3. PR & Promotion Standard
- When feature development and browser verification are fully approved by the user:
  1. Push the feature branch to `origin` (`git push -u origin feat/<feature-name>`).
  2. Open a standard Pull Request from `feat/<feature-name>` into `develop`.
  3. Squash merge into `develop` following the release blueprint.

## 4. Headless-Only Test Execution Invariant
- **Rule:** Every automated browser test under `tests/e2e/` MUST run strictly headless (`headless: true` for Playwright, or `--headless=new` when spawning Chrome directly). `tests/static-checks.mjs` enforces this for all files in that directory.
- **Strict Prohibition:** NEVER launch automated test browsers in headful mode (`headless: false`) that opens visible GUI windows on macOS or steals the user's active desktop/workspace focus.
- **Downloads:** Playwright installs its own download interceptor and renames files to GUIDs, so it can NEVER be used to verify download behavior. Use `tests/e2e/e2e-download.mjs` (`npm run test:e2e:download`): real Chrome, `--headless=new`, raw DevTools, Chrome's standard download pipeline.
