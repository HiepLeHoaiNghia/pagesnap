#!/usr/bin/env bash
# plan-exempt — blueprint release pipeline tooling
# detect-breaking-changes.sh: Proactively inspects git diff and commit metadata
# to detect breaking changes in PageSnap Chrome Extension.
#
# Usage:
#   scripts/detect-breaking-changes.sh [--base=<ref>] [--head=<ref>] [--title=<title>] [--body=<body>]
set -euo pipefail

BASE_REF="origin/develop"
HEAD_REF="HEAD"
PR_TITLE=""
PR_BODY=""
ALLOW_NON_BREAKING="${ALLOW_NON_BREAKING:-}"

for arg in "$@"; do
  case "$arg" in
    --base=*) BASE_REF="${arg#*=}" ;;
    --head=*) HEAD_REF="${arg#*=}" ;;
    --title=*) PR_TITLE="${arg#*=}" ;;
    --body=*) PR_BODY="${arg#*=}" ;;
  esac
done

# Resolve fallback base if origin/develop is not fetched or not available
if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  if git rev-parse --verify "develop" >/dev/null 2>&1; then
    BASE_REF="develop"
  elif git rev-parse --verify "HEAD~1" >/dev/null 2>&1; then
    BASE_REF="HEAD~1"
  fi
fi

# Gather commit messages between BASE and HEAD if title/body not provided
if [[ -z "$PR_TITLE" ]]; then
  PR_TITLE="$(git log "$BASE_REF..$HEAD_REF" -1 --oneline 2>/dev/null | sed 's/^[a-f0-9]* //' || true)"
fi

COMMIT_MSGS="$(git log "$BASE_REF..$HEAD_REF" --format="%B" 2>/dev/null || echo "")"
COMBINED_TEXT="$PR_TITLE
$PR_BODY
$COMMIT_MSGS"

# Check if breaking syntax is declared
HAS_BANG=false
if printf '%s' "$PR_TITLE" | grep -Eq '^[a-zA-Z]+(\(.+\))?!:'; then
  HAS_BANG=true
fi

HAS_FOOTER=false
if printf '%s' "$COMBINED_TEXT" | grep -Eiq 'BREAKING[ -]CHANGE:'; then
  HAS_FOOTER=true
fi

IS_DECLARED_BREAKING=false
if [[ "$HAS_BANG" == "true" || "$HAS_FOOTER" == "true" ]]; then
  IS_DECLARED_BREAKING=true
fi

# If already declared as breaking, everything is consistent
if [[ "$IS_DECLARED_BREAKING" == "true" ]]; then
  echo "✅ [detect-breaking-changes] Breaking change declared in Conventional Commit syntax."
  exit 0
fi

# If explicit bypass reason is provided, allow with warning
if [[ -n "$ALLOW_NON_BREAKING" ]]; then
  echo "⚠️ [detect-breaking-changes] Bypass active: $ALLOW_NON_BREAKING"
  exit 0
fi

# ─── Proactive Signal Detection ──────────────────────────────────────────────
SIGNALS_FOUND=()

# Signal 1: Intent keywords in commit messages or branch name
CURRENT_BRANCH="$(git branch --show-current 2>/dev/null || echo "")"
INTENT_TARGET="$CURRENT_BRANCH $COMBINED_TEXT"

if printf '%s' "$INTENT_TARGET" | grep -Eiq '(revoke-permission|remove-feature|delete-feature|deprecat|breaking-change)'; then
  SIGNALS_FOUND+=("Branch name or commit text mentions feature removal or breaking change keywords")
fi

# Signal 2: Breaking changes in manifest.json permissions
MANIFEST_DIFF="$(git diff -U0 "$BASE_REF..$HEAD_REF" -- manifest.json 2>/dev/null || echo "")"
if [[ -n "$MANIFEST_DIFF" ]]; then
  if printf '%s' "$MANIFEST_DIFF" | grep -Eq '^\-\s*"(permissions|host_permissions)"'; then
    SIGNALS_FOUND+=("manifest.json removed permissions or host_permissions definitions")
  fi
fi

# Signal 3: Removal of actions in src/shared/constants.js
CONSTANTS_DIFF="$(git diff -U0 "$BASE_REF..$HEAD_REF" -- src/shared/constants.js 2>/dev/null || echo "")"
if [[ -n "$CONSTANTS_DIFF" ]]; then
  if printf '%s' "$CONSTANTS_DIFF" | grep -Eq '^\-\s*[A-Z_]+:'; then
    SIGNALS_FOUND+=("src/shared/constants.js removed action constants (potential contract breakage)")
  fi
fi

# ─── Verdict ─────────────────────────────────────────────────────────────────
if [[ ${#SIGNALS_FOUND[@]} -gt 0 ]]; then
  echo "::error::Undeclared Breaking Change Detected!"
  echo "The following potential breaking changes were detected in git diff or commit metadata:"
  for s in "${SIGNALS_FOUND[@]}"; do
    echo "  - $s"
  done
  echo ""
  echo "If this is indeed a breaking change:"
  echo "  1) Add '!' to your PR title: e.g. 'feat(manifest)!: remove background proxy'"
  echo "  2) Or add 'BREAKING CHANGE: <explanation>' to the PR body"
  echo "  3) Tick 'Yes' in the PR template's ## Breaking Changes: section"
  echo ""
  echo "If this is false-positive, pass ALLOW_NON_BREAKING='<reason>' to bypass."
  exit 1
fi

echo "✅ [detect-breaking-changes] No undeclared breaking changes detected."
exit 0
