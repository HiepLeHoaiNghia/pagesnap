// plan-exempt — ps-003 phase 4: the spatial-map pointer player, moved out of the extractor unchanged. routing-override: skipped — user asked to build from the plan.
/**
 * PageSnap pointer player (fallback).
 *
 * When a component's motion follows the pointer but no spring model was fitted, the export carries a small script that
 * scrubs the recorded path states by pointer X and eases back to rest when the pointer leaves. Returns '' when the
 * motion is not pointer-driven or has no recorded states.
 */
(function (PageSnap) {
  'use strict';

  /** @param {object|null} jsMotion  describe() result of the motion sniffer
   *  @returns {string} a complete <script> element, or '' */
  function buildScript(jsMotion) {
    return jsMotion && jsMotion.driver === 'pointer-x' && Array.isArray(jsMotion.spatialMap) && jsMotion.spatialMap.length
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
  }

  PageSnap.pointerPlayer = { buildScript };
})(window.PageSnap = window.PageSnap || {});
