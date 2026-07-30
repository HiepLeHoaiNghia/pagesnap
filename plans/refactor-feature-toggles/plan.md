<!-- markdownlint-disable MD013 MD040 -->

# Refactor web2md-extension: tách feature thành module + per-feature toggle

status: fixed + automated checks passed (2026-07-30) — browser smoke manual-pending

## Changelog

- 2026-07-30 (docs): Added seven canonical premium feature docs under `docs/features/`, rewrote README, configured MemoryGrid repo docs SoT, reconciled stale MemoryGrid architecture/module pointers, rendered seven HTML previews, and passed static/internal-link/diff checks. External URL validation is tooling-blocked (`lychee` unavailable); browser smoke remains manual-pending.
- 2026-07-30 (follow-up): Sửa region targetElement serialization; bridge injection khi base bundle đã tồn tại + concurrent dedup; reorder mock-stub; xoá dead inspectElementClicked protocol; Netlify PAT local-only + migrate/remove legacy sync an toàn race. Thêm `tests/static-checks.mjs`: 10/10 pass; toàn bộ JS syntax + diff check pass; independent JS review: no findings. Chrome 151 CLI không load unpacked extension (headless/headful đều chỉ thấy component extensions), nên browser smoke manual-pending.
- 2026-07-30: Thực hiện toàn bộ 8 phase. background.js→8 ESM, content.js→14 module namespace, main_world.js→4 file gated, popup.js→12 ESM + Features toggles, xoá 5 file gốc, README cập nhật. Verify tĩnh: node --check pass, 18 background actions parity OK, Web2MD refs OK, 23 bundle files exist, manifest JSON hợp lệ. Manual test trong Chrome: PENDING (user).

## Context

Repo hiện tại là Chrome MV3 extension với 4 file khổng lồ (`content.js` 3082 dòng, `popup.js` 1731, `main_world.js` 1706, `background.js` 301) chứa 7 feature trộn lẫn:

| ID  | Feature                                          | Default sau refactor         |
| --- | ------------------------------------------------ | ---------------------------- |
| F1  | Page → Markdown/HTML copy                        | **ON**                       |
| F2  | Region selection copy (+ context menu)           | **ON**                       |
| F3  | HTML clone → self-contained HTML / ZIP / Netlify | **ON**                       |
| F4  | API interception + mocking (patch fetch/XHR)     | **OFF**                      |
| F5  | Inspect mode (React/Vue/Angular + mock editor)   | **OFF**                      |
| F6  | Visual edit mode                                 | **OFF**                      |
| F7  | VFS/React project detection                      | **OFF** (đi cùng nhóm F4/F5) |

**Vấn đề chính (đã xác nhận):** manifest inject `main_world.js` + `isolated_bridge.js` vào **mọi URL, mọi frame, tại `document_start`**. `main_world.js` patch `window.fetch` (dòng 322–430) và `window.XMLHttpRequest` (431–585) **vô điều kiện** — kể cả khi mocking off, mọi request vẫn bị wrap/record → làm nhiều website lỗi API. `isolated_bridge.js` cũng chạy `resetApiCalls`/`getMockingEnabled` trên mọi page load.

**Mục tiêu:** tách mỗi feature thành module riêng; feature flags lưu `chrome.storage`; khi F4/F5/F6/F7 tắt thì **không inject script nào vào trang** (không chỉ gate bằng if). Không dùng build step (quyết định của user) — plain JS, load extension trực tiếp từ repo.

## Quyết định kiến trúc

- **Không build step.** Background service worker + popup dùng **ES modules native** (MV3 hỗ trợ: `"type": "module"` cho SW; popup là HTML page nên `<script type="module">` chạy bình thường). Content scripts & MAIN-world scripts **không hỗ trợ ES modules** → dùng **namespace pattern** (`window.Web2MD.*`) với danh sách file load theo thứ tự, quản lý tập trung ở 1 injector duy nhất.
- **Xoá static `content_scripts` khỏi manifest.** Background dùng `chrome.scripting.registerContentScripts()` **đăng ký động** main-world interceptor + bridge CHỈ KHI flag `apiMock`/`inspect` bật (cần `document_start` để bắt call sớm); unregister khi tắt. Đây là cơ chế MV3 chuẩn, persist qua restart.
- **Patterns áp dụng:**
  - _Message Router_ (registry `action → handler`) thay chuỗi if/else khổng lồ ở background và content.
  - _Feature Module_: mỗi feature content-side export `{ id, handlers, init }` tự đăng ký vào router; injector chỉ inject file của feature đang bật.
  - _Feature Gate_ ở popup: element gắn `data-feature="apiMock"` → ẩn khi flag off.
  - _Single Source of Truth_: 1 bản `htmlToMarkdown`/turndown-config, 1 bản zip-builder, 1 bản css-url utils, 1 bản `escapeHtml`/toast — dùng chung qua namespace file (popup include cùng file plain JS đó qua `<script>` thường trước module entry).
