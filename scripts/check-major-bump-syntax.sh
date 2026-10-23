#!/bin/sh
# plan-exempt — blueprint release pipeline tooling
# check-major-bump-syntax.sh: verify a breaking-change is declared in Conventional Commit syntax.
# Usage: check-major-bump-syntax.sh "<title>" "<body>"
set -e

title="${1:-}"
body="${2:-}"

has_bang() {
  printf '%s' "$title" | grep -Eq '^[a-zA-Z]+(\(.+\))?!:'
}

has_footer() {
  printf '%s' "$body" | grep -Eq '^BREAKING[ -]CHANGE:'
}

breaking_section() {
  printf '%s\n' "$body" | awk '
    /^## Breaking Changes:/ { found=1; next }
    found && /^## / { exit }
    found { print }
  '
}

section="$(breaking_section)"

if [ -n "$section" ]; then
  yes_checked=false
  if printf '%s' "$section" | grep -Eiq '^-[[:space:]]+\[[xX]\][[:space:]]+Yes'; then
    yes_checked=true
  fi

  no_checked=false
  if printf '%s' "$section" | grep -Eiq '^-[[:space:]]+\[[xX]\][[:space:]]+No'; then
    no_checked=true
  fi

  if [ "$yes_checked" = false ] && [ "$no_checked" = false ]; then
    echo "::error::The 'Breaking Changes' checkbox in the PR template was left unanswered."
    echo "Tick exactly one — Yes or No — leaving both unchecked is not valid."
    exit 1
  fi

  if [ "$yes_checked" = true ] && [ "$no_checked" = true ]; then
    echo "::error::Both 'Yes' and 'No' are ticked in 'Breaking Changes'. Tick exactly one."
    exit 1
  fi

  if [ "$yes_checked" = true ]; then
    if ! has_bang && ! has_footer; then
      echo "::error::PR template marks 'Breaking Changes: Yes' but title/body does not use Conventional Commit breaking syntax."
      echo "Fix: add '!' after the type/scope in the title (e.g. feat(api)!: ...),"
      echo "     or add an exact 'BREAKING CHANGE: <reason>' line in the body."
      exit 1
    fi
  else
    if has_bang || has_footer; then
      echo "::error::Title/body declares a breaking change ('!' or 'BREAKING CHANGE:'), but the PR template says No."
      echo "Fix the mismatch — tick Yes and describe the break, or remove the breaking syntax."
      exit 1
    fi
  fi
  exit 0
fi

# Fallback heuristic if PR was created without template
combined="$title
$body"
if printf '%s' "$combined" | grep -iEq '\bbreak(ing)?\b'; then
  if ! has_bang && ! has_footer; then
    echo "::warning::PR description mentions 'break' or 'breaking' but does not declare a Conventional Commit breaking change."
    echo "If this change breaks backward compatibility, add '!' to the title (e.g. feat!: ...) or add 'BREAKING CHANGE: <reason>' to the body."
  fi
fi

exit 0
