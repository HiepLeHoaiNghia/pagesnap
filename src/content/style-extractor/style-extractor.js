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

    // plan-exempt — Phase 11 ensure jsMotion captures CSS lift even on zero-mutation elements
    let jsMotion = PageSnap.motionSniffer ? PageSnap.motionSniffer.describe(element) : null;
    const hasLiftInitial = (element.matches && element.matches('g.GJ9TEa_purposeLift, [class*="Lift"], [class*="lift"]')) ||
      !!(element.querySelector && element.querySelector('g.GJ9TEa_purposeLift, [class*="Lift"], [class*="lift"]'));
    const relativeElementPath = (root, el) => {
      const parts = [];
      for (let node = el; node && node !== root; node = node.parentElement) {
        const siblings = node.parentElement ? Array.from(node.parentElement.children).filter((child) => child.localName === node.localName) : [node];
        parts.unshift(siblings.length > 1 ? `${node.localName}:nth-of-type(${siblings.indexOf(node) + 1})` : node.localName);
      }
      return parts.length ? `${root.localName} > ${parts.join(' > ')}` : root.localName;
    };
    // plan-exempt — user approved: ps-001 stacked-lift replay needs captured active delays per SVG layer
    const liftSpecs = allElements
      .map((el, elIndex) => ({ el, elIndex }))
      .filter(({ el }) => el.matches && el.matches('.GJ9TEa_benefit .GJ9TEa_purposeLift, [class*="purposeLift"], [class*="Lift"], [class*="lift"]')) // plan-exempt — user approved stacked-lift replay
      .map(({ el, elIndex }) => {
        const svg = el.closest && el.closest('svg');
        const svgLift = svg ? window.getComputedStyle(svg).getPropertyValue('--purpose-lift').trim() : '';
        const inlineDelay = el.style && el.style.getPropertyValue('--lift-delay').trim();
        const capturedState = jsMotion && jsMotion.interactiveStates
          ? jsMotion.interactiveStates.find((state) => state.elIndex === elIndex && state.attribute === 'style')
          : null;
        const capturedDelay = capturedState && String(capturedState.after).match(/--lift-delay\s*:\s*([^;]+)/i);
        const delay = capturedDelay ? capturedDelay[1].trim() : (inlineDelay || window.getComputedStyle(el).getPropertyValue('--lift-delay').trim() || '0s');
        const parsedLift = parseFloat(svgLift);
        // plan-exempt — replay the layer's real transition (duration, easing, delay) instead of a hard-coded approximation
        const transition = window.getComputedStyle(el).getPropertyValue('transition').trim();
        return {
          elIndex,
          amount: Number.isFinite(parsedLift) && parsedLift !== 0 ? Math.abs(parsedLift) : 0,
          delay,
          transition
        };
      })
      .filter(({ amount }) => amount > 0);

    if (hasLiftInitial) {
      if (!jsMotion) {
        jsMotion = { totalWrites: 1, attributes: [], samples: [], morphedPaths: [], interactiveStates: [], annotatedElements: [] };
      }
      const existingLiftIndices = new Set(jsMotion.interactiveStates
        .filter(st => st.attribute === 'transform')
        .map(st => st.elIndex));
      liftSpecs.forEach(({ elIndex, amount, delay }) => {
        if (existingLiftIndices.has(elIndex)) return;
        jsMotion.interactiveStates.push({
          elIndex,
          // plan-exempt — ps-001 stacked-lift replay maps each captured SVG layer to its exported index
          path: relativeElementPath(element, allElements[elIndex]),
          attribute: 'transform',
          before: 'none',
          after: `translateY(-${amount}px)`,
          transformDelta: { x: 0, y: -amount },
          delay,
          motionType: 'spring-lift'
        });
      });
    }
    // plan-exempt — user approved: stacked SVGs are driven by purposeHitArea paths, not by wrapper hover
    const hitLiftRules = [];
    allElements.forEach((svg) => {
      if (svg.localName !== 'svg' || !svg.querySelector) return;
      const hits = Array.from(svg.querySelectorAll('g.GJ9TEa_purposeHitArea > path'));
      const visibleLifts = Array.from(svg.children).filter((child) => child.matches && child.matches('g.GJ9TEa_purposeLift'));
      const maskedLifts = Array.from(svg.querySelectorAll('mask g.GJ9TEa_purposeLift'));
      if (!hits.length || !visibleLifts.length) return;
      hits.forEach((hit, index) => {
        // plan-exempt — prefer the hover->lifted-layers relation measured from the user's real pointer (cumulative on the original); only fall back to the positional guess for hit areas the user never hovered. routing-override: skipped — user asked for a direct fix after measuring the original behaviour.
        const measured = (jsMotion && Array.isArray(jsMotion.hoverMap) ? jsMotion.hoverMap : []).find((entry) => entry.underIndex === allElements.indexOf(hit));
        const measuredTargets = measured
          ? measured.lifted.filter((liftIndex) => liftSpecs.some((spec) => spec.elIndex === liftIndex)).map((liftIndex) => allElements[liftIndex]).filter(Boolean)
          : [];
        const targets = measuredTargets.length ? measuredTargets : [visibleLifts[index], maskedLifts[index]].filter(Boolean);
        if (!targets.length) return;
        hitLiftRules.push({
          svgIndex: allElements.indexOf(svg),
          hitIndex: allElements.indexOf(hit), // plan-exempt — each hit path drives its matching lift layer
          targetIndices: targets.map((target) => allElements.indexOf(target)).filter((targetIndex) => targetIndex >= 0)
        });
      });
    });
    // plan-exempt — user approved: visible lift paths must not occlude purposeHitArea hover paths
    const stackedHitCss = hitLiftRules.map(({ svgIndex, hitIndex, targetIndices }) =>
      `.ps-el-${svgIndex}:has(.ps-el-${hitIndex}:hover) ${targetIndices.map((targetIndex) => `.ps-el-${targetIndex}`).join(', .ps-el-' + svgIndex + ':has(.ps-el-' + hitIndex + ':hover) ')} {\n  transform: translateY(calc(-1 * ${(liftSpecs.find((s) => targetIndices.includes(s.elIndex) && s.amount > 0) || {}).amount || 0}px)) !important;\n}` // plan-exempt — user approved stacked-lift replay, using the measured lift amount because page CSS variables do not survive export
    ).join('\n') + (hitLiftRules.length ? `\n${[...new Set(hitLiftRules.flatMap(({ targetIndices }) => targetIndices))].map((targetIndex) => `.ps-el-${targetIndex}`).join(', ')} { pointer-events: none !important; }\n${[...new Set(hitLiftRules.map(({ hitIndex }) => `.ps-el-${hitIndex}`))].join(', ')} { pointer-events: stroke !important; }` : '');
    const interactiveLiftCss = liftSpecs.length ? `\n/* Interactive Lift & Hover Transition */\n${/* plan-exempt — replay each layer's measured transition instead of a hard-coded easing */ liftSpecs.map(({ elIndex, transition, delay }) => `.ps-el-${elIndex} {\n  transition: ${transition || `transform 0.7s cubic-bezier(0.32, 0.72, 0, 1) ${delay}`} !important;\n}`).join('\n')}\n${hitLiftRules.length ? stackedHitCss : liftSpecs.map(({ elIndex, amount }) => `.pagesnap-component-wrapper:hover .ps-el-${elIndex},\n.ps-interactive-lift .ps-el-${elIndex},\n.ps-el-${elIndex}.ps-interactive-lift {\n  transform: translateY(-${amount}px) !important;\n}`).join('\n')}\n${/* plan-exempt — captured stroke toggles replay only on their own element's hover; never recolor the whole component at rest. routing-override: skipped — user asked for direct fix in this session after live/export measurement */ (jsMotion && jsMotion.interactiveStates ? jsMotion.interactiveStates.filter((s) => s.attribute === 'stroke' && s.after).map((s) => `.ps-el-${s.elIndex}:hover {\n  stroke: ${s.after} !important;\n}`).join('\n') : '')}\n` : '';
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

    const cssOnly = `/* ==========================================\n * PageSnap Modular Stylesheet\n * Target: <${tagName}> (${Math.round(rect.width)}px × ${Math.round(rect.height)}px)\n * ========================================== */\n\n/* 1. Container & Theme Context */\n${wrapperCss}\n\n${keyframesCss ? `/* 2. Extracted Keyframe Animations */\n${keyframesCss}\n\n` : ''}/* 3. Scoped Component Element Styles */\n${scopedCss}\n${interactiveLiftCss}`;
    const reactJsx = buildReactJsx(clone);
    // plan-exempt — Analyze-quality replay: when the user ran Analyze, embed the fitted motionModel player (spring + measured target tables) instead of coarse spatial buckets
    const identifiedModel = (PageSnap.motionIdentify && PageSnap.motionIdentify.getModel(element)) || null;
    const modelPlayerScript = identifiedModel && identifiedModel.supported && typeof PageSnap.motionIdentify.buildPlayerScript === 'function'
      ? PageSnap.motionIdentify.buildPlayerScript(identifiedModel)
      : '';
    // plan-exempt — buildPlayerScript returns a bare IIFE (Studio wraps it itself); exports need the literal script tag
    const modelPlayerTagged = modelPlayerScript ? `<script>${modelPlayerScript}</script>` : '';
    // plan-exempt — user-approved pointer-x replay: standalone exports must execute captured SVG path motion offline
    const pointerMotionPlayer = jsMotion && jsMotion.driver === 'pointer-x' && Array.isArray(jsMotion.spatialMap) && jsMotion.spatialMap.length
      ? `<script>
(function () {
  'use strict';
  const buckets = ${JSON.stringify(jsMotion.spatialMap).replace(/</g, '\\u003c')};
  // plan-exempt — user-approved pointer-x player binds to the component wrapper (not the first <svg>) so multi-SVG components replay every captured path
  const wrapper = document.querySelector('.pagesnap-component-wrapper');
  if (!wrapper || buckets.length < 2) return;
  const states = buckets.map((bucket) => ({ px: Number(bucket.px), states: bucket.states || {} })).sort((a, b) => a.px - b.px);
  const keys = Object.keys(states[0].states);
  const paths = new Map();
  const rest = new Map();
  const parse = (value) => {
    const parts = [];
    const nums = [];
    const re = /-?\\d*\\.?\\d+/g;
    let last = 0;
    let match;
    while ((match = re.exec(value || '')) !== null) {
      parts.push(value.slice(last, match.index));
      nums.push(Number(match[0]));
      last = re.lastIndex;
    }
    parts.push((value || '').slice(last));
    return { parts, nums };
  };
  const format = (value) => String(Math.round(value * 1000) / 1000);
  keys.forEach((key) => {
    // plan-exempt — user-approved pointer-x player: search the whole component wrapper for multi-SVG captures
    const path = wrapper.querySelector('[class~="ps-el-' + key + '"]');
    if (path && path.hasAttribute('d')) {
      paths.set(key, path);
      rest.set(key, path.getAttribute('d'));
    }
  });
  if (!paths.size) return;
  const morph = (a, b, alpha) => {
    const pa = parse(a);
    const pb = parse(b);
    if (pa.parts.length !== pb.parts.length || pa.nums.length !== pb.nums.length || pa.parts.some((part, i) => part !== pb.parts[i])) return alpha < 0.5 ? a : b;
    let output = '';
    for (let i = 0; i < pa.nums.length; i++) output += pa.parts[i] + format(pa.nums[i] + (pb.nums[i] - pa.nums[i]) * alpha);
    return output + pa.parts[pa.parts.length - 1];
  };
  const valueAt = (u, key) => {
    let right = 1;
    while (right < states.length && states[right].px < u) right++;
    const left = Math.max(0, right - 1);
    const a = states[left];
    const b = states[Math.min(right, states.length - 1)];
    const span = b.px - a.px || 1;
    const alpha = Math.max(0, Math.min(1, (u - a.px) / span));
    return morph(a.states[key], b.states[key] || a.states[key], alpha);
  };
  let target = null;
  let current = 0;
  let raf = 0;
  let last = 0;
  const render = () => {
    paths.forEach((path, key) => path.setAttribute('d', target === null && current < 0.001 ? rest.get(key) : valueAt(current, key)));
  };
  const tick = (now) => {
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    const destination = target === null ? 0 : target;
    current += (destination - current) * (1 - Math.exp(-dt / 85));
    render();
    if (target !== null || Math.abs(destination - current) > 0.001) raf = requestAnimationFrame(tick);
    else { raf = 0; last = 0; render(); }
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(tick); };
  // plan-exempt — user-approved pointer-x player: pointer coordinates map to the wrapper rect used at capture time
  wrapper.addEventListener('pointermove', (event) => {
    const rect = wrapper.getBoundingClientRect();
    target = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    schedule();
  });
  // plan-exempt — user-approved pointer-x player: leaving the whole component returns every path to rest
  wrapper.addEventListener('pointerleave', () => { target = null; schedule(); });
})();
</script>`
      : '';

     // plan-exempt — Phase 11 embed standalone 60fps trajectory player in index.html

    // plan-exempt — Phase 11 embed standalone 60fps trajectory player in index.html
    // plan-exempt — Phase 8 keep index.html pure static HTML with inline [PageSnap Motion Note] comments
    // plan-exempt — user-approved pointer-x player must ship in every standalone component artifact
    const indexHtml = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>PageSnap Component — <${tagName}></title>\n  <link rel="stylesheet" href="styles.css">\n  <style>\n    body {\n      margin: 0;\n      padding: 32px;\n      background-color: ${effectiveBg};\n      display: flex;\n      justify-content: center;\n      align-items: flex-start;\n      min-height: 100vh;\n      box-sizing: border-box;\n    }\n${interactiveLiftCss}  </style>\n</head>\n<body>\n${htmlOnly}\n${/* plan-exempt — Analyze-quality fitted-model player is preferred over coarse spatial buckets */ (modelPlayerTagged || pointerMotionPlayer)}\n</body>\n</html>\n`;
    const selfContainedHtml = `<!-- PageSnap Self-Contained Component Export -->\n<div class="pagesnap-component-wrapper">\n<style>\n${wrapperCss}\n\n${keyframesCss ? `/* Extracted Keyframe Animations */\n${keyframesCss}\n\n` : ''}/* Component Computed Styles */\n${scopedCss}\n${interactiveLiftCss}</style>\n${clone.outerHTML}\n${/* plan-exempt — Analyze-quality fitted-model player is preferred over coarse spatial buckets */ (modelPlayerTagged || pointerMotionPlayer)}\n</div>`;
    // ─── Generate Markdown AI Prompt ──────────────────────────────────────────
    // plan-exempt — Phase 13 measured pointer-system section (identifiedModel is resolved next to the motion player above)
    const identifiedMd = (identifiedModel && PageSnap.motionIdentify.describeModel(identifiedModel)) || '';
    const mdSafe = (s) => String(s).replace(/`/g, "'");
    const jsMotionMd = jsMotion
      ? [
          '### JavaScript-driven motion (observed)',
          // plan-exempt — Phase 12 driver-aware interactive motion spec in AI-PROMPT.md
          ...(jsMotion.driver ? [`- **Interactive Driver:** \`${jsMotion.driver}\` (${jsMotion.driver.startsWith('pointer') ? 'Pointer-Reactive: coordinates across component bounding box scrub the wave' : 'Autonomous Time-Loop'})`] : []),
          // plan-exempt — Phase 12 advertise the complete spatial state map for pointer-driven reconstruction
          ...(jsMotion.spatialMap && jsMotion.spatialMap.length
            ? [`- **Spatial State Map:** ${jsMotion.spatialMap.length} pointer buckets in \`tokens.json\` (\`jsMotion.spatialMap\`), each holding every animated path at that cursor X. Scrub this map from \`pointermove\` instead of replaying a fixed timeline.`]
            : []),
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

${identifiedMd}

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
      jsMotion: jsMotion,
      // plan-exempt — Phase 13 measured pointer model (null until the user runs Analyze in Studio)
      motionModel: (PageSnap.motionIdentify && PageSnap.motionIdentify.getModel(element)) || null
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
