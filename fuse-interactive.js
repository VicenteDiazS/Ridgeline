import { STORAGE, initGarageCloudSync, loadJson, saveJson } from "./garage-data.js";

const diagramEls = [...document.querySelectorAll("[data-fuse-diagram]")];
const acronymDefinitions = {
  ABS: "Anti-lock Brake System",
  VSA: "Vehicle Stability Assist",
  ACG: "Alternator charging circuit",
  SRS: "Supplemental Restraint System",
  EPS: "Electric Power Steering",
  TCU: "Transmission Control Unit",
  TCM: "Transmission Control Module",
  MICU: "Multiplex Integrated Control Unit",
  DBW: "Drive-by-wire throttle control",
  ACM: "Active Control Engine Mount system",
  BMS: "Battery Management System",
  DRL: "Daytime Running Lights",
  ACC: "Accessory power circuit",
  FI: "Fuel injection system",
  IGPS: "Ignition power supply circuit",
  IG1A: "Ignition 1A feedback circuit",
  IG1B: "Ignition 1B feedback circuit",
  IG2: "Second ignition-switched power circuit",
  MAIN: "Main power feed or main protected branch",
  ST: "Starter circuit",
  STRLD: "Starter load signal",
  FSR: "Fail-safe relay or field-service relay shorthand used in some fuse charts",
  FB: "Front fuse box or fuse block shorthand depending on chart source",
  RR: "Rear",
  LT: "Left-side or lighting shorthand depending on the source row",
  RT: "Right-side shorthand",
  LH: "Left-hand side",
  RH: "Right-hand side",
  RLY: "Relay",
  METER: "Gauge cluster / instrument cluster circuit",
  AUDIO: "Audio head unit or amplifier circuit"
};

const phraseDefinitions = [
  ["A/C", "Air conditioning"],
  ["DR P/W", "Driver power window"],
  ["AS P/W", "Passenger-side power window"],
  ["P/W", "Power window"],
  ["S/R", "Sunroof"],
  ["FR", "Front"],
  ["RR", "Rear"],
  ["INTR", "Interior"],
  ["H/L", "Headlight"],
  ["H/L LO", "Low-beam headlight"],
  ["H/L HI", "High-beam headlight"],
  ["P/SEAT", "Power seat"],
  ["REC", "Recline"],
  ["SLI", "Slide"],
  ["MTR", "Motor"],
  ["WIP", "Wiper"],
  ["DEF", "Defogger / defroster"],
  ["MG CLUTCH", "Magnetic clutch for the A/C compressor"],
  ["MISS SOL", "Mission solenoid / transmission-related solenoid wording used on Honda fuse labels"],
  ["TRL", "Trailer"],
  ["E-BRAKE", "Electric brake"],
  ["F/B", "Fuse block / fuse box main feed"],
  ["+B", "Battery-positive feed shorthand used on Honda fuse labels"],
  ["CTR", "Center"],
  ["RLY", "Relay"],
  ["IG COIL", "Ignition coil"],
  ["IG MAIN", "Ignition main feed"],
  ["IG2_MAIN", "Ignition-switched main feed shorthand"],
  ["ST CUT1", "Starter cut circuit label"],
  ["SMART", "Smart entry / keyless access control label"],
  ["OPTION", "Optional equipment branch label"],
  ["SMALL", "Small-light / parking-light circuit label"],
  ["STOP", "Brake-light circuit label"],
  ["BACK UP", "Backup power or reverse-light related label, depending on the row"],
  ["MAIN RELAY", "Main relay control label"],
  ["SUB FAN", "Secondary cooling-fan label"],
  ["FRONT DE-ICER", "Windshield de-icer / wiper-area heater label"],
  ["TRAILER SMALL", "Trailer running-light branch label"],
  ["TRAILER CHARGE", "Trailer battery-charge branch label"],
  ["AUDIO AMP", "Audio amplifier branch label"],
  ["DBW", "Drive-by-wire throttle control"],
  ["FI", "Fuel injection"]
];

