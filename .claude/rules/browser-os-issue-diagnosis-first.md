# Browser / OS-Level Symptom Diagnosis Rule

Origin: a download bug ("files saved as hidden `.com.google.Chrome.*`") consumed hours of code changes that never
touched the cause. The cause was a stale, long-running Chrome process (13 days, auto-updated twice underneath it).
A 20-second control test would have shown it immediately. This rule exists so that does not repeat.

## 1. Control test BEFORE editing code
- When a symptom involves the browser or the OS (downloads, file saving, permissions, focus, rendering), first reproduce
  it **outside the extension** (e.g. download any PDF from any site, load a plain page).
- If the control fails too, the fault is NOT in `src/`. STOP changing extension code and diagnose the environment.

## 2. Measure ground truth; do not infer it
For a download symptom, the authoritative signals are:
- Chrome's own records: `chrome.downloads.search({})` (state, error, final path).
- The `downloads` table of the profile `History` DB. Copy the DB first, query by `start_time` (not `id`), and check that
  the DB is current (recent rows in `urls`). Zero rows since a date means Chrome stopped finalizing downloads on that date.
- macOS quarantine xattr: `0281;<ts>;Chrome;<UUID>` = Chrome finalized the download. `0081;<ts>;Chrome;` with no UUID =
  only the auto-quarantine at file creation, i.e. NOT finalized (often a manually renamed temp file).
- Browser process health: `ps` start time and mapped framework version (`lsof -p <pid>`) versus the version on disk.
  A browser that auto-updated on disk while still running is a prime suspect for odd behavior. Restart it first.
- `.com.google.Chrome.*` in Downloads is Chrome's **in-progress temp file**. A leftover means the download never completed.

## 3. Know what your measurement tool changes
- Playwright (`connectOverCDP` and launched contexts) intercepts downloads and names them by GUID.
- DevTools `Browser.setDownloadBehavior` replaces Chrome's filename logic, so the extension's `filename` option is not
  exercised. Never conclude "Chrome ignores filename" from either.
- Branded Chrome 137+ ignores `--load-extension`; load unpacked builds through `Extensions.loadUnpacked`
  (requires `--enable-unsafe-extension-debugging`).

## 4. Verification must be able to fail
- A regex over source text ("file contains `saveAs: true`") is not evidence that a feature works. Do not report
  "N tests pass" as proof of a browser-level fix.
- Prove behavior with a real run, then prove the test is sensitive: mutate the code in a scratch copy and confirm the
  test fails exactly where expected (see how `tests/e2e/e2e-download.mjs` was validated).

## 5. Hypothesis discipline
- Before changing code, state what observation would refute the hypothesis. Change one mechanism per hypothesis and
  revert it when refuted. Flipping `saveAs`, tab strategies, URL types in a loop is guessing, not diagnosing.
- Never "fix" a symptom by renaming or restoring the user's files. End users cannot do that; find the cause.
- State only what was measured. Mark everything else as a hypothesis, and retract claims the moment data contradicts them.

## 6. Never disturb the user's desktop
- No headful browsers, no commands that can raise TCC/permission dialogs, no killing the user's own browser session.
  Ask the user to restart their browser; do not do it for them.
