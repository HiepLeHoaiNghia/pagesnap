// plan-exempt — ps-002 G1 wireframe + round builder. Regenerate with: node plans/ps-002/ui/wireframes/build-g1.mjs
// Grey wireframes only (R2): no brand colour, no shadow. Labels and counts are the real ones; layout is the proposal.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const uiDir = path.resolve(here, '..');

// ---------- shared snippets (each region keeps its id so any later option can find it again, R18) ----------
const b = (label, cls = '', sub = '') => `<span class="b ${cls}">${label}${sub ? `<small>${sub}</small>` : ''}</span>`;
const region = (id, inner, cls = '') => `<div id="${id}" class="${cls}">${inner}</div>`;

// Baseline = today's UI, shown as the comparison until an option is chosen.
const dockToday = region('dock-wire',
  `<div class="row">${['🔼 Expand', '🔽 Shrink', '🎯 Pick'].map((l) => b(l)).join('')}<span class="sep"></span>${['✨ Live Studio', '🎨 Copy Component', '📦 Download ZIP', '🤖 Copy AI Prompt', '📝 Copy Selection MD', '✕'].map((l) => b(l)).join('')}</div><p class="cap">Hiện trạng: <b>9</b> nút, không nút nào nói nó có motion hay không.</p>`);
const footerToday = region('studio-footer-wire',
  `<div class="row">${['📝 Copy Selection MD'].map((l) => b(l)).join('')}<span class="grow"></span>${['📦 Download ZIP', '🎨 Copy Component', '🤖 Copy AI Prompt'].map((l) => b(l)).join('')}</div>`);
const tabsToday = region('studio-tabs-wire',
  `<div class="row">${['👁️ Live Preview', '📄 HTML', '🎨 CSS', '⚛️ React JSX', '🎛️ Tokens', '🤖 AI Specs'].map((l) => b(l, 'tab')).join('')}</div><div class="row tools">${['🔼 Expand', '🔽 Shrink', '✏️ Direct Text Edit (Off)', '🎬 JS Motion: None', '🎯 Re-Inspect', '🔬 Analyze motion'].map((l) => b(l)).join('')}</div><p class="cap">Hiện trạng: 6 tab + 11 nút khác = <b>17</b>. "JS Motion: None" và "Analyze motion" là nhãn/nút lỗi thời.</p>`);
const filesToday = region('studio-files-wire',
  `<table><tr><th>Tệp</th><th>Nhãn</th><th>Chứa gì</th></tr>
   <tr><td>index.html (Markup Only)</td><td class="muted">không có</td><td>tab HTML ghi "Markup Only", nhưng index.html trong ZIP có cả hover CSS và script</td></tr></table>`);

// Proposed Studio tab strip (decided in G0-2: count tabs, 3 tabs; the Code tab carries the file menu, so it is one control).
const tabsNew = region('studio-tabs-wire',
  `<div class="row">${b('👁️ Preview', 'tab')}${b('⟨⟩ Code ▾', 'tab on')}${b('🤖 AI Specs', 'tab')}<span class="grow"></span>${b('⋯', 'ghost')}${b('✕', 'ghost')}</div>
   <p class="status">▶ Motion đo xong: spring theo con trỏ · 30 giá trị · 5 vùng hover. <span class="muted">(thay cho "JS Motion: None" và nút Analyze; chỉ là dòng trạng thái, không phải nút)</span></p>
   <p class="cap">Đếm: <b>3 tab + 5 hành động = 8</b>. ✕ và ⋯ không tính (G0-2). Expand, Shrink, Direct Text Edit, Re-Inspect nằm trong ⋯.</p>`);

// ---------- V-1 vocabulary: only touches #studio-files-wire ----------
const chip = (t, cls = '') => `<span class="chip ${cls}">${t}</span>`;
const files3 = region('studio-files-wire',
  `<table><tr><th>Tệp (menu Code ▾)</th><th>Nhãn</th><th>Chứa gì</th></tr>
   <tr><td>index.html</td><td>${chip('Animated (JS)', 'strong')}</td><td>markup + hover CSS + script chạy motion; cần styles.css đi kèm</td></tr>
   <tr><td>styles.css</td><td>${chip('CSS motion')}</td><td>style + 75 @keyframes + 28 luật hover</td></tr>
   <tr><td>Component.jsx</td><td>${chip('Markup only')}</td><td>markup React; import styles.css</td></tr>
   <tr><td>tokens.json</td><td>${chip('Data')}</td><td>design tokens + model motion đo được</td></tr></table>`);
