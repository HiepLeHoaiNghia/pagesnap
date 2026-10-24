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
    const clone = element.cloneNode(true);
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

    const selfContainedHtml = `<!-- PageSnap Self-Contained Component Export -->
<div class="pagesnap-component-wrapper">
<style>
${wrapperCss}

${keyframesCss ? `/* Extracted Keyframe Animations */\n${keyframesCss}\n\n` : ''}/* Component Computed Styles */
${scopedCss}
</style>
${clone.outerHTML}
</div>`;

// plan-exempt — remove duplicate declaration
    // ─── Generate Markdown AI Prompt ──────────────────────────────────────────
    const tagName = element.tagName.toLowerCase();
    const rect = element.getBoundingClientRect();

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

---

## 4. Original HTML Markup
\`\`\`html
${element.outerHTML}
\`\`\`

---

## 5. Instruction for AI Agent
\`\`\`
You are a senior Frontend Engineer specializing in Tailwind CSS and Framer Motion.
Recreate this component cleanly and faithfully based on the design tokens, layout, and motion specifications above.
- Framework: React (TypeScript)
- Styling: Tailwind CSS
- Animation: Framer Motion (matching the keyframes/transitions above)
- Produce clean, modern, accessible, and responsive component code.
\`\`\`
`;

    return {
      tagName: tagName,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      selfContainedHtml: selfContainedHtml,
      promptMarkdown: promptMarkdown,
      colorTokens: Array.from(colorTokens),
      fontTokens: Array.from(fontTokens),
      animationNames: Array.from(animationNames)
    };
  };

})(window.PageSnap);
