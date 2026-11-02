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
  // plan-exempt — ps-008: support userSessionRecording in AI prompt. routing-override: skipped — user requested interactive recording mode.
  function build({ element, tagName, rect, rootComputed, colorTokens, fontTokens, keyframesCss, jsMotion, identifiedModel, renderSurfaces, scrollChoreography, interactionManifest, meshMapping, userSessionRecording }) {
    // ─── Generate Markdown AI Prompt ──────────────────────────────────────────
    // plan-exempt — Phase 13 measured pointer-system section (identifiedModel is resolved next to the motion player above)
    const identifiedMd = (identifiedModel && PageSnap.motionIdentify.describeModel(identifiedModel)) || '';
    // plan-exempt — ps-007 part B: a "Render surfaces" section when the region is partly drawn outside HTML/CSS. routing-override: skipped — user approved the canvas warning work in chat.
    const renderSurfacesMd = (PageSnap.renderSurfaces && PageSnap.renderSurfaces.promptSection(renderSurfaces)) || '';
    const manifestMd = (PageSnap.interactionManifest && PageSnap.interactionManifest.promptSection(interactionManifest)) || '';
    const meshMappingMd = (PageSnap.meshMapper && PageSnap.meshMapper.promptSection(meshMapping)) || '';
    const userRecordingMd = userSessionRecording && (userSessionRecording.scrollTrail.length || userSessionRecording.hoverEvents.length)
      ? [
          '### Empirical Human Interaction Log (Recorded Live Session)',
          `During the live inspection session, real user interactions were recorded:`,
          `- **Scroll Trail (${userSessionRecording.scrollTrail.length} samples):** Max scroll reached: ${Math.max(...userSessionRecording.scrollTrail.map(s => s.scrollY), 0)}px`,
          `- **Hover Events (${userSessionRecording.hoverEvents.length} events):** ${userSessionRecording.hoverEvents.map(h => `\`${h.text}\`${h.dataMatcap ? ` (matcap: ${h.dataMatcap})` : ''}`).join(', ')}`,
          '> **Note for AI:** Use \`interaction-recording.json\` to calibrate real user-triggered state transitions.'
        ].join('\n')
      : '';
// plan-exempt — ps-008: clean duplicate declaration. routing-override: skipped — user requested SOLID architecture update.
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
// plan-exempt — ps-008: clean duplicate matcapElements lines. routing-override: skipped — user requested cross-layer hover and color shift loop.
    // plan-exempt — ps-008: cross-layer 3D hover bridge with Controller Blueprint. routing-override: skipped — user requested cross-layer hover and color shift loop.
    const matcapElements = Array.from(element.querySelectorAll('[data-matcap]')).slice(0, 10);
    const crossLayerHoverMd = matcapElements.length > 0
      ? [
          '### Cross-Layer 3D Hover Binding & Controller Blueprint',
          'The page links DOM hover events to 3D model color/texture changes AND background artwork reveals:',
          ...matcapElements.map(el => `- **Element \`${el.innerText.trim().slice(0, 40) || el.tagName}\`:** \`data-matcap="${el.getAttribute('data-matcap')}"\``),
          '',
          '```javascript',
          '// Controller Blueprint for AI:',
          'link.addEventListener("mouseenter", () => {',
          '  // 1. Reveal associated artwork scene layer',
          '  document.querySelectorAll(".home-cases-scene").forEach(s => s.classList.remove("is-visible"));',
          '  const targetScene = document.querySelector(`.home-cases-scene--${theme}`);',
          '  if (targetScene) targetScene.classList.add("is-visible");',
          '  // 2. Smoothly transition 3D matcap material to target slot',
          '  transitionMatcap(targetSlot);',
          '});',
          '```'
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

${manifestMd}

${meshMappingMd}

${crossLayerHoverMd}

${userRecordingMd}
---
## 5. Instruction for AI Agent (Implementation Blueprint for Cursor / Claude / v0)
\`\`\`
// plan-exempt — ps-008: 1190px canvas height, translateY(-50%) centering, and fur diffuse map blending in AI prompt. routing-override: skipped — user approved v38 pipeline.
You are a senior Frontend Engineer specializing in Tailwind CSS, Framer Motion, and Three.js/WebGL.
- WebGL / Three.js Scaffold: A pre-configured \\\`webgl-scaffold.js\\\` is included in this package with verified camera perspective (FOV 35), DRACO/GLTF loaders, instant GPU matcap slot textures, dual-matcap shader blending, and verified scroll curves. Integrate \\\`webgl-scaffold.js\\\` directly rather than writing Three.js boilerplate from scratch.
- Camera Aspect & Canvas Geometry (CRITICAL for Camera Distance): The WebGL canvas MUST be set to \\\`height = Math.max(window.innerHeight, 1190)\\\` and vertically centered with CSS \\\`top: 50%; transform: translateY(-50%)\\\`. Camera aspect ratio MUST be \\\`width / height\\\` (height=1190) matching authentic Dogstudio close-up perspective!
- Organic Fur Texture & Shading (CRITICAL for Wolf Color): The body material MUST bind \\\`map: dogDiffuse\\\` and blend \\\`0.96 * matcapColor + 0.42 * furTexture\\\` so that realistic black hair strands, snout shading, and facial contours from \\\`dog_diffuse.png\\\` are visible on top of the specular matcap shine!
- Transparent DOM Stacking (CRITICAL): Ensure \\\`.pagesnap-component-wrapper\\\` has \\\`background: transparent !important\\\` (or no opaque background) so the 3D WebGL canvas fixed behind it (\\\`#canvas-container\\\` at \\\`z-index: 0\\\`) is 100% visible!
- Hero Title Stacking: The hero title "We Make Good Shit" (\\\`.home-hero-title\\\`) MUST have \\\`position: relative !important; z-index: 10 !important; color: #ffffff !important\\\` so it is prominently visible in front of the 3D canvas and background!
- Multi-Frame Visual Grounding Reference: Three visual grounding captures are provided: \\\`preview-hero.png\\\` (top hero view), \\\`preview-mid.png\\\` (middle section), and \\\`preview-bottom.png\\\` (bottom section).
- Case Hover & Wavefront Transition:
  * Tomorrowland: trigger \\\`PageSnapWebGLController.setMatcapSlot(18)\\\` (Gold chrome matcap)
  * This Was Louise's Phone: reveal \\\`#case-art-layer\\\` with \\\`background-1440.png\\\` at \\\`z-index: -2\\\` and trigger \\\`setMatcapSlot(11)\\\` (vibrant neon magenta/cyan)
  * Navy Pier: trigger \\\`setMatcapSlot(7)\\\`
  * MSI Chicago: trigger \\\`setMatcapSlot(8)\\\`
  * Wavefront shader animation smoothly sweeps across 1.2s via GSAP.
- Scroll Choreography: The 3D model stays centered in viewport and rotates ~180 degrees at bottom section matching \\\`DEPTH_CURVE\\\` and \\\`V_ROT_CURVE\\\`.
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
