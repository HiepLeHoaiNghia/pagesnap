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
> Convert any web page to clean, AI-ready Markdown with one click. Strips ads, formats tables, estimates tokens, and preserves code.

### Detailed Description
```markdown
⚡ PageSnap — The Fastest, Zero-Build Web to Clean Markdown Clipper & Offline Snapshot

Convert any webpage, technical documentation, or online article into clean, distraction-free Markdown ready for ChatGPT, Claude, Cursor, Obsidian, and Notion.

Unlike traditional web clippers that dump messy HTML or include unwanted ads, sidebars, and navigation links, PageSnap uses Mozilla's battle-tested Readability engine to isolate the core article content and turn it into clean GitHub-Flavored Markdown.

---

🔥 KEY FEATURES

1. ⚡ 1-Click Clean Markdown Extraction
Extract clean article content instantly. PageSnap automatically removes popups, cookie banners, navigation menus, ads, and footers, leaving only the text, headings, and images you care about.

2. 🤖 AI & LLM Ready (with Token Estimation)
Get real-time character and estimated token counts (for GPT-4o / Claude 3.5 Sonnet context windows). Includes YAML Frontmatter metadata (title, author, url, date) so your AI prompts always have context.

3. 🎯 Visual Region Selector
Don't need the whole page? Activate the Visual Region Selector and hover over any container or table on the live website to extract only that specific element.

4. 📊 High-Fidelity Tables & Syntax-Highlighted Code
Complex data tables are converted cleanly into Markdown tables. Code blocks preserve language indentation and syntax without breaking formatting.

5. 📦 Clean Standalone HTML Snapshot
Need an exact offline replica of the article? Export a self-contained single-file HTML package with inlined CSS and Base64 images without any external scripts or tracking.

6. 🟣 Obsidian-Friendly Wikilinks
Toggle Obsidian wikilink formatting (`[[link]]`) directly in the extension settings for seamless integration into your personal knowledge base.

---

🔒 PRIVACY & ZERO TELEMETRY PROMISE

- 100% Local Processing: All parsing happens directly in your browser.
- Zero Data Collection: PageSnap does not track your browsing history, collect analytics, or send queries to external servers.
- No Blanket Host Permissions: PageSnap only accesses the page when you explicitly click the extension or select a region.

---

📖 OPEN SOURCE
PageSnap is 100% open-source under the MIT License.
Contribute or inspect the code on GitHub: https://github.com/HiepLeHoaiNghia/pagesnap
```

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
