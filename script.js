import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const systems = [
  {
    id: "fuse-engine-a",
    label: "Fuse Box A",
    area: "Passenger-side front engine bay",
    use: "Electrical diagnosis",
    description:
      "Primary under-hood fuse box located near the passenger-side damper house for major electrical protection and front-bay troubleshooting.",
    bullets: [
      "Located near the passenger-side damper house.",
      "Use when front electrical systems stop responding.",
      "Confirm fuse number on the box cover before replacing anything.",
      "Power the truck off before inspecting or swapping a fuse."
    ],
    links: [
      {
        label: "Open local fuse diagrams",
        url: "hood.html#fuses"
      }
    ],
    quickFacts: [
      ["Engine", "3.5L SOHC i-VTEC V6"],
      ["Output", "280 hp / 262 lb-ft"],
      ["Drive", "2WD"]
    ],
    actions: [
      {
        label: "Fuse Boxes",
        href: "hood.html#fuses",
        description: "Under-hood fuse locations and chart links."
      },
      {
        label: "Wiring",
        href: "hood.html#wiring",
        description: "Electrical and battery-related references."
      },
      {
        label: "Parts",
        href: "hood.html#parts",
        description: "Filters, battery notes, and service items."
      },
      {
        label: "Area Page",
        href: "hood.html",
        description: "Open the full hood and engine-bay page."
      }
    ],
    labelOffset: { x: 138, y: -72 },
    highlightMeshes: ["fuseBoxAHighlight"],
    point: new THREE.Vector3(-2.34, 1.5, -0.82),
    camera: new THREE.Vector3(-4.8, 2.4, -4.0),
    target: new THREE.Vector3(-2.16, 1.38, -0.62)
  },
  {
    id: "fuse-engine-b",
    label: "Fuse Box B",
    area: "Driver-side rear engine bay",
    use: "Brake-fluid-side fuse service",
    description:
      "Secondary under-hood fuse box located near the brake fluid reservoir on the driver-side rear area of the engine bay.",
    bullets: [
      "Located near the brake fluid reservoir.",
      "Separate from Fuse Box A on the opposite side of the engine bay.",
      "Useful for accessory and trailer-related fuse checks.",
      "Verify the cover diagram before replacing a fuse."
    ],
    links: [
      {
        label: "Open local fuse diagrams",
        url: "hood.html#fuses"
      }
    ],
    quickFacts: [
      ["Location", "By brake fluid reservoir"],
      ["Use", "Under-hood fuse service"],
      ["Truck", "2019 Ridgeline"]
    ],
    actions: [
      {
        label: "Fuse Boxes",
        href: "hood.html#fuses",
        description: "Under-hood fuse locations and chart links."
      },
      {
        label: "Wiring",
        href: "hood.html#wiring",
        description: "Electrical and power distribution references."
      },
      {
        label: "Area Page",
        href: "hood.html",
        description: "Open the full hood and engine-bay page."
      }
    ],
    labelOffset: { x: 116, y: -16 },
    highlightMeshes: ["fuseBoxBZone", "brakeReservoirZone", "frontBayZone"],
    point: new THREE.Vector3(-1.56, 1.56, 0.78),
    camera: new THREE.Vector3(-4.6, 2.3, 4.5),
    target: new THREE.Vector3(-1.42, 1.42, 0.62)
  },
  {
    id: "battery-jump",
    label: "Battery / Jump-Start",
    area: "Driver-side front engine bay",
    use: "No-start and battery service",
    description:
      "Use this area for battery checks and jump-start guidance. The positive terminal is reachable here; the manual-specified negative jumper connection is the engine hanger bracket under the engine cover.",
    bullets: [
      "Battery sits under the hood near the driver-side front corner.",
      "Positive terminal is the easy-access jump connection.",
      "Negative jumper connection is the engine hanger bracket under the engine cover."
    ],
    links: [
      {
        label: "Owner's manual battery references",
        url: "https://www.carmanualsonline.info/honda-ridgeline-2019-owner-s-manual-in-english/?srch=battery"
      },
      {
        label: "Ridgeline jump-start ground discussion",
        url: "https://www.ridgelineownersclub.com/threads/jump-start-negative-ground-post-mod.238799/"
      }
    ],
    quickFacts: [["Battery", "Driver-side engine bay"], ["Jump", "Positive terminal + engine hanger ground"], ["Drive", "2WD"]],
    actions: [
      {
        label: "Battery",
        href: "hood.html#wiring",
        description: "Jump-start and electrical references."
      },
      {
        label: "Fuse Boxes",
        href: "hood.html#fuses",
        description: "Primary front-bay fuse references."
      },
      {
        label: "Parts",
        href: "hood.html#parts",
        description: "Battery and front service notes."
      },
      {
        label: "Area Page",
        href: "hood.html",
        description: "Open the full hood and engine-bay page."
      }
    ],
    labelOffset: { x: 128, y: 32 },
    highlightMeshes: ["batteryZone", "jumpGroundZone", "frontBayZone"],
    point: new THREE.Vector3(-2.04, 1.45, 0.9),
    camera: new THREE.Vector3(-4.8, 2.25, 4.7),
    target: new THREE.Vector3(-1.9, 1.38, 0.72)
  },
  {
    id: "fuse-cabin",
    label: "Driver-Left Fuse Box",
    area: "Driver left lower dash",
    use: "Interior electrical systems",
    description:
      "Interior fuse box under the dashboard on the driver's left side for cabin electronics and accessory troubleshooting.",
    bullets: [
      "Located under the dashboard on the driver's side.",
      "This is the under-dash / kick-panel fuse box by the driver's left knee.",
      "Best starting point for interior accessory issues.",
      "Compare box cover numbers with the owner's manual."
    ],
    links: [
      {
        label: "Open local fuse diagram",
        url: "cabin.html#fuses"
      }
    ],
    quickFacts: [
      ["Location", "Driver lower dash"],
      ["Use", "Interior electrical"],
      ["VIN", "KB002267"]
    ],
    actions: [
      {
        label: "Fuse Boxes",
        href: "cabin.html",
        description: "Interior fuse access and reference links."
      },
      {
        label: "Wiring",
        href: "cabin.html",
        description: "Interior electronics troubleshooting notes."
      },
      {
        label: "Area Page",
        href: "cabin.html",
        description: "Open the full cabin and electronics page."
      }
    ],
    labelOffset: { x: 126, y: -8 },
    highlightMeshes: ["cabinFuseZone"],
    point: new THREE.Vector3(-0.82, 0.82, 1.14),
    camera: new THREE.Vector3(-2.4, 1.85, 5.2),
    target: new THREE.Vector3(-0.72, 0.84, 1.04)
  },
  {
    id: "center-console",
    label: "Cabin Electronics",
    area: "Center console",
    use: "Display audio and charging",
    description:
      "Quick access point for audio, USB, navigation, and phone integration references inside the cabin.",
    bullets: [
      "Useful for Apple CarPlay, Android Auto, and USB questions.",
      "Navigation manual is most relevant on equipped trims.",
      "Useful place to keep interior electronics and charging references."
    ],
    links: [
      {
        label: "Navigation manual mirror",
        url: "https://manualsnet.com/honda/ridgeline-2019"
      },
      {
        label: "Honda trim guide",
        url: "https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Features-by-Trim/"
      }
    ],
    quickFacts: [
      ["Display", "Cabin electronics"],
      ["Phone", "CarPlay / Android Auto"],
      ["Drive", "2WD truck"]
    ],
    actions: [
      {
        label: "Navigation",
        href: "cabin.html",
        description: "Navigation and display-audio references."
      },
      {
        label: "Wiring",
        href: "cabin.html",
        description: "Interior electronics related references."
      },
      {
        label: "Area Page",
        href: "cabin.html",
        description: "Open the full cabin and electronics page."
      }
    ],
    labelOffset: { x: 120, y: -64 },
    highlightMeshes: ["consoleZone"],
    point: new THREE.Vector3(-0.42, 1.28, 0),
    camera: new THREE.Vector3(-2.8, 2.1, 4.2),
    target: new THREE.Vector3(-0.35, 1.18, 0)
  },
  {
    id: "bed-trunk",
    label: "Bed / In-Bed Trunk",
    area: "Rear cargo section",
    use: "Cargo and trunk utility",
    description:
      "Covers bed tie-downs, in-bed trunk utility, drain plug behavior, and storage-related documentation.",
    bullets: [
      "Includes the 7.3 cu ft In-Bed Trunk.",
      "Useful for bed dimensions, tie-downs, and cargo planning.",
      "Good place to link your own gear or recovery checklist later."
    ],
    links: [
      {
        label: "Honda bed details",
        url: "https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Exterior-Features/Pickup-Bed/"
      },
      {
        label: "Honda In-Bed Trunk details",
        url: "https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Exterior-Features/Innovative-In-Bed-Trunk/"
      }
    ],
    quickFacts: [
      ["Trunk", "7.3 cu ft"],
      ["Bed", "64 in. tailgate up"],
      ["Body", "Crew cab pickup"]
    ],
    actions: [
      {
        label: "Bed Utility",
        href: "cargo.html",
        description: "Bed dimensions and tie-down references."
      },
      {
        label: "Parts",
        href: "cargo.html",
        description: "Cargo and utility related notes."
      },
      {
        label: "Area Page",
        href: "cargo.html",
        description: "Open the full bed and cargo page."
      }
    ],
    labelOffset: { x: -150, y: -46 },
    highlightMeshes: ["bedZone"],
    point: new THREE.Vector3(2.04, 1.56, 0),
    camera: new THREE.Vector3(5.3, 2.5, 3.6),
    target: new THREE.Vector3(2.0, 1.42, 0)
  },
  {
    id: "hitch-wiring",
    label: "Trailer Hitch / Wiring",
    area: "Rear hitch",
    use: "Towing setup",
    description:
      "Rear tow point for hitch references, trailer wiring, and towing-capacity guidance.",
    bullets: [
      "Use this zone before towing or checking a trailer connector.",
      "AWD models include a standard 7-pin connector.",
      "Double-check load limits before connecting a trailer."
    ],
    links: [
      {
        label: "Honda towing reference",
        url: "https://www.hondainfocenter.com/2019/Ridgeline/Feature-Guide/Engine-Chassis-Features/Towing-Capacity/"
      },
      {
        label: "Owner's manual towing section",
        url: "https://www.carmanualsonline.info/honda-ridgeline-2019-owner-s-manual-in-english/?srch=towing"
      }
    ],
    quickFacts: [
      ["Tow", "3,500 / 5,000 lb"],
      ["Note", "VIN decodes as 2WD"],
      ["Use", "Trailer setup"]
    ],
    actions: [
      {
        label: "Towing",
        href: "rear-hitch.html",
        description: "Capacity, setup, and towing references."
      },
      {
        label: "Wiring",
        href: "rear-hitch.html",
        description: "Trailer connector and rear utility references."
      },
      {
        label: "Area Page",
        href: "rear-hitch.html",
        description: "Open the full hitch and towing page."
      }
    ],
    labelOffset: { x: -156, y: 18 },
    highlightMeshes: ["hitchZone"],
    point: new THREE.Vector3(3.08, 0.78, 0),
    camera: new THREE.Vector3(5.8, 1.8, 3.9),
    target: new THREE.Vector3(3.02, 0.78, 0)
  }
];

