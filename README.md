# Web2MD — Page to Markdown Chrome Extension

Web2MD is a premium, lightweight Chrome Extension (Manifest V3) that allows you to extract clean content from any web page and convert it into markdown locally in your browser. Perfect for saving articles to Obsidian, feeding clean text to LLMs, or taking developer notes.

## Features

- ⚡ **Local Content Extraction**: Powered by Mozilla's `Readability.js` to automatically filter out ads, navigation headers, footers, and sidebars.
- 📝 **Markdown Conversion**: Uses `Turndown.js` with GitHub Flavored Markdown (GFM) support for table formatting, strikethrough, list items, and fenced code blocks.
- 🎨 **Premium UI/UX**: Out-of-the-box dark mode styling using modern typography (`Outfit` and `JetBrains Mono`), sleek linear gradients, smooth hover states, and reactive rendering.
- ⚙️ **Customizable Options**:
  - Toggle YAML frontmatter insertion (title, url, date, author, site).
  - Banish or keep images.
  - Remove or retain links.
  - Obsidian-friendly Wikilinks formatting (`[[wiki-link]]`).
- 🖱️ **Right-click Context Menu**: Convert whole pages or highlighted selections directly from the cursor to the clipboard with real-time toast notification feedback in the active page.
- 📊 **Token Counter**: Real-time character count and rough token count estimation (chars/4) to control prompt size for LLM contexts.

## File Structure

```text
web2md-extension/
├── manifest.json         # Manifest V3 setup and permissions
├── popup.html            # Premium UI popup structure
├── popup.css             # Out-of-the-box premium dark styling
├── popup.js              # Popup action handlers, Turndown, and options
├── content.js            # Page parser (Readability), selection converter, and toast injection
├── background.js         # Service worker registering browser context menus
├── lib/
│   ├── readability.js    # Mozilla Readability script (Local)
│   ├── turndown.js       # Turndown engine script (Local)
│   └── turndown-plugin-gfm.js # GFM support script (Local)
└── icons/                # Resized premium brand logos
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## How to Test Local (Load Unpacked)

1. Open **Google Chrome** (or any Chromium browser).
2. Navigate to `chrome://extensions/` in the address bar.
3. Enable **Developer mode** by clicking the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Choose the directory: `/Users/hiepleh.n/p-source/web2md-extension`.
6. Pin **Web2MD** to your browser toolbar and start extracting!

## Development & Git Configurations

Local git user details are pre-configured:
```bash
git config user.name "HiepLeHoaiNghia"
git config user.email "hiep.lhn@gmail.com"
```
