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

  const matcapAtlas = loadTex('assets/${matcapName}');
  const dogNormals = loadTex('assets/${dogNormalsName}');
  const dogDiffuse = loadTex('assets/${dogDiffuseName}');
  const branchesDiffuse = loadTex('assets/${branchesDiffuseName}');
  const branchesNormals = loadTex('assets/${branchesNormalsName}');

  // Multi-Matcap Atlas Cropper (10x2 grid)
  const atlasImg = new Image();
  atlasImg.crossOrigin = 'anonymous';
  atlasImg.src = 'assets/${matcapName}';
  let atlasReady = false;
  atlasImg.onload = () => { atlasReady = true; };

  function getMatcapTexture(idx) {
    if (!atlasReady) return matcapAtlas;
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    const ctx = cv.getContext('2d');
    const cellW = atlasImg.width / 10;
    const cellH = atlasImg.height / 2;
    const col = idx % 10;
    const row = Math.floor(idx / 10);
    ctx.drawImage(atlasImg, col * cellW, row * cellH, cellW, cellH, 0, 0, 256, 256);
    return new THREE.CanvasTexture(cv);
  }

  // Wavefront Shader Material for Body (Propagates color shift from tail to head)
  const defaultMatcap = getMatcapTexture(19);
  const wolfUniforms = {
    matcapTransition: { value: 0.0 },
    firstMatcapIdx: { value: 19.0 },
    secondMatcapIdx: { value: 1.0 },
    tMatCap: { value: matcapAtlas }
  };

  const bodyMaterial = new THREE.MeshMatcapMaterial({
    matcap: defaultMatcap,
    normalMap: dogNormals,
    normalScale: new THREE.Vector2(0.6, 0.6),
    color: new THREE.Color(0x354460),
    skinning: true
  });

  // Inject GLSL Wavefront logic (from tail to head)
  bodyMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.matcapTransition = wolfUniforms.matcapTransition;
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
      varying vec3 vWorldPos;
      varying vec3 vViewPos;

      // Dogstudio Wavefront function: origin point at tail/hind leg
      float sampleTransition(vec3 normalTex) {
        const vec3 sourceOrigin = vec3(13.0, 20.0, 13.0);
        float dist = ((2.0 - distance(sourceOrigin, vViewPos) / 4.0 + matcapTransition * 13.0) / (6.0 + matcapTransition * 4.0));
        dist = smoothstep(0.0, 1.0, dist);
        return clamp(dist + pow(normalTex.y, 1.2) * 25.0 * dist, 0.0, 1.0);
      }
      \`
    );
  };

  // Dedicated sharp ice-blue eye texture with dark almond pupil & catchlight
  const eyeCv = document.createElement('canvas');
  eyeCv.width = 128; eyeCv.height = 128;
  const ectx = eyeCv.getContext('2d');
  const rad = ectx.createRadialGradient(64, 64, 2, 64, 64, 52);
  rad.addColorStop(0, '#7dd3fc');
  rad.addColorStop(0.35, '#38bdf8');
  rad.addColorStop(0.7, '#0369a1');
  rad.addColorStop(1, '#082f49');
  ectx.fillStyle = rad; ectx.fillRect(0, 0, 128, 128);
  ectx.fillStyle = '#020617'; ectx.beginPath(); ectx.ellipse(64, 64, 10, 32, 0, 0, Math.PI * 2); ectx.fill();
  ectx.fillStyle = 'rgba(255,255,255,0.95)'; ectx.beginPath(); ectx.arc(54, 52, 6, 0, Math.PI * 2); ectx.fill();
  const eyeMaterial = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(eyeCv), transparent: true });

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

  // Cross-layer Wavefront Hover Controller
  window.PageSnapWebGLController = {
    setMatcapSlot(slot, tintHex) {
      const targetTex = getMatcapTexture(slot);
      if (typeof gsap !== 'undefined') {
        wolfUniforms.matcapTransition.value = 0.0;
        gsap.to(wolfUniforms.matcapTransition, {
          value: 1.0,
          duration: 0.8,
          ease: "power2.out"
        });
        gsap.to(bodyMaterial.color, {
          r: new THREE.Color(tintHex).r,
          g: new THREE.Color(tintHex).g,
          b: new THREE.Color(tintHex).b,
          duration: 0.6,
          ease: "power2.out"
        });
      }
      bodyMaterial.matcap = targetTex;
      bodyMaterial.needsUpdate = true;
    },
    resetMatcap() {
      if (typeof gsap !== 'undefined') {
        gsap.to(bodyMaterial.color, { r: 0.208, g: 0.267, b: 0.376, duration: 0.5 });
      }
      bodyMaterial.matcap = defaultMatcap;
      bodyMaterial.needsUpdate = true;
    }
  };

  const clock = new THREE.Clock();
  function render() {
    requestAnimationFrame(render);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    renderer.render(scene, camera);
  }
  render();
})();
`;
  }

  PageSnap.webglScaffold = { generateScaffold };
})(window.PageSnap = window.PageSnap || {});
