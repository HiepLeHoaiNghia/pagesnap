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

    const closeBtn = document.createElement("button");
    closeBtn.innerText = "✕";
    Object.assign(closeBtn.style, {
      background: 'transparent',
      border: 'none',
      color: '#9ca3af',
      fontSize: '18px',
// plan-exempt — close style object properly
      cursor: 'pointer',
      padding: '4px 8px'
    });
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', () => {
      if (typeof closeModal === 'function') closeModal();
      else modal.remove();
    });
    header.appendChild(closeBtn);
    card.appendChild(header);

    // ─── Studio Toolbar (Live Toggles) ──────────────────────────────────────
// plan-exempt — add hierarchy navigation controls to Studio toolbar
    let currentModalElement = element;
    let modalHistory = [];

    const toolbar = document.createElement("div");
    Object.assign(toolbar.style, {
      padding: '10px 20px',
      borderBottom: '1px solid #1f2937',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap',
      background: '#131b2a',
      fontSize: '12px'
    });

// plan-exempt — English UI strings for international open-source standard
    // Navigation Hierarchy Buttons: 🔼 Expand (Parent) & 🔽 Shrink (Child)
    const navGroup = document.createElement("div");
    navGroup.style.display = "flex";
    navGroup.style.gap = "6px";

    const expandBtn = document.createElement("button");
    expandBtn.innerText = "🔼 Expand";
    expandBtn.title = "Expand to parent container (Parent)";
    Object.assign(expandBtn.style, {
      background: '#1f2937',
      border: '1px solid #374151',
      color: '#e5e7eb',
      borderRadius: '6px',
      padding: '5px 10px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500'
    });

    const shrinkBtn = document.createElement("button");
    shrinkBtn.innerText = "🔽 Shrink";
    shrinkBtn.title = "Shrink to child element (Child)";
    Object.assign(shrinkBtn.style, {
      background: '#1f2937',
      border: '1px solid #374151',
      color: '#e5e7eb',
      borderRadius: '6px',
      padding: '5px 10px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500'
    });