const definitionEntries = [
  ...phraseDefinitions.map(([key, definition]) => ({ key, definition, type: "phrase" })),
  ...Object.entries(acronymDefinitions).map(([key, definition]) => ({ key, definition, type: "acronym" }))
];

const fuseLayouts = {
  "hood-a": {
    viewBox: "0 0 1000 560",
    title: "Engine Compartment Fuse Box A",
    subtitle: "Passenger-side damper-house box. Cover orientation redrawn from 2017-2019 Ridgeline diagrams.",
    outer: [8, 8, 984, 522],
    blanks: [
      [20, 18, 82, 120], [122, 18, 82, 120], [224, 18, 82, 120], [326, 18, 82, 120],
      [428, 18, 82, 120], [530, 18, 82, 120], [632, 18, 356, 120],
      [20, 400, 82, 104], [122, 400, 82, 104], [224, 400, 82, 104],
      [530, 400, 82, 104], [632, 400, 82, 104], [734, 400, 82, 104], [830, 310, 80, 120]
    ],
    fuses: [
      ...["1A", "1B", "1C", "1D", "1E", "1F"].map((position, index) => ({
        position, x: 118 + index * 55, y: 152, w: 52, h: 38, kind: "block", group: "1"
      })),
      ...["2A", "2B", "2C", "2D", "2E", "2F", "2G", "2H", "2I", "2J", "2K", "2L"].map((position, index) => ({
        position, x: 610 + index * 31, y: 152, w: 29, h: 38, kind: "block", group: "2"
      })),
      ...["12", "13", "14", "15", "16", "17", "18", "19"].map((position, index) => ({
        position, x: 20 + index * 40, y: 225, w: 28, h: 72
      })),
      ...["4", "5", "6", "7", "8", "9", "10"].map((position, index) => ({
        position, x: 60 + index * 40, y: 315, w: 28, h: 72
      })),
      ...["20", "21", "22", "23", "24", "25", "26", "27", "28", "29"].map((position, index) => ({
        position, x: 610 + index * 39, y: 225, w: 28, h: 72
      })),
      ...["3A", "3B", "3C", "3D"].map((position, index) => ({
        position, x: 535 + index * 58, y: 315, w: 55, h: 38, kind: "block", group: "3"
      })),
      { position: "11", x: 920, y: 315, w: 60, h: 34 }
    ],
    groupLabels: [
      { label: "1", x: 282, y: 146 },
      { label: "2", x: 780, y: 146 },
      { label: "3", x: 651, y: 309 }
    ],
    orientation: ["Front of truck", "Passenger side damper house"]
  },
  "hood-b": {
    viewBox: "0 0 1000 360",
    title: "Engine Compartment Fuse Box B",
    subtitle: "Brake-fluid-reservoir side box. Cover orientation redrawn from 2017-2019 Ridgeline diagrams.",
    outer: [8, 8, 984, 320],
    blanks: [
      [22, 26, 150, 98], [22, 218, 150, 90], [192, 218, 150, 90], [365, 218, 150, 90],
      [538, 218, 150, 90], [898, 36, 78, 100], [898, 150, 78, 78]
    ],
    fuses: [
      ...["1A", "1B", "1C", "1D", "1E", "1F", "1G", "1H"].map((position, index) => ({
        position, x: 192 + index * 62, y: 58, w: 60, h: 42, kind: "block", group: "1"
      })),
      ...["11", "10", "9", "8", "7", "6", "5", "4", "3"].map((position, index) => ({
        position, x: 192 + index * 47, y: 132, w: 34, h: 86
      })),
      { position: "2", x: 616, y: 132, w: 72, h: 86 },
      { position: "17", x: 90, y: 147, w: 80, h: 34 },
      { position: "16", x: 805, y: 44, w: 78, h: 34 },
      { position: "15", x: 805, y: 86, w: 78, h: 34 },
      { position: "14", x: 805, y: 134, w: 78, h: 58 },
      { position: "13", x: 900, y: 38, w: 78, h: 88 },
      { position: "12", x: 900, y: 150, w: 78, h: 78 }
    ],
    groupLabels: [{ label: "1", x: 440, y: 52 }],
    orientation: ["Driver side / brake fluid reservoir", "Front of truck"]
  },
  "cabin-a": {
    viewBox: "0 0 760 620",
    title: "Interior Fuse Box Type A",
    subtitle: "Driver-left under-dash panel. Redrawn to match the cover-style 2017-2019 Ridgeline layout.",
    outer: [8, 8, 744, 584],
    blanks: [[52, 56, 112, 96], [306, 56, 158, 96], [560, 56, 158, 96]],
    fuses: [
      ...["36", "37", "38", "39", "40", "41", "42"].map((position, index) => ({
        position, x: 52 + index * 96, y: 180, w: 88, h: 34, kind: "wide"
      })),
      ...["25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35"].map((position, index) => ({
        position, x: 104 + index * 52, y: 235, w: 34, h: 96
      })),
      ...["14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24"].map((position, index) => ({
        position, x: 104 + index * 52, y: 345, w: 34, h: 78
      })),
      ...["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"].map((position, index) => ({
        position, x: 52 + index * 52, y: 438, w: 34, h: 88
      }))
    ],
    orientation: ["Side-panel label orientation", "Driver footwell"]
  },
  "cabin-b": {
    viewBox: "0 0 760 260",
    title: "Interior Fuse Box Type B",
    subtitle: "Supplemental under-dash strip. Lettered positions A-G from the 2019 fuse listing.",
    outer: [110, 42, 540, 150],
    blanks: [],
    fuses: ["A", "B", "C", "D", "E", "F", "G"].map((position, index) => ({
      position, x: 165 + index * 68, y: 112, w: 54, h: 42, kind: "wide"
    })),
    orientation: ["Supplemental fuse strip", "Under dash"]
  }
};

