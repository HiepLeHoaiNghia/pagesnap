# Chrome Web Store Listing Package for PageSnap

This document contains all pre-written copy, descriptions, and justification texts ready to copy-paste directly into the [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole).

---

## 🏷️ 1. Store Metadata

- **Extension Name:** `PageSnap — Web to Markdown & HTML Snapshot`
- **Category:** `Productivity` (Secondary: `Workflow & Planning`)
- **Language:** `English`
- **Pricing:** `Free`

---

## 📝 2. Descriptions

### Summary / Short Description (Max 132 chars)
> Extract any live web component to clean Markdown, scoped offline HTML, or AI prompts with 1 click. Zero telemetry.

### Detailed Description
```markdown
⚡ PageSnap — The 1-Click Web Component Clipper & Live Studio for AI Developers

Turn any live UI component, documentation page, or web article into clean, distraction-free Markdown, scoped offline HTML & CSS, or ready-to-use AI design prompts for Cursor, Claude Code, and v0.

Unlike traditional web clippers that dump messy HTML with global CSS leaks, ads, and broken scripts, PageSnap isolates exact component boundaries with computed layouts, scoped classes (.ps-el-*), and responsive authored CSS.

---

🔥 KEY FEATURES

1. 🎮 Floating Actions Dock with Smart Coachmark
Click any element on any webpage to open the streamlined action dock:
• 📋 Copy Markdown: Clean GitHub-Flavored Markdown with automatic frontmatter and table formatting.
• 🌐 Copy HTML: Pure HTML and scoped CSS without JavaScript—runs cleanly offline anywhere.
• 🎮 Smart Game HUD Coachmark: Intelligent onboarding callout for static selections with a 1-click "Don't show again" preference.
• ••• More Menu: Quick access to ZIP packaging, AI Prompts, and experimental tools.

2. 🛠️ Interactive Component Studio Sandbox
Inspect and customize components in an isolated live preview before copying:
• Live Preview: Edit text directly on-screen and verify responsive behavior.
• Multi-File Code Browser: Preview index.html, styles.css, Component.jsx, and tokens.json.
• AI Specs Tab: Copy structured reverse-engineering blueprints designed for LLM prompts.
• 1-Click Export: Download complete component ZIP bundles in one click.

3. 🤖 AI & LLM Ready (with Token Estimation)
Built specifically for AI-assisted coding in Cursor, Claude, and ChatGPT:
• Real-time token estimates for GPT-4o and Claude 3.5 Sonnet context windows.
• Structured YAML frontmatter metadata (title, author, url, date).
• Generates AI-PROMPT.md with full design tokens (colors, typography, spacing).

4. 📦 Scoped HTML & Authored Responsive CSS
• Zero global leaks: Every element gets scoped styles (.ps-el-N).
• Responsive layout preservation: Keeps authored @media and layout rules so exports adapt to window resizing.
• Complete offline independence with Base64 asset inlining.

5. 🧪 Creative Web Lab (BETA)
For rich media, canvas, and 3D web experiences:
• ▶ Copy animated (JS) [BETA]: Offline player for pointer-driven animations and keyframes.
• 🎬 Record 60fps Video [BETA]: Capture silky-smooth WebM loops of canvas animations.
• 🎨 3D WebGL Packaging [BETA]: Automatically detect and download loaded 3D models (.glb), depth maps, and shaders.

---

🔒 PRIVACY & ZERO TELEMETRY PROMISE

• 100% Local Processing: All DOM parsing and style computation happen directly inside your browser.
• Zero Telemetry: PageSnap does not track your browsing, send analytics, or contact external servers.
• On-Demand Access: PageSnap only activates when you explicitly click the extension or select a component.

---

📖 OPEN SOURCE
PageSnap is 100% open-source under the MIT License.
Inspect the code or contribute on GitHub: https://github.com/HiepLeHoaiNghia/pagesnap

---

## 🛡️ 3. Privacy Practices & Permissions Justification

When submitting to the Chrome Web Store, Google requires a justification for each requested permission. Use the exact answers below:

### Single Purpose Description
> Convert web page articles and selected DOM regions into clean, distraction-free Markdown and offline HTML snapshots for AI context and note-taking.

### Permission Justifications

| Permission | Justification Text to Enter into Developer Console |
| :--- | :--- |
| `activeTab` | Required to read the DOM and extract article content from the currently active web page only when the user explicitly clicks the extension popup or context menu. |
| `clipboardWrite` | Required to allow users to copy the generated Markdown directly to their system clipboard with one click. |
| `storage` | Required to persist user configuration preferences (such as enabling YAML frontmatter, Obsidian wikilinks, or raw mode) across browser sessions. |
| `downloads` | Required to allow users to download the converted `.md` file or offline `.html` snapshot directly to their local disk. |
| `contextMenus` | Required to provide a convenient right-click shortcut ("Copy region as Markdown") so users can select page elements without opening the popup. |

### Data Usage Declarations
- Does this extension collect user data? **No**
- Does this extension sell user data? **No**
- Does this extension use data for unrelated purposes? **No**
- Privacy Policy URL: Provide the public link to your `PRIVACY.md` (e.g. `https://github.com/HiepLeHoaiNghia/pagesnap/blob/main/PRIVACY.md` or a GitHub Pages link).
