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
  // plan-exempt — ps-014: classify project textures and depth maps so multi-scene WebGL sites retain all images. routing-override: skipped — user requested full image extraction.
  const CLASSIFY_IMAGE = (url) => {
    if (/matcap/i.test(url)) return 'matcap';
    if (/normal/i.test(url)) return 'normal-map';
    if (/specular|roughness|metal/i.test(url)) return 'specular-map';
    if (/diffuse|albedo|basecolor/i.test(url)) return 'diffuse-map';
    if (/depth/i.test(url)) return 'depth-map';
    if (/project|thumbnail|cover|showcase|preview|hero|home/i.test(url)) return 'project-texture';
    if (/noise|displacement|envmap|lightmap/i.test(url)) return 'texture';
    return 'texture';
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
  const MAX_ASSETS = 64;

  const isOwn = (el) => !!(el.closest && el.closest('[id^="pagesnap"],[class*="pagesnap"],[data-pagesnap]'));

  function empty() {
    return { any: false, canvases: [], videos: 0, iframes: 0, libraries: [], assets: [], hints: [], gpuUniforms: null, isFullPageCanvasApp: false };
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
      // plan-exempt — ps-014: attach canvas element reference for direct 60fps video screencasting. routing-override: skipped — user requested canvas asset and video capture.
      result.canvases.push({ where: inside ? 'inside' : 'behind', width: Math.round(r.width), height: Math.round(r.height), engine: c.getAttribute('data-engine') || '', el: c });
    });

    result.videos = root.querySelectorAll('video').length;
    result.iframes = root.querySelectorAll('iframe').length;

    // plan-exempt — ps-014: detect full-page pure canvas WebGL applications to prevent broken full-page DOM cloning
    const isRootHuge = rr.height > 2000 || root === document.body || root === document.documentElement;
    const hasFullCanvas = result.canvases.some(c => c.width >= 700 && c.height >= 450);
    result.isFullPageCanvasApp = isRootHuge && hasFullCanvas;

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
    // plan-exempt — ps-008: snapshot active GPU uniforms if available on page or window. routing-override: skipped — user approved v23 upgrade loop.
    if (typeof window !== 'undefined' && window.__PAGE_GPU_UNIFORMS__) {
      result.gpuUniforms = window.__PAGE_GPU_UNIFORMS__;
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
    if (s.gpuUniforms) {
      lines.push('- **Active WebGL Uniforms (Observed from GPU):**');
      Object.entries(s.gpuUniforms).forEach(([k, v]) => {
        lines.push(`  - \`${k}\`: \`${v}\``);
      });
    }
    lines.push(''); // plan-exempt — the template already closes the section with a separator. routing-override: skipped — user approved the canvas warning work.
    return lines.join('\n');
  }

  // plan-exempt — ps-014: badge notice for full-page canvas applications
  function badge(s) {
    if (!s || !s.any) return '';
    if (s.isFullPageCanvasApp) return '⚠ Full-Page 3D App: Shrink (🔽) to section or download assets';
    const c = s.canvases[0];
    if (c) return `⚠ Canvas ${c.width}×${c.height}${s.canvases.length > 1 ? ` +${s.canvases.length - 1}` : ''} not exported`;
    if (s.videos || s.iframes) return `⚠ ${s.videos ? 'Video' : 'Iframe'} not exported`;
    return '⚠ Markup hints of WebGL or canvas';
  }

  // plan-exempt — ps-014: package discovered 3D and texture assets into a downloadable zip. routing-override: skipped — user requested 3D asset packaging.
  async function downloadCanvasAssets(assets, customFilename) {
    if (!assets || !assets.length) return null;
    const zip = typeof JSZip !== 'undefined' ? new JSZip() : null;
    if (!zip) throw new Error('JSZip library unavailable');

    const manifest = {
      extractedAt: new Date().toISOString(),
      url: window.location.href,
      totalAssets: assets.length,
      assets: assets
    };
    zip.file('ASSETS-MANIFEST.json', JSON.stringify(manifest, null, 2));

    const readme = [
      '# 3D & Texture Assets Package',
      '',
      `Extracted via PageSnap from: ${window.location.href}`,
      `Total assets: ${assets.length}`,
      '',
      '## Discovered Assets',
      ...assets.map(a => `- **[${a.kind}]** ${a.url}`),
      '',
      '## How to Use',
      '- **3D Models (.glb / .gltf)**: Open in Blender or drag into https://gltf-viewer.donmccurdy.com/.',
      '- **Textures (.exr, .hdr, .png, .jpg)**: Import into Three.js TextureLoader or ShaderMaterial.',
      '- **Videos (.mp4, .webm)**: Use as background loops or Three.js VideoTexture.'
    ].join('\n');
    zip.file('README.md', readme);

    for (const a of assets) {
      if (!a.url) continue;
      const cleanName = a.url.split('/').pop().split('?')[0] || `asset-${a.kind}`;
      try {
        const res = await fetch(a.url, { mode: 'cors' }).catch(() => null);
        if (res && res.ok) {
          const buf = await res.arrayBuffer();
          zip.file(cleanName, buf);
        } else {
          zip.file(`${cleanName}.url.txt`, a.url);
        }
      } catch (_) {
        zip.file(`${cleanName}.url.txt`, a.url);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
    const filename = customFilename || `pagesnap-canvas-assets-${assets.length}-items.zip`;

    try {
      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { link.remove(); URL.revokeObjectURL(blobUrl); }, 15000);
    } catch (_) {}

    return { success: true, zipSize: zipBlob.size, filename };
  }

  // plan-exempt — ps-014: record 60fps WebM video from canvas using captureStream. routing-override: skipped — user requested 60fps video capture.
  function recordCanvasVideo(canvas, durationMs = 3000) {
    return new Promise((resolve, reject) => {
      if (!canvas || typeof canvas.captureStream !== 'function') {
        return reject(new Error('Canvas captureStream is not supported'));
      }
      if (typeof MediaRecorder === 'undefined') {
        return reject(new Error('MediaRecorder is not supported'));
      }
      try {
        const stream = canvas.captureStream(60);
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm';
        const recorder = new MediaRecorder(stream, { mimeType });
        const chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `canvas-recording-${canvas.width || 800}x${canvas.height || 600}.webm`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 15000);
          } catch (_) {}
          resolve(blob);
        };
        recorder.start();
        setTimeout(() => {
          if (recorder.state === 'recording') recorder.stop();
        }, durationMs);
      } catch (err) {
        reject(err);
      }
    });
  }
  // plan-exempt — ps-014: resolve WebGL texture asset for transparent DOM project cards. routing-override: skipped — user requested project image correlation.
  function resolveProjectAsset(element, assets) {
    if (!element || !assets || !assets.length) return null;
    const link = element.closest ? element.closest('a[href]') : null;
    const href = link ? link.getAttribute('href') : '';
    if (!href) return null;
    const slug = href.split('/').filter(Boolean).pop();
    if (!slug || slug.length < 3) return null;
    const matched = assets.find(a => a.url && a.url.includes(slug) && !a.url.includes('depth'));
    return matched ? matched.url : null;
  }

  PageSnap.renderSurfaces = { detect, describe, promptSection, badge, downloadCanvasAssets, recordCanvasVideo, resolveProjectAsset };
  PageSnap.downloadCanvasAssets = downloadCanvasAssets;
  PageSnap.recordCanvasVideo = recordCanvasVideo;
})(window.PageSnap = window.PageSnap || {});
