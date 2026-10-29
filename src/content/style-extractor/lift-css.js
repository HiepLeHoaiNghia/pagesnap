// plan-exempt — ps-003 phases 3 and 4: hover-lift CSS built only from MEASURED data. routing-override: skipped — user asked to build from the plan.
/**
 * PageSnap lift model.
 *
 * Turns what the sniffer measured (jsMotion.liftLayers: how far each toggled layer settled; jsMotion.hoverMap: which
 * layers were toggled while the real pointer rested on which element) into the CSS that replays the hover in an export.
 * It knows no class names and no page CSS variables, so it works on any page whose hover is driven by class toggles.
 */
(function (PageSnap) {
  'use strict';

  const px = (n) => `${Math.round(n * 1000) / 1000}px`;
  const translate = (dx, dy) => `translate(${px(dx)}, ${px(dy)})`;

  /** Index of the lowest element that contains every given element (0 = the exported root). */
  function lowestCommonAncestorIndex(allElements, indices) {
    const els = indices.map((i) => allElements[i]).filter(Boolean);
    if (!els.length) return 0;
    let node = els[0];
    while (node && !els.every((e) => node.contains(e))) node = node.parentElement;
    const index = allElements.indexOf(node);
    return index >= 0 ? index : 0;
  }

  /**
   * Selector that matches `target` while the pointer is over `hit`. A `:has()` on the ancestor is needed when the
   * hover element is not an ancestor of the target, which is the common case for stacked hit areas.
   */
  function selectorFor(allElements, hitIndex, targetIndex) {
    const hit = allElements[hitIndex];
    const target = allElements[targetIndex];
    if (hitIndex === targetIndex) return `.ps-el-${hitIndex}:hover`;
    if (target.contains(hit)) return `.ps-el-${targetIndex}:has(.ps-el-${hitIndex}:hover)`;
    if (hit.contains(target)) return `.ps-el-${hitIndex}:hover .ps-el-${targetIndex}`;
    const scope = lowestCommonAncestorIndex(allElements, [hitIndex, targetIndex]);
    return `.ps-el-${scope}:has(.ps-el-${hitIndex}:hover) .ps-el-${targetIndex}`;
  }

  /**
   * @param {{allElements: Element[], jsMotion: object|null, pathOf: function(Element): string}} input
   * @returns {{jsMotion: object|null, interactiveLiftCss: string, hitRules: Array}}
   */
  function build(input) {
    const { allElements, pathOf } = input;
    const jsMotion = input.jsMotion;
    const layers = jsMotion && Array.isArray(jsMotion.liftLayers) ? jsMotion.liftLayers : [];

    const specs = layers.map(({ elIndex, dx, dy }) => {
      const el = allElements[elIndex];
      if (!el) return null;
      const cs = window.getComputedStyle(el);
      return {
        elIndex,
        dx,
        dy,
        // replay the layer's real transition (duration, easing and delay) instead of an approximation
        transition: cs.getPropertyValue('transition').trim(),
        delay: cs.getPropertyValue('transition-delay').trim() || '0s'
      };
    }).filter(Boolean);
    if (!specs.length) return { jsMotion, interactiveLiftCss: '', hitRules: [] };

    // the AI prompt and the motion notes learn about layers that lift only through CSS transitions
    if (Array.isArray(jsMotion.interactiveStates)) {
      const known = new Set(jsMotion.interactiveStates.filter((s) => s.attribute === 'transform').map((s) => s.elIndex));
      specs.forEach(({ elIndex, dx, dy, delay }) => {
        if (known.has(elIndex)) return;
        jsMotion.interactiveStates.push({
          elIndex,
          path: pathOf(allElements[elIndex]),
          attribute: 'transform',
          before: 'none',
          after: translate(dx, dy),
          transformDelta: { x: dx, y: dy },
          delay,
          motionType: 'spring-lift'
        });
      });
    }

    const byIndex = new Map(specs.map((s) => [s.elIndex, s]));
    const hover = Array.isArray(jsMotion.hoverMap) ? jsMotion.hoverMap : [];
    const hitRules = [];
    hover.forEach((entry) => {
      const targetIndices = entry.lifted.filter((i) => byIndex.has(i));
      if (targetIndices.length && allElements[entry.underIndex]) hitRules.push({ hitIndex: entry.underIndex, targetIndices });
    });

    const transitionCss = specs
      .map(({ elIndex, transition, delay }) => `.ps-el-${elIndex} {\n  transition: ${transition || `transform 0.3s ease ${delay}`} !important;\n}`)
      .join('\n');

    let hoverCss;
    if (hitRules.length) {
      // one block per (hover element, identical movement) so cumulative stacks stay readable
      const blocks = hitRules.flatMap(({ hitIndex, targetIndices }) => {
        const groups = new Map();
        targetIndices.forEach((t) => {
          const { dx, dy } = byIndex.get(t);
          const value = translate(dx, dy);
          if (!groups.has(value)) groups.set(value, []);
          groups.get(value).push(selectorFor(allElements, hitIndex, t));
        });
        return Array.from(groups, ([value, selectors]) => `${selectors.join(',\n')} {\n  transform: ${value} !important;\n}`);
      });

      // lifted layers must not sit between the pointer and the hover elements, unless they ARE (or contain, or are inside) one
      const hitIndices = [...new Set(hitRules.map((r) => r.hitIndex))];
      const targetIndices = [...new Set(hitRules.flatMap((r) => r.targetIndices))];
      const inTheWay = targetIndices.filter((t) => !hitIndices.some((h) => h === t || allElements[t].contains(allElements[h]) || allElements[h].contains(allElements[t])));
      const pointerCss = [];
      if (inTheWay.length) pointerCss.push(`${inTheWay.map((t) => `.ps-el-${t}`).join(', ')} { pointer-events: none !important; }`);
      // hover elements keep the pointer-events value they had on the page (stroke-only hit areas depend on it)
      const byPointer = new Map();
      hitIndices.forEach((h) => {
        const value = window.getComputedStyle(allElements[h]).pointerEvents;
        if (value && value !== 'auto') { if (!byPointer.has(value)) byPointer.set(value, []); byPointer.get(value).push(`.ps-el-${h}`); }
      });
      byPointer.forEach((selectors, value) => pointerCss.push(`${selectors.join(', ')} { pointer-events: ${value} !important; }`));
      hoverCss = blocks.concat(pointerCss).join('\n');
    } else {
      // no measured hover relation: the whole component lifts its layers together
      hoverCss = specs.map(({ elIndex, dx, dy }) => `.pagesnap-component-wrapper:hover .ps-el-${elIndex},\n.ps-interactive-lift .ps-el-${elIndex},\n.ps-el-${elIndex}.ps-interactive-lift {\n  transform: ${translate(dx, dy)} !important;\n}`).join('\n');
    }

    // a stroke that the page toggled replays only on its own element's hover; never recolor the whole component at rest
    const strokeCss = (jsMotion.interactiveStates || [])
      .filter((s) => s.attribute === 'stroke' && s.after)
      .map((s) => `.ps-el-${s.elIndex}:hover {\n  stroke: ${s.after} !important;\n}`)
      .join('\n');

    return { jsMotion, interactiveLiftCss: `\n/* Interactive Lift & Hover Transition */\n${transitionCss}\n${hoverCss}\n${strokeCss}\n`, hitRules };
  }

  PageSnap.liftModel = { build, selectorFor };
})(window.PageSnap = window.PageSnap || {});
