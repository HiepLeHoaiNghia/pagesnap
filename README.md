<!-- markdownlint-disable MD013 MD033 MD045 -->

<h1 align="center">
  <a href="https://github.com/HiepLeHoaiNghia/pagesnap"><img src="docs/images/pagesnap-logo.svg?v=3" alt="PageSnap Logo" width="56" valign="middle" /></a> PageSnap
</h1>

<p align="center">
  <a href="https://github.com/HiepLeHoaiNghia/pagesnap/releases/latest"><img src="https://img.shields.io/badge/Release-v1.0.0-8B5CF6?style=flat-square" alt="Latest Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-10B981?style=flat-square" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/Manifest-V3-7F52FF?style=flat-square" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/Build-Zero_Build-16A34A?style=flat-square" alt="Zero Build" />
  <img src="https://img.shields.io/badge/Network-Zero_Interference-38BDF8?style=flat-square" alt="Zero Network Interference" />
  <img src="https://img.shields.io/badge/Browsers-Chrome%20%7C%20Edge%20%7C%20Brave-4493F8?style=flat-square" alt="Supported Browsers" />
</p>

<p align="center">
  <strong>The 1-click web component clipper for AI code generation (Cursor, Claude Code, v0).</strong><br/>
  Extract any live UI component into clean, scoped HTML &amp; CSS, pure article Markdown, or an AI-ready design prompt package.
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/pagesnap-—-web-to-markdow/npfkcjfemkkonkkhceammjhfkpkbnkke"><img src="https://img.shields.io/badge/Chrome_Web_Store-Add_to_Chrome-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Add to Chrome" /></a>
  <a href="https://github.com/HiepLeHoaiNghia/pagesnap/releases/latest"><img src="https://img.shields.io/badge/Download_Extension-v1.0.0_ZIP-8B5CF6?style=for-the-badge&logo=github&logoColor=white" alt="Download Extension ZIP" /></a>
</p>

<p align="center">
  <img src="docs/images/dock-coachmark-preview.png?v=2" alt="PageSnap Floating Actions Dock with Smart Game HUD Coachmark" width="100%" />
</p>
<p align="center">
  <img src="docs/images/studio-preview.png?v=2" alt="PageSnap Live Component Studio Sandbox" width="100%" />
</p>

---

## 💡 How to Use with Cursor, Claude Code &amp; v0

Stop feeding messy, 50-megabyte browser DOM trees to your AI. With PageSnap:

1. **🎯 Clip Component:** Hover over any live web element and click **`🌐 Copy HTML`** (or **`🤖 Copy AI Prompt`**).
2. **💬 Prompt Your AI:** Open **Cursor Composer** (`Cmd+I`), **Claude Code**, or **v0**, and paste:
   > *"Recreate this UI component using React and Tailwind CSS:*  
   > *[PASTE COPIED HTML/PROMPT HERE]"*
3. **✨ Pixel-Perfect Generation:** Because PageSnap extracted scoped styles (`.ps-el-*`), computed flex/grid layouts, and design tokens, your AI produces exact, bug-free components without style hallucinations!

---

## ⚡ 3-Step Instant Workflow

* **Step 1: 🎯 Inspect (`F2`):** Click the toolbar icon or press `F2` to highlight any container, hero section, or button on the live page.
* **Step 2: 🛠️ Live Studio Sandbox:** Preview the isolated component, test responsive window resizing, and edit text on-screen before exporting.
* **Step 3: 📦 Export in 1 Click:** Copy clean Markdown, scoped HTML &amp; CSS without JavaScript, or download a production-ready ZIP bundle (`Component.jsx`, `tokens.json`, `styles.css`).
---

## ⚡ Why PageSnap?

AI coding tools like **Cursor**, **Claude Code**, and **v0** build stunning interfaces, but feeding them raw browser inspect HTML often fails because of cluttered classes, global CSS leaks, and megabytes of junk.

PageSnap sits directly in your browser. With **1 click**, it extracts precisely the target component with computed layout, scoped styles, design tokens, and clean Markdown—ready to paste straight into your AI prompts.

| Capability | PageSnap | Paid Proprietary Tools ($30 - $60+) | Traditional Web Clippers |
| :--- | :--- | :--- | :--- |
| **License &amp; Pricing** | **100% Free &amp; Open Source (MIT)** | Paid license ($30 - $60+) | Free / Freemium |
| **Clean AI Markdown** | ✅ **Built-in (Mozilla Readability)** | ❌ HTML only | ⚠️ Whole page dump |
| **Scoped HTML + CSS** | ✅ **Isolated (`.ps-el-*`)** | ✅ Scoped classes | ❌ Full page CSS |
| **AI Design Prompt** | ✅ **Structured `AI-PROMPT.md`** | ❌ None | ❌ None |
| **Privacy &amp; Telemetry** | ✅ **100% Local (Zero Telemetry)** | ⚠️ Closed-source telemetry | ⚠️ Cloud servers |
| **Network Footprint** | ✅ **Strictly passive (Zero injection)** | ⚠️ Active page modification | ⚠️ Variable |
| **Canvas &amp; 3D Tools** | 🧪 **Experimental (BETA)** | ❌ Unsupported | ❌ None |

---

## 🌟 Core Features

### 📋 1-Click Clean Markdown Extraction
Extract clean article content or selected card text instantly. Powered by Mozilla's battle-tested Readability engine, PageSnap strips ads, cookie banners, navigation menus, and trackers.
- Formats tables, lists, and syntax-highlighted code blocks cleanly.
- Automatic YAML Frontmatter (`title`, `author`, `url`, `date`).
- Token estimation for GPT-4o and Claude 3.5 Sonnet.

