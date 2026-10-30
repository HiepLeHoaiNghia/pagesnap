# ps-004: CI runs on GitHub or on the local Mac

## Why

PR #19's only check (`lint-title`) did not start: "recent account payments have failed or your spending limit needs to be increased". The owner has a blueprint for a self-hosted Mac runner and asked to apply it so CI can switch between GitHub-hosted and local.

## What changes

| Piece | Change |
| --- | --- |
| `.github/workflows/pr-title-lint.yml`, `release-please.yml` | `runs-on` reads `vars.CI_RUNNER`; the lint job skips fork pull requests while local |
| `scripts/switch-runner.sh` | `local`, `github`, `status` |
| Mac | runner `mac-local-arm64-pagesnap` registered for this repository, LaunchAgent with `Background`, `Nice 4`, `LowPriorityIO` |
| Repository variable | `CI_RUNNER=local` (set now because GitHub-hosted jobs cannot start) |
| `docs/features/ci-runner/feature.md` | how to switch and set up |

## Not in this ticket

Docker-based workflows, an organization-level runner, other repositories.

## Changelog

- 2026-10-30: blueprint `macos-self-hosted-github-runner` v1.0.0 applied (draft blueprint, applied by hand: it ships no templates). Runner online; `scripts/switch-runner.sh status` shows `CI_RUNNER=local`.
