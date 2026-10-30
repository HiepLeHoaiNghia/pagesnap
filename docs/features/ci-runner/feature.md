<!-- markdownlint-disable MD013 -->

# CI Runner Switch

> Run the GitHub Actions of this repository on GitHub's hosted runners or on a self-hosted Mac, with one command.

Source blueprint: `macos-self-hosted-github-runner` v1.0.0 (draft, MemoryGrid `knowledge/blueprints/drafts/`).

---

## 1. Overview

| | |
| --- | --- |
| Switch | repository variable `CI_RUNNER` (`local` or anything else) |
| Default | unset or `github` → `ubuntu-latest` (uses GitHub Actions minutes) |
| Local | `local` → `runs-on: [self-hosted, macOS]`, the runner `mac-local-arm64-pagesnap` on the owner's Mac |
| Workflows | `.github/workflows/pr-title-lint.yml`, `.github/workflows/release-please.yml` |
| Command | `scripts/switch-runner.sh [local|github|status]` |

## 2. How-To Flows

### Switch

```bash
scripts/switch-runner.sh status   # variable + runner state
scripts/switch-runner.sh local    # use the Mac (refuses if no runner is online)
scripts/switch-runner.sh github   # back to GitHub-hosted runners
```

Then re-run the failed check on the pull request. The variable is read when a job is queued, so no commit is needed.

### Set up the runner on a Mac (once per repository)

1. `mkdir -p ~/actions-runner/<repo>`; extract the macOS ARM64 runner tarball (version `2.338.2`) there; copy `.env` (it caps `NODE_OPTIONS=--max-old-space-size=2048`).
2. `gh api -X POST repos/<owner>/<repo>/actions/runners/registration-token --jq .token`, then `./config.sh --url https://github.com/<owner>/<repo> --token <token> --labels self-hosted,macOS,ARM64,local-mac --name mac-local-arm64-<repo> --unattended --replace`.
3. `./svc.sh install`, then set `ProcessType=Background`, `Nice=4`, `LowPriorityIO=true` in the LaunchAgent plist, then `./svc.sh start`.
4. Check: `gh api repos/<owner>/<repo>/actions/runners` shows `online`.

### Stop or remove

`./svc.sh stop`, `./svc.sh uninstall`, `./config.sh remove --token <token>`; then `scripts/switch-runner.sh github`.

## 3. Safety

- The repository is private. Do not enable a self-hosted runner on a public repository: a fork pull request could run code on the Mac.
- `pr-title-lint.yml` skips pull requests from forks while `CI_RUNNER=local`.
- If `CI_RUNNER=local` and the Mac is asleep or offline, jobs wait until it is back. Switch to `github` when you need CI without the Mac.

## 4. Changelog

| Date | Change |
| --- | --- |
| 2026-10-30 | Added the `CI_RUNNER` switch, `scripts/switch-runner.sh` and the runner `mac-local-arm64-pagesnap`, after GitHub-hosted jobs stopped starting (account billing limit). |
