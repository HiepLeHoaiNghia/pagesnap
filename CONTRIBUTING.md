# Contributing to PageSnap

Thank you for your interest in contributing to **PageSnap**! We welcome bug reports, feature suggestions, and pull requests from the community.

---

## 🏛️ Core Design Principles

Before making changes, please keep our core architectural rules in mind:

1. **Zero Runtime Dependencies:** PageSnap runs entirely in vanilla ES modules in the browser. Do not introduce heavy runtime frameworks (React, Vue, Babel) into the extension bundle.
2. **Zero Network Interference (Strictly Passive):** PageSnap must never monkey-patch `window.fetch`, `window.XMLHttpRequest`, or inject persistent content scripts at `document_start`. We respect user privacy and web page integrity.
3. **No Blanket `<all_urls>`:** We adhere to the least-privilege security principle using `activeTab`.
4. **100% English Codebase:** All variable names, comments, documentation, and commits in the repository must be in clear technical English.

---

## 🛠️ Local Development Setup

PageSnap requires **Node.js 18+** for running tests and scripts. The extension itself runs directly in Chrome without any build step.

### 1. Clone the repository
```bash
git clone https://github.com/HiepLeHoaiNghia/pagesnap.git
cd pagesnap
npm install
```

### 2. Load the extension in Chrome
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** (top-right switch) to **ON**.
3. Click **Load unpacked** (top-left button).
4. Select this project root directory (the folder containing `manifest.json`).

Whenever you edit files in `src/`, simply click the **Reload 🔄** icon on the PageSnap extension card in `chrome://extensions` to test your changes immediately.

---

## 🧪 Testing & Verification

All contributions must pass the automated test suites before merging:

```bash
# Run 13 architectural static checks and contract integrity tests
npm test

# Run UI contract test suite
npm run test:e2e:ui

# Run full Chromium E2E test suite
npm run test:e2e
```

---

## 📝 Commit Convention

We enforce the [Conventional Commits](https://www.conventionalcommits.org/) specification via commitlint.

Format: `<type>(<scope>): <subject>`

Common types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `chore`: Maintenance tasks or tooling updates

Example:
```bash
git commit -m "feat(ui): add keyboard shortcut for markdown export"
```

---

## 📄 License

By contributing to PageSnap, you agree that your contributions will be licensed under the [MIT License](LICENSE).
