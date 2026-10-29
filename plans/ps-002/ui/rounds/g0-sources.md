# Nguồn của mọi con số trong vòng G0 (R11: đo lại từ code, 2026-10-30)

Tái tạo: `node plans/ps-002/ui/audit/measure-ui.mjs` (headless Chromium, linear.app, bundle PageSnap thật; cần mạng).

| Con số | Giá trị | Nguồn |
|---|---|---|
| Nút nhìn thấy trên dock | **9**: Expand, Shrink, Pick, Live Studio, Copy Component, Download ZIP, Copy AI Prompt, Copy Selection MD, ✕ | `measure-ui.mjs` (DOM sống); các nút tạo ở `src/content/inspector/overlay.js:359,380,409,467,484,500,517,533,557` |
| Nút "Select Parent" (thứ 10, có điều kiện) | chỉ hiện khi cha có nhiều animation hơn | `overlay.js:442` |
| Nút nhìn thấy trong Studio, tab Live Preview | **17** (6 tab + 11 nút khác) | `measure-ui.mjs` |
| Nút nhìn thấy trong Studio, tab HTML | **18** (thêm "Copy This File") | `measure-ui.mjs` |
| Số tab Studio | **6** | `src/content/inspector/studio-modal.js:166-171` |
| Tên tab HTML | `index.html (Markup Only)` | `studio-modal.js:167` |
| Hành động của dock lặp trong footer Studio | Copy Selection MD, Download ZIP, Copy Component, Copy AI Prompt | `studio-modal.js:884-905` và `overlay.js:484-533` |
| Popup HTML Snapshot bỏ JS | `preserveJs: false` | `src/popup/extract.js:216` |
| Nội dung từng loại đầu ra | bảng ở `brief.md` mục 2 | ZIP `pagesnap-component-div-1344x468 (13).zip` (đã mở và kiểm); `src/content/style-extractor/style-extractor.js:362` (htmlOnly), `:364` (cssOnly), `:365` (reactJsx), `:462` (indexHtml), `:463` (selfContainedHtml) |
| "Copy Component" chứa player | suy từ template, **chưa chạy riêng** | `style-extractor.js:463` `[INFERENCE]` |
| Hàm trích dài ~548 dòng | 76 → 624 | `style-extractor.js:76`, `:624` |

Đính chính một con số tôi đã nói ở chat: "dock có 10 nút" là sai; đếm đúng là **9 nút nhìn thấy** (10 chỉ khi có "Select Parent").
