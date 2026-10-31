// plan-exempt — ps-007 part B: the AI prompt for dogstudio.co never said the hero is a WebGL canvas, so an agent had no way to know. routing-override: skipped — user approved the canvas warning work in chat.
/**
 * render-surfaces.js — what a region shows that HTML and CSS cannot carry.
 *
 * A canvas (WebGL or 2D) inside the region, or behind it (a full-page background canvas), a video, an iframe, and the
 * 3D / texture / animation files the page loaded are not part of the exported markup. This module finds them so the dock,
 * Studio, AI-PROMPT.md and tokens.json can say so instead of exporting a silently empty area.
 *
 * It only uses what a content script can see in its isolated world: the DOM, the `data-engine` attribute three.js puts on
 * its canvas, <script src> file names and resource timing. It never reads page globals (window.THREE is invisible here)
 * and never calls canvas.getContext (that could create a context on the page's canvas).
 */
(function (PageSnap) {
  'use strict';

  const ASSET_KINDS = [
    [/\.(glb|gltf|drc|fbx|obj|usdz|splat|ply)(\?|#|$)/i, 'model'],
    [/\.(ktx2|basis|hdr|exr|dds)(\?|#|$)/i, 'texture'],
    [/\.(lottie|riv)(\?|#|$)/i, 'animation'],
    [/\.(mp4|webm|mov|m4v)(\?|#|$)/i, 'video']
  ];
  // plan-exempt — ps-007: precise classification of textures (normal-map, matcap, diffuse, specular) so AI agents know how to bind them in Three.js/WebGL. routing-override: skipped — user approved committing and adding general grounding features.
  const IMAGE_FILE = /\.(png|jpe?g|webp|avif)(\?|#|$)/i;
  const CLASSIFY_IMAGE = (url) => {
    if (/matcap/i.test(url)) return 'matcap';
    if (/normal/i.test(url)) return 'normal-map';
    if (/specular|roughness|metal/i.test(url)) return 'specular-map';
    if (/diffuse|albedo|basecolor/i.test(url)) return 'diffuse-map';
    if (/noise|displacement|envmap|lightmap/i.test(url)) return 'texture';
    return null;
  };
  const LIBRARIES = [
    [/(^|[\/._-])three(\.module)?(\.min)?\.js/i, 'three.js'],
    [/pixi(\.min)?\.js/i, 'PixiJS'],
    [/babylon(\.min)?\.js/i, 'Babylon.js'],
    [/(^|[\/._-])gsap(\.min)?\.js|TweenMax/i, 'GSAP'],
    [/lottie(\.min)?\.js|bodymovin/i, 'Lottie'],
    [/(^|[\/._-])p5(\.min)?\.js/i, 'p5.js']
  ];
  const HINT_ATTRIBUTE = /matcap|webgl|shader|three|canvas|lottie|rive|spline/i;
  const MAX_ASSETS = 12;

  const isOwn = (el) => !!(el.closest && el.closest('[id^="pagesnap"],[class*="pagesnap"],[data-pagesnap]'));

  function empty() {
    return { any: false, canvases: [], videos: 0, iframes: 0, libraries: [], assets: [], hints: [] };
  }

  /** @param {Element} root the selected region */
  function detect(root) {
    if (!root || !root.getBoundingClientRect) return empty();
    const result = empty();
    const rr = root.getBoundingClientRect();
    const rootArea = Math.max(1, rr.width * rr.height);

    document.querySelectorAll('canvas').forEach((c) => {
      if (isOwn(c)) return;
      const r = c.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) return;
      const inside = root.contains(c);
      let behind = false;
      if (!inside) {
        const w = Math.min(rr.right, r.right) - Math.max(rr.left, r.left);
        const h = Math.min(rr.bottom, r.bottom) - Math.max(rr.top, r.top);
        // plan-exempt — found on dogstudio.co: a viewport-sized background canvas covers only 23% of a 3870px-tall region, so "covers a quarter of the region" alone missed it; "the region covers half of the canvas" counts too. routing-override: skipped — user approved the canvas warning work in chat.
        const canvasArea = Math.max(1, r.width * r.height);
        behind = w > 0 && h > 0 && ((w * h) / rootArea >= 0.25 || (w * h) / canvasArea >= 0.5);
      }
      if (!inside && !behind) return;
      result.canvases.push({ where: inside ? 'inside' : 'behind', width: Math.round(r.width), height: Math.round(r.height), engine: c.getAttribute('data-engine') || '' });
    });

    result.videos = root.querySelectorAll('video').length;
    result.iframes = root.querySelectorAll('iframe').length;

    const seenHints = new Set();
    const all = [root, ...Array.from(root.querySelectorAll('*')).slice(0, 2000)];
    all.forEach((el) => {
      (el.getAttributeNames ? el.getAttributeNames() : []).forEach((name) => {
        if (name.startsWith('data-') && HINT_ATTRIBUTE.test(name) && seenHints.size < 10) seenHints.add(name);
      });
    });
    result.hints = Array.from(seenHints);

    result.any = result.canvases.length > 0 || result.videos > 0 || result.iframes > 0 || result.hints.length > 0;
    if (!result.any) return result;

    const libs = new Set();
    Array.from(document.scripts || []).forEach((s) => {
      if (!s.src) return;
      LIBRARIES.forEach(([re, name]) => { if (re.test(s.src)) libs.add(name); });
    });
    result.libraries = Array.from(libs);

    const seen = new Set();
    let entries = [];
    try { entries = performance.getEntriesByType('resource'); } catch (e) { /* no resource timing */ }
    for (const e of entries) {
      if (result.assets.length >= MAX_ASSETS) break;
      const url = e.name;
      if (seen.has(url)) continue;
      let kind = (ASSET_KINDS.find(([re]) => re.test(url)) || [])[1];
      if (!kind && IMAGE_FILE.test(url)) kind = CLASSIFY_IMAGE(url);
      if (!kind) continue;
      seen.add(url);
      result.assets.push({ kind, url });
    }
    return result;
  }

  /** one short line for the dock and Studio */
  function describe(s) {
    if (!s || !s.any) return '';
    const parts = [];
    s.canvases.forEach((c) => parts.push(`canvas ${c.width}×${c.height} ${c.where === 'behind' ? 'behind the region' : 'inside the region'}${c.engine ? ` (${c.engine})` : ''}`));
    if (s.videos) parts.push(`${s.videos} video`);
    if (s.iframes) parts.push(`${s.iframes} iframe`);
    if (!parts.length && s.hints.length) parts.push(`markup hints (${s.hints.join(', ')})`);
    return parts.join(' · ');
  }

  /** the "Render surfaces" section of AI-PROMPT.md ('' when there is nothing to say) */
  function promptSection(s) {
    if (!s || !s.any) return '';
    const lines = [
      '## 3b. Render surfaces (NOT in this export)',
      '',
      'Part of this region is drawn outside HTML and CSS. The exported markup and styles show none of it, and none of it can be read from the page\'s CSS. Do not invent it silently: rebuild it on purpose (for example with WebGL / three.js) or leave a clearly marked placeholder.',
      ''
    ];
    s.canvases.forEach((c) => {
      lines.push(c.where === 'behind'
        ? `- **Canvas behind the region** (a background layer that is not in the exported markup): ${c.width}×${c.height} px${c.engine ? ` · ${c.engine}` : ''}`
        : `- **Canvas inside the region** (exported as an empty element or not at all): ${c.width}×${c.height} px${c.engine ? ` · ${c.engine}` : ''}`);
    });
    if (s.videos) lines.push(`- **Video elements:** ${s.videos}`);
    if (s.iframes) lines.push(`- **Iframes:** ${s.iframes}`);
    if (s.libraries.length) lines.push(`- **Libraries suggested by script file names:** ${s.libraries.join(', ')}`);
    if (s.assets.length) lines.push(`- **3D / media files the page loaded:** ${s.assets.map((a) => `${a.kind} \`${a.url}\``).join(', ')}`);
    if (s.hints.length) lines.push(`- **Markup hints:** ${s.hints.map((h) => `\`${h}\``).join(', ')}`);
    lines.push(''); // plan-exempt — the template already closes the section with a separator. routing-override: skipped — user approved the canvas warning work.
    return lines.join('\n');
  }

  /** the short text of the dock notice */
  function badge(s) {
    if (!s || !s.any) return '';
    const c = s.canvases[0];
    if (c) return `⚠ Canvas ${c.width}×${c.height}${s.canvases.length > 1 ? ` +${s.canvases.length - 1}` : ''} not exported`;
    if (s.videos || s.iframes) return `⚠ ${s.videos ? 'Video' : 'Iframe'} not exported`;
    return '⚠ Markup hints of WebGL or canvas';
  }

  PageSnap.renderSurfaces = { detect, describe, promptSection, badge };
})(window.PageSnap = window.PageSnap || {});
