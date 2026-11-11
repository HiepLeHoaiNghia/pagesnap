// plan-exempt — Phase 13 black-box system identification of pointer-driven motion (replaces trace recording)
/**
 * PageSnap motion identification.
 *
 * A recorded trace of one mouse path cannot be replayed faithfully for interactive motion: the page computes
 * DOM = spring(target(pointer)). This module treats the page as a black box instead:
 *   1. drive the component with synthetic pointer events (full enter/leave/move sequence),
 *   2. find the FRAME: the lowest common ancestor of everything that reacted (that is where the page listens),
 *   3. read the SETTLED value of every reacting attribute at many frame positions -> a target table,
 *      refining where the curve bends (piecewise-linear targets are common),
 *   4. step the pointer once and fit a 2nd-order spring to the transient,
 *   5. check path dependence, the vertical axis, outside behaviour and a hold-out error so the result carries an honest score.
 * createPlayer() replays the model as per-number springs chasing table-interpolated targets.
 */
(function (PageSnap) {
  'use strict';

  const WATCH = ['d', 'points', 'transform', 'style', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
    'width', 'height', 'opacity', 'stroke-dashoffset', 'stroke-width', 'fill-opacity', 'stroke-opacity', 'class'];
  const OWN_UI = '#pagesnap-component-studio-modal, #pagesnap-inspector-overlay, #pagesnap-region-actions-bar, #pagesnap-toast, #web2md-toast, #pagesnap-analyze-pill';
  const PATH_DECLINE_PCT = 4;     // plan-exempt — spread above this means history matters; springs measure ~1.5%
  const HOLDOUT_DECLINE_PCT = 12; // plan-exempt — a model this wrong at unseen positions is not worth exporting
  const VARY_EPS = 0.05;       // a number must move by more than this to count as animated
  const SETTLE_EPS = 0.05;     // max per-frame change that still counts as "settled"
  const SETTLE_QUIET_MS = 100;
  const SETTLE_MAX_MS = 3000;
  const MIN_GAP = 0.012;       // never bisect below this fraction of the frame
  const KINK_STOP = 0.004;     // stop refining when the worst bend is below this fraction of the swing
  const DEADLINE_MS = 120000;

  const models = new WeakMap();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

  function tokenize(str) {
    const re = /-?\d*\.?\d+/g;
    const parts = [];
    const raw = [];
    const nums = [];
    let last = 0;
    let m;
    while ((m = re.exec(str)) !== null) {
      parts.push(str.slice(last, m.index));
      raw.push(m[0]);
      nums.push(parseFloat(m[0]));
      last = re.lastIndex;
    }
    parts.push(str.slice(last));
    return { parts, raw, nums };
  }

  // ─── Synthetic pointer: emits the same sequence a real mouse does, including leave/enter ───────────────
  function makePointer() {
    let current = null;
    const init = (x, y, related, extra) => Object.assign({
      clientX: x, clientY: y, screenX: x, screenY: y, bubbles: true, cancelable: true, composed: true,
      relatedTarget: related || null, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 0
    }, extra || {});
    const make = (type, x, y, related, extra) => {
      const C = type.indexOf('pointer') === 0 ? PointerEvent : MouseEvent;
      try { return new C(type, Object.assign(init(x, y, related, extra), { view: window })); }
      catch (e) { return new C(type, init(x, y, related, extra)); }
    };
    const chain = (el) => { const a = []; for (let n = el; n; n = n.parentElement) a.push(n); return a; };

    function moveTo(x, y) {
      let target = document.elementFromPoint(x, y) || document.body;
      if (target.closest && target.closest(OWN_UI)) target = document.body;
      if (target !== current) {
        const prev = current;
        if (prev) {
          prev.dispatchEvent(make('pointerout', x, y, target));
          prev.dispatchEvent(make('mouseout', x, y, target));
          const next = new Set(chain(target));
          chain(prev).forEach((n) => {
            if (next.has(n)) return;
            n.dispatchEvent(make('pointerleave', x, y, target, { bubbles: false }));
            n.dispatchEvent(make('mouseleave', x, y, target, { bubbles: false }));
          });
        }
        target.dispatchEvent(make('pointerover', x, y, prev));
        target.dispatchEvent(make('mouseover', x, y, prev));
        const had = new Set(prev ? chain(prev) : []);
        chain(target).reverse().forEach((n) => {
          if (had.has(n)) return;
          n.dispatchEvent(make('pointerenter', x, y, prev, { bubbles: false }));
          n.dispatchEvent(make('mouseenter', x, y, prev, { bubbles: false }));
        });
        current = target;
      }
      target.dispatchEvent(make('pointermove', x, y, null));
      target.dispatchEvent(make('mousemove', x, y, null));
    }
    return { moveTo };
  }

  // ─── Discovery: which attributes react to the pointer at all ───────────────────────────────────────────
  async function discoverTracked(root, pointer, geom) {
    const seen = new Map();
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        const el = m.target;
        if (!el || !el.closest || el.closest(OWN_UI)) continue;
        let attrs = seen.get(el);
        if (!attrs) { attrs = new Map(); seen.set(el, attrs); }
        attrs.set(m.attributeName, (attrs.get(m.attributeName) || 0) + 1);
      }
    });
    mo.observe(root, { subtree: true, attributes: true, attributeFilter: WATCH });
    pointer.moveTo(geom.outX, geom.outY);
    await sleep(120);
    const us = [0.08, 0.25, 0.42, 0.58, 0.75, 0.92, 0.5];
    for (const u of us) {
      pointer.moveTo(geom.x(u), geom.y(0.5));
      await sleep(170);
    }
    pointer.moveTo(geom.outX, geom.outY);
    await sleep(250);
    mo.disconnect();
    const all = [root, ...Array.from(root.querySelectorAll('*'))];
    const tracked = [];
    seen.forEach((attrs, el) => {
      attrs.forEach((count, attr) => {
        if (count >= 3 || (attr === 'class' && count >= 1)) tracked.push({ el, attr, elIndex: all.indexOf(el) });
      });
    });
    return { tracked: tracked.filter((t) => t.elIndex >= 0), all };
  }

  function lowestCommonAncestor(els, root) {
    if (!els.length) return root;
    const chainOf = (n) => { const a = []; for (; n; n = n.parentElement) a.push(n); return a; };
    let common = chainOf(els[0]);
    for (let i = 1; i < els.length; i++) {
      const set = new Set(chainOf(els[i]));
      common = common.filter((n) => set.has(n));
    }
    const lca = common[0] || root;
    return root.contains(lca) ? lca : root;
  }

  const readValues = (tracked) => tracked.map((t) => t.el.getAttribute(t.attr) || '');

  function numericVec(vals, numericIdx) {
    const out = [];
    numericIdx.forEach((i) => {
      const nums = tokenize(vals[i]).nums;
      for (let k = 0; k < nums.length; k++) out.push(nums[k]);
    });
    return out;
  }

  async function waitSettled(readVec) {
    const t0 = performance.now();
    let lastMove = t0;
    let prev = readVec();
    for (;;) {
      await sleep(16);
      const cur = readVec();
      let d = 0;
      const n = Math.min(cur.length, prev.length);
      for (let i = 0; i < n; i++) { const x = Math.abs(cur[i] - prev[i]); if (x > d) d = x; }
      prev = cur;
      const now = performance.now();
      if (d > SETTLE_EPS) lastMove = now;
      if (now - lastMove >= SETTLE_QUIET_MS) return { ms: now - t0, timedOut: false };
      if (now - t0 >= SETTLE_MAX_MS) return { ms: now - t0, timedOut: true };
    }
  }

  // ─── Assemble series from measurements ─────────────────────────────────────────────────────────────────
  function assemble(tracked, restVals, measurements) {
    const series = [];
    const discrete = [];
    const numericIdx = [];
    tracked.forEach((t, i) => {
      const T = tokenize(restVals[i]);
      const allVals = measurements.map((m) => m.vals[i]);
      const sameStructure = T.nums.length > 0 && t.attr !== 'class' && allVals.every((v) => {
        const k = tokenize(v);
        if (k.nums.length !== T.nums.length) return false;
        for (let p = 0; p < k.parts.length; p++) if (k.parts[p] !== T.parts[p]) return false;
        return true;
      });
      if (!sameStructure) {
        if (new Set(allVals.concat([restVals[i]])).size > 1) {
          // plan-exempt — ps-001 Phase 13: rest ("none") and measured values differ in shape, but the measured values
          // themselves usually share one shape (e.g. perspective() rotateY() rotateX()); keep them interpolable.
          const first = tokenize(allVals[0]);
          const uniform = t.attr !== 'class' && first.nums.length > 0 && allVals.every((v) => {
            const k = tokenize(v);
            if (k.nums.length !== first.nums.length) return false;
            for (let p = 0; p < k.parts.length; p++) if (k.parts[p] !== first.parts[p]) return false;
            return true;
          });
          discrete.push({
            elIndex: t.elIndex, attr: t.attr, rest: restVals[i], table: allVals, trackedIndex: i,
            interp: uniform ? { parts: first.parts, nums: allVals.map((v) => tokenize(v).nums) } : null
          });
        }
        return;
      }
      const mat = allVals.map((v) => tokenize(v).nums);
      const vary = [];
      for (let k = 0; k < T.nums.length; k++) {
        let lo = T.nums[k];
        let hi = T.nums[k];
        mat.forEach((row) => { if (row[k] < lo) lo = row[k]; if (row[k] > hi) hi = row[k]; });
        if (hi - lo > VARY_EPS) vary.push(k);
      }
      if (!vary.length) return;
      numericIdx.push(i);
      series.push({
        elIndex: t.elIndex, attr: t.attr, parts: T.parts, raw: T.raw, vary,
        rest: vary.map((k) => T.nums[k]),
        table: mat.map((row) => vary.map((k) => row[k])),
        trackedIndex: i
      });
    });
    return { series, discrete, numericIdx };
  }

  function predictRow(positions, table, u) {
    const n = positions.length;
    if (u <= positions[0]) return table[0].slice();
    if (u >= positions[n - 1]) return table[n - 1].slice();
    let i = 0;
    while (i < n - 2 && positions[i + 1] < u) i++;
    const a = (u - positions[i]) / (positions[i + 1] - positions[i]);
    return table[i].map((v, k) => v * (1 - a) + table[i + 1][k] * a);
  }

  function globalRange(series) {
    let r = 0;
    series.forEach((s) => {
      s.vary.forEach((_, k) => {
        let lo = s.rest[k];
        let hi = s.rest[k];
        s.table.forEach((row) => { if (row[k] < lo) lo = row[k]; if (row[k] > hi) hi = row[k]; });
        if (hi - lo > r) r = hi - lo;
      });
    });
    return r || 1;
  }

  // ─── Spring maths ──────────────────────────────────────────────────────────────────────────────────────
  function springStep(z, wn, t) {
    if (t <= 0) return 0;
    if (z < 1) {
      const wd = wn * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * wn * t) * (Math.cos(wd * t) + (z * wn / wd) * Math.sin(wd * t));
    }
    if (Math.abs(z - 1) < 1e-9) return 1 - Math.exp(-wn * t) * (1 + wn * t);
    const s = wn * Math.sqrt(z * z - 1);
    const r1 = -z * wn + s;
    const r2 = -z * wn - s;
    return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
  }

  function fitSpring(samples, from, to) {
    const span = to - from;
    if (Math.abs(span) < 1e-6 || samples.length < 8) return null;
    const cost = (z, wn, d) => {
      let e = 0;
      for (let i = 0; i < samples.length; i++) {
        const r = samples[i][1] - (from + span * springStep(z, wn, (samples[i][0] - d) / 1000));
        e += r * r;
      }
      return e;
    };
    let best = null;
    for (let wn = 3; wn <= 40; wn += 0.5) {
      for (let z = 0.3; z <= 3.0001; z += 0.05) {
        for (let d = 0; d <= 100; d += 4) {
          const e = cost(z, wn, d);
          if (!best || e < best.e) best = { e, z, wn, d };
        }
      }
    }
    // local refinement around the coarse optimum
    for (let pass = 0; pass < 2; pass++) {
      const sz = pass === 0 ? 0.01 : 0.002;
      const sw = pass === 0 ? 0.1 : 0.02;
      const sd = pass === 0 ? 1 : 0.25;
      const c = { z: best.z, wn: best.wn, d: best.d };
      for (let iz = -5; iz <= 5; iz++) {
        for (let iw = -5; iw <= 5; iw++) {
          for (let id = -4; id <= 4; id++) {
            const z = c.z + iz * sz;
            const wn = c.wn + iw * sw;
            const d = Math.max(0, c.d + id * sd);
            if (z <= 0.05 || wn <= 1) continue;
            const e = cost(z, wn, d);
            if (e < best.e) best = { e, z, wn, d };
          }
        }
      }
    }
    const rms = Math.sqrt(best.e / samples.length);
    return {
      zeta: Math.round(best.z * 1000) / 1000,
      omegaN: Math.round(best.wn * 1000) / 1000,
      latencyMs: Math.round(best.d * 10) / 10,
      rmsPct: Math.round((rms / Math.abs(span)) * 10000) / 100,
      stiffness: Math.round(best.wn * best.wn * 10) / 10,
      damping: Math.round(2 * best.z * best.wn * 10) / 10,
      mass: 1
    };
  }

  // ─── Public: identify ──────────────────────────────────────────────────────────────────────────────────
  async function identify(root, opts) {
    const o = Object.assign({ coarse: 9, refineBudget: 20, holdout: 4, onProgress: null, ctrl: { cancelled: false } }, opts || {});
    const t0 = performance.now();
    const say = (stage, done, total) => { if (o.onProgress) { try { o.onProgress({ stage, done, total }); } catch (e) {} } };
    const check = () => {
      if (o.ctrl.cancelled) throw new Error('cancelled');
      if (performance.now() - t0 > DEADLINE_MS) throw new Error('deadline');
    };
    const savedScroll = { x: window.scrollX, y: window.scrollY };
    const pointer = makePointer();
    let restoreVec = null;

    try {
      root.scrollIntoView({ block: 'center', inline: 'center' });
      await sleep(80);
      const rrect = root.getBoundingClientRect();
      if (rrect.width < 4 || rrect.height < 4) return { supported: false, reason: 'component has no visible area' };
      const cx = (x) => Math.max(1, Math.min(window.innerWidth - 2, x));
      const cy = (y) => Math.max(1, Math.min(window.innerHeight - 2, y));
      const rootGeom = {
        x: (u) => cx(rrect.left + u * rrect.width),
        y: (v) => cy(rrect.top + v * rrect.height),
        outX: rrect.left > 40 ? rrect.left - 30 : cx(rrect.right + 30),
        outY: cy(rrect.top + rrect.height * 0.5)
      };

      say('discover', 0, 1);
      const disc = await discoverTracked(root, pointer, rootGeom);
      check();
      const tracked = disc.tracked;
      if (!tracked.length) {
        return { supported: false, reason: 'pointer produced no DOM attribute changes (canvas/WebGL, CSS-only :hover, scroll- or time-driven)', durationMs: Math.round(performance.now() - t0) };
      }

      // FRAME = lowest common ancestor of everything that reacted
      let frameEl = lowestCommonAncestor(tracked.map((t) => t.el), root);
      let frect = frameEl.getBoundingClientRect();
      if (frect.width < 8 || frect.height < 8) { frameEl = root; frect = rrect; }
      const frameElIndex = disc.all.indexOf(frameEl);
      const geom = {
        x: (u) => cx(frect.left + u * frect.width),
        y: (v) => cy(frect.top + v * frect.height)
      };

      const allIdx = tracked.map((_, i) => i);
      const readVec = () => numericVec(readValues(tracked), allIdx);
      restoreVec = readVec;

      pointer.moveTo(rootGeom.outX, rootGeom.outY);
      const restWait = await waitSettled(readVec);
      if (restWait.timedOut) {
        return { supported: false, reason: 'the component never settles at rest (autonomous or continuous animation), so a pointer response cannot be isolated', durationMs: Math.round(performance.now() - t0) };
      }
      const restVals = readValues(tracked);

      const measurements = [];
      let settleTimeouts = 0;
      let waitMs = null;
      const measure = async (u, v) => {
        pointer.moveTo(geom.x(u), geom.y(v === undefined ? 0.5 : v));
        if (waitMs) { await sleep(waitMs); } else {
          await sleep(30);
          const w = await waitSettled(readVec);
          if (w.timedOut) settleTimeouts++;
        }
        return readValues(tracked);
      };
      const insert = (u, vals) => { measurements.push({ u, vals }); measurements.sort((a, b) => a.u - b.u); };

      // coarse sweep inside the frame
      const N = o.coarse;
      for (let i = 0; i < N; i++) {
        check();
        const u = 0.03 + (0.94 * i) / (N - 1);
        say('coarse', i, N);
        insert(u, await measure(u, 0.5));
        if (settleTimeouts >= 2) {
          return { supported: false, reason: 'values keep changing while the pointer is held still (time-driven or physics animation)', trackedCount: tracked.length, durationMs: Math.round(performance.now() - t0) };
        }
      }
      let asm = assemble(tracked, restVals, measurements);
      if (!asm.series.length && !asm.discrete.length) {
        return { supported: false, reason: 'attributes changed during hover but the settled values do not depend on pointer position', trackedCount: tracked.length, durationMs: Math.round(performance.now() - t0) };
      }
      const vecOf = (vals) => numericVec(vals, asm.numericIdx);

      // spring fit from one pointer step between the two positions with the largest swing
      say('spring', 0, 1);
      let pick = null;
      asm.series.forEach((s) => {
        s.vary.forEach((_, k) => {
          for (let a = 0; a < s.table.length; a++) {
            for (let b = a + 1; b < s.table.length; b++) {
              const sw = Math.abs(s.table[a][k] - s.table[b][k]);
              if (!pick || sw > pick.sw) pick = { s, k, a, b, sw };
            }
          }
        });
      });
      let spring = null;
      if (pick) {
        const posNow = measurements.map((m) => m.u);
        const num = pick.s.vary[pick.k];
        const t = tracked[pick.s.trackedIndex];
        const sample = () => tokenize(t.el.getAttribute(t.attr) || '').nums[num];
        await measure(posNow[pick.a], 0.5);
        const from = sample();
        const samples = [];
        pointer.moveTo(geom.x(posNow[pick.b]), geom.y(0.5));
        const stepStart = performance.now();
        while (performance.now() - stepStart < 1800) {
          samples.push([performance.now() - stepStart, sample()]);
          await nextFrame();
        }
        spring = fitSpring(samples, from, samples[samples.length - 1][1]);
      }
      check();
      if (spring) waitMs = Math.min(SETTLE_MAX_MS, Math.round((5.5 / (spring.zeta * spring.omegaN)) * 1000 + spring.latencyMs + 50));

      // curvature-driven refinement: spend measurements where the target bends
      let rng = globalRange(asm.series);
      let budget = o.refineBudget;
      while (budget > 0) {
        check();
        const U = measurements.map((m) => m.u);
        const V = measurements.map((m) => vecOf(m.vals));
        let best = null;
        for (let i = 1; i < U.length - 1; i++) {
          const gl = U[i] - U[i - 1];
          const gr = U[i + 1] - U[i];
          if (Math.max(gl, gr) < MIN_GAP * 2) continue;
          let sc = 0;
          for (let k = 0; k < V[i].length; k++) {
            const d = Math.abs((V[i + 1][k] - V[i][k]) / gr - (V[i][k] - V[i - 1][k]) / gl) * Math.min(gl, gr);
            if (d > sc) sc = d;
          }
          if (!best || sc > best.sc) best = { sc, gap: gl >= gr ? i - 1 : i };
        }
        if (!best || best.sc / rng < KINK_STOP) break;
        const um = (U[best.gap] + U[best.gap + 1]) / 2;
        say('refine', o.refineBudget - budget, o.refineBudget);
        insert(um, await measure(um, 0.5));
        budget--;
      }

      asm = assemble(tracked, restVals, measurements);
      let drng = 0;
      asm.discrete.forEach((d) => {
        if (!d.interp) return;
        for (let k = 0; k < d.interp.nums[0].length; k++) {
          let lo = Infinity;
          let hi = -Infinity;
          d.interp.nums.forEach((row) => { if (row[k] < lo) lo = row[k]; if (row[k] > hi) hi = row[k]; });
          if (hi - lo > drng) drng = hi - lo;
        }
      });
      rng = Math.max(asm.series.length ? globalRange(asm.series) : 0, drng) || 1;
      const positions = measurements.map((m) => m.u);
      const vecOf2 = (vals) => numericVec(vals, asm.numericIdx);
      // numbers of discrete items whose measured values are interpolable take part in every vector comparison below
      const discNums = (vals) => {
        const out = [];
        asm.discrete.forEach((d) => { if (d.interp) tokenize(vals[d.trackedIndex]).nums.forEach((n) => out.push(n)); });
        return out;
      };
      const fullVec = (vals) => vecOf2(vals).concat(discNums(vals));

      // path dependence: arrive at the middle from the far left and from the far right
      say('path', 0, 1);
      await measure(0.04, 0.5);
      const fromLeft = fullVec(await measure(0.5, 0.5));
      await measure(0.96, 0.5);
      const fromRight = fullVec(await measure(0.5, 0.5));
      // plan-exempt — ps-001 Phase 13: a symmetric out-and-back probe cannot expose an integrator (position += k * delta
      // returns to the same value), so also reach the middle by leaving the component after a detour and re-entering
      // directly: a pure function of pointer position gives the same answer, a stateful one does not.
      const leaveAndEnter = async (via) => {
        await measure(via, 0.5);
        pointer.moveTo(rootGeom.outX, rootGeom.outY);
        await sleep(waitMs || 120);
        return fullVec(await measure(0.5, 0.5));
      };
      const viaLeft = await leaveAndEnter(0.04);
      const viaRight = await leaveAndEnter(0.96);
      let pathDiff = 0;
      [fromRight, viaLeft, viaRight].forEach((other) => {
        for (let k = 0; k < fromLeft.length; k++) pathDiff = Math.max(pathDiff, Math.abs(fromLeft[k] - other[k]));
      });
      const pathDependencePct = Math.round((pathDiff / rng) * 10000) / 100;

      // vertical axis, measured inside the frame only
      const upper = fullVec(await measure(0.5, 0.25));
      const lower = fullVec(await measure(0.5, 0.75));
      let yDiff = 0;
      for (let k = 0; k < upper.length; k++) yDiff = Math.max(yDiff, Math.abs(upper[k] - lower[k]));
      const axisYPct = Math.round((yDiff / rng) * 10000) / 100;

      // outside behaviour: a point beside the frame but still inside the component
      let outside = 'rest';
      const probes = [[-0.12, 0.5], [1.12, 0.5], [0.5, -0.12], [0.5, 1.12]].filter(([u, v]) => {
        const x = frect.left + u * frect.width;
        const y = frect.top + v * frect.height;
        return x > rrect.left + 2 && x < rrect.right - 2 && y > rrect.top + 2 && y < rrect.bottom - 2
          && x > 1 && x < window.innerWidth - 2 && y > 1 && y < window.innerHeight - 2;
      });
      if (probes.length) {
        say('outside', 0, probes.length);
        const restVec = numericVec(restVals, asm.numericIdx);
        let off = 0;
        for (const [u, v] of probes) {
          await measure(0.5, 0.5);
          const pv = await measure(u, v);
          const vec = vecOf2(pv);
          let d = 0;
          for (let k = 0; k < vec.length; k++) d = Math.max(d, Math.abs(vec[k] - restVec[k]));
          if (d / rng > 0.02 || asm.discrete.some((dd) => pv[dd.trackedIndex] !== dd.rest)) off++;
        }
        outside = off > 0 ? 'hold' : 'rest';
      }

      // hold-out accuracy: positions that were never measured
      const holdU = [0.137, 0.402, 0.611, 0.853].slice(0, o.holdout);
      let maxErr = 0;
      let sumErr = 0;
      let cnt = 0;
      for (let h = 0; h < holdU.length; h++) {
        check();
        say('holdout', h, holdU.length);
        const vals = await measure(holdU[h], 0.5);
        asm.series.forEach((s) => {
          const nums = tokenize(vals[s.trackedIndex]).nums;
          const pred = predictRow(positions, s.table, holdU[h]);
          s.vary.forEach((num, k) => {
            const e = Math.abs(nums[num] - pred[k]) / rng;
            if (e > maxErr) maxErr = e;
            sumErr += e;
            cnt++;
          });
        });
        asm.discrete.forEach((dd) => {
          if (!dd.interp) return;
          const nums = tokenize(vals[dd.trackedIndex]).nums;
          const pred = predictRow(positions, dd.interp.nums, holdU[h]);
          for (let k = 0; k < nums.length; k++) {
            const e = Math.abs(nums[k] - pred[k]) / rng;
            if (e > maxErr) maxErr = e;
            sumErr += e;
            cnt++;
          }
        });
      }

      // plan-exempt — ps-001 Phase 13: an honest tool declines instead of shipping a replay that cannot match
      if (pathDependencePct >= PATH_DECLINE_PCT) {
        return { supported: false, reason: `the response depends on pointer history, not only on position (${pathDependencePct}% spread when the same point is reached by different routes): stateful or non-deterministic`, trackedCount: tracked.length, pathDependencePct, durationMs: Math.round(performance.now() - t0) };
      }
      if (maxErr * 100 > HOLDOUT_DECLINE_PCT) {
        return { supported: false, reason: `unmeasured positions are not predictable from the measured ones (worst hold-out error ${Math.round(maxErr * 10000) / 100}% of the range): not a smooth function of pointer position`, trackedCount: tracked.length, durationMs: Math.round(performance.now() - t0) };
      }

      const model = {
        version: 2,
        kind: 'pointer-xy-frame',
        frameElIndex: frameElIndex < 0 ? 0 : frameElIndex,
        outside,
        positions,
        series: asm.series.map((s) => ({ elIndex: s.elIndex, attr: s.attr, parts: s.parts, raw: s.raw, vary: s.vary, rest: s.rest, table: s.table })),
        discrete: asm.discrete,
        spring: spring || null,
        stateless: pathDependencePct < 1.5,
        pathDependencePct,
        axisYPct,
        selfCheck: {
          holdoutPoints: holdU.length,
          maxErrPct: Math.round(maxErr * 10000) / 100,
          meanErrPct: Math.round((cnt ? (sumErr / cnt) : 0) * 10000) / 100
        },
        measuredPositions: positions.length,
        trackedAttributes: tracked.length,
        frame: { width: Math.round(frect.width * 10) / 10, height: Math.round(frect.height * 10) / 10 },
        durationMs: Math.round(performance.now() - t0)
      };
      model.supported = true;
      model.quality = (!model.stateless || model.axisYPct > 3) ? 'partial'
        : (model.selfCheck.maxErrPct <= 3 && spring && spring.rmsPct <= 8) ? 'high'
        : (model.selfCheck.maxErrPct <= 8) ? 'medium' : 'partial';
      models.set(root, model);
      say('done', 1, 1);
      return model;
    } finally {
      // leave the page exactly as found: pointer outside, springs settled, scroll restored
      try {
        const r2 = root.getBoundingClientRect();
        pointer.moveTo(r2.left > 40 ? r2.left - 30 : Math.min(window.innerWidth - 2, r2.right + 30), Math.max(1, Math.min(window.innerHeight - 2, r2.top + r2.height / 2)));
        if (restoreVec) await waitSettled(restoreVec);
      } catch (e) {}
      window.scrollTo(savedScroll.x, savedScroll.y);
    }
  }

  // ─── Player: springs chasing table-interpolated targets (self-contained so it can be serialised) ───────
  function createPlayer(model, resolveEl) {
    const fmt = (v) => String(Math.round(v * 1000) / 1000);
    const k2 = model.spring ? model.spring.omegaN * model.spring.omegaN : 100;
    const c = model.spring ? 2 * model.spring.zeta * model.spring.omegaN : 18;
    const items = model.series.map((s) => {
      const el = resolveEl(s.elIndex);
      return el ? { s, el, x: s.rest.slice(), v: s.rest.map(() => 0), t: s.rest.slice() } : null;
    }).filter(Boolean);
    const discreteItems = (model.discrete || []).map((d) => {
      const el = resolveEl(d.elIndex);
      return el ? { d, el } : null;
    }).filter(Boolean);
    let raf = 0;
    let last = 0;
    let active = false;

    function interp(table, u) {
      const pos = model.positions;
      const n = pos.length;
      if (u <= pos[0]) return table[0];
      if (u >= pos[n - 1]) return table[n - 1];
      let i = 0;
      while (i < n - 2 && pos[i + 1] < u) i++;
      const a = (u - pos[i]) / (pos[i + 1] - pos[i]);
      return table[i].map((val, k) => val * (1 - a) + table[i + 1][k] * a);
    }
    function write(it) {
      const s = it.s;
      const out = s.raw.slice();
      for (let k = 0; k < s.vary.length; k++) out[s.vary[k]] = fmt(it.x[k]);
      let str = '';
      for (let i = 0; i < out.length; i++) str += s.parts[i] + out[i];
      str += s.parts[out.length];
      it.el.setAttribute(s.attr, str);
    }
    // u, v are fractions of the model frame; null = pointer left the component
    function setPointer(u, v) {
      let rest = u === null || u === undefined;
      if (!rest && model.outside === 'rest' && (u < 0 || u > 1 || (v !== undefined && (v < 0 || v > 1)))) rest = true;
      items.forEach((it) => { it.t = rest ? it.s.rest.slice() : interp(it.s.table, u).slice(); });
      discreteItems.forEach((di) => {
        let val = di.d.rest;
        if (!rest) {
          if (di.d.interp) {
            const nums = interp(di.d.interp.nums, u);
            val = '';
            for (let i = 0; i < nums.length; i++) val += di.d.interp.parts[i] + fmt(nums[i]);
            val += di.d.interp.parts[nums.length];
          } else {
            let bi = 0;
            let bd = Infinity;
            model.positions.forEach((p, i) => { const dd = Math.abs(p - u); if (dd < bd) { bd = dd; bi = i; } });
            val = di.d.table[bi];
          }
        }
        setDiscrete(di.el, di.d.attr, val);
      });
      if (!active) { active = true; last = performance.now(); raf = requestAnimationFrame(tick); }
    }
    function tick(now) {
      let dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let moving = false;
      const sub = 1 / 240;
      while (dt > 0) {
        const h = Math.min(sub, dt);
        dt -= h;
        items.forEach((it) => {
          for (let k = 0; k < it.x.length; k++) {
            const a = -k2 * (it.x[k] - it.t[k]) - c * it.v[k];
            it.v[k] += a * h;
            it.x[k] += it.v[k] * h;
          }
        });
      }
      items.forEach((it) => {
        for (let k = 0; k < it.x.length; k++) {
          if (Math.abs(it.x[k] - it.t[k]) > 0.01 || Math.abs(it.v[k]) > 0.01) moving = true;
        }
        write(it);
      });
      if (moving) raf = requestAnimationFrame(tick);
      else { active = false; items.forEach((it) => { it.x = it.t.slice(); it.v = it.v.map(() => 0); write(it); }); }
    }
    function reset() {
      cancelAnimationFrame(raf);
      active = false;
      items.forEach((it) => { it.x = it.s.rest.slice(); it.v = it.v.map(() => 0); write(it); });
      discreteItems.forEach((di) => setDiscrete(di.el, di.d.attr, di.d.rest));
    }
    // plan-exempt — a measured `class` value comes from the live page and knows nothing about the scoping classes (ps-el-N) that an export adds to tie CSS to elements; writing it verbatim deleted those classes and silently disabled every rule on the element (the bottom stack plate stopped lifting). routing-override: skipped — user asked for a direct fix after the export lost two lift layers.
    // Defined inside createPlayer on purpose: buildPlayerScript serialises createPlayer.toString().
    function setDiscrete(el, attr, val) {
      if (attr === 'class') {
        const keep = Array.prototype.filter.call(el.classList, (c) => /^ps-el-\d+$/.test(c));
        el.setAttribute('class', [val].concat(keep).join(' '));
      } else {
        el.setAttribute(attr, val);
      }
    }
    return { setPointer, reset, itemCount: items.length };
  }

  function buildPlayerScript(model) {
    return '(function(){\n' +
      'var createPlayer = ' + createPlayer.toString() + ';\n' +
      'var model = ' + JSON.stringify(model) + ';\n' +
      'var root = document.querySelector(".ps-el-0") || document.querySelector(".pagesnap-component-wrapper");\n' +
      'if (!root) return;\n' +
      'var all = [root].concat(Array.prototype.slice.call(root.querySelectorAll("*")));\n' +
      'var frame = all[model.frameElIndex] || root;\n' +
      'var player = createPlayer(model, function (i) { return all[i] || null; });\n' +
      'root.addEventListener("mousemove", function (e) { var r = frame.getBoundingClientRect(); player.setPointer((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); });\n' +
      'root.addEventListener("mouseleave", function () { player.setPointer(null); });\n' +
      '})();\n';
  }

  function describeModel(model) {
    if (!model || !model.supported) return '';
    const lines = [];
    lines.push('### Identified pointer system (black-box, measured)');
    lines.push(`- **Model:** each animated number is a spring chasing a target that depends only on the pointer position inside the frame element (${model.frame.width}×${model.frame.height}px, \`.ps-el-${model.frameElIndex}\`). Leaving the component returns every number to its rest value${model.outside === 'rest' ? '; moving outside the frame but inside the component also returns to rest' : '; moving beside the frame keeps the last edge value'}.`);
    if (model.spring) {
      lines.push(`- **Spring (fitted):** stiffness ${model.spring.stiffness}, damping ${model.spring.damping}, mass 1 (ζ=${model.spring.zeta}, ωn=${model.spring.omegaN} rad/s, input latency ≈${model.spring.latencyMs} ms, fit error ${model.spring.rmsPct}% of the step). Framer Motion: \`useSpring(target, { stiffness: ${model.spring.stiffness}, damping: ${model.spring.damping}, mass: 1 })\`.`);
    }
    lines.push(`- **Quality:** \`${model.quality}\` — hold-out max error ${model.selfCheck.maxErrPct}% / mean ${model.selfCheck.meanErrPct}% of the largest swing (${model.selfCheck.holdoutPoints} unseen positions); ${model.measuredPositions} measured positions; stateless=${model.stateless} (path dependence ${model.pathDependencePct}%); vertical influence ${model.axisYPct}%.`);
    lines.push(`- **Animated numbers:** ${model.series.length} attribute value(s) across ${new Set(model.series.map((s) => s.elIndex)).size} element(s); full target tables are in \`tokens.json\` → \`motionModel\`.`);
    const swing = (s) => Math.max.apply(null, s.vary.map((_, k) => Math.max.apply(null, s.table.map((r) => r[k])) - Math.min.apply(null, s.table.map((r) => r[k]))));
    const top = model.series.slice().sort((a, b) => swing(b) - swing(a))[0];
    if (top) {
      lines.push(`- **Example target curve** (\`.ps-el-${top.elIndex}\`, \`${top.attr}\`, number #${top.vary[0]}): ` + model.positions.map((p, i) => `${p.toFixed(2)}→${top.table[i][0].toFixed(1)}`).join(', ') + `; rest ${top.rest[0].toFixed(1)}.`);
    }
    if (!model.stateless || model.axisYPct > 3) {
      lines.push('- **Limit:** this component also depends on history or the vertical axis; the model reproduces the horizontal, stateless part only.');
    }
    return lines.join('\n');
  }

  // plan-exempt — one entry point for every export action, so users never have to know that hover state needs a sweep and pointer springs need "Analyze". routing-override: skipped — user asked for a direct fix to make the feature usable in one click.
  // 1) replay hover over everything under the component (measures React/JS hover state), 2) if the motion follows the pointer, measure it as springs (cached per element). Skip falls back to the quick capture.
  async function captureMotion(root, opts) {
    const o = Object.assign({ analyze: true, ctrl: null, quiet: false }, opts || {});
    const ctrl = o.ctrl || { cancelled: false };
    const sniffer = PageSnap.motionSniffer;
    if (!root || !sniffer || typeof sniffer.sweepHover !== 'function') return null;
    let pill = null;
    let label = null;
    let main = null;
    let note = null;
    if (!o.quiet) {
      pill = document.createElement('div');
      pill.id = 'pagesnap-analyze-pill';
      pill.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#0b1220;border:1px solid #14b8a6;color:#e5e7eb;border-radius:9999px;padding:8px 16px;font:600 12px system-ui,sans-serif;display:flex;gap:12px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,.6)';
      label = document.createElement('span');
      main = document.createElement('span');
      note = document.createElement('span');
      note.style.cssText = 'color:#9ca3af;font-weight:500;margin-left:10px';
      label.appendChild(main);
      label.appendChild(note);
      const skip = document.createElement('button');
      skip.textContent = 'Skip';
      skip.style.cssText = 'background:#1f2937;border:1px solid #374151;color:#fff;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:11px';
      skip.onclick = () => { ctrl.cancelled = true; };
      pill.appendChild(label);
      pill.appendChild(skip);
      document.body.appendChild(pill);
    }
    // plan-exempt — ps-002 build: one overall percentage (hover sweep 0-30, spring fit 30-100) with a short hint, as approved at G2 W-1. routing-override: skipped — user asked to build from the plan.
    // plan-exempt — layered review finding: the percentage never goes down, and every stage identify reports has a range (outside was missing). routing-override: skipped — user asked to fix review findings.
    let shown = 0;
    const say = (percent, hint) => {
      shown = Math.max(shown, percent);
      if (main) main.textContent = `🎯 Measuring motion… ${Math.round(shown)}%`;
      if (note) note.textContent = hint;
    };
    const STAGE_RANGE = { discover: [30, 35], coarse: [35, 60], spring: [60, 70], refine: [70, 85], path: [85, 92], outside: [92, 94], holdout: [94, 99], done: [99, 100] };
    try {
      say(0, 'hover sweep, then spring fit · about 40 s');
      await sniffer.sweepHover(root, { ctrl, onProgress: (p) => say((30 * (p.done + 1)) / Math.max(1, p.total), 'hover sweep, then spring fit · about 40 s') });
      // plan-exempt — found on gsap.com: the sweep moves the pointer, so a timeline looked pointer-driven. Before trusting "pointer-x", let the pointer rest and see whether the component keeps writing. routing-override: skipped — user asked to fix what the compatibility test found.
      const suspected = sniffer.describe(root);
      if (suspected && suspected.driver === 'pointer-x' && typeof sniffer.measureStillness === 'function' && !ctrl.cancelled) {
        say(30, 'checking whether the motion follows the pointer');
        await sniffer.measureStillness(root);
      }
      const motion = sniffer.describe(root);
      if (o.analyze && motion && motion.driver === 'pointer-x' && !models.get(root) && !ctrl.cancelled) {
        try {
          const model = await identify(root, {
            ctrl,
            onProgress: (p) => {
              const [low, high] = STAGE_RANGE[p.stage] || [30, 99];
              const fraction = p.total > 1 ? (p.done + 1) / p.total : 1;
              say(low + (high - low) * fraction, 'fitting the spring · keep this tab in front');
            }
          });
          if (model && model.supported) models.set(root, model);
        } catch (e) { /* cancelled or unsupported: the spatial map from the sweep is the fallback */ }
      }
      return sniffer.describe(root);
    } finally {
      if (pill) pill.remove();
    }
  }

  PageSnap.motionIdentify = {
    identify,
    captureMotion,
    createPlayer,
    buildPlayerScript,
    describeModel,
    getModel(el) { return models.get(el) || null; },
    setModel(el, model) { if (el && model) models.set(el, model); },
    _internals: { tokenize, springStep, fitSpring, predictRow, assemble, makePointer }
  };
})(window.PageSnap = window.PageSnap || {});
