<!-- markdownlint-disable MD013 MD033 MD045 -->

# PageSnap — Web to Clean Markdown & Offline HTML Snapshot

> Manifest V3 Chrome extension that converts web pages and selected regions into clean, AI-ready Markdown and standalone offline HTML snapshots with a zero-build, privacy-first codebase.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-7F52FF?style=flat-square&logo=google-chrome&logoColor=white)
![No build step](https://img.shields.io/badge/Build-none-16A34A?style=flat-square)
![Static checks](https://img.shields.io/badge/Static_checks-10%2F10_pass-16A34A?style=flat-square)
![Browser E2E](https://img.shields.io/badge/Browser_E2E-4%2F4_pass-16A34A?style=flat-square)
![Zero API Interference](https://img.shields.io/badge/Network-Zero_Interference-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## ⚡ Features

1. **AI-Ready Markdown Extraction**: Uses Mozilla Readability to strip ads, popups, sidebars, and navigation links. Generates clean Markdown with YAML Frontmatter (title, author, url, date), table formatting, and syntax-highlighted code blocks.
2. **Visual Region Selector**: Pick any DOM container directly on the live page to extract only the target section or table into Markdown.
3. **Clean HTML Snapshot**: Package a self-contained offline HTML page with inline stylesheets and Base64 assets without any external tracking or script interference.
4. **Zero-Blocking Architecture**: 100% passive by default. Injects scripts into the active tab only when explicitly requested. Native `window.fetch` and `window.XMLHttpRequest` are never monkey-patched.

---

## 🚀 Easy Installation Guide (Non-Technical Users)

Installing PageSnap takes less than 60 seconds without writing any code or using the terminal:

### 1. Download & Extract
- [**⬇️ Download Latest PageSnap ZIP**](https://github.com/HiepLeHoaiNghia/web2md/releases/latest) (or download `pagesnap-store-ready.zip`).
- **Extract (Unzip)** the downloaded file on your computer.
- *💡 Note: Place the extracted folder in a safe place (like `Documents`), as deleting this folder will remove the extension from Chrome.*

### 2. Open Extensions Page
Open your browser and copy-paste the URL for your browser into the address bar, then press **Enter**:
- **Google Chrome:** `chrome://extensions`
- **Microsoft Edge:** `edge://extensions`
- **Brave Browser:** `brave://extensions`

### 3. Turn on Developer Mode
In the top-right corner of the Extensions page, switch the **Developer mode** toggle to **ON**.

```
+--------------------------------------------------------+
| Extensions                       [Developer mode  (ON)]|
+--------------------------------------------------------+
```

### 4. Load PageSnap
1. In the top-left corner, click the **Load unpacked** button:
   ```
   [ Load unpacked ]  [ Pack extension ]  [ Update ]
   ```
2. In the file picker, select the **unzipped folder** that contains `manifest.json`.
3. 🎉 **Done!** PageSnap will immediately appear in your browser toolbar.

### 5. Pin for 1-Click Access (Recommended)
1. Click the **puzzle piece icon (🧩)** in the top-right corner of your browser toolbar.
2. Click the **pin icon (📌)** next to **PageSnap** so it stays visible on your toolbar for instant extraction.

---

## 🧪 Testing & Verification

PageSnap includes automated static checks and real-browser E2E integration tests:

### 1. Static Checks (Architecture, Bundles, Actions, Permissions)
```bash
npm test
```
*Expected: 10/10 checks passed.*

### 2. Live Browser E2E Test (Chromium)
```bash
npm run test:e2e
```
*Exercises live extension loading in Chromium, verifies native unpatched fetch/XHR, popup UI rendering, and article extraction.*

### 3. Build Store-Ready Package
```bash
npm run package
```
*Generates `dist/pagesnap-v0.3.0.zip` ready for upload to the Chrome Web Store.*

---

## 🔒 Permissions & Privacy

| Permission | Reason |
| :--- | :--- |
| `activeTab` | Read content on the tab you clicked without blanket host permissions. |
| `clipboardWrite` | Copy formatted Markdown directly to your system clipboard. |
| `storage` | Save your preferred Markdown options (YAML frontmatter, Obsidian wikilinks). |
| `downloads` | Save exported `.md` and `.html` files directly to your device. |
| `contextMenus` | Provide right-click "Copy region as Markdown" shortcut. |

*PageSnap does NOT require `<all_urls>` and never collects, transmits, or logs your browsing data.*

---

## 📄 License

MIT
