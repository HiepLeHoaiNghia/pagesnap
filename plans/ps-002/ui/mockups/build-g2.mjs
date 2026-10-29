// plan-exempt — ps-002 G2 hi-fi mockup + round builder. Regenerate: node plans/ps-002/ui/mockups/build-g2.mjs
// Real tokens only: the colours below are the ones overlay.js / studio-modal.js / popup.css already use (measured, not invented).
// Data is real: the component is a snapshot of linear.app, the code excerpts come from the ZIP the owner downloaded. All UI text is English (G1 V-2 note).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const uiDir = path.resolve(here, '..');
const ex = JSON.parse(fs.readFileSync(path.join(here, 'assets', 'excerpts.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const htmlExcerpt = esc(ex.indexHtml.excerpt.join('\n'));
const aiExcerpt = esc(ex.aiPrompt.excerpt.join('\n'));

// ---- tokens (source: overlay.js:267-283, studio-modal.js:43-66, popup.css:1-16) ----
// dock bg rgba(17,24,39,.95) border #374151 radius 12 | studio header/footer #182234, canvas #07090a, buttons #1f2937/#374151 radius 6
// accent #8b5cf6 (violet), live-studio gradient #8b5cf6 -> #3b82f6, success #059669/#0d9488, link blue #38bdf8

const css = `
  :root{--bg:#0b0f19;--panel:#111827;--panel2:#182234;--btn:#1f2937;--line:#374151;--text:#f3f4f6;--dim:#9ca3af;--accent:#8b5cf6;--blue:#3b82f6;--cyan:#38bdf8;--ok:#10b981;--canvas:#07090a}
  *{box-sizing:border-box}
  body{margin:0;background:#020202;color:var(--text);font:12px/1.4 'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh}
  .stage{position:relative;width:1440px;min-height:900px;margin:0 auto}
  .page{position:absolute;inset:0;background:url(/mockups/assets/page-1440.png) top left/1440px auto no-repeat}
  button,.btn{font:inherit;color:var(--text);background:var(--btn);border:1px solid var(--line);border-radius:6px;padding:6px 11px;cursor:default;display:inline-flex;flex-direction:column;align-items:flex-start;line-height:1.2;white-space:nowrap}
  .btn small,button small{font-size:10px;font-weight:500;color:var(--dim);margin-top:1px}
  .studio-btn{background:linear-gradient(135deg,#8b5cf6,#3b82f6);border:none;font-weight:600}
  .primary{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}.primary small{color:#e9e1ff}
  .ghost{background:transparent}
  .ok-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--ok);margin-right:6px}
  .row{display:flex;align-items:center;gap:8px}.grow{flex:1}
  .tag{color:#a78bfa;font-weight:700;margin-right:4px}
  .grp{display:flex;flex-direction:column;gap:3px;padding:0 8px;border-left:1px solid var(--line)}
  .gcap{font-size:10px;letter-spacing:.03em;color:var(--dim);text-transform:none}
  .gcap b{color:#c4b5fd;font-weight:600}
  /* dock */
  .dock{position:absolute;left:48px;top:182px;background:rgba(17,24,39,.95);backdrop-filter:blur(10px);border:1px solid var(--line);border-radius:12px;padding:8px 14px;display:flex;gap:8px;align-items:center;box-shadow:0 20px 25px -5px rgba(0,0,0,.5),0 10px 10px -5px rgba(0,0,0,.4);z-index:5}
  .sel{position:absolute;left:48px;top:254px;width:1344px;height:468px;border:2px dashed #8b5cf6;background:rgba(139,92,246,.12);pointer-events:none}
  /* studio */
  .scrim{position:absolute;inset:0;background:rgba(2,2,2,.62);z-index:8}
  .modal{position:absolute;left:20px;top:70px;width:1400px;background:var(--bg);border:1px solid var(--line);border-radius:16px;overflow:hidden;z-index:9;box-shadow:0 30px 60px rgba(0,0,0,.6)}
  .m-head{display:flex;align-items:center;gap:10px;background:var(--panel2);padding:8px 14px;border-bottom:1px solid var(--line)}
  .m-head .name{color:#c4b5fd;font-weight:700}
  .tabs{display:flex;gap:6px;background:var(--panel);padding:8px 14px;border-bottom:1px solid var(--line);align-items:center}
  .tab{border-radius:6px;padding:6px 14px;background:var(--btn);border:1px solid var(--line);color:var(--dim);flex-direction:row;font-weight:600}
  .tab.on{background:var(--accent);border-color:var(--accent);color:#fff}
  .status{display:flex;align-items:center;gap:6px;color:#c8ccd2;padding:7px 14px;border-bottom:1px solid var(--line);background:var(--bg)}
  .m-body{background:var(--canvas);height:486px;overflow:hidden;position:relative}
  .m-body img{display:block;width:1344px;height:468px;margin:6px 28px 0}
  .m-body pre{margin:0;padding:14px 18px;color:#d1d5db;font:11.5px/1.5 'JetBrains Mono','Fira Code',monospace;height:486px;overflow:hidden;white-space:pre-wrap;word-break:break-all}
  .filebar{display:flex;align-items:center;gap:10px;background:var(--panel);padding:7px 14px;border-bottom:1px solid var(--line)}
  .filebar .file{font-family:'JetBrains Mono',monospace;color:var(--cyan)}
  .chip{display:inline-block;border:1px solid #4c3a8a;color:#c4b5fd;border-radius:4px;padding:0 7px;font-size:11px;font-weight:600}
  .chip.js{background:rgba(139,92,246,.2);border-color:var(--accent);color:#ddd6fe}.chip.css{border-color:#0d9488;color:#5eead4}.chip.md{border-color:#4b5563;color:#9ca3af}
  .m-foot{display:flex;align-items:flex-end;gap:8px;background:var(--panel2);padding:10px 14px;border-top:1px solid var(--line)}
  .menu{position:absolute;z-index:12;background:#111827;border:1px solid var(--line);border-radius:10px;padding:6px;min-width:230px;box-shadow:0 14px 30px rgba(0,0,0,.6)}
  .menu .item{display:flex;justify-content:space-between;gap:16px;padding:6px 10px;border-radius:6px}.menu .item:hover{background:var(--btn)}
  .menu .hd{padding:4px 10px;color:var(--dim);font-size:10px;text-transform:uppercase;letter-spacing:.05em}
  .menu hr{border:0;border-top:1px solid var(--line);margin:5px 0}
  .pill{position:absolute;left:50%;top:16px;transform:translateX(-50%);z-index:20;background:#0b1220;border:1px solid #14b8a6;color:#e5e7eb;border-radius:9999px;padding:8px 16px;font:600 12px system-ui,sans-serif;display:flex;gap:12px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,.6)}
  .pill button{padding:2px 8px;font-size:11px}
  .toast{position:absolute;right:24px;bottom:24px;z-index:20;background:#065f46;border:1px solid #10b981;border-radius:8px;padding:8px 14px;color:#d1fae5}
  .count{position:absolute;z-index:30;background:#000;color:#fde68a;border:1px solid #92400e;border-radius:4px;padding:1px 7px;font-size:11px;font-weight:600}
`;

// ---- component builders (every region keeps its id so any later option can find it again) ----
// plan-exempt — ps-002 design tooling, not product code
const dockHtml = () => `<div id="dock-hi" class="dock">
    <span class="tag">[div.GJ9TEa_benefits]</span>
    <button class="studio-btn" style="flex-direction:row">✨ Live Studio</button>
    <div class="grp"><span class="gcap"><b>Animated (JS)</b> · runs like the original</span><div class="row">
      <button class="primary">▶ Copy animated<small>one file, runs offline</small></button>
      <button>📦 Download ZIP<small>index.html + styles.css + more</small></button></div></div>
    <div class="grp"><span class="gcap"><b>No JS</b> · static code</span><div class="row">
      <button>Copy code · no JS<small>HTML + CSS only</small></button>
      <button>📝 Copy Selection MD<small>text as Markdown</small></button></div></div>
    <button class="ghost" style="flex-direction:row">⋯</button><button class="ghost" style="flex-direction:row">✕</button>
  </div>`;

const dockMenu = `<div id="dock-menu" class="menu" style="left:1090px;top:236px;display:none"></div>`;

const labelStatus = (state) => ({
  done: `<div id="status-hi" class="status"><span class="ok-dot"></span><b>Motion measured.</b>&nbsp;Pointer-driven spring · 30 animated values · 5 hover zones. <span style="color:var(--dim)">&nbsp;Exports below will run this motion.</span></div>`,
  none: `<div id="status-hi" class="status"><span class="ok-dot" style="background:#6b7280"></span><b>No motion detected.</b>&nbsp;This component only has static styles. <span style="color:var(--dim)">&nbsp;Exports below are static.</span></div>`,
  measuring: `<div id="status-hi" class="status"><span class="ok-dot" style="background:#14b8a6"></span><b>Measuring motion…</b>&nbsp;Sweeping hover, then fitting the spring. <span style="color:var(--dim)">&nbsp;About 40 s the first time. Keep this tab in front.</span></div>`
})[state];

const tabsHtml = (active) => `<div id="tabs-hi" class="tabs">
    <button class="tab ${active === 'preview' ? 'on' : ''}">👁 Preview</button>
    <button class="tab ${active === 'code' ? 'on' : ''}">⟨⟩ Code ▾</button>
    <button class="tab ${active === 'ai' ? 'on' : ''}">🤖 AI Specs</button>
    <span class="grow"></span>
    <button class="ghost" style="flex-direction:row">⋯</button><button class="ghost" style="flex-direction:row">✕</button></div>`;

const footHtml = `<div id="foot-hi" class="m-foot">
    <div class="grp" style="border-left:0;padding-left:0"><span class="gcap"><b>No JS</b> · static code</span><div class="row"><button>📝 Copy Selection MD</button><button>Copy code · no JS<small>HTML + CSS only</small></button></div></div>
    <span class="grow"></span>
    <div class="grp"><span class="gcap"><b>Animated (JS)</b> · runs like the original</span><div class="row"><button>📦 Download ZIP</button><button class="primary">▶ Copy animated<small>one file, runs offline</small></button></div></div></div>`;

const fileMenu = `<div id="filemenu-hi" class="menu" style="left:132px;top:230px;display:none">
    <div class="hd">Files in the export</div>
    <div class="item"><span>index.html</span><span class="chip js">Animated (JS)</span></div>
    <div class="item"><span>styles.css</span><span class="chip css">CSS motion</span></div>
    <div class="item"><span>Component.jsx</span><span class="chip md">Markup only</span></div>
    <div class="item"><span>tokens.json</span><span class="chip md">Data</span></div></div>`;

const screenPreview = `
  <div id="screen" class="stage"><div class="page"></div><div class="scrim"></div>
  <div class="modal" style="top:70px">
    <div class="m-head"><span style="font-size:15px">✨</span><span class="name">Component Studio</span><span style="color:var(--dim)">div.GJ9TEa_benefits · 1344 × 468</span></div>
    ${tabsHtml('preview')}${labelStatus('done')}
    <div class="m-body"><img src="/mockups/assets/component.png" alt="Linear component snapshot"></div>
    ${footHtml}
  </div></div>`;

const screenCode = (file) => {
  const map = {
    'index.html': { chip: '<span class="chip js">Animated (JS)</span>', note: 'Markup + hover CSS + a script that runs the measured motion. Needs styles.css next to it. Showing 24 of ' + ex.indexHtml.lines + ' lines.', body: htmlExcerpt },
    'styles.css': { chip: '<span class="chip css">CSS motion</span>', note: '75 @keyframes and 28 hover rules. No JavaScript.', body: '/* PageSnap Modular Stylesheet */\n/* 1. Container & Theme Context */\n.pagesnap-component-wrapper { … }\n\n/* 2. Extracted Keyframe Animations */\n@keyframes grid-dot-0-0-upDown { … }\n…' },
    'AI Specs': { chip: '<span class="chip md">Spec for AI</span>', note: 'A written brief an AI agent can rebuild the component from.', body: aiExcerpt }
  }[file];
  return `
  <div id="screen" class="stage"><div class="page"></div><div class="scrim"></div>
  <div class="modal" style="top:70px">
    <div class="m-head"><span style="font-size:15px">✨</span><span class="name">Component Studio</span><span style="color:var(--dim)">div.GJ9TEa_benefits · 1344 × 468</span></div>
    ${tabsHtml(file === 'AI Specs' ? 'ai' : 'code')}${labelStatus('done')}
    <div class="filebar"><span class="file">${file === 'AI Specs' ? 'AI-PROMPT.md' : file}</span>${map.chip}<span style="color:var(--dim)">${map.note}</span><span class="grow"></span><button>📋 Copy this file</button></div>
    <div class="m-body"><pre>${map.body}</pre></div>
    ${footHtml}
  </div>${file !== 'AI Specs' ? fileMenu.replace('display:none', 'display:block') : ''}</div>`;
};

const screenDock = `
  <div id="screen" class="stage"><div class="page"></div><div class="sel"></div>
  ${dockHtml('grouped')}${dockMenu}</div>`;

const screenMeasuring = `
  <div id="screen" class="stage"><div class="page"></div><div class="sel"></div>
  <div class="pill"><span>🎯 Measuring motion… 62%</span><span style="color:#9ca3af;font-weight:500">hover sweep, then spring fit · about 40 s</span><button>Skip</button></div>
  ${dockHtml('grouped')}</div>`;

const page = (inner, title) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>${css}</style></head><body>${inner}</body></html>`;

// the review page: one stage, the screen being decided is replaced as a whole (R16: whole screen with surroundings, never a fragment)
const reviewPage = page(screenDock + `<div id="spacer"></div>`, 'ps-002 · G2 · hi-fi');
fs.writeFileSync(path.join(uiDir, 'rounds', 'g2-page.html'), reviewPage.replace('</head>', '<base href="../mockups/"></head>'));

// ---- the round ----
const rep = (selector, html) => ({ op: 'replaceWith', selector, html });
const S = (html) => `<div id="screen" class="stage">${html}</div>`;
const inner = (full) => full.replace(/^\s*<div id="screen" class="stage">/, '').replace(/<\/div>\s*$/, '');
const round = {
  id: 'g2-ps002',
  title: 'ps-002 · G2 · Giao diện thật: dock, Studio, thanh chờ (hi-fi, nội dung tiếng Anh)',
  how: 'Mỗi mục: bấm "Show me" để xem, chọn một đáp án; cả màn hình đổi theo (không phải một mảnh). Ảnh nền là bản chụp linear.app, mã trong tab Code là trích từ ZIP bạn đã tải. Không có đáp án nào chọn sẵn; "Không có ý kiến" cũng là một đáp án. Đáp án lưu ở g2.answers.json.',
  noPreference: 'Không có ý kiến',
  groups: [
    { id: 'dock', label: 'Dock trên trang', how: 'Cái hiện ngay khi bạn chọn một component.' },
    { id: 'studio', label: 'Component Studio', how: 'Cửa sổ lớn: Preview, Code, AI Specs.' },
    { id: 'wait', label: 'Lúc chờ đo motion', how: 'Khoảng 40 giây lần đầu.' }
  ],
  items: [
    {
      id: 'D-1', group: 'dock', effect: 'D1',
      question: 'Dock mới (5 nút + ⋯ + ✕, chia hai nhóm "Animated (JS)" và "No JS") có đạt không?',
      why: 'Đây là bản hi-fi của lựa chọn B bạn đã chọn ở G1, với màu và kích cỡ thật của extension. So với hôm nay dock giảm từ 9 xuống 5 nút + ⋯ + ✕, và nút chính "▶ Copy animated" tô tím đậm. Nó thua ở chỗ rộng hơn (khoảng 1100 px so với khoảng 1000 px hôm nay) nên ở cửa sổ hẹp có thể phải xuống hàng. Câu hỏi: dùng như hình, hay cần đổi.',
      where: 'Dock phía trên component được chọn', target: '#screen',
      example: 'Chọn khối Fig 0.1-0.3 của Linear: bên trái "Animated (JS)" có Copy animated và Download ZIP; bên phải "No JS" có Copy code · no JS và Copy Selection MD.',
      onScreen: 'Toàn bộ trang Linear mô phỏng với dock mới. "Mở menu ⋯" hiện các mục bị đẩy vào menu.',
      options: [
        { value: 'ok', label: 'Dùng đúng như hình', recommended: true, ops: [rep('#screen', screenDock)] },
        { value: 'menu', label: 'Dùng như hình và xem thêm menu ⋯ đã mở', ops: [rep('#screen', screenDock.replace('display:none', 'display:block').replace('</div></div>', `<div class="menu" style="left:1090px;top:236px"><div class="hd">More</div><div class="item"><span>🤖 Copy AI Prompt</span></div><div class="item"><span>🔼 Expand to parent</span></div><div class="item"><span>🔽 Shrink to child</span></div><div class="item"><span>🎯 Pick another</span></div></div></div>`))] },
        { value: 'change', label: 'Cần đổi (ghi chỗ nào)', needsNote: true, ops: [rep('#screen', screenDock)] }
      ]
    },
    {
      id: 'S-1', group: 'studio', effect: 'S1',
      question: 'Studio ở tab Preview: thanh trạng thái motion và footer chia hai nhóm có đạt không?',
      why: 'Thanh "Motion measured. Pointer-driven spring · 30 animated values · 5 hover zones" thay cho nhãn lỗi thời "JS Motion: None" và nút Analyze. Footer có đúng 5 hành động, cùng nhóm với dock (UI-3). Tổng đếm: 3 tab + 5 hành động = 8. Nó thua ở chỗ 12 điều khiển cũ (Expand, Shrink, Direct Text Edit, Re-Inspect…) nằm sau ⋯ nên mất một cú bấm.',
      where: 'Toàn bộ cửa sổ Studio, tab Preview', target: '#screen',
      example: 'Mở Studio cho cùng khối Linear: thanh xanh báo đã đo motion; bấm "▶ Copy animated" là xong.',
      onScreen: 'Màn hình đổi sang Studio tab Preview đã mở, nền là trang Linear mờ.',
      options: [
        { value: 'ok', label: 'Dùng đúng như hình', recommended: true, ops: [rep('#screen', screenPreview)] },
        { value: 'change', label: 'Cần đổi (ghi chỗ nào)', needsNote: true, ops: [rep('#screen', screenPreview)] }
      ]
    },
    {
      id: 'S-2', group: 'studio', effect: 'S2',
      question: 'Tab Code có menu chọn tệp, mỗi tệp một nhãn, có đạt không?',
      why: 'HTML, CSS, React JSX, Tokens gộp vào một tab Code với menu "Files in the export"; mỗi tệp có nhãn Animated (JS) / CSS motion / Markup only / Data và một dòng nói nó chứa gì. Hình đầu là index.html (Animated), hình kia là styles.css (CSS motion) và AI Specs. Nó thua ở chỗ hôm nay xem CSS là 1 cú bấm, với bản này là 2.',
      where: 'Studio, tab Code và tab AI Specs', target: '#screen',
      example: 'Bấm Code, rồi chọn styles.css: nhãn "CSS motion" và dòng "75 @keyframes and 28 hover rules. No JavaScript."',
      onScreen: 'Màn hình đổi giữa index.html, styles.css và AI Specs. Menu chọn tệp được vẽ mở.',
      options: [
        { value: 'ok', label: 'Dùng đúng như hình (index.html, styles.css, AI Specs)', recommended: true, ops: [rep('#screen', screenCode('index.html'))] },
        { value: 'css', label: 'Xem tệp styles.css', ops: [rep('#screen', screenCode('styles.css'))] },
        { value: 'ai', label: 'Xem tab AI Specs', ops: [rep('#screen', screenCode('AI Specs'))] },
        { value: 'change', label: 'Cần đổi (ghi chỗ nào)', needsNote: true, ops: [rep('#screen', screenCode('index.html'))] }
      ]
    },
    {
      id: 'W-1', group: 'wait', effect: 'W1',
      question: 'Thanh chờ lúc đo motion nói rõ đang làm gì và có Skip, như vậy có đủ rõ không?',
      why: 'Hôm nay thanh chờ ghi "Capturing hover & motion…" rồi "Measuring pointer motion — coarse 3/9… (keep this tab in front; Skip uses the quick capture)": dài và dùng từ kỹ thuật. Bản mới ngắn hơn, có phần trăm và thời gian dự kiến. Nó thua ở chỗ không nói Skip làm mất gì.',
      where: 'Giữa phía trên cửa sổ, lúc bấm xuất lần đầu', target: '#screen',
      example: 'Bấm "▶ Copy animated" lần đầu trên Linear: thanh hiện "Measuring motion… 62%" kèm "hover sweep, then spring fit · about 40 s" và nút Skip.',
      onScreen: 'Màn hình đổi sang trạng thái đang đo, dock mờ phía dưới.',
      options: [
        { value: 'ok', label: 'Dùng đúng như hình', recommended: true, ops: [rep('#screen', screenMeasuring)] },
        { value: 'change', label: 'Cần đổi (ghi chỗ nào)', needsNote: true, ops: [rep('#screen', screenMeasuring)] }
      ]
    }
  ]
};
fs.writeFileSync(path.join(uiDir, 'rounds', 'g2.json'), JSON.stringify(round, null, 2));
console.log('wrote rounds/g2-page.html and rounds/g2.json:', round.items.length, 'items');
