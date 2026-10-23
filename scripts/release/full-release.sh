#!/usr/bin/env bash
# plan-exempt — release orchestration script ported from email-tool
# Full Automated Release Pipeline for PageSnap Chrome Extension.
# Ported from MemoryGrid release-please-semver-pipeline blueprint.
#
# Execution steps:
#   Step 1: Pre-flight checks (clean workspace, develop up to date, unreleased commits)
#   Step 2: Create & Merge Promotion PR (develop -> main via Merge Commit)
#   Step 3: Await & Merge Release-Please PR on main (cuts SemVer Git tag & updates CHANGELOG)
#   Step 4: Await GitHub Action to build and attach pagesnap-vX.Y.Z.zip
#   Step 5: Back-merge main into develop
set -euo pipefail

log() { printf '\n\033[1;34m[pagesnap-release %s]\033[0m %s\n' "$(date +%H:%M:%S)" "$*"; }
success() { printf '\033[1;32m[pagesnap-release %s] ✅ %s\033[0m\n' "$(date +%H:%M:%S)" "$*"; }
die() { printf '\033[1;31m[pagesnap-release %s] ❌ ERROR: %s\033[0m\n' "$(date +%H:%M:%S)" "$*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# Pre-flight checks
CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "develop" ]]; then
  die "Must be on 'develop' branch to initiate a release. Current branch: '$CURRENT_BRANCH'"
fi

if [[ -n "$(git status --porcelain -uno)" ]]; then
  die "Working tree has uncommitted tracked changes. Commit or stash your changes before releasing."
fi

log "Fetching latest remote refs and tags from origin..."
git fetch origin --tags develop main

UNPUSHED_LOCAL=$(git log origin/develop..HEAD --oneline)
if [[ -n "$UNPUSHED_LOCAL" ]]; then
  die "Local develop is ahead of origin/develop. Push your commits before releasing."
fi

log "Checking for unreleased commits between main and develop..."
NEW_COMMITS=$(git log origin/main..origin/develop --oneline || true)
OPEN_PROMOTE=$(gh pr list --base main --head develop --state open --json number -q '.[0].number // empty')
OPEN_RELEASE=$(gh pr list --base main --head "release-please--branches--main" --state open --json number -q '.[0].number // empty')

if [[ -z "$NEW_COMMITS" && -z "$OPEN_PROMOTE" && -z "$OPEN_RELEASE" ]]; then
  success "No unreleased commits and no open release/promote PRs. Everything is up to date."
  exit 0
fi

if [[ -n "$NEW_COMMITS" ]]; then
  echo "$NEW_COMMITS"
  log "Found unreleased commits above. Proceeding with release..."
fi

# ─── Step 1: Promote develop to main ──────────────────────────────────────────
log "==> Step 1: Checking/Creating Promotion PR (develop -> main)..."
PROMOTE_PR="$OPEN_PROMOTE"
if [[ -z "$PROMOTE_PR" && -n "$NEW_COMMITS" ]]; then
  log "Creating promotion PR..."
  PROMOTE_PR=$(gh pr create \
    --base main \
    --head develop \
    --title "chore: promote develop to main" \
    --body "Automated promotion from develop to main for extension release." | grep -o '[0-9]*$')
fi

if [[ -n "$PROMOTE_PR" ]]; then
  log "Promotion PR #$PROMOTE_PR is open. Merging into main via Merge Commit..."
  # INVARIANT: Must use merge commit, NEVER squash or rebase
  gh pr merge "$PROMOTE_PR" --merge --auto=false
  success "Promotion PR #$PROMOTE_PR merged into main via Merge Commit."
fi

# ─── Step 2: Await & Merge Release-Please PR on main ─────────────────────────
log "==> Step 2: Awaiting Release Please PR creation on main..."
RELEASE_PR=""
MAX_RETRIES=20
RETRY_DELAY=6

for ((i=1; i<=MAX_RETRIES; i++)); do
  RELEASE_PR=$(gh pr list --base main --head "release-please--branches--main" --state open --json number -q '.[0].number // empty')
  if [[ -z "$RELEASE_PR" ]]; then
    RELEASE_PR=$(gh pr list --base main --search "chore(main): release in:title" --state open --json number -q '.[0].number // empty')
  fi

  if [[ -n "$RELEASE_PR" ]]; then
    log "Found open Release PR #$RELEASE_PR."
    break
  fi

  log "Attempt $i/$MAX_RETRIES: Release PR not found yet. Waiting ${RETRY_DELAY}s for Google Release Please action..."
  sleep "$RETRY_DELAY"
done

if [[ -z "$RELEASE_PR" ]]; then
  die "Timed out waiting for Release Please PR to open on main."
fi

log "Merging Release PR #$RELEASE_PR into main via Merge Commit..."
gh pr merge "$RELEASE_PR" --merge --auto=false
success "Release PR #$RELEASE_PR merged into main! (Git Tag & GitHub Release triggered)"

# ─── Step 3: Back-merge main into develop ────────────────────────────────────
log "==> Step 3: Back-merging main into develop..."
git fetch origin main develop --tags
git checkout develop
git merge --no-ff origin/main -m "chore(release): back-merge main into develop"
git push origin develop
success "Back-merge completed! Local and remote develop branches are synchronized."

# ─── Step 4: Summary ────────────────────────────────────────────────────────
LATEST_TAG=$(git describe --tags --abbrev=0)
success "PageSnap Release ${LATEST_TAG} has been published successfully!"
log "Next steps:"
log "1. GitHub Action will package dist/pagesnap-${LATEST_TAG}.zip and attach to release."
log "2. Check release at: https://github.com/HiepLeHoaiNghia/web2md/releases/tag/${LATEST_TAG}"
log "3. Download the ZIP package and upload to Chrome Web Store Developer Dashboard."
