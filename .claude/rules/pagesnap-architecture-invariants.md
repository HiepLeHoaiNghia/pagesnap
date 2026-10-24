# PageSnap Architecture & Coding Invariants

These rules are permanent operational contracts for the PageSnap repository. Any agent or developer modifying this codebase must adhere to them strictly.

---

## 1. Zero Network Interference (Inviolable)
- **NEVER monkey-patch or wrap `window.fetch` or `window.XMLHttpRequest` in the page's MAIN world.**
- **NEVER register persistent content scripts at `document_start` across `<all_urls>`.**
- PageSnap must remain 100% passive by default. Script execution on the active tab occurs only on-demand when the user clicks the extension action or triggers extraction.

---

## 2. Least Privilege Permission Surface
- **NEVER add `<all_urls>` to `manifest.json` (`permissions` or `host_permissions`).**
- Permitted permissions are strictly bounded to:
  `["activeTab", "clipboardWrite", "storage", "scripting", "downloads", "contextMenus"]`
- Any feature requiring broad background network interception belongs in a dedicated developer tool (e.g. `pagereplica-extension`), NOT in PageSnap.

---

## 3. Single Source of Truth for Branding
- All application naming, prefixes, and identifier definitions must derive from `APP_CONFIG` in `src/shared/constants.js`.
- In content scripts, use `window.PageSnap = window.PageSnap || {};` (with `window.Web2MD = window.PageSnap` alias for backward compatibility).
- Never hardcode new ad-hoc names across multiple files.

---

## 4. Content Script ⇄ Popup Data Contract
- `Web2MD.extractPageContent()` in `src/content/markdown/extractor.js` must strictly return the canonical payload:
  ```javascript
  {
    title: string,
    content: string,          // Clean article HTML from Readability
    rawContent: string,       // Fallback body HTML
    visibleText: string|null, // Visible form fallback
    visibleTextLength: number,
    url: string,
    excerpt: string,
    byline: string,
    siteName: string,
    success: boolean,
    readabilitySuccess: boolean
  }
  ```
- `src/popup/extract.js` must access these exact property names directly. Never invent intermediate wrappers or read undefined properties (`data.articleContent`, `data.metadata`).

---

## 5. Zero-Build Architecture
- The repository must run directly in Chromium without any compilation, transpilation, or bundling step (`webpack`, `vite`, `rollup`).
- Background Service Worker and Popup scripts must use standard native ES modules (`type: "module"`).
- Content scripts run in the ISOLATED world and are loaded in dependency order as defined by `CONTENT_BUNDLE` in `src/shared/constants.js`.
