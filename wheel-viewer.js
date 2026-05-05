import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const viewerElement = document.getElementById("wheel-viewer");
const labelLayer = document.getElementById("wheel-label-layer");
const statusElement = document.getElementById("wheel-viewer-status");
const inspectorTitle = document.getElementById("wheel-inspector-title");
const inspectorDescription = document.getElementById("wheel-inspector-description");
const inspectorMeta = document.getElementById("wheel-inspector-meta");
const viewButtons = document.querySelectorAll("[data-wheel-view]");
const layerButtons = document.querySelectorAll("[data-wheel-layer]");
const labelsButton = document.querySelector("[data-wheel-labels]");
const isMobile =
  window.matchMedia("(max-width: 900px)").matches ||
  window.matchMedia("(pointer: coarse)").matches;

const tireSpecs = {
  size: "245/60R18 105H",
  sectionWidthIn: 9.6,
  sidewallIn: 5.8,
  wheelDiameterIn: 18,
  tireDiameterIn: 29.6,
  wheelSpec: "18 x 8J ET55",
  pressure: "35 psi front / 35 psi rear"
};

const visualDiameter = 3.2;
const visualRadius = visualDiameter / 2;
const visualWheelRadius = (tireSpecs.wheelDiameterIn / tireSpecs.tireDiameterIn) * visualRadius;
const visualSidewall = visualRadius - visualWheelRadius;
const visualWidth = (tireSpecs.sectionWidthIn / tireSpecs.tireDiameterIn) * visualDiameter;
const visualHalfWidth = visualWidth / 2;

const layerColors = {
  tire: 0x79d4ff,
  wheel: 0xffb45f,
  clearance: 0x6fffb4
};

const labelDefinitions = [
  {
    id: "diameter",
    group: "tire",
    title: "Outer Tire Diameter",
    value: "29.6 in",
    description: "Stock 245/60R18 calculates to about 29.6 inches tall.",
    meta: ["245/60R18", "Calculated from tire size"],
    position: new THREE.Vector3(-2.05, 1.72, 0.06)
  },
  {
    id: "section-width",
    group: "tire",
    title: "Section Width",
    value: "9.6 in",
    description: "245 mm section width converts to about 9.6 inches.",
    meta: ["245 mm", "Sidewall-to-sidewall width"],
    position: new THREE.Vector3(1.88, -0.88, visualHalfWidth + 0.18)
  },
  {
    id: "wheel-diameter",
    group: "wheel",
    title: "Wheel Diameter",
    value: "18 in",
    description: "Factory wheel diameter for the 2019 Ridgeline tire package.",
    meta: ["18 x 8J", "ET55 inset"],
    position: new THREE.Vector3(0.66, visualWheelRadius + 0.18, 0.1)
  },
  {
    id: "sidewall",
    group: "wheel",
    title: "Sidewall Height",
    value: "5.8 in",
    description: "The 60 aspect ratio means the sidewall is 60 percent of the 245 mm section width.",
    meta: ["147 mm", "60 aspect ratio"],
    position: new THREE.Vector3(1.14, visualWheelRadius + visualSidewall / 2, 0.12)
  },
  {
    id: "bolt-pattern",
    group: "wheel",
    title: "Bolt Pattern",
    value: "5 x 120",
    description: "Five-lug 120 mm pitch-circle reference for the Ridgeline wheel.",
    meta: ["M14 x 1.5", "64.1 mm bore reference"],
    position: new THREE.Vector3(-0.78, 0.14, 0.18)
  },
  {
    id: "top-clearance",
    group: "clearance",
    title: "Top Clearance",
    value: "Measure later",
    description: "Measure from tire crown to wheel-well liner with the truck level on the ground.",
    meta: ["Wheel well", "Field measurement pending"],
    position: new THREE.Vector3(0.16, 2.18, 0.12)
  },
  {
    id: "front-clearance",
    group: "clearance",
    title: "Front Liner",
    value: "Measure later",
    description: "Measure tire-to-front-liner clearance at full steering lock.",
    meta: ["Full lock", "Check both directions"],
    position: new THREE.Vector3(2.14, 0.2, 0.14)
  },
  {
    id: "rear-clearance",
    group: "clearance",
    title: "Rear Liner",
    value: "Measure later",
    description: "Measure tire-to-rear-liner clearance, especially at full lock in reverse.",
    meta: ["Reverse full lock", "Rub check"],
    position: new THREE.Vector3(-2.15, 0.2, 0.14)
  },
  {
    id: "inner-clearance",
    group: "clearance",
    title: "Inner Clearance",
    value: "Measure later",
    description: "Measure inside clearance to suspension and inner liner surfaces.",
    meta: ["Inner side", "Field measurement pending"],
    position: new THREE.Vector3(-0.36, -1.38, -0.98)
  },
  {
    id: "outer-clearance",
    group: "clearance",
    title: "Outer Lip",
    value: "Measure later",
    description: "Measure outer fender-lip clearance and poke with the wheel straight and turned.",
    meta: ["Outer side", "Field measurement pending"],
    position: new THREE.Vector3(0.54, -1.18, 1.02)
  }
];

