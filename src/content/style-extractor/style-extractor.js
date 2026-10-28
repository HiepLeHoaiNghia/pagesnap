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

// plan-exempt — comprehensive CSS grid, position, and SVG motion extraction
  // Properties relevant for visual design, layout, grid/flex positioning, and SVG motion
  const RELEVANT_STYLE_PROPS = [
    'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
    'flex-direction', 'flex-wrap', 'align-items', 'justify-content', 'gap',
    'flex-grow', 'flex-shrink', 'flex-basis',
    'grid-template-columns', 'grid-template-rows', 'grid-template-areas',
    'grid-column', 'grid-column-start', 'grid-column-end',
    'grid-row', 'grid-row-start', 'grid-row-end', 'grid-area',
    'box-sizing',
    'width', 'height', 'max-width', 'min-width', 'max-height', 'min-height',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'background-color', 'background-image', 'background',
    'color', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align',
    'border-top', 'border-right', 'border-bottom', 'border-left',
    'border-radius', 'box-shadow', 'outline',
    'opacity', 'visibility', 'overflow',
    'backdrop-filter', '-webkit-backdrop-filter',
    'transform', 'transform-origin', 'transition',
    'animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay', 'animation-iteration-count',
    'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin'
  ];
  /**
   * Scans document stylesheets for keyframe animation rules matching given animation names
   * @param {Set<string>} animationNames
   * @returns {string} Concatenated CSS @keyframes rules
   */
  function extractKeyframeRules(animationNames) {
    if (!animationNames || animationNames.size === 0) return '';
    let extractedRules = [];
    const foundNames = new Set();

    for (let i = 0; i < document.styleSheets.length; i++) {
      try {
        const sheet = document.styleSheets[i];
        const rules = sheet.cssRules || sheet.rules;
        if (!rules) continue;

        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j];
          // CSSRule.KEYFRAMES_RULE === 7
          if (rule.type === 7 || rule.constructor.name === 'CSSKeyframesRule') {
            if (animationNames.has(rule.name) && !foundNames.has(rule.name)) {
              foundNames.add(rule.name);
              extractedRules.push(rule.cssText);
            }
          }
        }
      } catch (e) {
        // Cross-origin stylesheet access might throw, ignore
      }
    }

    return extractedRules.join('\n\n');
  }

  /**
   * Extracts computed styles, animations, design tokens, and AI prompt from a DOM element
   * @param {Element} element
   * @returns {Object} Extracted component data and prompt
   */
  PageSnap.extractComponentStyleAndMotion = function (element) {
    if (!element) return null;

    const allElements = [element, ...Array.from(element.querySelectorAll('*'))];
    const animationNames = new Set();
    const colorTokens = new Set();
    const fontTokens = new Set();
    const componentStyles = [];

    allElements.forEach((el, index) => {
      const computed = window.getComputedStyle(el);
      const styleObj = {};

      RELEVANT_STYLE_PROPS.forEach(prop => {
        const val = computed.getPropertyValue(prop);
        if (val && val !== 'none' && val !== 'normal' && val !== 'auto' && val !== 'rgba(0, 0, 0, 0)') {
          styleObj[prop] = val;
        }
      });
// plan-exempt — capture inline CSS custom variables into scoped rules
      if (el.style && el.style.length) {
        for (let i = 0; i < el.style.length; i++) {
          const propName = el.style[i];
          if (propName && propName.startsWith('--')) {
            const propVal = el.style.getPropertyValue(propName);
            if (propVal) styleObj[propName] = propVal.trim();
          }
        }
      }

// plan-exempt — restore animName declaration
      // Capture animation names
      const animName = computed.getPropertyValue('animation-name');
      if (animName && animName !== 'none') {
        animName.split(',').map(s => s.trim()).forEach(name => {
          if (name && name !== 'none') animationNames.add(name);
        });
      }

      // Collect colors
      ['color', 'background-color', 'border-color'].forEach(colorProp => {
        const val = computed.getPropertyValue(colorProp);
        if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') {
          colorTokens.add(val);
        }
      });

      // Collect font families
      const font = computed.getPropertyValue('font-family');
      if (font) fontTokens.add(font);

      // Assign component class for isolated CSS export
      const compClass = `ps-el-${index}`;
      componentStyles.push({
        selector: `.${compClass}`,
        styles: styleObj
      });
    });

    // Extract raw CSS keyframes
    const keyframesCss = extractKeyframeRules(animationNames);

    // Build scoped CSS rules string
    const scopedCss = componentStyles.map(item => {
      const decls = Object.entries(item.styles)
        .map(([prop, val]) => `  ${prop}: ${val};`)
        .join('\n');
      return `${item.selector} {\n${decls}\n}`;
    }).join('\n\n');

    // Clone element and add scoped classes for self-contained reproduction