function normalizePosition(value) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function escapeHtml(value = "") {
  return `${value}`.replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[char];
  });
}

function renderFuseCell(fuse) {
  const labelSize = `${fuse.position}`.length > 2 ? 15 : 18;
  const classes = ["fuse-cell", fuse.kind ? `fuse-cell-${fuse.kind}` : ""].filter(Boolean).join(" ");
  return `
    <g class="${classes}" data-fuse-position="${escapeHtml(fuse.position)}" tabindex="0" role="button" aria-label="Fuse ${escapeHtml(fuse.position)}">
      <rect x="${fuse.x}" y="${fuse.y}" width="${fuse.w}" height="${fuse.h}" rx="4"></rect>
      <text x="${fuse.x + fuse.w / 2}" y="${fuse.y + fuse.h / 2 + labelSize / 3}" text-anchor="middle" font-size="${labelSize}" font-weight="800">${escapeHtml(fuse.position)}</text>
    </g>
  `;
}

function renderFuseDiagram(diagramEl) {
  const layout = fuseLayouts[diagramEl.dataset.fuseDiagram];
  if (!layout) {
    return;
  }

  const [outerX, outerY, outerWidth, outerHeight] = layout.outer;
  const blanks = layout.blanks
    .map(([x, y, width, height]) => `<rect class="fuse-blank" x="${x}" y="${y}" width="${width}" height="${height}" rx="2"></rect>`)
    .join("");
  const groupLabels = (layout.groupLabels || [])
    .map((item) => `<text class="fuse-group-label" x="${item.x}" y="${item.y}" text-anchor="middle">${escapeHtml(item.label)}</text>`)
    .join("");
  const orientation = (layout.orientation || [])
    .map((item, index) => `<text class="fuse-orientation-label" x="${index ? outerX + outerWidth - 18 : outerX + 18}" y="${outerY + outerHeight + 22}" text-anchor="${index ? "end" : "start"}">${escapeHtml(item)}</text>`)
    .join("");

  diagramEl.innerHTML = `
    <svg viewBox="${layout.viewBox}" role="img" aria-label="${escapeHtml(layout.title)} diagram">
      <rect class="fuse-shell" x="${outerX}" y="${outerY}" width="${outerWidth}" height="${outerHeight}" rx="3"></rect>
      ${blanks}
      ${groupLabels}
      ${layout.fuses.map(renderFuseCell).join("")}
      ${orientation}
    </svg>
  `;
}

