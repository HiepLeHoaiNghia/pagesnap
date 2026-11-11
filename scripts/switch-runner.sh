#!/usr/bin/env bash
# plan-exempt — CI runner switch requested by the owner (blueprint macos-self-hosted-github-runner). routing-override: skipped — user asked to apply the blueprint directly.
# Switch where GitHub Actions runs for this repository.
#   scripts/switch-runner.sh local    -> the self-hosted Mac runner (free)
#   scripts/switch-runner.sh github   -> GitHub-hosted ubuntu-latest (default)
#   scripts/switch-runner.sh status   -> show the current setting and the runner state
# The workflows read the repository variable CI_RUNNER (see .github/workflows/*.yml).
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
TARGET="${1:-status}"

show_status() {
  local current
  current="$(gh variable get CI_RUNNER --repo "$REPO" 2>/dev/null || true)"
  echo "repo:      $REPO"
  echo "CI_RUNNER: ${current:-<unset> (= github)}"
  echo "runners:"
  gh api "repos/$REPO/actions/runners" --jq '.runners[] | "  \(.name)  \(.status)  busy=\(.busy)"' || true
}

case "$TARGET" in
  local)
    online="$(gh api "repos/$REPO/actions/runners" --jq '[.runners[] | select(.status == "online")] | length')"
    if [ "$online" -eq 0 ]; then
      echo "No self-hosted runner is online for $REPO; jobs would wait forever. Start it: cd ~/actions-runner/<repo> && ./svc.sh start" >&2
      exit 1
    fi
    gh variable set CI_RUNNER --repo "$REPO" --body local
    echo "CI now runs on the local Mac runner."
    ;;
  github)
    gh variable set CI_RUNNER --repo "$REPO" --body github
    echo "CI now runs on GitHub-hosted runners (uses GitHub Actions minutes)."
    ;;
  status)
    show_status
    ;;
  *)
    echo "usage: $0 [local|github|status]" >&2
    exit 2
    ;;
esac
