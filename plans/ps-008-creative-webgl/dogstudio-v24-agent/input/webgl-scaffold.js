
/* PageSnap WebGL Architecture Scaffold — Multi-Layer Creative WebGL Engine */
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

  const matcapAtlas = loadTex('assets/matcap-combined-resized.jpg');
  const normals = loadTex('assets/branches_normals.dds');
  const diffuse = loadTex('assets/dog_diffuse.dds');

  // Multi-Matcap Atlas Cropper (10x2 grid)
  const atlasImg = new Image();
  atlasImg.crossOrigin = 'anonymous';
  atlasImg.src = 'assets/matcap-combined-resized.jpg';
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

  // Materials: separate wolf body and dedicated eyes
  const defaultMatcap = loadTex('assets/matcap-combined-resized.jpg');
  const bodyMaterial = new THREE.MeshMatcapMaterial({
    matcap: defaultMatcap,
    normalMap: normals,
    normalScale: new THREE.Vector2(0.55, 0.55),
    color: new THREE.Color(0x28344c),
    skinning: true
  });

  // Dedicated sharp ice-blue eye texture with catchlight
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

  // Cross-layer hover binding
  window.PageSnapWebGLController = {
    setMatcapSlot(slot, tintHex) {
      const tex = getMatcapTexture(slot);
      if (typeof gsap !== 'undefined') {
        gsap.to(bodyMaterial.color, {
          r: new THREE.Color(tintHex).r,
          g: new THREE.Color(tintHex).g,
          b: new THREE.Color(tintHex).b,
          duration: 0.5,
          ease: "power2.out"
        });
      }
      bodyMaterial.matcap = tex;
      bodyMaterial.needsUpdate = true;
    },
    resetMatcap() {
      if (typeof gsap !== 'undefined') {
        gsap.to(bodyMaterial.color, { r: 0.156, g: 0.203, b: 0.298, duration: 0.5 });
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
