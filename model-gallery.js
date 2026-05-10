import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const previewCards = [...document.querySelectorAll("[data-model-card]")];

if (!previewCards.length) {
  // No gallery on this page.
} else {
  const isMobile =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;
  const gltfLoader = new GLTFLoader();
  const fbxLoader = new FBXLoader();
  fbxLoader.setResourcePath("./assets/ridgeline-2021/textures/");
  const previews = [];

  const previewConfigs = {
    truck: {
      urls: isMobile
        ? [
            "./assets/ridgeline-2021/honda-ridgeline-2021-ar.glb",
            "./assets/ridgeline-2021/honda-ridgeline-2021.glb",
            "./assets/ridgeline-2021/honda-ridgeline-2021.fbx"
          ]
        : [
            "./assets/ridgeline-2021/honda-ridgeline-2021.glb",
            "./assets/ridgeline-2021/honda-ridgeline-2021-ar.glb",
            "./assets/ridgeline-2021/honda-ridgeline-2021.fbx"
          ],
      cameraDirection: new THREE.Vector3(1.02, 0.2, 0.98),
      targetHeightRatio: 0.3,
      targetOffset: new THREE.Vector3(0, -0.36, 0),
      fit: 3.35,
      distanceMultiplier: isMobile ? 2.24 : 2.12,
      spinSpeed: 0.0055
    },
    engine: {
      urls: [],
      cameraDirection: new THREE.Vector3(1.03, 0.44, 0.96),
      targetOffset: new THREE.Vector3(0.04, -0.06, 0),
      fit: 3.9,
      distanceMultiplier: isMobile ? 1.76 : 1.7,
      spinSpeed: 0.006
    },
    tire: {
      urls: ["./assets/wheel-tire/ridgeline-tire-wheel.glb"],
      cameraDirection: new THREE.Vector3(1.06, 0.48, 0.98),
      targetOffset: new THREE.Vector3(0, 0.04, 0),
      fit: 3.2,
      distanceMultiplier: isMobile ? 1.68 : 1.58,
      spinSpeed: 0.007
    }
  };

  function loadFirstAvailableModel(urls) {
    return urls.reduce(
      (chain, url) =>
        chain.catch(
          () =>
            new Promise((resolve, reject) => {
              const isFbx = /\.fbx(?:$|\?)/i.test(url);
              const loader = isFbx ? fbxLoader : gltfLoader;
              loader.load(
                url,
                (asset) => resolve(isFbx ? asset : asset.scene),
                undefined,
                reject
              );
            })
        ),
      Promise.reject(new Error("No model URL provided."))
    );
  }

  function fitModel(modelRoot, fit) {
    const bounds = new THREE.Box3().setFromObject(modelRoot);
    const size = bounds.getSize(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z, 0.001);
    const scale = fit / longest;

    modelRoot.scale.multiplyScalar(scale);

    const scaledBounds = new THREE.Box3().setFromObject(modelRoot);
    const scaledSize = scaledBounds.getSize(new THREE.Vector3());
    const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
    const minY = scaledBounds.min.y;
    modelRoot.position.sub(scaledCenter);
    modelRoot.position.y -= minY;

    return {
      bounds: new THREE.Box3().setFromObject(modelRoot),
      size: scaledSize
    };
  }

  function framePreviewCamera(preview, config, modelBounds) {
    const sphere = modelBounds.getBoundingSphere(new THREE.Sphere());
    const direction = (config.cameraDirection || new THREE.Vector3(1, 0.46, 1))
      .clone()
      .normalize();
    const target = sphere.center.clone();
    const size = modelBounds.getSize(new THREE.Vector3());
    const min = modelBounds.min.clone();
    if (typeof config.targetHeightRatio === "number") {
      const ratio = THREE.MathUtils.clamp(config.targetHeightRatio, 0, 1);
      target.y = min.y + size.y * ratio;
    }
    if (config.targetOffset) {
      target.add(config.targetOffset);
    }

    const fov = THREE.MathUtils.degToRad(preview.camera.fov);
    const distanceMultiplier = config.distanceMultiplier || 1.62;
    const distance = (sphere.radius / Math.sin(fov / 2)) * distanceMultiplier;
    preview.camera.position.copy(target).add(direction.multiplyScalar(distance));
    preview.camera.lookAt(target);
    preview.camera.updateProjectionMatrix();
  }

  function createEnginePreviewFallback() {
    const group = new THREE.Group();

    const blockMaterial = new THREE.MeshStandardMaterial({
      color: 0xadb4bb,
      metalness: 0.56,
      roughness: 0.53
    });
    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x12171c,
      metalness: 0.24,
      roughness: 0.68
    });
    const beltMaterial = new THREE.MeshStandardMaterial({
      color: 0x0b0d10,
      metalness: 0.04,
      roughness: 0.88
    });
    const pulleyMaterial = new THREE.MeshStandardMaterial({
      color: 0xcad2d9,
      metalness: 0.88,
      roughness: 0.22
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0xff915e,
      metalness: 0.3,
      roughness: 0.36
    });

    const block = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.96, 1.34), blockMaterial);
    block.position.set(0, 0.75, 0);
    group.add(block);

    const leftHead = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.34, 0.56), darkMaterial);
    leftHead.position.set(0, 1.36, 0.44);
    group.add(leftHead);

    const rightHead = leftHead.clone();
    rightHead.position.z = -0.44;
    group.add(rightHead);

    const plenumMaterial = new THREE.MeshStandardMaterial({
      color: 0x7f8f9b,
      metalness: 0.4,
      roughness: 0.39
    });
    const intake = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.38, 0.96), plenumMaterial);
    intake.position.set(0, 1.68, 0);
    group.add(intake);

    const throttle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.24, 18),
      new THREE.MeshStandardMaterial({ color: 0xadb9c4, metalness: 0.72, roughness: 0.24 })
    );
    throttle.rotation.z = Math.PI / 2;
    throttle.position.set(0.78, 1.63, 0.02);
    group.add(throttle);

    const timingCover = new THREE.Mesh(new THREE.BoxGeometry(0.44, 1.24, 1.28), darkMaterial);
    timingCover.position.set(1.3, 0.78, 0);
    group.add(timingCover);

    const pulleyYs = [0.34, 0.86, 1.22];
    pulleyYs.forEach((y, index) => {
      const pulley = new THREE.Mesh(
        new THREE.CylinderGeometry(index === 0 ? 0.42 : 0.28, index === 0 ? 0.42 : 0.28, 0.12, 26),
        pulleyMaterial
      );
      pulley.rotation.z = Math.PI / 2;
      pulley.position.set(1.58, y, index === 1 ? 0.48 : index === 2 ? -0.48 : 0);
      group.add(pulley);
    });

    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.04, 14, 72), beltMaterial);
    belt.position.set(1.56, 0.8, 0);
    belt.rotation.y = Math.PI / 2;
    belt.scale.set(1, 1.56, 1);
    group.add(belt);

    const alternator = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 20), accentMaterial);
    alternator.position.set(1.78, 1.04, -0.46);
    alternator.rotation.z = Math.PI / 2;
    group.add(alternator);

    const acCompressor = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.34, 20), new THREE.MeshStandardMaterial({
      color: 0x7e8d99,
      metalness: 0.44,
      roughness: 0.4
    }));
    acCompressor.position.set(1.78, 0.46, 0.46);
    acCompressor.rotation.z = Math.PI / 2;
    group.add(acCompressor);

    const starter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.28, 18),
      new THREE.MeshStandardMaterial({ color: 0x9099a5, metalness: 0.52, roughness: 0.38 })
    );
    starter.rotation.z = Math.PI / 2;
    starter.position.set(-1.1, 0.44, 0.36);
    group.add(starter);

    const oilFilter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.24, 18),
      new THREE.MeshStandardMaterial({ color: 0xf0f4f9, metalness: 0.08, roughness: 0.82 })
    );
    oilFilter.position.set(0.98, 0.32, -0.54);
    group.add(oilFilter);

    const mount = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.24, 0.56),
      new THREE.MeshStandardMaterial({ color: 0x636e7b, metalness: 0.26, roughness: 0.62 })
    );
    mount.position.set(-1.24, 1.06, 0.02);
    group.add(mount);

    const base = new THREE.Mesh(
      new THREE.CircleGeometry(2.2, 56),
      new THREE.MeshBasicMaterial({ color: 0x1c3852, transparent: true, opacity: 0.18 })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.02;
    group.add(base);

    return group;
  }

  function createFallbackModel(type) {
    if (type === "engine") {
      return createEnginePreviewFallback();
    }

    if (type === "tire") {
      const group = new THREE.Group();
      const tire = new THREE.Mesh(
        new THREE.TorusGeometry(1.1, 0.42, 24, 72),
        new THREE.MeshStandardMaterial({ color: 0x12171d, metalness: 0.06, roughness: 0.85 })
      );
      tire.rotation.y = Math.PI / 2;
      group.add(tire);
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.75, 0.4, 36),
        new THREE.MeshStandardMaterial({ color: 0xbdc7cf, metalness: 0.92, roughness: 0.2 })
      );
      wheel.rotation.z = Math.PI / 2;
      group.add(wheel);
      return group;
    }

    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x4f5964,
      metalness: 0.52,
      roughness: 0.46
    });
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x8ea8bf,
      metalness: 0.26,
      roughness: 0.18,
      transparent: true,
      opacity: 0.72
    });
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x121820,
      metalness: 0.26,
      roughness: 0.68
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(3.98, 0.84, 1.7), bodyMaterial);
    body.position.set(0, 1, 0);
    group.add(body);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.72, 1.52), bodyMaterial);
    cab.position.set(0.48, 1.64, 0);
    group.add(cab);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.36, 1.42), glassMaterial);
    windshield.position.set(1.05, 1.66, 0);
    windshield.rotation.z = -0.12;
    group.add(windshield);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 1.22), trimMaterial);
    grille.position.set(1.99, 0.95, 0);
    group.add(grille);

    const wheelOffsets = [
      [1.18, 0.42, 0.84],
      [1.18, 0.42, -0.84],
      [-1.22, 0.42, 0.84],
      [-1.22, 0.42, -0.84]
    ];
    wheelOffsets.forEach(([x, y, z]) => {
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.36, 0.24, 26),
        new THREE.MeshStandardMaterial({ color: 0x0b0d10, metalness: 0.05, roughness: 0.9 })
      );
      tire.rotation.z = Math.PI / 2;
      tire.position.set(x, y, z);
      group.add(tire);
    });

    return group;
  }

  function initCard(card) {
    const type = card.dataset.modelCard;
    const config = previewConfigs[type];
    const stage = card.querySelector("[data-model-preview]");

    if (!config || !stage) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 220);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.2 : 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.domElement.className = "model-preview-canvas";
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.pointerEvents = "none";
    stage.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.03).texture;
    pmremGenerator.dispose();

    scene.add(new THREE.HemisphereLight(0xe6f5ff, 0x111722, 1.22));
    const key = new THREE.DirectionalLight(0xf3f9ff, 1.45);
    key.position.set(5.2, 7.6, 4.4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6ad8ff, 0.9);
    fill.position.set(-4.4, 2.6, -4.8);
    scene.add(fill);
    const warm = new THREE.PointLight(0xffaa7a, 1.1, 12);
    warm.position.set(-2.2, 2.4, 1.8);
    scene.add(warm);

    const turntable = new THREE.Group();
    scene.add(turntable);

    const base = new THREE.Mesh(
      new THREE.RingGeometry(1.7, 2.5, 80),
      new THREE.MeshBasicMaterial({
        color: 0x61dfff,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide
      })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = 0.01;
    turntable.add(base);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 80),
      new THREE.MeshBasicMaterial({
        color: 0x1c3650,
        transparent: true,
        opacity: 0.16
      })
    );
    floor.rotation.x = -Math.PI / 2;
    turntable.add(floor);

    const preview = {
      renderer,
      camera,
      scene,
      turntable,
      type,
      width: 0,
      height: 0,
      visible: false,
      spinSpeed: config.spinSpeed
    };
    previews.push(preview);

    const modelPromise =
      config.urls.length > 0
        ? loadFirstAvailableModel(config.urls).catch(() => createFallbackModel(type))
        : Promise.resolve(createFallbackModel(type));

    modelPromise.then((model) => {
      const fitted = fitModel(model, config.fit);
      turntable.add(model);
      framePreviewCamera(preview, config, fitted.bounds);
      preview.visible = true;
    });
  }

  previewCards.forEach((card) => initCard(card));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const preview = previews.find((item) => item.renderer.domElement.parentElement === entry.target.querySelector("[data-model-preview]"));
        if (preview) {
          preview.visible = entry.isIntersecting;
        }
      });
    },
    { threshold: 0.2 }
  );

  previewCards.forEach((card) => observer.observe(card));

  function resizePreview(preview) {
    const host = preview.renderer.domElement.parentElement;
    if (!host) {
      return false;
    }
    const rect = host.getBoundingClientRect();
    const width = Math.round(host.clientWidth || rect.width);
    const height = Math.round(host.clientHeight || rect.height);
    if (!width || !height) {
      return false;
    }
    if (preview.width === width && preview.height === height) {
      return true;
    }
    preview.width = width;
    preview.height = height;
    preview.renderer.setSize(width, height, false);
    preview.camera.aspect = width / height;
    preview.camera.updateProjectionMatrix();
    return true;
  }

  function animate() {
    const canRender = !document.hidden;
    previews.forEach((preview) => {
      if (!preview.visible || !canRender) {
        return;
      }
      if (!resizePreview(preview)) {
        return;
      }

      preview.turntable.rotation.y += preview.spinSpeed;
      preview.renderer.render(preview.scene, preview.camera);
    });

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