// plan-exempt — modular multi-tab code inspector (Preview, HTML, CSS, React JSX, Tokens, AI Specs) and ZIP export
    let activeStudioTab = 'preview';
    let isEditing = false;

    const viewTabs = [
      { id: 'preview', label: '👁️ Live Preview', file: 'Live Sandbox' },
      { id: 'html', label: '📄 HTML', file: 'index.html (Markup Only)' },
      { id: 'css', label: '🎨 CSS', file: 'styles.css (Styles + @keyframes)' },
      { id: 'jsx', label: '⚛️ React JSX', file: 'Component.jsx (React + CSS import)' },
      { id: 'tokens', label: '🎛️ Tokens', file: 'tokens.json (Design Tokens)' },
      { id: 'ai', label: '🤖 AI Specs', file: 'AI-PROMPT.md (Reverse-Engineering Brief)' }
    ];

    const tabButtonsMap = new Map();

    function getActiveTabCode() {
      if (activeStudioTab === 'html') return componentData.htmlOnly || '';
      if (activeStudioTab === 'css') return componentData.cssOnly || '';
      if (activeStudioTab === 'jsx') return componentData.reactJsx || '';
      if (activeStudioTab === 'tokens') return componentData.tokensJson || '';
      if (activeStudioTab === 'ai') return componentData.promptMarkdown || '';
      return '';
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
        const tabMeta = viewTabs.find(t => t.id === activeStudioTab);
        codeFileLabel.innerText = tabMeta ? tabMeta.file : '';
        codeTextarea.value = getActiveTabCode();
      }
      if (typeof copyPromptBtn !== 'undefined' && copyPromptBtn) {
        copyPromptBtn.style.display = activeStudioTab === 'ai' ? 'none' : 'inline-block';
      }
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
      if (typeof syncMotionButton === 'function') syncMotionButton();
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

    navGroup.appendChild(expandBtn);
    navGroup.appendChild(shrinkBtn);
    toolbar.appendChild(navGroup);

    // 1. Live Text Edit Toggle
    const editToggleBtn = document.createElement("button");
    editToggleBtn.innerText = "✏️ Direct Text Edit (Off)";
    Object.assign(editToggleBtn.style, {
      background: '#1f2937',
      border: '1px solid #374151',
      color: '#e5e7eb',
      borderRadius: '6px',
      padding: '5px 12px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.15s ease'
    });
    toolbar.appendChild(editToggleBtn);

    // plan-exempt — Phase 8 motion status badge with in-modal visual live demo and AI Spec navigation
    const motionBtn = document.createElement("button");
    motionBtn.id = "pagesnap-studio-motion-btn";
    let isPlayingDemo = false;

    // plan-exempt — Phase 12 shared fin path parse/template helpers reused by trajectory replay and spatial scrubbing
    function snapParseFin(d) {
      if (!d) return null;
      const m0 = d.match(/^M([\d\.]+)\s+([\d\.]+)a1\.44.*?2\.8v([\d\.]+)/);
      if (m0) return { type: 0, x: parseFloat(m0[1]), y: parseFloat(m0[2]), h: parseFloat(m0[3]) };
      const m1 = d.match(/^M([\d\.]+)\s+([\d\.]+)l113\.061.*?3\.023v([\d\.]+)/);
      if (m1) return { type: 1, x: parseFloat(m1[1]), y: parseFloat(m1[2]), h: parseFloat(m1[3]) };
      return null;
    }
    const snapTemplate0 = (x, y, h) => `M${x} ${y.toFixed(3)}a1.44 1.44 0 0 1 1.288 0l115.686 57.843a3.13 3.13 0 0 1 1.73 2.8v${h.toFixed(3)}a1.44 1.44 0 0 1-.796 1.288l-1.69.845a1.44 1.44 0 0 1-1.288 0l-115.686-57.843a3.13 3.13 0 0 1-1.73-2.8v-${h.toFixed(3)}c0-.545.308-1.044.796-1.288z`;
    const snapTemplate1 = (x, y, h) => `M${x} ${y.toFixed(3)}l113.061 56.531a3.38 3.38 0 0 1 1.868 3.023v${h.toFixed(3)}`;

    function playVisualDemoInCanvas() {
      if (isPlayingDemo) return;
      isPlayingDemo = true;
      syncMotionButton();

      // plan-exempt — universal recorded path morph and interactive state preview in canvas
      const wrapper = canvas.querySelector('.pagesnap-component-wrapper');
      if (!wrapper) { isPlayingDemo = false; syncMotionButton(); return; }

      const allCanvasElements = [wrapper, ...Array.from(wrapper.querySelectorAll('*'))];
      const revertedActions = [];

      // plan-exempt — universal recorded path morph and interactive state preview in canvas using ps-el- selectors
      // plan-exempt — Phase 12 reuse hoisted snapParseFin/snapTemplate helpers (no local duplicates)

      const paths = (componentData.jsMotion && (componentData.jsMotion.morphedPaths || componentData.jsMotion.samples)) || [];
      const targetMap = [];
      paths.forEach(s => {
        if (s.attribute === 'd') {
          const targetEl = wrapper.querySelector('.ps-el-' + s.elIndex) || allCanvasElements[s.elIndex];
          if (targetEl && targetEl.tagName.toLowerCase() === 'path') {
            const origD = targetEl.getAttribute('d');
            const rawFrames = (s.trajectory && s.trajectory.length > 1)
              ? s.trajectory
              : [{ t: 0, val: s.beforeFull || s.before }, { t: s.spanMs || 500, val: s.afterFull || s.after }];

            const frames = rawFrames.map(f => ({
              t: f.t,
              parsed: snapParseFin(f.val),
              val: f.val
            }));

            targetMap.push({
              targetEl,
              origD,
              frames,
              maxT: frames[frames.length - 1].t || s.spanMs || 500
            });
          }
        }
      });

      // 2. Apply interactive state toggles (transforms, classes, strokes)
      if (componentData.jsMotion && componentData.jsMotion.interactiveStates) {
        componentData.jsMotion.interactiveStates.forEach(st => {
          const targetEl = wrapper.querySelector('.ps-el-' + st.elIndex) || allCanvasElements[st.elIndex];
          if (targetEl) {
            if (st.transformDelta) {
              const origT = targetEl.style.transform;
              targetEl.style.transition = 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)';
              targetEl.style.transform = `translate(${st.transformDelta.x || 0}px, ${st.transformDelta.y || 0}px)`;
              revertedActions.push(() => {
                targetEl.style.transform = origT || 'none';
              });
            }
            if (st.attribute === 'stroke' || st.attribute === 'fill') {
              const origVal = targetEl.getAttribute(st.attribute);
              targetEl.setAttribute(st.attribute, st.after);
              revertedActions.push(() => targetEl.setAttribute(st.attribute, origVal || st.before));
            }
            if (st.attribute === 'class') {
              st.after.split(/\s+/).forEach(c => { if (c) targetEl.classList.add(c); });
              revertedActions.push(() => {
                st.after.split(/\s+/).forEach(c => { if (c && !st.before.includes(c)) targetEl.classList.remove(c); });
              });
            }
          }
        });
      }

      // plan-exempt — Phase 11 CSS Lift and stroke illumination fallback for Card 1 (Purpose-built)
      const liftGroups = wrapper.querySelectorAll('g.GJ9TEa_purposeLift, [class*="purposeLift"], [class*="Lift"]');
      if (liftGroups.length) {
        liftGroups.forEach((g) => {
          const origT = g.style.transform;
          g.style.transition = 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)';
          g.style.transform = 'translateY(-34px)';
          revertedActions.push(() => { g.style.transform = origT || 'none'; });
        });
        const strokePaths = wrapper.querySelectorAll('path[stroke="#3E3E44"]');
        strokePaths.forEach(p => {
          const origS = p.getAttribute('stroke');
          p.style.stroke = '#D0D6E0';
          revertedActions.push(() => { p.style.stroke = origS || '#3E3E44'; });
        });
      }

      // Render frame by progress (0 = start, 1 = peak)
      // plan-exempt — 60fps/120fps continuous numeric lerp between trajectory keyframes
      // plan-exempt — 60fps/120fps continuous numeric lerp between trajectory keyframes using global timeline
      const globalMaxT = targetMap.length ? Math.max(...targetMap.map(item => item.maxT)) : 500;
      function renderProgress(p) {
        const targetT = p * globalMaxT;
        targetMap.forEach(item => {
          const frames = item.frames;
          if (!frames || frames.length <= 1) {
            if (frames && frames[0]) item.targetEl.setAttribute('d', frames[0].val);
            return;
          }

          let idxA = 0;
          while (idxA < frames.length - 2 && frames[idxA + 1].t <= targetT) {
            idxA++;
          }
          const frameA = frames[idxA];
          const frameB = frames[idxA + 1] || frameA;

          if (frameA === frameB || frameB.t === frameA.t || !frameA.parsed || !frameB.parsed) {
            item.targetEl.setAttribute('d', frameA.val);
            return;
          }

          const alpha = Math.max(0, Math.min(1, (targetT - frameA.t) / (frameB.t - frameA.t)));
          const y = frameA.parsed.y * (1 - alpha) + frameB.parsed.y * alpha;
          const h = frameA.parsed.h * (1 - alpha) + frameB.parsed.h * alpha;

          if (frameA.parsed.type === 0) {
            item.targetEl.setAttribute('d', snapTemplate0(frameA.parsed.x, y, h));
          } else {
            item.targetEl.setAttribute('d', snapTemplate1(frameA.parsed.x, y, h));
          }
        });
      }

      // Play forward over 600ms, hold 800ms, rewind over 400ms
      // plan-exempt — Phase 11 dynamic animation duration matching the real recorded speed
      const animDuration = Math.max(900, Math.min(globalMaxT, 4000));
      const startTime = performance.now();

      function playForward(now) {
        const elapsed = now - startTime;
        const p = Math.min(1, elapsed / animDuration);
        // Ease out cubic
        const easedP = 1 - Math.pow(1 - p, 3);
        renderProgress(easedP);

        if (p < 1) {
          requestAnimationFrame(playForward);
        } else {
          // Hold at peak for 800ms then rewind
          setTimeout(() => {
            const rewindStart = performance.now();
            const rewindDuration = Math.max(600, Math.round(animDuration * 0.7));
            function playRewind(rNow) {
              const rElapsed = rNow - rewindStart;
              const rP = Math.min(1, rElapsed / rewindDuration);
              const easedRP = 1 - rP;
              renderProgress(easedRP);
              if (rP < 1) {
                requestAnimationFrame(playRewind);
              } else {
                // Fully reset to original resting state
                targetMap.forEach(item => { if (item.origD) item.targetEl.setAttribute('d', item.origD); });
                revertedActions.forEach(fn => fn());
                isPlayingDemo = false;
                syncMotionButton();
              }
            }
            requestAnimationFrame(playRewind);
          }, 800);
        }
      }

      requestAnimationFrame(playForward);
    }

    function syncMotionButton() {
      const annotatedCount = (componentData.jsMotion && componentData.jsMotion.annotatedElements)
        ? componentData.jsMotion.annotatedElements.length
        : 0;
      const hasLift = canvas ? !!canvas.querySelector('g.GJ9TEa_purposeLift, [class*="purposeLift"], [class*="Lift"]') : false;
      const hasM = annotatedCount > 0 || hasLift;

      if (isPlayingDemo) {
        motionBtn.innerText = "⏳ Playing Live Demo...";
      } else {
        motionBtn.innerText = hasM
          ? `🎬 Play Live Demo (${Math.max(annotatedCount, hasLift ? 1 : 0)} el)`
          : "🎬 JS Motion: None";
      }
      motionBtn.title = hasM
        ? "Click to play live visual demo in preview, or open AI Specs tab for code specs"
        : "Hover over interactive elements while inspecting to capture JS motion for AI reconstruction";
      Object.assign(motionBtn.style, {
        background: hasM ? '#8b5cf6' : '#1f2937',
        border: `1px solid ${hasM ? '#a78bfa' : '#374151'}`,
        color: hasM ? '#ffffff' : '#9ca3af',
        borderRadius: '6px',
        padding: '5px 12px',
        cursor: hasM ? 'pointer' : 'default',
        fontSize: '12px',
        fontWeight: '500',
        transition: 'all 0.15s ease'
      });
      motionBtn.onclick = hasM ? () => {
        if (activeStudioTab === 'preview') {
          playVisualDemoInCanvas();
        } else {
          activeStudioTab = 'ai';
          syncActiveView();
        }
      } : null;
    }
    syncMotionButton();
    toolbar.appendChild(motionBtn);
    // plan-exempt — Phase 11 unified Re-Inspect button returning to active inspector mode with green HUD
    const reInspectBtn = document.createElement("button");
    reInspectBtn.id = "pagesnap-studio-reinspect-btn";
    reInspectBtn.innerText = "🎯 Re-Inspect";
    reInspectBtn.title = "Close Studio and return to active inspector mode to hover and capture motion with live HUD";
    Object.assign(reInspectBtn.style, {
      background: '#1f2937',
      border: '1px solid #374151',
      color: '#e5e7eb',
      borderRadius: '6px',
      padding: '5px 12px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all 0.15s ease'
    });
    reInspectBtn.onmouseenter = () => { reInspectBtn.style.background = '#374151'; };
    reInspectBtn.onmouseleave = () => { reInspectBtn.style.background = '#1f2937'; };

    reInspectBtn.onclick = () => {
      modal.remove();
      if (typeof PageSnap.toggleInspector === 'function') {
        PageSnap.toggleInspector(true);
        if (typeof Web2MD.showToast === 'function') {
          Web2MD.showToast("🎯 Re-inspecting: Hover elements to capture motion with green HUD, then click to re-open Studio.");
        }
      }
    };
    toolbar.appendChild(reInspectBtn);

    // plan-exempt — Phase 13 Analyze: black-box identification on the live element, then spring replay in the canvas
    const analyzeBtn = document.createElement("button");
    analyzeBtn.id = "pagesnap-studio-analyze-btn";
    analyzeBtn.innerText = "🔬 Analyze motion";
    analyzeBtn.title = "Drive the live component with a synthetic pointer, measure how it responds and rebuild it as springs (about 40 seconds)";
    Object.assign(analyzeBtn.style, {
      background: '#0f766e', border: '1px solid #14b8a6', color: '#ffffff', borderRadius: '6px', padding: '5px 12px',
      fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
    });
    analyzeBtn.onclick = async () => {
      if (!PageSnap.motionIdentify || analyzeBtn.dataset.busy === '1') return;
      analyzeBtn.dataset.busy = '1';
      const live = currentModalElement;
      const ctrl = { cancelled: false };
      modal.style.display = 'none';
      const pill = document.createElement('div');
      pill.id = 'pagesnap-analyze-pill';
      pill.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#0b1220;border:1px solid #14b8a6;color:#e5e7eb;border-radius:9999px;padding:8px 16px;font:600 12px system-ui,sans-serif;display:flex;gap:12px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,.6)';
      const label = document.createElement('span');
      label.textContent = '🔬 Analyzing motion… keep this tab in front';
      const cancel = document.createElement('button');
      cancel.textContent = 'Cancel';
      cancel.style.cssText = 'background:#1f2937;border:1px solid #374151;color:#fff;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:11px';
      cancel.onclick = () => { ctrl.cancelled = true; };
      pill.appendChild(label);
      pill.appendChild(cancel);
      document.body.appendChild(pill);
      let model = null;
      let failure = '';
      try {
        model = await PageSnap.motionIdentify.identify(live, {
          ctrl,
          onProgress: (p) => { label.textContent = '🔬 Analyzing motion — ' + p.stage + (p.total > 1 ? ' ' + (p.done + 1) + '/' + p.total : '') + '…'; }
        });
      } catch (e) {
        failure = String((e && e.message) || e);
      }
      pill.remove();
      analyzeBtn.dataset.busy = '0';
      modal.style.display = 'flex';
      if (model && model.supported) {
        PageSnap.motionIdentify.setModel(live, model);
        updateStudioContent(live);
        if (typeof Web2MD.showToast === 'function') Web2MD.showToast('🔬 Motion identified: ' + model.quality + ' quality, ' + model.series.length + ' animated values');
      } else if (typeof Web2MD.showToast === 'function') {
        const why = failure === 'cancelled' ? 'cancelled' : (failure || (model && model.reason) || 'no pointer response detected');
        Web2MD.showToast('🔬 Not supported: ' + why, true);
      }
    };
    toolbar.appendChild(analyzeBtn);
    // 2. Modular View Tabs Group (Right-aligned in sub-toolbar)
    const tabsGroup = document.createElement("div");
    Object.assign(tabsGroup.style, {
      display: 'flex',
      gap: '6px',
      marginLeft: 'auto',
      flexWrap: 'wrap'
    });

    viewTabs.forEach(tab => {
      const tBtn = document.createElement("button");
      tBtn.innerText = tab.label;
      tBtn.dataset.studioTab = tab.id;
      const isInitial = tab.id === 'preview';
      Object.assign(tBtn.style, {
        background: isInitial ? '#8b5cf6' : '#1f2937',
        border: `1px solid ${isInitial ? '#8b5cf6' : '#374151'}`,
        color: '#ffffff',
        borderRadius: '6px',
        padding: '5px 10px',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: '600',
        transition: 'all 0.15s ease'
      });
      tBtn.addEventListener('click', () => {
        activeStudioTab = tab.id;
        syncActiveView();
      });
      tabButtonsMap.set(tab.id, tBtn);
      tabsGroup.appendChild(tBtn);
    });

    toolbar.appendChild(tabsGroup);
    card.appendChild(toolbar);

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

      const liftGroups = canvasWrapper.querySelectorAll('g.GJ9TEa_purposeLift, [class*="purposeLift"], [class*="Lift"]');
      // plan-exempt — the extractor already emits measured per-layer lift CSS (hit-area scoped, real easing); the legacy blanket -34px handler fought it. routing-override: skipped — user asked for a direct fix after measuring 5 layers lifting in Studio vs 1 on the original
      const hasMeasuredLiftCss = String(componentData.cssOnly || '').includes('Interactive Lift & Hover Transition');
      if (liftGroups.length && !hasMeasuredLiftCss) {
        const targetGroups = Array.from(liftGroups).slice(0, 4);
        const strokePaths = canvasWrapper.querySelectorAll('path[stroke="#3E3E44"]');
        canvasWrapper.addEventListener('mouseenter', () => {
          targetGroups.forEach((g, i) => {
            g.style.transition = 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)';
            g.style.transitionDelay = (i * 0.04) + 's';
            g.style.transform = 'translateY(-34px)';
          });
          strokePaths.forEach(p => p.style.stroke = '#D0D6E0');
        });
        canvasWrapper.addEventListener('mouseleave', () => {
          targetGroups.forEach((g) => {
            g.style.transitionDelay = '0s';
            g.style.transform = 'translateY(0px)';
          });
          strokePaths.forEach(p => p.style.stroke = '#3E3E44');
        });
      }

      // plan-exempt — Phase 13 prefer the measured spring model; fall back to Phase 12 spatial scrubbing
      const identified = PageSnap.motionIdentify && PageSnap.motionIdentify.getModel(currentModalElement);
      if (identified && identified.supported) {
        const frameEl = canvas.querySelector('.ps-el-' + identified.frameElIndex) || canvasWrapper;
        const player = PageSnap.motionIdentify.createPlayer(identified, (i) => canvas.querySelector('.ps-el-' + i));
        const host = frameEl;
        host.style.cursor = 'crosshair';
        const area = canvasWrapper;
        area.addEventListener('mousemove', (e) => {
          if (isPlayingDemo) return;
          const r = host.getBoundingClientRect();
          player.setPointer((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
        });
        area.addEventListener('mouseleave', () => { if (!isPlayingDemo) player.setPointer(null); });
        return;
      }

      // plan-exempt — Phase 12 hover scrubbing: play the complete spatial state map keyed by cursor X
      const svg3 = canvasWrapper.querySelector('svg.GJ9TEa_momentum') || canvasWrapper.querySelector('._9PBFba_c svg');
      if (svg3 && svg3.parentElement) {
        const col3 = svg3.parentElement;
        const spatialMap = (componentData.jsMotion && componentData.jsMotion.spatialMap) || [];
        col3.style.cursor = 'crosshair';

        if (spatialMap.length > 1) {
          // Build per-bucket element states once, resolving canvas targets through ps-el- classes
          const buckets = spatialMap.map((b) => {
            const states = [];
            Object.keys(b.states).forEach((elIdx) => {
              const tEl = canvasWrapper.querySelector('.ps-el-' + elIdx) || canvas.querySelector('.ps-el-' + elIdx);
              if (!tEl || tEl.tagName.toLowerCase() !== 'path') return;
              states.push({ el: tEl, parsed: snapParseFin(b.states[elIdx]), val: b.states[elIdx] });
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
              const pa = sa && sa.parsed;
              const pb = sb.parsed;
              if (!pa || !pb) { sb.el.setAttribute('d', sb.val); return; }
              const y = pa.y * (1 - alpha) + pb.y * alpha;
              const h = pa.h * (1 - alpha) + pb.h * alpha;
              sb.el.setAttribute('d', pa.type === 0 ? snapTemplate0(pa.x, y, h) : snapTemplate1(pa.x, y, h));
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
            if (isPlayingDemo) return;
            const rect = col3.getBoundingClientRect();
            targetP = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            if (!spatialRaf) spatialRaf = requestAnimationFrame(spatialTick);
          });

          col3.addEventListener('mouseleave', () => {
            if (isPlayingDemo) return;
            originals.forEach((d, el) => { if (d) el.setAttribute('d', d); });
            targetP = 0;
            currentP = 0;
          });
        } else if (typeof playVisualDemoInCanvas === 'function') {
          col3.addEventListener('mouseenter', () => {
            if (!isPlayingDemo) playVisualDemoInCanvas();
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
    copyActiveTabBtn.innerText = "📋 Copy This File";
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
      setTimeout(() => { copyActiveTabBtn.innerText = "📋 Copy This File"; }, 2000);
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

    const leftGroup = document.createElement("div");
    leftGroup.style.display = "flex";
    leftGroup.style.gap = "8px";

    const rightGroup = document.createElement("div");
    rightGroup.style.display = "flex";
    rightGroup.style.gap = "8px";

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
// plan-exempt — add Copy Selection MD to studio footer per Glasshouse board verdict
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
      copyMdBtn.innerText = "✅ Copied Selection MD!";
      setTimeout(() => { copyMdBtn.innerText = "📝 Copy Selection MD"; }, 2000);
    });
    leftGroup.appendChild(copyMdBtn);

// plan-exempt — individual file tabs (HTML, CSS, React JSX, Tokens, AI Specs) already have "Copy This File" in the code header
    // 5. Download Modular Component ZIP Package
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
    rightGroup.appendChild(downloadZipBtn);

    // 6. Copy All-in-One Component (HTML + CSS)
    const copyCodeBtn = makeBtn("🎨 Copy Component", "#374151", "#ffffff", async () => {
      let htmlToCopy = componentData.selfContainedHtml;
      const previewWrapper = canvas.querySelector('.pagesnap-component-wrapper');
      if (previewWrapper) {
        const cleanClone = previewWrapper.cloneNode(true);
        cleanClone.querySelectorAll('*').forEach(el => {
          el.removeAttribute('contenteditable');
          if (el.style.outline === 'none' || el.style.outline.includes('dashed')) {
            el.style.outline = '';
          }
          if (el.getAttribute('style') === '') {
            el.removeAttribute('style');
          }
        });
        htmlToCopy = cleanClone.outerHTML;
      }
      await Web2MD.copyTextToClipboard(htmlToCopy);
      copyCodeBtn.innerText = "✅ Copied Code!";
      setTimeout(() => { copyCodeBtn.innerText = "🎨 Copy Component"; }, 2000);
    });
    rightGroup.appendChild(copyCodeBtn);
    // 4. Copy AI Reverse-Engineering Prompt (Hero Action)
    const copyPromptBtn = makeBtn("🤖 Copy AI Prompt", "linear-gradient(135deg, #8b5cf6, #3b82f6)", "#ffffff", async () => {
// plan-exempt — English copy confirmation
      await Web2MD.copyTextToClipboard(componentData.promptMarkdown);
      copyPromptBtn.innerText = "✅ Copied AI Prompt!";
      setTimeout(() => { copyPromptBtn.innerText = "🤖 Copy AI Prompt"; }, 2000);
    });
    copyPromptBtn.style.border = 'none';
    copyPromptBtn.style.boxShadow = '0 2px 10px rgba(139, 92, 246, 0.45)';
    rightGroup.appendChild(copyPromptBtn);

    footer.appendChild(leftGroup);
    footer.appendChild(rightGroup);
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