const files2 = region('studio-files-wire',
  `<table><tr><th>Tệp (menu Code ▾)</th><th>Nhãn</th><th>Chứa gì</th></tr>
   <tr><td>index.html</td><td>${chip('Animated', 'strong')}</td><td>markup + hover CSS + script chạy motion; cần styles.css đi kèm</td></tr>
   <tr><td>styles.css</td><td>${chip('Static', 'bad')}</td><td>style + 75 @keyframes + 28 luật hover <b class="warn">← có motion CSS nhưng nhãn nói "Static"</b></td></tr>
   <tr><td>Component.jsx</td><td>${chip('Static')}</td><td>markup React; import styles.css</td></tr>
   <tr><td>tokens.json</td><td>${chip('Data')}</td><td>design tokens + model motion đo được</td></tr></table>`);

// ---------- V-2 dock + Studio footer composition: replaces #dock-wire and #studio-footer-wire together ----------
const dockFlat = region('dock-wire',
  `<div class="row">${b('✨ Live Studio', 'ghost')}<span class="sep"></span>${b('▶ Copy animated', 'primary', 'Animated (JS)')}${b('📦 Download ZIP', '', 'Animated (JS)')}${b('Copy code · no JS', '', 'CSS motion')}${b('📝 Copy Selection MD', '', 'Text')}<span class="sep"></span>${b('⋯', 'ghost')}${b('✕', 'ghost')}</div>
   <p class="cap">5 nút + ⋯ + ✕. Nút chính tô đậm; mỗi nút xuất có một dòng nhỏ nói nó chứa gì. Copy AI Prompt, Expand, Shrink, Pick nằm trong ⋯.</p>`);
const footFlat = region('studio-footer-wire',
  `<div class="row">${b('📝 Copy Selection MD', '', 'Text')}<span class="grow"></span>${b('Copy code · no JS', '', 'CSS motion')}${b('📦 Download ZIP', '', 'Animated (JS)')}${b('▶ Copy animated', 'primary', 'Animated (JS)')}</div>`);

const dockGrouped = region('dock-wire',
  `<div class="row">${b('✨ Live Studio', 'ghost')}<span class="sep"></span>
   <div class="grp"><span class="gcap">Có motion · Animated (JS)</span><div class="row">${b('▶ Copy animated', 'primary')}${b('📦 Download ZIP')}</div></div>
   <div class="grp"><span class="gcap">Không có JS</span><div class="row">${b('Copy code · no JS')}${b('📝 Copy Selection MD')}</div></div>
   <span class="sep"></span>${b('⋯', 'ghost')}${b('✕', 'ghost')}</div>
   <p class="cap">Cùng 5 nút + ⋯ + ✕, nhưng chia hai nhóm có tiêu đề: nhóm "có motion" và nhóm "không có JS". Rộng hơn khoảng một phần năm.</p>`);
const footGrouped = region('studio-footer-wire',
  `<div class="row"><div class="grp"><span class="gcap">Không có JS</span><div class="row">${b('📝 Copy Selection MD')}${b('Copy code · no JS')}</div></div><span class="grow"></span>
   <div class="grp"><span class="gcap">Có motion · Animated (JS)</span><div class="row">${b('📦 Download ZIP')}${b('▶ Copy animated', 'primary')}</div></div></div>`);

const dockAi = region('dock-wire',
  `<div class="row">${b('✨ Live Studio', 'ghost')}<span class="sep"></span>${b('▶ Copy animated', 'primary', 'Animated (JS)')}${b('📦 Download ZIP', '', 'Animated (JS)')}${b('🤖 Copy AI Prompt', '', 'Spec for AI')}${b('📝 Copy Selection MD', '', 'Text')}<span class="sep"></span>${b('⋯', 'ghost')}${b('✕', 'ghost')}</div>
   <p class="cap">5 nút + ⋯ + ✕. Giữ Copy AI Prompt nhìn thấy; "Copy code · no JS" xuống ⋯ (muốn tệp tĩnh phải mở ⋯ trước).</p>`);
const footAi = region('studio-footer-wire',
  `<div class="row">${b('📝 Copy Selection MD', '', 'Text')}<span class="grow"></span>${b('🤖 Copy AI Prompt', '', 'Spec for AI')}${b('📦 Download ZIP', '', 'Animated (JS)')}${b('▶ Copy animated', 'primary', 'Animated (JS)')}</div>`);