- **Nguyên tắc di code: move verbatim** — giữ nguyên logic/hành vi, chỉ đổi chỗ ở và cách wiring. Không sửa thuật toán trong đợt này.

## Cấu trúc thư mục đích

```
manifest.json                     # bỏ static content_scripts; SW type:module; version bump 0.2.0
src/
  shared/
    constants.js                  # tên message action + postMessage type (1 nơi duy nhất)
    feature-flags.js              # schema + defaults + get/set/onChanged (ESM, dùng ở bg+popup)
  background/                     # ES modules
    index.js                      # entry: import & wire các module dưới
    router.js                     # onMessage registry
    injector.js                   # ensureScriptsInjected + registerContentScripts theo flags
    context-menus.js              # menu region copy (chỉ tạo khi regionSelect on)
    api-mock-store.js             # tabApiCalls/tabMockingEnabled + toàn bộ handler F4
    project-store.js              # tabProjects (F7)
    asset-proxy.js                # fetchExternalStyleSheet/Script/AssetAsBase64 + fetchStyleSheetRecursively
    downloads.js                  # triggerDownload
  content/                        # plain JS, namespace window.Web2MD
    core/namespace.js             # guard + Web2MD ns + router content-side (action registry)
    core/utils.js                 # showToast, copyTextToClipboard, escapeHtml, css-url utils
    core/settings.js              # getSettings
    markdown/dom-preprocess.js    # syncFormValues, preProcessFormControls/DOM/LayoutTables, isLayoutTable
    markdown/extractor.js         # extractPageContent, extractVisibleFormContent, handleExtractContentRequest
    markdown/turndown-config.js   # htmlToMarkdown + custom rules (popup cũng include file này)
    markdown/handlers.js          # handlePageConversion/handleSelectionConversion + đăng ký actions F1
    region-select/mode.js         # toggle/keydown/mouse/highlight + contextMenuCopyRegion
    region-select/actions-bar.js  # showRegionActionsBar, renderActionsBarContents, findParentHeaders, handleRegionAction
    html-clone/serializer.js      # serializePageToSelfContainedHtml + serializeNode + adoptedStyleSheets
    html-clone/mock-stub.js       # generateMockInterceptorCode (cầu F3↔F4, vẫn thuộc F3)
    html-clone/zip-builder.js     # logic ZIP dùng chung (region download-zip + popup buildZipBlob)
    visual-edit/visual-edit.js    # F6 trọn bộ
    mock-bridge/relay.js          # getApiCallsFromMainWorld + relay getApiCalls/update/delete/syncMocks (chỉ inject khi apiMock on)
  main-world/                     # plain JS, chỉ inject khi flag tương ứng bật
    core.js                       # guard, escapeHtml, showToast, message bus
    api-interceptor.js            # patch fetch/XHR + mock store + matchMock (F4)
    vfs-scanner.js                # findVFS/scoreVFS/scanDOMForVFS (F7)
    inspector.js                  # detect framework, tooltip, mock editor modal, inspect mode (F5)
  isolated-bridge.js              # giữ nguyên nội dung, chỉ được inject/register khi apiMock|inspect on
popup.html                        # thêm section Features trong settings; data-feature attrs
popup.css                         # giữ nguyên, thêm style cho feature toggles
src/popup/                        # ES modules
    index.js                      # entry
    state.js                      # safeStorage, settings load/save
    feature-gate.js               # đọc flags → ẩn/hiện UI data-feature, render toggle list
    extract.js                    # autoExtractPage, injectScriptsAndRetry (gọi background injector), fallback markdown
    tabs.js                       # chuyển tab MD/HTML/API + footer visibility
    mode-toggles.js               # edit/inspect/region checkboxes + mutual exclusion
    api-mocks.js                  # list/editor/clear-all (F4 UI)
    html-clone.js                 # ZIP download + Netlify deploy
    project.js                    # project banner + downloadProjectMarkdown (F7 UI)
lib/                              # giữ nguyên
```

Các file gốc `content.js`, `main_world.js`, `popup.js`, `background.js`, `isolated_bridge.js` bị **xoá** ở bước cuối sau khi verify parity (git giữ lịch sử).

## Feature flags

- Key `chrome.storage.sync['featureFlags']`, tách khỏi key `settings` hiện có:

  ```js
  { markdown: true, regionSelect: true, htmlClone: true,
    apiMock: false, inspect: false, visualEdit: false, projectDetect: false }
  ```

