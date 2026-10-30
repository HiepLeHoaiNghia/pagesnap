// plan-exempt — ps-006: keep what the page's own CSS says about layout (percentages, fr, calc, @media, @container), not only the pixels computed at capture. Idea learned from ui-clone-skills (collect the authored @media rules and check at several real viewport widths). routing-override: skipped — user asked to learn from ui-clone-skills and improve the repo.
/**
 * authored-css.js — responsive layer for the exported component.
 *
 * style-collect.js pins every property to the value computed at capture time, so a grid of `repeat(3, 1fr)` becomes three
 * fixed columns and an `@media (max-width: 800px)` rule is lost. This module adds, after those pinned rules, the page's
 * own layout rules for the elements of the component, in the order the cascade would apply them:
 *   - unconditional rules whose value is relative (%, vw, fr, auto, calc(), clamp() ...) or that a conditional rule also sets;
 *   - conditional rules (@media, @supports, @container), wrapped in their own condition.
 * Elements whose size no readable rule sets lose their pinned width/height (so they flow again). Everything is mapped onto
 * the `.ps-el-N` classes that style-collect.js gives the clone, so the index of an element is its position in `elements`.
 *
 * Limits: stylesheets the page does not let us read (cross-origin) are skipped, and when one exists nothing is unpinned;
 * the cascade is approximated (specificity, layer, source order, !important); a `var()` that cannot be resolved drops its declaration.
 */