// ---------- the page ----------
const page = `<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ps-002 · G1 · Dock và Studio (wireframe xám)</title>
<style>
  body{margin:0;padding:20px;background:#15171a;color:#d7dade;font:13px/1.45 system-ui,sans-serif}
  h1{font-size:16px;margin:0 0 2px} h2{font-size:12px;margin:0 0 8px;color:#aab0b8;text-transform:uppercase;letter-spacing:.04em}
  .note{color:#8a9099;margin:0 0 16px}
  .panel{border:1px solid #2c3036;border-radius:8px;padding:12px 14px;background:#1b1e22;margin-bottom:14px}
  .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
  .b{display:inline-flex;flex-direction:column;align-items:flex-start;border:1px solid #4a505a;border-radius:6px;padding:4px 10px;background:#22262b;font-size:12px;line-height:1.25;white-space:nowrap}
  .b small{font-size:10px;color:#8a9099;margin-top:1px}
  .b.primary{background:#3a3f47;border-color:#9aa1ab;font-weight:600;color:#fff}
  .b.ghost{background:transparent}
  .b.tab{border-radius:6px 6px 0 0}.b.tab.on{background:#3a3f47;border-color:#9aa1ab;color:#fff}
  .tools{margin-top:6px}
  .sep{width:1px;height:22px;background:#3a3f47;margin:0 4px}.grow{flex:1}
  .grp{border-left:2px solid #4a505a;padding-left:8px}.gcap{display:block;font-size:10px;color:#8a9099;margin-bottom:2px}
  .cap{color:#8a9099;margin:8px 0 0;font-size:12px}.status{margin:8px 0 0;color:#c8ccd2}
  .muted{color:#8a9099}.warn{color:#e3cf8f;font-weight:600}
  .chip{display:inline-block;border:1px solid #4a505a;border-radius:4px;padding:0 6px;font-size:12px}
  .chip.strong{border-color:#9aa1ab;color:#fff}.chip.bad{border-color:#7a6a3a;color:#e3cf8f}
  table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #2c3036;padding:5px 8px;text-align:left;vertical-align:top}th{color:#aab0b8}
  .stage{display:flex;flex-direction:column;gap:10px}
  .sample{width:760px;max-width:100%;height:200px;overflow:hidden;border:1px solid #2c3036;border-radius:6px;background:#0b0c0e}
  .sample img{display:block;width:801px;margin-left:-21px;margin-top:-121px}
  .studio{border:1px solid #3a3f47;border-radius:8px;background:#101215;max-width:900px}
  .studio .bar{padding:8px 12px;border-bottom:1px solid #2c3036;color:#8a9099;font-size:12px}
  .studio .sec{padding:10px 12px;border-bottom:1px solid #2c3036}
  .studio .foot{padding:10px 12px}
</style></head><body>
<h1>ps-002 · G1 · Dock và Studio <span class="chip">wireframe xám, chưa phải thiết kế cuối</span></h1>
<p class="note">Đã chốt từ G0: đếm cả tab (3 tab + 5 hành động); Copy Selection MD luôn nhìn thấy; dock tối đa 5 nút. Ảnh dưới đây bắt đầu ở <b>hiện trạng</b>; chọn đáp án để thấy bản đề xuất thay vào.</p>

<div class="panel" id="sec-dock"><h2>1 · Dock trên trang (chọn ở V-2)</h2>
  <div class="stage">${dockToday}<div class="sample"><img src="../audit/component-sample.png" alt="Component Linear mẫu"></div></div></div>

<div class="panel" id="sec-studio"><h2>2 · Component Studio, tab Code (V-1 đổi bảng tệp, V-2 đổi footer)</h2>
  <div class="studio"><div class="bar">Component Studio · div.GJ9TEa_benefits</div>
    <div class="sec">${tabsToday}</div>
    <div class="sec">${filesToday}</div>
    <div class="foot">${footerToday}</div></div></div>
</body></html>
`;

fs.writeFileSync(path.join(uiDir, 'rounds', 'g1-page.html'), page);

