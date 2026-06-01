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
    id: "tires-wheels",
    label: "Tires / Wheels",
    area: "Wheel wells and tire fitment",
    use: "Tire size, rim specs, and clearance planning",
    description:
      "Interactive tire and wheel reference for stock Ridgeline sizing, wheel-well measurement planning, and common forum-reported fitment notes.",
    bullets: [
      "Stock tire size is 245/60R18 105H.",
      "Use this page before buying larger tires for stock rims.",
      "Wheel-well clearances are marked as field measurements until your truck is measured.",
      "Forum fitment reports vary by tire brand, tread shape, alignment, and offset."
    ],
    links: [
      {
        label: "Open tire and wheel lab",
        url: "tires.html"
      }
    ],
    quickFacts: [
      ["OEM Tire", "245/60R18 105H"],
      ["Wheel", "18 x 8J ET55"],
      ["Pressure", "35 psi cold"]
    ],
    actions: [
      {
        label: "Tire Lab",
        href: "tires.html",
        description: "3D tire model, measurement arrows, and fitment guidance."
      },
      {
        label: "Maintenance",
        href: "maintenance.html#brake-tire",
        description: "Wheel torque, tire pressure, and brake/tire service notes."
      },
      {
        label: "Garage Log",
        href: "garage.html#dashboard",
        description: "Save tire purchases, rotations, and fitment notes."
      }
    ],
    labelOffset: { x: 132, y: 58 },
    highlightMeshes: [],
    point: new THREE.Vector3(-2.05, 0.62, 1.04),
    camera: new THREE.Vector3(-4.2, 1.55, 4.55),
    target: new THREE.Vector3(-1.76, 0.7, 0.92)
  },
  {
    id: "jack-points",
    label: "Roadside Jack Points",
    area: "Side pinch-weld jack points",
    use: "Flat-tire lifting points",
    description:
      "These are the four emergency jacking locations on the side pinch-weld reinforcements. Use the point closest to the flat tire.",
    bullets: [
      "Front points are just behind each front wheel along the side sill.",
      "Rear points are just ahead of each rear wheel along the side sill.",
      "Use the jacking point closest to the tire you are changing.",
      "Set the jack on a flat, stable surface on the same level as the truck."
    ],
    links: [
      {
        label: "Open owner-manual jacking procedure",
        url: "https://www.carmanualsonline.info/honda-ridgeline-2019-owner-s-manual-in-english/?srch=jacking+points"
      },
      {
        label: "Open maintenance flat-tire checklist",
        url: "maintenance.html#jack-points"
      }
    ],
    quickFacts: [
      ["Use case", "Roadside tire change"],
      ["Pattern", "Closest point to flat tire"],
      ["Wheel torque", "94 lb-ft"]
    ],
    actions: [
      {
        label: "Emergency Card",
        href: "quick-sheet.html#emergency-card",
        description: "Open critical roadside specs and fast links."
      },
      {
        label: "Maintenance",
        href: "maintenance.html#jack-points",
        description: "Open flat-tire and jack-point service notes."
      },
      {
        label: "Tire Lab",
        href: "tires.html",
        description: "Check wheel/tire size and fitment guidance."
      }
    ],
    labelOffset: { x: 128, y: 42 },
    highlightMeshes: [
      "jackPointFrontLeftZone",
      "jackPointRearLeftZone",
      "jackPointFrontRightZone",
      "jackPointRearRightZone"
    ],
    point: new THREE.Vector3(-1.3, 0.58, 1.08),
    camera: new THREE.Vector3(-2.05, 1.68, 5.9),
    target: new THREE.Vector3(-0.36, 0.62, 1.0)
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
    id: "diagnostic-cluster",
    label: "Warning Lights / Diagnostics",
    area: "Gauge cluster and driver display",
    use: "Fast symptom routing and warning-light triage",
    description:
      "Jump into the diagnostic flows from the part of the truck that usually starts the question: the cluster, warning lights, and driver-facing messages.",
    bullets: [
      "Best starting point when a new warning light or MID message appears.",
      "Routes into the first-minute triage cards before the deeper workflows.",
      "Pairs well with the Garage warning-light note when you need a record."
    ],
    links: [
      {
        label: "Open diagnostics first-minute triage",
        url: "diagnostics.html#first-minute-triage"
      }
    ],
    quickFacts: [
      ["Start here", "Warning lights or no-start clues"],
      ["Best page", "Diagnostics"],
      ["Save notes", "Garage warning template"]
    ],
    actions: [
      {
        label: "First Minute",
        href: "diagnostics.html#first-minute-triage",
        description: "Open the roadside-sized first-minute diagnostic cards."
      },
      {
        label: "Workflow Index",
        href: "diagnostics.html#workflow-index",
        description: "Jump straight to the deeper diagnostics routes."
      },
      {
        label: "Save Warning Note",
        href: "garage.html#warning-light-template",
        description: "Capture the exact light, color, and message in Garage."
      }
    ],
    labelOffset: { x: 144, y: -104 },
    highlightMeshes: [],
    point: new THREE.Vector3(-0.92, 1.36, 0.84),
    camera: new THREE.Vector3(-2.45, 2.18, 4.75),
    target: new THREE.Vector3(-0.8, 1.28, 0.72)
  },
  {
    id: "service-planner",
    label: "Service Prep / Log",
    area: "Front cabin and maintenance planning",
    use: "Prep checklists, major service log, and saved maintenance notes",
    description:
      "Use this hotspot when you want to move from the truck map into actual service planning, parts staging, or the running maintenance record.",
    bullets: [
      "Fast route to the Prep Planner before an oil, battery, tire, or filter job.",
      "Links directly to the Major Service Log for durable maintenance history.",
      "Pairs with Garage when you want to review saved maintenance notes."
    ],
    links: [
      {
        label: "Open the maintenance prep planner",
        url: "maintenance.html#service-prep"
      }
    ],
    quickFacts: [
      ["Planner", "Service Prep"],
      ["History", "Major Service Log"],
      ["Memory", "Garage maintenance notes"]
    ],
    actions: [
      {
        label: "Prep Planner",
        href: "maintenance.html#service-prep",
        description: "Open the service prep checklist cards."
      },
      {
        label: "Major Service Log",
        href: "maintenance.html#major-service-log",
        description: "Jump to the running maintenance record."
      },
      {
        label: "Garage Dashboard",
        href: "garage.html#dashboard",
        description: "Review saved truck history and recent maintenance notes."
      }
    ],
    labelOffset: { x: 128, y: 96 },
    highlightMeshes: [],
    point: new THREE.Vector3(-0.12, 0.98, 0.56),
    camera: new THREE.Vector3(-2.45, 1.92, 4.28),
    target: new THREE.Vector3(-0.08, 1.0, 0.44)
  },
  {
    id: "quick-sheet-launch",
    label: "Emergency Quick Sheet",
    area: "Passenger-side cabin quick reference",
    use: "Roadside action stack and critical specs",
    description:
      "A fast launcher for the emergency card and roadside action stack when you want the shortest path to tire, battery, warning-light, or trailer references.",
    bullets: [
      "Good choice when you need the shortest route to critical specs.",
      "Roadside router and action stack keep the next moves visible on-screen.",
      "Pairs well with jack points, battery, and diagnostics hotspots."
    ],
    links: [
      {
        label: "Open the emergency quick sheet",
        url: "quick-sheet.html#emergency-card"
      }
    ],
    quickFacts: [
      ["Primary page", "Quick Sheet"],
      ["Roadside stack", "Flat, no-start, warning, trailer"],
      ["Fast links", "Jack map, diagnostics, towing"]
    ],
    actions: [
      {
        label: "Emergency Card",
        href: "quick-sheet.html#emergency-card",
        description: "Open the critical at-a-glance quick sheet."
      },
      {
        label: "Action Stack",
        href: "quick-sheet.html#roadside-action-stack",
        description: "Keep the next roadside steps on screen."
      },
      {
        label: "Roadside Router",
        href: "quick-sheet.html#roadside-router",
        description: "Pick the situation first and route into the right references."
      }
    ],
    labelOffset: { x: 158, y: 24 },
    highlightMeshes: [],
    point: new THREE.Vector3(0.12, 1.12, 0.18),
    camera: new THREE.Vector3(-2.38, 1.96, 4.12),
    target: new THREE.Vector3(0.14, 1.06, 0.12)
  },
  {
    id: "nfc-tag-console",
    label: "NFC Tag Console",
    area: "Driver-side entry and truck tag setup",
    use: "Program truck tags and open tag maps",
    description:
      "Open the NFC console to create tap-to-open truck tags that launch the exact page, section, or service reference from around the Ridgeline.",
    bullets: [
      "Useful when you want physical tags around the truck to open exact pages.",
      "Includes the writer flow, iPhone guidance, and the truck tag map.",
      "Best fit for repeated locations like fuse covers, the bed, and service spots."
    ],
    links: [
      {
        label: "Open the NFC tag console",
        url: "nfc.html#tag-writer"
      }
    ],
    quickFacts: [
      ["Writer", "URL / URI tags"],
      ["iPhone", "Safari-friendly setup"],
      ["Map", "Truck tag locations"]
    ],
    actions: [
      {
        label: "Write A Tag",
        href: "nfc.html#tag-writer",
        description: "Open the NFC tag writer workbench."
      },
      {
        label: "Tag Map",
        href: "nfc.html#tag-map",
        description: "See suggested tag locations around the truck."
      },
      {
        label: "iPhone Setup",
        href: "nfc.html#iphone-nfc-workflow",
        description: "Open the iPhone-specific NFC setup steps."
      }
    ],
    labelOffset: { x: 142, y: -22 },
    highlightMeshes: [],
    point: new THREE.Vector3(-1.62, 1.16, 1.1),
    camera: new THREE.Vector3(-3.12, 2.0, 5.08),
    target: new THREE.Vector3(-1.44, 1.08, 0.98)
  },
  {
    id: "engine-model-launch",
    label: "Engine Model",
    area: "Engine bay 3D reference",
    use: "Detailed engine-focused model view",
    description:
      "Open the dedicated engine experience when the truck-wide map is not specific enough for front-bay orientation or part context.",
    bullets: [
      "Best when you want an engine-only 3D view instead of the whole truck.",
      "Useful for hose, intake, and front-bay orientation work.",
      "Pairs naturally with the fuse, battery, and service hardware entries."
    ],
    links: [{ label: "Open the engine model", url: "engine.html" }],
    quickFacts: [["View", "Focused engine model"], ["Best page", "Engine"], ["Context", "Front bay detail"]],
    actions: [
      { label: "Engine Model", href: "engine.html", description: "Open the dedicated engine 3D model." },
      { label: "Photo Atlas", href: "photo-atlas.html", description: "Compare the engine bay with real truck photos." },
      { label: "AR Lab", href: "ar-lab.html", description: "Open the AR experiment view for the truck." }
    ],
    labelOffset: { x: 124, y: -132 },
    highlightMeshes: [],
    point: new THREE.Vector3(-1.92, 1.74, -0.12),
    camera: new THREE.Vector3(-4.48, 2.48, -3.54),
    target: new THREE.Vector3(-1.72, 1.56, -0.02)
  },
  {
    id: "fuse-symptom-route",
    label: "Fuse Symptom Finder",
    area: "Electrical symptom routing",
    use: "Start from a dead feature instead of a fuse number",
    description:
      "Use the symptom-first electrical route when you know what failed but do not yet know which fuse table or diagram to open.",
    bullets: [
      "Good for outlets, radio, reverse lights, and trailer-light questions.",
      "Useful when owner wording is clearer than the fuse-box legend.",
      "Bridges diagnostics flows into the right fuse pages."
    ],
    links: [{ label: "Open fuse symptom finder", url: "diagnostics.html#fuse-symptom-finder" }],
    quickFacts: [["Flow", "Symptom to fuse"], ["Best page", "Diagnostics"], ["Use", "Dead accessory clues"]],
    actions: [
      { label: "Fuse Symptoms", href: "diagnostics.html#fuse-symptom-finder", description: "Route from the failed feature into the right fuse references." },
      { label: "Engine Fuses", href: "hood.html#fuses", description: "Jump straight to the under-hood fuse references." },
      { label: "Cabin Fuses", href: "cabin.html#fuses", description: "Open the under-dash fuse references." }
    ],
    labelOffset: { x: 158, y: -54 },
    highlightMeshes: [],
    point: new THREE.Vector3(-1.16, 1.44, 0.52),
    camera: new THREE.Vector3(-3.02, 2.12, 4.42),
    target: new THREE.Vector3(-1.02, 1.3, 0.44)
  },
  {
    id: "no-start-route",
    label: "No-Start Route",
    area: "Battery and ignition symptom path",
    use: "Clicks, slow crank, or will not fire",
    description:
      "Open the no-start workflow when the truck will not crank or will not fire and you need the shortest route into the existing diagnostic checks.",
    bullets: [
      "Starts with the exact symptom before jumping to battery or fuse checks.",
      "Pairs with jump-start references and the roadside card.",
      "Useful for weak-battery versus deeper no-start separation."
    ],
    links: [{ label: "Open no-start workflow", url: "diagnostics.html#no-start-workflow" }],
    quickFacts: [["Symptom", "No start"], ["Best page", "Diagnostics"], ["Companion", "Battery / jump-start"]],
    actions: [
      { label: "No-Start Flow", href: "diagnostics.html#no-start-workflow", description: "Open the dedicated no-start troubleshooting route." },
      { label: "Roadside Stack", href: "quick-sheet.html#roadside-action-stack", description: "Keep the no-start roadside moves visible." },
      { label: "Battery Notes", href: "hood.html#wiring", description: "Review the jump-start and battery references." }
    ],
    labelOffset: { x: 174, y: 26 },
    highlightMeshes: [],
    point: new THREE.Vector3(-1.94, 1.34, 0.98),
    camera: new THREE.Vector3(-4.34, 2.18, 4.82),
    target: new THREE.Vector3(-1.78, 1.24, 0.82)
  },
  {
    id: "trailer-light-flow",
    label: "Trailer-Light Flow",
    area: "Rear connector and trailer symptoms",
    use: "One trailer light function failed after hookup",
    description:
      "Use this when towing symptoms are about light behavior, adapters, or connector functions and you want the targeted trailer-light workflow.",
    bullets: [
      "Best for one-side, one-function, or all-lights trailer failures.",
      "Pairs well with hitch setup and wiring references.",
      "Useful before replacing adapters or checking every fuse blindly."
    ],
    links: [{ label: "Open trailer-light workflow", url: "diagnostics.html#trailer-light-workflow" }],
    quickFacts: [["Symptom", "Trailer lights"], ["Best page", "Diagnostics"], ["Companion", "Rear hitch"]],
    actions: [
      { label: "Trailer Flow", href: "diagnostics.html#trailer-light-workflow", description: "Open the trailer-light diagnostic workflow." },
      { label: "Hookup Flow", href: "rear-hitch.html#trailer-hookup-flow", description: "Open the trailer hookup and connector flow." },
      { label: "Tow Page", href: "rear-hitch.html", description: "Open the full rear hitch and towing page." }
    ],
    labelOffset: { x: -170, y: -16 },
    highlightMeshes: [],
    point: new THREE.Vector3(3.04, 0.98, 0.46),
    camera: new THREE.Vector3(5.82, 1.92, 4.26),
    target: new THREE.Vector3(2.88, 0.9, 0.32)
  },
  {
    id: "maintenance-minder",
    label: "Maintenance Minder",
    area: "Dash code guide and pocket planner",
    use: "Decode A/B service codes and build a checklist",
    description:
      "Jump into the Maintenance Minder guide when the dash code is your starting point and you want the code guide plus the pocket planner nearby.",
    bullets: [
      "Starts from the actual dash code instead of guessing the next service.",
      "Includes the code guide and a compact planner with staging actions.",
      "Useful for converting B12-style codes into a real checklist."
    ],
    links: [{ label: "Open maintenance minder planner", url: "maintenance.html#minder-pocket-planner" }],
    quickFacts: [["Page", "Maintenance"], ["Guide", "A/B and 1-6"], ["Planner", "Pocket checklist"]],
    actions: [
      { label: "Pocket Planner", href: "maintenance.html#minder-pocket-planner", description: "Build a checklist from the dash service code." },
      { label: "Code Guide", href: "maintenance.html#minder", description: "Review the Honda-backed main and sub-item guide." },
      { label: "Garage Notes", href: "garage.html#maintenance-note-preview", description: "Open saved maintenance staging and prep notes." }
    ],
    labelOffset: { x: 166, y: -76 },
    highlightMeshes: [],
    point: new THREE.Vector3(-0.88, 1.46, 0.9),
    camera: new THREE.Vector3(-2.48, 2.16, 4.9),
    target: new THREE.Vector3(-0.74, 1.3, 0.78)
  },
  {
    id: "garage-notes",
    label: "Garage Notes",
    area: "Truck memory layer",
    use: "Parts, notes, saved maintenance, and incident capture",
    description:
      "Open the Garage note layer when you want to save what is unique to your truck instead of staying in the shared reference material.",
    bullets: [
      "Good for parts, battery history, trailer setup, and general truck notes.",
      "Includes warning-light templates and saved maintenance staging.",
      "Best when you are turning a one-time fix into truck memory."
    ],
    links: [{ label: "Open Garage notes", url: "garage.html#notes" }],
    quickFacts: [["Page", "Garage"], ["Section", "Parts and Notes"], ["Companion", "Warning note"]],
    actions: [
      { label: "Parts And Notes", href: "garage.html#notes", description: "Open the main Garage notes form." },
      { label: "Dashboard", href: "garage.html#dashboard", description: "Review the Garage dashboard and recent activity." },
      { label: "Saved Maintenance", href: "garage.html#maintenance-note-preview", description: "Open saved prep and minder notes." }
    ],
    labelOffset: { x: 156, y: 120 },
    highlightMeshes: [],
    point: new THREE.Vector3(0.34, 1.04, 0.32),
    camera: new THREE.Vector3(-2.1, 1.9, 4.06),
    target: new THREE.Vector3(0.2, 0.98, 0.22)
  },
  {
    id: "photo-atlas-launch",
    label: "Photo Atlas",
    area: "Real truck photo reference",
    use: "Compare diagrams and models with actual truck images",
    description:
      "Open the Photo Atlas when you want a visual bridge from the polished site diagrams to real photos of the truck and service areas.",
    bullets: [
      "Useful when model geometry is less helpful than a real photo.",
      "Pairs naturally with the engine, hitch, bed, and fuse entries.",
      "Good for photo-based orientation before touching a part."
    ],
    links: [{ label: "Open the photo atlas", url: "photo-atlas.html" }],
    quickFacts: [["View", "Real photos"], ["Page", "Photo Atlas"], ["Use", "Visual confirmation"]],
    actions: [
      { label: "Photo Atlas", href: "photo-atlas.html", description: "Open the full truck photo atlas." },
      { label: "AR Lab", href: "ar-lab.html", description: "Jump from photo reference into the AR lab." },
      { label: "Garage Photos", href: "garage.html#photos", description: "Open your own truck photo storage area." }
    ],
    labelOffset: { x: -152, y: -94 },
    highlightMeshes: [],
    point: new THREE.Vector3(1.02, 1.92, 0.18),
    camera: new THREE.Vector3(4.58, 2.8, 3.86),
    target: new THREE.Vector3(0.96, 1.72, 0.08)
  },
  {
    id: "ar-lab-launch",
    label: "AR Lab",
    area: "Experimental model and spatial reference",
    use: "AR-style exploration of truck reference content",
    description:
      "Use the AR Lab when you want a more experimental, spatially oriented way to inspect the truck content beyond the homepage map.",
    bullets: [
      "Good when you want to explore beyond the main truck map.",
      "Pairs well with the Photo Atlas and engine model.",
      "Useful for trying alternate spatial presentations of the same truck data."
    ],
    links: [{ label: "Open AR lab", url: "ar-lab.html" }],
    quickFacts: [["Page", "AR Lab"], ["Mode", "Spatial reference"], ["Pair with", "Photo Atlas"]],
    actions: [
      { label: "AR Lab", href: "ar-lab.html", description: "Open the Ridgeline AR lab." },
      { label: "Photo Atlas", href: "photo-atlas.html", description: "Compare the AR view with truck photos." },
      { label: "Engine Model", href: "engine.html", description: "Switch to the dedicated engine view." }
    ],
    labelOffset: { x: -168, y: -40 },
    highlightMeshes: [],
    point: new THREE.Vector3(1.68, 1.84, -0.14),
    camera: new THREE.Vector3(4.92, 2.7, -3.6),
    target: new THREE.Vector3(1.56, 1.66, -0.02)
  },
  {
    id: "offline-launch-pad",
    label: "Offline Launch Pad",
    area: "Search-based offline kit",
    use: "Cached roadside and diagnostics access",
    description:
      "Open the Global Search offline launch pad when you want to check pack status or jump into cached roadside, diagnostics, fuses, and backup routes before signal gets weak.",
    bullets: [
      "Lives inside Global Search rather than a standalone page section.",
      "Shows online/offline state plus offline-pack readiness.",
      "Best before a trip or when you expect weak signal."
    ],
    links: [{ label: "Open offline launch pad in search", url: "index.html?search=offline%20pack" }],
    quickFacts: [["Lives in", "Global Search"], ["Focus", "Offline pack"], ["Use", "Cached routes"]],
    actions: [
      { label: "Offline Launch Pad", href: "index.html?search=offline%20pack", description: "Open search directly to the offline launch pad." },
      { label: "Roadside Router", href: "quick-sheet.html#roadside-router", description: "Jump to the roadside quick-routing page." },
      { label: "Garage Backup", href: "garage.html#diagnostic-activity", description: "Open recent activity and backup tools." }
    ],
    labelOffset: { x: -176, y: 18 },
    highlightMeshes: [],
    point: new THREE.Vector3(2.22, 1.48, -0.18),
    camera: new THREE.Vector3(5.12, 2.34, -3.72),
    target: new THREE.Vector3(2.04, 1.34, -0.06)
  },
  {
    id: "roadside-router-launch",
    label: "Roadside Router",
    area: "Fast roadside situation picker",
    use: "Choose flat tire, no-start, warning light, or trailer issue",
    description:
      "Use this when you need the shortest route to the right roadside reference without wading through the full page structure first.",
    bullets: [
      "Starts from the situation rather than the truck area.",
      "Works well for iPhone use beside the truck.",
      "Pairs with the emergency card and action stack."
    ],
    links: [{ label: "Open roadside router", url: "quick-sheet.html#roadside-router" }],
    quickFacts: [["Page", "Quick Sheet"], ["Mode", "Situation first"], ["Best for", "Roadside use"]],
    actions: [
      { label: "Roadside Router", href: "quick-sheet.html#roadside-router", description: "Open the situation-first roadside launcher." },
      { label: "Action Stack", href: "quick-sheet.html#roadside-action-stack", description: "Keep the next moves visible on screen." },
      { label: "Emergency Card", href: "quick-sheet.html#emergency-card", description: "Open the critical at-a-glance card." }
    ],
    labelOffset: { x: 176, y: 60 },
    highlightMeshes: [],
    point: new THREE.Vector3(-0.46, 0.96, -0.56),
    camera: new THREE.Vector3(-2.62, 1.88, -4.18),
    target: new THREE.Vector3(-0.3, 0.9, -0.44)
  },
  {
    id: "warning-note",
    label: "Warning Note",
    area: "Garage incident capture",
    use: "Save exact warning-light wording and behavior",
    description:
      "Open the structured warning-light note before the message disappears or before you reset anything that would erase the clue.",
    bullets: [
      "Best for capturing the exact wording, color, and context.",
      "Pairs with the warning-light workflow and diagnostics first-minute cards.",
      "Useful when you want a durable record before the symptom changes."
    ],
    links: [{ label: "Open warning note template", url: "garage.html#warning-light-template" }],
    quickFacts: [["Page", "Garage"], ["Template", "Warning light"], ["Pair with", "Diagnostics"]],
    actions: [
      { label: "Warning Note", href: "garage.html#warning-light-template", description: "Open the incident template for warning lights." },
      { label: "Warning Flow", href: "diagnostics.html#warning-light-workflow", description: "Open the warning-light diagnostic flow." },
      { label: "Recent Activity", href: "garage.html#diagnostic-activity", description: "Review recently saved diagnostic activity." }
    ],
    labelOffset: { x: 188, y: -122 },
    highlightMeshes: [],
    point: new THREE.Vector3(-0.72, 1.52, 0.98),
    camera: new THREE.Vector3(-2.52, 2.22, 4.96),
    target: new THREE.Vector3(-0.62, 1.4, 0.82)
  },
  {
    id: "service-hardware",
    label: "Service Hardware",
    area: "Drain hardware and stock service parts",
    use: "Washers, bolts, and small service essentials",
    description:
      "Jump into the maintenance hardware reference when the job is small but the exact crush washer, bolt, or hardware note matters.",
    bullets: [
      "Good before oil and transmission service.",
      "Keeps drain-plug washers and hardware notes close to the truck map.",
      "Useful for staging small parts before you start."
    ],
    links: [{ label: "Open drain hardware reference", url: "maintenance.html#drain-hardware" }],
    quickFacts: [["Page", "Maintenance"], ["Section", "Drain hardware"], ["Use", "Stock small parts"]],
    actions: [
      { label: "Drain Hardware", href: "maintenance.html#drain-hardware", description: "Open the washer, bolt, and hardware table." },
      { label: "Prep Planner", href: "maintenance.html#service-prep", description: "Stage parts and reminders before the job." },
      { label: "Garage Notes", href: "garage.html#notes", description: "Save the hardware you actually use on your truck." }
    ],
    labelOffset: { x: 126, y: 120 },
    highlightMeshes: [],
    point: new THREE.Vector3(-1.1, 0.54, 0.16),
    camera: new THREE.Vector3(-3.22, 1.36, 4.44),
    target: new THREE.Vector3(-0.98, 0.62, 0.1)
  },
  {
    id: "task-truck-wont-start",
    label: "Truck Won't Start",
    area: "Task shortcut",
    use: "Fast route into the starting symptom workflows",
    description:
      "A plain-language shortcut for the most stressful version of the no-start problem when you want the site to match the words in your head.",
    bullets: [
      "Useful when you are not thinking in service-manual terms.",
      "Routes into the same no-start and roadside references quickly.",
      "Best on mobile when the truck simply will not start."
    ],
    links: [{ label: "Open no-start workflow", url: "diagnostics.html#no-start-workflow" }],
    quickFacts: [["Task", "Won't start"], ["Primary flow", "No-start"], ["Companion", "Roadside router"]],
    actions: [
      { label: "No-Start Flow", href: "diagnostics.html#no-start-workflow", description: "Open the no-start diagnostic route." },
      { label: "Roadside Router", href: "quick-sheet.html#roadside-router", description: "Open the fast roadside chooser." },
      { label: "Battery", href: "hood.html#wiring", description: "Review the battery and jump-start notes." }
    ],
    labelOffset: { x: 194, y: 76 },
    highlightMeshes: [],
    point: new THREE.Vector3(-1.72, 1.1, 1.06),
    camera: new THREE.Vector3(-4.18, 1.92, 5.0),
    target: new THREE.Vector3(-1.58, 1.04, 0.92)
  },
  {
    id: "task-flat-tire",
    label: "Flat Tire",
    area: "Task shortcut",
    use: "Fast route into jack points, torque, and tire references",
    description:
      "A plain-language shortcut for the most common roadside truck task: getting to the tire, jack-point, torque, and action-stack references quickly.",
    bullets: [
      "Best when the user is thinking about the problem, not the component.",
      "Pairs with jack points, emergency card, and tire lab.",
      "Useful on iPhone at the side of the road."
    ],
    links: [{ label: "Open roadside action stack", url: "quick-sheet.html#roadside-action-stack" }],
    quickFacts: [["Task", "Flat tire"], ["Primary page", "Quick Sheet"], ["Companion", "Jack points"]],
    actions: [
      { label: "Action Stack", href: "quick-sheet.html#roadside-action-stack", description: "Open the flat-tire roadside sequence." },
      { label: "Jack Points", href: "maintenance.html#jack-points", description: "Open the maintenance jack-point notes." },
      { label: "Tire Lab", href: "tires.html", description: "Open the tire and wheel reference lab." }
    ],
    labelOffset: { x: 152, y: 132 },
    highlightMeshes: [],
    point: new THREE.Vector3(-2.14, 0.52, 1.1),
    camera: new THREE.Vector3(-4.34, 1.44, 4.94),
    target: new THREE.Vector3(-1.92, 0.58, 0.98)
  },
  {
    id: "task-dead-outlet-radio",
    label: "Dead Outlet / Radio",
    area: "Task shortcut",
    use: "Fast route into cabin electrical and fuse symptom flows",
    description:
      "Open the symptom-first cabin electrical route when a phone charger, outlet, radio, or screen suddenly stops working.",
    bullets: [
      "Matches the way most people describe the problem.",
      "Routes into fuse symptoms before a blind fuse swap.",
      "Pairs with cabin fuses and cabin electronics."
    ],
    links: [{ label: "Open fuse symptom finder", url: "diagnostics.html#fuse-symptom-finder" }],
    quickFacts: [["Task", "Dead outlet or radio"], ["Primary flow", "Fuse symptoms"], ["Companion", "Cabin fuses"]],
    actions: [
      { label: "Fuse Symptoms", href: "diagnostics.html#fuse-symptom-finder", description: "Start from the failed feature." },
      { label: "Cabin Fuses", href: "cabin.html#fuses", description: "Open the under-dash fuse references." },
      { label: "Cabin Page", href: "cabin.html", description: "Open the cabin electronics page." }
    ],
    labelOffset: { x: 170, y: -8 },
    highlightMeshes: [],
    point: new THREE.Vector3(-0.28, 1.18, 0.32),
    camera: new THREE.Vector3(-2.56, 2.0, 4.22),
    target: new THREE.Vector3(-0.22, 1.08, 0.2)
  },
  {
    id: "task-tow-setup",
    label: "Tow Setup",
    area: "Task shortcut",
    use: "Fast route into hitch, hookup, and towing references",
    description:
      "Use this when the job is simply getting ready to tow and you want the setup, hookup, and trailer-light material together.",
    bullets: [
      "Good before connecting a trailer.",
      "Pairs with the hitch, trailer-light, and quick-sheet towing references.",
      "Useful when you care about setup more than diagnosis."
    ],
    links: [{ label: "Open rear hitch page", url: "rear-hitch.html" }],
    quickFacts: [["Task", "Tow setup"], ["Primary page", "Rear Hitch"], ["Companion", "Trailer flow"]],
    actions: [
      { label: "Rear Hitch", href: "rear-hitch.html", description: "Open the towing and hitch reference page." },
      { label: "Hookup Flow", href: "rear-hitch.html#trailer-hookup-flow", description: "Open the hookup flow." },
      { label: "Trailer Flow", href: "diagnostics.html#trailer-light-workflow", description: "Open the trailer-light workflow." }
    ],
    labelOffset: { x: -162, y: 58 },
    highlightMeshes: [],
    point: new THREE.Vector3(2.96, 0.82, -0.16),
    camera: new THREE.Vector3(5.72, 1.76, -4.02),
    target: new THREE.Vector3(2.8, 0.78, -0.08)
  },
  {
    id: "task-log-service",
    label: "Log Service",
    area: "Task shortcut",
    use: "Fast route into the maintenance log and Garage tracker",
    description:
      "A plain-language shortcut for the moment right after work is done and you want to capture it before the mileage, date, or parts details disappear.",
    bullets: [
      "Useful after oil changes, rotations, battery installs, and timing work.",
      "Pairs with the Garage tracker and maintenance record.",
      "Helps turn one-off work into durable truck history."
    ],
    links: [{ label: "Open Garage tracker", url: "garage.html#notes" }],
    quickFacts: [["Task", "Log service"], ["Primary page", "Garage"], ["Companion", "Maintenance log"]],
    actions: [
      { label: "Garage Notes", href: "garage.html#notes", description: "Open the Garage notes and tracker section." },
      { label: "Garage Dashboard", href: "garage.html#dashboard", description: "Review recent history and activity." },
      { label: "Major Service Log", href: "maintenance.html#major-service-log", description: "Open the main maintenance record." }
    ],
    labelOffset: { x: 186, y: 104 },
    highlightMeshes: [],
    point: new THREE.Vector3(0.92, 1.0, -0.18),
    camera: new THREE.Vector3(4.36, 1.88, -3.9),
    target: new THREE.Vector3(0.78, 0.96, -0.08)
  },
  {
    id: "task-tag-this-area",
    label: "Tag This Area",
    area: "Task shortcut",
    use: "Create a physical NFC shortcut for a truck location",
    description:
      "Use this when the next improvement is making the truck itself launch the right page with a phone tap from a physical tag.",
    bullets: [
      "Best for repeated locations like fuse covers, bed utility, or service spots.",
      "Pairs with the NFC writer and tag map.",
      "Useful when you want one-tap iPhone access from the truck."
    ],
    links: [{ label: "Open NFC writer", url: "nfc.html#tag-writer" }],
    quickFacts: [["Task", "Tag this area"], ["Primary page", "NFC"], ["Companion", "Tag map"]],
    actions: [
      { label: "Write A Tag", href: "nfc.html#tag-writer", description: "Open the NFC tag writer workbench." },
      { label: "Tag Map", href: "nfc.html#tag-map", description: "See suggested truck tag locations." },
      { label: "iPhone Setup", href: "nfc.html#iphone-nfc-workflow", description: "Open the iPhone NFC setup steps." }
    ],
    labelOffset: { x: 184, y: 18 },
    highlightMeshes: [],
    point: new THREE.Vector3(-1.22, 0.98, 1.08),
    camera: new THREE.Vector3(-3.28, 1.82, 5.12),
    target: new THREE.Vector3(-1.08, 0.94, 0.96)
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

function compactHotspotLabel(label = "") {
  const compactLabels = {
    "Battery / Jump-Start": "Battery",
    "Engine Model": "Engine",
    "Warning Lights / Diagnostics": "Diagnostics",
    "Service Prep / Log": "Service",
    "Fuse Symptom Finder": "Fuse Route",
    "No-Start Route": "No-Start",
    "Trailer-Light Flow": "Trailer",
    "Maintenance Minder": "Minder",
    "Garage Notes": "Notes",
    "Photo Atlas": "Photos",
    "AR Lab": "AR",
    "Offline Launch Pad": "Offline",
    "Roadside Router": "Roadside",
    "Warning Note": "Warn Note",
    "Service Hardware": "Hardware",
    "Truck Won't Start": "Won't Start",
    "Flat Tire": "Flat Tire",
    "Dead Outlet / Radio": "Outlet/Radio",
    "Tow Setup": "Tow Setup",
    "Log Service": "Log Service",
    "Tag This Area": "Tag Area",
    "Driver-Left Fuse Box": "Driver Fuse",
    "Roadside Jack Points": "Jack Points",
    "Tires / Wheels": "Tires",
    "Trailer Hitch / Wiring": "Hitch",
    "Bed / In-Bed Trunk": "Bed Trunk",
    "Cabin Electronics": "Cabin",
    "Emergency Quick Sheet": "Quick Sheet",
    "NFC Tag Console": "NFC"
  };

  return compactLabels[label] || label;
}

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
const viewerQuickMenuButtons = [...document.querySelectorAll(".viewer-quick-menu-button")];
const explodedToggle = document.getElementById("exploded-toggle");
const cinematicToggle = document.getElementById("cinematic-toggle");
const viewerStage = document.querySelector(".viewer-stage");
const hudButtons = [...document.querySelectorAll("[data-hud-action]")];
const requestedSystemId = new URLSearchParams(window.location.search).get("system");
const MAP_LABEL_MODE_KEY = "ridgeline-map-label-mode-v2";
const legacyMapLabelMode = localStorage.getItem("ridgeline-map-label-mode");
const savedMapLabelMode = localStorage.getItem(MAP_LABEL_MODE_KEY) || legacyMapLabelMode;
let mapLabelMode = ["labels", "focus", "clean"].includes(savedMapLabelMode) ? savedMapLabelMode : "focus";
if (!localStorage.getItem(MAP_LABEL_MODE_KEY)) {
  mapLabelMode = savedMapLabelMode === "clean" ? "clean" : "focus";
}

function setVehicleMapContextLabel(labels) {
  const target = document.querySelector("[data-current-section-label]");
  if (!target) {
    return;
  }

  const labelList = (Array.isArray(labels) ? labels : [labels])
    .map((label) => `${label || ""}`.trim())
    .filter(Boolean);
  const label = labelList.length ? labelList.join(" / ") : "Vehicle Map";
  target.textContent = label;
  target.title = label;
  target.dataset.vehicleMapLabel = label;
}

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
  const defaultCameraPosition = isPhoneViewer
    ? new THREE.Vector3(-9.35, 3.58, 8.6)
    : new THREE.Vector3(-5.85, 2.82, 3.46);
  const defaultCameraTarget = new THREE.Vector3(0, isPhoneViewer ? 0.9 : 1, 0);
  const autoRotateResumeDelay = 3200;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = !isPhoneViewer;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  viewerElement.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x08111c, 24, 46);

  const camera = new THREE.PerspectiveCamera(isPhoneViewer ? 50 : 39, 1, 0.1, 100);
  camera.position.copy(defaultCameraPosition);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isPhoneViewer;
  controls.enablePan = true;
  controls.minDistance = isPhoneViewer ? 5.1 : 3.55;
  controls.maxDistance = isPhoneViewer ? 26 : 16;
  controls.target.copy(defaultCameraTarget);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;
  renderer.domElement.style.touchAction = "none";

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.96;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.03).texture;

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

  const stageGlow = new THREE.PointLight(0x61dfff, 6.4, 18, 2);
  stageGlow.position.set(0.15, 0.88, 0.1);
  scene.add(stageGlow);

  const warmUnderglow = new THREE.PointLight(0xff915e, 4.2, 14, 2);
  warmUnderglow.position.set(-1.2, 0.5, -1.8);
  scene.add(warmUnderglow);

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

  const floorHalo = new THREE.Mesh(
    new THREE.RingGeometry(3.25, 5.85, 100),
    new THREE.MeshBasicMaterial({
      color: 0x67dfff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    })
  );
  floorHalo.rotation.x = -Math.PI / 2;
  floorHalo.position.y = 0.032;
  scene.add(floorHalo);

  const floorInnerHalo = new THREE.Mesh(
    new THREE.RingGeometry(2.05, 3.15, 80),
    new THREE.MeshBasicMaterial({
      color: 0xff915e,
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide
    })
  );
  floorInnerHalo.rotation.x = -Math.PI / 2;
  floorInnerHalo.position.y = 0.034;
  scene.add(floorInnerHalo);

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
  truck.scale.setScalar(0.985);
  scene.add(truck);
  const meshRegistry = new Map();
  const highlightOutlines = new Map();
  const explodableNodes = [];
  let importedModelRoot = null;
  let explodedMode = false;
  let cinematicMode = false;
  let autoRotateResumeTimer = null;

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
  createServiceZone(
    "jackPointFrontLeftZone",
    0.22,
    0.08,
    0.12,
    new THREE.Vector3(-1.3, 0.54, 1.1),
    { y: 0.06 }
  );
  createServiceZone(
    "jackPointRearLeftZone",
    0.22,
    0.08,
    0.12,
    new THREE.Vector3(1.28, 0.54, 1.1),
    { y: 0.06 }
  );
  createServiceZone(
    "jackPointFrontRightZone",
    0.22,
    0.08,
    0.12,
    new THREE.Vector3(-1.3, 0.54, -1.1),
    { y: -0.06 }
  );
  createServiceZone(
    "jackPointRearRightZone",
    0.22,
    0.08,
    0.12,
    new THREE.Vector3(1.28, 0.54, -1.1),
    { y: -0.06 }
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

  function setFallbackVisualsVisible(visible) {
    truck.children.forEach((child) => {
      if (child.userData.isFallbackVisual) {
        child.visible = visible;
      }
    });
  }

  setFallbackVisualsVisible(false);
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
      nextMaterial.transparent = true;
      nextMaterial.opacity = 0.96;
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

      setFallbackVisualsVisible(false);

      viewerStatus.hidden = true;
  }

  const primaryModelUrls = isPhoneViewer
    ? [
        "./assets/ridgeline-2021/honda-ridgeline-2021-ar.glb",
        "./assets/ridgeline-2021/honda-ridgeline-2021.glb"
      ]
    : [
        "./assets/ridgeline-2021/honda-ridgeline-2021.glb",
        "./assets/ridgeline-2021/honda-ridgeline-2021-ar.glb"
      ];

  function loadPrimaryModel(index = 0) {
    if (index >= primaryModelUrls.length) {
      fallbackLoader.setResourcePath("./assets/ridgeline-2021/textures/");
      fallbackLoader.load(
        "./assets/ridgeline-2021/honda-ridgeline-2021.fbx",
        (fbx) => {
          applyLoadedModel(fbx);
        },
        undefined,
        () => {
          setFallbackVisualsVisible(true);
          refreshExplodableNodes(truck);
          viewerStatus.hidden = false;
          viewerStatus.textContent =
            "The real truck model could not be loaded, so the backup vehicle view is being used instead.";
        }
      );
      return;
    }

    modelLoader.load(
      primaryModelUrls[index],
      (gltf) => {
        applyLoadedModel(gltf.scene);
      },
      undefined,
      () => {
        loadPrimaryModel(index + 1);
      }
    );
  }

  loadPrimaryModel();

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

  let selectedSystem = systems.find((entry) => entry.id === requestedSystemId) || systems[0];
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
  const jackPointGuides = [
    {
      key: "front-left",
      label: "Front Left",
      shortLabel: "FL",
      note: "Behind front wheel",
      point: new THREE.Vector3(-1.3, 0.56, 1.18)
    },
    {
      key: "rear-left",
      label: "Rear Left",
      shortLabel: "RL",
      note: "Ahead of rear wheel",
      point: new THREE.Vector3(1.28, 0.56, 1.18)
    },
    {
      key: "front-right",
      label: "Front Right",
      shortLabel: "FR",
      note: "Behind front wheel",
      point: new THREE.Vector3(-1.3, 0.56, -1.18)
    },
    {
      key: "rear-right",
      label: "Rear Right",
      shortLabel: "RR",
      note: "Ahead of rear wheel",
      point: new THREE.Vector3(1.28, 0.56, -1.18)
    }
  ];
  const jackPointMarkerGroup = new THREE.Group();
  jackPointMarkerGroup.name = "jackPointMarkerGroup";
  jackPointMarkerGroup.visible = false;
  truck.add(jackPointMarkerGroup);

  const jackPointMarkerMaterial = new THREE.MeshBasicMaterial({
    color: 0xff915e,
    transparent: true,
    opacity: 0.96,
    depthTest: false
  });
  const jackPointMarkerHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd0b5,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
    depthTest: false
  });
  const jackPointMarkerRingGeometry = new THREE.TorusGeometry(0.115, 0.011, 12, 40);
  const jackPointMarkerCoreGeometry = new THREE.SphereGeometry(0.052, 18, 18);
  const jackPointMarkerStemGeometry = new THREE.CylinderGeometry(0.012, 0.018, 0.18, 12);

  const jackPointMarkers = jackPointGuides.map((guide) => {
    const marker = new THREE.Group();
    marker.name = `${guide.key}-jack-point-marker`;
    marker.position.copy(guide.point);
    marker.position.z += Math.sign(guide.point.z || 1) * 0.085;

    const ring = new THREE.Mesh(jackPointMarkerRingGeometry, jackPointMarkerHaloMaterial.clone());
    ring.name = `${guide.key}-jack-point-ring`;
    ring.renderOrder = 20;
    if (guide.point.z < 0) {
      ring.rotation.y = Math.PI;
    }

    const core = new THREE.Mesh(jackPointMarkerCoreGeometry, jackPointMarkerMaterial.clone());
    core.name = `${guide.key}-jack-point-core`;
    core.renderOrder = 21;

    const stem = new THREE.Mesh(jackPointMarkerStemGeometry, jackPointMarkerMaterial.clone());
    stem.name = `${guide.key}-jack-point-stem`;
    stem.position.y = -0.11;
    stem.renderOrder = 20;

    marker.add(ring, core, stem);
    marker.traverse((child) => {
      child.userData.ignoreOcclusion = true;
    });
    jackPointMarkerGroup.add(marker);
    return marker;
  });
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

  const hotspotTray = document.createElement("aside");
  hotspotTray.className = "hotspot-tray";
  hotspotTray.setAttribute("aria-live", "polite");
  hotspotTray.innerHTML = `
    <div>
      <span class="hotspot-tray-kicker">Selected Area</span>
      <strong data-hotspot-tray-title>Fuse Box A</strong>
      <p data-hotspot-tray-copy>Tap a truck hotspot to see area details and shortcuts.</p>
    </div>
    <div class="hotspot-tray-actions" data-hotspot-tray-actions></div>
  `;
  viewerStage?.appendChild(hotspotTray);
  const hotspotTrayTitle = hotspotTray.querySelector("[data-hotspot-tray-title]");
  const hotspotTrayCopy = hotspotTray.querySelector("[data-hotspot-tray-copy]");
  const hotspotTrayActions = hotspotTray.querySelector("[data-hotspot-tray-actions]");

  const mapModeBar = document.createElement("div");
  mapModeBar.className = "map-mode-switch";
  mapModeBar.setAttribute("aria-label", "Map label mode");
  mapModeBar.innerHTML = `
    <button type="button" data-map-label-mode="labels">Labels</button>
    <button type="button" data-map-label-mode="focus">Focus</button>
    <button type="button" data-map-label-mode="clean">Clean</button>
  `;
  viewerStage?.appendChild(mapModeBar);

  const mapMiniLegend = document.createElement("div");
  mapMiniLegend.className = "map-mini-legend";
  mapMiniLegend.setAttribute("aria-label", "Vehicle map legend");
  mapMiniLegend.innerHTML = `
    <span><i class="legend-dot legend-dot-live"></i>Tap targets</span>
    <span><i class="legend-dot legend-dot-selected"></i>Selected</span>
    <span><i class="legend-line"></i>Related labels</span>
  `;
  viewerStage?.appendChild(mapMiniLegend);

  function applyMapLabelMode(mode = "labels") {
    mapLabelMode = ["labels", "focus", "clean"].includes(mode) ? mode : "labels";
    localStorage.setItem(MAP_LABEL_MODE_KEY, mapLabelMode);
    localStorage.setItem("ridgeline-map-label-mode", mapLabelMode);
    viewerStage?.setAttribute("data-map-label-mode", mapLabelMode);
    mapModeBar.querySelectorAll("[data-map-label-mode]").forEach((button) => {
      const isActive = button.dataset.mapLabelMode === mapLabelMode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  mapModeBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-map-label-mode]");
    if (!button) {
      return;
    }
    applyMapLabelMode(button.dataset.mapLabelMode);
  });
  applyMapLabelMode(mapLabelMode);

  const jackPointLayer = document.createElement("div");
  jackPointLayer.className = "jack-point-label-layer";
  jackPointLayer.hidden = true;
  hotspotLayer.appendChild(jackPointLayer);

  const jackPointLabels = jackPointGuides.map((guide) => {
    const label = document.createElement("button");
    label.className = "jack-point-label";
    label.type = "button";
    label.setAttribute("aria-label", `${guide.label} jack point`);
    label.innerHTML = `
      <strong>${guide.shortLabel}</strong>
      <span>${guide.label}</span>
      <small>${guide.note}</small>
    `;
    label.addEventListener("click", () => {
      stopShowcaseRotation();
      selectSystem("jack-points", false, [guide.label, "Roadside Jack Points"]);
    });
    jackPointLayer.appendChild(label);
    return { ...guide, element: label };
  });

  systems.forEach((system) => {
    const button = document.createElement("button");
    button.className = "hotspot-button";
    button.type = "button";
    button.setAttribute("aria-label", system.label);
    button.addEventListener("click", () => {
      stopShowcaseRotation();
      selectSystem(system.id, cinematicMode);
    });
    hotspotLayer.appendChild(button);
    hotspotButtons.set(system.id, button);

    const callout = document.createElement("div");
    callout.className = "hotspot-callout";

    const line = document.createElement("div");
    line.className = "callout-line";
    callout.appendChild(line);

    const pill = document.createElement("button");
    pill.className = "callout-pill callout-pill-button";
    pill.type = "button";
    pill.textContent = system.label;
    pill.dataset.shortLabel = compactHotspotLabel(system.label);
    pill.setAttribute("aria-label", `Show ${system.label} details`);
    pill.addEventListener("click", () => {
      stopShowcaseRotation();
      selectSystem(system.id, cinematicMode);
    });
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
      if (isServiceZone || isServiceOutline || child.userData.ignoreOcclusion) {
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

  function relatedActionsForSystem(system) {
    const rawActions = [
      ...(system.actions || []),
      {
        label: "Garage Note",
        href: `garage.html#notes`,
        description: `Save a note about ${system.label}.`
      },
      {
        label: "Photo Atlas",
        href: "photo-atlas.html",
        description: "Compare this map area with real truck photos."
      }
    ];
    const seen = new Set();
    return rawActions.filter((action) => {
      const key = `${action.label}|${action.href}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function setInspector(system) {
    titleEl.textContent = system.label;
    descriptionEl.textContent = system.description;
    areaEl.textContent = system.area;
    useEl.textContent = system.use;

    const inspectorPanel = titleEl.closest(".inspector-panel");
    inspectorPanel?.classList.remove("is-model-selection");
    void inspectorPanel?.offsetWidth;
    inspectorPanel?.classList.add("is-model-selection");

    pointsEl.innerHTML = "";
    system.bullets.forEach((point) => {
      const li = document.createElement("li");
      li.textContent = point;
      pointsEl.appendChild(li);
    });

    linksEl.innerHTML = "";
    if (system.id === "jack-points") {
      const guide = document.createElement("div");
      guide.className = "jack-point-guide-card";
      guide.innerHTML = `
        <strong>Jack Point Map</strong>
        <svg viewBox="0 0 320 150" role="img" aria-label="Top view jack point diagram">
          <text class="jack-map-direction" x="38" y="80">Front</text>
          <path class="jack-map-body" d="M48 46h224c17 0 30 13 30 30v4c0 17-13 30-30 30H48c-17 0-30-13-30-30v-4c0-17 13-30 30-30Z" />
          <path class="jack-map-cabin" d="M150 38h74c13 0 24 11 24 24v56H122V66c0-15 13-28 28-28Z" />
          <circle class="jack-map-wheel" cx="76" cy="42" r="16" />
          <circle class="jack-map-wheel" cx="244" cy="42" r="16" />
          <circle class="jack-map-wheel" cx="76" cy="108" r="16" />
          <circle class="jack-map-wheel" cx="244" cy="108" r="16" />
          <g class="jack-map-point">
            <circle cx="112" cy="35" r="8" /><text x="112" y="19">FL</text>
            <circle cx="208" cy="35" r="8" /><text x="208" y="19">RL</text>
            <circle cx="112" cy="115" r="8" /><text x="112" y="142">FR</text>
            <circle cx="208" cy="115" r="8" /><text x="208" y="142">RR</text>
          </g>
        </svg>
        <p>Use the reinforced pinch-weld point closest to the flat tire: front points sit behind the front wheels, rear points sit ahead of the rear wheels.</p>
      `;
      linksEl.appendChild(guide);
    }

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

    hotspotTrayTitle.textContent = system.label;
    hotspotTrayCopy.textContent = `${system.area} - ${system.use}`;
    const primaryActions = relatedActionsForSystem(system).slice(0, 4);
    hotspotTrayActions.innerHTML = primaryActions
      .map((action) => `<a href="${action.href}">${action.label}</a>`)
      .join("");
    if (!hotspotTrayActions.children.length) {
      hotspotTrayActions.innerHTML = `<a href="garage.html#notes">Open Notes</a>`;
    }
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
    relatedActionsForSystem(system).forEach((action) => {
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
    setVehicleMapContextLabel("Vehicle Map");
    titleEl.textContent = defaultInspectorState.title;
    descriptionEl.textContent = "Tap a circle on the truck to inspect that area.";
    areaEl.textContent = defaultInspectorState.area;
    useEl.textContent = defaultInspectorState.use;
    pointsEl.innerHTML = "";
    linksEl.innerHTML = "";
    jackPointLayer.hidden = true;
    jackPointMarkerGroup.visible = false;
    jackPointLabels.forEach((guide) => {
      guide.element.hidden = true;
    });

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
    if (autoRotateResumeTimer) {
      clearTimeout(autoRotateResumeTimer);
      autoRotateResumeTimer = null;
    }
    controls.autoRotate = false;
  }

  function scheduleShowcaseRotationResume() {
    if (autoRotateResumeTimer) {
      clearTimeout(autoRotateResumeTimer);
    }

    autoRotateResumeTimer = window.setTimeout(() => {
      if (isViewerInteracting || cameraTween) {
        scheduleShowcaseRotationResume();
        return;
      }

      controls.autoRotate = true;
      autoRotateResumeTimer = null;
    }, autoRotateResumeDelay);
  }

  function selectSystem(id, moveCamera = false, contextLabels = null) {
    const system = systems.find((entry) => entry.id === id);
    if (!system) {
      return;
    }

    selectedSystem = system;
    jackPointMarkerGroup.visible = id === "jack-points";
    setInspector(system);
    setVehicleMapContextLabel(contextLabels || system.contextLabels || system.label);
    window.ridgelineSaveLastTask?.({
      href: `index.html?system=${encodeURIComponent(system.id)}#viewer`,
      label: system.label,
      kind: "hotspot"
    });
    window.dispatchEvent(
      new CustomEvent("ridgeline:hotspot-selected", {
        detail: {
          id: system.id,
          label: system.label,
          href: `index.html?system=${encodeURIComponent(system.id)}#viewer`
        }
      })
    );

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

  let rendererHasSize = false;
  let lastRendererWidth = 0;
  let lastRendererHeight = 0;

  function getViewerSize() {
    const rect = viewerElement.getBoundingClientRect();
    const width = Math.round(viewerElement.clientWidth || rect.width);
    const height = Math.round(viewerElement.clientHeight || rect.height);
    return { width, height };
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

  function projectHotspots(now) {
    const { width, height } = getViewerSize();
    if (width < 2 || height < 2) {
      return;
    }

    cameraLocal.copy(camera.position);
    truck.worldToLocal(cameraLocal);
    const visibleSideSign = cameraLocal.z >= 0 ? 1 : -1;
    const visibleFrontSign = cameraLocal.x >= 0 ? 1 : -1;
    const showJackLabels = selectedSystem?.id === "jack-points";
    jackPointMarkerGroup.visible = showJackLabels;
    const clampX = (value, padding = 20) =>
      THREE.MathUtils.clamp(value, padding, Math.max(padding, width - padding));
    const clampY = (value, padding = 20) =>
      THREE.MathUtils.clamp(value, padding, Math.max(padding, height - padding));
    const clampLabelLeft = (value, labelWidth, padding = 8) =>
      THREE.MathUtils.clamp(value, padding, Math.max(padding, width - labelWidth - padding));

    jackPointLayer.hidden = !showJackLabels;
    jackPointLabels.forEach((guide) => {
      if (!showJackLabels) {
        guide.element.hidden = true;
        return;
      }

      projected.copy(guide.point).applyMatrix4(truck.matrixWorld).project(camera);
      const isVisible = projected.z < 1 && projected.z > -1;
      if (!isVisible) {
        guide.element.hidden = true;
        return;
      }

      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;

      guide.element.hidden = false;
      guide.element.classList.toggle(
        "is-edge-pinned",
        x < 52 || x > width - 52 || y < 84 || y > height - 16
      );
      guide.element.style.left = `${clampX(x, 52)}px`;
      guide.element.style.top = `${clampY(y, 84)}px`;
    });

    const hotspotCandidates = [];

    systems.forEach((system) => {
      const button = hotspotButtons.get(system.id);
      const callout = calloutElements.get(system.id);
      const isActive = system.id === selectedSystem?.id;
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

      if (!isActive && (x < -40 || x > width + 40 || y < -40 || y > height + 40)) {
        button.style.display = "none";
        if (callout) {
          callout.root.style.display = "none";
        }
        return;
      }

      if (!isActive && (!isVisibleSideZone || !isVisibleFrontZone)) {
        button.style.display = "none";
        if (callout) {
          callout.root.style.display = "none";
        }
        return;
      }

      const anchorX = isActive ? clampX(x, 24) : x;
      const anchorY = isActive ? clampY(y, 24) : y;
      hotspotCandidates.push({
        system,
        button,
        callout,
        isActive,
        x,
        y,
        anchorX,
        anchorY,
        centerDistance: Math.abs(x - width / 2) + Math.abs(y - height / 2)
      });
    });

    let visibleHotspotIds = null;
    if (mapLabelMode === "focus") {
      const focusLimit = isPhoneViewer ? 3 : 5;
      const focusEntries = hotspotCandidates
        .filter((entry) => !entry.isActive)
        .sort((a, b) => a.centerDistance - b.centerDistance)
        .slice(0, focusLimit);
      visibleHotspotIds = new Set(focusEntries.map((entry) => entry.system.id));
      if (selectedSystem?.id) {
        visibleHotspotIds.add(selectedSystem.id);
      }
    } else if (mapLabelMode === "clean") {
      visibleHotspotIds = new Set(selectedSystem?.id ? [selectedSystem.id] : []);
    }

    hotspotCandidates.forEach((entry) => {
      const { system, button, callout, isActive, x, y, anchorX, anchorY } = entry;
      const shouldShow =
        !visibleHotspotIds || visibleHotspotIds.has(system.id) || isActive;

      if (!shouldShow) {
        button.style.display = "none";
        if (callout) {
          callout.root.style.display = "none";
        }
        return;
      }

      button.style.display = "block";
      button.style.left = `${anchorX}px`;
      button.style.top = `${anchorY}px`;
      if (!callout) {
        return;
      }

      const rawLabelX = anchorX + system.labelOffset.x;
      const rawLabelY = anchorY + system.labelOffset.y;
      const pillWidth = Math.min(width - 16, Math.max(72, callout.pill.offsetWidth || 144));
      const pillHeight = Math.max(28, callout.pill.offsetHeight || 28);
      const labelX = clampLabelLeft(rawLabelX, pillWidth, 8);
      const labelY = clampY(rawLabelY, Math.ceil(pillHeight / 2) + 8);
      const dx = labelX - anchorX;
      const dy = labelY - anchorY;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      callout.root.style.display = "block";
      callout.root.classList.toggle(
        "is-edge-pinned",
        rawLabelX !== labelX || rawLabelY !== labelY || x !== anchorX || y !== anchorY
      );
      callout.root.classList.toggle("is-active", isActive);
      callout.line.style.left = `${anchorX}px`;
      callout.line.style.top = `${anchorY}px`;
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
    truck.scale.setScalar(1);
    truck.position.y = sceneFrameOffset.y;

    keyLight.intensity = 2.45;
    rimLight.intensity = 1.4;
    warmLight.intensity = 1.05;
    stageGlow.intensity = 4.2 + Math.sin(now * 0.0024) * 0.72;
    warmUnderglow.intensity = 2.9 + Math.cos(now * 0.0021) * 0.45;
    floor.material.opacity = 0.36;
    floorHalo.material.opacity = 0.18 + Math.sin(now * 0.002) * 0.01;
    floorInnerHalo.material.opacity = 0.115 + Math.cos(now * 0.0026) * 0.008;

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

    hotspotMeshes.forEach((mesh, index) => {
      const isActive = systems[index].id === selectedSystem?.id;
      const pulse = isActive ? 1.28 + Math.sin(now * 0.008) * 0.16 : 1 + Math.sin(now * 0.004 + index) * 0.03;
      mesh.scale.setScalar(pulse);
    });

    if (jackPointMarkerGroup.visible) {
      jackPointMarkers.forEach((marker, index) => {
        const pulse = 1 + Math.sin(now * 0.008 + index * 0.7) * 0.12;
        marker.scale.setScalar(pulse);
        marker.rotation.y = Math.sin(now * 0.002 + index) * 0.08;
      });
    }

    if (
      camera.position.distanceToSquared(lastCameraPosition) > 0.0004 ||
      1 - Math.abs(camera.quaternion.dot(lastCameraQuaternion)) > 0.00002
    ) {
      visibilityDirty = true;
      lastCameraPosition.copy(camera.position);
      lastCameraQuaternion.copy(camera.quaternion);
    }
    if (!rendererHasSize && !resizeRenderer()) {
      requestAnimationFrame(tick);
      return;
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

  hudButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.hudAction;

      if (action === "vehicle-link") {
        stopShowcaseRotation();
        cameraTween = {
          from: camera.position.clone(),
          to: defaultCameraPosition.clone(),
          fromTarget: controls.target.clone(),
          toTarget: defaultCameraTarget.clone(),
          start: performance.now(),
          duration: 850
        };
        return;
      }

      if (action === "live-diagnostics") {
        window.location.href = "diagnostics.html";
        return;
      }

      if (action === "zone-tracking") {
        document.getElementById("systems")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
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
    closeViewerQuickMenus();
  });

  function closeViewerQuickMenus(exceptButton = null) {
    viewerQuickMenuButtons.forEach((button) => {
      if (button === exceptButton) {
        return;
      }

      button.setAttribute("aria-expanded", "false");
      const panel = document.getElementById(button.getAttribute("aria-controls"));
      if (panel) {
        panel.hidden = true;
      }
    });
  }

  viewerQuickMenuButtons.forEach((button) => {
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = button.getAttribute("aria-expanded") === "true";
      closeViewerQuickMenus(button);
      button.setAttribute("aria-expanded", isOpen ? "false" : "true");
      if (panel) {
        panel.hidden = isOpen;
      }
      viewerToolsToggle?.setAttribute("aria-expanded", "false");
      if (viewerToolsMenu) {
        viewerToolsMenu.hidden = true;
      }
    });

    panel?.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => closeViewerQuickMenus());
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".viewer-console")) {
      closeViewerQuickMenus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeViewerQuickMenus();
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
    stopShowcaseRotation();
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
    scheduleShowcaseRotationResume();
  });

  const preventViewerPageScroll = (event) => {
    if (event.cancelable) {
      event.preventDefault();
    }
  };

  renderer.domElement.addEventListener("pointerdown", () => {
    stopShowcaseRotation();
  });
  renderer.domElement.addEventListener("wheel", stopShowcaseRotation, { passive: true });
  viewerStage?.addEventListener("touchmove", preventViewerPageScroll, {
    passive: false,
    capture: true
  });
  hotspotLayer?.addEventListener("touchmove", preventViewerPageScroll, {
    passive: false,
    capture: true
  });
  renderer.domElement.addEventListener("touchstart", stopShowcaseRotation, { passive: true });
  renderer.domElement.addEventListener("touchmove", preventViewerPageScroll, { passive: false });
  renderer.domElement.addEventListener("pointerup", scheduleShowcaseRotationResume);
  renderer.domElement.addEventListener("touchend", scheduleShowcaseRotationResume, {
    passive: true
  });

  window.addEventListener("resize", resizeRenderer);

  resizeRenderer();
  lastCameraPosition.copy(camera.position);
  lastCameraQuaternion.copy(camera.quaternion);
  selectSystem(selectedSystem.id, false);
  requestAnimationFrame(tick);
}