let scene;
let camera;
let renderer;
let controls;
let tireRoot;
let annotationRoot;
let labelsVisible = true;
let activeLayer = "tire";
let activeView = "front";
let rotateResumeTimer = null;
const labelElements = new Map();

function setStatus(message, hidden = false) {
  if (!statusElement) {
    return;
  }

  statusElement.textContent = message;
  statusElement.hidden = hidden;
}

function updateInspector(definition) {
  if (!definition) {
    return;
  }

  if (inspectorTitle) {
    inspectorTitle.textContent = definition.title;
  }
  if (inspectorDescription) {
    inspectorDescription.textContent = definition.description;
  }
  if (inspectorMeta) {
    inspectorMeta.innerHTML = definition.meta.map((item) => `<span>${item}</span>`).join("");
  }

  labelElements.forEach((element, id) => {
    element.classList.toggle("is-active", id === definition.id);
  });
}

function createLabelElements() {
  if (!labelLayer) {
    return;
  }

  labelLayer.replaceChildren();
  labelDefinitions.forEach((definition) => {
    const button = document.createElement("button");
    button.className = "wheel-label";
    button.type = "button";
    button.dataset.labelGroup = definition.group;
    button.innerHTML = `<span>${definition.title}</span><strong>${definition.value}</strong>`;
    button.addEventListener("click", () => updateInspector(definition));
    labelLayer.appendChild(button);
    labelElements.set(definition.id, button);
  });
  updateInspector(labelDefinitions[0]);
}

function layerMatches(group) {
  return activeLayer === "all" || activeLayer === group;
}

function setLayer(layer) {
  activeLayer = layer;
  layerButtons.forEach((button) => {
    const pressed = button.dataset.wheelLayer === layer;
    button.setAttribute("aria-pressed", pressed ? "true" : "false");
  });

  annotationRoot?.children.forEach((child) => {
    child.visible = layerMatches(child.userData.group);
  });
  updateLabels();
}

function setView(view) {
  activeView = view;
  viewButtons.forEach((button) => {
    const pressed = button.dataset.wheelView === view;
    button.setAttribute("aria-pressed", pressed ? "true" : "false");
  });

  const views = {
    front: {
      position: new THREE.Vector3(0.12, 0.12, isMobile ? 9.2 : 6.8),
      target: new THREE.Vector3(0, 0, 0)
    },
    side: {
      position: new THREE.Vector3(isMobile ? 7.8 : 5.2, 0.58, isMobile ? 3.8 : 2.4),
      target: new THREE.Vector3(0, 0, 0)
    },
    clearance: {
      position: new THREE.Vector3(
        isMobile ? 7.1 : 4.8,
        isMobile ? 3.15 : 2.65,
        isMobile ? 7.3 : 5.4
      ),
      target: new THREE.Vector3(0, 0.18, 0)
    },
    angle: {
      position: new THREE.Vector3(
        isMobile ? -7.2 : -5.0,
        isMobile ? 2.65 : 2.05,
        isMobile ? 7.0 : 4.7
      ),
      target: new THREE.Vector3(0, 0.05, 0)
    }
  };

  const next = views[view] || views.front;
  camera.position.copy(next.position);
  controls.target.copy(next.target);
  controls.update();

  if (view === "clearance") {
    setLayer("clearance");
  }
}

function makeMaterial(color, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.08,
    transparent: opacity < 1,
    opacity
  });
}

function orientObjectBetween(mesh, start, end) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  mesh.scale.y = Math.max(0.001, length);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
}

function createDimensionArrow(start, end, color) {
  const group = new THREE.Group();
  const direction = new THREE.Vector3().subVectors(end, start).normalize();
  const shaftStart = start.clone().addScaledVector(direction, 0.08);
  const shaftEnd = end.clone().addScaledVector(direction, -0.08);
  const material = makeMaterial(color);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 16), material);
  orientObjectBetween(shaft, shaftStart, shaftEnd);
  group.add(shaft);

  const coneGeometry = new THREE.ConeGeometry(0.055, 0.16, 24);
  const endCone = new THREE.Mesh(coneGeometry, material);
  endCone.position.copy(end);
  endCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  group.add(endCone);

  const startCone = new THREE.Mesh(coneGeometry, material);
  startCone.position.copy(start);
  startCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().multiplyScalar(-1));
  group.add(startCone);

  return group;
}

function createRing(radius, color) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.012, 16, 120),
    makeMaterial(color, 0.9)
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.z = 0.12;
  return ring;
}

