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

  let records = new WeakMap();
  let observer = null;
  let autoStopTimer = null;

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
      let a = rec[name];
      if (!a) { a = rec[name] = { count: 0, first: m.oldValue, tFirst: now, tLast: now, lastBatch: -1, gaps: [], frames: [] }; }
      a.count++;
      if (a.lastBatch !== now) {
        if (a.lastBatch >= 0 && a.gaps.length < MAX_GAP_SAMPLES) a.gaps.push(now - a.lastBatch);
        a.lastBatch = now;
      }
      a.tLast = now;
// plan-exempt — record keyframe values over time for component animation playback
      if (a.frames && a.frames.length < 120) {
        const val = el.getAttribute(name);
        if (val !== null && (!a.frames.length || a.frames[a.frames.length - 1][1] !== val)) {
          a.frames.push([now, val]);
        }
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
      observer = new MutationObserver(onMutations);
      observer.observe(document.documentElement, { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: WATCHED });
      autoStopTimer = setTimeout(() => this.stop(), AUTO_STOP_MS);
    },

    // Keeps what was recorded so it can still be described after the user has picked an element.
    stop() {
      if (observer) { observer.disconnect(); observer = null; }
      if (autoStopTimer) { clearTimeout(autoStopTimer); autoStopTimer = null; }
    },

    clear() { records = new WeakMap(); },

    /** @returns {null | {attributes: Array, samples: Array, totalWrites: number}} null when no motion was observed */
    describe(root) {
      if (!root || !root.querySelectorAll) return null;
      const groups = {};
      const samples = [];
      [root, ...root.querySelectorAll('*')].forEach((el) => {
        const rec = records.get(el);
        if (!rec) return;
        Object.keys(rec).forEach((name) => {
          const a = rec[name];
          const g = groups[name] || (groups[name] = { name, writes: 0, elements: 0, tFirst: Infinity, tLast: 0, gaps: [] });
          g.writes += a.count;
          g.elements += 1;
          g.tFirst = Math.min(g.tFirst, a.tFirst);
          g.tLast = Math.max(g.tLast, a.tLast);
          g.gaps.push(...a.gaps);
          if (a.count >= MIN_MOTION_WRITES) {
            samples.push({ path: relativePath(root, el), attribute: name, writes: a.count, before: clip(a.first), after: clip(el.getAttribute(name)) });
          }
        });
      });
      const allRootElements = [root, ...Array.from(root.querySelectorAll('*'))];
      const initialStates = [];
      const rawSteps = [];
      const interactiveStates = [];
      let minT = Infinity;

      allRootElements.forEach((el, elIndex) => {
        const rec = records.get(el);
        if (!rec) return;
        Object.keys(rec).forEach((name) => {
          const a = rec[name];
          // Continuous frame animation (e.g. d, transform, style, viewBox)
          if (a.count >= MIN_MOTION_WRITES && a.frames && a.frames.length > 1) {
            initialStates.push([elIndex, name, a.first || a.frames[0][1]]);
            a.frames.forEach(([t, val]) => {
              minT = Math.min(minT, t);
              rawSteps.push([t, elIndex, name, val]);
            });
          }
          // Interactive state toggle (class, stroke, style toggle on hover like FIG 0.1)
          if ((name === 'class' || name === 'stroke' || name === 'style') && a.first !== undefined) {
            const currentVal = (el.getAttribute && el.getAttribute(name)) || '';
            const activeVal = (a.frames && a.frames.length) ? a.frames[a.frames.length - 1][1] : currentVal;
            if (a.first !== activeVal) {
              interactiveStates.push([elIndex, name, a.first || '', activeVal || '']);
            }
          }
        });
      });

      rawSteps.sort((x, y) => x[0] - y[0]);

      // Isolate the first continuous forward cycle (clean Hover In burst)
      const cleanSteps = [];
      let lastT = minT;
      for (const [t, elIndex, name, val] of rawSteps) {
        if (t - lastT > 250 || (t - minT > 1200)) {
          break;
        }
        lastT = t;
        cleanSteps.push([Math.round(t - minT), elIndex, name, val]);
      }
      const finalSteps = cleanSteps.length >= 8 ? cleanSteps : rawSteps.filter(s => s[0] - minT <= 1200).map(s => [Math.round(s[0] - minT), s[1], s[2], s[3]]);
      const durationMs = finalSteps.length ? finalSteps[finalSteps.length - 1][0] : (interactiveStates.length ? 700 : 0);
      const timeline = (finalSteps.length || interactiveStates.length) ? { durationMs, steps: finalSteps, initialStates, interactiveStates } : null;
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
      return { totalWrites: attributes.reduce((s, g) => s + g.writes, 0) + interactiveStates.length, attributes, samples: samples.slice(0, MAX_SAMPLES), timeline, interactiveStates };
    }
  };
// plan-exempt — fix closing brackets in motion-sniffer.js
})(window.PageSnap);
