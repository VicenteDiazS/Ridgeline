import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { defaultEnginePartKey, enginePartDetails } from "./engine-part-data.js";

const viewerElement = document.getElementById("engine-viewer");
const hotspotLayer = document.getElementById("engine-hotspot-layer");
const viewerStatus = document.getElementById("engine-viewer-status");
const inspectorTitle = document.getElementById("engine-inspector-title");
const inspectorDescription = document.getElementById("engine-inspector-description");
const inspectorMeta = document.getElementById("engine-inspector-meta");
const viewButtons = [...document.querySelectorAll("[data-engine-view]")];
const modelButtons = [...document.querySelectorAll("[data-engine-model]")];
const labelToggle = document.querySelector("[data-engine-labels]");
const labelFilterButtons = [...document.querySelectorAll("[data-engine-label-filter]")];
const partReference = document.getElementById("engine-part-reference");
const partSelect = document.getElementById("engine-part-select");
const partTitle = document.getElementById("engine-part-title");
const partCategory = document.getElementById("engine-part-category");
const partSummary = document.getElementById("engine-part-summary");
const partLocation = document.getElementById("engine-part-location");
const partRole = document.getElementById("engine-part-role");
const partService = document.getElementById("engine-part-service");
const partNotes = document.getElementById("engine-part-notes");
const partNumbers = document.getElementById("engine-part-numbers");

const isMobile =
  window.matchMedia("(max-width: 900px)").matches ||
  window.matchMedia("(pointer: coarse)").matches;

let renderer;

try {
  renderer = new THREE.WebGLRenderer({
    antialias: !isMobile,
    alpha: true,
    powerPreference: "high-performance"
  });
} catch (error) {
  if (viewerStatus) {
    viewerStatus.hidden = false;
    viewerStatus.textContent = "The engine viewer could not start on this browser.";
  }
  console.error(error);
}

