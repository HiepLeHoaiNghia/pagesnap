# ps-002 · Brief: giao diện xuất component phải nói rõ "có motion hay không"

Trạng thái: **nháp chờ G0** (2026-10-30). Mọi con số có nguồn ở `rounds/g0-sources.md` (đo lại từ code, R11).

## 1. Vấn đề (đo được)

1. **Chủ không phân biệt được tệp tĩnh và tệp có animation.** "HTML" thực ra là 5 loại tệp với mức motion khác nhau (bảng ở mục 2), nhưng giao diện chỉ gọi chung là HTML / Copy Component.
2. **Giao diện quá dày.** Dock có **9** nút nhìn thấy; Studio có **17** nút trên tab Live Preview và **18** trên tab HTML.
3. **Tên đang gây hiểu nhầm.** Tab "HTML" ghi `index.html (Markup Only)`, nhưng `index.html` trong ZIP có CSS hover và script player (cùng tên tệp, hai nghĩa).
4. **Nhãn lỗi thời.** "JS Motion: None" luôn hiện dù capture đã tự chạy; nút "Analyze motion" nay thừa vì mọi hành động xuất đã tự đo motion.

## 2. Mỗi đầu ra thực sự chứa gì (nền cho các nhãn)

| Đầu ra | Style | CSS animation / hover | Motion theo con trỏ (JS) |
|---|---|---|---|
| Tab HTML (Studio) | không | không | không |
| React JSX | qua `styles.css` | qua `styles.css` | không |
| `styles.css` | có | có (keyframes + hover lift) | không |
| ZIP `index.html` | cần `styles.css` | hover lift có, keyframes không | **có** |
| Copy Component | có, gộp một tệp | có | có |
| Popup "HTML Snapshot" | có | chỉ CSS | không (JS bị bỏ) |

## 3. Ai dùng và việc chính (Grill 2026-10-30)

- **Người dùng chính:** dev hoặc designer thấy một component có motion trên một trang thật và muốn **một tệp mở lên là chạy được y như bản gốc**.
- **Việc phụ:** code tĩnh để tự sửa (HTML / CSS / JSX); brief cho AI agent (AI Prompt).
- Hệ quả thiết kế: hành động "component có motion" là hành động chính, nổi bật nhất.

## 4. Câu hỏi mà giao diện phải trả lời (kiểm được)

| # | Câu hỏi | Cách kiểm |
|---|---|---|
| Q1 | Trước khi bấm, người dùng biết đầu ra **có motion hay không**? | Mọi hành động xuất và mọi tệp có một nhãn motion nhìn thấy ngay, không phải mở thêm gì |
| Q2 | Nút nào cho "component chạy được như gốc"? | Có **đúng một** hành động chính, nổi bật hơn phần còn lại, ở cả dock và Studio |
| Q3 | Tệp này chứa gì? | Mỗi tab/tệp có một dòng nói rõ: markup / style / animation CSS / script motion |
| Q4 | Có quá nhiều điều khiển không? | Đếm theo luật chốt ở G0-2: dock ≤ 5, Studio ≤ 8 |
| Q5 | Vì sao phải chờ ~40 giây? | Trạng thái chờ nói rõ đang đo cái gì và có Skip (giữ hành vi hiện có) |

## 5. Giới hạn

- Dock tối đa **5**, Studio tối đa **8** điều khiển nhìn thấy cùng lúc (cách đếm: G0-2).
- Không thêm quyền vào `manifest.json`.
- Không bỏ tính năng nào; chỉ đổi chỗ hoặc gom nhóm.
- Popup giữ nguyên bố cục (UI-4); chỉ sửa **nhãn** tab HTML.

## 6. Quyết định cũ (plans/ui-unification, 2026-10-24) và việc mở lại

| Mã | Nội dung đã chốt | Lần này |
|---|---|---|
| UI-1 | Dock có Copy Selection MD | **Giữ** ý "dùng được từ dock" (có thể nằm trong menu ⋯, xem G0-3) |
| UI-2 | Tên thống nhất "Copy Component" / "Copy AI Prompt" | **Mở lại**: đặt tên theo kết quả (có motion / tĩnh) |
| UI-3 | Footer Studio có cùng bộ hành động với dock | **Giữ** |
| UI-4 | Popup = Full Page Mode, dock = Inspect Component | **Giữ** |

## 7. Ngoài phạm vi

- Bố cục popup, trích Markdown, engine đo/replay motion, định dạng xuất mới, hỗ trợ trang khác ngoài Linear.
- **Tổ chức lại code** (tách adapter Linear, một nguồn duy nhất cho lift, lưới test) là **ticket riêng đi sau khi G2 được duyệt và trước khi dựng** (bước 7). Thiết kế ở đây không được giả định cấu trúc code hiện tại.

## 8. Thứ tự đã chốt (Grill)

Thiết kế giao diện và duyệt mockup trước, code sau.
