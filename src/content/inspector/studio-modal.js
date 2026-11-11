// plan-exempt — unified Component Studio modal and multi-format exporter
/**
 * PageSnap Component Studio: interactive sandbox modal displayed when inspecting an element.
 * Provides live isolated preview, inline text editing, and 1-click export to:
 * 1. AI Reverse-Engineering Prompt (Tailwind + Framer Motion)
 * 2. Self-contained Component Code (Scoped HTML + CSS + @keyframes)
 * 3. Clean GFM Markdown
 * 4. Raw Sanitized HTML
 */

window.PageSnap = window.PageSnap || {};
window.Web2MD = window.Web2MD || window.PageSnap;

(function (PageSnap) {
  'use strict';

  PageSnap.openComponentStudioModal = function (element) {
    if (!element) return;

    // Remove any existing modal
    const existing = document.getElementById("pagesnap-component-studio-modal");
    if (existing) existing.remove();

    // Extract component style, animations, and tokens
    let componentData = null;
    if (typeof PageSnap.extractComponentStyleAndMotion === 'function') {
      componentData = PageSnap.extractComponentStyleAndMotion(element);
    }

    if (!componentData) {
      if (typeof Web2MD.showToast === 'function') {
        Web2MD.showToast("❌ Unable to extract component styles", true);
      }
      return;
    }

    // plan-exempt — Phase 11 declare canvas and attachCanvasInteractions handler reference
    let canvas = null;
    let attachCanvasInteractions = null;
    // Modal Backdrop
    const modal = document.createElement("div");
    modal.id = "pagesnap-component-studio-modal";
    Object.assign(modal.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      zIndex: '2147483647',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: '#f3f4f6',
      animation: 'pagesnapFadeIn 0.2s ease-out'
    });

    // Studio Card Container
    const card = document.createElement("div");
    Object.assign(card.style, {
      background: '#111827',
      border: '1px solid #374151',
// plan-exempt — wide studio container to fit full-width 3-column components
      borderRadius: '16px',
      width: '95vw',
      maxWidth: '1440px',
      maxHeight: '94vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
      overflow: 'hidden'
    });

    // ─── Header ─────────────────────────────────────────────────────────────
    const header = document.createElement("div");
    Object.assign(header.style, {
      padding: '14px 20px',
      borderBottom: '1px solid #1f2937',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: '#182234'
    });

    const titleArea = document.createElement("div");
    titleArea.innerHTML = `
      <strong style="color: #ffffff; font-size: 14px;">🎯 PageSnap Component Studio</strong>
      <span style="color: #9ca3af; font-size: 12px; margin-left: 10px;">&lt;${componentData.tagName}&gt; • ${componentData.width}×${componentData.height}px</span>
    `;

    // plan-exempt — ps-002 build: header = title on the left, "more" menu and close on the right (G2 S-1). routing-override: skipped — user asked to build from the plan.
    header.style.position = 'relative';
    header.appendChild(titleArea);
    const headerRight = document.createElement('div');
    Object.assign(headerRight.style, { display: 'flex', alignItems: 'center', gap: '4px' });
    const iconButtonStyle = { background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '18px', cursor: 'pointer', padding: '4px 8px' };
    const moreBtn = document.createElement('button');
    moreBtn.id = 'pagesnap-studio-more-btn';
    moreBtn.innerText = '⋯';
    moreBtn.title = 'More actions';
    moreBtn.setAttribute('aria-label', 'More actions');
    Object.assign(moreBtn.style, iconButtonStyle);
    const moreMenu = document.createElement('div');
    moreMenu.id = 'pagesnap-studio-more-menu';
    Object.assign(moreMenu.style, {
      display: 'none', position: 'absolute', right: '12px', top: 'calc(100% - 4px)', zIndex: '5', minWidth: '230px',
      background: '#0b1220', border: '1px solid #374151', borderRadius: '10px', padding: '6px',
      flexDirection: 'column', gap: '2px', boxShadow: '0 14px 30px rgba(0,0,0,0.6)'
    });
    moreBtn.addEventListener('click', () => { moreMenu.style.display = moreMenu.style.display === 'none' ? 'flex' : 'none'; });
    function menuItem(text, title, onClick) {
      const item = document.createElement('button');
      item.innerText = text;
      item.title = title;
      item.setAttribute('role', 'menuitem');
      Object.assign(item.style, { background: 'transparent', border: 'none', color: '#e5e7eb', borderRadius: '6px', padding: '7px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', textAlign: 'left' });
      item.addEventListener('click', () => { moreMenu.style.display = 'none'; onClick(); });
      moreMenu.appendChild(item);
      return item;
    }
    const closeBtn = document.createElement("button");
    closeBtn.innerText = "✕";
    Object.assign(closeBtn.style, iconButtonStyle);
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', () => {
      if (typeof closeModal === 'function') closeModal();
      else modal.remove();
    });
    headerRight.appendChild(moreBtn);
    headerRight.appendChild(closeBtn);
    header.appendChild(headerRight);
    header.appendChild(moreMenu);
    card.appendChild(header);

    // ─── Studio Toolbar (Live Toggles) ──────────────────────────────────────