function createArch(color) {
  const points = [];
  for (let index = 0; index <= 72; index += 1) {
    const angle = Math.PI * (index / 72);
    points.push(new THREE.Vector3(Math.cos(angle) * 1.96, Math.sin(angle) * 1.96 - 1.54, -0.08));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color,
    dashSize: 0.08,
    gapSize: 0.05,
    transparent: true,
    opacity: 0.82
  });
  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();
  return line;
}

function addGroupedObject(object, groupName) {
  object.userData.group = groupName;
  annotationRoot.add(object);
  return object;
}

function buildAnnotations() {
  annotationRoot = new THREE.Group();
  scene.add(annotationRoot);

  addGroupedObject(
    createDimensionArrow(
      new THREE.Vector3(-1.92, -visualRadius, 0),
      new THREE.Vector3(-1.92, visualRadius, 0),
      layerColors.tire
    ),
    "tire"
  );
  addGroupedObject(
    createDimensionArrow(
      new THREE.Vector3(1.72, -1.02, -visualHalfWidth),
      new THREE.Vector3(1.72, -1.02, visualHalfWidth),
      layerColors.tire
    ),
    "tire"
  );
  addGroupedObject(
    createDimensionArrow(
      new THREE.Vector3(0.54, -visualWheelRadius, 0.09),
      new THREE.Vector3(0.54, visualWheelRadius, 0.09),
      layerColors.wheel
    ),
    "wheel"
  );
  addGroupedObject(
    createDimensionArrow(
      new THREE.Vector3(1.02, visualWheelRadius, 0.11),
      new THREE.Vector3(1.02, visualRadius, 0.11),
      layerColors.wheel
    ),
    "wheel"
  );
  addGroupedObject(createRing(0.46, layerColors.wheel), "wheel");

  const lugMaterial = makeMaterial(layerColors.wheel);
  for (let index = 0; index < 5; index += 1) {
    const angle = Math.PI / 2 + index * ((Math.PI * 2) / 5);
    const lug = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 24), lugMaterial);
    lug.rotation.x = Math.PI / 2;
    lug.position.set(Math.cos(angle) * 0.34, Math.sin(angle) * 0.34, 0.16);
    addGroupedObject(lug, "wheel");
  }

  addGroupedObject(createArch(layerColors.clearance), "clearance");
  addGroupedObject(
    createDimensionArrow(
      new THREE.Vector3(0, visualRadius, 0.08),
      new THREE.Vector3(0, visualRadius + 0.42, 0.08),
      layerColors.clearance
    ),
    "clearance"
  );
  addGroupedObject(
    createDimensionArrow(
      new THREE.Vector3(visualRadius, 0.04, 0.08),
      new THREE.Vector3(visualRadius + 0.42, 0.04, 0.08),
      layerColors.clearance
    ),
    "clearance"
  );
  addGroupedObject(
    createDimensionArrow(
      new THREE.Vector3(-visualRadius, 0.04, 0.08),
      new THREE.Vector3(-visualRadius - 0.42, 0.04, 0.08),
      layerColors.clearance
    ),
    "clearance"
  );
  addGroupedObject(
    createDimensionArrow(
      new THREE.Vector3(-0.24, -1.32, -visualHalfWidth),
      new THREE.Vector3(-0.24, -1.32, -visualHalfWidth - 0.34),
      layerColors.clearance
    ),
    "clearance"
  );
  addGroupedObject(
    createDimensionArrow(
      new THREE.Vector3(0.42, -1.12, visualHalfWidth),
      new THREE.Vector3(0.42, -1.12, visualHalfWidth + 0.34),
      layerColors.clearance
    ),
    "clearance"
  );

  setLayer(activeLayer);
}

function normalizeModel(object) {
  object.updateMatrixWorld(true);
  const firstBox = new THREE.Box3().setFromObject(object);
  const firstCenter = firstBox.getCenter(new THREE.Vector3());
  object.position.sub(firstCenter);
  object.updateMatrixWorld(true);

  const firstSize = firstBox.getSize(new THREE.Vector3());
  const axisSizes = [
    { axis: "x", size: firstSize.x },
    { axis: "y", size: firstSize.y },
    { axis: "z", size: firstSize.z }
  ].sort((a, b) => a.size - b.size);
  const widthAxis = axisSizes[0].axis;

  if (widthAxis === "x") {
    object.rotation.y = Math.PI / 2;
  } else if (widthAxis === "y") {
    object.rotation.x = Math.PI / 2;
  }

  object.updateMatrixWorld(true);
  const rotatedBox = new THREE.Box3().setFromObject(object);
  const rotatedCenter = rotatedBox.getCenter(new THREE.Vector3());
  object.position.sub(rotatedCenter);
  object.updateMatrixWorld(true);

  const rotatedSize = rotatedBox.getSize(new THREE.Vector3());
  const modelDiameter = Math.max(rotatedSize.x, rotatedSize.y);
  const scale = modelDiameter > 0 ? visualDiameter / modelDiameter : 1;
  object.scale.setScalar(scale);
  object.updateMatrixWorld(true);

  const fittedBox = new THREE.Box3().setFromObject(object);
  const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
  object.position.sub(fittedCenter);
}

