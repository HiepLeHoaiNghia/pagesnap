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
    function attachLiveMotionPlayer(containerEl, jsMotion) {
      if (!containerEl || !jsMotion || !jsMotion.timeline) return;
      const { steps = [], initialStates = [], interactiveStates = [] } = jsMotion.timeline;
      if (!steps.length && !interactiveStates.length) return;

      const elMap = new Map();
      containerEl.querySelectorAll('[class*="ps-el-"]').forEach(el => {
        // plan-exempt — getAttribute is safe for both HTML and SVG elements
        const cls = (el.getAttribute && el.getAttribute('class')) || '';
        const m = cls.match(/ps-el-(\d+)/);
        if (m) elMap.set(parseInt(m[1], 10), el);
      });

      let timers = [];
      let currentStepIdx = 0;

      // Forward Play (Hover In)
      const play = (onComplete) => {
        timers.forEach(clearTimeout);
        timers = [];

        // 1. Interactive state toggle (e.g. FIG 0.1 purposeLifted CSS transition)
        interactiveStates.forEach(([idx, attr, initial, active]) => {
          const el = elMap.get(idx);
          if (el) el.setAttribute(attr, active);
        });

        // 2. Continuous frame animation forward
        if (steps.length) {
          steps.forEach(([t, idx, attr, val], i) => {
            timers.push(setTimeout(() => {
              currentStepIdx = i;
              const el = elMap.get(idx);
              if (el) el.setAttribute(attr, val);
              if (i === steps.length - 1 && typeof onComplete === 'function') {
                onComplete();
              }
            }, t));
          });
        } else if (typeof onComplete === 'function') {
          setTimeout(onComplete, 700);
        }
      };

      // Smooth Reverse Play (Hover Out / Reset)
      const reset = (onComplete) => {
        timers.forEach(clearTimeout);
        timers = [];

        // 1. Revert interactive states
        interactiveStates.forEach(([idx, attr, initial]) => {
          const el = elMap.get(idx);
          if (el) el.setAttribute(attr, initial);
        });

        // 2. Smoothly rewind frame steps back to initial standing position at silky 60fps (capped ~40 frames)
        if (steps.length && currentStepIdx > 0) {
          const revSteps = steps.slice(0, currentStepIdx + 1).reverse();
          const maxRevFrames = 40;
          const stride = Math.max(1, Math.floor(revSteps.length / maxRevFrames));
          const sampledRev = revSteps.filter((_, idx) => idx % stride === 0);
          const frameInterval = Math.max(12, Math.min(22, Math.round(600 / sampledRev.length)));
          sampledRev.forEach(([t, idx, attr, val], i) => {
            timers.push(setTimeout(() => {
              const el = elMap.get(idx);
              if (el) el.setAttribute(attr, val);
              if (i === sampledRev.length - 1) {
                currentStepIdx = 0;
                initialStates.forEach(([initIdx, initAttr, initVal]) => {
                  const initEl = elMap.get(initIdx);
                  if (initEl) initEl.setAttribute(initAttr, initVal);
                });
                if (typeof onComplete === 'function') onComplete();
              }
            }, i * frameInterval));
          });
        // plan-exempt — fallback initial states restoration
        } else {
          initialStates.forEach(([idx, attr, val]) => {
            const el = elMap.get(idx);
            if (el) el.setAttribute(attr, val);
          });
          currentStepIdx = 0;
          if (typeof onComplete === 'function') onComplete();
        }
      };

      containerEl.__playMotion = play;
      containerEl.__resetMotion = reset;
      // plan-exempt — attach hover listener to container and child figures
      containerEl.addEventListener('mouseenter', () => play());
      containerEl.addEventListener('mouseleave', () => reset());
      containerEl.querySelectorAll('.GJ9TEa_figure, .GJ9TEa_benefit, [class*="benefit"], [class*="figure"]').forEach(child => {
        child.addEventListener('mouseenter', () => play());
        child.addEventListener('mouseleave', () => reset());
      });
    }
    // plan-exempt — close attachLiveMotionPlayer cleanly
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
      // plan-exempt — attach live motion player so hovering component in studio preview replays animation live
      attachLiveMotionPlayer(canvas.querySelector('.pagesnap-component-wrapper'), componentData.jsMotion);
      // plan-exempt — clean duplicate syncActiveView
      syncActiveView();
      if (typeof syncMotionButton === 'function') syncMotionButton();
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

// plan-exempt — explicit live motion player button on studio toolbar with bi-directional demo
    const motionBtn = document.createElement("button");
    motionBtn.id = "pagesnap-studio-motion-btn";
    let isPlayingDemo = false;

    function syncMotionButton() {
      const hasSteps = !!(componentData.jsMotion && componentData.jsMotion.timeline && componentData.jsMotion.timeline.steps && componentData.jsMotion.timeline.steps.length);
      const hasInteractive = !!(componentData.jsMotion && componentData.jsMotion.timeline && componentData.jsMotion.timeline.interactiveStates && componentData.jsMotion.timeline.interactiveStates.length);
      const hasM = hasSteps || hasInteractive;
      const frameCount = hasSteps ? componentData.jsMotion.timeline.steps.length : (hasInteractive ? componentData.jsMotion.timeline.interactiveStates.length : 0);

      if (isPlayingDemo) {
        motionBtn.innerText = "⏳ Playing Motion...";
      } else {
        motionBtn.innerText = hasSteps ? `🎬 Play Motion (${frameCount} frames)` : (hasInteractive ? `🎬 Play Motion (CSS Lift)` : "🎬 Motion: None");
      }
      motionBtn.title = hasM ? "Click to play recorded animation demo (Forward & Smooth Reverse)" : "Hover over this element on the webpage while inspecting to capture JS motion";
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
        if (isPlayingDemo) return;
        const wrapper = canvas.querySelector('.pagesnap-component-wrapper');
        if (wrapper && wrapper.__playMotion) {
          isPlayingDemo = true;
          syncMotionButton();
          wrapper.__playMotion(() => {
            // Forward finished: pause 500ms then smoothly rewind
            setTimeout(() => {
              if (wrapper.__resetMotion) {
                wrapper.__resetMotion(() => {
                  isPlayingDemo = false;
                  syncMotionButton();
                });
              } else {
                isPlayingDemo = false;
                syncMotionButton();
              }
            }, 500);
          });
        }
      } : null;
    }
    // plan-exempt — initial sync of motion button text and state
    syncMotionButton();
    toolbar.appendChild(motionBtn);
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
    const canvas = document.createElement("div");
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
    attachLiveMotionPlayer(canvas.querySelector('.pagesnap-component-wrapper'), componentData.jsMotion);
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
