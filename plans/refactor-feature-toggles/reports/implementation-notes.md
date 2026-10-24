# Implementation Notes — WEB2MD-DOCS-001

## 1. Decisions made (not in spec)

- Repository `docs/features/**/feature.md` is the current feature-behavior source of truth; MemoryGrid `_node.yaml` uses `docs_sot: repo` and worktree-aware resolution.
- Existing MemoryGrid module pages are historical/pointer records rather than synchronized copies of seven feature specs.
- Feature boundaries split clone, API mocking, and inspector into separate docs while cross-linking their Preserve-JS/API-history dependencies.
- README distinguishes `apiMock` document-start reload requirements from Inspector on-demand injection; early Inspector API history still depends on prior interception.
- Premium docs disable markdownlint MD013/MD033/MD045 where long tables and inline badge HTML are deliberate. Three real MD056 table errors were corrected rather than suppressed.

## 2. Deviations from the request

- External URL validation is incomplete because `fmt-md.sh --links` could not launch `lychee` through npm (`could not determine executable to run`). Repository-relative links were validated with a stock-Python checker instead.
- Browser smoke remains manual-pending; documentation does not claim live Chrome validation.
- Rendered HTML previews are local-only under this reports directory and are not staged.

## 3. Trade-offs weighed

- A single repo SoT avoids drift but requires MemoryGrid module pages to become concise pointers/history. Keeping two full specs was rejected.
- Seven focused docs produce some cross-links but avoid one oversized feature document mixing unrelated security and QA boundaries.
- Existing historical frontmatter and Changelog tables in MemoryGrid module docs were preserved for indexing/history while stale bodies were replaced.

## 4. Anything else the reviewer should know

- Seven feature docs rendered successfully with three badges, Mermaid runtime, and 9–10 tables each.
- `node tests/static-checks.mjs`: 10/10 pass; `git diff --check`: pass; repository relative links: pass.
- MemoryGrid docs resolver returns `/Users/hiepleh.n/p-source/web2md-extension/docs/features`.
- Staging must exclude `logs/`, `.claude/`, this reports directory, and rendered HTML.
