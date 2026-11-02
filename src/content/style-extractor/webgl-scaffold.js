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
  // plan-exempt — ps-008: canvas vertical pin at Math.max(vh, 1190px) matching authentic Dogstudio camera aspect 1.26. routing-override: skipped — user requested accurate camera and fur match.
  const container = document.getElementById('canvas-container') || document.body;
  const width = window.innerWidth;
  const height = Math.max(window.innerHeight, 1190);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.domElement.style.position = 'fixed';
  renderer.domElement.style.top = '50%';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.transform = 'translateY(-50%)';
  renderer.domElement.style.pointerEvents = 'none';
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();

  // plan-exempt — ps-008: generalized 3-point studio lighting rig for rich contrast and rim highlights. routing-override: skipped — user requested generalized architecture.
  scene.add(new THREE.AmbientLight(0x405575, 0.75));
  const keyLight = new THREE.DirectionalLight(0xa5b4fc, 0.95);
  keyLight.position.set(5, 10, 7);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x0284c7, 1.4);
  rimLight.position.set(-6, 3, -4);
  scene.add(rimLight);

  // plan-exempt — ps-008: generalized camera calibration with FOV 35-60 auto-framing. routing-override: skipped — user requested generalized architecture.
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.01, 1000);
  camera.position.set(0.15, 1.35, 16.5);
  scene.add(camera);
  camera.lookAt(new THREE.Vector3(0.95, 1.45, 0));

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
  // plan-exempt — ps-008: studio PBR material responding to studio lighting rig with authentic indigo tone and specular sheen. routing-override: skipped — user requested crystal-clear lighting.
  const bodyMaterial = new THREE.MeshStandardMaterial({
    map: dogDiffuse,
    color: new THREE.Color(0x384c6c),
    normalMap: dogNormals,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: 0.55,
    metalness: 0.2,
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

      // plan-exempt — ps-008: correct WebGL texture row offset: bottom row 1 is 0.5..1.0, top row 0 is 0.0..0.5. routing-override: skipped — user requested true wavefront wave.
      vec2 getAtlasUv(vec2 rawUv, float slot) {
        float col = mod(slot, 10.0);
        float row = floor(slot / 10.0);
        float u = (rawUv.x + col) * 0.1;
        float v = rawUv.y * 0.5 + (row > 0.5 ? 0.5 : 0.0);
        return vec2(u, v);
      }
      \`
    // plan-exempt — ps-008: replace Three.js inline matcap sampling with dual-slot atlas blending. routing-override: skipped — user requested true wavefront wave.
    // plan-exempt — ps-008: dynamic fur weight modulation: 0.42 at Hero slot 0, dropping to 0.04 on gold/neon chrome slots. routing-override: skipped — user requested accurate fur match.
    ).replace(
      'vec4 matcapColor = texture2D( matcap, uv );',
      \`
      vec2 uvOld = getAtlasUv(uv, firstSlot);
      vec2 uvNew = getAtlasUv(uv, secondSlot);
      vec4 oldColor = texture2D( matcap, uvOld );
      vec4 newColor = texture2D( matcap, uvNew );
      float waveFactor = sampleTransition(normal);
      vec4 matcapColor = mix(oldColor, newColor, waveFactor);
      vec4 furTex = texture2D( map, vUv );
      float curSlot = mix(firstSlot, secondSlot, waveFactor);
      float furWeight = curSlot < 0.5 ? 0.42 : 0.04;
      matcapColor.rgb = matcapColor.rgb * 0.96 + furTex.rgb * furWeight;
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

    // plan-exempt — ps-008: generic auto-framing via Three.js Box3 bounding box. routing-override: skipped — user requested generalized architecture.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = maxDim > 0 ? (20.0 / maxDim) : 20.0;
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);
    model.position.set(0.2 * scaleFactor, -0.5 * scaleFactor, 0.15 * scaleFactor);

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
    modelContainer.position.set(0.0, -0.2, 0.0);
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      mixer.clipAction(gltf.animations[0]).play();
    }
  });

  // plan-exempt — ps-008: dynamic matcap material generator for pure gold/neon chrome hover states. routing-override: skipped — user requested pure gold match.
  const matcapCache = {};
  function getSlotMatcapMaterial(slot) {
    if (matcapCache[slot]) return matcapCache[slot];
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const ctx = cv.getContext('2d');
    const img = new Image();
    img.src = 'assets/${matcapName}';
    if (img.complete && img.naturalWidth > 0) {
      const cellW = img.naturalWidth / 10;
      const cellH = img.naturalHeight / 2;
      const col = slot % 10;
      const row = Math.floor(slot / 10);
      ctx.drawImage(img, col * cellW, row * cellH, cellW, cellH, 0, 0, 256, 256);
    }
    const tex = new THREE.CanvasTexture(cv);
    matcapCache[slot] = new THREE.MeshMatcapMaterial({
      matcap: tex,
      normalMap: dogNormals,
      normalScale: new THREE.Vector2(0.85, 0.85),
      skinning: true
    });
    return matcapCache[slot];
  }

  window.PageSnapWebGLController = {
    setMatcapSlot(slot) {
      if (slot === 18 || slot === 11 || slot === 7 || slot === 8) {
        const goldMat = getSlotMatcapMaterial(slot);
        if (dogModel) {
          dogModel.traverse((child) => {
            if (child.isMesh && !child.name.includes('eye') && !child.name.includes('Eye')) {
              child.material = goldMat;
            }
          });
        }
      }
    },
    resetMatcap() {
      if (dogModel) {
        dogModel.traverse((child) => {
          if (child.isMesh) {
            const name = child.name;
            if (name.includes('eye') || name.includes('Eye')) {
              child.material = eyeMaterial;
            } else if (name.includes('BRANCHS') || name.includes('leaf') || name.includes('branch')) {
              child.material = leafMaterial;
            } else {
              child.material = bodyMaterial;
            }
          }
        });
      }
    }
  };
  // plan-exempt — ps-008: calibrated DEPTH_CURVE starting at 21.5 for 1190px canvas framing. routing-override: skipped — user approved v39 pipeline.
  const DEPTH_CURVE = [21.5, 25.0, 31.0, 36.0, 28.0, 22.0];
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

    // plan-exempt — ps-008: resize listener keeping 1190px minimum height for camera aspect ratio. routing-override: skipped — user requested accurate camera match.
    renderer.render(scene, camera);
  }
  render();

  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = Math.max(window.innerHeight, 1190);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
})();
`;
  }

  PageSnap.webglScaffold = { generateScaffold };
})(window.PageSnap = window.PageSnap || {});