### 🌐 Scoped HTML &amp; CSS (No-JS Mode)
Export components with fully isolated, scoped styles (`.ps-el-N`).
- Inherits typography, layout, Flexbox, and Grid faithfully.
- Strips invasive JavaScript so the exported component is safe and lightweight.
- Opens offline in any browser without broken dependencies.

### 🎮 Floating Actions Dock & Smart Coachmark
When hovering and clicking any live web element, PageSnap displays a compact, floating actions dock:
- **📋 Copy Markdown:** Clean GitHub-flavored Markdown for technical notes or Obsidian.
- **🌐 Copy HTML:** Scoped HTML & CSS without JavaScript (`.ps-el-N`).
- **🎮 Smart Game HUD Coachmark:** Interactive onboarding tutorial callout for static selections, explaining clean code export with a 1-click "Don't show again" preference.
- **••• More Actions:** Overflow menu with Download ZIP, AI Design Prompt, and Beta tools.

### 🛠️ Interactive Component Studio
Inspect, tweak, and customize before copying:
- **Preview Tab:** Interactive live sandbox showing the isolated component. Edit text directly on-screen!
- **Code Tab:** Multi-file code browser (`index.html`, `styles.css`, `Component.jsx`, `tokens.json`).
- **AI Specs Tab:** Copy ready-to-use reverse-engineering blueprints for AI agents (Cursor, Claude, v0).
- **Footer Actions:** 1-click **Copy animated (BETA)** and **Download ZIP** bundle.

### 🧪 Experimental Lab (BETA)
For rich media and creative web experiences:
- **▶ Copy animated (JS) [BETA]:** Replay pointer-driven SVG animations and CSS keyframes offline.
- **🎬 60fps Canvas Video Recording [BETA]:** Record smooth WebM loops of canvas animations via `captureStream()`.
- **🎨 3D WebGL Asset Packaging [BETA]:** Discover and bundle loaded 3D models (`.glb`), depth maps, and textures.
---

## 🚀 Quick Install

### Method 1: Chrome Web Store (Recommended)
Install directly from the official Google Chrome Web Store with 1 click:

👉 [**Add PageSnap to Chrome (Official Web Store)**](https://chromewebstore.google.com/detail/pagesnap-—-web-to-markdow/npfkcjfemkkonkkhceammjhfkpkbnkke)
### Method 2: Manual Install (Load Unpacked in 60s)
<details>
<summary><b>Click to expand step-by-step local installation guide</b></summary>
<br/>

1. Download [**`pagesnap-store-ready.zip`**](https://github.com/HiepLeHoaiNghia/pagesnap/releases/latest) from the latest release.
2. Unzip into a permanent folder on your machine (e.g. `Documents/pagesnap`).
3. Open Chrome/Edge/Brave and navigate to `chrome://extensions`.
4. In the top-right corner, toggle **Developer mode** to **ON**.
5. In the top-left toolbar, click **Load unpacked** and select the unzipped `pagesnap` folder.
6. Pin **PageSnap** (📌) to your browser toolbar for instant 1-click access anytime!

<p align="center">
  <img src="docs/images/step-extension-installed.png?v=2" alt="PageSnap extension card successfully loaded in Chrome" width="85%" />
</p>

</details>

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| `F1` | **Convert Page** | Extract full article as clean Markdown or HTML snapshot |
| `F2` | **Inspect Region** | Hover and click any UI component to launch the Floating Dock |
| `F3` | **HTML Snapshot** | Capture standalone offline HTML snapshot of the current page |
| `▲ / ▼` | **Expand / Shrink** | In Inspect mode, expand to parent container or shrink to child |

---

## 🧪 Testing &amp; Verification

PageSnap is verified with an automated suite comprising static checks, contract integrity gates, and real-browser Chromium E2E tests:

```bash
# Run 13 architectural static checks and contract integrity tests
npm test

# Run UI contract test suite (Floating Dock, Studio tabs, overflow menu)
npm run test:e2e:ui

# Run full Chromium E2E smoke tests
npm run test:e2e
```

---

## 🔒 Permissions &amp; Privacy

| Permission | Justification |
| :--- | :--- |
| `activeTab` | Read content on the active tab only when you explicitly invoke the extension. |
| `clipboardWrite` | Copy formatted Markdown or scoped HTML directly to your clipboard. |
| `storage` | Save your preferred Markdown options (YAML frontmatter, raw mode). |
| `downloads` | Download component ZIP archives or video clips directly to your device. |
| `contextMenus` | Provide right-click "Copy selection as Markdown" shortcut. |

*PageSnap operates 100% locally in your browser. It does not collect, log, or transmit any browsing data or personal telemetry.*

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for local development workflows and coding standards.

---

## 📄 License &amp; Trademark Notice

PageSnap code is open-source software licensed under the [MIT License](LICENSE).

### ⚖️ Trademark &amp; Distribution Policy
The name **"PageSnap"**, the official logo, icons, and branding assets are trademarks of the PageSnap maintainers.
- You **MAY** fork, self-host, and inspect the codebase under the terms of the MIT license.
- You **MAY NOT** redistribute, re-upload, or re-publish this extension (or close derivatives) to public browser extension stores (including the Chrome Web Store, Edge Add-ons, or Firefox Add-ons) using the name "PageSnap", the official branding, or misleading naming that implies official affiliation.
