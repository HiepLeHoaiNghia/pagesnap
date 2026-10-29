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
  // plan-exempt — ps-003 phase 3: lift layers are MEASURED, not recognised by class name. When a class toggles we remember the element's translation at that instant (the start of its transition); after the hover settles the sweep reads it again and keeps the difference. routing-override: skipped — user asked to build from the plan.
  const restTransform = new WeakMap(); // el -> {x, y} translation when its class first changed
  const liftDelta = new WeakMap();     // el -> {x, y} settled translation minus rest (only if it actually moved)
  let toggledSinceMark = new Set();    // elements whose class changed since the sweep last cleared it
  const translationOf = (el) => {
    const t = String(getComputedStyle(el).transform);
    const m = t.match(/matrix(3d)?\(([^)]+)\)/);
    if (!m) return { x: 0, y: 0 };
    const v = m[2].split(',').map(Number);
    return m[1] ? { x: v[12] || 0, y: v[13] || 0 } : { x: v[4] || 0, y: v[5] || 0 };
  };
  let observer = null;
  let autoStopTimer = null;
  let pointerActivity = { lastX: 0, lastY: 0, movesCount: 0 };
  // plan-exempt — Phase 11 global sniffer start timestamp to preserve multi-element traveling wave timing
  let snifferStartTime = 0;

  // plan-exempt — Phase 11 track pointer activity and observe pure CSS hover transforms
  function onPointerTrack(e) {
    pointerActivity.lastX = e.clientX;
    pointerActivity.lastY = e.clientY;
    pointerActivity.movesCount++;

    const target = e.target;
    if (!target || (target.closest && target.closest(OWN_UI))) return;

    const candidates = [target, ...Array.from(target.querySelectorAll('g, svg, [class*="lift"], [class*="Lift"]'))].slice(0, 8);
    for (const el of candidates) {
      if (!el || !el.getAttribute) continue;
      try {
        const cs = window.getComputedStyle(el);
        if (cs && cs.transform && cs.transform !== 'none' && cs.transform !== 'matrix(1, 0, 0, 1, 0, 0)') {
          let rec = records.get(el);
          if (!rec) { rec = {}; records.set(el, rec); }
          let a = rec['transform'];
          if (!a) {
            a = rec['transform'] = {
              count: 0,
              first: 'none',
              peak: cs.transform,
              maxDelta: 30,
              tFirst: performance.now(),
              tLast: performance.now(),
              firstTransform: 'none',
              peakTransform: cs.transform,
              gaps: []
            };
          }
          a.count++;
          a.tLast = performance.now();
          a.peak = cs.transform;
          a.peakTransform = cs.transform;
        }
      } catch (err) {}
    }
  }
  // PageSnap itself restyles the highlighted element (outline); that must never be reported as page motion.
  const withoutOutline = (css) => String(css || '').replace(/outline[^;]*;?/gi, '').replace(/\s+/g, ' ').trim();

  // plan-exempt — measure maximum numeric delta to track true peak deformation and reject noise
  function measureMaxNumericDelta(strA, strB) {
    if (!strA || !strB || strA === strB) return 0;
    const numsA = (String(strA).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    const numsB = (String(strB).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    const len = Math.min(numsA.length, numsB.length);
    let maxDiff = 0;
    for (let i = 0; i < len; i++) {
      const diff = Math.abs(numsA[i] - numsB[i]);
      if (diff > maxDiff) maxDiff = diff;
    }
    return maxDiff;
  }

  function onMutations(list) {
    const now = performance.now();
    for (const m of list) {
      const el = m.target;
      const name = m.attributeName;
      if (!el || !el.getAttribute) continue;
      if (name === 'style' && withoutOutline(m.oldValue) === withoutOutline(el.getAttribute('style'))) continue;
      if (el.closest && el.closest(OWN_UI)) continue;
      // plan-exempt — ps-003 phase 3: remember the rest translation the first time a class changes (the transition has just started, so the computed value is still the start value)
      if (name === 'class') {
        if (!restTransform.has(el)) { try { restTransform.set(el, translationOf(el)); } catch (e) {} }
        toggledSinceMark.add(el);
      }

      let rec = records.get(el);
      if (!rec) { rec = {}; records.set(el, rec); }
      // plan-exempt — Phase 11 record trajectory stream frames with throttle
      let a = rec[name];
      if (!a) {
        a = rec[name] = {
          count: 0,
          first: m.oldValue || el.getAttribute(name),
          peak: null,
          maxDelta: 0,
          tFirst: now,
          tLast: now,
          lastBatch: -1,
          gaps: [],
          frames: [],
          lastFrameTime: -1
        };
      }
      a.count++;
      if (a.lastBatch !== now) {
        if (a.lastBatch >= 0 && a.gaps.length < MAX_GAP_SAMPLES) a.gaps.push(now - a.lastBatch);
        a.lastBatch = now;
      }
      a.tLast = now;
      const val = el.getAttribute(name);
      if (val !== null && !String(val).includes('pagesnap-') && !String(val).includes('web2md-')) {
        const delta = measureMaxNumericDelta(a.first, val);
        if (delta > (a.maxDelta || 0)) {
          a.maxDelta = delta;
          a.peak = val;
        }
        // plan-exempt — Phase 12 record normalized pointer coordinates (px, py) for driver correlation
        if (a.frames.length < 250 && (now - a.lastFrameTime >= 16 || a.frames.length === 0)) {
          const relT = snifferStartTime ? Math.round(now - snifferStartTime) : Math.round(now - a.tFirst);
          let px = 0.5, py = 0.5;
          try {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              px = Math.max(0, Math.min(1, (pointerActivity.lastX - r.left) / r.width));
              py = Math.max(0, Math.min(1, (pointerActivity.lastY - r.top) / r.height));
            }
          } catch (e) {}
          const frame = {
            t: relT,
            val,
            px: Math.round(px * 1000) / 1000,
            py: Math.round(py * 1000) / 1000,
            // plan-exempt — Phase 12 keep raw client coords so describe(root) can normalize to the component box
            cx: Math.round(pointerActivity.lastX),
            cy: Math.round(pointerActivity.lastY)
          };
          // plan-exempt — measure hover->state relations that live in page JS (e.g. React onMouseEnter toggling classes): remember what the REAL pointer was over when each state-toggle attribute was written. routing-override: skipped — user asked for a direct fix after measuring that the original lifts a cumulative set of layers per hit area while the export lifted one.
          // Non-enumerable on purpose: React puts circular __reactFiber$ keys on DOM nodes and frames get JSON-serialised into tokens.json.
          if (name !== 'd' && pointerActivity.movesCount > 0) {
            try {
              const under = document.elementsFromPoint(pointerActivity.lastX, pointerActivity.lastY).find((node) => !(node.closest && node.closest(OWN_UI)));
              if (under) Object.defineProperty(frame, 'under', { value: under, enumerable: false });
            } catch (e) {}
          }
          a.frames.push(frame);
          a.lastFrameTime = now;
        }
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
  // plan-exempt — remove duplicate measureMaxNumericDelta
  const clip = (v) => {
    const s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    return s.length > MAX_VALUE_CHARS ? `${s.slice(0, MAX_VALUE_CHARS)}...` : s;
  };

  PageSnap.motionSniffer = {
    isActive() { return !!observer; },

    start() {
      if (typeof MutationObserver === 'undefined') return;
      this.stop();
      // plan-exempt — preserve records across re-inspect cycles in the same session
      if (!records) records = new WeakMap();
      pointerActivity = { lastX: 0, lastY: 0, movesCount: 0 };
      if (!snifferStartTime) snifferStartTime = performance.now();
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
    // plan-exempt — measure hover-driven state (React onMouseEnter etc.) without asking the user to hover anything. routing-override: skipped — user asked for a direct fix so the feature works in one click.
    // Browsers deliver enter/leave as pointerover/mouseover with relatedTarget = the element the pointer came from (null from outside the window); frameworks such as React derive onMouseEnter from exactly that,
    // and ignore a mouseover whose relatedTarget is the document body. So the sequence below is replayed faithfully on every distinct element a real pointer could land on.
    async sweepHover(root, opts) {
      const o = Object.assign({ ctrl: { cancelled: false }, dwellMs: 24, maxTargets: 160, onProgress: null }, opts || {});
      if (!root || typeof root.getBoundingClientRect !== 'function') return 0;
      if (!this.isActive()) this.start();
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      // plan-exempt — ps-003 phase 3: let transitions that are still running (an earlier hover, the user's own pointer) finish first, so the rest position we record is a real rest. routing-override: skipped — user asked to build from the plan.
      try {
        const running = root.getAnimations({ subtree: true }).filter((an) => an.transitionProperty === 'transform');
        if (running.length) await Promise.race([Promise.allSettled(running.map((an) => an.finished)), sleep(1500)]);
      } catch (e) { /* getAnimations unavailable: measure anyway */ }
      const savedScroll = { x: window.scrollX, y: window.scrollY };
      let rect = root.getBoundingClientRect();
      if (rect.top < 0 || rect.left < 0 || rect.bottom > window.innerHeight || rect.right > window.innerWidth) {
        root.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        await sleep(80);
        rect = root.getBoundingClientRect();
      }
      const x0 = Math.max(rect.left, 0);
      const x1 = Math.min(rect.right, window.innerWidth);
      const y0 = Math.max(rect.top, 0);
      const y1 = Math.min(rect.bottom, window.innerHeight);
      if (x1 <= x0 || y1 <= y0) return 0;
      // Which element does a real pointer land on, and where? A fine grid of elementFromPoint (no events) answers both, including thin stroke-only hit areas.
      const step = Math.max(5, Math.ceil(Math.sqrt(((x1 - x0) * (y1 - y0)) / 14000)));
      const groups = new Map();
      for (let y = y0 + step / 2; y < y1; y += step) {
        for (let x = x0 + step / 2; x < x1; x += step) {
          const el = document.elementFromPoint(x, y);
          if (!el || !root.contains(el) || (el.closest && el.closest(OWN_UI))) continue;
          let g = groups.get(el);
          if (!g) { g = { el, pts: [], sx: 0, sy: 0 }; groups.set(el, g); }
          g.pts.push([x, y]);
          g.sx += x;
          g.sy += y;
        }
      }
      const targets = Array.from(groups.values()).map((g) => {
        const cx = g.sx / g.pts.length;
        const cy = g.sy / g.pts.length;
        let best = g.pts[0];
        let bd = Infinity;
        g.pts.forEach((p) => { const d = (p[0] - cx) * (p[0] - cx) + (p[1] - cy) * (p[1] - cy); if (d < bd) { bd = d; best = p; } });
        return { el: g.el, x: best[0], y: best[1], n: g.pts.length };
      }).sort((a, b) => b.n - a.n).slice(0, o.maxTargets).sort((a, b) => (a.x - b.x) || (a.y - b.y));
      const make = (type, x, y, related) => {
        const C = type.indexOf('pointer') === 0 ? PointerEvent : MouseEvent;
        return new C(type, { clientX: x, clientY: y, screenX: x, screenY: y, bubbles: true, cancelable: true, composed: true, relatedTarget: related || null, pointerId: 1, pointerType: 'mouse', isPrimary: true });
      };
      let prev = null;
      let settleBudget = 8000; // ms of extra waiting for transitions across the whole sweep
      for (let i = 0; i < targets.length; i++) {
        if (o.ctrl.cancelled) break;
        const t = targets[i];
        toggledSinceMark = new Set();
        pointerActivity.lastX = t.x;
        pointerActivity.lastY = t.y;
        if (prev && prev !== t.el) {
          prev.dispatchEvent(make('pointerout', t.x, t.y, t.el));
          prev.dispatchEvent(make('mouseout', t.x, t.y, t.el));
        }
        if (prev !== t.el) {
          t.el.dispatchEvent(make('pointerover', t.x, t.y, prev));
          t.el.dispatchEvent(make('mouseover', t.x, t.y, prev));
        }
        t.el.dispatchEvent(make('pointermove', t.x, t.y, null));
        t.el.dispatchEvent(make('mousemove', t.x, t.y, null));
        prev = t.el;
        if (o.onProgress) { try { o.onProgress({ stage: 'hover', done: i, total: targets.length }); } catch (e) {} }
        await sleep(o.dwellMs);
        // plan-exempt — ps-003 phase 3: let the layers this hover lifted finish moving, then keep how far each one went. Layers already measured are skipped, so a cumulative stack waits once per new layer, not once per hover.
        if (toggledSinceMark.size && settleBudget > 0) {
          const pending = Array.from(toggledSinceMark).filter((el) => root.contains(el) && !liftDelta.has(el));
          const moving = [];
          pending.forEach((el) => { try { el.getAnimations().forEach((an) => { if (an.transitionProperty === 'transform') moving.push(an); }); } catch (e) {} });
          if (moving.length) {
            const waited = performance.now();
            await Promise.race([Promise.allSettled(moving.map((an) => an.finished)), sleep(1500)]);
            settleBudget -= performance.now() - waited;
          }
          pending.forEach((el) => {
            try {
              const rest = restTransform.get(el) || { x: 0, y: 0 };
              const now = translationOf(el);
              const d = { x: Math.round((now.x - rest.x) * 1000) / 1000, y: Math.round((now.y - rest.y) * 1000) / 1000 };
              if (Math.abs(d.x) > 0.5 || Math.abs(d.y) > 0.5) liftDelta.set(el, d);
            } catch (e) {}
          });
        }
      }
      if (prev) {
        prev.dispatchEvent(make('pointerout', -1, -1, null));
        prev.dispatchEvent(make('mouseout', -1, -1, null));
      }
      // Park the recorded pointer off-screen so the "leave" writes are not attributed to the last hovered element.
      pointerActivity.lastX = -1;
      pointerActivity.lastY = -1;
      await sleep(160);
      if (window.scrollX !== savedScroll.x || window.scrollY !== savedScroll.y) window.scrollTo({ left: savedScroll.x, top: savedScroll.y, behavior: 'instant' });
      return targets.length;
    },

    // plan-exempt — Phase 10 auto-sweep probing across component bounding box to capture peak motion deterministically
    async probeElementRangeOfMotion(targetElement) {
      if (!targetElement || typeof targetElement.getBoundingClientRect !== 'function') return;
      if (!this.isActive()) this.start();

      const rect = targetElement.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return;

      const subTargets = [
        targetElement,
        ...Array.from(targetElement.querySelectorAll('svg, [class*="benefit"], [class*="card"], [class*="figure"], button'))
      ].slice(0, 8);

      const probePoints = [
        { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.5 },
        { x: rect.left + rect.width * 0.2, y: rect.top + rect.height * 0.5 },
        { x: rect.left + rect.width * 0.8, y: rect.top + rect.height * 0.5 },
        { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.25 },
        { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.75 }
      ];

      for (const pt of probePoints) {
        pointerActivity.lastX = pt.x;
        pointerActivity.lastY = pt.y;
        pointerActivity.movesCount++;

        for (const sub of subTargets) {
          try {
            sub.dispatchEvent(new PointerEvent('pointerenter', { clientX: pt.x, clientY: pt.y, bubbles: true }));
            sub.dispatchEvent(new PointerEvent('pointermove', { clientX: pt.x, clientY: pt.y, bubbles: true }));
            sub.dispatchEvent(new MouseEvent('mouseenter', { clientX: pt.x, clientY: pt.y, bubbles: true }));
            sub.dispatchEvent(new MouseEvent('mousemove', { clientX: pt.x, clientY: pt.y, bubbles: true }));
          } catch (e) {}
        }
        await new Promise((r) => setTimeout(r, 40));
      }
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
          // plan-exempt — Phase 12 gate on the recorded peak amplitude, never the end state (a settled rest value hides real motion)
          const maxDelta = Math.max(measureMaxNumericDelta(a.first, afterVal), a.maxDelta || 0);
          // Enforce minimum amplitude gate: reject 0.0004px sub-pixel noise, only accept real geometric morphs >= 3.0px
          if (a.count >= MIN_MOTION_WRITES && (name !== 'd' || maxDelta >= 3.0)) {
            const traj = (a.frames && a.frames.length)
              ? a.frames
              : [{ t: 0, val: a.first }, { t: spanMs, val: afterVal }];
            samples.push({
              elIndex,
              path: relativePath(root, el),
              attribute: name,
              writes: a.count,
              spanMs,
              maxDelta,
              before: clip(a.first),
              after: clip(afterVal),
              beforeFull: a.first,
              afterFull: afterVal,
              trajectory: traj,
              motionType: name === 'd' ? 'svg-path-morph' : (name === 'transform' ? 'transform-tween' : 'attribute-tween')
            });
            // plan-exempt — fix else if branch in motion-sniffer.js
            elSummaries.push(`JS ${name} morph (${a.count} frames over ~${spanMs}ms, delta: ${Math.round(maxDelta)}px)`);
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
      // plan-exempt — ps-003 phase 3: layers that settled somewhere else after a class toggle (measured by sweepHover); also keeps describe() from returning null when the only motion is a CSS-transition lift
      const liftLayers = [];
      allRootElements.forEach((el, elIndex) => { const d = liftDelta.get(el); if (d) liftLayers.push({ elIndex, dx: d.x, dy: d.y }); });
      if (!attributes.length && !interactiveStates.length && !liftLayers.length) return null;

      // plan-exempt — Phase 12 classify motion driver: pointer-driven vs autonomous time-loop
      const allPx = [];
      samples.forEach(s => {
        if (s.trajectory) {
          s.trajectory.forEach(f => {
            if (typeof f.px === 'number') allPx.push(f.px);
          });
        }
      });
      const isPointerX = pointerActivity.movesCount > 4 && allPx.length > 5 && (Math.max(...allPx) - Math.min(...allPx) > 0.15);
      const driver = isPointerX ? 'pointer-x' : 'time-loop';

      // plan-exempt — Phase 12 build a complete spatial state map so hovering reproduces the original motion
      const SPATIAL_BUCKETS = 21;
      let rootRect = null;
      try { rootRect = root.getBoundingClientRect(); } catch (e) {}
      const perElement = {};
      if (rootRect && rootRect.width > 0) {
        samples.forEach((s) => {
          if (s.attribute !== 'd' || !s.trajectory) return;
          let slots = perElement[s.elIndex];
          if (!slots) slots = perElement[s.elIndex] = new Array(SPATIAL_BUCKETS).fill(null);
          s.trajectory.forEach((f) => {
            let px = null;
            if (typeof f.cx === 'number') px = (f.cx - rootRect.left) / rootRect.width;
            else if (typeof f.px === 'number') px = f.px;
            if (px === null || !isFinite(px)) return;
            px = Math.max(0, Math.min(1, px));
            const b = Math.round(px * (SPATIAL_BUCKETS - 1));
            slots[b] = f.val;
          });
        });
      }
      // Fill gaps per element so every bucket has a usable state (forward fill, then backward fill)
      Object.keys(perElement).forEach((k) => {
        const slots = perElement[k];
        let last = null;
        for (let i = 0; i < slots.length; i++) {
          if (slots[i] !== null) last = slots[i];
          else if (last !== null) slots[i] = last;
        }
        last = null;
        for (let i = slots.length - 1; i >= 0; i--) {
          if (slots[i] !== null) last = slots[i];
          else if (last !== null) slots[i] = last;
        }
      });
      const spatialMap = [];
      for (let b = 0; b < SPATIAL_BUCKETS; b++) {
        const states = {};
        let has = false;
        Object.keys(perElement).forEach((elIdx) => {
          const v = perElement[elIdx][b];
          if (v) { states[elIdx] = v; has = true; }
        });
        if (has) spatialMap.push({ px: Math.round((b / (SPATIAL_BUCKETS - 1)) * 1000) / 1000, states });
      }

      // plan-exempt — replay recorded class writes in time order: for each element the real pointer rested on, keep the full set of toggled elements at that moment (a hover can lift a cumulative group, which no per-element rule can express)
      const hoverEvents = [];
      allRootElements.forEach((el, elIndex) => {
        const rec = records.get(el);
        const a = rec && rec.class;
        if (!a || !a.frames) return;
        a.frames.forEach((f) => { if (f.under) hoverEvents.push({ t: f.t, elIndex, val: f.val, first: a.first, under: f.under }); });
      });
      hoverEvents.sort((x, y) => x.t - y.t);
      const toggled = new Set();
      const hoverByUnder = new Map();
      hoverEvents.forEach((ev) => {
        if (ev.val !== ev.first) toggled.add(ev.elIndex); else toggled.delete(ev.elIndex);
        const underIndex = allRootElements.indexOf(ev.under);
        if (underIndex >= 0) hoverByUnder.set(underIndex, Array.from(toggled).sort((p, q) => p - q));
      });
      const hoverMap = Array.from(hoverByUnder, ([underIndex, lifted]) => ({ underIndex, underPath: relativePath(root, allRootElements[underIndex]), lifted }));

      samples.sort((x, y) => y.writes - x.writes);
      const totalWrites = attributes.reduce((s, g) => s + g.writes, 0) + interactiveStates.length;
      return {
        totalWrites,
        attributes,
        driver,
        hoverMap,
        liftLayers,
        // plan-exempt — Phase 12 expose the completed spatial state map to Studio and token exports
        spatialMap,
        samples: samples.slice(0, MAX_SAMPLES),
        morphedPaths: samples.filter(s => s.attribute === 'd'),
        // plan-exempt — fix closing bracket in motion-sniffer.js
        interactiveStates: interactiveStates.slice(0, MAX_SAMPLES),
        annotatedElements
      };
    }
  };
})(window.PageSnap);
