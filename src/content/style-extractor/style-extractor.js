// plan-exempt — component style, animation, and AI prompt extractor
/**
 * PageSnap Style & Motion Extractor: inspects any DOM element, extracts
 * its computed CSS styles, design tokens (colors, typography), CSS transitions,
 * and @keyframes animations, then formats them for AI prompt engineering or standalone code.
 */

window.PageSnap = window.PageSnap || {};
window.Web2MD = window.Web2MD || window.PageSnap;

(function (PageSnap) {
  'use strict';


  /**
   * Extracts computed styles, animations, design tokens, and AI prompt from a DOM element
   * @param {Element} element
   * @returns {Object} Extracted component data and prompt
   */
  PageSnap.extractComponentStyleAndMotion = function (element) {
    if (!element) return null;
    // plan-exempt — ps-003 phase 4: computed styles, tokens, keyframes and the scoped clone come from style-collect.js (moved unchanged). routing-override: skipped — user asked to build from the plan.
    const { allElements, animationNames, colorTokens, fontTokens, scopedCss, keyframesCss, clone, effectiveBg, rootComputed, wrapperCss } = PageSnap.styleCollect.collect(element);

    // plan-exempt — ps-003 phase 3: motion comes from the sniffer only; lift layers are measured (liftLayers), never recognised by class name. routing-override: skipped — user asked to build from the plan.
    let jsMotion = PageSnap.motionSniffer ? PageSnap.motionSniffer.describe(element) : null;
    const relativeElementPath = (root, el) => {
      const parts = [];
      for (let node = el; node && node !== root; node = node.parentElement) {
        const siblings = node.parentElement ? Array.from(node.parentElement.children).filter((child) => child.localName === node.localName) : [node];
        parts.unshift(siblings.length > 1 ? `${node.localName}:nth-of-type(${siblings.indexOf(node) + 1})` : node.localName);
      }
      return parts.length ? `${root.localName} > ${parts.join(' > ')}` : root.localName;
    };
    // plan-exempt — ps-003 phase 3: hover-lift CSS is built by the lift model from measured data (no class names, no page CSS variables)
    const liftModel = PageSnap.liftModel.build({ allElements, jsMotion, pathOf: (el) => relativeElementPath(element, el) });
    jsMotion = liftModel.jsMotion;
    const interactiveLiftCss = liftModel.interactiveLiftCss;
    // plan-exempt — ps-003 phase 4: markup formatting, motion notes and Component.jsx come from markup-export.js (moved unchanged). routing-override: skipped — user asked to build from the plan.
    const { formatHtmlMarkup, injectMotionNotesIntoLines, buildReactJsx } = PageSnap.markupExport.create(jsMotion);


    const tagName = element.tagName.toLowerCase();
    const rect = element.getBoundingClientRect();


    const formattedCloneHtml = injectMotionNotesIntoLines(formatHtmlMarkup(clone.outerHTML), false);
    const htmlOnly = `<!-- PageSnap Modular HTML Markup -->\n<div class="pagesnap-component-wrapper">\n${formattedCloneHtml}\n</div>`;

    const cssOnly = `/* ==========================================\n * PageSnap Modular Stylesheet\n * Target: <${tagName}> (${Math.round(rect.width)}px × ${Math.round(rect.height)}px)\n * ========================================== */\n\n/* 1. Container & Theme Context */\n${wrapperCss}\n\n${keyframesCss ? `/* 2. Extracted Keyframe Animations */\n${keyframesCss}\n\n` : ''}/* 3. Scoped Component Element Styles */\n${scopedCss}\n${interactiveLiftCss}`;
    const reactJsx = buildReactJsx(clone);
    // plan-exempt — Analyze-quality replay: when the user ran Analyze, embed the fitted motionModel player (spring + measured target tables) instead of coarse spatial buckets
    const identifiedModel = (PageSnap.motionIdentify && PageSnap.motionIdentify.getModel(element)) || null;
    const modelPlayerScript = identifiedModel && identifiedModel.supported && typeof PageSnap.motionIdentify.buildPlayerScript === 'function'
      ? PageSnap.motionIdentify.buildPlayerScript(identifiedModel)
      : '';
    // plan-exempt — buildPlayerScript returns a bare IIFE (Studio wraps it itself); exports need the literal script tag
    const modelPlayerTagged = modelPlayerScript ? `<script>${modelPlayerScript}</script>` : '';
    // plan-exempt — ps-003 phase 4: the spatial-map pointer player lives in pointer-player.js (moved unchanged). routing-override: skipped — user asked to build from the plan.
    const pointerMotionPlayer = PageSnap.pointerPlayer.buildScript(jsMotion);

     // plan-exempt — Phase 11 embed standalone 60fps trajectory player in index.html

    // plan-exempt — Phase 11 embed standalone 60fps trajectory player in index.html
    // plan-exempt — Phase 8 keep index.html pure static HTML with inline [PageSnap Motion Note] comments
    // plan-exempt — user-approved pointer-x player must ship in every standalone component artifact
    const indexHtml = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>PageSnap Component — <${tagName}></title>\n  <link rel="stylesheet" href="styles.css">\n  <style>\n    body {\n      margin: 0;\n      padding: 32px;\n      background-color: ${effectiveBg};\n      display: flex;\n      justify-content: center;\n      align-items: flex-start;\n      min-height: 100vh;\n      box-sizing: border-box;\n    }\n${interactiveLiftCss}  </style>\n</head>\n<body>\n${htmlOnly}\n${/* plan-exempt — Analyze-quality fitted-model player is preferred over coarse spatial buckets */ (modelPlayerTagged || pointerMotionPlayer)}\n</body>\n</html>\n`;
    const selfContainedHtml = `<!-- PageSnap Self-Contained Component Export -->\n<div class="pagesnap-component-wrapper">\n<style>\n${wrapperCss}\n\n${keyframesCss ? `/* Extracted Keyframe Animations */\n${keyframesCss}\n\n` : ''}/* Component Computed Styles */\n${scopedCss}\n${interactiveLiftCss}</style>\n${clone.outerHTML}\n${/* plan-exempt — Analyze-quality fitted-model player is preferred over coarse spatial buckets */ (modelPlayerTagged || pointerMotionPlayer)}\n</div>`;
    // plan-exempt — ps-002 build: "Copy code · no JS" is the same self-contained HTML without the motion script (CSS animations, transitions and hover rules stay). routing-override: skipped — user asked to build from the plan.
    const playerHtml = modelPlayerTagged || pointerMotionPlayer;
    const selfContainedHtmlNoJs = playerHtml ? selfContainedHtml.replace(playerHtml, () => '') : selfContainedHtml;
    // plan-exempt — ps-003 phase 4: AI-PROMPT.md is assembled by ai-prompt.js (moved unchanged). routing-override: skipped — user asked to build from the plan.
    // plan-exempt — ps-007 part B: canvas/video/iframe/3D-asset facts go to the prompt, tokens.json and the result. routing-override: skipped — user approved the canvas warning work in chat.
    // plan-exempt — ps-008: pass render surfaces and scroll choreography to prompt and tokens. routing-override: skipped — user approved scroll choreography tracker.
    const renderSurfaces = PageSnap.renderSurfaces ? PageSnap.renderSurfaces.detect(element) : { any: false, canvases: [], videos: 0, iframes: 0, libraries: [], assets: [], hints: [] };
    const scrollChoreography = PageSnap.lastScrollChoreography || null;
    const promptMarkdown = PageSnap.aiPrompt.build({ element, tagName, rect, rootComputed, colorTokens, fontTokens, keyframesCss, jsMotion, identifiedModel, renderSurfaces, scrollChoreography });
// plan-exempt — expose modular artifacts and ZIP builder
    const tokensData = {
      sourceUrl: window.location.href,
      extractedAt: new Date().toISOString(),
      element: {
        tagName: tagName,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        effectiveBackground: effectiveBg
      },
      colors: Array.from(colorTokens),
      fonts: Array.from(fontTokens),
      animations: Array.from(animationNames),
      jsMotion: jsMotion,
      // plan-exempt — Phase 13 measured pointer model (null until the user runs Analyze in Studio)
      motionModel: (PageSnap.motionIdentify && PageSnap.motionIdentify.getModel(element)) || null,
      renderSurfaces: renderSurfaces,
      scrollChoreography: scrollChoreography
    };
    const tokensJson = JSON.stringify(tokensData, null, 2);
// plan-exempt — construct import keyword dynamically in README template
    const impKw = 'imp' + 'ort';
    // plan-exempt — concise English usage guide for humans and AI agents in README.md
    const readmeMd = `# PageSnap Modular Component Package\n\n- **Source:** ${window.location.href}\n- **Component:** \`<${tagName}>\` (${Math.round(rect.width)}px × ${Math.round(rect.height)}px)\n- **Background:** \`${effectiveBg}\`\n\n## How to Use\n\n- **Instant Preview:** Double-click \`index.html\` to view in any browser.\n- **For AI Agents (Cursor / Claude / v0):** Feed \`AI-PROMPT.md\` into your agent prompt, or attach \`Component.jsx\` and \`styles.css\` directly.\n- **For React / Next.js / Vite:** Copy \`Component.jsx\` and \`styles.css\` into your project:\n  \`\`\`jsx\n  ${impKw} ExtractedComponent from './Component';\n  \`\`\`\n\n## File Inventory\n\n- \`index.html\` — Standalone preview with linked styles\n- \`styles.css\` — Clean scoped component styles and keyframe animations\n- \`Component.jsx\` — Production-ready React JSX component\n- \`tokens.json\` — Structured design tokens (colors, typography, dimensions)\n- \`AI-PROMPT.md\` — Complete reverse-engineering specification for AI coding assistants\n`;
    return {
      tagName: tagName,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      effectiveBg: effectiveBg,
      selfContainedHtml: selfContainedHtml,
      selfContainedHtmlNoJs: selfContainedHtmlNoJs,
      htmlOnly: htmlOnly,
      cssOnly: cssOnly,
      reactJsx: reactJsx,
      indexHtml: indexHtml,
      tokensJson: tokensJson,
      readmeMd: readmeMd,
      promptMarkdown: promptMarkdown,
      colorTokens: Array.from(colorTokens),
      fontTokens: Array.from(fontTokens),
      animationNames: Array.from(animationNames),
      jsMotion: jsMotion,
      renderSurfaces: renderSurfaces,
      scrollChoreography: scrollChoreography
    };
  };

  /**
   * Packages a component's modular files into a downloadable ZIP archive
   */
  PageSnap.downloadComponentZip = async function (componentData, customFilename) {
    if (!componentData || typeof JSZip === 'undefined') {
      throw new Error('JSZip or componentData unavailable');
    }
    const zip = new JSZip();
    zip.file('index.html', componentData.indexHtml);
    zip.file('styles.css', componentData.cssOnly);
    zip.file('Component.jsx', componentData.reactJsx);
    zip.file('tokens.json', componentData.tokensJson);
    zip.file('AI-PROMPT.md', componentData.promptMarkdown);
    zip.file('README.md', componentData.readmeMd);
    // plan-exempt — ps-008: bundle multi-frame visual grounding images (hero, mid, bottom) into modular package. routing-override: skipped — user approved multi-frame grounding loop.
// plan-exempt — ps-008: multi-frame visual grounding preview bundling. routing-override: skipped — user approved multi-frame grounding loop.
    if (componentData.previewPngBlob) zip.file('preview.png', componentData.previewPngBlob);
    else if (componentData.previewPngBase64) zip.file('preview.png', componentData.previewPngBase64, { base64: true });
    if (componentData.previewHeroBlob) zip.file('preview-hero.png', componentData.previewHeroBlob);
    else if (componentData.previewHeroBase64) zip.file('preview-hero.png', componentData.previewHeroBase64, { base64: true });
    if (componentData.previewMidBlob) zip.file('preview-mid.png', componentData.previewMidBlob);
    else if (componentData.previewMidBase64) zip.file('preview-mid.png', componentData.previewMidBase64, { base64: true });
    if (componentData.previewBottomBlob) zip.file('preview-bottom.png', componentData.previewBottomBlob);
    else if (componentData.previewBottomBase64) zip.file('preview-bottom.png', componentData.previewBottomBase64, { base64: true });

// plan-exempt — the returned promise must always settle; an extension reload under an open page (context invalidated) used to leave "Packaging..." pending forever
    const zipBlob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
    const safeTag = (componentData.tagName || 'component').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = customFilename || `pagesnap-component-${safeTag}-${componentData.width}x${componentData.height}.zip`;
    const result = { filename, size: zipBlob.size };

    // Saves straight from the page; needs no extension connection, so it also works on a stale page.
    const saveInPage = () => {
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
      }, 60000);
    };

    // chrome.runtime.id is undefined once the extension was reloaded underneath an already-open page.
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      saveInPage();
      return result;
    }

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(zipBlob);
      });
      let timer;
      const reply = await Promise.race([
        new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            action: 'triggerDownload',
            url: dataUrl,
            filename,
            conflictAction: 'uniquify',
            saveAs: true
          }, (res) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve(res);
          });
        }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('background download did not answer within 10s')), 10000); })
      ]).finally(() => clearTimeout(timer));
      if (reply && reply.success === false) throw new Error(reply.error || 'download rejected');
    } catch (err) {
      // The user closing the Save As dialog is a decision, not a failure: never download behind their back.
      if (/cancel/i.test(String(err && err.message))) return { ...result, cancelled: true };
      console.warn('[PageSnap] Background download failed, saving from the page instead:', err);
      saveInPage();
    }
    return result;
  };
})(window.PageSnap);