function buildTableMap(table) {
  const rows = [...table.querySelectorAll("tr")].slice(1);
  const entries = new Map();

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length < 5) {
      return;
    }

    const position = cells[0].textContent.trim();
    entries.set(normalizePosition(position), {
      row,
      position,
      location: cells[1].textContent.trim(),
      type: cells[2].textContent.trim(),
      rating: cells[3].textContent.trim(),
      circuit: cells[4].textContent.trim()
    });
  });

  return entries;
}

function findDefinitions(text) {
  const normalizedText = text.toUpperCase();
  const found = new Map();

  definitionEntries.forEach(({ key, definition, type }) => {
    if (type === "phrase" && normalizedText.includes(key)) {
      found.set(key, definition);
      return;
    }

    if (type === "acronym") {
      const pattern = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (pattern.test(normalizedText)) {
        found.set(key, definition);
      }
    }
  });

  return found;
}

function renderDefinitionItems(container, definitions) {
  container.innerHTML = "";

  definitions.forEach((definition, key) => {
    const item = document.createElement("div");
    item.className = "acronym-item";
    item.innerHTML = `<strong>${key}</strong><span>${definition}</span>`;
    container.appendChild(item);
  });
}

function distanceBetween(a, b) {
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  return Math.hypot(ax - bx, ay - by);
}

function createFuseTargets(svg, entries) {
  const explicitTargets = [...svg.querySelectorAll("[data-fuse-position]")];
  if (explicitTargets.length) {
    const targets = new Map();
    explicitTargets.forEach((targetEl) => {
      const position = normalizePosition(targetEl.dataset.fusePosition || "");
      if (!entries.has(position)) {
        return;
      }

      targetEl.classList.add("fuse-hit");
      targets.set(position, {
        position,
        element: targetEl,
        text: targetEl.querySelector("text"),
        rect: targetEl.querySelector("rect")
      });
    });
    return targets;
  }

  const textCandidates = [...svg.querySelectorAll("text")].filter((textEl) => {
    const label = textEl.textContent.trim();
    return entries.has(normalizePosition(label));
  });

  const rectCandidates = [...svg.querySelectorAll("rect")].filter((rectEl) => {
    const width = Number(rectEl.getAttribute("width") || 0);
    const height = Number(rectEl.getAttribute("height") || 0);
    return width <= 60 && height <= 46;
  });

  const usedRects = new Set();
  const targets = new Map();

  textCandidates.forEach((textEl) => {
    const position = normalizePosition(textEl.textContent.trim());
    const textBox = textEl.getBBox();
    let matchRect = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    rectCandidates.forEach((rectEl) => {
      if (usedRects.has(rectEl)) {
        return;
      }

      const rectBox = rectEl.getBBox();
      const distance = distanceBetween(textBox, rectBox);
      if (distance < bestDistance) {
        bestDistance = distance;
        matchRect = rectEl;
      }
    });

    const target = {
      position,
      text: textEl,
      rect: bestDistance < 42 ? matchRect : null
    };

    textEl.classList.add("fuse-hit");
    if (target.rect) {
      target.rect.classList.add("fuse-hit");
      usedRects.add(target.rect);
    }

    targets.set(position, target);
  });

  return targets;
}

