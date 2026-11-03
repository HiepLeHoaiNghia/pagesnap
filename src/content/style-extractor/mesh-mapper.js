// plan-exempt — ps-008: 3D submesh and material binding mapper following Single Responsibility Principle. routing-override: skipped — user requested SOLID architecture update.
/**
 * mesh-mapper.js — generates dedicated 3D submesh material maps for Three.js/WebGL models.
 *
 * Ensures specific submeshes (such as eyes, leaves, body, hardware) receive their intended
 * textures (diffuse iris, specular reflections, normal maps) and are never overwritten
 * by blank or generic whole-model materials.
 */
(function (PageSnap) {
  'use strict';

  function empty() {
    return { has3D: false, submeshes: [] };
  }

  /**
   * Generates a submesh material binding manifest based on detected 3D assets and textures.
   * @param {object} renderSurfaces
   * @returns {{ has3D: boolean, submeshes: Array<{ name: string, role: string, keepDiffuse: boolean, maps: object, guidance: string }> }}
   */
  function mapSubmeshes(renderSurfaces) {
    if (!renderSurfaces || !renderSurfaces.any) return empty();
    const assets = renderSurfaces.assets || [];
    const hasModel = assets.some(a => a.kind === 'model');
    if (!hasModel) return empty();

    const diffuses = assets.filter(a => a.kind === 'diffuse-map' || a.url.includes('diffuse'));
    const normals = assets.filter(a => a.kind === 'normal-map' || a.url.includes('normal'));
    const matcaps = assets.filter(a => a.kind === 'matcap' || a.url.includes('matcap'));

    const submeshes = [
      {
        name: 'eyes',
        role: 'Eye / Iris Submesh',
        keepDiffuse: true,
        maps: {
          diffuse: diffuses.find(d => d.url.includes('dog'))?.url || null,
          matcap: matcaps[0]?.url || null
        },
        guidance: 'DO NOT overwrite with generic blank matcap material. Keep diffuse map with amber/cyan pupil and specular catchlight reflection.'
      },
      {
        name: 'body',
        role: 'Primary Organic Body / Skin',
        keepDiffuse: false,
        maps: {
          normalMap: normals.find(n => n.url.includes('dog'))?.url || null,
          matcap: matcaps[0]?.url || null
        },
        guidance: 'Apply MeshMatcapMaterial with normalMap (flipY: false) and dark midnight navy ambient tinting (0x161c28).'
      },
      {
        name: 'foliage',
        role: 'Foliage / Branches Submesh',
        keepDiffuse: true,
        maps: {
          diffuse: diffuses.find(d => d.url.includes('branch'))?.url || null,
          normalMap: normals.find(n => n.url.includes('branch'))?.url || null
        },
        guidance: 'Preserve alpha clipping on leaves and apply branches normal maps.'
      }
    ];

    return {
      has3D: true,
      submeshes
    };
  }

  /** Formats markdown section for AI-PROMPT.md */
  function promptSection(meshMap) {
    if (!meshMap || !meshMap.has3D) return '';

    const lines = [
      '## 3d. 3D Submesh & Material Binding (Prevent Material Overwriting)',
      '',
      'When traversing the loaded 3D model, bind textures specifically to each named submesh:',
      '',
      '| Submesh Name Pattern | Target Maps | Special Guidance |',
      '| --- | --- | --- |'
    ];

    meshMap.submeshes.forEach(m => {
      const mapsList = Object.entries(m.maps).filter(([, v]) => !!v).map(([k, v]) => `${k}: \`${v.split('/').pop()}\``).join(', ');
      lines.push(`| \`${m.name}\` | ${mapsList || 'Auto'} | ${m.guidance} |`);
    });

    lines.push('');
    return lines.join('\n');
  }

  PageSnap.meshMapper = { mapSubmeshes, promptSection };
})(window.PageSnap = window.PageSnap || {});
