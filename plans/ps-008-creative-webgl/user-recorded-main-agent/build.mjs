// plan-exempt — build script to generate standalone index.html per PROMPT.md
import fs from 'node:fs';
import path from 'node:path';

// 1. Copy input/styles.css to styles.css
fs.copyFileSync('input/styles.css', 'styles.css');
console.log('Copied input/styles.css -> styles.css');

// 2. Read input/index.html and extract the main wrapper
const rawHtml = fs.readFileSync('input/index.html', 'utf8');
const start = rawHtml.indexOf('<div class="pagesnap-component-wrapper">');
const end = rawHtml.lastIndexOf('</div>');
if (start === -1 || end === -1) {
  throw new Error('Could not find .pagesnap-component-wrapper in input/index.html');
}

const domSnippet = rawHtml.slice(start, end + 6);

const html = `<!DOCTYPE html>
<!-- plan-exempt — standalone index.html for Dogstudio component per PROMPT.md -->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dogstudio — Creative Studio at the Intersection of Art, Design and Technology</title>
  
  <!-- Google Fonts: Heebo & Cormorant Garamond -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Heebo:wght@200;300;400;500;700&display=swap" rel="stylesheet">
  
  <!-- Preload Louise Phone Artwork -->
  <link rel="preload" as="image" href="https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-1440.png">

  <!-- Extracted Stylesheet -->
  <link rel="stylesheet" href="./styles.css">

  <style>
    /* 1. Global Reset & Stacking Context */
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: 100vh;
      background: transparent !important;
      color: #fff;
      font-family: Heebo, Helvetica, Arial, sans-serif;
      overflow-x: hidden;
      box-sizing: border-box;
    }

    /* 2. Layering Architecture */
    /* #bg-layer: fixed deep black #090a0f with ./assets/background-xl.png at z-index -3 */
    #bg-layer {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: -3;
      background-color: #090a0f;
      background-image: url('./assets/background-xl.png');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      pointer-events: none;
    }

    /* #case-art-layer: fixed artwork background at z-index -2 (hidden by default, opacity transition 0.5s) */
    #case-art-layer {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: -2;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      opacity: 0;
      transition: opacity 0.5s ease;
      pointer-events: none;
    }

    /* #canvas-container: 3D WebGL canvas at z-index -1 */
    #canvas-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: -1;
      pointer-events: none;
    }

    #canvas-container canvas {
      display: block;
      width: 100% !important;
      height: 100% !important;
    }

    /* #dom-wrapper: DOM content at z-index 1 */
    #dom-wrapper {
      position: relative;
      z-index: 1;
      width: 100%;
      background: transparent !important;
      pointer-events: auto;
    }

    /* Component wrapper styling */
    .pagesnap-component-wrapper {
      background-color: transparent !important;
      width: 100%;
      max-width: 1500px;
      margin: 0 auto;
      position: relative;
    }

    /* Hide static redundant background inside DOM so WebGL canvas shows through cleanly */
    picture.home-background,
    picture.home-about-background,
    .home-cases-scenes {
      display: none !important;
    }

    /* Header Nav & Branding */
    .site-header {
      position: fixed;
      top: 36px;
      left: 48px;
      right: 48px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      z-index: 20;
      pointer-events: none;
    }
    .site-header a, .site-header button {
      pointer-events: auto;
    }
    .brand-logo {
      font-family: Heebo, sans-serif;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.05em;
      color: #fff;
      text-decoration: none;
      line-height: 1.15;
      display: block;
    }
    .brand-logo span {
      display: block;
      opacity: 0.8;
      font-size: 12px;
      font-weight: 500;
    }
    .nav-toggle {
      background: none;
      border: none;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 7px;
      padding: 6px;
    }
    .nav-toggle span {
      display: block;
      width: 26px;
      height: 2px;
      background: #fff;
      transition: transform 0.3s ease;
    }

    /* Cross-layer hover interactivity & links */
    .home-cases-list,
    .home-cases-list li,
    .home-cases-list a {
      pointer-events: auto !important;
      cursor: pointer;
    }

    .home-cases-list li a {
      transition: opacity 0.4s ease, color 0.4s ease;
    }

    .home-cases-list li a:hover {
      color: #fff !important;
    }

    /* Typography Polish */
    .home-hero-title, .ps-el-14,
    .home-about-title, .ps-el-251 {
      font-family: "GT Sectra Display", "Cormorant Garamond", Georgia, serif !important;
    }

    /* Reveal all animated text in .home-about section */
    .home-about-headline,
    .home-about-title,
    .home-about-title *,
    .home-about-text,
    .home-about-text *,
    .home-about-link,
    .home-about-link *,
    .ps-el-250, .ps-el-251, .ps-el-253, .ps-el-254, .ps-el-255, .ps-el-256, .ps-el-257,
    .ps-el-259, .ps-el-260, .ps-el-261, .ps-el-262, .ps-el-263, .ps-el-264, .ps-el-265, .ps-el-266,
    .ps-el-269, .ps-el-270, .ps-el-271, .ps-el-272, .ps-el-273, .ps-el-274, .ps-el-275, .ps-el-276, .ps-el-277,
    .ps-el-280, .ps-el-281, .ps-el-282, .ps-el-283, .ps-el-284, .ps-el-285, .ps-el-286, .ps-el-287, .ps-el-288, .ps-el-289, .ps-el-290,
    .ps-el-292, .ps-el-293, .ps-el-294, .ps-el-295, .ps-el-296,
    .ps-el-299, .ps-el-300,
    .ps-el-302, .ps-el-303, .ps-el-304, .ps-el-305, .ps-el-306, .ps-el-307, .ps-el-308, .ps-el-309, .ps-el-310,
    .ps-el-313, .ps-el-314, .ps-el-315, .ps-el-316, .ps-el-317, .ps-el-318, .ps-el-319,
    .ps-el-324, .ps-el-326, .ps-el-327 {
      opacity: 1 !important;
      transform: none !important;
      visibility: visible !important;
    }

    /* Sound indicator on bottom right */
    .sound-toggle {
      position: fixed;
      bottom: 36px;
      right: 48px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 20;
      cursor: pointer;
      pointer-events: auto;
    }
    .sound-toggle::after {
      content: '';
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #fff;
    }
  </style>

  <!-- External CDNs -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
</head>
<body>

  <!-- Layer -3: Fixed Deep Black Background with background-xl.png -->
  <div id="bg-layer"></div>

  <!-- Layer -2: Fixed Case Artwork Background (hidden by default, opacity transition 0.5s) -->
  <div id="case-art-layer"></div>

  <!-- Layer -1: 3D WebGL Canvas Container -->
  <div id="canvas-container"></div>

  <!-- Layer 1: Interactive DOM Wrapper -->
  <div id="dom-wrapper">
    <header class="site-header">
      <a href="#" class="brand-logo">DOGSTUDIO<span>/ DEPT.</span></a>
      <button class="nav-toggle" aria-label="Menu">
        <span></span>
        <span></span>
      </button>
    </header>

    ${domSnippet}

    <div class="sound-toggle" title="Toggle Sound"></div>
  </div>

  <!-- WebGL Controller & Three.js Architecture -->
  <script>
  (async function initPageSnapWebGL() {
    const container = document.getElementById('canvas-container') || document.body;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Camera setup: FOV 35 placed close-up (0.2, 1.6, 22.0) looking at (1.1, 1.8, 0)
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

    const dogNormals = loadTex('assets/dog_normals.jpg');
    const branchesNormals = loadTex('assets/branches_normals.dds');

    // Multi-Matcap Atlas Cropper (10x2 grid on matcap-combined-resized.jpg)
    const atlasImg = new Image();
    atlasImg.crossOrigin = 'anonymous';
    atlasImg.src = 'assets/matcap-combined-resized.jpg';
    await new Promise((resolve) => {
      if (atlasImg.complete) {
        resolve();
      } else {
        atlasImg.onload = resolve;
        atlasImg.onerror = resolve;
      }
    });

    const cellW = atlasImg.width / 10;
    const cellH = atlasImg.height / 2;

    function getMatcapTexture(idx) {
      const cv = document.createElement('canvas');
      cv.width = 256;
      cv.height = 256;
      const ctx = cv.getContext('2d');
      const col = idx % 10;
      const row = Math.floor(idx / 10);
      ctx.drawImage(atlasImg, col * cellW, row * cellH, cellW, cellH, 0, 0, 256, 256);
      return new THREE.CanvasTexture(cv);
    }

    // Default matcap slot 19/1 with subtle midnight navy tint (0x28344c)
    const defaultMatcap = getMatcapTexture(1);
    const wolfUniforms = {
      matcapTransition: { value: 0.0 }
    };

    const bodyMaterial = new THREE.MeshMatcapMaterial({
      matcap: defaultMatcap,
      normalMap: dogNormals,
      normalScale: new THREE.Vector2(0.55, 0.55),
      color: new THREE.Color(0x28344c),
      skinning: true
    });

    // Uses sampleTransition wavefront shader so hover color propagates from tail to head
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
      ).replace(
        '#include <dithering_fragment>',
        \`float wavefront = sampleTransition(normal);
        outgoingLight = mix(outgoingLight * (1.0 - 0.2 * matcapTransition), outgoingLight * (1.0 + 0.3 * wavefront), wavefront);
        #include <dithering_fragment>
        \`
      );
    };

    const leafMaterial = new THREE.MeshMatcapMaterial({
      matcap: defaultMatcap,
      normalMap: branchesNormals,
      normalScale: new THREE.Vector2(0.4, 0.4),
      color: new THREE.Color(0x28344c),
      skinning: true
    });

    // Dedicated sharp ice-blue eye material for Leye and Reye with catchlight (DO NOT overwrite with body matcap)
    const eyeCv = document.createElement('canvas');
    eyeCv.width = 128;
    eyeCv.height = 128;
    const ectx = eyeCv.getContext('2d');
    const rad = ectx.createRadialGradient(64, 64, 2, 64, 64, 52);
    rad.addColorStop(0, '#7dd3fc');
    rad.addColorStop(0.35, '#38bdf8');
    rad.addColorStop(0.7, '#0369a1');
    rad.addColorStop(1, '#082f49');
    ectx.fillStyle = rad;
    ectx.fillRect(0, 0, 128, 128);
    ectx.fillStyle = '#020617';
    ectx.beginPath();
    ectx.ellipse(64, 64, 10, 32, 0, 0, Math.PI * 2);
    ectx.fill();
    ectx.fillStyle = 'rgba(255,255,255,0.95)';
    ectx.beginPath();
    ectx.arc(54, 52, 6, 0, Math.PI * 2);
    ectx.fill();
    const eyeMaterial = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(eyeCv),
      transparent: true
    });

    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const gltfLoader = new THREE.GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    let mixer = null;
    const modelContainer = new THREE.Object3D();
    scene.add(modelContainer);

    gltfLoader.load('assets/dog.drc.glb', (gltf) => {
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

      window.__webglReady = true;
    });

    // Cross-layer Hover Controller
    window.PageSnapWebGLController = {
      setMatcapSlot(slot, tintHex) {
        const tex = getMatcapTexture(slot);
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
          gsap.to(leafMaterial.color, {
            r: new THREE.Color(tintHex).r,
            g: new THREE.Color(tintHex).g,
            b: new THREE.Color(tintHex).b,
            duration: 0.6,
            ease: "power2.out"
          });
        } else {
          bodyMaterial.color.setHex(tintHex);
          leafMaterial.color.setHex(tintHex);
        }
        bodyMaterial.matcap = tex;
        bodyMaterial.needsUpdate = true;
        leafMaterial.matcap = tex;
        leafMaterial.needsUpdate = true;
      },
      resetMatcap() {
        if (typeof gsap !== 'undefined') {
          wolfUniforms.matcapTransition.value = 0.0;
          gsap.to(bodyMaterial.color, {
            r: 0.157,
            g: 0.204,
            b: 0.298,
            duration: 0.5,
            ease: "power2.out"
          });
          gsap.to(leafMaterial.color, {
            r: 0.157,
            g: 0.204,
            b: 0.298,
            duration: 0.5,
            ease: "power2.out"
          });
        } else {
          bodyMaterial.color.setHex(0x28344c);
          leafMaterial.color.setHex(0x28344c);
        }
        bodyMaterial.matcap = defaultMatcap;
        bodyMaterial.needsUpdate = true;
        leafMaterial.matcap = defaultMatcap;
        leafMaterial.needsUpdate = true;
      }
    };

    // Empirical Interaction Data (interaction-recording.json, max scroll 2600-2978px)
    // Connect window.scrollY to interpolate camera depth and wolf rotation:
    // When scroll reaches bottom (~2400-2970px), wolf rotates 180° showing its back.
    const depths = [22, 28, 34, 38, 30, 25];
    const rotYs = [35.5, 20, 30, 30, -50, -145]; // in degrees: 35.5° -> -145° (exact 180° rotation)

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

    function updateChoreography() {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      const p = Math.min(Math.max(scrollY / 2600, 0), 1);
      const curDepth = getSplineValue(depths, p);
      const curRotY = getSplineValue(rotYs, p);

      camera.position.z = curDepth;
      camera.lookAt(new THREE.Vector3(1.1, 1.8, 0));

      if (modelContainer) {
        modelContainer.rotation.y = THREE.MathUtils.degToRad(curRotY) + mouseX * 0.05;
        modelContainer.rotation.x = -0.15 + mouseY * 0.03;
      }
    }

    window.addEventListener('scroll', updateChoreography, { passive: true });

    // Handle Window Resize
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    // Render Loop
    const clock = new THREE.Clock();
    function render() {
      requestAnimationFrame(render);
      const delta = clock.getDelta();
      if (mixer) mixer.update(delta);
      updateChoreography();
      renderer.render(scene, camera);
    }
    render();
  })();

  // 3. Cross-Layer Hover Bindings
  document.addEventListener('DOMContentLoaded', () => {
    const caseArtLayer = document.getElementById('case-art-layer');
    const caseLinks = document.querySelectorAll('.home-cases-list a');

    const themeMap = {
      'this-was-louises-phone': {
        art: 'https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/this-was-louises-phone/background-1440.png',
        slot: 11,
        tint: 0xd946ef
      },
      'tomorrowland': {
        art: 'https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/tomorrowland/background-1440.png',
        slot: 18,
        tint: 0xd79a21
      },
      'navy-pier': {
        art: 'https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/navy-pier/background-1440.png',
        slot: 7,
        tint: 0x5fc4aa
      },
      'msi-chicago': {
        art: 'https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/msi-chicago/background-1440.png',
        slot: 8,
        tint: 0x58a5c4
      },
      'kikk-18': {
        art: 'https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/kikk-18/background-1440.png',
        slot: 9,
        tint: 0xa855f7
      },
      'the-kennedy-center': {
        art: 'https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/the-kennedy-center/background-1440.png',
        slot: 10,
        tint: 0x38bdf8
      },
      'orw': {
        art: 'https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/orw/background-1440.png',
        slot: 12,
        tint: 0xd4af37
      }
    };

    caseLinks.forEach((link) => {
      const theme = link.getAttribute('data-theme') || '';
      const matcapAttr = link.getAttribute('data-matcap') || '';
      const defaultSlot = matcapAttr ? parseInt(matcapAttr.split(',')[0].trim(), 10) : 11;
      const config = themeMap[theme] || {
        art: 'https://dogstudio.co/app/themes/portfolio-2018/static/assets/images/cases/' + theme + '/background-1440.png',
        slot: defaultSlot,
        tint: 0xd946ef
      };

      const handleEnter = () => {
        caseArtLayer.style.backgroundImage = 'url("' + config.art + '")';
        caseArtLayer.style.opacity = '1';

        if (window.PageSnapWebGLController) {
          window.PageSnapWebGLController.setMatcapSlot(config.slot, config.tint);
        }

        caseLinks.forEach((other) => {
          if (other !== link) {
            other.style.opacity = '0.2';
          } else {
            other.style.opacity = '1';
          }
        });
      };

      const handleLeave = () => {
        caseArtLayer.style.opacity = '0';

        if (window.PageSnapWebGLController) {
          window.PageSnapWebGLController.resetMatcap();
        }

        caseLinks.forEach((other) => {
          other.style.opacity = '1';
        });
      };

      link.addEventListener('mouseenter', handleEnter);
      link.addEventListener('mouseover', handleEnter);
      link.addEventListener('mouseleave', handleLeave);
    });
  });
  </script>
</body>
</html>
`;

fs.writeFileSync('index.html', html);
console.log('Successfully generated index.html, size:', html.length);