// ---------- the round ----------
const rep = (selector, html) => ({ op: 'replaceWith', selector, html });
const round = {
  id: 'g1-ps002',
  title: 'ps-002 · G1 · Dock và Studio nhìn như thế nào (nhãn motion, cách chia nhóm)',
  how: 'Mỗi mục: bấm "Show me" để xem chỗ nó áp dụng, chọn một đáp án và hình dock / Studio bên cạnh đổi theo. Hình ban đầu là HIỆN TRẠNG để so sánh. Không có đáp án nào được chọn sẵn; "Không có ý kiến" cũng là một đáp án. Đáp án lưu ở g1.answers.json.',
  noPreference: 'Không có ý kiến',
  groups: [
    { id: 'words', label: 'Từ ngữ nhãn motion', how: 'Người dùng đọc nhãn nào để biết tệp có chạy motion không.' },
    { id: 'layout', label: 'Bố cục dock và footer Studio', how: 'Năm nút nằm ra sao, nhóm nào, chỗ nào.' }
  ],
  items: [
    {
      id: 'V-1', group: 'words', effect: 'V1',
      question: 'Nhãn motion trên tệp có hai mức hay ba mức?',
      why: 'Hai mức buộc styles.css mang nhãn "Static" dù nó chứa 75 khối @keyframes và 28 luật hover lift (đo từ ZIP (13)): nhãn sai theo hướng ngược lại với điều bạn lo. Ba mức chính xác nhưng có thêm một từ để học. Khuyến nghị ba mức; nó thua ở chỗ khó nhớ hơn một chút.',
      where: 'Bảng tệp trong tab Code của Studio', target: '#studio-files-wire',
      example: 'Mở menu Code ▾ và thấy styles.css: hai mức ghi "Static" (sai), ba mức ghi "CSS motion" (đúng).',
      onScreen: 'Bảng tệp trong Studio đổi nhãn và dòng "chứa gì". Bố cục dock không đổi ở mục này.',
      options: [
        { value: 'three', label: 'Ba mức: Animated (JS) / CSS motion / Markup only', recommended: true, ops: [rep('#studio-files-wire', files3)] },
        { value: 'two', label: 'Hai mức: Animated / Static', ops: [rep('#studio-files-wire', files2)] }
      ]
    },
    {
      id: 'V-2', group: 'layout', effect: 'V2',
      question: 'Dock và footer Studio nên xếp thế nào để thấy ngay nút nào có motion?',
      why: 'Cả ba đều có đúng 5 nút + ⋯ + ✕ (đúng giới hạn bạn chốt). Khác nhau ở chỗ nhãn motion nằm đâu. A: chữ nhỏ dưới mỗi nút, gọn nhất nhưng phải đọc từng nút. B: chia hai nhóm có tiêu đề, nhìn là phân biệt ngay (đúng nỗi lo của bạn) nhưng dock rộng hơn khoảng một phần năm. C: giữ Copy AI Prompt nhìn thấy, đưa "Copy code · no JS" vào ⋯, nên muốn tệp tĩnh phải mở ⋯. Khuyến nghị B; nó thua ở độ rộng và độ phức tạp. Nhãn trên hình dùng bộ từ ba mức; nếu V-1 chọn hai mức thì chữ đổi, bố cục giữ nguyên.',
      where: 'Dock ở hình 1 và footer Studio ở hình 2', target: '#dock-wire',
      example: 'B: bên trái hai nút dưới tiêu đề "Có motion · Animated (JS)", bên phải hai nút dưới tiêu đề "Không có JS".',
      onScreen: 'Dock và footer Studio cùng đổi theo đáp án (UI-3: footer Studio phản chiếu dock).',
      options: [
        { value: 'flat', label: 'A · Một hàng, nhãn nhỏ dưới mỗi nút', ops: [rep('#dock-wire', dockFlat), rep('#studio-footer-wire', footFlat)] },
        { value: 'grouped', label: 'B · Chia hai nhóm có tiêu đề', recommended: true, ops: [rep('#dock-wire', dockGrouped), rep('#studio-footer-wire', footGrouped)] },
        { value: 'ai-visible', label: 'C · Một hàng, giữ Copy AI Prompt, tệp tĩnh vào ⋯', ops: [rep('#dock-wire', dockAi), rep('#studio-footer-wire', footAi)] }
      ]
    },
    {
      id: 'V-3', group: 'layout', effect: 'V3',
      question: 'Studio dùng 3 tab (Preview · Code ▾ · AI Specs) như hình này, hay giữ 6 tab và bỏ bớt nút khác?',
      why: 'Bạn đã chốt đếm cả tab (G0-2), nên 6 tab + footer vượt 8. Hình bên cho thấy bản 3 tab: HTML, CSS, JSX, Tokens nằm trong menu Code ▾, "JS Motion: None" và "Analyze motion" biến mất (đã tự đo), Expand/Shrink/Direct Text Edit/Re-Inspect vào ⋯. Mục này chỉ để bạn xem và nói nếu muốn khác. Nó thua ở chỗ xem CSS thành hai cú bấm.',
      where: 'Dải tab của Studio ở hình 2', target: '#studio-tabs-wire',
      example: 'Hôm nay: bấm tab "CSS" (1 lần). Với bản này: bấm "Code ▾" rồi chọn styles.css (2 lần).',
      onScreen: 'Dải tab đổi từ 6 tab + 6 nút công cụ sang 3 tab + dòng trạng thái motion.',
      options: [
        { value: 'three-tabs', label: 'Dùng bản 3 tab như hình', recommended: true, ops: [rep('#studio-tabs-wire', tabsNew)] },
        { value: 'change', label: 'Muốn khác (ghi muốn gì)', needsNote: true, ops: [rep('#studio-tabs-wire', tabsToday)] }
      ]
    }
  ]
};
fs.writeFileSync(path.join(uiDir, 'rounds', 'g1.json'), JSON.stringify(round, null, 2));
console.log('wrote rounds/g1-page.html and rounds/g1.json:', round.items.length, 'items');