const viewerElement = document.getElementById("truck-view");
const hotspotLayer = document.getElementById("hotspot-layer");
const viewerStatus = document.getElementById("viewer-status");
const systemGrid = document.getElementById("system-grid");
const chipRow = document.getElementById("system-chips");

const titleEl = document.getElementById("inspector-title");
const descriptionEl = document.getElementById("inspector-description");
const areaEl = document.getElementById("inspector-area");
const useEl = document.getElementById("inspector-use");
const pointsEl = document.getElementById("inspector-points");
const linksEl = document.getElementById("inspector-links");
const openAreaWindowButton = document.getElementById("open-area-window");
const resetButton = document.getElementById("reset-camera");
const areaModal = document.getElementById("area-modal");
const areaModalBackdrop = document.getElementById("area-modal-backdrop");
const closeAreaModalButton = document.getElementById("close-area-modal");
const areaModalTitle = document.getElementById("area-modal-title");
const areaModalCopy = document.getElementById("area-modal-copy");
const areaModalMeta = document.getElementById("area-modal-meta");
const areaModalActions = document.getElementById("area-modal-actions");
const viewerToolsToggle = document.getElementById("viewer-tools-toggle");
const viewerToolsMenu = document.getElementById("viewer-tools-menu");
const explodedToggle = document.getElementById("exploded-toggle");
const cinematicToggle = document.getElementById("cinematic-toggle");

let renderer;
const isPhoneViewer =
  window.matchMedia("(max-width: 900px)").matches ||
  window.matchMedia("(pointer: coarse)").matches;

try {
  renderer = new THREE.WebGLRenderer({
    antialias: !isPhoneViewer,
    alpha: true,
    powerPreference: "high-performance"
  });
} catch (error) {
  viewerStatus.hidden = false;
  viewerStatus.textContent =
    "The 3D viewer could not start on this device or browser. Try reopening the page in Safari or Chrome with WebGL enabled.";
  console.error(error);
}