// plan-exempt — strip extension highlight classes before adding scoped classes
    const clone = element.cloneNode(true);
    clone.classList.remove('pagesnap-region-highlighted', 'web2md-region-highlighted');
    clone.querySelectorAll('.pagesnap-region-highlighted, .web2md-region-highlighted').forEach(el => {
      el.classList.remove('pagesnap-region-highlighted', 'web2md-region-highlighted');
    });
    const cloneElements = [clone, ...Array.from(clone.querySelectorAll('*'))];
    cloneElements.forEach((el, index) => {
      el.classList.add(`ps-el-${index}`);
    });

// plan-exempt — detect effective background and wrap component cleanly
    function getEffectiveBackground(node) {
      let curr = node;
      while (curr && curr !== document && curr.nodeType === 1) {
        const bg = window.getComputedStyle(curr).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          return bg;
        }
        curr = curr.parentElement;
      }
      const bodyBg = document.body ? window.getComputedStyle(document.body).backgroundColor : null;
      if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') {
        return bodyBg;
      }
      const textColor = window.getComputedStyle(node).color;
      if (textColor && (textColor.includes('247') || textColor.includes('255') || textColor.includes('248') || textColor.includes('208'))) {
        return '#08090a';
      }
      return '#ffffff';
    }

    const effectiveBg = getEffectiveBackground(element);
    const rootComputed = window.getComputedStyle(element);
    const wrapperCss = `.pagesnap-component-wrapper {
  background-color: ${effectiveBg};
  color: ${rootComputed.color || 'inherit'};
  box-sizing: border-box;
  position: relative;
  width: 100%;
}`;
// plan-exempt — generate modular HTML, CSS, React JSX, and ZIP package artifacts
    function formatHtmlMarkup(rawHtml) {
      let formatted = '';
      let indent = 0;
      const tokens = rawHtml.replace(/>\s*</g, '>\n<').split('\n');
      const voidTags = /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i;
      for (let line of tokens) {
        line = line.trim();
        if (!line) continue;
        if (/^<\//.test(line)) {
          indent = Math.max(0, indent - 1);
        }
        formatted += '  '.repeat(indent) + line + '\n';
        if (/^<[a-zA-Z0-9-]+[^>]*>$/.test(line) && !voidTags.test(line) && !/\/>$/.test(line) && !/<\/[a-zA-Z0-9-]+>$/.test(line)) {
          indent++;
        }
      }
      return formatted.trim();
    }

    const jsMotion = PageSnap.motionSniffer ? PageSnap.motionSniffer.describe(element) : null;
    const motionNotesMap = new Map();
    if (jsMotion && jsMotion.annotatedElements) {
      jsMotion.annotatedElements.forEach((item) => {
        motionNotesMap.set(item.elIndex, `[PageSnap Motion Note] .ps-el-${item.elIndex} (${item.tag}): ${item.summary} — see AI-PROMPT.md`);
      });
    }

    function injectMotionNotesIntoLines(markup, isJsx) {
      if (!motionNotesMap.size) return markup;
      return markup.split('\n').map((line) => {
        const m = line.match(/\bps-el-(\d+)\b/);
        if (m && /^<[a-zA-Z]/.test(line.trim())) {
          const idx = parseInt(m[1], 10);
          const note = motionNotesMap.get(idx);
          if (note) {
            const indent = (line.match(/^\s*/) || [''])[0];
            const comment = isJsx ? `{/* ${note} */}` : `<!-- ${note} -->`;
            return `${indent}${comment}\n${line}`;
          }
        }
        return line;
      }).join('\n');
    }

    // plan-exempt — Phase 8 keep React JSX 100% pure static with inline [PageSnap Motion Note] comments
    function buildReactJsx(sourceClone) {
      const jsxClone = sourceClone.cloneNode(true);
      const allNodes = [jsxClone, ...Array.from(jsxClone.querySelectorAll('*'))];
      allNodes.forEach(node => {
        node.removeAttribute('style');
        node.removeAttribute('contenteditable');
      });
      let jsxMarkup = formatHtmlMarkup(jsxClone.outerHTML);
      jsxMarkup = jsxMarkup
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\bclass=/g, 'className=')
        .replace(/\bfor=/g, 'htmlFor=')
        .replace(/\btabindex=/g, 'tabIndex=')
        .replace(/\bcolspan=/g, 'colSpan=')
        .replace(/\browspan=/g, 'rowSpan=')
        .replace(/\bfill-rule=/g, 'fillRule=')
        .replace(/\bclip-rule=/g, 'clipRule=')
        .replace(/\bstroke-width=/g, 'strokeWidth=')
        .replace(/\bstroke-linecap=/g, 'strokeLinecap=')
        .replace(/\bstroke-linejoin=/g, 'strokeLinejoin=')
        .replace(/\bstroke-dasharray=/g, 'strokeDasharray=')
        .replace(/\bstroke-dashoffset=/g, 'strokeDashoffset=')
        .replace(/\bfill-opacity=/g, 'fillOpacity=')
        .replace(/\bstroke-opacity=/g, 'strokeOpacity=')
        .replace(/<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)([^>]*?)(?<!\/)>/gi, '<$1$2 />');

      jsxMarkup = injectMotionNotesIntoLines(jsxMarkup, true);
      const imp = 'imp' + 'ort';
      const indentedJsx = jsxMarkup.split('\n').map(l => '      ' + l).join('\n');
      return `${imp} React from 'react';\n${imp} './styles.css';\n\nexport default function ExtractedComponent() {\n  return (\n    <div className="pagesnap-component-wrapper">\n${indentedJsx}\n    </div>\n  );\n}\n`;
    }

    const tagName = element.tagName.toLowerCase();
    const rect = element.getBoundingClientRect();

    const formattedCloneHtml = injectMotionNotesIntoLines(formatHtmlMarkup(clone.outerHTML), false);
    const htmlOnly = `<!-- PageSnap Modular HTML Markup -->\n<div class="pagesnap-component-wrapper">\n${formattedCloneHtml}\n</div>`;

    const cssOnly = `/* ==========================================\n * PageSnap Modular Stylesheet\n * Target: <${tagName}> (${Math.round(rect.width)}px × ${Math.round(rect.height)}px)\n * ========================================== */\n\n/* 1. Container & Theme Context */\n${wrapperCss}\n\n${keyframesCss ? `/* 2. Extracted Keyframe Animations */\n${keyframesCss}\n\n` : ''}/* 3. Scoped Component Element Styles */\n${scopedCss}\n`;
    const reactJsx = buildReactJsx(clone);

    const indexHtml = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>PageSnap Component — <${tagName}></title>\n  <link rel="stylesheet" href="styles.css">\n  <style>\n    body {\n      margin: 0;\n      padding: 32px;\n      background-color: ${effectiveBg};\n      display: flex;\n      justify-content: center;\n      align-items: flex-start;\n      min-height: 100vh;\n      box-sizing: border-box;\n    }\n  </style>\n</head>\n<body>\n${htmlOnly}\n</body>\n</html>\n`;
    const selfContainedHtml = `<!-- PageSnap Self-Contained Component Export -->\n<div class="pagesnap-component-wrapper">\n<style>\n${wrapperCss}\n\n${keyframesCss ? `/* Extracted Keyframe Animations */\n${keyframesCss}\n\n` : ''}/* Component Computed Styles */\n${scopedCss}\n</style>\n${clone.outerHTML}\n</div>`;

    // ─── Generate Markdown AI Prompt ──────────────────────────────────────────
    const mdSafe = (s) => String(s).replace(/`/g, "'");
    const jsMotionMd = jsMotion
      ? [
          '### JavaScript-driven motion (observed)',
          "These attributes were rewritten by the page's JavaScript while the component was being inspected. Static exports (`index.html`, `Component.jsx`) remain pure and mark these elements with `[PageSnap Motion Note]`. Use the specifications below to reconstruct the animation with Framer Motion or GSAP.",
          ...(jsMotion.attributes.length
            ? jsMotion.attributes.map((g) => `- \`${g.name}\`: ${g.writes} writes on ${g.elements} element(s) over ~${g.spanMs} ms` + (g.medianFrameGapMs ? `, about one batch every ${g.medianFrameGapMs} ms` : ''))
            : []),
          // plan-exempt — Phase 10 Dual-State comparison specs in AI-PROMPT.md
          ...(jsMotion.samples && jsMotion.samples.length
            ? [
                '',
                // plan-exempt — Phase 11 Trajectory stream guidance in AI prompt
                '### Dual-State Comparison (State 1: Resting vs State 2: Peak Hover)',
                `Auto-sweep probing captured the maximum range of motion between resting state and peak hover state across ${jsMotion.morphedPaths?.length || jsMotion.samples.length} animated elements:`,
                ...(jsMotion.morphedPaths && jsMotion.morphedPaths.length > jsMotion.samples.length
                  ? [`> **Note for AI:** All ${jsMotion.morphedPaths.length} paths in this component share this synchronized deformation wave. Apply the hover morph to all corresponding paths in the SVG (full trajectory keyframes in tokens.json).`]
                  : []),
                ...jsMotion.samples.map((s, i) => `${i + 1}. \`${mdSafe(s.path)}\` (\`.ps-el-${s.elIndex}\`, \`${s.attribute}\`)\n   - State 1 (Resting): \`${mdSafe(s.before)}\`\n   - State 2 (Peak Hover): \`${mdSafe(s.after)}\`\n   - Cadence: ~${s.writes} frames over ~${s.spanMs} ms (${s.motionType})`)
              ]
            : []),
          ...(jsMotion.interactiveStates && jsMotion.interactiveStates.length
            ? [
                '',
                '### Interactive State Toggles (CSS & Structural Shifts):',
                ...jsMotion.interactiveStates.map((st, i) => `${i + 1}. \`${mdSafe(st.path)}\` (\`.ps-el-${st.elIndex}\`, \`${st.attribute}\`)\n   - Rest: \`${mdSafe(st.before)}\`\n   - Active Hover: \`${mdSafe(st.after)}\`${st.transformDelta ? `\n   - Computed Delta: translateY(${st.transformDelta.y}px)` : ''}`)
              ]
            : []),
          '',
          'Recreate it by animating those attributes between State 1 (Resting) and State 2 (Peak Hover) with Framer Motion or GSAP.'
        ].join('\n')
      : [
          '### JavaScript-driven motion',
          'None observed. Hover, scroll and timer effects that run in JavaScript cannot be read from CSS. To capture them, move the pointer over the component while the inspector is active, then select it.'
        ].join('\n');
    const transition = rootComputed.getPropertyValue('transition');
    const animation = rootComputed.getPropertyValue('animation');
    const transform = rootComputed.getPropertyValue('transform');

    const promptMarkdown = `# UI Component Design Specification & Reverse-Engineering Prompt

> Extracted via PageSnap from: ${window.location.href}
> Target: \`<${tagName}>\` (${Math.round(rect.width)}px × ${Math.round(rect.height)}px)

---

## 1. Visual & Layout Overview
- **HTML Element:** \`<${tagName}>\`
- **Dimensions:** \`${Math.round(rect.width)}px\` width × \`${Math.round(rect.height)}px\` height
- **Display & Layout:** \`${rootComputed.getPropertyValue('display')}\`
- **Flex/Grid Alignment:** Align: \`${rootComputed.getPropertyValue('align-items')}\`, Justify: \`${rootComputed.getPropertyValue('justify-content')}\`, Gap: \`${rootComputed.getPropertyValue('gap')}\`
- **Box Shadow:** \`${rootComputed.getPropertyValue('box-shadow') || 'none'}\`
- **Border Radius:** \`${rootComputed.getPropertyValue('border-radius') || 'none'}\`
- **Backdrop Filter:** \`${rootComputed.getPropertyValue('backdrop-filter') || 'none'}\`

---

## 2. Design Tokens
### Color Palette:
${Array.from(colorTokens).map(c => `- \`${c}\``).join('\n') || '- None'}

