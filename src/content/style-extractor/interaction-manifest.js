// plan-exempt — ps-008: interaction manifest extractor following Single Responsibility Principle. routing-override: skipped — user requested SOLID architecture update.
/**
 * interaction-manifest.js — captures cross-layer state transitions across interactive elements.
 *
 * Scans for interactive elements (such as [data-matcap], [data-theme], hoverable case links),
 * extracts their associated data attributes, target scenes, artwork URLs, and emits a structured
 * interaction manifest for AI agents.
 */
(function (PageSnap) {
  'use strict';

  function empty() {
    return { any: false, items: [] };
  }

  /**
   * @param {Element} root
   * @returns {{ any: boolean, items: Array<{ selector: string, text: string, theme: string, matcapIndex: number, artworkUrl: string|null }> }}
   */
  function extract(root) {
    if (!root || !root.querySelectorAll) return empty();

    const targets = Array.from(root.querySelectorAll('[data-matcap], [data-theme]')).slice(0, 20);
    if (!targets.length) return empty();

    const items = targets.map((el) => { // plan-exempt — remove unused idx parameter. routing-override: skipped — user requested SOLID architecture update.
      const matcapAttr = el.getAttribute('data-matcap') || '';
      const theme = el.getAttribute('data-theme') || '';
      const rawIdx = matcapAttr ? parseInt(matcapAttr.split(',')[0].trim(), 10) : 0;
      const matcapIndex = isNaN(rawIdx) ? 0 : rawIdx;
      const text = el.innerText ? el.innerText.trim().replace(/\s+/g, ' ').slice(0, 60) : el.tagName.toLowerCase();

      // Find associated artwork image if present
      let artworkUrl = null;
      if (theme) {
        const sceneEl = document.querySelector(`[class*="${theme}"]`);
        if (sceneEl) {
          const img = sceneEl.querySelector('img');
          if (img) artworkUrl = img.currentSrc || img.src || null;
        }
      }

      return {
        selector: el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase(),
        text,
        theme,
        matcapIndex,
        artworkUrl
      };
    });

    return {
      any: items.length > 0,
      items
    };
  }

  /** Formats markdown section for AI-PROMPT.md */
  function promptSection(manifest) {
    if (!manifest || !manifest.any) return '';

    const lines = [
      '## 3c. Interaction Manifest (Cross-Layer 3D & DOM Hover Transitions)',
      '',
      'The component binds DOM hover interactions to 3D WebGL material slots and background scenes:',
      ''
    ];

    manifest.items.forEach((item, idx) => {
      lines.push(`- **Item [${idx + 1}]: \`${item.text}\`**`);
      lines.push(`  - Trigger Theme: \`${item.theme || 'default'}\``);
      lines.push(`  - 3D Matcap Target Slot: \`Index ${item.matcapIndex}\``);
      if (item.artworkUrl) lines.push(`  - Associated Artwork Image: \`${item.artworkUrl}\``);
    });

    lines.push('');
    lines.push('> **Choreography Rule for AI:** When user hovers an item, transition the Three.js model matcap material to its assigned target slot (e.g. 0.4s ease), fade in its artwork scene, and dim inactive items to opacity 0.15. On mouseleave, restore resting matcap (Slot 0).');
    lines.push('');
    return lines.join('\n');
  }

  PageSnap.interactionManifest = { extract, promptSection };
})(window.PageSnap = window.PageSnap || {});
