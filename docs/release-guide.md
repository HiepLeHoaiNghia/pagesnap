# PageSnap Automated Release Guide

> Complete reference guide for automated releases using **Google Release Please** adapted from the MemoryGrid `release-please-semver-pipeline` blueprint.

---

## 🔄 1. Release Lifecycle Flow

```
[Branch feat/*] 
      │
      ▼  (Squash Merge)
[Branch develop]
      │
      ▼  (Merge Commit - DO NOT SQUASH)
[Branch main]
      │
      ▼  (Release Please Bot opens Release PR)
[Release PR: chore(main): release X.Y.Z]
      │
      ▼  (Review & Merge Commit)
[GitHub Release vX.Y.Z] 
      │
      ├──> GitHub Action runs: npm run package
      ├──> Automatically attaches: dist/pagesnap-vX.Y.Z.zip
      └──> (Back-merge main -> develop)
```

---

## 📋 2. Step-by-Step Procedure

### Step 1: Feature Development on a Dedicated Branch
- Always branch off `develop`: `git checkout -b feat/<feature-name> develop`.
- Implement changes, run tests: `npm test && npm run test:e2e`.
- Write commits complying with Conventional Commits: `feat(scope): ...` or `fix(scope): ...`.

### Step 2: Create a Pull Request into `develop`
- Open a PR targeting `develop`:
  ```bash
  gh pr create --base develop --head feat/<feature-name> --title "feat(scope): <description>"
  ```
- **Merge Strategy:** MUST be **Squash Merge** so the PR title becomes a single conventional commit on `develop`.

### Step 3: Promote `develop` to `main`
- When ready to cut a release, open a promotion PR:
  ```bash
  gh pr create --base main --head develop --title "chore: promote develop to main" --body "Promote develop to main for extension release."
  ```
- **Merge Strategy (CRITICAL):** MUST be **Merge Commit** (`Create a merge commit`).
  > ⚠️ **WARNING:** Never squash merge at this step. Squashing collapses all underlying `feat:` and `fix:` commits into a single `chore:` commit, preventing Release Please from recognizing semantic version bumps.

### Step 4: Release Please Automatically Creates Release PR
- When code lands on `main`, Google Release Please runs automatically:
  - Scans new commits since the last release.
  - Computes the next SemVer version.
  - Updates `CHANGELOG.md`.
  - Synchronizes both `package.json` and `manifest.json` versions.
  - Opens a PR named e.g.: `chore(main): release 0.3.1`.

### Step 5: Approve Release PR & Collect ZIP Artifact
- Review the Release PR on GitHub and click **Merge Commit**.
- Release Please immediately:
  1. Cuts Git tag `v0.3.1`.
  2. Publishes GitHub Release `v0.3.1` with categorized changelog notes.
  3. Triggers GitHub Actions to run `npm run package` and upload **`pagesnap-v0.3.1.zip`** directly to the GitHub Release assets.

### Step 6: Back-Merge `main` into `develop`
- Synchronize release metadata and changelog commits back into `develop`:
  ```bash
  git checkout develop && git pull origin develop
  git merge --no-ff origin/main -m "chore(release): back-merge v0.3.1 into develop"
  git push origin develop
  ```

---

## ⚡ 3. End-to-End Orchestration Script (`full-release.sh`)

You can execute the entire release pipeline in one command:

```bash
npm run release
# or execute directly: ./scripts/release/full-release.sh
```

The script autonomously:
1. Validates clean working state and verifies you are on `develop`.
2. Creates the `develop -> main` Promotion PR and merges it with a Merge Commit.
3. Awaits Release Please to open the Release PR on `main` and merges it.
4. Waits for the GitHub Action to build and attach `pagesnap-vX.Y.Z.zip`.
5. Back-merges `main` into `develop` both locally and on `origin`.
6. Prints the GitHub Release link with the ready-to-upload ZIP package for the Chrome Web Store.
