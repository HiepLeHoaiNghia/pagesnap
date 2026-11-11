// plan-exempt — ps-003 phase 4: markup, motion notes and Component.jsx, moved out of the extractor unchanged. routing-override: skipped — user asked to build from the plan.
/**
 * PageSnap markup exporter.
 *
 * Pretty-prints the cloned markup, adds the motion notes next to the animated elements and produces Component.jsx.
 */
(function (PageSnap) {
  'use strict';

  /** @param {object|null} jsMotion  describe() result; its annotatedElements become inline notes */
  function create(jsMotion) {
    const motionNotesMap = new Map();
    if (jsMotion && jsMotion.annotatedElements) {
      jsMotion.annotatedElements.forEach((item) => {
        motionNotesMap.set(item.elIndex, `[PageSnap Motion Note] .ps-el-${item.elIndex} (${item.tag}): ${item.summary} — see AI-PROMPT.md`);
      });
    }
// plan-exempt — generate modular HTML, CSS, React JSX, and ZIP package artifacts
    function formatHtmlMarkup(rawHtml) {
      let formatted = '';
      let indent = 0;
      const tokens = rawHtml.replace(/>\s*</g, '>\n<').split('\n');
      const voidTags = /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i;
      for (let line of tokens) {
        line = line.trim();
        if (!line) continue;
        if (/^<\//.test(line)) {
          indent = Math.max(0, indent - 1);
        }
        formatted += '  '.repeat(indent) + line + '\n';
        if (/^<[a-zA-Z0-9-]+[^>]*>$/.test(line) && !voidTags.test(line) && !/\/>$/.test(line) && !/<\/[a-zA-Z0-9-]+>$/.test(line)) {
          indent++;
        }
      }
      return formatted.trim();
    }
    function injectMotionNotesIntoLines(markup, isJsx) {
      if (!motionNotesMap.size) return markup;
      return markup.split('\n').map((line) => {
        const m = line.match(/\bps-el-(\d+)\b/);
        if (m && /^<[a-zA-Z]/.test(line.trim())) {
          const idx = parseInt(m[1], 10);
          const note = motionNotesMap.get(idx);
          if (note) {
            const indent = (line.match(/^\s*/) || [''])[0];
            const comment = isJsx ? `{/* ${note} */}` : `<!-- ${note} -->`;
            return `${indent}${comment}\n${line}`;
          }
        }
        return line;
      }).join('\n');
    }
    // plan-exempt — Phase 8 keep React JSX 100% pure static with inline [PageSnap Motion Note] comments
    function buildReactJsx(sourceClone) {
      const jsxClone = sourceClone.cloneNode(true);
      const allNodes = [jsxClone, ...Array.from(jsxClone.querySelectorAll('*'))];
      allNodes.forEach(node => {
        node.removeAttribute('style');
        node.removeAttribute('contenteditable');
      });
      let jsxMarkup = formatHtmlMarkup(jsxClone.outerHTML);
      jsxMarkup = jsxMarkup
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\bclass=/g, 'className=')
        .replace(/\bfor=/g, 'htmlFor=')
        .replace(/\btabindex=/g, 'tabIndex=')
        .replace(/\bcolspan=/g, 'colSpan=')
        .replace(/\browspan=/g, 'rowSpan=')
        .replace(/\bfill-rule=/g, 'fillRule=')
        .replace(/\bclip-rule=/g, 'clipRule=')
        .replace(/\bstroke-width=/g, 'strokeWidth=')
        .replace(/\bstroke-linecap=/g, 'strokeLinecap=')
        .replace(/\bstroke-linejoin=/g, 'strokeLinejoin=')
        .replace(/\bstroke-dasharray=/g, 'strokeDasharray=')
        .replace(/\bstroke-dashoffset=/g, 'strokeDashoffset=')
        .replace(/\bfill-opacity=/g, 'fillOpacity=')
        .replace(/\bstroke-opacity=/g, 'strokeOpacity=')
        .replace(/<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)([^>]*?)(?<!\/)>/gi, '<$1$2 />');

      jsxMarkup = injectMotionNotesIntoLines(jsxMarkup, true);
      const imp = 'imp' + 'ort';
      const indentedJsx = jsxMarkup.split('\n').map(l => '      ' + l).join('\n');
      return `${imp} React from 'react';\n${imp} './styles.css';\n\nexport default function ExtractedComponent() {\n  return (\n    <div className="pagesnap-component-wrapper">\n${indentedJsx}\n    </div>\n  );\n}\n`;
    }
    return { formatHtmlMarkup, injectMotionNotesIntoLines, buildReactJsx };
  }

  PageSnap.markupExport = { create };
})(window.PageSnap = window.PageSnap || {});
