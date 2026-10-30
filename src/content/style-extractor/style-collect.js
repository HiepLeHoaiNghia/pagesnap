// plan-exempt — ps-003 phase 4: the style collector, moved out of the extractor unchanged. routing-override: skipped — user asked to build from the plan.
/**
 * PageSnap style collector.
 *
 * Reads the computed styles of every element of a component and returns what the exporters need: scoped CSS rules,
 * colour and font tokens, animation names with their @keyframes, and a clone whose elements carry `ps-el-N` classes.
 */
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

    // plan-exempt — found on cursor.com: @keyframes live inside @layer / @media / @supports / @container on modern sites, and adopted stylesheets hold more; both were skipped. routing-override: skipped — user asked to test compatibility and fix what it finds.
    const visit = (rules) => {
      for (const rule of Array.from(rules)) {
        // CSSRule.KEYFRAMES_RULE === 7
        if (rule.type === 7 || rule.constructor.name === 'CSSKeyframesRule') {
          if (animationNames.has(rule.name) && !foundNames.has(rule.name)) {
            foundNames.add(rule.name);
            extractedRules.push(rule.cssText);
          }
        } else if (rule.cssRules && rule.cssRules.length) {
          visit(rule.cssRules);
        }
      }
    };
    const sheets = [...Array.from(document.styleSheets), ...Array.from(document.adoptedStyleSheets || [])];
    for (const sheet of sheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules) visit(rules);
      } catch (e) {
        // Cross-origin stylesheet access might throw, ignore
      }
    }

    return extractedRules.join('\n\n');
  }

  /** @returns {object} everything the exporters need from the live element */
  function collect(element) {
    const allElements = [element, ...Array.from(element.querySelectorAll('*'))];
    const animationNames = new Set();
    const colorTokens = new Set();
    const fontTokens = new Set();
    const componentStyles = [];

    allElements.forEach((el, index) => {
      const computed = window.getComputedStyle(el);
      const styleObj = {};

      // plan-exempt — ps-001 Phase 13: a computed value pinned in a class rule beats the SVG presentation attribute of the
      // same name (height, width, transform, fill ...), so the measured-motion player that writes that attribute would
      // change the DOM but never the pixels. The attribute is already serialized with the element: do not shadow it.
      const isSvgChild = el instanceof SVGElement && el.ownerSVGElement !== null;
      RELEVANT_STYLE_PROPS.forEach(prop => {
        if (isSvgChild && el.hasAttribute(prop)) return;
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
    // plan-exempt — ps-006: after the pinned (computed) rules, add the page's own layout rules so the export keeps responding to the window. routing-override: skipped — user asked to learn from ui-clone-skills and improve the repo.
    const pinnedCss = componentStyles.map(item => {
      const decls = Object.entries(item.styles)
        .map(([prop, val]) => `  ${prop}: ${val};`)
        .join('\n');
      return `${item.selector} {\n${decls}\n}`;
    }).join('\n\n');
    let authoredCss = '';
    try { authoredCss = PageSnap.authoredCss ? PageSnap.authoredCss.build(allElements) : ''; } catch (e) { authoredCss = ''; }
    const scopedCss = authoredCss ? `${pinnedCss}\n\n/* Layout rules of the original page (responsive behaviour) */\n${authoredCss}` : pinnedCss;

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
    return { allElements, animationNames, colorTokens, fontTokens, scopedCss, keyframesCss, clone, effectiveBg, rootComputed, wrapperCss };
  }

  PageSnap.styleCollect = { collect };
})(window.PageSnap = window.PageSnap || {});
