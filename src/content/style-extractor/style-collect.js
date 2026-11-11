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
    'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin',
    // plan-exempt — ps-006: found on a real clone (cursor.com): link underlines, list bullets, italics, nowrap, object-fit and cursor were never captured, and a computed "none" was dropped so the browser default came back. routing-override: skipped — user asked to see a real clone and fix what shows.
    'text-decoration-line', 'list-style-type', 'list-style-position', 'font-style', 'white-space', 'text-transform', 'text-overflow',
    'text-indent', 'vertical-align', 'object-fit', 'object-position', 'aspect-ratio', 'filter', 'mix-blend-mode', 'clip-path',
    'cursor', 'pointer-events', 'overflow-wrap', 'word-break'
  ];

  // A computed "none"/"normal" says something only where the browser default is different: a link is underlined, a list has
  // bullets, <em> is italic, <pre> keeps its spaces. Elsewhere it is noise and is left out.
  const NEUTRAL_MATTERS_ON = {
    'text-decoration-line': ['A', 'U', 'INS', 'DEL', 'S', 'STRIKE', 'ABBR', 'ACRONYM'],
    'list-style-type': ['UL', 'OL', 'LI', 'MENU', 'DIR', 'SUMMARY'],
    'font-style': ['EM', 'I', 'CITE', 'DFN', 'VAR', 'ADDRESS'],
    'white-space': ['PRE', 'TEXTAREA', 'LISTING', 'XMP', 'PLAINTEXT', 'NOBR'],
    'display': null,
    'pointer-events': null
  };
  // values that are the default everywhere: not worth a declaration
  const PLAIN_DEFAULT = { 'object-fit': 'fill', 'vertical-align': 'baseline', 'text-overflow': 'clip', 'list-style-position': 'outside', 'text-indent': '0px', 'object-position': '50% 50%' };

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
        const neutral = val === 'none' || val === 'normal';
        const matters = neutral && Object.prototype.hasOwnProperty.call(NEUTRAL_MATTERS_ON, prop)
          && (NEUTRAL_MATTERS_ON[prop] === null || NEUTRAL_MATTERS_ON[prop].includes(el.tagName.toUpperCase()));
        if (val && (matters || !neutral) && val !== 'auto' && val !== 'rgba(0, 0, 0, 0)' && PLAIN_DEFAULT[prop] !== val) {
          styleObj[prop] = val;
        }
      });
      // a decoration carries its own style and colour
      if (styleObj['text-decoration-line'] && styleObj['text-decoration-line'] !== 'none') {
        ['text-decoration-style', 'text-decoration-color', 'text-decoration-thickness'].forEach((p) => {
          const v = computed.getPropertyValue(p);
          if (v && v !== 'auto' && v !== 'solid') styleObj[p] = v;
        });
      }
      // plan-exempt — ps-014: resolve WebGL texture asset for transparent DOM project cards. routing-override: skipped — user requested project image extraction.
      if ((!styleObj['background-image'] || styleObj['background-image'] === 'none') && PageSnap.renderSurfaces && typeof PageSnap.renderSurfaces.resolveProjectAsset === 'function') {
        const detectedSurfaces = PageSnap.renderSurfaces.detect(element);
        const resolvedTexture = PageSnap.renderSurfaces.resolveProjectAsset(el, detectedSurfaces.assets);
        if (resolvedTexture) {
          styleObj['background-image'] = `url("${resolvedTexture}")`;
          styleObj['background-size'] = 'cover';
          styleObj['background-position'] = 'center';
          styleObj['background-repeat'] = 'no-repeat';
        }
      }
      // plan-exempt — ps-014: ensure 3D visual canvas containers retain dark card background and framing. routing-override: skipped — user requested accurate visual card framing.
      const isVisualContainer = (el.id && el.id.includes('visual')) || (el.className && typeof el.className === 'string' && el.className.includes('visual'));
      if (isVisualContainer && (!styleObj['background-color'] || styleObj['background-color'] === 'rgba(0, 0, 0, 0)' || styleObj['background-color'] === 'transparent')) {
        styleObj['background-color'] = '#0b0d12';
        if (!styleObj['border-radius'] || styleObj['border-radius'] === '0px') {
          styleObj['border-radius'] = '24px';
        }
      }
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
    // plan-exempt — ps-008: generalized extraction of authored CSS and interactive :hover/:focus states. routing-override: skipped — user requested generic pseudo-class retention.
    let authoredCss = '';
    try { authoredCss = PageSnap.authoredCss ? PageSnap.authoredCss.build(allElements) : ''; } catch (e) { authoredCss = ''; }
    const scopedCss = authoredCss ? `${pinnedCss}\n\n/* Layout and Interactive Pseudo-State Rules of the original page */\n${authoredCss}` : pinnedCss;
    // Clone element and add scoped classes for self-contained reproduction
// plan-exempt — strip extension highlight classes before adding scoped classes
    const clone = element.cloneNode(true);
    // plan-exempt — ps-008: strip transient runtime hover, active, and highlight classes so initial state is clean. routing-override: skipped — user reported overlay covering wolf.
    const transientClasses = ['pagesnap-region-highlighted', 'web2md-region-highlighted', 'is-hovered', 'has-hover', 'is-case-hovered'];
    transientClasses.forEach(cls => clone.classList.remove(cls));
    clone.querySelectorAll('*').forEach(el => {
      transientClasses.forEach(cls => el.classList.remove(cls));
      // If an overlay scene was captured during hover, reset it to hidden initial state
      if (el.className && typeof el.className === 'string' && el.className.includes('home-cases-scene')) {
        el.classList.remove('is-visible');
        el.classList.add('is-hidden');
      }
    });
    const cloneElements = [clone, ...Array.from(clone.querySelectorAll('*'))];
    cloneElements.forEach((el, index) => {
      el.classList.add(`ps-el-${index}`);
      // plan-exempt — ps-014: ensure cloned visual container carries dark background and rounded corners. routing-override: skipped — user requested accurate visual card framing.
      if ((el.id && el.id.includes('visual')) || (el.className && typeof el.className === 'string' && el.className.includes('visual'))) {
        el.style.backgroundColor = '#0b0d12';
        el.style.borderRadius = '24px';
      }
    });

// plan-exempt — detect effective background and wrap component cleanly
    function getEffectiveBackground(node) {
      let curr = node;
      while (curr && curr !== document && curr.nodeType === 1) {
        const bg = window.getComputedStyle(curr).backgroundColor;
        // plan-exempt — ps-008: ignore semi-transparent glass colors (<0.8 alpha) so body doesn't collapse to white browser default. routing-override: skipped — user requested solid theme matching.
        const alphaMatch = bg ? bg.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/) : null;
        const isSemi = alphaMatch && parseFloat(alphaMatch[1]) < 0.8;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && !isSemi) {
          return bg;
        }
        curr = curr.parentElement;
      }
      const bodyBg = document.body ? window.getComputedStyle(document.body).backgroundColor : null;
      const bodyAlphaMatch = bodyBg ? bodyBg.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/) : null;
      const isBodySemi = bodyAlphaMatch && parseFloat(bodyAlphaMatch[1]) < 0.8;
      if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent' && !isBodySemi) {
        return bodyBg;
      }
      const textColor = window.getComputedStyle(node).color;
      if (textColor && (textColor.includes('247') || textColor.includes('255') || textColor.includes('248') || textColor.includes('208') || textColor.includes('230'))) {
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