function loadModel() {
  tireRoot = new THREE.Group();
  scene.add(tireRoot);

  const loader = new GLTFLoader();
  loader.load(
    "./assets/wheel-tire/ridgeline-tire-wheel.glb",
    (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (!child.isMesh) {
          return;
        }
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material.roughness = Math.max(child.material.roughness ?? 0.55, 0.48);
          child.material.needsUpdate = true;
        }
      });
      normalizeModel(model);
      tireRoot.add(model);
      setStatus("Tire model loaded.", true);
    },
    undefined,
    () => {
      setStatus("Could not load the tire model. Specs and measurement arrows are still available.");
    }
  );
}

function updateLabels() {
  if (!labelLayer || !camera || !viewerElement) {
    return;
  }

  const rect = viewerElement.getBoundingClientRect();
  labelDefinitions.forEach((definition) => {
    const element = labelElements.get(definition.id);
    if (!element) {
      return;
    }

    const projected = definition.position.clone().project(camera);
    const visible =
      labelsVisible &&
      layerMatches(definition.group) &&
      projected.z > -1 &&
      projected.z < 1;

    element.hidden = !visible;
    if (!visible) {
      return;
    }

    const x = (projected.x * 0.5 + 0.5) * rect.width;
    const y = (-projected.y * 0.5 + 0.5) * rect.height;
    element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  });
}

function resize() {
  if (!viewerElement || !camera || !renderer) {
    return;
  }

  const width = Math.max(1, viewerElement.clientWidth);
  const height = Math.max(1, viewerElement.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  updateLabels();
}

function init() {
  if (!viewerElement) {
    return;
  }

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(isMobile ? 50 : 40, 1, 0.1, 100);
  camera.position.set(0.12, 0.12, isMobile ? 9.2 : 6.8);

  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      alpha: true,
      powerPreference: "high-performance"
    });
  } catch (error) {
    setStatus("The tire viewer could not start on this browser.");
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.7));
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewerElement.appendChild(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.minDistance = isMobile ? 5.8 : 3.4;
  controls.maxDistance = isMobile ? 13.5 : 9;
  controls.enablePan = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;
  renderer.domElement.style.touchAction = isMobile ? "pan-y" : "none";

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(3.5, 5, 4);
  keyLight.castShadow = !isMobile;
  scene.add(keyLight);
  scene.add(new THREE.HemisphereLight(0xddeeff, 0x111827, 1.4));

  const grid = new THREE.GridHelper(5.8, 18, 0x2f5064, 0x1b2c38);
  grid.position.y = -1.68;
  grid.material.transparent = true;
  grid.material.opacity = 0.32;
  scene.add(grid);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(2.45, 96),
    new THREE.MeshStandardMaterial({
      color: 0x0a1622,
      roughness: 0.7,
      metalness: 0.08,
      transparent: true,
      opacity: 0.7
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.7;
  ground.receiveShadow = true;
  scene.add(ground);

  createLabelElements();
  buildAnnotations();
  loadModel();
  resize();
  setView(activeView);

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
    updateLabels();
  });
}

viewButtons.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.wheelView));
});

layerButtons.forEach((button) => {
  button.addEventListener("click", () => setLayer(button.dataset.wheelLayer));
});

labelsButton?.addEventListener("click", () => {
  labelsVisible = !labelsVisible;
  labelsButton.setAttribute("aria-pressed", labelsVisible ? "true" : "false");
  updateLabels();
});

function stopAutoRotate() {
  if (!controls) {
    return;
  }

  if (rotateResumeTimer) {
    clearTimeout(rotateResumeTimer);
    rotateResumeTimer = null;
  }
  controls.autoRotate = false;
}

function scheduleAutoRotate() {
  if (!controls) {
    return;
  }

  if (rotateResumeTimer) {
    clearTimeout(rotateResumeTimer);
  }

  rotateResumeTimer = window.setTimeout(() => {
    controls.autoRotate = true;
    rotateResumeTimer = null;
  }, 3000);
}

viewerElement?.addEventListener("pointerdown", stopAutoRotate);
viewerElement?.addEventListener("wheel", stopAutoRotate, { passive: true });
viewerElement?.addEventListener("touchstart", stopAutoRotate, { passive: true });
viewerElement?.addEventListener("pointerup", scheduleAutoRotate);
viewerElement?.addEventListener("touchend", scheduleAutoRotate, { passive: true });

window.addEventListener("resize", resize);
init();
