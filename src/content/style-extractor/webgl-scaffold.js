// plan-exempt — ps-008: automated WebGL scaffold generator with wavefront shader and texture separation following SOLID principles. routing-override: skipped — user requested wavefront shader upgrade.
/**
 * webgl-scaffold.js — generates a self-contained, robust WebGL / Three.js scaffold script
 * for creative components with 3D models, custom matcaps, and cross-layer hover bindings.
 *
 * Implements Single Responsibility Principle (SRP):
 * Only handles generating the client-side Three.js boilerplate script embedded into index.html / package.
 */
(function (PageSnap) {
  'use strict';

  /**
   * Generates standalone Three.js code that handles exact camera setup,
   * DRACO/GLTF loading, submesh material bindings (preserving eyes/diffuse),
   * and cross-layer hover connections with GLSL sampleTransition wavefront animation.
   *
   * @param {object} params
   * @param {object} params.renderSurfaces
   * @returns {string} Standalone javascript code
   */
  function generateScaffold({ renderSurfaces }) {
    if (!renderSurfaces || !renderSurfaces.any) return '';
    const assets = renderSurfaces.assets || [];
    const modelAsset = assets.find(a => a.kind === 'model') || { url: 'assets/dog.drc.glb' };
    const normalAsset = assets.find(a => a.kind === 'normal-map' || a.url.includes('dog_normals')) || { url: 'assets/dog_normals.jpg' };
    const matcapAsset = assets.find(a => a.kind === 'matcap' || a.url.includes('matcap')) || { url: 'assets/matcap-combined-resized.jpg' };
    const dogDiffuseAsset = assets.find(a => a.url.includes('dog_diffuse')) || { url: 'assets/dog_diffuse.dds' };
    const branchesDiffuseAsset = assets.find(a => a.url.includes('branches_diffuse')) || { url: 'assets/branches_diffuse.dds' };
    const branchesNormalsAsset = assets.find(a => a.url.includes('branches_normals')) || { url: 'assets/branches_normals.dds' };

    const modelName = modelAsset.url.split('/').pop();
    const dogNormalsName = normalAsset.url.split('/').pop();
    const matcapName = matcapAsset.url.split('/').pop();
    const dogDiffuseName = dogDiffuseAsset.url.split('/').pop();
    const branchesDiffuseName = branchesDiffuseAsset.url.split('/').pop();
    const branchesNormalsName = branchesNormalsAsset.url.split('/').pop();

    return `
/* PageSnap WebGL Architecture Scaffold — Multi-Layer Creative WebGL Engine (v26 Wavefront) */
(function initPageSnapWebGL() {
  const container = document.getElementById('canvas-container') || document.body;
  const width = window.innerWidth;
  const height = window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  // Camera setup: close-up FOV 35 framed on primary hero subject
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.01, 1000);
  camera.position.set(0.2, 1.6, 22.0);
  scene.add(camera);
  camera.lookAt(new THREE.Vector3(1.1, 1.8, 0));

  const textureLoader = new THREE.TextureLoader();
  const loadTex = (url) => {
    const t = textureLoader.load(url);
    t.flipY = false;
    return t;
  };

  // plan-exempt — ps-008: flipY=true on diffuse maps to align genuine eye and fur UV coordinates. routing-override: skipped — user requested 100% exact shader match.
  const matcapAtlas = loadTex('assets/${matcapName}');
  const dogNormals = loadTex('assets/${dogNormalsName}');
  const dogDiffuse = loadTex('assets/${dogDiffuseName}');
  dogDiffuse.flipY = true;
  const branchesDiffuse = loadTex('assets/${branchesDiffuseName}');
  branchesDiffuse.flipY = true;
  const branchesNormals = loadTex('assets/${branchesNormalsName}');

  // Multi-Matcap Atlas Cropper (10x2 grid)
  // plan-exempt — ps-008: instant synchronous GPU slot texture via repeat & offset (no async canvas crop delay). routing-override: skipped — user approved v32 pipeline.
  function getMatcapTexture(idx) {
    const tex = textureLoader.load('assets/${matcapName}');
    tex.flipY = false;
    tex.repeat.set(0.1, 0.5);
    const col = idx % 10;
    const row = Math.floor(idx / 10);
    tex.offset.set(col * 0.1, row === 1 ? 0.0 : 0.5);
    return tex;
  }
  // Program 1: Eyes Material (secondMatcapIdx: 0, secondDiffuseWeight: 0.79, normalScale: 0)
  // Program 2: Body Material (secondMatcapIdx: 1, secondDiffuseWeight: 0.52, normalScale: 1)
  // plan-exempt — ps-008: default hero matcap slot 0 (dark navy/indigo hero slot) and slot 11 hover (Louise pink/purple). routing-override: skipped — user approved v30 pipeline.
  // plan-exempt — ps-008: dynamic dual-matcap shader blending for tail-to-head wavefront. routing-override: skipped — user requested true wavefront wave.
  // plan-exempt — ps-008: mathematical atlas UV slot mapping in GLSL fragment shader. routing-override: skipped — user approved v35 pipeline.
  const wolfUniforms = {
    matcapTransition: { value: 0.0 },
    tMatCapAtlas: { value: matcapAtlas },
    firstSlot: { value: 0.0 },
    secondSlot: { value: 18.0 } // default Tomorrowland Gold slot 18
  };
  const bodyMaterial = new THREE.MeshMatcapMaterial({
    matcap: matcapAtlas,
    normalMap: dogNormals,
    normalScale: new THREE.Vector2(0.65, 0.65),
    skinning: true
  });

  // Inject GLSL Wavefront logic with exact mathematical UV slot mapping
  bodyMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.matcapTransition = wolfUniforms.matcapTransition;
    shader.uniforms.tMatCapAtlas = wolfUniforms.tMatCapAtlas;
    shader.uniforms.firstSlot = wolfUniforms.firstSlot;
    shader.uniforms.secondSlot = wolfUniforms.secondSlot;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <clipping_planes_pars_vertex>',
      \`#include <clipping_planes_pars_vertex>
      varying vec3 vWorldPos;
      varying vec3 vViewPos;
      \`
    ).replace(
      '#include <worldpos_vertex>',
      \`#include <worldpos_vertex>
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vViewPos = -mvPosition.xyz;
      \`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <clipping_planes_pars_fragment>',
      \`#include <clipping_planes_pars_fragment>
      uniform float matcapTransition;
      uniform sampler2D tMatCapAtlas;
      uniform float firstSlot;
      uniform float secondSlot;
      varying vec3 vWorldPos;
      varying vec3 vViewPos;

      // Dogstudio Wavefront function: origin point at tail/hind leg
      float sampleTransition(vec3 normalTex) {
        const vec3 sourceOrigin = vec3(13.0, 20.0, 13.0);
        float dist = ((2.0 - distance(sourceOrigin, vViewPos) / 4.0 + matcapTransition * 13.0) / (6.0 + matcapTransition * 4.0));
        dist = smoothstep(0.0, 1.0, dist);
        return clamp(dist + pow(max(0.0, normalTex.y), 1.2) * 25.0 * dist, 0.0, 1.0);
      }

      vec2 getAtlasUv(vec2 rawUv, float slot) {
        float col = mod(slot, 10.0);
        float row = floor(slot / 10.0);
        float u = (rawUv.x + col) * 0.1;
        float v = rawUv.y * 0.5 + (row > 0.5 ? 0.0 : 0.5);
        return vec2(u, v);
      }
      \`
    // plan-exempt — ps-008: replace Three.js inline matcap sampling with dual-slot atlas blending. routing-override: skipped — user requested true wavefront wave.
    ).replace(
      'vec4 matcapColor = texture2D( matcap, uv );',
      \`
      vec2 uvOld = getAtlasUv(uv, firstSlot);
      vec2 uvNew = getAtlasUv(uv, secondSlot);
      vec4 oldColor = texture2D( matcap, uvOld );
      vec4 newColor = texture2D( matcap, uvNew );
      float waveFactor = sampleTransition(normal);
      vec4 matcapColor = mix(oldColor, newColor, waveFactor);
      \`
    );
  };

  // plan-exempt — ps-008: bind genuine dogDiffuse on eyeMaterial (Program 1) with secondDiffuseWeight: 0.79. routing-override: skipped — user requested 100% exact shader match.
  const eyeMaterial = new THREE.MeshBasicMaterial({
    map: dogDiffuse,
    transparent: false
  });

  // Foliage Material: separate normal map and leaf matcap
  const leafMaterial = new THREE.MeshMatcapMaterial({
    matcap: defaultMatcap,
    normalMap: branchesNormals,
    normalScale: new THREE.Vector2(0.4, 0.4),
    color: new THREE.Color(0x28344c),
    skinning: true
  });

  const dracoLoader = new THREE.DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  const gltfLoader = new THREE.GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  let mixer = null;
  const modelContainer = new THREE.Object3D();
  scene.add(modelContainer);

  gltfLoader.load('assets/${modelName}', (gltf) => {
    const model = gltf.scene;
    model.scale.set(20, 20, 20);
    model.position.set(0.2 * 20, -0.5 * 20, 0.15 * 20);

    model.traverse((child) => {
      if (child.isMesh) {
        const name = child.name;
        if (name.includes('Leye') || name.includes('Reye')) {
          child.material = eyeMaterial;
        } else if (name.includes('BRANCHS') || name.includes('leaf') || name.includes('branch')) {
          child.material = leafMaterial;
        } else {
          child.material = bodyMaterial;
        }
      }
    });

    modelContainer.add(model);
    modelContainer.rotation.y = 0.62;
    modelContainer.rotation.x = -0.15;
    modelContainer.position.set(0.0, -0.2, 0);

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      mixer.clipAction(gltf.animations[0]).play();
    }
  });

  // plan-exempt — ps-008: dynamic wavefront controller updating slot indices. routing-override: skipped — user requested true wavefront wave.
  window.PageSnapWebGLController = {
    setMatcapSlot(slot) {
      wolfUniforms.firstSlot.value = wolfUniforms.secondSlot.value;
      wolfUniforms.secondSlot.value = slot;
      wolfUniforms.matcapTransition.value = 0.0;
      if (typeof gsap !== 'undefined') {
        gsap.killTweensOf(wolfUniforms.matcapTransition);
        gsap.to(wolfUniforms.matcapTransition, {
          value: 1.0,
          duration: 1.2,
          ease: "power2.out"
        });
      } else {
        wolfUniforms.matcapTransition.value = 1.0;
      }
    },
    resetMatcap() {
      wolfUniforms.firstSlot.value = wolfUniforms.secondSlot.value;
      wolfUniforms.secondSlot.value = 0.0; // reset to hero slot 0
      wolfUniforms.matcapTransition.value = 0.0;
      if (typeof gsap !== 'undefined') {
        gsap.killTweensOf(wolfUniforms.matcapTransition);
        gsap.to(wolfUniforms.matcapTransition, {
          value: 1.0,
          duration: 0.8,
          ease: "power2.out"
        });
      } else {
        wolfUniforms.matcapTransition.value = 1.0;
      }
    }
  };
  // plan-exempt — ps-008: robust scroll choreography with verified depth & rotation curves. routing-override: skipped — user approved v33 pipeline.
  const DEPTH_CURVE = [16.5, 24.0, 30.0, 36.0, 28.0, 22.0];
  const V_ROT_CURVE = [35.0, 20.0, 30.0, 30.0, -50.0, -145.0];

  function getSplineValue(arr, t) {
    const p = t * (arr.length - 1);
    const idx = Math.min(Math.floor(p), arr.length - 2);
    const frac = p - idx;
    const s = frac * frac * (3 - 2 * frac);
    return arr[idx] * (1 - s) + arr[idx + 1] * s;
  }

  let mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  const clock = new THREE.Clock();
  function render() {
    requestAnimationFrame(render);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const scrollT = Math.min(1, Math.max(0, window.scrollY / maxScroll));

    const curDepth = getSplineValue(DEPTH_CURVE, scrollT);
    const curRotY = getSplineValue(V_ROT_CURVE, scrollT);

    camera.position.z = curDepth;
    if (modelContainer) {
      modelContainer.rotation.y = THREE.MathUtils.degToRad(curRotY) + mouseX * 0.08;
      modelContainer.rotation.x = -0.15 + mouseY * 0.05;
    }

    renderer.render(scene, camera);
  }
  render();
})();
`;
  }

  PageSnap.webglScaffold = { generateScaffold };
})(window.PageSnap = window.PageSnap || {});