function bindDiagram(diagramEl) {
  const key = diagramEl.dataset.fuseDiagram;
  const table = document.querySelector(`[data-fuse-table="${key}"]`);
  const inspector = document.querySelector(`[data-fuse-inspector="${key}"]`);
  const svg = diagramEl.querySelector("svg");

  if (!table || !inspector || !svg) {
    return;
  }

  const entries = buildTableMap(table);
  const targets = createFuseTargets(svg, entries);
  const titleEl = inspector.querySelector(".fuse-inspector-title");
  const copyEl = inspector.querySelector(".fuse-inspector-copy");
  const circuitEl = inspector.querySelector('[data-fuse-field="circuit"]');
  const saveButton = inspector.querySelector("[data-save-fuse]");
  const acronymPanel = inspector.querySelector("[data-acronym-panel]");
  const acronymList = inspector.querySelector("[data-acronym-list]");
  const fieldEls = {
    position: inspector.querySelector('[data-fuse-field="position"]'),
    location: inspector.querySelector('[data-fuse-field="location"]'),
    type: inspector.querySelector('[data-fuse-field="type"]'),
    rating: inspector.querySelector('[data-fuse-field="rating"]')
  };
  let activeEntry = null;

  function renderAcronyms(entry) {
    if (!acronymPanel || !acronymList) {
      return;
    }

    const found = findDefinitions(`${entry.circuit} ${entry.type}`);
    acronymPanel.hidden = !found.size;
    renderDefinitionItems(acronymList, found);
  }

  function setActive(position) {
    const normalized = normalizePosition(position);
    const entry = entries.get(normalized);
    if (!entry) {
      return;
    }

    inspector.hidden = false;
    titleEl.textContent = `Fuse ${entry.position}`;
    copyEl.textContent = `Selected from the ${key.toUpperCase().replace("-", " ")} panel.`;
    fieldEls.position.textContent = entry.position;
    fieldEls.location.textContent = entry.location;
    fieldEls.type.textContent = entry.type;
    fieldEls.rating.textContent = entry.rating;
    circuitEl.textContent = entry.circuit;
    activeEntry = entry;
    renderAcronyms(entry);

    table.querySelectorAll("tr").forEach((row) => row.classList.remove("is-active"));
    entry.row.classList.add("is-active");

    targets.forEach((target) => {
      target.element?.classList.remove("is-active");
      target.text?.classList.remove("is-active");
      target.rect?.classList.remove("is-active");
    });

    const target = targets.get(normalized);
    if (target) {
      target.element?.classList.add("is-active");
      target.text?.classList.add("is-active");
      target.rect?.classList.add("is-active");
    }
  }

  saveButton?.addEventListener("click", () => {
    if (!activeEntry) {
      return;
    }

    const favorites = loadJson(STORAGE.favorites, []);
    const exists = favorites.some((entry) => entry.position === activeEntry.position && entry.panel === key);
    if (exists) {
      return;
    }

    favorites.push({
      panel: key,
      position: activeEntry.position,
      location: activeEntry.location,
      type: activeEntry.type,
      rating: activeEntry.rating,
      circuit: activeEntry.circuit,
      url: `${location.pathname.split("/").pop()}#fuses`
    });

    saveJson(STORAGE.favorites, favorites.slice(-20));
    saveButton.textContent = "Saved";
    setTimeout(() => {
      saveButton.textContent = "Save Fuse";
    }, 1200);
  });

  targets.forEach((target) => {
    const handler = () => setActive(target.position);
    const interactiveEl = target.element || target.text;
    interactiveEl.addEventListener("click", handler);
    interactiveEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handler();
      }
    });
    interactiveEl.setAttribute("tabindex", "0");
    interactiveEl.setAttribute("role", "button");

    if (!target.element && target.rect) {
      target.rect.addEventListener("click", handler);
    }
  });

  const firstPosition = table.querySelector("tr:nth-child(2) td");
  if (firstPosition) {
    setActive(firstPosition.textContent.trim());
  }
}

diagramEls.forEach(renderFuseDiagram);
diagramEls.forEach(bindDiagram);

document.querySelectorAll("[data-fuse-glossary]").forEach((glossaryEl) => {
  const listEl = glossaryEl.querySelector("[data-fuse-glossary-list]");
  if (!listEl) {
    return;
  }

  const panelKeys = (glossaryEl.dataset.fuseGlossaryPanels || "").split(/\s+/).filter(Boolean);
  const text = panelKeys
    .map((panelKey) => {
      const table = document.querySelector(`[data-fuse-table="${panelKey}"]`);
      if (!table) {
        return "";
      }

      return [...table.querySelectorAll("tr")]
        .slice(1)
        .map((row) => row.querySelector("td:nth-child(5)")?.textContent || "")
        .join(" ");
    })
    .join(" ");

  const found = findDefinitions(text);
  glossaryEl.hidden = !found.size;
  renderDefinitionItems(listEl, found);
});
initGarageCloudSync();