if (!renderer || !viewerElement) {
  if (viewerStatus) {
    viewerStatus.hidden = false;
  }
} else {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x071019, 20, 42);

  const camera = new THREE.PerspectiveCamera(isMobile ? 46 : 38, 1, 0.1, 100);
  const defaultCamera = new THREE.Vector3(isMobile ? 6.7 : 5.8, 3.35, isMobile ? 6.2 : 5.4);
  const defaultTarget = new THREE.Vector3(0, 0.98, 0);
  camera.position.copy(defaultCamera);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  viewerElement.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isMobile;
  controls.enablePan = true;
  controls.minDistance = 3.6;
  controls.maxDistance = 12;
  controls.target.copy(defaultTarget);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.55;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.03).texture;

  scene.add(new THREE.HemisphereLight(0xe6f6ff, 0x121720, 1.35));

  const keyLight = new THREE.DirectionalLight(0xeef8ff, 2.15);
  keyLight.position.set(4.5, 7.5, 6);
  keyLight.castShadow = !isMobile;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x79d4ff, 1.55);
  rimLight.position.set(-5.5, 3.4, -4.8);
  scene.add(rimLight);

  const warmLight = new THREE.PointLight(0xffb48f, 5.2, 13, 2);
  warmLight.position.set(-3.4, 2.2, 1.9);
  scene.add(warmLight);

  const cyanLift = new THREE.PointLight(0x61dfff, 5.4, 13, 2);
  cyanLift.position.set(2.4, 2.4, -2.2);
  scene.add(cyanLift);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(5.8, 96),
    new THREE.MeshBasicMaterial({
      color: 0x15324a,
      transparent: true,
      opacity: 0.24
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.1;
  scene.add(floor);

  const floorRing = new THREE.Mesh(
    new THREE.RingGeometry(2.6, 4.8, 120),
    new THREE.MeshBasicMaterial({
      color: 0x67dfff,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide
    })
  );
  floorRing.rotation.x = -Math.PI / 2;
  floorRing.position.y = -0.095;
  scene.add(floorRing);

  function makeNoiseTexture(colors, repeat = 3, size = 128, grain = 900) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");

    context.fillStyle = colors[0];
    context.fillRect(0, 0, size, size);

    for (let i = 0; i < grain; i += 1) {
      const color = colors[1 + (i % Math.max(1, colors.length - 1))] || colors[0];
      context.fillStyle = color;
      context.globalAlpha = 0.08 + ((i * 17) % 40) / 200;
      const x = (i * 43) % size;
      const y = (i * 71) % size;
      const width = 1 + ((i * 11) % 5);
      const height = 1 + ((i * 19) % 7);
      context.fillRect(x, y, width, height);
    }

    context.globalAlpha = 0.12;
    context.strokeStyle = colors[colors.length - 1];
    for (let y = 8; y < size; y += 13) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y + ((y * 3) % 9) - 4);
      context.stroke();
    }
    context.globalAlpha = 1;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    return texture;
  }

  function makeStripeTexture(base, stripe, repeatX = 1, repeatY = 12, size = 128) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.fillStyle = base;
    context.fillRect(0, 0, size, size);
    context.fillStyle = stripe;
    for (let y = 0; y < size; y += 10) {
      context.fillRect(0, y, size, 3);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
  }

  const castAluminumTexture = makeNoiseTexture(["#8f969a", "#c2c8cb", "#5d666d", "#777f86"], 2.5);
  const darkCastTexture = makeNoiseTexture(["#20272e", "#3c4650", "#11161b", "#2c343d"], 2.8);
  const blackRubberTexture = makeStripeTexture("#060708", "#15181b", 1, 18);
  const intakeTexture = makeNoiseTexture(["#465868", "#6f8492", "#263440", "#596b78"], 2.2);
  const copperHeatTexture = makeNoiseTexture(["#8b705c", "#c29f7b", "#5b493b", "#9d7a5a"], 2.2);

  const materials = {
    block: new THREE.MeshStandardMaterial({ color: 0xaab0b3, map: castAluminumTexture, bumpMap: castAluminumTexture, bumpScale: 0.025, metalness: 0.58, roughness: 0.6 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0xb8c4cc, map: darkCastTexture, bumpMap: darkCastTexture, bumpScale: 0.018, metalness: 0.5, roughness: 0.54 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0d1013, map: blackRubberTexture, bumpMap: blackRubberTexture, bumpScale: 0.018, metalness: 0.14, roughness: 0.84 }),
    cover: new THREE.MeshStandardMaterial({ color: 0x5d6670, map: darkCastTexture, bumpMap: darkCastTexture, bumpScale: 0.02, metalness: 0.38, roughness: 0.58 }),
    coverTransparent: new THREE.MeshStandardMaterial({ color: 0x4d5862, map: darkCastTexture, metalness: 0.25, roughness: 0.52, transparent: true, opacity: 0.48 }),
    intake: new THREE.MeshStandardMaterial({ color: 0x9db0bd, map: intakeTexture, bumpMap: intakeTexture, bumpScale: 0.018, metalness: 0.24, roughness: 0.5 }),
    belt: new THREE.MeshStandardMaterial({ color: 0x111214, map: blackRubberTexture, bumpMap: blackRubberTexture, bumpScale: 0.025, metalness: 0.03, roughness: 0.92 }),
    pulley: new THREE.MeshStandardMaterial({ color: 0xc4ccd2, metalness: 0.86, roughness: 0.26 }),
    bolt: new THREE.MeshStandardMaterial({ color: 0xb7c0c7, metalness: 0.88, roughness: 0.22 }),
    service: new THREE.MeshStandardMaterial({ color: 0xff915e, metalness: 0.28, roughness: 0.36, emissive: 0x301006, emissiveIntensity: 0.16 }),
    coolant: new THREE.MeshStandardMaterial({ color: 0x65dfff, metalness: 0.24, roughness: 0.3, emissive: 0x0c3342, emissiveIntensity: 0.2 }),
    hose: new THREE.MeshStandardMaterial({ color: 0x0b0c0f, map: blackRubberTexture, bumpMap: blackRubberTexture, bumpScale: 0.02, metalness: 0.02, roughness: 0.86 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0b0c0f, map: blackRubberTexture, bumpMap: blackRubberTexture, bumpScale: 0.02, metalness: 0.03, roughness: 0.92 }),
    exhaust: new THREE.MeshStandardMaterial({ color: 0xc29a78, map: copperHeatTexture, bumpMap: copperHeatTexture, bumpScale: 0.018, metalness: 0.72, roughness: 0.5 }),
    heatShield: new THREE.MeshStandardMaterial({ color: 0xd4d7d8, metalness: 0.78, roughness: 0.42 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x121820, map: darkCastTexture, bumpMap: darkCastTexture, bumpScale: 0.012, metalness: 0.12, roughness: 0.68 }),
    wiring: new THREE.MeshStandardMaterial({ color: 0x030405, metalness: 0.02, roughness: 0.78 }),
    label: new THREE.MeshStandardMaterial({ color: 0xdce9f2, metalness: 0.1, roughness: 0.38 }),
    marker: new THREE.MeshStandardMaterial({ color: 0x79d4ff, metalness: 0.2, roughness: 0.28, emissive: 0x0d3346, emissiveIntensity: 0.42 })
  };

  const engine = new THREE.Group();
  engine.name = "J35Y6 technical engine model";
  engine.position.y = 0.05;
  scene.add(engine);

  const selectableParts = new Map();
  const originalEmissive = new Map();
  const markerMeshes = new Map();
  const hotspotButtons = new Map();
  const componentLabelObjects = [];
  const componentLabelRecords = new Map();
  const modelModeObjects = new Map();
  const labelRaycaster = new THREE.Raycaster();
  const labelPointer = new THREE.Vector2();
  const projected = new THREE.Vector3();
  const cameraLocal = new THREE.Vector3();
  let selectedKey = "timing";
  let selectedPartKey = defaultEnginePartKey;
  let modelMode = "installed";
  let cameraTween = null;
  let isInteracting = false;
  let autoRotateTimer = null;
  let labelsVisible = true;
  let activeLabelFilter = "all";
  let timingKitFaceLabel = null;
  let labelPointerDown = null;

  labelRaycaster.params.Line.threshold = 0.08;

  const timingFace = {
    x: -2.47,
    labelX: -2.62,
    ca1: new THREE.Vector3(-2.47, 1.82, -0.66),
    ca2: new THREE.Vector3(-2.47, 1.82, 0.66),
    waterPump: new THREE.Vector3(-2.47, 1.18, 0),
    tensioner: new THREE.Vector3(-2.47, 0.98, 0.62),
    guide: new THREE.Vector3(-2.47, 0.88, -0.54),
    crank: new THREE.Vector3(-2.47, 0.34, 0)
  };

  const accessoryFace = {
    beltX: -2.96,
    alternator: new THREE.Vector3(-2.9, 1.26, 0.76),
    starter: new THREE.Vector3(2.34, 0.76, 0.72),
    compressor: new THREE.Vector3(-2.92, 0.55, 0.9),
    idler: new THREE.Vector3(-2.96, 0.88, 0.52),
    beltMid: new THREE.Vector3(-2.98, 0.92, 0.64),
    oilFilter: new THREE.Vector3(-1.9, 0.24, 1.02),
    throttle: new THREE.Vector3(2.35, 2.06, 0)
  };

  const fuelSystemFace = {
    highPressurePump: new THREE.Vector3(-1.28, 1.74, -0.28),
    frontFuelRail: new THREE.Vector3(0.2, 1.52, 0.56),
    rearFuelRail: new THREE.Vector3(0.2, 1.52, -0.56),
    mapSensor: new THREE.Vector3(1.08, 2.36, 0.2)
  };

  const serviceReferenceFace = {
    frontEngineMount: new THREE.Vector3(-1.98, 0.2, 0.98),
    rearEngineMount: new THREE.Vector3(-1.98, 0.2, -0.98),
    ignitionCoils: new THREE.Vector3(0, 1.86, 0.93),
    oilFillerCap: new THREE.Vector3(1.45, 1.88, 0.92),
    egrPipe: new THREE.Vector3(-0.56, 1.12, -1.18),
    primaryCatalysts: new THREE.Vector3(-0.2, 0.55, 1.58),
    frontFuelInjectors: new THREE.Vector3(0.18, 1.45, 0.58),
    airIntakeTube: new THREE.Vector3(2.72, 2.06, 0),
    frontOxygenSensor: new THREE.Vector3(0.76, 0.76, 1.47)
  };

  function roundedBox(width, height, depth, radius, material) {
    return new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 4, radius), material);
  }

  function cylinder(radiusTop, radiusBottom, depth, segments, material) {
    return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, depth, segments, 1), material);
  }

  function addTube(group, points, radius, material, tubularSegments = 34, radialSegments = 10) {
    const curve = new THREE.CatmullRomCurve3(points);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments), material);
    group.add(tube);
    return { curve, tube };
  }

  function addBolt(group, position, axis = "y", radius = 0.045, height = 0.035) {
    const bolt = cylinder(radius, radius, height, 6, materials.bolt);
    bolt.position.copy(position);
    bolt.rotation.y = Math.PI / 6;
    if (axis === "x") {
      bolt.rotation.z = Math.PI / 2;
    } else if (axis === "z") {
      bolt.rotation.x = Math.PI / 2;
    }
    group.add(bolt);
    return bolt;
  }

  function addRib(group, position, size, material = materials.cover) {
    const rib = roundedBox(size.x, size.y, size.z, 0.025, material);
    rib.position.copy(position);
    group.add(rib);
    return rib;
  }

  function addPulley(group, radius, y, z, material, options = {}) {
    const pulleyGroup = new THREE.Group();
    pulleyGroup.name = options.name || "Detailed pulley";
    pulleyGroup.position.set(options.x ?? -2.47, y, z);

    const barrel = cylinder(radius, radius, options.width || 0.18, 56, material);
    barrel.rotation.z = Math.PI / 2;
    pulleyGroup.add(barrel);

    [-0.092, 0.092].forEach((x) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.98, 0.012, 8, 56), materials.bolt);
      rim.rotation.y = Math.PI / 2;
      rim.position.x = x;
      pulleyGroup.add(rim);
    });

    const groove = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.74, 0.01, 8, 44), materials.darkMetal);
    groove.rotation.y = Math.PI / 2;
    pulleyGroup.add(groove);

    const cap = cylinder(radius * 0.32, radius * 0.32, (options.width || 0.18) + 0.035, 32, materials.bolt);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = -0.015;
    pulleyGroup.add(cap);

    if (options.toothed) {
      const toothCount = options.toothCount || (isMobile ? 22 : 30);
      for (let i = 0; i < toothCount; i += 1) {
        const angle = (i / toothCount) * Math.PI * 2;
        const tooth = roundedBox(
          (options.width || 0.18) + 0.03,
          0.026,
          Math.max(0.042, radius * 0.12),
          0.005,
          materials.darkMetal
        );
        tooth.position.set(
          -0.006,
          Math.cos(angle) * (radius + 0.026),
          Math.sin(angle) * (radius + 0.026)
        );
        tooth.rotation.x = -angle;
        pulleyGroup.add(tooth);
      }
    }

    if (options.markAngle !== undefined) {
      const mark = roundedBox(
        (options.width || 0.18) + 0.05,
        0.034,
        Math.max(0.08, radius * 0.22),
        0.006,
        materials.coolant
      );
      mark.position.set(
        -0.11,
        Math.cos(options.markAngle) * (radius + 0.055),
        Math.sin(options.markAngle) * (radius + 0.055)
      );
      mark.rotation.x = -options.markAngle;
      pulleyGroup.add(mark);
    }

    for (let i = 0; i < 6; i += 1) {
      const spoke = roundedBox(0.026, radius * 1.18, 0.035, 0.01, materials.pulley);
      spoke.rotation.x = (Math.PI / 6) + (i * Math.PI) / 3;
      pulleyGroup.add(spoke);
    }

    group.add(pulleyGroup);
    return pulleyGroup;
  }

  function addBeltTeeth(group, curve, count, xOffset = -2.66) {
    if (isMobile) {
      count = Math.min(count, 26);
    }

    for (let i = 0; i < count; i += 1) {
      const t = i / count;
      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t).normalize();
      const tooth = roundedBox(0.035, 0.032, 0.11, 0.006, materials.darkMetal);
      tooth.position.set(xOffset, point.y, point.z);
      tooth.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      group.add(tooth);
    }
  }

  function addRibbedHose(group, points, radius, ringCount = 8) {
    const { curve } = addTube(group, points, radius, materials.hose, 42, 10);
    for (let i = 1; i <= ringCount; i += 1) {
      const point = curve.getPoint(i / (ringCount + 1));
      const tangent = curve.getTangent(i / (ringCount + 1)).normalize();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.18, 0.01, 7, 20), materials.bolt);
      ring.position.copy(point);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      group.add(ring);
    }
    return curve;
  }

  function makeLabelMaterial(text, width = 256, height = 70) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "rgba(9, 13, 18, 0.88)";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "rgba(210, 226, 236, 0.68)";
    context.lineWidth = 4;
    context.strokeRect(4, 4, width - 8, height - 8);
    context.fillStyle = "#e9f5fb";
    context.font = "700 30px Segoe UI, Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, width / 2, height / 2 + 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.45,
      metalness: 0.05
    });
  }

  function addFaceLabel(group, text, position, rotation, size = [0.9, 0.24]) {
    const label = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), makeLabelMaterial(text));
    label.position.copy(position);
    label.rotation.set(rotation.x, rotation.y, rotation.z);
    group.add(label);
    return label;
  }

  function makeComponentLabelMaterial(text, tone = "blue") {
    const width = 360;
    const height = 92;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const accent = tone === "orange" ? "#ffb48f" : tone === "green" ? "#88f7c2" : "#8ad8ff";
    const fill = tone === "orange" ? "rgba(42, 22, 15, 0.9)" : "rgba(6, 13, 22, 0.9)";

    context.clearRect(0, 0, width, height);
    context.fillStyle = fill;
    roundRect(context, 8, 8, width - 16, height - 16, 26);
    context.fill();
    context.strokeStyle = accent;
    context.globalAlpha = 0.8;
    context.lineWidth = 4;
    context.stroke();
    context.globalAlpha = 1;
    context.fillStyle = accent;
    context.beginPath();
    context.arc(36, height / 2, 8, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f2f8fc";
    context.font = "800 28px Segoe UI, Arial, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(text.toUpperCase(), 58, height / 2 + 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
  }

  function roundRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
  }

  function updateComponentLabel(record, anchor = record.anchor, offset = record.offset) {
    record.anchor.copy(anchor);
    record.offset.copy(offset);
    const labelPosition = record.anchor.clone().add(record.offset);
    record.sprite.position.copy(labelPosition);
    record.dot.position.copy(record.anchor);
    record.line.geometry.setFromPoints([record.anchor, labelPosition]);
    record.line.geometry.attributes.position.needsUpdate = true;
    record.line.geometry.computeBoundingSphere();
  }

  function addComponentLabel(group, text, anchor, offset, tone = "blue", width = 1.18, key = null, groups = ["service"]) {
    const anchorPoint = anchor.clone();
    const labelPosition = anchor.clone().add(offset);
    const material = makeComponentLabelMaterial(text, tone);
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(labelPosition);
    const scaleBoost = isMobile ? 0.82 : 1;
    sprite.scale.set(width * scaleBoost, 0.3 * scaleBoost, 1);
    const baseScale = sprite.scale.clone();
    sprite.renderOrder = 20;
    group.add(sprite);

    const toneColor = new THREE.Color(tone === "orange" ? 0xffb48f : tone === "green" ? 0x88f7c2 : 0x8ad8ff);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([anchorPoint, labelPosition]);
    const line = new THREE.Line(
      lineGeometry,
      new THREE.LineBasicMaterial({
        color: toneColor,
        transparent: true,
        opacity: 0.72,
        depthTest: false,
        depthWrite: false
      })
    );
    line.renderOrder = 19;
    group.add(line);

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 16, 10),
      new THREE.MeshBasicMaterial({ color: toneColor, depthTest: false })
    );
    dot.position.copy(anchorPoint);
    dot.renderOrder = 20;
    group.add(dot);

    const record = {
      key: key || "general",
      anchor: anchorPoint.clone(),
      offset: offset.clone(),
      sprite,
      line,
      dot,
      baseScale,
      toneColor,
      groups
    };
    [sprite, line, dot].forEach((object) => {
      object.userData.componentLabelKey = record.key;
      object.userData.componentLabelGroups = record.groups;
      object.userData.isComponentLabelTarget = object === sprite || object === dot;
    });
    componentLabelObjects.push(sprite, line, dot);
    if (key) {
      componentLabelRecords.set(key, record);
    }
    return record;
  }

  function setComponentLabelsVisible(visible) {
    labelsVisible = visible;
    const accessoryKeys = new Set(["alternator", "compressor", "serpentine", "driveTensioner", "oilFilter"]);
    componentLabelObjects.forEach((object) => {
      const shouldShowInMode =
        modelMode !== "front-accessories" || accessoryKeys.has(object.userData.componentLabelKey);
      const groups = object.userData.componentLabelGroups || [];
      const shouldShowForFilter = activeLabelFilter === "all" || groups.includes(activeLabelFilter);
      object.visible = visible && shouldShowInMode && shouldShowForFilter;
    });
    labelToggle?.setAttribute("aria-pressed", visible ? "true" : "false");
  }

  function setLabelFilter(filter = "all") {
    const knownFilter = labelFilterButtons.some((button) => button.dataset.engineLabelFilter === filter);
    activeLabelFilter = knownFilter ? filter : "all";
    labelFilterButtons.forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.engineLabelFilter === activeLabelFilter ? "true" : "false");
    });
    setComponentLabelsVisible(labelsVisible);
  }

  function populatePartSelector() {
    if (!partSelect) {
      return;
    }

    partSelect.replaceChildren();
    Object.entries(enginePartDetails).forEach(([key, detail]) => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = detail.title;
      partSelect.appendChild(option);
    });
  }

  function setSelectedComponentLabel(partKey) {
    const selectedColor = new THREE.Color(0xfff0c7);

    componentLabelRecords.forEach((record, key) => {
      const selected = key === partKey;
      record.sprite.scale.copy(record.baseScale).multiplyScalar(selected ? 1.12 : 1);
      record.sprite.material.opacity = selected ? 1 : 0.94;
      record.line.material.opacity = selected ? 0.95 : 0.72;
      record.line.material.color.copy(selected ? selectedColor : record.toneColor);
      record.dot.scale.setScalar(selected ? 1.55 : 1);
      record.dot.material.color.copy(selected ? selectedColor : record.toneColor);
    });
  }

  function renderPartNumbers(numbers = []) {
    if (!partNumbers) {
      return;
    }

    partNumbers.replaceChildren();
    numbers.forEach(([maker, number, note]) => {
      const row = document.createElement("div");
      row.className = "part-number-row";

      const makerElement = document.createElement("strong");
      makerElement.textContent = maker;

      const numberElement = document.createElement("code");
      numberElement.textContent = number;

      const noteElement = document.createElement("span");
      noteElement.textContent = note;

      row.append(makerElement, numberElement, noteElement);
      partNumbers.appendChild(row);
    });
  }

  function renderPartNotes(notes = []) {
    if (!partNotes) {
      return;
    }

    partNotes.replaceChildren();
    notes.forEach((note) => {
      const item = document.createElement("li");
      item.textContent = note;
      partNotes.appendChild(item);
    });
  }

  function setPartReference(key = defaultEnginePartKey, options = {}) {
    const partKey = enginePartDetails[key] ? key : defaultEnginePartKey;
    const detail = enginePartDetails[partKey];
    selectedPartKey = partKey;

    if (partTitle) {
      partTitle.textContent = detail.title;
    }
    if (partCategory) {
      partCategory.textContent = detail.category;
    }
    if (partSummary) {
      partSummary.textContent = detail.service;
    }
    if (partLocation) {
      partLocation.textContent = detail.location;
    }
    if (partRole) {
      partRole.textContent = detail.role;
    }
    if (partService) {
      partService.textContent = detail.service;
    }

    renderPartNotes(detail.notes);
    renderPartNumbers(detail.numbers);

    if (partSelect && partSelect.value !== partKey) {
      partSelect.value = partKey;
    }

    setSelectedComponentLabel(partKey);

    if (options.scrollIntoView && partReference) {
      window.setTimeout(() => {
        partReference.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start"
        });
        partReference.focus?.({ preventScroll: true });
      }, 80);
    }
  }

  function labelPointerFromEvent(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      return false;
    }

    labelPointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    return true;
  }

  function partKeyFromPointer(event) {
    if (!labelPointerFromEvent(event)) {
      return null;
    }

    labelRaycaster.setFromCamera(labelPointer, camera);
    const targets = componentLabelObjects.filter(
      (object) => object.visible && object.userData.isComponentLabelTarget
    );
    const hit = labelRaycaster.intersectObjects(targets, false).find((entry) => {
      const partKey = entry.object.userData.componentLabelKey;
      return partKey && enginePartDetails[partKey];
    });

    return hit?.object.userData.componentLabelKey || null;
  }

  function rememberLabelPointer(event) {
    labelPointerDown = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now()
    };
    stopAutoRotate();
  }

  function handleLabelPointerUp(event) {
    const wasTap =
      labelPointerDown &&
      performance.now() - labelPointerDown.time < 850 &&
      Math.hypot(event.clientX - labelPointerDown.x, event.clientY - labelPointerDown.y) < (isMobile ? 18 : 10);
    labelPointerDown = null;

    if (wasTap) {
      const partKey = partKeyFromPointer(event);
      if (partKey) {
        event.preventDefault();
        setPartReference(partKey, { scrollIntoView: true });
        scheduleAutoRotate();
        return;
      }
    }

    scheduleAutoRotate();
  }

  function trackModelModeObject(key, object, frontAccessoriesPosition) {
    modelModeObjects.set(key, {
      object,
      installed: object.position.clone(),
      frontAccessories: frontAccessoriesPosition.clone()
    });
  }

  function transformedPoint(point, key, mode = modelMode) {
    const record = modelModeObjects.get(key);
    if (!record) {
      return point.clone();
    }
    const delta = (mode === "front-accessories" ? record.frontAccessories : record.installed)
      .clone()
      .sub(record.installed);
    return point.clone().add(delta);
  }

  function setEngineModelMode(mode, moveCamera = true) {
    modelMode = mode === "front-accessories" ? "front-accessories" : "installed";

    modelModeObjects.forEach((record) => {
      const target = modelMode === "front-accessories" ? record.frontAccessories : record.installed;
      record.object.position.copy(target);
    });

    const frontMode = modelMode === "front-accessories";
    [
      [
        "alternator",
        accessoryFace.alternator,
        frontMode ? new THREE.Vector3(0.28, 0.5, 0.28) : new THREE.Vector3(-0.38, 0.28, 0.2),
        "frontAccessories"
      ],
      [
        "compressor",
        accessoryFace.compressor,
        frontMode ? new THREE.Vector3(0.46, 0.3, 0.18) : new THREE.Vector3(0.52, 0.24, 0.34),
        "frontAccessories"
      ],
      [
        "serpentine",
        accessoryFace.beltMid,
        frontMode ? new THREE.Vector3(0.2, 0.54, -0.2) : new THREE.Vector3(0.48, 0.48, -0.26),
        "frontAccessories"
      ],
      [
        "driveTensioner",
        accessoryFace.idler,
        frontMode ? new THREE.Vector3(-0.34, 0.28, -0.28) : new THREE.Vector3(-0.36, 0.28, -0.3),
        "frontAccessories"
      ],
      [
        "oilFilter",
        accessoryFace.oilFilter,
        frontMode ? new THREE.Vector3(0.06, -0.32, 0.22) : new THREE.Vector3(0.42, 0.38, 0.26),
        "oilFilter"
      ]
    ].forEach(([key, anchor, offset, objectKey]) => {
      const record = componentLabelRecords.get(key);
      if (record) {
        updateComponentLabel(record, transformedPoint(anchor, objectKey), offset);
      }
    });

    modelButtons.forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.engineModel === modelMode ? "true" : "false");
    });
    if (timingKitFaceLabel) {
      timingKitFaceLabel.visible = modelMode === "installed";
    }
    setComponentLabelsVisible(labelsVisible);

    if (moveCamera) {
      setCameraView(modelMode === "front-accessories" ? "frontAccessories" : "overview");
    }
  }

  function addToPart(key, mesh) {
    mesh.userData.partKey = key;
    mesh.traverse?.((child) => {
      child.userData.partKey = key;
    });

    if (!selectableParts.has(key)) {
      selectableParts.set(key, new THREE.Group());
    }
    selectableParts.get(key).add(mesh);
    return mesh;
  }

  function addGroupToEngine(key, group) {
    if (key) {
      selectableParts.set(key, group);
      group.traverse((child) => {
        child.userData.partKey = key;
      });
    }
    engine.add(group);
    return group;
  }

  function tuneMaterialMemory(object) {
    object.traverse((child) => {
      if (!child.isMesh || !child.material) {
        return;
      }
      child.material = child.material.clone();
      if (!originalEmissive.has(child.uuid)) {
        originalEmissive.set(child.uuid, {
          color: child.material.emissive?.clone?.() || new THREE.Color(0x000000),
          intensity: child.material.emissiveIntensity || 0
        });
      }
      child.castShadow = !isMobile;
      child.receiveShadow = !isMobile;
    });
  }

  function buildEngineModel() {
    const blockGroup = new THREE.Group();
    blockGroup.name = "V6 aluminum block";
    const block = roundedBox(4.25, 1.05, 1.55, 0.12, materials.block);
    block.position.set(0, 0.58, 0);
    blockGroup.add(block);

    const valley = roundedBox(3.7, 0.18, 0.72, 0.08, materials.darkMetal);
    valley.position.set(0, 1.13, 0);
    blockGroup.add(valley);

    const oilPan = roundedBox(3.8, 0.48, 1.38, 0.12, materials.black);
    oilPan.position.set(0.08, 0.0, 0);
    blockGroup.add(oilPan);

    [-1, 1].forEach((side) => {
      [-1.52, -0.78, 0, 0.78, 1.52].forEach((x) => {
        const rib = addRib(
          blockGroup,
          new THREE.Vector3(x, 0.64, side * 0.82),
          new THREE.Vector3(0.07, 0.76, 0.08),
          materials.block
        );
        rib.rotation.z = 0.18 * side;
      });
      [-1.75, -0.9, -0.05, 0.8, 1.65].forEach((x) => {
        addBolt(blockGroup, new THREE.Vector3(x, 0.92, side * 0.83), "z", 0.036, 0.028);
      });
    });

    const bellhousing = cylinder(0.78, 0.78, 0.38, 56, materials.block);
    bellhousing.rotation.z = Math.PI / 2;
    bellhousing.position.set(2.02, 0.62, 0);
    blockGroup.add(bellhousing);

    const drainPlug = addBolt(blockGroup, new THREE.Vector3(-1.25, -0.02, 0.72), "z", 0.052, 0.035);
    drainPlug.material = materials.service;

    addGroupToEngine("block", blockGroup);

    [-1, 1].forEach((side) => {
      const bank = new THREE.Group();
      bank.name = side > 0 ? "Front cylinder bank" : "Rear cylinder bank";
      bank.rotation.x = side > 0 ? -0.18 : 0.18;

      const head = roundedBox(3.9, 0.54, 0.72, 0.1, materials.block);
      head.position.set(0, 1.24, side * 0.72);
      bank.add(head);

      const cover = roundedBox(3.72, 0.34, 0.56, 0.12, materials.cover);
      cover.position.set(0, 1.64, side * 0.9);
      bank.add(cover);

      const gasket = roundedBox(3.82, 0.055, 0.62, 0.06, materials.rubber);
      gasket.position.set(0, 1.43, side * 0.88);
      bank.add(gasket);

      [-1.35, -0.45, 0.45, 1.35].forEach((x) => {
        const coverRib = addRib(
          bank,
          new THREE.Vector3(x, 1.84, side * 0.9),
          new THREE.Vector3(0.12, 0.055, 0.5),
          materials.cover
        );
        coverRib.rotation.z = 0.02;
      });

      addFaceLabel(
        bank,
        side > 0 ? "J35Y6" : "3.5 V6",
        new THREE.Vector3(side > 0 ? -0.52 : 0.52, 1.825, side * 0.91),
        new THREE.Euler(-Math.PI / 2, 0, 0),
        [0.72, 0.2]
      );

      if (side > 0) {
        const oilCap = cylinder(0.14, 0.14, 0.06, 32, materials.black);
        oilCap.position.set(1.45, 1.88, side * 0.92);
        bank.add(oilCap);
        addBolt(bank, new THREE.Vector3(1.45, 1.925, side * 0.92), "y", 0.034, 0.025);
      }

      [-1.2, 0, 1.2].forEach((x) => {
        const coil = roundedBox(0.34, 0.1, 0.18, 0.04, materials.darkMetal);
        coil.position.set(x, 1.85, side * 0.93);
        bank.add(coil);

        const tube = cylinder(0.1, 0.1, 0.26, 18, materials.black);
        tube.rotation.x = Math.PI / 2;
        tube.position.set(x + 0.22, 1.48, side * 0.66);
        bank.add(tube);

        const injector = cylinder(0.055, 0.055, 0.22, 16, materials.service);
        injector.rotation.x = Math.PI / 2;
        injector.position.set(x - 0.2, 1.45, side * 0.58);
        bank.add(injector);
      });

      [-1.68, -0.56, 0.56, 1.68].forEach((x) => {
        addBolt(bank, new THREE.Vector3(x, 1.84, side * 1.05), "y");
        addBolt(bank, new THREE.Vector3(x, 1.5, side * 0.62), "z", 0.034, 0.026);
      });

      addTube(
        bank,
        [
          new THREE.Vector3(-1.62, 1.98, side * 1.05),
          new THREE.Vector3(-0.5, 2.02, side * 1.05),
          new THREE.Vector3(0.62, 2.0, side * 1.05),
          new THREE.Vector3(1.56, 1.94, side * 1.03)
        ],
        0.025,
        materials.wiring,
        26,
        8
      );

      [-1.2, 0, 1.2].forEach((x) => {
        addTube(
          bank,
          [
            new THREE.Vector3(x, 1.96, side * 1.04),
            new THREE.Vector3(x, 1.9, side * 0.98),
            new THREE.Vector3(x, 1.86, side * 0.93)
          ],
          0.016,
          materials.wiring,
          12,
          6
        );
      });

      addTube(
        bank,
        [
          new THREE.Vector3(-1.55, 1.52, side * 0.56),
          new THREE.Vector3(-0.4, 1.54, side * 0.54),
          new THREE.Vector3(0.75, 1.52, side * 0.56),
          new THREE.Vector3(1.48, 1.49, side * 0.58)
        ],
        0.035,
        materials.pulley,
        30,
        8
      );

      addGroupToEngine(side > 0 ? "frontBank" : "rearBank", bank);
    });

    const intakeGroup = new THREE.Group();
    intakeGroup.name = "Intake manifold and runners";
    const plenum = roundedBox(2.92, 0.42, 0.74, 0.18, materials.intake);
    plenum.position.set(0.35, 2.08, 0);
    intakeGroup.add(plenum);

    addFaceLabel(
      intakeGroup,
      "SOHC i-VTEC",
      new THREE.Vector3(0.2, 2.31, 0),
      new THREE.Euler(-Math.PI / 2, 0, 0),
      [1.0, 0.22]
    );

    [-1.0, -0.32, 0.36, 1.04].forEach((x) => {
      addRib(
        intakeGroup,
        new THREE.Vector3(x, 2.32, 0),
        new THREE.Vector3(0.05, 0.09, 0.72),
        materials.intake
      );
      addBolt(intakeGroup, new THREE.Vector3(x + 0.22, 2.31, 0.39), "y", 0.032, 0.025);
      addBolt(intakeGroup, new THREE.Vector3(x + 0.22, 2.31, -0.39), "y", 0.032, 0.025);
    });

    const mapSensor = roundedBox(0.26, 0.08, 0.18, 0.025, materials.black);
    mapSensor.position.copy(fuelSystemFace.mapSensor);
    intakeGroup.add(mapSensor);

    addTube(
      intakeGroup,
      [
        fuelSystemFace.mapSensor.clone().add(new THREE.Vector3(0.06, 0.04, 0)),
        new THREE.Vector3(1.28, 2.4, 0.38),
        new THREE.Vector3(1.62, 2.26, 0.52)
      ],
      0.012,
      materials.wiring,
      14,
      6
    );

    const throttle = cylinder(0.32, 0.32, 0.5, 42, materials.pulley);
    throttle.rotation.z = Math.PI / 2;
    throttle.position.set(2.15, 2.06, 0);
    intakeGroup.add(throttle);

    const throttlePlate = cylinder(0.26, 0.26, 0.025, 36, materials.black);
    throttlePlate.rotation.z = Math.PI / 2;
    throttlePlate.rotation.y = 0.45;
    throttlePlate.position.set(2.43, 2.06, 0);
    intakeGroup.add(throttlePlate);

    [-0.26, 0.26].forEach((z) => {
      addBolt(intakeGroup, new THREE.Vector3(2.16, 2.28, z), "x", 0.032, 0.03);
      addBolt(intakeGroup, new THREE.Vector3(2.16, 1.84, z), "x", 0.032, 0.03);
    });

    const airNeck = roundedBox(0.8, 0.34, 0.48, 0.12, materials.black);
    airNeck.position.set(2.72, 2.06, 0);
    intakeGroup.add(airNeck);

    [2.44, 2.86].forEach((x) => {
      const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.012, 8, 42), materials.bolt);
      clamp.rotation.y = Math.PI / 2;
      clamp.position.set(x, 2.06, 0);
      intakeGroup.add(clamp);
    });

    [-1.1, 0, 1.1].forEach((x) => {
      [-1, 1].forEach((side) => {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(x + 0.1, 1.94, side * 0.22),
          new THREE.Vector3(x + 0.06, 1.76, side * 0.42),
          new THREE.Vector3(x - 0.04, 1.48, side * 0.72)
        ]);
        const runner = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.08, 12), materials.intake);
        intakeGroup.add(runner);
      });
    });

    addRibbedHose(
      intakeGroup,
      [
        new THREE.Vector3(-1.0, 2.18, -0.36),
        new THREE.Vector3(-1.42, 2.28, -0.7),
        new THREE.Vector3(-1.88, 2.0, -0.92),
        new THREE.Vector3(-2.16, 1.62, -0.78)
      ],
      0.035,
      6
    );

    addGroupToEngine("intake", intakeGroup);

    const timingGroup = new THREE.Group();
    timingGroup.name = "Timing service components";
    const cover = roundedBox(0.22, 2.34, 1.92, 0.12, materials.coverTransparent);
    cover.position.set(-2.28, 1.08, 0);
    timingGroup.add(cover);

    const lowerCover = roundedBox(0.25, 0.74, 1.28, 0.12, materials.cover);
    lowerCover.position.set(-2.33, 0.45, 0);
    timingGroup.add(lowerCover);

    [-0.74, -0.38, 0, 0.38, 0.74].forEach((z) => {
      addRib(
        timingGroup,
        new THREE.Vector3(-2.48, 1.1, z),
        new THREE.Vector3(0.05, 1.82, 0.045),
        materials.cover
      );
    });

    [
      [2.05, -0.78],
      [2.05, 0.78],
      [1.28, -0.94],
      [1.28, 0.94],
      [0.55, -0.74],
      [0.55, 0.74],
      [0.18, 0]
    ].forEach(([y, z]) => {
      addBolt(timingGroup, new THREE.Vector3(-2.59, y, z), "x", 0.038, 0.03);
    });

    const pulleyData = [
      ["ca1CamPulley", 0.38, timingFace.ca1.y, timingFace.ca1.z, materials.service, { toothed: true, markAngle: -Math.PI / 2 }],
      ["ca2CamPulley", 0.38, timingFace.ca2.y, timingFace.ca2.z, materials.service, { toothed: true, markAngle: -Math.PI / 2 }],
      ["crankSprocket", 0.31, timingFace.crank.y, timingFace.crank.z, materials.service, { toothed: true, toothCount: isMobile ? 18 : 26, markAngle: Math.PI / 2 }],
      ["waterPump", 0.28, timingFace.waterPump.y, timingFace.waterPump.z, materials.coolant, { markAngle: 0 }],
      ["tensioner", 0.2, timingFace.tensioner.y, timingFace.tensioner.z, materials.service, {}],
      ["guidePulley", 0.19, timingFace.guide.y, timingFace.guide.z, materials.service, {}]
    ];

    pulleyData.forEach(([name, radius, y, z, material, pulleyOptions]) => {
      const pulley = addPulley(timingGroup, radius, y, z, material, { name, ...pulleyOptions });
      if (name === "waterPump") {
        for (let i = 0; i < 7; i += 1) {
          const fin = roundedBox(0.026, radius * 1.22, 0.032, 0.006, materials.coolant);
          fin.rotation.x = (i * Math.PI) / 7;
          fin.position.x = -0.115;
          pulley.add(fin);
        }
      }
    });

    const beltPoints = [
      new THREE.Vector3(timingFace.labelX, 1.88, timingFace.ca1.z),
      new THREE.Vector3(timingFace.labelX, 1.98, -0.05),
      new THREE.Vector3(timingFace.labelX, 1.88, timingFace.ca2.z),
      new THREE.Vector3(timingFace.labelX, 1.32, 0.56),
      new THREE.Vector3(timingFace.labelX, timingFace.waterPump.y - 0.08, 0.15),
      new THREE.Vector3(timingFace.labelX, timingFace.guide.y, timingFace.guide.z),
      new THREE.Vector3(timingFace.labelX, timingFace.crank.y, 0.12),
      new THREE.Vector3(timingFace.labelX, timingFace.crank.y, -0.12),
      new THREE.Vector3(timingFace.labelX, timingFace.tensioner.y, timingFace.tensioner.z),
      new THREE.Vector3(timingFace.labelX, 1.32, -0.58)
    ];
    const beltCurve = new THREE.CatmullRomCurve3(beltPoints, true);
    const belt = new THREE.Mesh(
      new THREE.TubeGeometry(beltCurve, 96, 0.045, 10, true),
      materials.belt
    );
    timingGroup.add(belt);
    addBeltTeeth(timingGroup, beltCurve, 48);

    const tensionerArm = roundedBox(0.06, 0.52, 0.08, 0.02, materials.bolt);
    tensionerArm.position.set(-2.52, timingFace.tensioner.y - 0.16, timingFace.tensioner.z - 0.08);
    tensionerArm.rotation.x = -0.52;
    timingGroup.add(tensionerArm);

    [-0.8, 0, 0.8].forEach((z) => {
      const seal = cylinder(0.08, 0.08, 0.035, 22, materials.service);
      seal.rotation.z = Math.PI / 2;
      seal.position.set(-2.65, 2.12, z);
      timingGroup.add(seal);
    });

    timingKitFaceLabel = addFaceLabel(
      timingGroup,
      "AISIN TKH-002",
      new THREE.Vector3(-2.66, 2.23, 0),
      new THREE.Euler(0, Math.PI / 2, 0),
      [0.92, 0.22]
    );

    addGroupToEngine("timing", timingGroup);

    const accessoryGroup = new THREE.Group();
    accessoryGroup.name = "Accessory drive components";
    const frontAccessoryGroup = new THREE.Group();
    frontAccessoryGroup.name = "Front accessory layer";

    const alternator = cylinder(0.38, 0.38, 0.74, 48, materials.pulley);
    alternator.rotation.z = Math.PI / 2;
    alternator.position.copy(accessoryFace.alternator);
    frontAccessoryGroup.add(alternator);

    [-0.24, 0, 0.24].forEach((xOffset) => {
      const vent = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.012, 8, 36), materials.darkMetal);
      vent.rotation.y = Math.PI / 2;
      vent.position.copy(accessoryFace.alternator).add(new THREE.Vector3(xOffset, 0, 0));
      frontAccessoryGroup.add(vent);
    });

    for (let i = 0; i < 10; i += 1) {
      const slot = roundedBox(0.026, 0.18, 0.032, 0.005, materials.darkMetal);
      slot.position.copy(accessoryFace.alternator).add(new THREE.Vector3(-0.3, 0, 0));
      slot.rotation.x = (i * Math.PI) / 10;
      frontAccessoryGroup.add(slot);
    }

    const alternatorFrontCap = cylinder(0.31, 0.31, 0.055, 44, materials.darkMetal);
    alternatorFrontCap.rotation.z = Math.PI / 2;
    alternatorFrontCap.position.copy(accessoryFace.alternator).add(new THREE.Vector3(-0.39, 0, 0));
    frontAccessoryGroup.add(alternatorFrontCap);

    const alternatorPulley = cylinder(0.18, 0.18, 0.13, 36, materials.pulley);
    alternatorPulley.rotation.z = Math.PI / 2;
    alternatorPulley.position.copy(accessoryFace.alternator).add(new THREE.Vector3(-0.48, 0, 0));
    frontAccessoryGroup.add(alternatorPulley);

    [-0.08, 0.08].forEach((xOffset) => {
      const groove = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.006, 6, 30), materials.black);
      groove.rotation.y = Math.PI / 2;
      groove.position.copy(alternatorPulley.position).add(new THREE.Vector3(xOffset, 0, 0));
      frontAccessoryGroup.add(groove);
    });

    [
      new THREE.Vector3(0.05, 0.38, -0.08),
      new THREE.Vector3(0.08, -0.34, 0.08)
    ].forEach((offset) => {
      const ear = roundedBox(0.28, 0.14, 0.16, 0.035, materials.block);
      ear.position.copy(accessoryFace.alternator).add(offset);
      frontAccessoryGroup.add(ear);
      addBolt(frontAccessoryGroup, ear.position.clone().add(new THREE.Vector3(-0.15, 0, 0)), "x", 0.035, 0.026);
    });

    const alternatorPost = cylinder(0.045, 0.045, 0.16, 16, materials.bolt);
    alternatorPost.rotation.x = Math.PI / 2;
    alternatorPost.position.copy(accessoryFace.alternator).add(new THREE.Vector3(0.34, 0.2, -0.26));
    frontAccessoryGroup.add(alternatorPost);

    addTube(
      frontAccessoryGroup,
      [
        accessoryFace.alternator.clone().add(new THREE.Vector3(0.36, 0.22, 0.26)),
        new THREE.Vector3(-2.18, 1.58, 1.0),
        new THREE.Vector3(-1.18, 1.72, 1.1)
      ],
      0.018,
      materials.wiring,
      24,
      7
    );

    const compressor = roundedBox(0.7, 0.46, 0.54, 0.12, materials.darkMetal);
    compressor.position.copy(accessoryFace.compressor);
    frontAccessoryGroup.add(compressor);

    const compressorClutch = cylinder(0.25, 0.25, 0.08, 36, materials.pulley);
    compressorClutch.rotation.z = Math.PI / 2;
    compressorClutch.position.copy(accessoryFace.compressor).add(new THREE.Vector3(-0.4, 0, 0));
    frontAccessoryGroup.add(compressorClutch);

    const compressorClutchFace = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 36), materials.darkMetal);
    compressorClutchFace.rotation.y = Math.PI / 2;
    compressorClutchFace.position.copy(compressorClutch.position).add(new THREE.Vector3(-0.048, 0, 0));
    frontAccessoryGroup.add(compressorClutchFace);

    [
      new THREE.Vector3(-0.22, 0.26, 0.18),
      new THREE.Vector3(0.16, 0.26, -0.18),
      new THREE.Vector3(0.18, -0.25, 0.18),
      new THREE.Vector3(-0.2, -0.25, -0.18)
    ].forEach((offset) => {
      addBolt(frontAccessoryGroup, accessoryFace.compressor.clone().add(offset), "x", 0.032, 0.026);
    });

    [
      new THREE.Vector3(-0.06, 0.29, 0.22),
      new THREE.Vector3(0.16, 0.28, 0.06)
    ].forEach((offset, index) => {
      const port = cylinder(index === 0 ? 0.055 : 0.045, index === 0 ? 0.055 : 0.045, 0.2, 18, materials.bolt);
      port.rotation.x = Math.PI / 2;
      port.position.copy(accessoryFace.compressor).add(offset);
      frontAccessoryGroup.add(port);
    });

    addTube(
      frontAccessoryGroup,
      [
        accessoryFace.compressor.clone().add(new THREE.Vector3(-0.06, 0.38, 0.3)),
        new THREE.Vector3(-2.54, 1.06, 1.18),
        new THREE.Vector3(-1.34, 1.28, 1.36),
        new THREE.Vector3(-0.22, 1.22, 1.28)
      ],
      0.026,
      materials.bolt,
      30,
      8
    );

    addTube(
      frontAccessoryGroup,
      [
        accessoryFace.compressor.clone().add(new THREE.Vector3(0.16, 0.36, 0.14)),
        new THREE.Vector3(-2.36, 0.92, 0.82),
        new THREE.Vector3(-1.48, 0.76, 1.08)
      ],
      0.02,
      materials.hose,
      22,
      7
    );

    const accessoryPulley = cylinder(0.28, 0.28, 0.16, 42, materials.pulley);
    accessoryPulley.rotation.z = Math.PI / 2;
    accessoryPulley.position.copy(accessoryFace.idler);
    frontAccessoryGroup.add(accessoryPulley);

    [-0.07, 0, 0.07].forEach((xOffset) => {
      const groove = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.008, 7, 34), materials.darkMetal);
      groove.rotation.y = Math.PI / 2;
      groove.position.copy(accessoryFace.idler).add(new THREE.Vector3(xOffset, 0, 0));
      frontAccessoryGroup.add(groove);
    });

    const accessoryBeltPoints = [
      new THREE.Vector3(accessoryFace.beltX, accessoryFace.alternator.y + 0.02, accessoryFace.alternator.z),
      new THREE.Vector3(accessoryFace.beltX, 1.08, 0.58),
      new THREE.Vector3(accessoryFace.beltX, accessoryFace.idler.y, accessoryFace.idler.z),
      new THREE.Vector3(accessoryFace.beltX, accessoryFace.compressor.y, accessoryFace.compressor.z),
      new THREE.Vector3(accessoryFace.beltX, timingFace.crank.y + 0.16, 0.28),
      new THREE.Vector3(accessoryFace.beltX, 0.88, 0.34)
    ];
    const accessoryBeltCurve = new THREE.CatmullRomCurve3(accessoryBeltPoints, true);
    const serpentine = new THREE.Mesh(
      new THREE.TubeGeometry(
        accessoryBeltCurve,
        64,
        0.04,
        10,
        true
      ),
      materials.rubber
    );
    frontAccessoryGroup.add(serpentine);

    addBeltTeeth(
      frontAccessoryGroup,
      accessoryBeltCurve,
      34,
      accessoryFace.beltX - 0.04
    );

    const accessoryBracket = roundedBox(0.18, 1.15, 0.18, 0.04, materials.block);
    accessoryBracket.position.set(-2.64, 0.92, 0.72);
    accessoryBracket.rotation.z = 0.18;
    frontAccessoryGroup.add(accessoryBracket);

    addRibbedHose(
      frontAccessoryGroup,
      [
        new THREE.Vector3(-2.58, 1.02, 0.36),
        new THREE.Vector3(-2.84, 1.36, 0.74),
        new THREE.Vector3(-2.58, 1.62, 1.08),
        new THREE.Vector3(-1.82, 1.52, 1.16)
      ],
      0.035,
      5
    );

    accessoryGroup.add(frontAccessoryGroup);
    trackModelModeObject("frontAccessories", frontAccessoryGroup, new THREE.Vector3(-0.68, 0.08, -0.06));

    const starterGroup = new THREE.Group();
    starterGroup.name = "Starter motor";
    const starterFlange = roundedBox(0.09, 0.44, 0.42, 0.04, materials.block);
    starterFlange.position.copy(accessoryFace.starter).add(new THREE.Vector3(-0.38, 0, 0));
    starterGroup.add(starterFlange);

    [
      new THREE.Vector3(-0.43, 0.16, 0.15),
      new THREE.Vector3(-0.43, -0.16, -0.15)
    ].forEach((offset) => {
      addBolt(starterGroup, accessoryFace.starter.clone().add(offset), "x", 0.035, 0.028);
    });

    const starterMotor = cylinder(0.2, 0.2, 0.64, 36, materials.darkMetal);
    starterMotor.rotation.z = Math.PI / 2;
    starterMotor.position.copy(accessoryFace.starter);
    starterGroup.add(starterMotor);

    const starterNose = cylinder(0.14, 0.14, 0.26, 32, materials.pulley);
    starterNose.rotation.z = Math.PI / 2;
    starterNose.position.copy(accessoryFace.starter).add(new THREE.Vector3(-0.43, 0, -0.02));
    starterGroup.add(starterNose);

    const starterSolenoid = roundedBox(0.48, 0.16, 0.18, 0.05, materials.black);
    starterSolenoid.position.copy(accessoryFace.starter).add(new THREE.Vector3(-0.04, 0.24, 0.12));
    starterGroup.add(starterSolenoid);

    addTube(
      starterGroup,
      [
        accessoryFace.starter.clone().add(new THREE.Vector3(0.04, 0.34, 0.16)),
        new THREE.Vector3(1.82, 1.18, 1.02),
        new THREE.Vector3(0.92, 1.82, 1.14)
      ],
      0.024,
      materials.wiring,
      20,
      7
    );
    accessoryGroup.add(starterGroup);

    addGroupToEngine("accessories", accessoryGroup);

    const exhaustGroup = new THREE.Group();
    exhaustGroup.name = "Integrated exhaust outlets and close-coupled catalysts";
    [-1, 1].forEach((side) => {
      const castOutlet = roundedBox(3.18, 0.28, 0.24, 0.08, materials.block);
      castOutlet.position.set(0.02, 1.02, side * 1.1);
      castOutlet.rotation.x = side * 0.1;
      exhaustGroup.add(castOutlet);

      [-1.1, 0, 1.1].forEach((x) => {
        addTube(
          exhaustGroup,
          [
            new THREE.Vector3(x, 1.18, side * 0.98),
            new THREE.Vector3(x * 0.92, 1.02, side * 1.1),
            new THREE.Vector3(x * 0.76, 0.82, side * 1.25)
          ],
          0.07,
          materials.block,
          18,
          10
        );

        const portFace = roundedBox(0.38, 0.16, 0.08, 0.025, materials.exhaust);
        portFace.position.set(x * 0.76, 0.8, side * 1.29);
        portFace.rotation.x = side * 0.12;
        exhaustGroup.add(portFace);
        addBolt(exhaustGroup, new THREE.Vector3(x * 0.76 - 0.16, 0.91, side * 1.21), "z", 0.03, 0.022);
        addBolt(exhaustGroup, new THREE.Vector3(x * 0.76 + 0.16, 0.91, side * 1.21), "z", 0.03, 0.022);
      });

      const heatShield = roundedBox(2.72, 0.045, 0.42, 0.055, materials.heatShield);
      heatShield.position.set(0.02, 0.9, side * 1.34);
      heatShield.rotation.x = side * 0.18;
      exhaustGroup.add(heatShield);

      [-0.95, -0.32, 0.32, 0.95].forEach((x) => {
        const crease = roundedBox(0.032, 0.035, 0.4, 0.008, materials.bolt);
        crease.position.set(x, 0.925, side * 1.34);
        crease.rotation.x = side * 0.18;
        exhaustGroup.add(crease);
      });

      const catalyst = cylinder(0.24, 0.28, 0.72, 36, materials.heatShield);
      catalyst.rotation.x = Math.PI / 2;
      catalyst.position.set(-0.2, 0.55, side * 1.58);
      exhaustGroup.add(catalyst);

      [-0.25, 0.25].forEach((zOffset) => {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.012, 8, 32), materials.heatShield);
        band.position.set(-0.2, 0.55, side * (1.58 + zOffset));
        exhaustGroup.add(band);
      });

      [-0.34, 0.34].forEach((zOffset) => {
        const endCap = cylinder(0.19, 0.19, 0.08, 28, materials.exhaust);
        endCap.rotation.x = Math.PI / 2;
        endCap.position.set(-0.2, 0.55, side * (1.58 + zOffset));
        exhaustGroup.add(endCap);
      });

      addTube(
        exhaustGroup,
        [
          new THREE.Vector3(-0.05, 0.72, side * 1.33),
          new THREE.Vector3(-0.16, 0.62, side * 1.46),
          new THREE.Vector3(-0.2, 0.55, side * 1.58)
        ],
        0.09,
        materials.exhaust,
        18,
        12
      );

      const sensor = cylinder(0.045, 0.045, 0.28, 16, materials.bolt);
      sensor.rotation.x = Math.PI / 2;
      sensor.position.set(0.76, 0.76, side * 1.47);
      exhaustGroup.add(sensor);
    });
    addGroupToEngine("exhaust", exhaustGroup);

    const serviceExtras = new THREE.Group();
    serviceExtras.name = "Service extras";
    const oilFilterGroup = new THREE.Group();
    oilFilterGroup.name = "Front oil filter";
    const oilFilter = cylinder(0.18, 0.18, 0.48, 36, materials.label);
    oilFilter.rotation.z = Math.PI / 2;
    oilFilter.position.copy(accessoryFace.oilFilter);
    oilFilterGroup.add(oilFilter);

    const filterBand = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.012, 8, 28), materials.service);
    filterBand.rotation.y = Math.PI / 2;
    filterBand.position.copy(accessoryFace.oilFilter);
    oilFilterGroup.add(filterBand);

    [-0.16, -0.08, 0.08, 0.16].forEach((xOffset) => {
      const grip = new THREE.Mesh(new THREE.TorusGeometry(0.181, 0.006, 6, 28), materials.darkMetal);
      grip.rotation.y = Math.PI / 2;
      grip.position.copy(accessoryFace.oilFilter).add(new THREE.Vector3(xOffset, 0, 0));
      oilFilterGroup.add(grip);
    });

    const filterBase = cylinder(0.2, 0.2, 0.06, 32, materials.darkMetal);
    filterBase.rotation.z = Math.PI / 2;
    filterBase.position.copy(accessoryFace.oilFilter).add(new THREE.Vector3(0.27, 0, 0));
    oilFilterGroup.add(filterBase);

    serviceExtras.add(oilFilterGroup);
    trackModelModeObject("oilFilter", oilFilterGroup, new THREE.Vector3(-0.38, 0.08, 0.18));

    const dipstick = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(1.55, 0.58, 0.8),
          new THREE.Vector3(1.66, 1.08, 0.96),
          new THREE.Vector3(1.42, 1.34, 1.08)
        ]),
        20,
        0.025,
        8
      ),
      materials.service
    );
    serviceExtras.add(dipstick);

    const dipstickHandle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 24), materials.service);
    dipstickHandle.rotation.x = Math.PI / 2;
    dipstickHandle.position.set(1.42, 1.34, 1.08);
    serviceExtras.add(dipstickHandle);

    const highPressurePumpGroup = new THREE.Group();
    highPressurePumpGroup.name = "Direct-injection high-pressure fuel pump";

    const pumpMount = roundedBox(0.38, 0.12, 0.3, 0.04, materials.block);
    pumpMount.position.copy(fuelSystemFace.highPressurePump).add(new THREE.Vector3(0.02, -0.08, 0));
    highPressurePumpGroup.add(pumpMount);

    const pumpBody = cylinder(0.14, 0.14, 0.24, 28, materials.darkMetal);
    pumpBody.rotation.z = Math.PI / 2;
    pumpBody.position.copy(fuelSystemFace.highPressurePump);
    highPressurePumpGroup.add(pumpBody);

    const pumpCap = cylinder(0.09, 0.09, 0.12, 24, materials.service);
    pumpCap.rotation.z = Math.PI / 2;
    pumpCap.position.copy(fuelSystemFace.highPressurePump).add(new THREE.Vector3(-0.16, 0.02, 0));
    highPressurePumpGroup.add(pumpCap);

    [
      new THREE.Vector3(-0.16, -0.08, -0.12),
      new THREE.Vector3(0.18, -0.08, 0.12)
    ].forEach((offset) => {
      addBolt(highPressurePumpGroup, fuelSystemFace.highPressurePump.clone().add(offset), "y", 0.028, 0.024);
    });

    addTube(
      highPressurePumpGroup,
      [
        fuelSystemFace.highPressurePump.clone().add(new THREE.Vector3(0.12, 0.03, 0.08)),
        new THREE.Vector3(-0.78, 1.66, 0.08),
        fuelSystemFace.frontFuelRail
      ],
      0.018,
      materials.bolt,
      24,
      7
    );

    addTube(
      highPressurePumpGroup,
      [
        fuelSystemFace.highPressurePump.clone().add(new THREE.Vector3(0.12, 0.03, -0.08)),
        new THREE.Vector3(-0.72, 1.66, -0.24),
        fuelSystemFace.rearFuelRail
      ],
      0.018,
      materials.bolt,
      24,
      7
    );

    addTube(
      highPressurePumpGroup,
      [
        fuelSystemFace.highPressurePump.clone().add(new THREE.Vector3(-0.16, 0.02, 0)),
        new THREE.Vector3(-1.72, 1.96, -0.16),
        new THREE.Vector3(-2.04, 1.78, 0.18)
      ],
      0.016,
      materials.wiring,
      18,
      6
    );

    serviceExtras.add(highPressurePumpGroup);

    addRibbedHose(
      serviceExtras,
      [
        new THREE.Vector3(-2.52, 1.08, 0.22),
        new THREE.Vector3(-1.76, 1.36, 0.98),
        new THREE.Vector3(-0.52, 1.28, 1.36),
        new THREE.Vector3(0.9, 1.1, 1.34)
      ],
      0.06,
      8
    );

    addRibbedHose(
      serviceExtras,
      [
        new THREE.Vector3(-2.3, 0.9, -0.3),
        new THREE.Vector3(-1.38, 0.78, -1.05),
        new THREE.Vector3(-0.1, 0.58, -1.32),
        new THREE.Vector3(1.1, 0.72, -1.24)
      ],
      0.045,
      7
    );

    addTube(
      serviceExtras,
      [
        new THREE.Vector3(-1.9, 1.95, 0.0),
        new THREE.Vector3(-0.82, 2.34, 0.28),
        new THREE.Vector3(0.42, 2.36, 0.42),
        new THREE.Vector3(1.88, 2.1, 0.2)
      ],
      0.022,
      materials.wiring,
      30,
      7
    );

    addTube(
      serviceExtras,
      [
        new THREE.Vector3(-0.28, 0.72, -1.32),
        new THREE.Vector3(-0.56, 1.12, -1.18),
        new THREE.Vector3(-0.62, 1.58, -0.76),
        new THREE.Vector3(-0.18, 1.96, -0.34)
      ],
      0.026,
      materials.exhaust,
      28,
      8
    );

    [-1, 1].forEach((side) => {
      const mount = roundedBox(0.55, 0.24, 0.35, 0.08, materials.darkMetal);
      mount.position.set(-1.98, 0.2, side * 0.98);
      serviceExtras.add(mount);
      addBolt(serviceExtras, new THREE.Vector3(-1.98, 0.36, side * 0.98), "y", 0.055, 0.04);
    });

    addGroupToEngine("service", serviceExtras);

    buildComponentLabels();

    engine.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = !isMobile;
        child.receiveShadow = !isMobile;
      }
    });

    selectableParts.forEach((part) => tuneMaterialMemory(part));
  }

  function buildComponentLabels() {
    const labelGroup = new THREE.Group();
    labelGroup.name = "Major component labels";

    const labels = [
      {
        text: "Alternator",
        anchor: accessoryFace.alternator.clone(),
        offset: new THREE.Vector3(-0.38, 0.28, 0.2),
        tone: "blue",
        width: 1.12,
        priority: 1,
        key: "alternator",
        groups: ["drive", "service"]
      },
      {
        text: "Starter Motor",
        anchor: accessoryFace.starter.clone(),
        offset: new THREE.Vector3(-0.82, 0.28, 0.28),
        mobileOffset: new THREE.Vector3(-0.92, 0.32, 0.18),
        tone: "orange",
        width: 1.28,
        mobileWidth: 1.12,
        priority: 1,
        key: "starter",
        groups: ["drive", "service"]
      },
      {
        text: "A/C Compressor",
        anchor: accessoryFace.compressor.clone(),
        offset: new THREE.Vector3(0.52, 0.24, 0.34),
        tone: "blue",
        width: 1.34,
        priority: 1,
        key: "compressor",
        groups: ["drive", "service"]
      },
      {
        text: "Serpentine Belt",
        anchor: accessoryFace.beltMid.clone(),
        offset: new THREE.Vector3(0.48, 0.48, -0.26),
        tone: "green",
        width: 1.34,
        priority: 2,
        key: "serpentine",
        groups: ["drive"]
      },
      {
        text: "Drive Belt Tensioner",
        anchor: accessoryFace.idler.clone(),
        offset: new THREE.Vector3(-0.36, 0.28, -0.3),
        tone: "orange",
        width: 1.62,
        priority: 2,
        key: "driveTensioner",
        groups: ["drive"]
      },
      {
        text: "Throttle Body",
        anchor: accessoryFace.throttle.clone(),
        offset: new THREE.Vector3(0.34, 0.36, 0.22),
        mobileOffset: new THREE.Vector3(-0.78, 0.42, 0.18),
        tone: "blue",
        width: 1.22,
        mobileWidth: 1.12,
        priority: 1,
        key: "throttleBody",
        groups: ["intake"]
      },
      {
        text: "Air Intake Tube",
        anchor: serviceReferenceFace.airIntakeTube.clone(),
        offset: new THREE.Vector3(-0.06, -0.46, -0.34),
        mobileOffset: new THREE.Vector3(-1.04, -0.28, -0.2),
        tone: "green",
        width: 1.26,
        mobileWidth: 1.14,
        priority: 4,
        key: "airIntakeTube",
        groups: ["intake"]
      },
      {
        text: "DI Fuel Pump",
        anchor: fuelSystemFace.highPressurePump.clone(),
        offset: new THREE.Vector3(-0.28, 0.4, -0.38),
        tone: "orange",
        width: 1.28,
        priority: 2,
        key: "diFuelPump",
        groups: ["intake", "service"]
      },
      {
        text: "Fuel Rails",
        anchor: new THREE.Vector3(0.2, 1.55, 0),
        offset: new THREE.Vector3(-0.18, 0.46, -0.52),
        tone: "green",
        width: 1.08,
        priority: 2,
        key: "fuelRails",
        groups: ["intake"]
      },
      {
        text: "Fuel Injectors",
        anchor: serviceReferenceFace.frontFuelInjectors.clone(),
        offset: new THREE.Vector3(0.28, -0.2, 0.48),
        tone: "green",
        width: 1.24,
        priority: 3,
        key: "fuelInjectors",
        groups: ["intake"]
      },
      {
        text: "MAP Sensor",
        anchor: fuelSystemFace.mapSensor.clone(),
        offset: new THREE.Vector3(0.46, 0.42, 0.28),
        tone: "blue",
        width: 1.0,
        priority: 3,
        key: "mapSensor",
        groups: ["intake"]
      },
      {
        text: "Intake Manifold",
        anchor: new THREE.Vector3(0.38, 2.2, 0),
        offset: new THREE.Vector3(-0.12, 0.46, 0.32),
        tone: "blue",
        width: 1.34,
        priority: 1,
        key: "intakeManifold",
        groups: ["intake"]
      },
      {
        text: "Ignition Coils",
        anchor: serviceReferenceFace.ignitionCoils.clone(),
        offset: new THREE.Vector3(-0.18, 0.42, 0.5),
        tone: "blue",
        width: 1.26,
        priority: 2,
        key: "ignitionCoils",
        groups: ["intake", "service"]
      },
      {
        text: "Front Head Cover",
        anchor: new THREE.Vector3(-0.18, 1.78, 0.98),
        offset: new THREE.Vector3(-0.62, 0.44, 0.42),
        tone: "blue",
        width: 1.45,
        priority: 2,
        key: "frontHeadCover",
        groups: ["service"]
      },
      {
        text: "Rear Head Cover",
        anchor: new THREE.Vector3(-0.18, 1.78, -0.98),
        offset: new THREE.Vector3(-0.58, 0.46, -0.42),
        tone: "blue",
        width: 1.4,
        priority: 2,
        key: "rearHeadCover",
        groups: ["service"]
      },
      {
        text: "Timing Belt",
        anchor: new THREE.Vector3(timingFace.labelX, 1.34, 0.58),
        offset: new THREE.Vector3(0.38, 0.52, 0.42),
        tone: "green",
        width: 1.16,
        priority: 1,
        key: "timingBelt",
        groups: ["timing"]
      },
      {
        text: "Cam Pulleys CA1/CA2",
        anchor: new THREE.Vector3(timingFace.x, timingFace.ca1.y, 0),
        offset: new THREE.Vector3(-0.5, 0.74, 0),
        tone: "orange",
        width: 1.62,
        priority: 3,
        key: "camPulleys",
        groups: ["timing"]
      },
      {
        text: "Water Pump",
        anchor: timingFace.waterPump.clone(),
        offset: new THREE.Vector3(-0.52, 0.18, -0.36),
        tone: "blue",
        width: 1.1,
        priority: 1,
        key: "waterPump",
        groups: ["timing", "service"]
      },
      {
        text: "Tensioner",
        anchor: timingFace.tensioner.clone(),
        offset: new THREE.Vector3(-0.46, -0.08, 0.48),
        tone: "orange",
        width: 1.0,
        priority: 3,
        key: "timingBeltTensioner",
        groups: ["timing"]
      },
      {
        text: "Idler",
        anchor: timingFace.guide.clone(),
        offset: new THREE.Vector3(-0.46, -0.02, -0.44),
        tone: "orange",
        width: 0.76,
        priority: 3,
        key: "timingIdler",
        groups: ["timing"]
      },
      {
        text: "Crank Sprocket",
        anchor: timingFace.crank.clone(),
        offset: new THREE.Vector3(-0.52, -0.1, 0.18),
        tone: "orange",
        width: 1.34,
        priority: 2,
        key: "crankSprocket",
        groups: ["timing"]
      },
      {
        text: "Oil Filler Cap",
        anchor: serviceReferenceFace.oilFillerCap.clone(),
        offset: new THREE.Vector3(0.36, 0.44, 0.48),
        tone: "orange",
        width: 1.18,
        priority: 3,
        key: "oilFillerCap",
        groups: ["service"]
      },
      {
        text: "Oil Filter",
        anchor: accessoryFace.oilFilter.clone(),
        offset: new THREE.Vector3(0.42, 0.38, 0.26),
        tone: "blue",
        width: 0.96,
        priority: 1,
        key: "oilFilter",
        groups: ["drive", "service"]
      },
      {
        text: "Dipstick",
        anchor: new THREE.Vector3(1.42, 1.34, 1.08),
        offset: new THREE.Vector3(0.18, 0.46, 0.44),
        tone: "orange",
        width: 0.88,
        priority: 2,
        key: "dipstick",
        groups: ["service"]
      },
      {
        text: "Engine Mounts",
        anchor: serviceReferenceFace.frontEngineMount.clone(),
        offset: new THREE.Vector3(-0.48, -0.28, 0.24),
        tone: "blue",
        width: 1.28,
        priority: 2,
        key: "engineMounts",
        groups: ["service"]
      },
      {
        text: "EGR Pipe",
        anchor: serviceReferenceFace.egrPipe.clone(),
        offset: new THREE.Vector3(-0.24, 0.36, -0.38),
        tone: "orange",
        width: 0.9,
        priority: 3,
        key: "egrPipe",
        groups: ["intake", "service"]
      },
      {
        text: "Primary Catalyst",
        anchor: serviceReferenceFace.primaryCatalysts.clone(),
        offset: new THREE.Vector3(0.38, -0.36, 0.24),
        tone: "orange",
        width: 1.34,
        priority: 3,
        key: "primaryCatalyst",
        groups: ["service"]
      },
      {
        text: "O2 Sensors",
        anchor: serviceReferenceFace.frontOxygenSensor.clone(),
        offset: new THREE.Vector3(0.46, 0.22, 0.32),
        tone: "blue",
        width: 1.0,
        priority: 4,
        key: "o2Sensors",
        groups: ["service"]
      }
    ];

    labels
      .forEach((label) => {
        const offset = isMobile && label.mobileOffset ? label.mobileOffset : label.offset;
        const width = isMobile && label.mobileWidth ? label.mobileWidth : label.width;
        addComponentLabel(labelGroup, label.text, label.anchor, offset, label.tone, width, label.key, label.groups);
      });

    engine.add(labelGroup);
    setComponentLabelsVisible(labelsVisible);
  }

  const hotspots = [
    {
      key: "timing",
      label: "Timing Service",
      point: new THREE.Vector3(-2.72, 1.55, 0.0),
      description:
        "Timing-side service area showing the belt path, cam pulleys, crank sprocket, tensioner, idlers, cover seal, and water pump.",
      facts: [
        ["Service", "4/25/2026"],
        ["Mileage", "165,980 mi"],
        ["Kit", "AISIN TKH-002"]
      ],
      view: "timing"
    },
    {
      key: "intake",
      label: "Intake Manifold",
      point: new THREE.Vector3(0.42, 2.28, 0),
      description:
        "Upper intake plenum, throttle body, MAP sensor, EGR pipe reference, and six runners feeding the two J-series cylinder banks.",
      facts: [["System", "Air intake"], ["Fuel", "Direct injection"], ["Use", "Orientation"]]
    },
    {
      key: "waterPump",
      label: "Water Pump",
      point: timingFace.waterPump.clone().setX(-2.82),
      description:
        "Water pump location within the timing service area. The water pump was replaced during the recorded timing belt service.",
      facts: [["Status", "Replaced"], ["Service", "Timing belt job"], ["Source", "AISIN kit"]]
    },
    {
      key: "crankSprocket",
      label: "Crank Sprocket",
      point: timingFace.crank.clone().setX(-2.82),
      description:
        "Crankshaft sprocket reference at the lower timing belt path. This was replaced during the recorded service.",
      facts: [["Status", "Replaced"], ["Area", "Lower timing path"], ["Mileage", "165,980 mi"]]
    },
    {
      key: "accessories",
      label: "Accessory Drive",
      point: accessoryFace.beltMid.clone(),
      description:
        "Front/timing-side accessory drive group with alternator, A/C compressor, pulley path, and serpentine belt reference.",
      facts: [["Side", "Front/timing side"], ["Includes", "Alternator"], ["Mode", "Orientation"]]
    },
    {
      key: "frontBank",
      label: "Cylinder Bank",
      point: new THREE.Vector3(0, 1.74, 1.04),
      description:
        "One of the two V6 cylinder banks with valve cover, coil pack layout, and head reference geometry.",
      facts: [["Layout", "J-series V6"], ["Cylinders", "3 per bank"], ["View", "Service reference"]]
    }
  ];

  const views = {
    overview: {
      camera: defaultCamera,
      target: defaultTarget
    },
    timing: {
      camera: new THREE.Vector3(-6.2, 2.15, 0.35),
      target: new THREE.Vector3(-1.7, 1.1, 0.0)
    },
    intake: {
      camera: new THREE.Vector3(2.6, 4.6, 4.5),
      target: new THREE.Vector3(0.25, 1.65, 0)
    },
    accessories: {
      camera: new THREE.Vector3(-5.8, 2.0, 1.95),
      target: new THREE.Vector3(-2.35, 0.92, 0.12)
    },
    frontAccessories: {
      camera: isMobile ? new THREE.Vector3(-10.2, 2.22, 7.4) : new THREE.Vector3(-8.8, 2.15, 5.7),
      target: isMobile ? new THREE.Vector3(-2.45, 0.96, 0.74) : new THREE.Vector3(-2.82, 0.94, 0.72)
    },
    service: {
      camera: new THREE.Vector3(-5.7, 2.36, 1.65),
      target: new THREE.Vector3(-1.9, 1.08, 0.14)
    }
  };

  function buildHotspots() {
    hotspots.forEach((hotspot) => {
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.08, 24, 16), materials.marker.clone());
      marker.position.copy(hotspot.point);
      markerMeshes.set(hotspot.key, marker);
      engine.add(marker);

      const button = document.createElement("button");
      button.className = "engine-hotspot-button";
      button.type = "button";
      button.textContent = hotspot.label;
      button.title = hotspot.label;
      button.setAttribute("aria-label", hotspot.label);
      button.addEventListener("click", () => selectHotspot(hotspot.key, true));
      hotspotButtons.set(hotspot.key, button);
      hotspotLayer?.appendChild(button);
    });
  }

  function setCameraView(key) {
    const view = views[key];
    if (!view) {
      return;
    }

    controls.autoRotate = false;
    cameraTween = {
      from: camera.position.clone(),
      to: view.camera.clone(),
      fromTarget: controls.target.clone(),
      toTarget: view.target.clone(),
      start: performance.now(),
      duration: 850
    };

    viewButtons.forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.engineView === key ? "true" : "false");
    });
  }

  function setInspector(hotspot) {
    if (!hotspot) {
      return;
    }

    inspectorTitle.textContent = hotspot.label;
    inspectorDescription.textContent = hotspot.description;
    inspectorMeta.innerHTML = hotspot.facts
      .map(
        ([label, value]) => `
          <div class="mini-spec">
            <span>${label}</span>
            <span>${value}</span>
          </div>
        `
      )
      .join("");
  }

  function resetHighlights() {
    selectableParts.forEach((part) => {
      part.traverse((child) => {
        if (!child.isMesh || !child.material) {
          return;
        }
        const memory = originalEmissive.get(child.uuid);
        if (child.material.emissive && memory) {
          child.material.emissive.copy(memory.color);
          child.material.emissiveIntensity = memory.intensity;
        }
      });
    });

    markerMeshes.forEach((marker) => {
      marker.material.color.set(0x79d4ff);
      marker.scale.setScalar(1);
    });
    hotspotButtons.forEach((button) => button.classList.remove("active"));
  }

  function highlightPart(key, activeHotspotKey = key) {
    resetHighlights();
    const part = selectableParts.get(key) || selectableParts.get("timing");
    part?.traverse((child) => {
      if (!child.isMesh || !child.material?.emissive) {
        return;
      }
      child.material.emissive.set(0x3a1608);
      child.material.emissiveIntensity = 0.52;
    });

    const marker = markerMeshes.get(activeHotspotKey);
    if (marker) {
      marker.material.color.set(0xff915e);
      marker.scale.setScalar(1.35);
    }
    hotspotButtons.get(activeHotspotKey)?.classList.add("active");
  }

  function selectHotspot(key, moveCamera = false) {
    const hotspot = hotspots.find((entry) => entry.key === key) || hotspots[0];
    selectedKey = hotspot.key;
    setInspector(hotspot);
    const partKey = hotspot.key === "waterPump" || hotspot.key === "crankSprocket" ? "timing" : hotspot.key;
    highlightPart(partKey, hotspot.key);
    const referenceKey =
      {
        timing: "timingBelt",
        intake: "intakeManifold",
        waterPump: "waterPump",
        crankSprocket: "crankSprocket",
        accessory: "alternator"
      }[hotspot.key] || hotspot.key;
    if (enginePartDetails[referenceKey]) {
      setPartReference(referenceKey);
    }
    if (moveCamera) {
      setCameraView(hotspot.view || "service");
    }
  }

  let rendererHasSize = false;
  let lastRendererWidth = 0;
  let lastRendererHeight = 0;

  function getViewerSize() {
    const rect = viewerElement.getBoundingClientRect();
    const width = Math.round(viewerElement.clientWidth || rect.width);
    const height = Math.round(viewerElement.clientHeight || rect.height);
    return { width, height };
  }

  function projectHotspots(now) {
    const { width, height } = getViewerSize();
    if (width < 2 || height < 2) {
      return;
    }

    cameraLocal.copy(camera.position);

    hotspots.forEach((hotspot, index) => {
      const button = hotspotButtons.get(hotspot.key);
      if (!button) {
        return;
      }

      projected.copy(hotspot.point).applyMatrix4(engine.matrixWorld).project(camera);
      if (projected.z < -1 || projected.z > 1) {
        button.style.display = "none";
        return;
      }

      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;
      if (x < -80 || x > width + 80 || y < -60 || y > height + 60) {
        button.style.display = "none";
        return;
      }

      button.style.display = "grid";
      const labelInsetX = Math.min(120, Math.max(52, button.offsetWidth / 2 + 8));
      const labelInsetY = Math.min(42, Math.max(22, button.offsetHeight / 2 + 8));
      const clampedX = THREE.MathUtils.clamp(x, labelInsetX, width - labelInsetX);
      const clampedY = THREE.MathUtils.clamp(y, labelInsetY, height - labelInsetY);
      button.style.left = `${clampedX}px`;
      button.style.top = `${clampedY}px`;

      const marker = markerMeshes.get(hotspot.key);
      if (marker) {
        const active = hotspot.key === selectedKey;
        marker.scale.setScalar(active ? 1.32 + Math.sin(now * 0.006) * 0.1 : 1 + Math.sin(now * 0.004 + index) * 0.04);
      }
    });
  }

  function stopAutoRotate() {
    if (autoRotateTimer) {
      clearTimeout(autoRotateTimer);
      autoRotateTimer = null;
    }
    controls.autoRotate = false;
  }

  function scheduleAutoRotate() {
    if (autoRotateTimer) {
      clearTimeout(autoRotateTimer);
    }

    autoRotateTimer = window.setTimeout(() => {
      if (isInteracting || cameraTween) {
        scheduleAutoRotate();
        return;
      }
      controls.autoRotate = true;
      autoRotateTimer = null;
    }, 3200);
  }

  function resizeRenderer() {
    const { width, height } = getViewerSize();
    if (width < 2 || height < 2) {
      return false;
    }

    if (width !== lastRendererWidth || height !== lastRendererHeight) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      lastRendererWidth = width;
      lastRendererHeight = height;
    }

    rendererHasSize = true;
    return true;
  }

  function tick(now) {
    floorRing.material.opacity = 0.1 + Math.sin(now * 0.002) * 0.018;
    warmLight.intensity = 4.5 + Math.sin(now * 0.0018) * 0.5;
    cyanLift.intensity = 4.7 + Math.cos(now * 0.002) * 0.55;

    if (cameraTween) {
      const t = Math.min((now - cameraTween.start) / cameraTween.duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(cameraTween.from, cameraTween.to, eased);
      controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
      if (t >= 1) {
        cameraTween = null;
        scheduleAutoRotate();
      }
    }

    controls.update();
    if (!rendererHasSize && !resizeRenderer()) {
      requestAnimationFrame(tick);
      return;
    }

    renderer.render(scene, camera);
    projectHotspots(now);
    requestAnimationFrame(tick);
  }

  const startupParams = new URLSearchParams(window.location.search);
  populatePartSelector();
  buildEngineModel();
  buildHotspots();
  selectHotspot("timing", false);
  if (startupParams.get("engineModel") === "front-accessories") {
    setEngineModelMode("front-accessories", true);
  }
  setLabelFilter(startupParams.get("labelFilter") || "all");
  setPartReference(startupParams.get("part") || selectedPartKey);

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => setCameraView(button.dataset.engineView));
  });

  modelButtons.forEach((button) => {
    button.addEventListener("click", () => setEngineModelMode(button.dataset.engineModel));
  });

  labelToggle?.addEventListener("click", () => {
    setComponentLabelsVisible(!labelsVisible);
  });

  labelFilterButtons.forEach((button) => {
    button.addEventListener("click", () => setLabelFilter(button.dataset.engineLabelFilter || "all"));
  });

  partSelect?.addEventListener("change", () => {
    setPartReference(partSelect.value || defaultEnginePartKey);
  });

  controls.addEventListener("start", () => {
    isInteracting = true;
    stopAutoRotate();
  });

  controls.addEventListener("end", () => {
    isInteracting = false;
    scheduleAutoRotate();
  });

  renderer.domElement.addEventListener("pointerdown", rememberLabelPointer);
  renderer.domElement.addEventListener("wheel", stopAutoRotate, { passive: true });
  renderer.domElement.addEventListener("touchstart", stopAutoRotate, { passive: true });
  renderer.domElement.addEventListener("pointerup", handleLabelPointerUp);
  renderer.domElement.addEventListener("touchend", scheduleAutoRotate, { passive: true });

  window.addEventListener("resize", resizeRenderer);
  resizeRenderer();
  requestAnimationFrame(tick);
}
