const landingUrl = (id) => `nfc-landing.html?target=${id}`;

export const nfcTargets = [
  {
    id: "hood-fuse-box-a",
    title: "Under-Hood Fuse Box A",
    category: "Electrical",
    badge: "Fuse A",
    placement: "Passenger-side under-hood fuse box cover",
    url: landingUrl("hood-fuse-box-a"),
    sectionUrl: "hood.html?nfc=hood-fuse-box-a#hood-fuse-box-a",
    description: "Opens a focused fuse-box landing page with a direct jump to the numbered under-hood Fuse Box A diagram, inspector, and table.",
    quickUse: "Use this when a fuse, relay, outlet, lighting circuit, or engine-bay electrical item needs a quick check.",
    primaryActionLabel: "Open Fuse Box A Diagram",
    details: [
      "Best physical tag spot: on or beside the passenger-side under-hood fuse box cover.",
      "The landing page keeps the fuse diagram, source page, and related electrical links together.",
      "If the tag is scanned in the garage, open the diagram first, then use search for the exact fuse number or circuit."
    ],
    relatedLinks: [
      { label: "Engine Bay Fuses", href: "hood.html#fuses" },
      { label: "Cabin Fuse Boxes", href: "cabin.html#fuses" },
      { label: "Diagnostic Checks", href: "diagnostics.html" }
    ]
  },
  {
    id: "hood-fuse-box-b",
    title: "Under-Hood Fuse Box B",
    category: "Electrical",
    badge: "Fuse B",
    placement: "Brake-fluid-side under-hood fuse box cover",
    url: landingUrl("hood-fuse-box-b"),
    sectionUrl: "hood.html?nfc=hood-fuse-box-b#hood-fuse-box-b",
    description: "Opens a focused landing page for the smaller under-hood Fuse Box B diagram and table.",
    quickUse: "Use this when you are already standing at the brake-fluid-side fuse box and need the exact box B layout.",
    primaryActionLabel: "Open Fuse Box B Diagram",
    details: [
      "Best physical tag spot: on the box B cover or on the nearby plastic trim where it will not get heat-soaked.",
      "Good for quick checks when a circuit is not listed in the main under-hood box.",
      "Keep the tag away from sealing lips and areas that get wiped with solvents."
    ],
    relatedLinks: [
      { label: "All Hood Electrical", href: "hood.html#fuses" },
      { label: "Cabin Fuse Boxes", href: "cabin.html#fuses" },
      { label: "NFC Tag Console", href: "nfc.html" }
    ]
  },
  {
    id: "cabin-fuse-box-a",
    title: "Interior Fuse Box Type A",
    category: "Electrical",
    badge: "Cabin A",
    placement: "Driver-left lower dash fuse panel",
    url: landingUrl("cabin-fuse-box-a"),
    sectionUrl: "cabin.html?nfc=cabin-fuse-box-a#cabin-fuse-box-a",
    description: "Opens a focused landing page for the main driver-left interior fuse diagram and table.",
    quickUse: "Use this for interior electronics, accessories, dash behavior, outlet checks, and driver-area electrical diagnosis.",
    primaryActionLabel: "Open Cabin Fuse Box A",
    details: [
      "Best physical tag spot: near the driver-left lower dash fuse access panel.",
      "This is the most useful interior electrical tag because it catches common cabin circuits.",
      "Use a small label next to the tag so it can be found in low light."
    ],
    relatedLinks: [
      { label: "Cabin Fuse Overview", href: "cabin.html#fuses" },
      { label: "Under-Hood Fuses", href: "hood.html#fuses" },
      { label: "Quick Sheet", href: "quick-sheet.html" }
    ]
  },
  {
    id: "cabin-fuse-box-b",
    title: "Interior Fuse Box Type B",
    category: "Electrical",
    badge: "Cabin B",
    placement: "Driver-left supplemental interior fuse panel",
    url: landingUrl("cabin-fuse-box-b"),
    sectionUrl: "cabin.html?nfc=cabin-fuse-box-b#cabin-fuse-box-b",
    description: "Opens a focused landing page for the supplemental driver-left interior fuse diagram.",
    quickUse: "Use this when the main cabin panel does not list the circuit you are checking.",
    primaryActionLabel: "Open Cabin Fuse Box B",
    details: [
      "Best physical tag spot: close to the supplemental cabin fuse panel, not on a moving trim edge.",
      "Keep this tag separate from the Type A tag so you do not open the wrong diagram while working.",
      "Useful for follow-up checks after the main cabin fuse panel."
    ],
    relatedLinks: [
      { label: "Cabin Fuse Overview", href: "cabin.html#fuses" },
      { label: "Diagnostic Checks", href: "diagnostics.html" },
      { label: "NFC Tag Console", href: "nfc.html" }
    ]
  },
  {
    id: "engine-explorer",
    title: "J35Y6 Engine Explorer",
    category: "Engine",
    badge: "Engine",
    placement: "Engine cover or front bay reference tag",
    url: landingUrl("engine-explorer"),
    sectionUrl: "engine.html?nfc=engine-model#engine-model",
    description: "Opens a focused landing page for the 3D J35Y6 engine model, labels, and part references.",
    quickUse: "Use this when you want to identify a component location before touching anything in the engine bay.",
    primaryActionLabel: "Open Engine Model",
    details: [
      "Best physical tag spot: on a cool plastic cover or a nearby service reference label, not on hot metal.",
      "The engine page includes label filters and part information so the phone view stays readable.",
      "Use this before removing covers so you can confirm where a component is supposed to be."
    ],
    relatedLinks: [
      { label: "Engine Part Reference", href: "engine.html#engine-part-reference" },
      { label: "Maintenance", href: "maintenance.html" },
      { label: "Photo Atlas", href: "photo-atlas.html" }
    ]
  },
  {
    id: "timing-service",
    title: "Timing Belt Service Record",
    category: "Maintenance",
    badge: "Timing",
    placement: "Timing cover area service tag",
    url: landingUrl("timing-service"),
    sectionUrl: "maintenance.html?nfc=major-service-log#major-service-log",
    description: "Opens the recorded AISIN TKH-002 timing belt service at 165,980 miles.",
    quickUse: "Use this to show the timing belt, water pump, sprocket, tensioner, pulleys, and cover seals were serviced.",
    primaryActionLabel: "Open Timing Service Record",
    details: [
      "Best physical tag spot: near the timing cover reference area, away from heat and moving belts.",
      "The service record notes the date, mileage, RockAuto source, and AISIN kit information.",
      "Useful when planning future timing-belt interval tracking or proving recent major service."
    ],
    relatedLinks: [
      { label: "Maintenance Dashboard", href: "maintenance.html" },
      { label: "Quick Update", href: "maintenance.html#maintenance-updater" },
      { label: "Engine Explorer", href: "engine.html#engine-model" }
    ]
  },
  {
    id: "battery-service",
    title: "Battery And Jump Point",
    category: "Electrical",
    badge: "Battery",
    placement: "Battery cover or jump-start reference point",
    url: landingUrl("battery-service"),
    sectionUrl: "hood.html?nfc=battery-service#battery-service",
    description: "Opens a focused landing page for battery group, CCA, and front-bay jump-start notes.",
    quickUse: "Use this when checking a no-start condition, replacing the battery, or helping someone jump-start the truck.",
    primaryActionLabel: "Open Battery Notes",
    details: [
      "Best physical tag spot: on the battery cover or nearby plastic trim, not directly on terminals.",
      "Keep this page available even for non-mechanics so jump-start notes are easy to find.",
      "After battery replacement, update the garage record with install date, brand, and CCA."
    ],
    relatedLinks: [
      { label: "Diagnostic Quick Checks", href: "diagnostics.html#quick-checks" },
      { label: "Hood Reference", href: "hood.html" },
      { label: "Garage Dashboard", href: "garage.html#dashboard" }
    ]
  },
  {
    id: "oil-service",
    title: "Oil Service",
    category: "Maintenance",
    badge: "Oil",
    placement: "Oil filler cap or oil-filter service tag",
    url: landingUrl("oil-service"),
    sectionUrl: "maintenance.html?nfc=oil-service#oil-service",
    description: "Opens a focused landing page for oil capacity, oil type, drain bolt, washer, and oil filter reference.",
    quickUse: "Use this during oil changes so the right washer, bolt size, capacity, and record entry are one tap away.",
    primaryActionLabel: "Open Oil Service",
    details: [
      "Best physical tag spot: oil-fill area, radiator support label area, or another easy-to-scan service spot.",
      "After the oil change, use Quick Update and enter mileage only; the site derives the date.",
      "The drain hardware section keeps the washer and drain bolt reference inside the site."
    ],
    relatedLinks: [
      { label: "Quick Maintenance Update", href: "maintenance.html#maintenance-updater" },
      { label: "Drain Hardware", href: "maintenance.html#drain-hardware" },
      { label: "Garage Notes", href: "garage.html#notes" }
    ]
  },
  {
    id: "diagnostics",
    title: "Diagnostic Quick Checks",
    category: "Diagnostics",
    badge: "Diag",
    placement: "Driver door jamb or glove-box quick reference",
    url: landingUrl("diagnostics"),
    sectionUrl: "diagnostics.html?nfc=quick-checks#quick-checks",
    description: "Opens a focused landing page for symptom-based checks for no-crank, outlets, tailgate, and trailer lights.",
    quickUse: "Use this when a warning light, no-start issue, or electrical symptom shows up away from home.",
    primaryActionLabel: "Open Diagnostic Checks",
    details: [
      "Best physical tag spot: glove box, driver door jamb, or inside a small service notebook.",
      "Good emergency tag because it points to checks instead of only specifications.",
      "Pair this with an OBD2 scanner note once the diagnostic code helper is added."
    ],
    relatedLinks: [
      { label: "Emergency Card", href: "quick-sheet.html#emergency-card" },
      { label: "Fuse Boxes", href: "hood.html#fuses" },
      { label: "Garage Dashboard", href: "garage.html#dashboard" }
    ]
  },
  {
    id: "trailer-pinout",
    title: "Trailer Connector And Hitch",
    category: "Towing",
    badge: "Tow",
    placement: "Near the rear hitch connector",
    url: landingUrl("trailer-pinout"),
    sectionUrl: "rear-hitch.html?nfc=pinout#pinout",
    description: "Opens a focused landing page for trailer connector, wiring, and towing checks.",
    quickUse: "Use this when trailer lights, hitch wiring, or towing setup needs a quick reference at the rear of the truck.",
    primaryActionLabel: "Open Trailer Pinout",
    details: [
      "Best physical tag spot: near the rear connector but protected from road spray.",
      "Use a weather-resistant tag or place the tag inside the tailgate/bed area with a label pointing to the connector.",
      "The landing page keeps the pinout and related checks close together."
    ],
    relatedLinks: [
      { label: "Rear Hitch Page", href: "rear-hitch.html" },
      { label: "Diagnostics", href: "diagnostics.html" },
      { label: "Emergency Card", href: "quick-sheet.html#emergency-card" }
    ]
  },
  {
    id: "cargo-bed",
    title: "Bed And In-Bed Trunk",
    category: "Cargo",
    badge: "Cargo",
    placement: "Inside the in-bed trunk or bed wall",
    url: landingUrl("cargo-bed"),
    sectionUrl: "cargo.html?nfc=bed-diagram#bed-diagram",
    description: "Opens a focused landing page for cargo dimensions and bed/trunk reference diagrams.",
    quickUse: "Use this when loading, measuring cargo, checking bed dimensions, or referencing the in-bed trunk.",
    primaryActionLabel: "Open Cargo Reference",
    details: [
      "Best physical tag spot: inside the in-bed trunk or on a protected bed-wall location.",
      "Good for quick measurements when buying lumber, bins, tools, or travel gear.",
      "Keep the tag protected from pressure-washer spray and abrasion."
    ],
    relatedLinks: [
      { label: "Cargo Page", href: "cargo.html" },
      { label: "Vehicle Map", href: "index.html#viewer" },
      { label: "Photo Atlas", href: "photo-atlas.html" }
    ]
  },
  {
    id: "vehicle-map",
    title: "Live Vehicle Map",
    category: "Navigation",
    badge: "Map",
    placement: "General dashboard or owner-reference tag",
    url: landingUrl("vehicle-map"),
    sectionUrl: "index.html?nfc=viewer#viewer",
    description: "Opens a focused landing page that leads back to the main live vehicle map.",
    quickUse: "Use this as the general dashboard tag when you want to start from the truck model and choose a system.",
    primaryActionLabel: "Open Vehicle Map",
    details: [
      "Best physical tag spot: dashboard reference card, garage wall, or owner-document pouch.",
      "This is the broadest tag and works as a front door into the entire site.",
      "Use it when you are not sure which exact truck area you need yet."
    ],
    relatedLinks: [
      { label: "3D Model Launchpad", href: "index.html#model-launchpad" },
      { label: "Maintenance", href: "maintenance.html" },
      { label: "NFC Tag Console", href: "nfc.html" }
    ]
  }
];
