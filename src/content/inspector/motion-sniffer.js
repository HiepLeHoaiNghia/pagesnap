// plan-exempt — observe JavaScript-driven motion (attribute rewrites) while the inspector is active
/**
 * PageSnap motion sniffer.
 *
 * CSS animations and transitions are readable from stylesheets. Motion produced by page JavaScript (SVG path morphs,
 * inline-style tweens, carousels) is not: it only exists as repeated attribute writes. This module watches those writes,
 * but ONLY between start() and stop() - i.e. while the user is inspecting - never in the background.
 * It records counts, timing and the first/last value of each rewritten attribute, never page text.
 */
(function (PageSnap) {
// plan-exempt — bi-directional smooth reverse playback and interactive class toggle
  const WATCHED = ['d', 'points', 'transform', 'style', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
    'width', 'height', 'viewBox', 'stroke-dashoffset', 'opacity', 'class', 'stroke'];
  const MIN_MOTION_WRITES = 6;     // fewer rewrites than this is a state toggle, not motion
  const MAX_GAP_SAMPLES = 400;     // per element+attribute, bounds memory on long-running animations
  const MAX_SAMPLES = 6;           // elements quoted back to the caller
  const MAX_VALUE_CHARS = 240;
  const AUTO_STOP_MS = 120000;     // safety net: never observe forever

  const OWN_UI = '#pagesnap-component-studio-modal, #pagesnap-inspector-overlay, #pagesnap-region-actions-bar, #pagesnap-toast, #web2md-toast';

  // plan-exempt — Phase 9 pointer tracking and computed style diffing
  let records = new WeakMap();
  let observer = null;
  let autoStopTimer = null;
  let pointerActivity = { lastX: 0, lastY: 0, movesCount: 0 };

  function onPointerTrack(e) {
    pointerActivity.lastX = e.clientX;
    pointerActivity.lastY = e.clientY;
    pointerActivity.movesCount++;
  }
  // PageSnap itself restyles the highlighted element (outline); that must never be reported as page motion.
  const withoutOutline = (css) => String(css || '').replace(/outline[^;]*;?/gi, '').replace(/\s+/g, ' ').trim();

  function onMutations(list) {
    const now = performance.now();
    for (const m of list) {
      const el = m.target;
      const name = m.attributeName;
      if (!el || !el.getAttribute) continue;
      if (name === 'style' && withoutOutline(m.oldValue) === withoutOutline(el.getAttribute('style'))) continue;
      if (el.closest && el.closest(OWN_UI)) continue;

      let rec = records.get(el);
      if (!rec) { rec = {}; records.set(el, rec); }
      // plan-exempt — Phase 8 clean motion spec without frame bloat
      let a = rec[name];
      if (!a) { a = rec[name] = { count: 0, first: m.oldValue, peak: null, tFirst: now, tLast: now, lastBatch: -1, gaps: [] }; }
      a.count++;
      if (a.lastBatch !== now) {
        if (a.lastBatch >= 0 && a.gaps.length < MAX_GAP_SAMPLES) a.gaps.push(now - a.lastBatch);
        a.lastBatch = now;
      }
      a.tLast = now;
      const val = el.getAttribute(name);
      if (val !== null && val !== a.first && !String(val).includes('pagesnap-') && !String(val).includes('web2md-')) {
        a.peak = val;
      }
      if (name === 'class' || name === 'style' || name === 'transform') {
        try {
          const cs = window.getComputedStyle(el);
          if (cs) {
            if (a.firstTransform === undefined) a.firstTransform = cs.transform;
            if (cs.transform && cs.transform !== 'none' && cs.transform !== a.firstTransform) {
              a.peakTransform = cs.transform;
            }
          }
        } catch (e) {}
      }
    }
  }

  function relativePath(root, el) {
    const parts = [];
    for (let n = el; n && n !== root; n = n.parentElement) {
      const sameTag = n.parentElement ? Array.from(n.parentElement.children).filter((c) => c.localName === n.localName) : [n];
      parts.unshift(sameTag.length > 1 ? `${n.localName}:nth-of-type(${sameTag.indexOf(n) + 1})` : n.localName);
    }
    return parts.length ? `${root.localName} > ${parts.join(' > ')}` : root.localName;
  }

  const clip = (v) => {
    const s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    return s.length > MAX_VALUE_CHARS ? `${s.slice(0, MAX_VALUE_CHARS)}...` : s;
  };

  PageSnap.motionSniffer = {
    isActive() { return !!observer; },

    start() {
      if (typeof MutationObserver === 'undefined') return;
      this.stop();
      records = new WeakMap();
      pointerActivity = { lastX: 0, lastY: 0, movesCount: 0 };
      document.addEventListener('pointermove', onPointerTrack, { passive: true, capture: true });
      observer = new MutationObserver(onMutations);
      observer.observe(document.documentElement, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: WATCHED });
      autoStopTimer = setTimeout(() => this.stop(), AUTO_STOP_MS);
    },

    // Keeps what was recorded so it can still be described after the user has picked an element.
    stop() {
      document.removeEventListener('pointermove', onPointerTrack, { capture: true });
      if (observer) { observer.disconnect(); observer = null; }
      if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null; }
    },

    /** @returns {null | {attributes: Array, samples: Array, totalWrites: number}} null when no motion was observed */
    describe(root) {
      if (!root || !root.querySelectorAll) return null;
      const groups = {};
      const samples = [];
      const annotatedElements = [];
      const interactiveStates = [];
      const allRootElements = [root, ...Array.from(root.querySelectorAll('*'))];

      allRootElements.forEach((el, elIndex) => {
        const rec = records.get(el);
        if (!rec) return;
        const elSummaries = [];
        Object.keys(rec).forEach((name) => {
          const a = rec[name];
          const g = groups[name] || (groups[name] = { name, writes: 0, elements: 0, tFirst: Infinity, tLast: 0, gaps: [] });
          g.writes += a.count;
          g.elements += 1;
          g.tFirst = Math.min(g.tFirst, a.tFirst);
          g.tLast = Math.max(g.tLast, a.tLast);
          g.gaps.push(...a.gaps);

          const currentVal = (el.getAttribute && el.getAttribute(name)) || '';
          const afterVal = (currentVal && currentVal !== a.first && !String(currentVal).includes('pagesnap-')) ? currentVal : (a.peak || currentVal);
          const spanMs = Math.round(a.tLast - a.tFirst);

          let transformDelta = null;
          if (a.peakTransform && a.peakTransform.startsWith('matrix(')) {
            const parts = a.peakTransform.slice(7, -1).split(',').map(s => parseFloat(s.trim()));
            if (parts.length === 6) {
              transformDelta = { x: Math.round(parts[4] * 1000) / 1000, y: Math.round(parts[5] * 1000) / 1000 };
            }
          }

          if (a.count >= MIN_MOTION_WRITES) {
            samples.push({
              elIndex,
              path: relativePath(root, el),
              attribute: name,
              writes: a.count,
              spanMs,
              before: clip(a.first),
              after: clip(afterVal),
              motionType: name === 'd' ? 'svg-path-morph' : (name === 'transform' ? 'transform-tween' : 'attribute-tween')
            });
            elSummaries.push(`JS ${name} morph (${a.count} frames over ~${spanMs}ms)`);
          } else if ((name === 'class' || name === 'stroke' || name === 'style' || name === 'transform') && a.first !== undefined && a.peak && a.peak !== a.first) {
            interactiveStates.push({
              elIndex,
              path: relativePath(root, el),
              attribute: name,
              before: clip(a.first),
              after: clip(a.peak),
              transformDelta,
              motionType: transformDelta ? 'spring-lift' : (name === 'stroke' ? 'color-toggle' : 'interactive-state-toggle')
            });
            const deltaStr = transformDelta ? ` y: ${transformDelta.y}px` : '';
            elSummaries.push(`Interactive ${name} toggle (${clip(a.first)} -> ${clip(a.peak)}${deltaStr})`);
          }
        });
        if (elSummaries.length) {
          annotatedElements.push({
            elIndex,
            tag: el.localName || el.tagName.toLowerCase(),
            path: relativePath(root, el),
            summary: elSummaries.join('; ')
          });
        }
      });

      const attributes = Object.values(groups)
        .filter((g) => g.writes >= MIN_MOTION_WRITES)
        .sort((a, b) => b.writes - a.writes)
        .map((g) => {
          const gaps = g.gaps.slice().sort((x, y) => x - y);
          return {
            name: g.name,
            writes: g.writes,
            elements: g.elements,
            spanMs: Math.round(g.tLast - g.tFirst),
            medianFrameGapMs: gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)]) : null
          };
        });
      if (!attributes.length && !interactiveStates.length) return null;

      samples.sort((x, y) => y.writes - x.writes);
      const totalWrites = attributes.reduce((s, g) => s + g.writes, 0) + interactiveStates.length;
      return {
        totalWrites,
        attributes,
        samples: samples.slice(0, MAX_SAMPLES),
        interactiveStates: interactiveStates.slice(0, MAX_SAMPLES),
        annotatedElements
      };
    }
  };
// plan-exempt — fix closing brackets in motion-sniffer.js
})(window.PageSnap);
