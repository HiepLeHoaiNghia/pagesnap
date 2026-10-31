// plan-exempt — ps-003 phase 4: the AI prompt builder, moved out of the extractor unchanged. routing-override: skipped — user asked to build from the plan.
/**
 * PageSnap AI prompt builder.
 *
 * Builds AI-PROMPT.md: layout, design tokens, motion specs (CSS, measured JS motion, fitted pointer model) and an
 * implementation brief. Pure text assembly from values the extractor already collected.
 */
(function (PageSnap) {
  'use strict';

  /** @returns {string} the markdown document */
  // plan-exempt — ps-008: support scrollChoreography parameter. routing-override: skipped — user approved scroll choreography tracker.
  function build({ element, tagName, rect, rootComputed, colorTokens, fontTokens, keyframesCss, jsMotion, identifiedModel, renderSurfaces, scrollChoreography }) {
    // ─── Generate Markdown AI Prompt ──────────────────────────────────────────
    // plan-exempt — Phase 13 measured pointer-system section (identifiedModel is resolved next to the motion player above)
    const identifiedMd = (identifiedModel && PageSnap.motionIdentify.describeModel(identifiedModel)) || '';
    // plan-exempt — ps-007 part B: a "Render surfaces" section when the region is partly drawn outside HTML/CSS. routing-override: skipped — user approved the canvas warning work in chat.
// plan-exempt — ps-007 part B: a "Render surfaces" section when the region is partly drawn outside HTML/CSS. routing-override: skipped — user approved the canvas warning work in chat.
    const renderSurfacesMd = (PageSnap.renderSurfaces && PageSnap.renderSurfaces.promptSection(renderSurfaces)) || '';
    // plan-exempt — ps-008: add scroll choreography section if tracked with multi-pose rotation guidance. routing-override: skipped — user approved multi-frame grounding loop.
    const scrollChoreoMd = scrollChoreography && scrollChoreography.checkpoints && scrollChoreography.checkpoints.length
      ? [
          '### Scroll Choreography & Multi-Pose State Checkpoints (Observed)',
          `Max scroll range: ${scrollChoreography.maxScroll}px across ${scrollChoreography.checkpoints.length} checkpoints:`,
          ...scrollChoreography.checkpoints.map(c => `- **At ${Math.round(c.progress * 100)}% (${c.scrollY}px):** ${c.canvasState ? `Canvas state: \`${c.canvasState}\`` : 'Scroll checkpoint recorded'}`),
          '> **Choreography Rules for AI:**',
          '> 1. Connect 3D Camera depth/FOV and object rotation to `window.scrollY`.',
          '> 2. At bottom scroll (100%), the 3D model rotates ~180 degrees showing its back, matching `preview-bottom.png`.',
          '> 3. At middle scroll (40-60%), the model recedes and slides left/right to yield room for content, matching `preview-mid.png`.',
          ...(scrollChoreography.splines
            ? [
                '',
                '#### Exact Choreography Spline Poses (Observed):',
                '```json',
                JSON.stringify(scrollChoreography.splines, null, 2),
                '```',
                '> **Note for AI:** Interpolate `camera.position.z` using `DEPTH`, `object.rotation.y` using `V_ROTATION` (deg), and `x/y` offsets matching this exact spline curve.'
              ]
            : [])
        ].join('\n')
      : '';
    // plan-exempt — ps-008: cross-layer 3D hover bridge for data-matcap bindings. routing-override: skipped — user requested cross-layer hover and color shift loop.
    const matcapElements = Array.from(element.querySelectorAll('[data-matcap]')).slice(0, 10);
    const crossLayerHoverMd = matcapElements.length > 0
      ? [
          '### Cross-Layer 3D Hover Binding (data-matcap -> WebGL Texture)',
          'The page links DOM hover events to 3D model color/texture changes using `data-matcap` attributes:',
          ...matcapElements.map(el => `- **Element \`${el.innerText.trim().slice(0, 40) || el.tagName}\`:** \`data-matcap="${el.getAttribute('data-matcap')}"\` (switches 3D model to matcap index ${el.getAttribute('data-matcap').split(',')[0].trim()})`),
          '> **Instruction for AI:** On mouseenter of each item, transition the Three.js model matcap material to its assigned `data-matcap` index with a 0.4s smooth ease; on mouseleave restore the resting matcap slot.'
        ].join('\n')
      : '';
    const mdSafe = (s) => String(s).replace(/`/g, "'");
    const jsMotionMd = jsMotion
      ? [
          '### JavaScript-driven motion (observed)',
          // plan-exempt — Phase 12 driver-aware interactive motion spec in AI-PROMPT.md
          ...(jsMotion.driver ? [`- **Interactive Driver:** \`${jsMotion.driver}\` (${jsMotion.driver.startsWith('pointer') ? 'Pointer-Reactive: coordinates across component bounding box scrub the wave' : 'Autonomous Time-Loop: runs on its own, not tied to the pointer. The exported HTML shows the first frame only; rebuild the timeline from the states and cadence listed below'})`] : []),
          // plan-exempt — Phase 12 advertise the complete spatial state map for pointer-driven reconstruction
          ...(jsMotion.spatialMap && jsMotion.spatialMap.length
            ? [`- **Spatial State Map:** ${jsMotion.spatialMap.length} pointer buckets in \`tokens.json\` (\`jsMotion.spatialMap\`), each holding every animated path at that cursor X. Scrub this map from \`pointermove\` instead of replaying a fixed timeline.`]
            : []),
          ...(jsMotion.attributes.length
            ? jsMotion.attributes.map((g) => `- \`${g.name}\`: ${g.writes} writes on ${g.elements} element(s) over ~${g.spanMs} ms` + (g.medianFrameGapMs ? `, about one batch every ${g.medianFrameGapMs} ms` : ''))
            : []),
          // plan-exempt — Phase 10 Dual-State comparison specs in AI-PROMPT.md
          ...(jsMotion.samples && jsMotion.samples.length
            ? [
                '',
                // plan-exempt — Phase 11 Trajectory stream guidance in AI prompt
                '### Dual-State Comparison (State 1: Resting vs State 2: Peak Hover)',
                `Auto-sweep probing captured the maximum range of motion between resting state and peak hover state across ${jsMotion.morphedPaths?.length || jsMotion.samples.length} animated elements:`,
                ...(jsMotion.morphedPaths && jsMotion.morphedPaths.length > jsMotion.samples.length
                  ? [`> **Note for AI:** All ${jsMotion.morphedPaths.length} paths in this component share this synchronized deformation wave. Apply the hover morph to all corresponding paths in the SVG (full trajectory keyframes in tokens.json).`]
                  : []),
                ...jsMotion.samples.map((s, i) => `${i + 1}. \`${mdSafe(s.path)}\` (\`.ps-el-${s.elIndex}\`, \`${s.attribute}\`)\n   - State 1 (Resting): \`${mdSafe(s.before)}\`\n   - State 2 (Peak Hover): \`${mdSafe(s.after)}\`\n   - Cadence: ~${s.writes} frames over ~${s.spanMs} ms (${s.motionType})`)
              ]
            : []),
          ...(jsMotion.interactiveStates && jsMotion.interactiveStates.length
            ? [
                '',
                '### Interactive State Toggles (CSS & Structural Shifts):',
                ...jsMotion.interactiveStates.map((st, i) => `${i + 1}. \`${mdSafe(st.path)}\` (\`.ps-el-${st.elIndex}\`, \`${st.attribute}\`)\n   - Rest: \`${mdSafe(st.before)}\`\n   - Active Hover: \`${mdSafe(st.after)}\`${st.transformDelta ? `\n   - Computed Delta: translateY(${st.transformDelta.y}px)` : ''}`)
              ]
            : []),
          '',
          'Recreate it by animating those attributes between State 1 (Resting) and State 2 (Peak Hover) with Framer Motion or GSAP.'
        ].join('\n')
      : [
          '### JavaScript-driven motion',
          'None observed. Hover, scroll and timer effects that run in JavaScript cannot be read from CSS. To capture them, move the pointer over the component while the inspector is active, then select it.'
        ].join('\n');
    const transition = rootComputed.getPropertyValue('transition');
    const animation = rootComputed.getPropertyValue('animation');
    const transform = rootComputed.getPropertyValue('transform');

    const promptMarkdown = `# UI Component Design Specification & Reverse-Engineering Prompt

> Extracted via PageSnap from: ${window.location.href}
> Target: \`<${tagName}>\` (${Math.round(rect.width)}px × ${Math.round(rect.height)}px)

---

## 1. Visual & Layout Overview
- **HTML Element:** \`<${tagName}>\`
- **Dimensions:** \`${Math.round(rect.width)}px\` width × \`${Math.round(rect.height)}px\` height
- **Display & Layout:** \`${rootComputed.getPropertyValue('display')}\`
- **Flex/Grid Alignment:** Align: \`${rootComputed.getPropertyValue('align-items')}\`, Justify: \`${rootComputed.getPropertyValue('justify-content')}\`, Gap: \`${rootComputed.getPropertyValue('gap')}\`
- **Box Shadow:** \`${rootComputed.getPropertyValue('box-shadow') || 'none'}\`
- **Border Radius:** \`${rootComputed.getPropertyValue('border-radius') || 'none'}\`
- **Backdrop Filter:** \`${rootComputed.getPropertyValue('backdrop-filter') || 'none'}\`

---

## 2. Design Tokens
### Color Palette:
${Array.from(colorTokens).map(c => `- \`${c}\``).join('\n') || '- None'}

