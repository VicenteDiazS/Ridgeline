import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const systems = [
  {
    id: "fuse-engine-a",
    label: "Fuse Box A",
    area: "Front engine bay",
    use: "Electrical diagnosis",
    description:
      "Primary under-hood fuse box for major electrical protection and quick troubleshooting in the front of the truck.",
    bullets: [
      "Use when front electrical systems stop responding.",
      "Confirm fuse number on the box cover before replacing anything.",
      "Power the truck off before inspecting or swapping a fuse."
    ],
    links: [
      {
        label: "Owner's manual fuse location",
        url: "https://www.carmanualsonline.info/honda-ridgeline-2019-owner-s-manual-in-english/?srch=fuse+box+location"
      },
      {
        label: "Owner's manual fuse chart",
        url: "https://www.carmanualsonline.info/honda-ridgeline-2019-owner-s-manual-in-english/?srch=fuse+chart"
      }
    ],
    quickFacts: [
      ["Engine", "3.5L SOHC i-VTEC V6"],
      ["Output", "280 hp / 262 lb-ft"],
      ["Area", "Primary fuse access"]
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
    point: new THREE.Vector3(2.18, 1.68, 0.72),
    camera: new THREE.Vector3(4.6, 2.5, 4.4),
    target: new THREE.Vector3(2.0, 1.5, 0.55)
  },
  {
    id: "battery-jump",
    label: "Battery / Jump Point",
    area: "Front engine bay",
    use: "No-start and battery service",
    description:
      "Use this area for battery checks, jump-start guidance, and general under-hood electrical access.",
    bullets: [
      "Keep jump-start instructions close when traveling.",
      "Record battery model and install date in your personal notes.",
      "Use owner manual procedures for safe jump-starting."
    ],
    links: [
      {
        label: "Owner's manual emergency section",
        url: "https://www.carmanualsonline.info/honda-ridgeline-2019-owner-s-manual-in-english/?srch=emergency+towing"
      },
      {
        label: "Maintenance chapter",
        url: "https://www.carmanualsonline.info/honda-ridgeline-2019-owner-s-manual-in-english/?srch=oil+filter"
      }
    ],
    quickFacts: [
      ["Battery", "Front engine bay"],
      ["Use", "Jump-start and power checks"],
      ["Fuel", "Regular unleaded"]
    ],
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
    point: new THREE.Vector3(1.38, 1.58, -0.78),
    camera: new THREE.Vector3(4.9, 2.25, -3.5),
    target: new THREE.Vector3(1.25, 1.42, -0.62)
  },
  {
    id: "fuse-cabin",
    label: "Cabin Fuse Box",
    area: "Driver side dash",
    use: "Interior electrical systems",
    description:
      "Driver-side interior fuse box under the dashboard for cabin electronics and accessory troubleshooting.",
    bullets: [
      "Best starting point for interior accessory issues.",
      "Check the driver's side lower dash area.",
      "Compare box cover numbers with the owner's manual."
    ],
    links: [
      {
        label: "Owner's manual fuse location",
        url: "https://www.carmanualsonline.info/honda-ridgeline-2019-owner-s-manual-in-english/?srch=fuse+box+location"
      },
      {
        label: "External fuse reference",
        url: "https://fuse-box.info/honda/honda-ridgeline-2017-2019-fuses"
      }
    ],
    quickFacts: [
      ["Location", "Driver lower dash"],
      ["Use", "Interior electrical"],
      ["Trim", "All trims"]
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
    point: new THREE.Vector3(0.92, 1.03, 1.12),
    camera: new THREE.Vector3(2.4, 1.85, 5.2),
    target: new THREE.Vector3(0.78, 1.0, 0.96)
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
      ["Power", "USB and charging"]
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
    point: new THREE.Vector3(0.42, 1.28, 0),
    camera: new THREE.Vector3(2.8, 2.1, 4.2),
    target: new THREE.Vector3(0.35, 1.18, 0)
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
      ["Use", "Cargo and storage"]
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
    point: new THREE.Vector3(-2.05, 1.72, 0),
    camera: new THREE.Vector3(-5.3, 2.5, 3.6),
    target: new THREE.Vector3(-2.0, 1.5, 0)
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
      ["Connector", "7-pin on AWD"],
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
    point: new THREE.Vector3(-3.06, 0.86, 0),
    camera: new THREE.Vector3(-5.8, 1.8, 3.9),
    target: new THREE.Vector3(-3.0, 0.84, 0)
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
const focusButton = document.getElementById("focus-selected");
const areaModal = document.getElementById("area-modal");
const areaModalBackdrop = document.getElementById("area-modal-backdrop");
const closeAreaModalButton = document.getElementById("close-area-modal");
const areaModalTitle = document.getElementById("area-modal-title");
const areaModalCopy = document.getElementById("area-modal-copy");
const areaModalMeta = document.getElementById("area-modal-meta");
const areaModalActions = document.getElementById("area-modal-actions");

let renderer;

try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (error) {
  viewerStatus.hidden = false;
  viewerStatus.textContent =
    "The 3D viewer could not start on this device or browser. Try reopening the page in Safari or Chrome with WebGL enabled.";
  console.error(error);
}

if (!renderer) {
  viewerStatus.hidden = false;
} else {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  viewerElement.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x08111c, 16, 30);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(5.4, 2.8, 5.6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = true;
  controls.minDistance = 4;
  controls.maxDistance = 13;
  controls.target.set(0, 1.2, 0);

  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(new THREE.HemisphereLight(0xdff4ff, 0x122030, 1.55));

  const keyLight = new THREE.DirectionalLight(0xd9f2ff, 2.7);
  keyLight.position.set(5, 8, 6);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x7e7bff, 1.5);
  rimLight.position.set(-7, 4, -5);
  scene.add(rimLight);

  const fillLight = new THREE.PointLight(0x8fdcff, 18, 20, 2);
  fillLight.position.set(0, 3, 0);
  scene.add(fillLight);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(7.5, 80),
    new THREE.MeshBasicMaterial({
      color: 0x16354b,
      transparent: true,
      opacity: 0.38
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.03;
  scene.add(floor);

  const floorRing = new THREE.Mesh(
    new THREE.RingGeometry(5.4, 5.9, 72),
    new THREE.MeshBasicMaterial({
      color: 0x61dfff,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide
    })
  );
  floorRing.rotation.x = -Math.PI / 2;
  floorRing.position.y = 0.04;
  scene.add(floorRing);

  const truck = new THREE.Group();
  scene.add(truck);

  const paint = new THREE.MeshPhysicalMaterial({
    color: 0x9098a0,
    metalness: 0.58,
    roughness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
    sheen: 0.25,
    sheenColor: new THREE.Color(0xbcc6cf)
  });

  const paintDark = new THREE.MeshPhysicalMaterial({
    color: 0x7a838d,
    metalness: 0.52,
    roughness: 0.3,
    clearcoat: 0.85,
    clearcoatRoughness: 0.18
  });

  const darkTrim = new THREE.MeshStandardMaterial({
    color: 0x1d232b,
    metalness: 0.32,
    roughness: 0.64
  });

  const plasticTrim = new THREE.MeshStandardMaterial({
    color: 0x2b3138,
    metalness: 0.08,
    roughness: 0.84
  });

  const chrome = new THREE.MeshStandardMaterial({
    color: 0xdfe6ec,
    metalness: 0.95,
    roughness: 0.18
  });

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x89bbde,
    transmission: 0.62,
    transparent: true,
    opacity: 0.58,
    roughness: 0.08,
    metalness: 0.05
  });

  const lightMat = new THREE.MeshPhysicalMaterial({
    color: 0xc3f2ff,
    emissive: 0x7fdfff,
    emissiveIntensity: 0.3,
    roughness: 0.12,
    transmission: 0.2,
    transparent: true,
    opacity: 0.9
  });

  const tailMat = new THREE.MeshPhysicalMaterial({
    color: 0xff7b68,
    emissive: 0xc63d2a,
    emissiveIntensity: 0.25,
    roughness: 0.22,
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

  const lowerBody = new THREE.Mesh(makeRoundedBox(5.7, 0.95, 2.16, 0.18, 8), paint);
  lowerBody.position.set(-0.05, 1.03, 0);
  truck.add(lowerBody);

  const shoulder = new THREE.Mesh(makeRoundedBox(5.45, 0.24, 2.02, 0.12, 6), paintDark);
  shoulder.position.set(-0.08, 1.54, 0);
  truck.add(shoulder);

  const cabShell = new THREE.Mesh(makeRoundedBox(2.3, 1.06, 1.96, 0.2, 8), paint);
  cabShell.position.set(0.72, 1.93, 0);
  cabShell.scale.set(1, 1.02, 1);
  truck.add(cabShell);

  const roofCap = new THREE.Mesh(makeRoundedBox(1.7, 0.22, 1.78, 0.1, 6), paintDark);
  roofCap.position.set(0.6, 2.48, 0);
  truck.add(roofCap);

  const hood = new THREE.Mesh(makeRoundedBox(1.64, 0.32, 2.04, 0.11, 6), paintDark);
  hood.position.set(2.2, 1.46, 0);
  hood.rotation.z = -0.04;
  truck.add(hood);

  const bedSide = new THREE.Mesh(makeRoundedBox(2.32, 0.68, 2.0, 0.12, 6), paint);
  bedSide.position.set(-2.0, 1.36, 0);
  truck.add(bedSide);

  const bedInset = new THREE.Mesh(makeRoundedBox(1.98, 0.42, 1.66, 0.08, 5), darkTrim);
  bedInset.position.set(-2.0, 1.58, 0);
  truck.add(bedInset);

  const tailgate = new THREE.Mesh(makeRoundedBox(0.16, 0.83, 2.0, 0.08, 5), paintDark);
  tailgate.position.set(-2.98, 1.18, 0);
  truck.add(tailgate);

  const grilleFrame = new THREE.Mesh(makeRoundedBox(0.18, 0.62, 1.72, 0.06, 5), chrome);
  grilleFrame.position.set(3.0, 1.26, 0);
  truck.add(grilleFrame);

  const grille = new THREE.Mesh(makeRoundedBox(0.12, 0.46, 1.42, 0.04, 4), darkTrim);
  grille.position.set(2.97, 1.22, 0);
  truck.add(grille);

  const bumperFront = new THREE.Mesh(makeRoundedBox(0.44, 0.36, 2.18, 0.08, 5), plasticTrim);
  bumperFront.position.set(3.18, 0.8, 0);
  truck.add(bumperFront);

  const bumperRear = new THREE.Mesh(makeRoundedBox(0.28, 0.28, 2.18, 0.08, 5), plasticTrim);
  bumperRear.position.set(-3.05, 0.77, 0);
  truck.add(bumperRear);

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

  const windshield = new THREE.Mesh(makeRoundedBox(0.18, 0.88, 1.72, 0.06, 5), glass);
  windshield.position.set(1.78, 1.93, 0);
  windshield.rotation.z = 0.14;
  truck.add(windshield);

  const rearWindow = new THREE.Mesh(makeRoundedBox(0.12, 0.8, 1.58, 0.05, 5), glass);
  rearWindow.position.set(-0.22, 1.9, 0);
  rearWindow.rotation.z = -0.06;
  truck.add(rearWindow);

  const frontSideWindowLeft = new THREE.Mesh(makeRoundedBox(0.82, 0.56, 0.08, 0.04, 4), glass);
  frontSideWindowLeft.position.set(0.98, 1.98, 0.94);
  truck.add(frontSideWindowLeft);

  const rearSideWindowLeft = new THREE.Mesh(makeRoundedBox(0.78, 0.54, 0.08, 0.04, 4), glass);
  rearSideWindowLeft.position.set(0.1, 1.96, 0.94);
  truck.add(rearSideWindowLeft);

  const frontSideWindowRight = frontSideWindowLeft.clone();
  frontSideWindowRight.position.z = -0.94;
  truck.add(frontSideWindowRight);

  const rearSideWindowRight = rearSideWindowLeft.clone();
  rearSideWindowRight.position.z = -0.94;
  truck.add(rearSideWindowRight);

  const pillarA = new THREE.Mesh(makeRoundedBox(0.14, 1.03, 0.08, 0.03, 3), darkTrim);
  pillarA.position.set(1.5, 1.95, 0.95);
  pillarA.rotation.z = 0.18;
  truck.add(pillarA);
  const pillarAR = pillarA.clone();
  pillarAR.position.z = -0.95;
  truck.add(pillarAR);

  const pillarB = new THREE.Mesh(makeRoundedBox(0.08, 0.98, 0.08, 0.02, 3), darkTrim);
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
  const mirrorRight = mirrorLeft.clone();
  mirrorRight.position.z = -1.22;
  truck.add(mirrorRight);

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

  const wheelGeometry = new THREE.CylinderGeometry(0.54, 0.54, 0.36, 32);
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
    tire.rotation.z = Math.PI / 2;
    group.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.38, 22), rimMaterial);
    rim.rotation.z = Math.PI / 2;
    group.add(rim);

    for (let i = 0; i < 6; i += 1) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.27, 0.04), chrome);
      spoke.position.z = 0;
      spoke.rotation.z = (Math.PI / 3) * i;
      group.add(spoke);
    }

    group.position.set(x, 0.58, z);
    return group;
  }

  const wheelFrontLeft = createWheel(1.88, 1.19);
  const wheelFrontRight = createWheel(1.88, -1.19);
  const wheelRearLeft = createWheel(-1.55, 1.19);
  const wheelRearRight = createWheel(-1.55, -1.19);
  truck.add(wheelFrontLeft, wheelFrontRight, wheelRearLeft, wheelRearRight);

  function createArch(x, z) {
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.66, 0.08, 10, 28, Math.PI),
      plasticTrim
    );
    arch.rotation.y = Math.PI / 2;
    arch.rotation.z = Math.PI;
    arch.position.set(x, 0.88, z);
    return arch;
  }

  truck.add(createArch(1.88, 1.11));
  truck.add(createArch(1.88, -1.11));
  truck.add(createArch(-1.55, 1.11));
  truck.add(createArch(-1.55, -1.11));

  const handleGeometry = makeRoundedBox(0.18, 0.04, 0.05, 0.015, 3);
  const frontHandleLeft = new THREE.Mesh(handleGeometry, chrome);
  frontHandleLeft.position.set(0.98, 1.36, 1.08);
  truck.add(frontHandleLeft);
  const rearHandleLeft = new THREE.Mesh(handleGeometry, chrome);
  rearHandleLeft.position.set(0.08, 1.34, 1.08);
  truck.add(rearHandleLeft);
  const frontHandleRight = frontHandleLeft.clone();
  frontHandleRight.position.z = -1.08;
  truck.add(frontHandleRight);
  const rearHandleRight = rearHandleLeft.clone();
  rearHandleRight.position.z = -1.08;
  truck.add(rearHandleRight);

  const hoodCrease = new THREE.Mesh(makeRoundedBox(1.08, 0.03, 0.05, 0.01, 3), chrome);
  hoodCrease.position.set(2.28, 1.63, 0);
  truck.add(hoodCrease);

  const bedRailLeft = new THREE.Mesh(makeRoundedBox(2.12, 0.05, 0.05, 0.02, 3), chrome);
  bedRailLeft.position.set(-1.95, 1.82, 0.96);
  truck.add(bedRailLeft);
  const bedRailRight = bedRailLeft.clone();
  bedRailRight.position.z = -0.96;
  truck.add(bedRailRight);

  truck.rotation.y = -0.45;

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

  const projected = new THREE.Vector3();
  const hotspotButtons = new Map();
  const systemCards = new Map();
  const chipButtons = new Map();

  systems.forEach((system) => {
    const button = document.createElement("button");
    button.className = "hotspot-button";
    button.type = "button";
    button.setAttribute("aria-label", system.label);
    button.addEventListener("click", () => {
      selectSystem(system.id, true);
      openAreaModal(system);
    });
    hotspotLayer.appendChild(button);
    hotspotButtons.set(system.id, button);

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
      selectSystem(system.id, true);
      document.getElementById("viewer").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    systemGrid.appendChild(card);
    systemCards.set(system.id, card);

    const chip = document.createElement("button");
    chip.className = "chip-button";
    chip.type = "button";
    chip.textContent = system.label;
    chip.addEventListener("click", () => selectSystem(system.id, true));
    chipRow.appendChild(chip);
    chipButtons.set(system.id, chip);
  });

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
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
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
  }

  function closeAreaModal() {
    areaModal.hidden = true;
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

      hotspotMeshes[index].material.color.set(isActive ? 0xff915e : 0x61dfff);
      hotspotMeshes[index].scale.setScalar(isActive ? 1.45 : 1);
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

  function projectHotspots() {
    const width = viewerElement.clientWidth;
    const height = viewerElement.clientHeight;

    systems.forEach((system) => {
      const button = hotspotButtons.get(system.id);
      projected.copy(system.point).applyMatrix4(truck.matrixWorld).project(camera);

      const isVisible = projected.z < 1;
      if (!isVisible) {
        button.style.display = "none";
        return;
      }

      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;

      if (x < -40 || x > width + 40 || y < -40 || y > height + 40) {
        button.style.display = "none";
        return;
      }

      button.style.display = "block";
      button.style.left = `${x}px`;
      button.style.top = `${y}px`;
    });
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

    floorRing.rotation.z += 0.0025;
    controls.update();
    renderer.render(scene, camera);
    projectHotspots();
    requestAnimationFrame(tick);
  }

  resetButton.addEventListener("click", () => {
    cameraTween = {
      from: camera.position.clone(),
      to: new THREE.Vector3(5.4, 2.8, 5.6),
      fromTarget: controls.target.clone(),
      toTarget: new THREE.Vector3(0, 1.2, 0),
      start: performance.now(),
      duration: 850
    };
  });

  focusButton.addEventListener("click", () => {
    animateCamera(selectedSystem);
  });

  openAreaWindowButton.addEventListener("click", () => {
    openAreaModal(selectedSystem);
  });

  closeAreaModalButton.addEventListener("click", closeAreaModal);
  areaModalBackdrop.addEventListener("click", closeAreaModal);

  window.addEventListener("resize", resizeRenderer);

  resizeRenderer();
  selectSystem(selectedSystem.id, false);
  requestAnimationFrame(tick);
}