- `feature-flags.js` cung cấp `getFlags()`, `setFlag()`, `onFlagsChanged()` (wrap `chrome.storage.onChanged`).
- **Injection theo flag** (điểm mấu chốt sửa lỗi website):
  - `apiMock` on → background `registerContentScripts`: `main-world/core.js` + `api-interceptor.js` (world MAIN, document_start, all_frames) + `isolated-bridge.js` (ISOLATED, document_start). Off → `unregisterContentScripts` + toast/notice "reload trang để áp dụng".
  - `inspect` on → thêm `vfs-scanner.js` + `inspector.js` vào bộ MAIN-world (inspect cần interceptor data → bật inspect tự yêu cầu bộ core+interceptor được inject on-demand khi user bấm toggle, không cần document_start).
  - `projectDetect` on → inject `vfs-scanner.js` on-demand trong flow extract.
  - F1/F2/F3/F6 giữ mô hình **lazy injection** hiện tại (chỉ inject khi user thao tác) — bộ file: `lib/*` + `content/core/*` + file của feature được gọi. Injector giữ **1 mảng thứ tự file duy nhất** cho content bundle để khỏi lệch thứ tự.
- Popup: settings panel thêm mục **Features** với toggle từng feature; UI thuộc feature off bị ẩn (API tab, inspect/edit checkbox, project banner...). Khi bật/tắt apiMock hiển thị hint "Reload tab để có hiệu lực".
- Mutual exclusion giữ nguyên: inspect / visual edit / region select vẫn loại trừ lẫn nhau khi cùng bật runtime.

## Hành vi thay đổi có chủ đích (ngoài spec gốc = ghi implementation-notes)

1. Trang web mặc định **không còn bị inject bất kỳ script nào** cho tới khi user thao tác (extract/region) — hết lỗi API.
2. `isolated_bridge` không còn reset/sync mocks trên mọi page load — chỉ khi apiMock on.
3. Action `getApiCalls` đang bị overload (background lẫn content cùng handle) → giữ nguyên semantics nhưng tách tên hằng trong `constants.js` và ghi chú; không đổi protocol đợt này.
4. `inspectElementClicked` được xác nhận là dead protocol không có sender và đã xoá trong follow-up `1a81a90`.

## Thứ tự thực hiện (phases)

1. **Baseline commit**: commit các thay đổi đang dở trên `develop` (working tree hiện có 8 file modified) để có điểm quay lui trước khi refactor. _(cần user đồng ý khi approve plan)_
2. **Scaffold**: tạo `src/shared/` (constants, feature-flags), cập nhật `manifest.json` (bỏ content_scripts, SW module, giữ nguyên permissions).
3. **Background**: tách `background.js` → `src/background/*` (router + 6 module), thêm injector động theo flags.
4. **Content**: tách `content.js` → `src/content/*` theo bảng trên, move verbatim, wiring qua `window.Web2MD` + content router.
5. **Main world + bridge**: tách `main_world.js` → 4 file; interceptor chỉ install patch trong file riêng; bridge giữ nguyên nội dung; cả hai chỉ inject theo flag.
6. **Popup**: tách `popup.js` → ES modules, thêm Features section + feature-gate, sửa các hàm inject dùng chung injector qua message tới background.
7. **Dedup**: hợp nhất `escapeHtml`, `resolveCssUrls`, toast, zip-builder, turndown-config (popup fallback `localHtmlToMarkdown` dùng chung `turndown-config.js`).
8. **Cleanup + docs**: xoá 5 file gốc, cập nhật README (cấu trúc mới + bảng feature flags), viết `plans/refactor-feature-toggles/reports/implementation-notes.md` (local, không commit).

Phases 3–6 sẽ delegate cho builder subagent (Sonnet) theo brief chi tiết từng phase; orchestrator review diff từng phase.

## Verification

Sau mỗi phase và cuối cùng:

1. `chrome://extensions` → Load unpacked từ repo → không lỗi manifest/SW (kiểm tra SW console).
2. **Mặc định (F4–F7 off):** mở 1 SPA thật → DevTools console: `window.fetch.toString()` phải chứa `[native code]`; `XMLHttpRequest` nguyên bản; không có message `WEB2MD_*`; website gọi API bình thường.
3. **F1:** popup → Extract → Markdown hiển thị, Copy/Download hoạt động; thử trang article (Readability path) + trang app (visible-text fallback).
4. **F2:** bật region select + context menu "Copy region as Markdown/HTML".
5. **F3:** tab HTML Clone → preview iframe, Download ZIP mở được offline.
6. **Bật apiMock trong Features** → reload tab → API tab ghi nhận calls, sửa mock có hiệu lực, Clear all mocks; tắt flag + reload → fetch native trở lại.
7. **F5/F6:** bật inspect → hover tooltip framework + mock editor; visual edit ẩn/hiện element. Mutual exclusion 3 mode.
8. Syntax check nhanh mỗi file: `node --check` cho từng file JS (trừ file dùng API chrome vẫn parse được).