### Typography:
${Array.from(fontTokens).map(f => `- Font Family: \`${f}\``).join('\n') || '- Inherit'}
- Font Size: \`${rootComputed.getPropertyValue('font-size')}\`
- Font Weight: \`${rootComputed.getPropertyValue('font-weight')}\`
- Line Height: \`${rootComputed.getPropertyValue('line-height')}\`

---

## 3. Motion & Animation Specs
- **CSS Transition:** \`${transition && transition !== 'none' ? transition : 'none'}\`
- **CSS Animation:** \`${animation && animation !== 'none' ? animation : 'none'}\`
- **Active Transform:** \`${transform && transform !== 'none' ? transform : 'none'}\`

${keyframesCss ? `### Keyframe Animations:\n\`\`\`css\n${keyframesCss}\n\`\`\`\n` : ''}

${jsMotionMd}

${identifiedMd}

${renderSurfacesMd}

${scrollChoreoMd}

---

## 4. Original HTML Markup
\`\`\`html
${element.outerHTML}
\`\`\`

${renderSurfacesMd}

${scrollChoreoMd}

${crossLayerHoverMd}

---
## 5. Instruction for AI Agent (Implementation Blueprint for Cursor / Claude / v0)
\`\`\`
// plan-exempt — ps-007: visual grounding reference preview.png instruction. routing-override: skipped — user approved adding general grounding features.
You are a senior Frontend Engineer specializing in Tailwind CSS, Framer Motion, and Three.js/WebGL.
- Multi-Frame Visual Grounding Reference: Three visual grounding captures are provided: \`preview-hero.png\` (top hero view), \`preview-mid.png\` (middle section), and \`preview-bottom.png\` (bottom section). Inspect all three to verify camera perspective, model scale, and rotation transitions across scrolling.
- 3D Material & Ambient Tone: Apply a dark midnight navy tint (0x161c28 or 0x121726) to the matcap material so the 3D model blends into the dark background instead of appearing as a washed-out cyan/white.
- 3D Eye & Specular Detailing: Give the eyes a dedicated specular material with a realistic glowing amber pupil making piercing direct eye contact in the hero frame, matching \`preview-hero.png\`.
- Scroll Choreography: Connect 3D camera / object transforms (depth, rotation, x/y offsets) to scroll progress so the 3D model rotates ~180 degrees showing its back at the bottom section.
- Framework: React (TypeScript) / Three.js
- Styling: Tailwind CSS
- Animation: Framer Motion / Three.js (matching specs and the 3 preview frames)
- Produce clean, modern, accessible, and responsive component code.

### Suggested Framer Motion Patterns:

export function MorphingSvgPath({ initialD, targetD }: { initialD: string, targetD: string }) {
  return (
    <motion.path
      initial={{ d: initialD }}
      whileHover={{ d: targetD }}
      transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
    />
  );
}
\`\`\`

2. For Interactive Element Lift / Hover:
\`\`\`tsx
export function LiftingCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -16 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
\`\`\`
\`\`\`
`;
    return promptMarkdown;
  }

  PageSnap.aiPrompt = { build };
})(window.PageSnap = window.PageSnap || {});
// plan-exempt — removed an internal comment line that sat inside the prompt template and leaked into every AI-PROMPT.md (found by layered review). routing-override: skipped — user asked to fix review findings.