if (!renderer) {
  viewerStatus.hidden = false;
} else {
  const sceneFrameOffset = new THREE.Vector3(0, 0, 0);
  const defaultCameraPosition = new THREE.Vector3(-7.35, 2.9, 0.16);
  const defaultCameraTarget = new THREE.Vector3(0, 1.2, 0);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = !isPhoneViewer;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  viewerElement.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x08111c, 24, 46);

  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
  camera.position.copy(defaultCameraPosition);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isPhoneViewer;
  controls.enablePan = true;
  controls.minDistance = 4;
  controls.maxDistance = 13;
  controls.target.copy(defaultCameraTarget);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.96;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.05).texture;

  scene.add(new THREE.HemisphereLight(0xdff4ff, 0x122030, 1.34));

  const keyLight = new THREE.DirectionalLight(0xe3f5ff, 2.45);
  keyLight.position.set(6.5, 8.5, 4.2);
  keyLight.castShadow = !isPhoneViewer;
  keyLight.shadow.mapSize.set(isPhoneViewer ? 512 : 1024, isPhoneViewer ? 512 : 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 24;
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 7;
  keyLight.shadow.camera.bottom = -7;
  keyLight.shadow.bias = -0.0002;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x7ecfff, 1.4);
  rimLight.position.set(-8, 4.8, -3.8);
  scene.add(rimLight);

  if (!isPhoneViewer) {
    const fillLight = new THREE.PointLight(0x8fdcff, 8, 18, 2);
    fillLight.position.set(-0.4, 3.1, 1.2);
    scene.add(fillLight);
  }

  const warmLight = new THREE.DirectionalLight(0xffd6b8, 1.05);
  warmLight.position.set(1.8, 3.8, -6.5);
  scene.add(warmLight);

  if (!isPhoneViewer) {
    const sideRevealLight = new THREE.DirectionalLight(0xb8f1ff, 0.92);
    sideRevealLight.position.set(-2.8, 2.1, 7);
    scene.add(sideRevealLight);

    const rearGlowLight = new THREE.PointLight(0x6fd8ff, 5.5, 16, 2);
    rearGlowLight.position.set(0.3, 1.9, -5.8);
    scene.add(rearGlowLight);

    const frontLiftLight = new THREE.PointLight(0xffd7b4, 4.5, 12, 2);
    frontLiftLight.position.set(-3.8, 1.7, 2.4);
    scene.add(frontLiftLight);
  }

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(7.5, 80),
    new THREE.MeshBasicMaterial({
      color: 0x16354b,
      transparent: true,
      opacity: 0.32
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.03;
  scene.add(floor);

  const shadowCatcher = new THREE.Mesh(
    new THREE.CircleGeometry(5.7, 72),
    new THREE.ShadowMaterial({
      color: 0x000000,
      opacity: 0.32
    })
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = 0.031;
  shadowCatcher.receiveShadow = !isPhoneViewer;
  scene.add(shadowCatcher);

  const truck = new THREE.Group();
  truck.position.copy(sceneFrameOffset);
  scene.add(truck);
  const meshRegistry = new Map();
  const highlightOutlines = new Map();
  const explodableNodes = [];
  let importedModelRoot = null;
  let explodedMode = false;
  let cinematicMode = false;

  function registerMesh(name, mesh) {
    mesh.userData.partName = name;
    meshRegistry.set(name, mesh);
    return mesh;
  }

  function addOutlineForMesh(name, mesh) {
    const edges = new THREE.EdgesGeometry(mesh.geometry, 20);
    const outline = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({
        color: 0xff9a63,
        transparent: true,
        opacity: 0.95
      })
    );
    outline.position.copy(mesh.position);
    outline.rotation.copy(mesh.rotation);
    outline.scale.copy(mesh.scale).multiplyScalar(1.025);
    outline.userData.outlineFor = name;
    outline.visible = false;
    truck.add(outline);
    highlightOutlines.set(name, outline);
  }

  function refreshExplodableNodes(root = importedModelRoot || truck) {
    explodableNodes.length = 0;

    const candidates =
      root === truck
        ? truck.children.filter((child) => child.visible && child.userData.isFallbackVisual)
        : root.children.filter((child) => child.visible && child.type !== "Bone");

    candidates.forEach((child) => {
      const bounds = new THREE.Box3().setFromObject(child);
      const center = new THREE.Vector3();
      bounds.getCenter(center);
      const direction = center.clone().sub(defaultCameraTarget);
      if (direction.lengthSq() < 0.001) {
        direction.set(0, 0.2, 0.4);
      }

      explodableNodes.push({
        node: child,
        basePosition: child.position.clone(),
        direction: direction.normalize()
      });
    });
  }

  function applyExplodedState(enabled) {
    explodedMode = enabled;
    explodedToggle?.setAttribute("aria-pressed", enabled ? "true" : "false");

    explodableNodes.forEach(({ node, basePosition, direction }) => {
      const distance = enabled ? 0.22 : 0;
      node.position.copy(basePosition).addScaledVector(direction, distance);
    });
  }

  const paint = new THREE.MeshPhysicalMaterial({
    color: 0x4d5256,
    metalness: 0.48,
    roughness: 0.38,
    clearcoat: 0.48,
    clearcoatRoughness: 0.32,
    sheen: 0.2,
    sheenColor: new THREE.Color(0x8c969f),
    specularIntensity: 0.42
  });

  const paintDark = new THREE.MeshPhysicalMaterial({
    color: 0x373c40,
    metalness: 0.4,
    roughness: 0.44,
    clearcoat: 0.42,
    clearcoatRoughness: 0.34,
    specularIntensity: 0.36
  });

  const darkTrim = new THREE.MeshStandardMaterial({
    color: 0x020304,
    metalness: 0.04,
    roughness: 0.98
  });

  const plasticTrim = new THREE.MeshStandardMaterial({
    color: 0x000000,
    metalness: 0.01,
    roughness: 1
  });

  const chrome = new THREE.MeshStandardMaterial({
    color: 0x9aa3ac,
    metalness: 0.68,
    roughness: 0.42
  });

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x5f666b,
    transmission: 0.62,
    transparent: true,
    opacity: 0.5,
    roughness: 0.34,
    metalness: 0.06
  });

  const lightMat = new THREE.MeshPhysicalMaterial({
    color: 0xc3f2ff,
    emissive: 0x7fdfff,
    emissiveIntensity: 0.38,
    roughness: 0.08,
    transmission: 0.2,
    transparent: true,
    opacity: 0.9
  });

  const tailMat = new THREE.MeshPhysicalMaterial({
    color: 0xff7b68,
    emissive: 0xc63d2a,
    emissiveIntensity: 0.32,
    roughness: 0.18,
    transparent: true,
    opacity: 0.92
  });

  function makeRoundedBox(width, height, depth, radius, smoothness) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;
    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);
    return new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: smoothness,
      steps: 1,
      bevelSize: radius * 0.55,
      bevelThickness: radius * 0.45,
      curveSegments: smoothness
    }).center();
  }

  const lowerBody = registerMesh("lowerBody", new THREE.Mesh(makeRoundedBox(5.7, 0.95, 2.16, 0.18, 8), paint));
  lowerBody.position.set(-0.05, 1.03, 0);
  truck.add(lowerBody);
  addOutlineForMesh("lowerBody", lowerBody);

  const serviceZoneMaterial = new THREE.MeshStandardMaterial({
    color: 0x7de5ff,
    emissive: 0x11364a,
    metalness: 0.12,
    roughness: 0.34,
    transparent: true,
    opacity: 0.14
  });
  const serviceZoneNames = new Set();

  function createServiceZone(name, width, height, depth, position, rotation = {}) {
    const zone = registerMesh(
      name,
      new THREE.Mesh(makeRoundedBox(width, height, depth, 0.04, 4), serviceZoneMaterial.clone())
    );
    zone.position.copy(position);
    zone.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
    zone.visible = false;
    truck.add(zone);
    addOutlineForMesh(name, zone);
    serviceZoneNames.add(name);
    return zone;
  }

  const shoulder = registerMesh("shoulder", new THREE.Mesh(makeRoundedBox(5.45, 0.24, 2.02, 0.12, 6), paintDark));
  shoulder.position.set(-0.08, 1.54, 0);
  truck.add(shoulder);

  const cabShell = registerMesh("cabShell", new THREE.Mesh(makeRoundedBox(2.3, 1.06, 1.96, 0.2, 8), paint));
  cabShell.position.set(0.72, 1.93, 0);
  cabShell.scale.set(1, 1.02, 1);
  truck.add(cabShell);
  addOutlineForMesh("cabShell", cabShell);

  const roofCap = registerMesh("roofCap", new THREE.Mesh(makeRoundedBox(1.7, 0.22, 1.78, 0.1, 6), paintDark));
  roofCap.position.set(0.6, 2.48, 0);
  truck.add(roofCap);

  const hood = registerMesh("hood", new THREE.Mesh(makeRoundedBox(1.72, 0.34, 2.06, 0.11, 6), paintDark));
  hood.position.set(2.16, 1.47, 0);
  hood.rotation.z = -0.04;
  truck.add(hood);
  addOutlineForMesh("hood", hood);

  createServiceZone(
    "frontBayZone",
    1.86,
    0.24,
    1.92,
    new THREE.Vector3(-2.0, 1.54, 0),
    { z: -0.04 }
  );
  createServiceZone(
    "fuseBoxAZone",
    0.34,
    0.14,
    0.24,
    new THREE.Vector3(-2.3, 1.6, -0.82),
    { z: -0.04 }
  );

  function createFuseBoxHighlight(name, position, rotation = {}) {
    const highlight = new THREE.Group();
    highlight.userData.partName = name;
    highlight.visible = false;

    const shell = new THREE.Mesh(
      makeRoundedBox(0.26, 0.08, 0.18, 0.02, 4),
      new THREE.MeshStandardMaterial({
        color: 0xffa26e,
        emissive: 0x6a2f12,
        metalness: 0.1,
        roughness: 0.34,
        transparent: true,
        opacity: 0.38
      })
    );
    highlight.add(shell);

    const lid = new THREE.Mesh(
      makeRoundedBox(0.22, 0.02, 0.14, 0.012, 3),
      new THREE.MeshStandardMaterial({
        color: 0xffc3a0,
        emissive: 0x7d3a18,
        metalness: 0.08,
        roughness: 0.28,
        transparent: true,
        opacity: 0.48
      })
    );
    lid.position.y = 0.048;
    highlight.add(lid);

    const lip = new THREE.LineSegments(
      new THREE.EdgesGeometry(makeRoundedBox(0.26, 0.08, 0.18, 0.02, 4), 18),
      new THREE.LineBasicMaterial({
        color: 0xff9a63,
        transparent: true,
        opacity: 0.9
      })
    );
    highlight.add(lip);

    highlight.position.copy(position);
    highlight.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
    truck.add(highlight);
    meshRegistry.set(name, highlight);
    return highlight;
  }

  createFuseBoxHighlight("fuseBoxAHighlight", new THREE.Vector3(-2.3, 1.64, -0.82), {
    z: -0.04
  });

  createServiceZone(
    "batteryZone",
    0.44,
    0.18,
    0.3,
    new THREE.Vector3(-2.08, 1.58, 0.88),
    { z: -0.04 }
  );
  createServiceZone(
    "fuseBoxBZone",
    0.34,
    0.14,
    0.24,
    new THREE.Vector3(-1.58, 1.62, 0.78),
    { z: -0.04 }
  );
  createServiceZone(
    "brakeReservoirZone",
    0.18,
    0.14,
    0.18,
    new THREE.Vector3(-1.28, 1.68, 0.64)
  );
  createServiceZone(
    "jumpGroundZone",
    0.28,
    0.14,
    0.18,
    new THREE.Vector3(-1.48, 1.68, 0.18)
  );

  const bedSide = registerMesh("bedSide", new THREE.Mesh(makeRoundedBox(2.32, 0.68, 2.0, 0.12, 6), paint));
  bedSide.position.set(-2.0, 1.36, 0);
  truck.add(bedSide);
  addOutlineForMesh("bedSide", bedSide);

  const bedInset = registerMesh("bedInset", new THREE.Mesh(makeRoundedBox(1.98, 0.42, 1.66, 0.08, 5), darkTrim));
  bedInset.position.set(-2.0, 1.58, 0);
  truck.add(bedInset);
  addOutlineForMesh("bedInset", bedInset);

  const tailgate = registerMesh("tailgate", new THREE.Mesh(makeRoundedBox(0.16, 0.83, 2.0, 0.08, 5), paintDark));
  tailgate.position.set(-2.98, 1.18, 0);
  truck.add(tailgate);
  addOutlineForMesh("tailgate", tailgate);

  const grilleFrame = registerMesh("grilleFrame", new THREE.Mesh(makeRoundedBox(0.18, 0.62, 1.72, 0.06, 5), chrome));
  grilleFrame.position.set(3.0, 1.26, 0);
  truck.add(grilleFrame);
  addOutlineForMesh("grilleFrame", grilleFrame);

  const grille = registerMesh("grille", new THREE.Mesh(makeRoundedBox(0.12, 0.46, 1.42, 0.04, 4), darkTrim));
  grille.position.set(2.97, 1.22, 0);
  truck.add(grille);
  addOutlineForMesh("grille", grille);

  const grilleWing = new THREE.Mesh(makeRoundedBox(0.1, 0.08, 1.58, 0.02, 4), chrome);
  grilleWing.position.set(2.93, 1.36, 0);
  truck.add(grilleWing);

  const grilleBar = new THREE.Mesh(makeRoundedBox(0.08, 0.05, 1.2, 0.02, 3), chrome);
  grilleBar.position.set(2.92, 1.18, 0);
  truck.add(grilleBar);

  const bumperFront = registerMesh("bumperFront", new THREE.Mesh(makeRoundedBox(0.44, 0.36, 2.18, 0.08, 5), plasticTrim));
  bumperFront.position.set(3.18, 0.8, 0);
  truck.add(bumperFront);
  addOutlineForMesh("bumperFront", bumperFront);

  const lowerIntake = new THREE.Mesh(makeRoundedBox(0.08, 0.16, 1.34, 0.03, 4), darkTrim);
  lowerIntake.position.set(3.1, 0.76, 0);
  truck.add(lowerIntake);

  const bumperRear = registerMesh("bumperRear", new THREE.Mesh(makeRoundedBox(0.28, 0.28, 2.18, 0.08, 5), plasticTrim));
  bumperRear.position.set(-3.05, 0.77, 0);
  truck.add(bumperRear);
  addOutlineForMesh("bumperRear", bumperRear);

  const rockerLeft = new THREE.Mesh(makeRoundedBox(5.3, 0.18, 0.1, 0.03, 4), plasticTrim);
  rockerLeft.position.set(-0.16, 0.62, 1.1);
  truck.add(rockerLeft);

  const rockerRight = rockerLeft.clone();
  rockerRight.position.z = -1.1;
  truck.add(rockerRight);

  const beltLineLeft = new THREE.Mesh(makeRoundedBox(3.05, 0.06, 0.04, 0.02, 3), chrome);
  beltLineLeft.position.set(-0.02, 1.68, 1.01);
  truck.add(beltLineLeft);

  const beltLineRight = beltLineLeft.clone();
  beltLineRight.position.z = -1.01;
  truck.add(beltLineRight);

  const bodyCreaseLeft = new THREE.Mesh(makeRoundedBox(3.72, 0.04, 0.04, 0.01, 3), chrome);
  bodyCreaseLeft.position.set(-0.28, 1.22, 1.04);
  truck.add(bodyCreaseLeft);
  const bodyCreaseRight = bodyCreaseLeft.clone();
  bodyCreaseRight.position.z = -1.04;
  truck.add(bodyCreaseRight);

  const windshield = new THREE.Mesh(makeRoundedBox(0.18, 0.88, 1.72, 0.06, 5), glass);
  windshield.position.set(1.78, 1.93, 0);
  windshield.rotation.z = 0.14;
  truck.add(windshield);

  const rearWindow = new THREE.Mesh(makeRoundedBox(0.12, 0.8, 1.58, 0.05, 5), glass);
  rearWindow.position.set(-0.22, 1.9, 0);
  rearWindow.rotation.z = -0.06;
  truck.add(rearWindow);

  const frontSideWindowLeft = registerMesh("frontSideWindowLeft", new THREE.Mesh(makeRoundedBox(0.82, 0.56, 0.08, 0.04, 4), glass));
  frontSideWindowLeft.position.set(0.98, 1.98, 0.94);
  truck.add(frontSideWindowLeft);
  addOutlineForMesh("frontSideWindowLeft", frontSideWindowLeft);

  const rearSideWindowLeft = registerMesh("rearSideWindowLeft", new THREE.Mesh(makeRoundedBox(0.78, 0.54, 0.08, 0.04, 4), glass));
  rearSideWindowLeft.position.set(0.1, 1.96, 0.94);
  truck.add(rearSideWindowLeft);
  addOutlineForMesh("rearSideWindowLeft", rearSideWindowLeft);

  const frontSideWindowRight = frontSideWindowLeft.clone();
  frontSideWindowRight.position.z = -0.94;
  truck.add(frontSideWindowRight);

  const rearSideWindowRight = rearSideWindowLeft.clone();
  rearSideWindowRight.position.z = -0.94;
  truck.add(rearSideWindowRight);

  const pillarA = registerMesh("pillarA", new THREE.Mesh(makeRoundedBox(0.14, 1.03, 0.08, 0.03, 3), darkTrim));
  pillarA.position.set(1.5, 1.95, 0.95);
  pillarA.rotation.z = 0.18;
  truck.add(pillarA);
  addOutlineForMesh("pillarA", pillarA);
  const pillarAR = pillarA.clone();
  pillarAR.position.z = -0.95;
  truck.add(pillarAR);

  const pillarB = registerMesh("pillarB", new THREE.Mesh(makeRoundedBox(0.08, 0.98, 0.08, 0.02, 3), darkTrim));
  pillarB.position.set(0.55, 1.94, 0.96);
  truck.add(pillarB);
  const pillarBR = pillarB.clone();
  pillarBR.position.z = -0.96;
  truck.add(pillarBR);

  const mirrorStemLeft = new THREE.Mesh(makeRoundedBox(0.12, 0.16, 0.08, 0.02, 3), darkTrim);
  mirrorStemLeft.position.set(1.38, 1.58, 1.14);
  truck.add(mirrorStemLeft);
  const mirrorLeft = new THREE.Mesh(makeRoundedBox(0.22, 0.14, 0.18, 0.04, 4), paintDark);
  mirrorLeft.position.set(1.52, 1.6, 1.22);
  truck.add(mirrorLeft);
  const mirrorStemRight = mirrorStemLeft.clone();
  mirrorStemRight.position.z = -1.14;
  truck.add(mirrorStemRight);
  const mirrorRight = registerMesh("mirrorRight", mirrorLeft.clone());
  mirrorRight.position.z = -1.22;
  truck.add(mirrorRight);
  addOutlineForMesh("mirrorRight", mirrorRight);

  const headlightLeft = new THREE.Mesh(makeRoundedBox(0.12, 0.2, 0.56, 0.04, 4), lightMat);
  headlightLeft.position.set(3.02, 1.18, 0.66);
  truck.add(headlightLeft);
  const headlightRight = headlightLeft.clone();
  headlightRight.position.z = -0.66;
  truck.add(headlightRight);

  const fogLeft = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), lightMat);
  fogLeft.position.set(3.0, 0.84, 0.74);
  fogLeft.scale.set(0.8, 0.8, 0.35);
  truck.add(fogLeft);
  const fogRight = fogLeft.clone();
  fogRight.position.z = -0.74;
  truck.add(fogRight);

  const tailLightLeft = new THREE.Mesh(makeRoundedBox(0.08, 0.5, 0.36, 0.04, 4), tailMat);
  tailLightLeft.position.set(-3.0, 1.26, 0.85);
  truck.add(tailLightLeft);
  const tailLightRight = tailLightLeft.clone();
  tailLightRight.position.z = -0.85;
  truck.add(tailLightRight);

  const wheelGeometry = new THREE.CylinderGeometry(0.54, 0.54, 0.34, 36);
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b0e12,
    metalness: 0.08,
    roughness: 0.86
  });

  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8cfd7,
    metalness: 0.95,
    roughness: 0.2
  });

  function createWheel(x, z) {
    const group = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeometry, wheelMaterial);
    tire.rotation.x = Math.PI / 2;
    group.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.3, 26), rimMaterial);
    rim.rotation.x = Math.PI / 2;
    group.add(rim);

    const spokeMaterial = new THREE.MeshStandardMaterial({
      color: 0xd9dfe5,
      metalness: 0.96,
      roughness: 0.16
    });

    const spokeGeometry = new THREE.BoxGeometry(0.045, 0.22, 0.02);

    for (let i = 0; i < 10; i += 1) {
      const spoke = new THREE.Mesh(spokeGeometry, spokeMaterial);
      spoke.position.set(0, 0.12, 0.11);
      spoke.rotation.z = (Math.PI / 5) * i;
      group.add(spoke);
    }

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 18), darkTrim);
    hub.rotation.x = Math.PI / 2;
    group.add(hub);

    group.position.set(x, 0.58, z);
    return group;
  }

  const wheelFrontLeft = createWheel(1.74, 1.2);
  const wheelFrontRight = createWheel(1.74, -1.2);
  const wheelRearLeft = createWheel(-1.74, 1.2);
  const wheelRearRight = createWheel(-1.74, -1.2);
  truck.add(wheelFrontLeft, wheelFrontRight, wheelRearLeft, wheelRearRight);

  function createArchTrim(x, z) {
    const trim = new THREE.Group();

    const crown = new THREE.Mesh(
      makeRoundedBox(0.86, 0.06, 0.03, 0.01, 3),
      plasticTrim
    );
    crown.position.set(x, 1.34, z);
    trim.add(crown);

    const frontLeg = new THREE.Mesh(
      makeRoundedBox(0.06, 0.38, 0.03, 0.01, 3),
      plasticTrim
    );
    frontLeg.position.set(x + 0.38, 1.03, z);
    trim.add(frontLeg);

    const rearLeg = new THREE.Mesh(
      makeRoundedBox(0.06, 0.38, 0.03, 0.01, 3),
      plasticTrim
    );
    rearLeg.position.set(x - 0.38, 1.03, z);
    trim.add(rearLeg);

    return trim;
  }

  truck.add(createArchTrim(1.74, 1.12));
  truck.add(createArchTrim(1.74, -1.12));
  truck.add(createArchTrim(-1.74, 1.12));
  truck.add(createArchTrim(-1.74, -1.12));

  function createMudGuard(x, z, behindFrontWheel = true) {
    const flap = new THREE.Mesh(
      makeRoundedBox(0.08, 0.34, 0.03, 0.01, 3),
      plasticTrim
    );
    flap.position.set(x, 0.54, z);
    flap.rotation.y = Math.PI / 2;
    flap.rotation.z = behindFrontWheel ? -0.04 : 0.02;
    return flap;
  }

  truck.add(createMudGuard(1.34, 1.15, true));
  truck.add(createMudGuard(1.34, -1.15, true));
  truck.add(createMudGuard(-2.14, 1.15, false));
  truck.add(createMudGuard(-2.14, -1.15, false));

  const handleGeometry = makeRoundedBox(0.18, 0.04, 0.05, 0.015, 3);
  const frontHandleLeft = registerMesh("frontHandleLeft", new THREE.Mesh(handleGeometry, chrome));
  frontHandleLeft.position.set(0.98, 1.36, 1.08);
  truck.add(frontHandleLeft);
  addOutlineForMesh("frontHandleLeft", frontHandleLeft);
  const rearHandleLeft = new THREE.Mesh(handleGeometry, chrome);
  rearHandleLeft.position.set(0.08, 1.34, 1.08);
  truck.add(rearHandleLeft);
  const frontHandleRight = frontHandleLeft.clone();
  frontHandleRight.position.z = -1.08;
  truck.add(frontHandleRight);
  const rearHandleRight = rearHandleLeft.clone();
  rearHandleRight.position.z = -1.08;
  truck.add(rearHandleRight);

  createServiceZone(
    "cabinFuseZone",
    0.26,
    0.2,
    0.12,
    new THREE.Vector3(-0.9, 0.84, 1.12),
    { y: 0.08 }
  );
  createServiceZone(
    "consoleZone",
    0.72,
    0.34,
    0.54,
    new THREE.Vector3(-0.42, 1.18, 0)
  );

  const hoodCrease = new THREE.Mesh(makeRoundedBox(1.08, 0.03, 0.05, 0.01, 3), chrome);
  hoodCrease.position.set(2.28, 1.63, 0);
  truck.add(hoodCrease);

  const bedRailLeft = registerMesh("bedRailLeft", new THREE.Mesh(makeRoundedBox(2.12, 0.05, 0.05, 0.02, 3), chrome));
  bedRailLeft.position.set(-1.95, 1.82, 0.96);
  truck.add(bedRailLeft);
  addOutlineForMesh("bedRailLeft", bedRailLeft);
  const bedRailRight = registerMesh("bedRailRight", bedRailLeft.clone());
  bedRailRight.position.z = -0.96;
  truck.add(bedRailRight);
  addOutlineForMesh("bedRailRight", bedRailRight);

  createServiceZone(
    "bedZone",
    2.02,
    0.34,
    1.7,
    new THREE.Vector3(1.98, 1.58, 0)
  );
  createServiceZone(
    "hitchZone",
    0.5,
    0.24,
    0.46,
    new THREE.Vector3(3.02, 0.8, 0)
  );

  truck.children.forEach((child) => {
    const partName = child.userData.partName;
    const outlineFor = child.userData.outlineFor;
    const isServiceZone = partName && serviceZoneNames.has(partName);
    const isServiceOutline = outlineFor && serviceZoneNames.has(outlineFor);
    child.userData.isFallbackVisual = !isServiceZone && !isServiceOutline;
  });

  refreshExplodableNodes();
  applyExplodedState(false);

  truck.rotation.y = -0.45;

  const modelLoader = new GLTFLoader();
  const fallbackLoader = new FBXLoader();
  viewerStatus.hidden = false;
  viewerStatus.textContent = "Loading real Ridgeline model...";

  function nameIncludes(text, keywords) {
    return keywords.some((keyword) => text.includes(keyword));
  }

  function stylizeLoadedMaterial(material, tokenText) {
    const nextMaterial = material.clone();
    const hasMap = Boolean(nextMaterial.map);
    const sourceColor = nextMaterial.color ? nextMaterial.color.clone() : new THREE.Color(0xffffff);
    const sourceHsl = { h: 0, s: 0, l: 1 };
    sourceColor.getHSL(sourceHsl);
    const clearDiffuseMap = () => {
      if ("map" in nextMaterial) {
        nextMaterial.map = null;
      }
      if ("vertexColors" in nextMaterial) {
        nextMaterial.vertexColors = false;
      }
    };

    if (nameIncludes(tokenText, ["glass", "window", "windshield", "mirror"])) {
      clearDiffuseMap();
      nextMaterial.color = new THREE.Color(0x30363b);
      nextMaterial.metalness = 0;
      nextMaterial.roughness = 0.42;
      nextMaterial.transmission = 0.08;
      nextMaterial.transparent = true;
      nextMaterial.opacity = 0.96;
      nextMaterial.ior = 1.45;
      nextMaterial.thickness = 0.02;
      nextMaterial.depthWrite = true;
      return nextMaterial;
    }

    if (nameIncludes(tokenText, ["tire", "tyre", "rubber"])) {
      clearDiffuseMap();
      nextMaterial.color = new THREE.Color(0x14171b);
      nextMaterial.metalness = 0.02;
      nextMaterial.roughness = 0.96;
      return nextMaterial;
    }

    if (nameIncludes(tokenText, ["wheel", "rim", "alloy", "hpd"])) {
      clearDiffuseMap();
      nextMaterial.color = new THREE.Color(0x8d573a);
      nextMaterial.metalness = 0.96;
      nextMaterial.roughness = 0.26;
      return nextMaterial;
    }

    if (nameIncludes(tokenText, ["brake", "disc", "rotor", "caliper"])) {
      clearDiffuseMap();
      nextMaterial.color = new THREE.Color(0x555d63);
      nextMaterial.metalness = 0.88;
      nextMaterial.roughness = 0.42;
      return nextMaterial;
    }

    if (nameIncludes(tokenText, ["chrome", "badge", "logo", "emblem", "handle"])) {
      if (nameIncludes(tokenText, ["logo", "badge", "emblem"])) {
        clearDiffuseMap();
        nextMaterial.color = new THREE.Color(0x090a0c);
        nextMaterial.metalness = 0.28;
        nextMaterial.roughness = 0.62;
        return nextMaterial;
      }
      clearDiffuseMap();
      nextMaterial.color = new THREE.Color(0x3f464c);
      nextMaterial.metalness = 0.48;
      nextMaterial.roughness = 0.62;
      return nextMaterial;
    }

    if (nameIncludes(tokenText, ["lamp", "head", "tail", "light", "fog"])) {
      clearDiffuseMap();
      nextMaterial.color = new THREE.Color(0x88949d);
      nextMaterial.emissive = new THREE.Color(0x402018);
      nextMaterial.emissiveIntensity = 0.12;
      nextMaterial.metalness = 0.06;
      nextMaterial.roughness = 0.22;
      return nextMaterial;
    }

    if (
      nameIncludes(tokenText, [
        "grille",
        "grill",
        "trim",
        "bumper",
        "plastic",
        "cladding",
        "arch",
        "flare",
        "rocker",
        "molding",
        "moulding",
        "pillar",
        "fascia",
        "valance",
        "guard",
        "skirt",
        "lower",
        "rail",
        "vent",
        "bezel"
      ])
    ) {
      clearDiffuseMap();
      nextMaterial.color = new THREE.Color(0x000000);
      nextMaterial.metalness = 0.01;
      nextMaterial.roughness = 1;
      return nextMaterial;
    }

    if (
      nameIncludes(tokenText, [
        "body",
        "paint",
        "door",
        "hood",
        "fender",
        "cab",
        "bed",
        "tailgate",
        "truck",
        "quarter",
        "panel"
      ])
    ) {
      clearDiffuseMap();
      nextMaterial.color = new THREE.Color(0x454b50);
      nextMaterial.metalness = 0.38;
      nextMaterial.roughness = 0.58;
      nextMaterial.clearcoat = 0.22;
      nextMaterial.clearcoatRoughness = 0.52;
      nextMaterial.specularIntensity = 0.28;
      return nextMaterial;
    }

    if (sourceHsl.l <= 0.24) {
      clearDiffuseMap();
      nextMaterial.color = new THREE.Color(0x06080a);
      nextMaterial.metalness = 0.03;
      nextMaterial.roughness = 0.98;
      return nextMaterial;
    }

    if (sourceHsl.l >= 0.32) {
      clearDiffuseMap();
      nextMaterial.color = new THREE.Color(0x454b50);
      nextMaterial.metalness = 0.38;
      nextMaterial.roughness = 0.58;
      nextMaterial.clearcoat = 0.22;
      nextMaterial.clearcoatRoughness = 0.52;
      nextMaterial.specularIntensity = 0.28;
      return nextMaterial;
    }

    clearDiffuseMap();
    nextMaterial.color = new THREE.Color(0x090b0d);
    nextMaterial.metalness = 0.06;
    nextMaterial.roughness = 0.97;
    return nextMaterial;
  }

  function applyLoadedModel(modelRoot) {
      const targetLength = 6.1;
      const bounds = new THREE.Box3();
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      const arMeasureNodes = [];

      modelRoot.traverse((child) => {
        const objectName = `${child.name || ""}`.toLowerCase();
        if (objectName.includes("measure_arrow")) {
          arMeasureNodes.push(child);
        }

        if (child.isMesh) {
          child.castShadow = !isPhoneViewer;
          child.receiveShadow = !isPhoneViewer;
          const meshName = `${child.name || ""} ${child.parent?.name || ""}`.toLowerCase();
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            const tunedMaterials = materials.map((material) => {
              const materialName = `${material.name || ""} ${meshName}`.toLowerCase();
              const tuned = stylizeLoadedMaterial(material, materialName);
              if ("side" in material) {
                tuned.side = THREE.FrontSide;
              }
              if ("transparent" in material) {
                tuned.transparent = tuned.transparent ?? Boolean(tuned.opacity < 1 || tuned.transmission);
              }
              if ("needsUpdate" in material) {
                tuned.needsUpdate = true;
              }
              return tuned;
            });
            child.material = Array.isArray(child.material) ? tunedMaterials : tunedMaterials[0];
          }

        }
      });

      arMeasureNodes.forEach((node) => {
        node.parent?.remove(node);
      });

      bounds.setFromObject(modelRoot);
      bounds.getSize(size);
      if (size.z > size.x) {
        modelRoot.rotation.y = Math.PI / 2;
        bounds.setFromObject(modelRoot);
        bounds.getSize(size);
      }

      const scale = targetLength / Math.max(size.x, 0.001);
      modelRoot.scale.setScalar(scale);

      bounds.setFromObject(modelRoot);
      bounds.getCenter(center);
      modelRoot.position.sub(center);
      bounds.setFromObject(modelRoot);
      modelRoot.position.y -= bounds.min.y;
      modelRoot.position.y += 0.03;

      modelRoot.rotation.y += Math.PI;
      truck.add(modelRoot);
      importedModelRoot = modelRoot;
      refreshExplodableNodes(modelRoot);
      if (explodedMode) {
        applyExplodedState(true);
      }
      rebuildOcclusionMeshes();
      visibilityDirty = true;

      truck.children.forEach((child) => {
        if (child !== modelRoot && child.userData.isFallbackVisual) {
          child.visible = false;
        }
      });

      viewerStatus.hidden = true;
  }

  modelLoader.load(
    "./assets/ridgeline-2021/honda-ridgeline-2021.glb",
    (gltf) => {
      applyLoadedModel(gltf.scene);
    },
    undefined,
    () => {
      fallbackLoader.setResourcePath("./assets/ridgeline-2021/textures/");
      fallbackLoader.load(
        "./assets/ridgeline-2021/honda-ridgeline-2021.fbx",
        (fbx) => {
          applyLoadedModel(fbx);
        },
        undefined,
        () => {
          viewerStatus.hidden = false;
          viewerStatus.textContent =
            "The real truck model could not be loaded, so the backup vehicle view is being used instead.";
        }
      );
    }
  );

  const hotspotMaterial = new THREE.MeshBasicMaterial({
    color: 0x61dfff,
    transparent: true,
    opacity: 0.9
  });

  const hotspotMeshes = systems.map((item) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), hotspotMaterial.clone());
    mesh.position.copy(item.point);
    truck.add(mesh);
    return mesh;
  });

  let selectedSystem = systems[0];
  let cameraTween = null;
  const defaultInspectorState = {
    title: titleEl.textContent,
    description: descriptionEl.textContent,
    area: areaEl.textContent,
    use: useEl.textContent
  };

  const projected = new THREE.Vector3();
  const cameraLocal = new THREE.Vector3();
  const pointWorld = new THREE.Vector3();
  const rayDirection = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const occlusionMeshes = [];
  const occlusionVisibility = new Map();
  const lastCameraPosition = new THREE.Vector3();
  const lastCameraQuaternion = new THREE.Quaternion();
  const hotspotButtons = new Map();
  const calloutElements = new Map();
  const systemCards = new Map();
  const chipButtons = new Map();
  const orientationPoint = new THREE.Vector3(0.28, 1.34, 1.24);
  let lastVisibilitySample = 0;
  let visibilityDirty = true;
  let isViewerInteracting = false;

  const orientationCallout = document.createElement("div");
  orientationCallout.className = "hotspot-callout";

  const orientationLine = document.createElement("div");
  orientationLine.className = "callout-line";
  orientationCallout.appendChild(orientationLine);

  const orientationPill = document.createElement("div");
  orientationPill.className = "callout-pill orientation-pill";
  orientationPill.innerHTML = '<span class="orientation-badge">D</span><span>Driver</span>';
  orientationCallout.appendChild(orientationPill);
  hotspotLayer.appendChild(orientationCallout);

  systems.forEach((system) => {
    const button = document.createElement("button");
    button.className = "hotspot-button";
    button.type = "button";
    button.setAttribute("aria-label", system.label);
    button.addEventListener("click", () => {
      stopShowcaseRotation();
      selectSystem(system.id, cinematicMode);
      openAreaModal(system);
    });
    hotspotLayer.appendChild(button);
    hotspotButtons.set(system.id, button);

    const callout = document.createElement("div");
    callout.className = "hotspot-callout";

    const line = document.createElement("div");
    line.className = "callout-line";
    callout.appendChild(line);

    const pill = document.createElement("div");
    pill.className = "callout-pill";
    pill.textContent = system.label;
    callout.appendChild(pill);

    hotspotLayer.appendChild(callout);
    calloutElements.set(system.id, { root: callout, line, pill });

    const card = document.createElement("button");
    card.className = "system-card";
    card.type = "button";
    card.innerHTML = `
      <p class="eyebrow">${system.area}</p>
      <h3>${system.label}</h3>
      <p>${system.description}</p>
      <ul>
        ${system.bullets.slice(0, 2).map((point) => `<li>${point}</li>`).join("")}
      </ul>
    `;
    card.addEventListener("click", () => {
      stopShowcaseRotation();
      selectSystem(system.id, cinematicMode);
      document.getElementById("viewer").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    systemGrid.appendChild(card);
    systemCards.set(system.id, card);

    const chip = document.createElement("button");
    chip.className = "chip-button";
    chip.type = "button";
    chip.textContent = system.label;
    chip.addEventListener("click", () => {
      stopShowcaseRotation();
      selectSystem(system.id, cinematicMode);
    });
    chipRow.appendChild(chip);
    chipButtons.set(system.id, chip);
  });
  rebuildOcclusionMeshes();

  function rebuildOcclusionMeshes() {
    occlusionMeshes.length = 0;
    truck.traverse((child) => {
      if (!child.isMesh || !child.visible) {
        return;
      }

      const partName = child.userData.partName;
      const outlineFor = child.userData.outlineFor;
      const isServiceZone = partName && serviceZoneNames.has(partName);
      const isServiceOutline = outlineFor && serviceZoneNames.has(outlineFor);
      if (isServiceZone || isServiceOutline) {
        return;
      }

      occlusionMeshes.push(child);
    });
  }

  function isPointVisibleToCamera(localPoint) {
    pointWorld.copy(localPoint).applyMatrix4(truck.matrixWorld);
    rayDirection.copy(pointWorld).sub(camera.position);
    const targetDistance = rayDirection.length();

    if (targetDistance <= 0.001) {
      return true;
    }

    rayDirection.normalize();
    raycaster.set(camera.position, rayDirection);
    raycaster.far = targetDistance - 0.06;

    const intersections = raycaster.intersectObjects(occlusionMeshes, true);
    return intersections.length === 0;
  }

  function sampleOcclusionVisibility(now) {
    if (isPhoneViewer && isViewerInteracting) {
      return;
    }

    if (!visibilityDirty && now - lastVisibilitySample < (isPhoneViewer ? 120 : 70)) {
      return;
    }

    systems.forEach((system) => {
      occlusionVisibility.set(system.id, isPointVisibleToCamera(system.point));
    });
    occlusionVisibility.set("orientation", isPointVisibleToCamera(orientationPoint));
    lastVisibilitySample = now;
    visibilityDirty = false;
  }

  function setInspector(system) {
    titleEl.textContent = system.label;
    descriptionEl.textContent = system.description;
    areaEl.textContent = system.area;
    useEl.textContent = system.use;

    pointsEl.innerHTML = "";
    system.bullets.forEach((point) => {
      const li = document.createElement("li");
      li.textContent = point;
      pointsEl.appendChild(li);
    });

    linksEl.innerHTML = "";
    system.links.forEach((link) => {
      const anchor = document.createElement("a");
      anchor.className = "doc-link";
      anchor.href = link.url;
      if (/^https?:/i.test(link.url)) {
        anchor.target = "_blank";
        anchor.rel = "noreferrer";
      }
      anchor.textContent = link.label;
      linksEl.appendChild(anchor);
    });
  }

  function openAreaModal(system) {
    areaModalTitle.textContent = system.label;
    areaModalCopy.textContent = system.description;

    areaModalMeta.innerHTML = "";
    system.quickFacts.forEach(([label, value]) => {
      const block = document.createElement("div");
      block.className = "meta-block";
      block.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
      areaModalMeta.appendChild(block);
    });

    areaModalActions.innerHTML = "";
    system.actions.forEach((action) => {
      const anchor = document.createElement("a");
      anchor.className = "action-card";
      anchor.href = action.href;
      anchor.innerHTML = `
        <span>${action.label}</span>
        <strong>${action.label}</strong>
        <p>${action.description}</p>
      `;
      areaModalActions.appendChild(anchor);
    });

    areaModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeAreaModal() {
    areaModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function clearSelection() {
    selectedSystem = null;
    titleEl.textContent = defaultInspectorState.title;
    descriptionEl.textContent = "Tap a circle on the truck to inspect that area.";
    areaEl.textContent = defaultInspectorState.area;
    useEl.textContent = defaultInspectorState.use;
    pointsEl.innerHTML = "";
    linksEl.innerHTML = "";

    systems.forEach((entry, index) => {
      hotspotButtons.get(entry.id)?.classList.remove("active");
      systemCards.get(entry.id)?.classList.remove("active");
      chipButtons.get(entry.id)?.classList.remove("active");
      calloutElements.get(entry.id)?.pill.classList.remove("active");
      hotspotMeshes[index].material.color.set(0x61dfff);
      hotspotMeshes[index].scale.setScalar(1);

      entry.highlightMeshes.forEach((meshName) => {
        const mesh = meshRegistry.get(meshName);
        if (mesh) {
          mesh.visible = false;
        }
        const outline = highlightOutlines.get(meshName);
        if (outline) {
          outline.visible = false;
        }
      });
    });
  }

  function animateCamera(system) {
    cameraTween = {
      from: camera.position.clone(),
      to: system.camera.clone(),
      fromTarget: controls.target.clone(),
      toTarget: system.target.clone(),
      start: performance.now(),
      duration: 900
    };
  }

  function stopShowcaseRotation() {
    controls.autoRotate = false;
  }

  function selectSystem(id, moveCamera = false) {
    const system = systems.find((entry) => entry.id === id);
    if (!system) {
      return;
    }

    selectedSystem = system;
    setInspector(system);

    systems.forEach((entry, index) => {
      const isActive = entry.id === id;
      hotspotButtons.get(entry.id)?.classList.toggle("active", isActive);
      systemCards.get(entry.id)?.classList.toggle("active", isActive);
      chipButtons.get(entry.id)?.classList.toggle("active", isActive);
      calloutElements.get(entry.id)?.pill.classList.toggle("active", isActive);

      hotspotMeshes[index].material.color.set(isActive ? 0xff915e : 0x61dfff);
      hotspotMeshes[index].scale.setScalar(isActive ? 1.45 : 1);

      entry.highlightMeshes.forEach((meshName) => {
        const mesh = meshRegistry.get(meshName);
        if (mesh) {
          mesh.visible = isActive;
        }
        const outline = highlightOutlines.get(meshName);
        if (outline) {
          outline.visible = false;
        }
      });
    });

    systems
      .filter((entry) => entry.id !== id)
      .forEach((entry) => {
        entry.highlightMeshes.forEach((meshName) => {
          const mesh = meshRegistry.get(meshName);
          if (mesh) {
            mesh.visible = false;
          }
          const outline = highlightOutlines.get(meshName);
          if (outline) {
            outline.visible = false;
          }
        });
      });

    if (moveCamera) {
      animateCamera(system);
    }
  }

  function resizeRenderer() {
    const { clientWidth, clientHeight } = viewerElement;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  }

  function projectHotspots(now) {
    const width = viewerElement.clientWidth;
    const height = viewerElement.clientHeight;
    cameraLocal.copy(camera.position);
    truck.worldToLocal(cameraLocal);
    const visibleSideSign = cameraLocal.z >= 0 ? 1 : -1;
    const visibleFrontSign = cameraLocal.x >= 0 ? 1 : -1;

    systems.forEach((system) => {
      const button = hotspotButtons.get(system.id);
      const callout = calloutElements.get(system.id);
      projected.copy(system.point).applyMatrix4(truck.matrixWorld).project(camera);
      const isVisible = projected.z < 1 && projected.z > -1;
      const isCenterSide = Math.abs(system.point.z) < 0.24;
      const isCenterFront = Math.abs(system.point.x) < 0.64;
      const isVisibleSideZone =
        isCenterSide || Math.sign(system.point.z || visibleSideSign) === visibleSideSign;
      const isVisibleFrontZone =
        isCenterFront || Math.sign(system.point.x || visibleFrontSign) === visibleFrontSign;
      if (!isVisible) {
        button.style.display = "none";
        if (callout) {
          callout.root.style.display = "none";
        }
        return;
      }

      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;

      if (x < -40 || x > width + 40 || y < -40 || y > height + 40) {
        button.style.display = "none";
        if (callout) {
          callout.root.style.display = "none";
        }
        return;
      }

      if (!isVisibleSideZone || !isVisibleFrontZone) {
        button.style.display = "none";
        if (callout) {
          callout.root.style.display = "none";
        }
        return;
      }

      button.style.display = "block";
      button.style.left = `${x}px`;
      button.style.top = `${y}px`;
      if (!callout) {
        return;
      }

      const labelX = x + system.labelOffset.x;
      const labelY = y + system.labelOffset.y;
      const dx = labelX - x;
      const dy = labelY - y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      callout.root.style.display = "block";
      callout.line.style.left = `${x}px`;
      callout.line.style.top = `${y}px`;
      callout.line.style.width = `${length}px`;
      callout.line.style.transform = `rotate(${angle}rad)`;
      callout.pill.style.left = `${labelX}px`;
      callout.pill.style.top = `${labelY - 17}px`;
    });

    projected.copy(orientationPoint).applyMatrix4(truck.matrixWorld).project(camera);
    const orientationVisible =
      projected.z < 1 &&
      projected.z > -1 &&
      (Math.abs(orientationPoint.z) < 0.24 ||
        Math.sign(orientationPoint.z || visibleSideSign) === visibleSideSign);

    if (!orientationVisible) {
      orientationCallout.style.display = "none";
      return;
    }

    const orientationX = (projected.x * 0.5 + 0.5) * width;
    const orientationY = (-projected.y * 0.5 + 0.5) * height;

    if (
      orientationX < -40 ||
      orientationX > width + 40 ||
      orientationY < -40 ||
      orientationY > height + 40
    ) {
      orientationCallout.style.display = "none";
      return;
    }

    const orientationLabelX = orientationX + 136;
    const orientationLabelY = orientationY - 28;
    const orientationDx = orientationLabelX - orientationX;
    const orientationDy = orientationLabelY - orientationY;
    const orientationLength = Math.sqrt(
      orientationDx * orientationDx + orientationDy * orientationDy
    );
    const orientationAngle = Math.atan2(orientationDy, orientationDx);

    orientationCallout.style.display = "block";
    orientationLine.style.left = `${orientationX}px`;
    orientationLine.style.top = `${orientationY}px`;
    orientationLine.style.width = `${orientationLength}px`;
    orientationLine.style.transform = `rotate(${orientationAngle}rad)`;
    orientationPill.style.left = `${orientationLabelX}px`;
    orientationPill.style.top = `${orientationLabelY - 17}px`;
  }

  function tick(now) {
    if (cameraTween) {
      const t = Math.min((now - cameraTween.start) / cameraTween.duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(cameraTween.from, cameraTween.to, eased);
      controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
      if (t >= 1) {
        cameraTween = null;
      }
    }

    controls.update();
    if (
      camera.position.distanceToSquared(lastCameraPosition) > 0.0004 ||
      1 - Math.abs(camera.quaternion.dot(lastCameraQuaternion)) > 0.00002
    ) {
      visibilityDirty = true;
      lastCameraPosition.copy(camera.position);
      lastCameraQuaternion.copy(camera.quaternion);
    }
    renderer.render(scene, camera);
    projectHotspots(now);
    requestAnimationFrame(tick);
  }

  resetButton.addEventListener("click", () => {
    stopShowcaseRotation();
    cameraTween = {
      from: camera.position.clone(),
      to: defaultCameraPosition.clone(),
      fromTarget: controls.target.clone(),
      toTarget: defaultCameraTarget.clone(),
      start: performance.now(),
      duration: 850
    };
  });

  openAreaWindowButton.addEventListener("click", () => {
    stopShowcaseRotation();
    if (!selectedSystem) {
      return;
    }
    openAreaModal(selectedSystem);
  });

  viewerToolsToggle?.addEventListener("click", () => {
    const isOpen = viewerToolsToggle.getAttribute("aria-expanded") === "true";
    viewerToolsToggle.setAttribute("aria-expanded", isOpen ? "false" : "true");
    if (viewerToolsMenu) {
      viewerToolsMenu.hidden = isOpen;
    }
  });

  explodedToggle?.addEventListener("click", () => {
    applyExplodedState(!explodedMode);
  });

  cinematicToggle?.addEventListener("click", () => {
    cinematicMode = !cinematicMode;
    cinematicToggle.setAttribute("aria-pressed", cinematicMode ? "true" : "false");
    if (cinematicMode && selectedSystem) {
      animateCamera(selectedSystem);
    }
  });

  closeAreaModalButton.addEventListener("click", closeAreaModal);
  areaModalBackdrop.addEventListener("click", closeAreaModal);

  controls.addEventListener("start", () => {
    if (!isPhoneViewer) {
      return;
    }
    isViewerInteracting = true;
  });

  controls.addEventListener("end", () => {
    if (!isPhoneViewer) {
      return;
    }
    isViewerInteracting = false;
    visibilityDirty = true;
    projectHotspots(performance.now());
  });

  renderer.domElement.addEventListener("pointerdown", () => {
    stopShowcaseRotation();
    clearSelection();
  });
  renderer.domElement.addEventListener("wheel", stopShowcaseRotation, { passive: true });
  renderer.domElement.addEventListener("touchstart", stopShowcaseRotation, { passive: true });

  window.addEventListener("resize", resizeRenderer);

  resizeRenderer();
  lastCameraPosition.copy(camera.position);
  lastCameraQuaternion.copy(camera.quaternion);
  selectSystem(selectedSystem.id, false);
  requestAnimationFrame(tick);
}
