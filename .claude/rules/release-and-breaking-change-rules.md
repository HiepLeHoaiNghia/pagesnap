# Release Please & Breaking Change Governance Rules for PageSnap

## 1. Mandatory Conventional Commits
All commits on feature branches and all PR titles MUST comply with the Conventional Commits specification:
`<type>(<scope>): <description>`

- **Release Types (Triggers automated SemVer version bumps & CHANGELOG entries)**:
  - `feat`: New feature or capability (bumps MINOR: e.g. `0.3.0` -> `0.4.0`)
  - `fix`, `perf`, `revert`: Bug fix or performance enhancement (bumps PATCH: e.g. `0.3.0` -> `0.3.1`)
  - `feat!:` or footer `BREAKING CHANGE:`: Breaking change (bumps MAJOR: e.g. `0.3.0` -> `1.0.0`)
- **Hidden Types (No version bump, excluded from changelog)**:
  - `chore`, `docs`, `style`, `refactor`, `test`, `build`, `ci`

---

## 2. Mandatory Breaking Change Self-Audit
Before opening any PR, the agent MUST review the git diff against:
1. Does this alter the exported Markdown schema, YAML frontmatter keys, or data structure?
2. Does this modify `chrome.storage` keys or settings models in a way that breaks existing user configurations?
3. Does this remove a user-facing action, shortcut, or context menu entry?

👉 **If YES to any of the above**:
- Mark this change as a **BREAKING CHANGE** (Triggers MAJOR version bump).
- Append `!` to the PR title: `feat(scope)!: <description>`.
- Add a footer in the PR body: `BREAKING CHANGE: <explanation of what changed and migration guidance>`.

---

## 3. Strict Merge Strategy Enforcement
- **Feature PR into `develop`**: MUST use **Squash Merge** (so the PR title becomes a single clean Conventional Commit on `develop`).
- **Promotion PR from `develop` into `main`**: MUST use **Merge Commit** (NEVER squash; individual commit history must be preserved for Release Please).
- **Back-merge PR from `main` into `develop`**: MUST use **Merge Commit**.

---

## 4. Strict Ban on Manual Tag/Release Commands (Anti-Action Bias)
Agents and developers are **STRICTLY PROHIBITED** from running manual release commands:
- `git tag -a v*` or `git push origin v*` / `git push origin --tags`
- `gh release create ...`

**Reason**: This repository is automated end-to-end by Google Release Please. Manual releases break release-please version tracking and desynchronize versions across `package.json` and `manifest.json`.

**Canonical Flow**: Merge promotion PR into `main`. The Release Please bot automatically generates the Release PR, updates `CHANGELOG.md`, synchronizes `manifest.json` and `package.json`, cuts the Git tag, and triggers artifact packaging.
