import * as THREE from "three";
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
  const previews = [];

  const previewConfigs = {
    truck: {
      urls: isMobile
        ? [
            "./assets/ridgeline-2021/honda-ridgeline-2021-ar.glb",
            "./assets/ridgeline-2021/honda-ridgeline-2021.glb"
          ]
        : [
            "./assets/ridgeline-2021/honda-ridgeline-2021.glb",
            "./assets/ridgeline-2021/honda-ridgeline-2021-ar.glb"
          ],
      cameraPosition: new THREE.Vector3(3.9, 2.2, 3.8),
      target: new THREE.Vector3(0, 0.8, 0),
      fit: 4.4,
      spinSpeed: 0.0055
    },
    engine: {
      urls: [],
      cameraPosition: new THREE.Vector3(2.9, 1.9, 2.8),
      target: new THREE.Vector3(0, 0.8, 0),
      fit: 3.6,
      spinSpeed: 0.006
    },
    tire: {
      urls: ["./assets/wheel-tire/ridgeline-tire-wheel.glb"],
      cameraPosition: new THREE.Vector3(2.8, 1.2, 2.7),
      target: new THREE.Vector3(0, 0.7, 0),
      fit: 3.2,
      spinSpeed: 0.007
    }
  };

  function loadFirstAvailableModel(urls) {
    return urls.reduce(
      (chain, url) =>
        chain.catch(
          () =>
            new Promise((resolve, reject) => {
              gltfLoader.load(
                url,
                (gltf) => resolve(gltf.scene),
                undefined,
                (error) => reject(error)
              );
            })
        ),
      Promise.reject(new Error("No model URL provided."))
    );
  }

  function fitModel(modelRoot, fit) {
    const bounds = new THREE.Box3().setFromObject(modelRoot);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const longest = Math.max(size.x, size.y, size.z, 0.001);
    const scale = fit / longest;

    modelRoot.scale.multiplyScalar(scale);

    const scaledBounds = new THREE.Box3().setFromObject(modelRoot);
    const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
    const minY = scaledBounds.min.y;
    modelRoot.position.sub(scaledCenter);
    modelRoot.position.y -= minY;
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

    const block = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.95, 1.3), blockMaterial);
    block.position.set(0, 0.75, 0);
    group.add(block);

    const leftHead = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.33, 0.52), darkMaterial);
    leftHead.position.set(0, 1.36, 0.42);
    group.add(leftHead);

    const rightHead = leftHead.clone();
    rightHead.position.z = -0.42;
    group.add(rightHead);

    const intake = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.36, 0.9), new THREE.MeshStandardMaterial({
      color: 0x7f8f9b,
      metalness: 0.34,
      roughness: 0.44
    }));
    intake.position.set(0, 1.65, 0);
    group.add(intake);

    const timingCover = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.2, 1.25), darkMaterial);
    timingCover.position.set(1.26, 0.76, 0);
    group.add(timingCover);

    const pulleyYs = [0.34, 0.86, 1.2];
    pulleyYs.forEach((y, index) => {
      const pulley = new THREE.Mesh(new THREE.CylinderGeometry(index === 0 ? 0.4 : 0.28, index === 0 ? 0.4 : 0.28, 0.12, 26), pulleyMaterial);
      pulley.rotation.z = Math.PI / 2;
      pulley.position.set(1.56, y, index === 1 ? 0.45 : index === 2 ? -0.45 : 0);
      group.add(pulley);
    });

    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.04, 14, 72), beltMaterial);
    belt.position.set(1.54, 0.8, 0);
    belt.rotation.y = Math.PI / 2;
    belt.scale.set(1, 1.52, 1);
    group.add(belt);

    const alternator = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 20), accentMaterial);
    alternator.position.set(1.72, 1.02, -0.42);
    alternator.rotation.z = Math.PI / 2;
    group.add(alternator);

    const acCompressor = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.34, 20), new THREE.MeshStandardMaterial({
      color: 0x7e8d99,
      metalness: 0.44,
      roughness: 0.4
    }));
    acCompressor.position.set(1.72, 0.46, 0.42);
    acCompressor.rotation.z = Math.PI / 2;
    group.add(acCompressor);

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
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.9, 0.95, 1.65),
      new THREE.MeshStandardMaterial({ color: 0x4d565f, metalness: 0.42, roughness: 0.54 })
    );
    body.position.set(0, 0.95, 0);
    group.add(body);
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.7, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x555f69, metalness: 0.4, roughness: 0.52 })
    );
    cab.position.set(0.38, 1.72, 0);
    group.add(cab);
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
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.copy(config.cameraPosition);
    camera.lookAt(config.target);

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
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
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
      fitModel(model, config.fit);
      turntable.add(model);
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
      return;
    }
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) {
      return;
    }
    if (preview.width === width && preview.height === height) {
      return;
    }
    preview.width = width;
    preview.height = height;
    preview.renderer.setSize(width, height, false);
    preview.camera.aspect = width / height;
    preview.camera.updateProjectionMatrix();
  }

  function animate() {
    const canRender = !document.hidden;
    previews.forEach((preview) => {
      if (!preview.visible || !canRender) {
        return;
      }
      resizePreview(preview);
      preview.turntable.rotation.y += preview.spinSpeed;
      preview.renderer.render(preview.scene, preview.camera);
    });

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