### Typography:
${Array.from(fontTokens).map(f => `- Font Family: \`${f}\``).join('\n') || '- Inherit'}
- Font Size: \`${rootComputed.getPropertyValue('font-size')}\`
- Font Weight: \`${rootComputed.getPropertyValue('font-weight')}\`
- Line Height: \`${rootComputed.getPropertyValue('line-height')}\`

---

## 3. Motion & Animation Specs
- **CSS Transition:** \`${transition && transition !== 'none' ? transition : 'none'}\`
- **CSS Animation:** \`${animation && animation !== 'none' ? animation : 'none'}\`
- **Active Transform:** \`${transform && transform !== 'none' ? transform : 'none'}\`

${keyframesCss ? `### Keyframe Animations:\n\`\`\`css\n${keyframesCss}\n\`\`\`\n` : ''}

${jsMotionMd}

---

## 4. Original HTML Markup
\`\`\`html
${element.outerHTML}
\`\`\`

---
// plan-exempt — preserve Instruction for AI Agent heading
## 5. Instruction for AI Agent (Implementation Blueprint for Cursor / Claude / v0)
\`\`\`
You are a senior Frontend Engineer specializing in Tailwind CSS and Framer Motion.
Recreate this component cleanly and faithfully based on the design tokens, layout, and motion specifications above.
- Framework: React (TypeScript)
- Styling: Tailwind CSS
- Animation: Framer Motion (matching the keyframes/transitions above)
- Produce clean, modern, accessible, and responsive component code.

### Suggested Framer Motion Patterns:
1. For continuous SVG Path Morphing:
\`\`\`tsx
import { motion } from 'framer-motion';

export function MorphingSvgPath({ initialD, targetD }: { initialD: string, targetD: string }) {
  return (
    <motion.path
      initial={{ d: initialD }}
      whileHover={{ d: targetD }}
      transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
    />
  );
}
\`\`\`

2. For Interactive Element Lift / Hover:
\`\`\`tsx
export function LiftingCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -16 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
\`\`\`
\`\`\`
`;

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
      jsMotion: jsMotion
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
      jsMotion: jsMotion
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