(function (PageSnap) {
  'use strict';

  // layout geometry: these are kept as authored when they are relative, or when a conditional rule also sets them
  const LAYOUT_PROPS = new Set([
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'aspect-ratio',
    'flex', 'flex-basis', 'flex-grow', 'flex-shrink', 'order',
    'grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-auto-columns', 'grid-auto-rows', 'grid-auto-flow',
    'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end',
    'gap', 'row-gap', 'column-gap',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'top', 'right', 'bottom', 'left', 'font-size', 'line-height'
  ]);
  // layout mode: always kept when authored
  const MODE_PROPS = new Set(['display', 'flex-direction', 'flex-wrap', 'position', 'container-type', 'container-name']);
  const FLUID = /\d(%|vw|vh|vmin|vmax|svw|svh|dvw|dvh|lvw|lvh|cqw|cqh|fr|rem|em)(?![a-z])|\b(auto|fit-content|max-content|min-content)\b|\b(calc|min|max|clamp|minmax|repeat)\(/i;
  const KEEP_SIZE_TAGS = new Set(['IMG', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO', 'IFRAME', 'OBJECT', 'EMBED', 'INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'PICTURE']);
  const UNLAYERED = 1e6;
  const MAX_CSS_CHARS = 300000;

  function splitSelectors(text) {
    const out = [];
    let depth = 0;
    let quote = '';
    let cur = '';
    for (const ch of String(text)) {
      if (quote) { cur += ch; if (ch === quote) quote = ''; continue; }
      if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
      if (ch === '(' || ch === '[') depth++;
      else if (ch === ')' || ch === ']') depth--;
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  function specificity(sel) {
    let s = sel.replace(/:where\((?:[^()]|\([^()]*\))*\)/g, '').replace(/::?[\w-]+\(\s*\)/g, '');
    s = s.replace(/\[[^\]]*\]/g, ' [a] ');
    const ids = (s.match(/#(?:\\.|[\w-])+/g) || []).length;
    const cls = (s.match(/\.(?:\\.|[\w-])+|\[a\]|:(?!:)[\w-]+/g) || []).length;
    const typ = (s.replace(/#(?:\\.|[\w-])+|\.(?:\\.|[\w-])+|\[a\]|::?[\w-]+(?:\([^)]*\))?/g, ' ').match(/(^|[\s>+~(])[a-zA-Z][\w-]*/g) || []).length;
    return ids * 10000 + cls * 100 + typ;
  }

  function safeMatches(el, sel) {
    try { return el.matches(sel); } catch (e) { return false; }
  }
  function safeMatchesAny(root, sel) {
    try { return root.matches(sel) || !!root.querySelector(sel); } catch (e) { return false; }
  }

  /** every style rule of every readable sheet, with the conditions and layer it sits in and its source order */
  function readRules() {
    const records = [];
    const layerIndex = new Map();
    const layerOf = (name) => { if (!layerIndex.has(name)) layerIndex.set(name, layerIndex.size); return layerIndex.get(name); };
    let order = 0;
    let unreadable = 0;
    const walk = (rules, ctx) => {
      for (const rule of Array.from(rules)) {
        const kind = rule.constructor.name;
        if (kind === 'CSSStyleRule') {
          records.push({ rule, conds: ctx.conds, layer: ctx.layer, order: order++ });
        } else if (kind === 'CSSImportRule') {
          try { if (rule.styleSheet) walk(rule.styleSheet.cssRules, ctx); } catch (e) { unreadable++; }
        } else if (kind === 'CSSLayerStatementRule') {
          Array.from(rule.nameList || []).forEach(layerOf);
        } else if (kind === 'CSSLayerBlockRule') {
          walk(rule.cssRules, { conds: ctx.conds, layer: layerOf(rule.name || `anon${order++}`) });
        } else if (kind === 'CSSMediaRule' || kind === 'CSSSupportsRule' || kind === 'CSSContainerRule') {
          const head = rule.cssText.slice(0, rule.cssText.indexOf('{')).trim();
          walk(rule.cssRules, { conds: ctx.conds.concat([{ head, kind, rule }]), layer: ctx.layer });
        }
        // keyframes, font-face, page, scope and the like carry no element layout: ignored on purpose
      }
    };
    const sheets = [...Array.from(document.styleSheets), ...Array.from(document.adoptedStyleSheets || [])];
    for (const sheet of sheets) {
      try { walk(sheet.cssRules, { conds: [], layer: UNLAYERED }); } catch (e) { unreadable++; }
    }
    return { records, unreadable };
  }

  function holdsNow(cond) {
    try {
      if (cond.kind === 'CSSMediaRule') return window.matchMedia(cond.rule.media.mediaText).matches;
      if (cond.kind === 'CSSSupportsRule') return CSS.supports(cond.rule.conditionText);
    } catch (e) { /* unknown */ }
    return null; // container queries cannot be evaluated from here
  }

  function resolveVars(value, el) {
    let v = value;
    for (let guard = 0; guard < 5 && v.includes('var('); guard++) {
      v = v.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)/g, (all, name, fallback) => {
        const got = getComputedStyle(el).getPropertyValue(name).trim();
        return got || (fallback !== undefined ? fallback.trim() : all);
      });
    }
    return v.includes('var(') ? null : v;
  }

  /**
   * @param {Element[]} elements the component root first, then its descendants (index = ps-el-N)
   * @returns {string} CSS to append after the pinned rules
   */
  function build(elements) {
    if (!elements || !elements.length) return '';
    const root = elements[0];
    const { records, unreadable } = readRules();

    // keep only rules that can match something inside the component
    const relevant = [];
    for (const rec of records) {
      const parts = splitSelectors(rec.rule.selectorText).filter((p) => safeMatchesAny(root, p));
      if (parts.length) relevant.push({ ...rec, parts });
    }

    const per = elements.map(() => []);
    elements.forEach((el, i) => {
      for (const rec of relevant) {
        let spec = -1;
        for (const part of rec.parts) if (safeMatches(el, part)) spec = Math.max(spec, specificity(part));
        if (spec < 0) continue;
        // a rule that sets nothing we care about is skipped early
        const decls = [];
        const style = rec.rule.style;
        const nowTrue = rec.conds.every((c) => holdsNow(c) === true);
        for (let k = 0; k < style.length; k++) {
          const prop = style[k];
          const wanted = LAYOUT_PROPS.has(prop) || MODE_PROPS.has(prop) || (rec.conds.length && !nowTrue);
          if (!wanted || prop.startsWith('--')) continue;
          decls.push({ prop, value: style.getPropertyValue(prop).trim(), important: style.getPropertyPriority(prop) === 'important' });
        }
        if (decls.length) per[i].push({ conds: rec.conds, layer: rec.layer, spec, order: rec.order, decls, nowTrue });
      }
    });

    const blocks = [];
    let chars = 0;
    const emit = (text) => { if (chars + text.length <= MAX_CSS_CHARS) { blocks.push(text); chars += text.length; } };

    elements.forEach((el, i) => {
      const sel = `.ps-el-${i}`;
      const entries = per[i].sort((a, b) => (a.layer - b.layer) || (a.spec - b.spec) || (a.order - b.order));
      const inline = el.style || { getPropertyValue: () => '' };
      const conditionalProps = new Set();
      const settersOf = new Set();
      entries.forEach((e) => e.decls.forEach((d) => { settersOf.add(d.prop); if (e.conds.length) conditionalProps.add(d.prop); }));

      // 1) un-pin what no readable rule sets: the element flows again instead of keeping its used size
      const lead = [];
      if (!unreadable && !KEEP_SIZE_TAGS.has(el.tagName.toUpperCase())) {
        if (!settersOf.has('width') && !inline.getPropertyValue('width') && i !== 0) lead.push('width: auto');
        if (!settersOf.has('height') && !inline.getPropertyValue('height')) lead.push('height: auto');
      }
      // the component keeps its captured width on a wide window but may shrink on a narrow one
      if (i === 0) lead.push('max-width: 100%');
      if (lead.length) emit(`${sel} { ${lead.join('; ')}; }`);

      // 2) authored rules, in cascade order
      for (const e of entries) {
        const lines = [];
        for (const d of e.decls) {
          if (inline.getPropertyValue(d.prop) && !d.important) continue; // an inline style beats a rule anyway and is kept on the element
          const value = d.value.includes('var(') ? resolveVars(d.value, el) : d.value;
          if (!value) continue;
          const conditional = e.conds.length > 0;
          const keep = conditional
            ? (e.nowTrue ? (LAYOUT_PROPS.has(d.prop) || MODE_PROPS.has(d.prop)) : true)
            : (MODE_PROPS.has(d.prop) || (LAYOUT_PROPS.has(d.prop) && (FLUID.test(value) || conditionalProps.has(d.prop))));
          if (keep) lines.push(`${d.prop}: ${value}${d.important ? ' !important' : ''}`);
        }
        if (!lines.length) continue;
        let text = `${sel} { ${lines.join('; ')}; }`;
        for (let c = e.conds.length - 1; c >= 0; c--) text = `${e.conds[c].head} { ${text} }`;
        emit(text);
      }
    });

    PageSnap.authoredCss.lastStats = { rulesInPage: records.length, relevantRules: relevant.length, blocks: blocks.length, chars, unreadableSheets: unreadable, capped: chars >= MAX_CSS_CHARS };
    return blocks.join('\n');
  }

  PageSnap.authoredCss = { build, lastStats: null };
})(window.PageSnap = window.PageSnap || {});
