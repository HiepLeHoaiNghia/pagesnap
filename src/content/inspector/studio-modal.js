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
      cursor: 'pointer',
      padding: '4px 8px'
    });
    closeBtn.addEventListener('click', () => modal.remove());
    header.appendChild(titleArea);
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

    function updateStudioContent(newEl) {
      currentModalElement = newEl;
      const newCompData = PageSnap.extractComponentStyleAndMotion(newEl);
      if (!newCompData) return;
      componentData = newCompData;

// plan-exempt — fix template string and adapt background
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
// plan-exempt — English UI controls
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

// plan-exempt — remove superficial background switcher
    toolbar.appendChild(editToggleBtn);
    card.appendChild(toolbar);

    // ─── Preview Canvas ─────────────────────────────────────────────────────
// plan-exempt — wide flexible canvas for high-resolution responsive preview
    const canvas = document.createElement("div");
    Object.assign(canvas.style, {
      flex: '1',
      minHeight: '360px',
      maxHeight: '75vh',
      overflow: 'auto',
      padding: '24px',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
// plan-exempt — set initial canvas content and background
      background: componentData.effectiveBg || '#090d16',
      transition: 'background 0.2s ease'
    });
    canvas.innerHTML = componentData.selfContainedHtml;
    card.appendChild(canvas);
    // Wire live text edit toggle
    let isEditing = false;
    editToggleBtn.addEventListener('click', () => {
// plan-exempt — English toggle text
      isEditing = !isEditing;
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
    // 3. Copy Scoped Component (HTML + CSS)
// plan-exempt — clean editor artifacts before copying component code
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

    // Close on Escape key
    function onEsc(e) {
      if (e.key === "Escape") {
        modal.remove();
        document.removeEventListener("keydown", onEsc);
      }
    }
    document.addEventListener("keydown", onEsc);
  };

})(window.PageSnap);