// plan-exempt — add hierarchy navigation controls to Studio toolbar
    let currentModalElement = element;
    let modalHistory = [];


    // plan-exempt — ps-002 build: Expand / Shrink live in the ⋯ menu. routing-override: skipped — user asked to build from the plan.
    const expandBtn = menuItem('🔼 Expand to parent', 'Expand to parent container', () => {});
    const shrinkBtn = menuItem('🔽 Shrink to child', 'Shrink to child element', () => {});

    // plan-exempt — ps-002 build: three tabs (Preview, Code ▾, AI Specs); the Code tab opens a menu of the exported files. routing-override: skipped — user asked to build from the plan.
    let activeStudioTab = 'preview';
    let activeFile = 'index.html';
    let isEditing = false;

    const viewTabs = [
      { id: 'preview', label: '👁️ Preview' },
      { id: 'code', label: 'Code ▾' },
      { id: 'ai', label: '🤖 AI Specs' }
    ];
    const tabButtonsMap = new Map();
    const statusLine = document.createElement('div');
    statusLine.id = 'pagesnap-studio-status';

    const countOf = (text, re) => ((text || '').match(re) || []).length;

    // What each exported file carries. The label is read from the data, never assumed.
    function fileCatalog() {
      const keyframes = countOf(componentData.cssOnly, /@keyframes/g);
      const hoverRules = countOf(componentData.cssOnly, /:hover/g);
      const hasScript = /<script/.test(componentData.indexHtml || '');
      const cssMotion = keyframes + hoverRules > 0;
      return [
        { file: 'index.html', label: hasScript ? 'Animated (JS)' : (cssMotion ? 'CSS motion' : 'Markup only'), code: componentData.indexHtml,
          note: hasScript ? 'Full page plus the motion script. Open it in a browser and it moves like the original.' : 'Full page that links styles.css. It has no script, so only CSS motion runs.' },
        { file: 'styles.css', label: cssMotion ? 'CSS motion' : 'Markup only', code: componentData.cssOnly,
          note: `${keyframes} @keyframes and ${hoverRules} hover rules. Works without JavaScript.` },
        { file: 'Component.jsx', label: 'Markup only', code: componentData.reactJsx, note: 'React markup that imports styles.css. It has no motion code.' },
        { file: 'tokens.json', label: 'Data', code: componentData.tokensJson, note: 'Colors, fonts, animation names and measured motion values as JSON.' }
      ];
    }
    function getActiveFileEntry() {
      const files = fileCatalog();
      return files.find((f) => f.file === activeFile) || files[0];
    }
    function getActiveTabCode() {
      if (activeStudioTab === 'code') return getActiveFileEntry().code || '';
      if (activeStudioTab === 'ai') return componentData.promptMarkdown || '';
      return '';
    }

    // Read-only summary of what was measured; it replaces the old "JS Motion" and "Analyze" buttons.
    function syncStatus() {
      const m = componentData.jsMotion || {};
      const model = PageSnap.motionIdentify && PageSnap.motionIdentify.getModel(currentModalElement);
      const parts = [];
      // plan-exempt — found on gsap.com: a fit with 0 animated values is not a spring, and time-driven JS motion is described but not replayed; say so. routing-override: skipped — user asked to fix what the compatibility test found.
      if (model && model.supported && model.series && model.series.length) parts.push(`spring fitted (${model.quality} quality, ${model.series.length} animated values)`);
      if (m.driver === 'time-loop' && (m.attributes || []).length) parts.push(`time-driven JS motion (${m.totalWrites || 0} writes) · described in AI Specs, not replayed`);
      if ((m.spatialMap || []).length > 1) parts.push(`pointer motion (${m.spatialMap.length} positions)`);
      if ((m.hoverMap || []).length) parts.push(`${m.hoverMap.length} hover zones`);
      if ((m.liftLayers || []).length) parts.push(`${m.liftLayers.length} lift layers`);
      if ((m.morphedPaths || []).length) parts.push(`${m.morphedPaths.length} morphing paths`);
      const keyframes = countOf(componentData.cssOnly, /@keyframes/g);
      if (keyframes) parts.push(`${keyframes} CSS @keyframes`);
      // plan-exempt — owner feedback 2026-10-30: the status line sits in the footer between the two export groups; the tooltip keeps the full text when it is cut short. routing-override: skipped — user asked for this change directly.
      // plan-exempt — ps-007 part B: the footer also says what the export cannot carry (canvas, video, iframe). routing-override: skipped — user approved the canvas warning work in chat.
      const surfaces = PageSnap.renderSurfaces ? PageSnap.renderSurfaces.describe(componentData.renderSurfaces) : '';
      const motionText = parts.length
        ? 'Motion measured · ' + parts.join(' · ')
        : 'No motion detected · CSS transitions and hover rules are still exported.';
      statusLine.textContent = surfaces ? `⚠ Not exported: ${surfaces} · ${motionText}` : motionText;
      statusLine.title = statusLine.textContent + (surfaces ? ' — AI-PROMPT.md lists what the page loaded so an agent can rebuild it.' : '');
    }

    function renderFileMenu() {
      fileMenu.innerHTML = '';
      const title = document.createElement('div');
      title.textContent = 'Files in the export';
      title.style.cssText = 'font-size:10px;color:#9ca3af;padding:2px 8px 6px';
      fileMenu.appendChild(title);
      fileCatalog().forEach((entry) => {
        const row = document.createElement('div');
        row.dataset.file = entry.file;
        row.setAttribute('role', 'menuitem');
        row.style.cssText = `display:flex;justify-content:space-between;gap:18px;padding:7px 8px;border-radius:6px;cursor:pointer;font-size:12px;background:${entry.file === activeFile ? '#1f2937' : 'transparent'}`;
        const name = document.createElement('span');
        name.textContent = entry.file;
        name.style.cssText = 'font-family:monospace;color:#38bdf8';
        const chip = document.createElement('span');
        chip.textContent = entry.label;
        chip.style.cssText = 'color:#c4b5fd;font-size:11px';
        row.appendChild(name);
        row.appendChild(chip);
        row.addEventListener('click', () => {
          activeFile = entry.file;
          activeStudioTab = 'code';
          fileMenu.style.display = 'none';
          syncActiveView();
        });
        fileMenu.appendChild(row);
      });
    }

    function syncActiveView() {
      viewTabs.forEach(t => {
        const b = tabButtonsMap.get(t.id);
        if (b) {
          const active = t.id === activeStudioTab;
          b.style.background = active ? '#8b5cf6' : '#1f2937';
          b.style.borderColor = active ? '#8b5cf6' : '#374151';
          b.style.color = '#ffffff';
        }
      });

      if (activeStudioTab === 'preview') {
        canvas.style.display = 'flex';
        codeViewerWrap.style.display = 'none';
      } else {
        canvas.style.display = 'none';
        codeViewerWrap.style.display = 'flex';
        const entry = getActiveFileEntry();
        codeFileLabel.innerText = activeStudioTab === 'ai' ? 'AI-PROMPT.md' : entry.file;
        codeNote.innerText = activeStudioTab === 'ai' ? 'The brief to give an AI agent so it can rebuild this component.' : entry.note;
        codeTextarea.value = getActiveTabCode();
      }
      renderFileMenu();
    }
    function updateStudioContent(newEl) {
      currentModalElement = newEl;
      const newCompData = PageSnap.extractComponentStyleAndMotion(newEl);
      if (!newCompData) return;
      componentData = newCompData;

      titleArea.innerHTML = `
        <strong style="color: #ffffff; font-size: 14px;">🎯 PageSnap Component Studio</strong>
        <span style="color: #9ca3af; font-size: 12px; margin-left: 10px;">&lt;${componentData.tagName}&gt; • ${componentData.width}×${componentData.height}px</span>
      `;
      canvas.style.background = componentData.effectiveBg || '#090d16';
      canvas.innerHTML = componentData.selfContainedHtml;
      if (isEditing) {
        const previewWrapper = canvas.querySelector('.pagesnap-component-wrapper');
        if (previewWrapper) {
          previewWrapper.querySelectorAll('*').forEach(el => {
            el.contentEditable = 'true';
            el.style.outline = '1px dashed #8b5cf6';
          });
        }
      }
      syncActiveView();
      syncStatus();
      // plan-exempt — re-bind interactive canvas listeners on element change
      if (typeof attachCanvasInteractions === 'function') attachCanvasInteractions();
    }

    expandBtn.addEventListener('click', () => {
      const p = currentModalElement.parentElement;
      if (p && p !== document.body && p !== document.documentElement) {
        modalHistory.push(currentModalElement);
        updateStudioContent(p);
      }
    });

    shrinkBtn.addEventListener('click', () => {
      if (modalHistory.length > 0) {
        updateStudioContent(modalHistory.pop());
      } else if (currentModalElement.firstElementChild) {
        updateStudioContent(currentModalElement.firstElementChild);
      }
    });


    // Live text edit toggle (menu item)
    const editToggleBtn = menuItem('✏️ Direct Text Edit (Off)', 'Click text in the preview to edit it before copying', () => {});

    // plan-exempt — ps-002 build: generic interpolation of two measured path states (same commands, different numbers). It replaces the fin-shaped templates; shapes that differ step to the nearer state. routing-override: skipped — user asked to build from the plan.
    const PATH_NUMBER = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
    function snapLerpPath(a, b, t) {
      if (!a || !b) return null;
      const na = a.match(PATH_NUMBER);
      const nb = b.match(PATH_NUMBER);
      if (!na || !nb || na.length !== nb.length) return null;
      if (a.replace(PATH_NUMBER, '#') !== b.replace(PATH_NUMBER, '#')) return null;
      let i = 0;
      return a.replace(PATH_NUMBER, () => {
        const k = i++;
        const from = parseFloat(na[k]);
        const to = parseFloat(nb[k]);
        return String(+(from + (to - from) * t).toFixed(3));
      });
    }
    // Re-Inspect (menu item): back to the inspector to hover and capture motion again
    const reInspectBtn = menuItem('🎯 Re-Inspect', 'Close Studio and return to the inspector to capture motion again', () => {
      closeModal();
      if (typeof PageSnap.toggleInspector === 'function') {
        PageSnap.toggleInspector(true);
        if (typeof Web2MD.showToast === 'function') {
          Web2MD.showToast("🎯 Re-inspecting: hover elements, then click to re-open Studio.");
        }
      }
    });
    reInspectBtn.id = 'pagesnap-studio-reinspect-btn';
    // Tabs: the Code tab doubles as the file-menu button
    const tabsGroup = document.createElement("div");
    Object.assign(tabsGroup.style, { display: 'flex', gap: '6px', position: 'relative' });
    const fileMenu = document.createElement('div');
    fileMenu.id = 'pagesnap-file-menu';
    Object.assign(fileMenu.style, {
      display: 'none', position: 'absolute', left: '0', top: 'calc(100% + 6px)', zIndex: '5', minWidth: '300px',
      background: '#0b1220', border: '1px solid #374151', borderRadius: '10px', padding: '6px',
      flexDirection: 'column', gap: '2px', boxShadow: '0 14px 30px rgba(0,0,0,0.6)'
    });

    viewTabs.forEach(tab => {
      const tBtn = document.createElement("button");
      tBtn.innerText = tab.label;
      tBtn.dataset.studioTab = tab.id;
      if (tab.id === 'code') tBtn.id = 'pagesnap-file-menu-btn';
      const isInitial = tab.id === 'preview';
      Object.assign(tBtn.style, {
        background: isInitial ? '#8b5cf6' : '#1f2937',
        border: `1px solid ${isInitial ? '#8b5cf6' : '#374151'}`,
        color: '#ffffff',
        borderRadius: '6px',
        padding: '5px 12px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '600',
        transition: 'all 0.15s ease'
      });
      tBtn.addEventListener('click', () => {
        if (tab.id === 'code' && activeStudioTab === 'code') {
          fileMenu.style.display = fileMenu.style.display === 'none' ? 'flex' : 'none';
          return;
        }
        fileMenu.style.display = 'none';
        activeStudioTab = tab.id;
        syncActiveView();
      });
      tabButtonsMap.set(tab.id, tBtn);
      tabsGroup.appendChild(tBtn);
    });
    tabsGroup.appendChild(fileMenu);
    // the tabs share the title row (title | tabs | more, close): one bar less above the preview
    tabsGroup.style.marginLeft = '28px';
    tabsGroup.style.marginRight = 'auto';
    header.insertBefore(tabsGroup, headerRight);
    // plan-exempt — owner decision 2026-10-30: the footer has no group captions any more, so the status line is simply centred. routing-override: skipped — user asked for this change directly.
    Object.assign(statusLine.style, { flex: '1 1 200px', minWidth: '0', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#9ca3af', fontSize: '11px' });
    syncStatus();
    renderFileMenu();
    // a click outside a menu closes it
    modal.addEventListener('click', (e) => {
      if (!tabsGroup.contains(e.target)) fileMenu.style.display = 'none';
      if (!moreMenu.contains(e.target) && e.target !== moreBtn) moreMenu.style.display = 'none';
    });

    // ─── Preview Canvas ─────────────────────────────────────────────────────
    canvas = document.createElement("div");
    Object.assign(canvas.style, {
      flex: '1',
      minHeight: '360px',
      maxHeight: '72vh',
      overflow: 'auto',
      padding: '24px',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      background: componentData.effectiveBg || '#090d16',
      transition: 'background 0.2s ease'
    });
    canvas.innerHTML = componentData.selfContainedHtml;
    // plan-exempt — attach hover controller to canvas cards for instant interactive feedback inside Studio
    // plan-exempt — Phase 11 robust canvas hover controllers supporting both single card and full container
    attachCanvasInteractions = function () {
      const canvasWrapper = canvas.querySelector('.pagesnap-component-wrapper');
      if (!canvasWrapper) return;

      // plan-exempt — ps-003 phase 2: hover lift in the canvas comes from the same measured CSS as the export (single source); no Studio-only hover handler.

      // plan-exempt — Phase 13 prefer the measured spring model; fall back to Phase 12 spatial scrubbing
      const identified = PageSnap.motionIdentify && PageSnap.motionIdentify.getModel(currentModalElement);
      if (identified && identified.supported) {
        const frameEl = canvas.querySelector('.ps-el-' + identified.frameElIndex) || canvasWrapper;
        const player = PageSnap.motionIdentify.createPlayer(identified, (i) => canvas.querySelector('.ps-el-' + i));
        const host = frameEl;
        host.style.cursor = 'crosshair';
        const area = canvasWrapper;
        area.addEventListener('mousemove', (e) => {
          const r = host.getBoundingClientRect();
          player.setPointer((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
        });
        area.addEventListener('mouseleave', () => { player.setPointer(null); });
        return;
      }

      // plan-exempt — Phase 12 hover scrubbing: play the complete spatial state map keyed by cursor X
      // plan-exempt — ps-003 phase 3: the region to scrub is found from the measured spatial map (the first path it moves), not from a class name. routing-override: skipped — user asked to build from the plan.
      const spatialMap = (componentData.jsMotion && componentData.jsMotion.spatialMap) || [];
      const firstMoved = spatialMap.length ? Object.keys(spatialMap[0].states)[0] : null;
      const movedEl = firstMoved !== null && firstMoved !== undefined ? (canvasWrapper.querySelector('.ps-el-' + firstMoved) || canvas.querySelector('.ps-el-' + firstMoved)) : null;
      const svg3 = movedEl && movedEl.closest ? movedEl.closest('svg') : null;
      if (svg3 && svg3.parentElement) {
        const col3 = svg3.parentElement;
        col3.style.cursor = 'crosshair';

        if (spatialMap.length > 1) {
          // Build per-bucket element states once, resolving canvas targets through ps-el- classes
          const buckets = spatialMap.map((b) => {
            const states = [];
            Object.keys(b.states).forEach((elIdx) => {
              const tEl = canvasWrapper.querySelector('.ps-el-' + elIdx) || canvas.querySelector('.ps-el-' + elIdx);
              if (!tEl || tEl.tagName.toLowerCase() !== 'path') return;
              states.push({ el: tEl, val: b.states[elIdx] });
            });
            return { px: b.px, states };
          }).filter((b) => b.states.length > 0);

          const originals = new Map();
          buckets.forEach((b) => b.states.forEach((s) => {
            if (!originals.has(s.el)) originals.set(s.el, s.el.getAttribute('d'));
          }));

          function renderSpatial(p) {
            if (!buckets.length) return;
            const pos = Math.max(0, Math.min(1, p)) * (buckets.length - 1);
            const i = Math.max(0, Math.min(buckets.length - 2, Math.floor(pos)));
            const alpha = buckets.length < 2 ? 0 : Math.max(0, Math.min(1, pos - i));
            const A = buckets[i];
            const B = buckets[i + 1] || A;
            const mapA = new Map(A.states.map((s) => [s.el, s]));

            B.states.forEach((sb) => {
              const sa = mapA.get(sb.el);
              sb.el.setAttribute('d', snapLerpPath(sa && sa.val, sb.val, alpha) || sb.val);
            });
            A.states.forEach((sa) => {
              if (!B.states.some((sb) => sb.el === sa.el) && sa.val) sa.el.setAttribute('d', sa.val);
            });
          }

          let spatialRaf = null;
          let targetP = 0;
          let currentP = 0;
          function spatialTick() {
            currentP += (targetP - currentP) * 0.2;
            renderSpatial(currentP);
            if (Math.abs(targetP - currentP) > 0.0015) {
              spatialRaf = requestAnimationFrame(spatialTick);
            } else {
              spatialRaf = null;
            }
          }

          col3.addEventListener('mousemove', (e) => {
            const rect = col3.getBoundingClientRect();
            targetP = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            if (!spatialRaf) spatialRaf = requestAnimationFrame(spatialTick);
          });

          col3.addEventListener('mouseleave', () => {
            originals.forEach((d, el) => { if (d) el.setAttribute('d', d); });
            targetP = 0;
            currentP = 0;
          });
        }
      }
    }
    attachCanvasInteractions();
    card.appendChild(canvas);
    // ─── Modular Code Viewer Panel ──────────────────────────────────────────
    const codeViewerWrap = document.createElement("div");
    Object.assign(codeViewerWrap.style, {
      flex: '1',
      minHeight: '360px',
      maxHeight: '72vh',
      display: 'none',
      flexDirection: 'column',
      background: '#0b0f19'
    });

    const codeHeader = document.createElement("div");
    Object.assign(codeHeader.style, {
      padding: '8px 20px',
      background: '#111827',
      borderBottom: '1px solid #1f2937',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '12px',
      color: '#9ca3af'
    });

    const codeFileLabel = document.createElement("span");
    codeFileLabel.style.fontFamily = "monospace";
    codeFileLabel.style.color = "#38bdf8";

    const copyActiveTabBtn = document.createElement("button");
    copyActiveTabBtn.innerText = "📋 Copy this file";
    Object.assign(copyActiveTabBtn.style, {
      background: '#1f2937',
      border: '1px solid #374151',
      color: '#ffffff',
      borderRadius: '6px',
      padding: '4px 10px',
      fontSize: '11px',
      fontWeight: '600',
      cursor: 'pointer'
    });
    copyActiveTabBtn.addEventListener('click', async () => {
      const code = getActiveTabCode();
      await Web2MD.copyTextToClipboard(code);
      copyActiveTabBtn.innerText = "✅ Copied!";
      setTimeout(() => { copyActiveTabBtn.innerText = "📋 Copy this file"; }, 2000);
    });

    codeHeader.appendChild(codeFileLabel);
    codeHeader.appendChild(copyActiveTabBtn);

    const codeTextarea = document.createElement("textarea");
    codeTextarea.readOnly = true;
    Object.assign(codeTextarea.style, {
      flex: '1',
      width: '100%',
      minHeight: '320px',
      background: '#0b0f19',
      color: '#e2e8f0',
      border: 'none',
      padding: '16px 20px',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: '12px',
      lineHeight: '1.5',
      resize: 'none',
      outline: 'none',
      boxSizing: 'border-box'
    });

    codeViewerWrap.appendChild(codeHeader);
    const codeNote = document.createElement('div');
    codeNote.id = 'pagesnap-file-note';
    codeNote.style.cssText = 'padding:6px 20px;background:#0f172a;border-bottom:1px solid #1f2937;color:#9ca3af;font-size:11px';
    codeViewerWrap.appendChild(codeNote);
    codeViewerWrap.appendChild(codeTextarea);
    card.appendChild(codeViewerWrap);

    // Wire live text edit toggle
    editToggleBtn.addEventListener('click', () => {
      isEditing = !isEditing;
      if (isEditing && activeStudioTab !== 'preview') {
        activeStudioTab = 'preview';
        syncActiveView();
      }
      editToggleBtn.innerText = isEditing ? "✏️ Direct Text Edit (ON)" : "✏️ Direct Text Edit (Off)";
      editToggleBtn.style.background = isEditing ? '#8b5cf6' : '#1f2937';
      editToggleBtn.style.color = '#ffffff';
      const previewWrapper = canvas.querySelector('.pagesnap-component-wrapper');
      if (previewWrapper) {
        previewWrapper.querySelectorAll('*').forEach(el => {
          el.contentEditable = isEditing ? 'true' : 'false';
          el.style.outline = isEditing ? '1px dashed #8b5cf6' : 'none';
        });
      }
    });
    // ─── Footer Action Bar (All Formats at Your Fingertips) ──────────────────
    const footer = document.createElement("div");
    Object.assign(footer.style, {
      padding: '12px 20px',
      borderTop: '1px solid #1f2937',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
      background: '#182234',
      flexWrap: 'wrap'
    });

    // plan-exempt — owner decision 2026-10-30 (option A): one main action, Download ZIP, and the less common formats in a menu. routing-override: skipped — user asked for this change directly.
    const primaryRow = document.createElement('div');
    primaryRow.style.cssText = 'display:flex;gap:8px;align-items:center';
    const formatsWrap = document.createElement('div');
    formatsWrap.style.cssText = 'position:relative';
    const formatsMenu = document.createElement('div');
    formatsMenu.id = 'pagesnap-studio-formats-menu';
    formatsMenu.setAttribute('role', 'menu');
    Object.assign(formatsMenu.style, {
      display: 'none', position: 'absolute', right: '0', bottom: 'calc(100% + 8px)', zIndex: '5', minWidth: '230px',
      background: '#0b1220', border: '1px solid #374151', borderRadius: '10px', padding: '6px',
      flexDirection: 'column', gap: '4px', boxShadow: '0 14px 30px rgba(0,0,0,0.6)'
    });
    formatsMenu.addEventListener('click', () => { formatsMenu.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (!formatsWrap.contains(e.target)) formatsMenu.style.display = 'none'; });

    function makeBtn(text, bg, textColor, onClick) {
      const btn = document.createElement("button");
      btn.innerText = text;
      Object.assign(btn.style, {
        background: bg,
        color: textColor,
        border: '1px solid #374151',
        borderRadius: '6px',
        padding: '7px 13px',
        fontWeight: '600',
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      });
      btn.addEventListener('click', onClick);
      return btn;
    }
// plan-exempt — ps-015: restore BETA badge after flash timeout. routing-override: skipped — user requested experiment labeling in Studio.
    function flash(btn, original, done) {
      btn.innerText = done;
      setTimeout(() => {
        btn.innerText = original;
        if (original === '▶ Copy animated') {
          const betaBadge = document.createElement('span');
          betaBadge.textContent = 'BETA';
          Object.assign(betaBadge.style, {
            fontSize: '9px', fontWeight: '700', background: 'rgba(255, 255, 255, 0.25)',
            color: '#ffffff', padding: '1px 5px', borderRadius: '4px'
          });
          btn.appendChild(betaBadge);
        }
      }, 2000);
    }
    // the preview as edited, with or without the motion script
    function exportHtml(withScript) {
      const previewWrapper = canvas.querySelector('.pagesnap-component-wrapper');
      if (!previewWrapper) return withScript ? componentData.selfContainedHtml : componentData.selfContainedHtmlNoJs;
      const cleanClone = previewWrapper.cloneNode(true);
      cleanClone.querySelectorAll('*').forEach(el => {
        el.removeAttribute('contenteditable');
        if (el.style.outline === 'none' || el.style.outline.includes('dashed')) el.style.outline = '';
        if (el.getAttribute('style') === '') el.removeAttribute('style');
      });
      if (!withScript) cleanClone.querySelectorAll('script').forEach(s => s.remove());
      return cleanClone.outerHTML;
    }

    // plan-exempt — ps-015: label Copy animated as BETA experimental action in Live Studio footer. routing-override: skipped — user requested experiment labeling in Studio.
    const copyAnimatedBtn = makeBtn("▶ Copy animated", "#8b5cf6", "#ffffff", async () => {
      await Web2MD.copyTextToClipboard(exportHtml(true));
      flash(copyAnimatedBtn, "▶ Copy animated", "✅ Copied animated!");
    });
    copyAnimatedBtn.title = 'One self-contained file with the motion script (BETA). It runs offline.';
    copyAnimatedBtn.style.borderColor = '#8b5cf6';
    copyAnimatedBtn.style.display = 'inline-flex';
    copyAnimatedBtn.style.alignItems = 'center';
    copyAnimatedBtn.style.gap = '6px';
    const betaBadge = document.createElement('span');
    betaBadge.textContent = 'BETA';
    Object.assign(betaBadge.style, {
      fontSize: '9px', fontWeight: '700', background: 'rgba(255, 255, 255, 0.25)',
      color: '#ffffff', padding: '1px 5px', borderRadius: '4px'
    });
    copyAnimatedBtn.appendChild(betaBadge);
    primaryRow.appendChild(copyAnimatedBtn);

    const downloadZipBtn = makeBtn("📦 Download ZIP", "#1e293b", "#38bdf8", async () => {
      downloadZipBtn.innerText = "⏳ Packaging...";
      try {
        await PageSnap.downloadComponentZip(componentData);
        downloadZipBtn.innerText = "✅ ZIP Downloaded!";
      } catch (err) {
        console.error("[PageSnap] Component ZIP failed:", err);
        downloadZipBtn.innerText = "❌ ZIP Failed";
      }
      setTimeout(() => { downloadZipBtn.innerText = "📦 Download ZIP"; }, 2000);
    });
    downloadZipBtn.style.borderColor = '#38bdf8';
    primaryRow.appendChild(downloadZipBtn);

    const copyStaticBtn = makeBtn("Copy code · no JS", "#374151", "#ffffff", async () => {
      await Web2MD.copyTextToClipboard(exportHtml(false));
      flash(copyStaticBtn, "Copy code · no JS", "✅ Copied code!");
    });
    copyStaticBtn.title = 'The same HTML and CSS without the motion script. CSS animations and hover still work.';
    copyStaticBtn.setAttribute('role', 'menuitem');
    formatsMenu.appendChild(copyStaticBtn);

    const copyMdBtn = makeBtn("📝 Copy Selection MD", "#1f2937", "#e5e7eb", async () => {
      const clone = (currentModalElement || element).cloneNode(true);
      if (typeof Web2MD.preProcessDOMForConversion === 'function') {
        try { Web2MD.preProcessDOMForConversion(clone, document); } catch (e) {}
      }
      let md = '';
      if (typeof Web2MD.htmlToMarkdown === 'function') {
        const settings = await Web2MD.getSettings();
        md = Web2MD.htmlToMarkdown(clone.outerHTML, { title: document.title, url: window.location.href }, settings);
      } else {
        md = clone.textContent || '';
      }
      await Web2MD.copyTextToClipboard(md);
      flash(copyMdBtn, "📝 Copy Selection MD", "✅ Copied Selection MD!");
    });
    copyMdBtn.setAttribute('role', 'menuitem');
    formatsMenu.appendChild(copyMdBtn);

    const formatsBtn = makeBtn('Other formats ▾', '#1f2937', '#e5e7eb', () => { formatsMenu.style.display = formatsMenu.style.display === 'none' ? 'flex' : 'none'; });
    formatsBtn.id = 'pagesnap-studio-formats-btn';
    formatsBtn.title = 'Copy code without JS, or the selection as Markdown';
    formatsBtn.setAttribute('aria-haspopup', 'menu');
    formatsWrap.appendChild(formatsBtn);
    formatsWrap.appendChild(formatsMenu);

    footer.appendChild(primaryRow);
    footer.appendChild(statusLine);
    footer.appendChild(formatsWrap);
    card.appendChild(footer);

    modal.appendChild(card);
    document.body.appendChild(modal);

// plan-exempt — closeModal cleanup helper
    function closeModal() {
      modal.remove();
      document.removeEventListener("keydown", onEsc);
    }
// plan-exempt — close onEsc and openComponentStudioModal cleanly
    function onEsc(e) {
      if (e.key === "Escape") {
        closeModal();
      }
    }
    document.addEventListener("keydown", onEsc);
  };
})(window.PageSnap);
