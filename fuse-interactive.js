import { STORAGE, initGarageCloudSync, loadJson, saveJson } from "./garage-data.js";

const diagramEls = [...document.querySelectorAll("[data-fuse-diagram]")];
const FUSE_COUNTER_PACK_KEY = "ridgeline-fuse-counter-pack";
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

function copyText(text) {
  if (!text) {
    return Promise.resolve(false);
  }

  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }

  try {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.append(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    return Promise.resolve(copied);
  } catch (error) {
    return Promise.resolve(false);
  }
}

function prependGarageGeneralNote(noteText) {
  const notes = loadJson(STORAGE.notes, {});
  const existing = `${notes.general_notes || ""}`.trim();
  saveJson(STORAGE.notes, {
    ...notes,
    general_notes: existing ? `${noteText}\n\n${existing}` : noteText
  });
}

function currentPageTitle() {
  return document.title.replace(/\s*\|\s*Ridgeline Console\s*$/i, "").trim() || "Ridgeline fuse page";
}

function setFusePullStatus(root, message) {
  const statusEl = root.querySelector("[data-fuse-pull-status]");
  if (statusEl) {
    statusEl.textContent = message;
  }
}

function fusePullSelectedLine(root) {
  const selected = root._selectedFuse;
  if (!selected) {
    return "Selected fuse: not selected yet";
  }

  return `Selected fuse: ${selected.panelLabel} ${selected.position} / ${selected.rating} / ${selected.circuit}`;
}

function buildFusePullChecklist(root) {
  const pageLabel = root.dataset.fusePullPage || currentPageTitle();
  const context = root.querySelector("[data-fuse-pull-context]")?.value.trim() || "Not entered";
  const checkedSteps = [...root.querySelectorAll("[data-fuse-pull-step]:checked")].map((input) => input.value);
  const stepLines = checkedSteps.length
    ? checkedSteps.map((step) => `- ${step}`)
    : ["- No checklist steps marked yet"];
  return [
    `${pageLabel} fuse pull checklist`,
    `Symptom / cover label: ${context}`,
    fusePullSelectedLine(root),
    "Steps:",
    ...stepLines,
    "Verify the truck cover label and owner's manual before replacing anything.",
    `${location.origin}${location.pathname}#${root.id || "fuses"}`
  ].join("\n");
}

function renderFusePullChecklist(root) {
  const previewEl = root.querySelector("[data-fuse-pull-preview]");
  if (!previewEl) {
    return;
  }

  const context = root.querySelector("[data-fuse-pull-context]")?.value.trim() || "Add symptom or cover-label wording.";
  const checkedCount = root.querySelectorAll("[data-fuse-pull-step]:checked").length;
  previewEl.innerHTML = `
    <span>${escapeHtml(root.dataset.fusePullPage || "Fuse")} checklist</span>
    <strong>${escapeHtml(context)}</strong>
    <small>${escapeHtml(fusePullSelectedLine(root))}</small>
    <small>${checkedCount}/4 checklist steps marked. Verify against the truck cover label before replacing anything.</small>
  `;
}

function initFusePullChecklists() {
  const roots = [...document.querySelectorAll("[data-fuse-pull-checklist]")];
  if (!roots.length) {
    return;
  }

  roots.forEach((root) => {
    root._selectedFuse = null;
    root.querySelector("[data-fuse-pull-context]")?.addEventListener("input", () => renderFusePullChecklist(root));
    root.querySelectorAll("[data-fuse-pull-step]").forEach((input) => {
      input.addEventListener("change", () => renderFusePullChecklist(root));
    });

    root.querySelector("[data-copy-fuse-pull]")?.addEventListener("click", async () => {
      const copied = await copyText(buildFusePullChecklist(root));
      setFusePullStatus(root, copied ? "Fuse pull checklist copied." : "Copy is unavailable in this browser.");
    });

    root.querySelector("[data-share-fuse-pull]")?.addEventListener("click", async () => {
      const text = buildFusePullChecklist(root);
      try {
        if (navigator.share) {
          await navigator.share({ title: "Ridgeline fuse pull checklist", text });
          setFusePullStatus(root, "Fuse pull checklist shared.");
          return;
        }
        const copied = await copyText(text);
        setFusePullStatus(root, copied ? "Share unavailable; checklist copied instead." : "Share is unavailable in this browser.");
      } catch (error) {
        setFusePullStatus(root, "Share canceled or unavailable.");
      }
    });

    root.querySelector("[data-save-fuse-pull]")?.addEventListener("click", () => {
      const timestamp = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
      try {
        prependGarageGeneralNote(`[${timestamp} - ${root.dataset.fusePullPage || "Fuse"} Pull Checklist]\n${buildFusePullChecklist(root)}`);
        setFusePullStatus(root, "Fuse pull checklist saved to Garage Notes.");
      } catch (error) {
        setFusePullStatus(root, "Could not save the checklist in this browser session.");
      }
    });

    renderFusePullChecklist(root);
  });

  window.addEventListener("ridgeline:fuse-selected", (event) => {
    roots.forEach((root) => {
      root._selectedFuse = event.detail || null;
      renderFusePullChecklist(root);
      if (event.detail) {
        setFusePullStatus(root, `${event.detail.panelLabel} ${event.detail.position} attached to the checklist.`);
      }
    });
  });
}

function formatSavedFuse(entry) {
  const panel = `${entry.panel || "panel"}`.toUpperCase().replace("-", " ");
  return `${panel} ${entry.position || "?"} / ${entry.rating || "?"} / ${entry.circuit || "Unknown circuit"}`;
}

function savedFuseReviewText(root, saved = loadJson(STORAGE.favorites, [])) {
  const pageLabel = root.dataset.savedFusePage || currentPageTitle();
  const lines = saved.slice(-6).reverse().map((entry, index) => {
    const locationLabel = entry.location ? ` / ${entry.location}` : "";
    const url = entry.url || `${location.pathname.split("/").pop()}#fuses`;
    return `${index + 1}. ${formatSavedFuse(entry)}${locationLabel}\n   ${url}`;
  });

  return [
    `${pageLabel} saved fuse review`,
    ...(lines.length ? lines : ["No saved fuses yet."]),
    "Verify against the truck cover label and owner's manual before replacing anything.",
    `${location.origin}${location.pathname}#${root.id || "fuses"}`
  ].join("\n");
}

function fuseCounterPackKey(root) {
  return root.closest("[data-saved-fuse-review]")?.dataset.savedFusePage || currentPageTitle();
}

function loadFuseCounterPack(root) {
  const allPacks = loadJson(FUSE_COUNTER_PACK_KEY, {});
  return allPacks[fuseCounterPackKey(root)] || {};
}

function saveFuseCounterPack(root) {
  const allPacks = loadJson(FUSE_COUNTER_PACK_KEY, {});
  allPacks[fuseCounterPackKey(root)] = {
    target: root.querySelector("[data-fuse-counter-target]")?.value || "Parts counter",
    callback: root.querySelector("[data-fuse-counter-callback]")?.value.trim() || "",
    symptom: root.querySelector("[data-fuse-counter-symptom]")?.value.trim() || "",
    ask: root.querySelector("[data-fuse-counter-ask]")?.value.trim() || ""
  };
  localStorage.setItem(FUSE_COUNTER_PACK_KEY, JSON.stringify(allPacks));
}

function fuseCounterSavedLines(saved = loadJson(STORAGE.favorites, [])) {
  return saved.slice(-6).reverse().map((entry, index) => {
    const locationLabel = entry.location ? ` / ${entry.location}` : "";
    const url = entry.url || "hood.html#fuses";
    return `${index + 1}. ${formatSavedFuse(entry)}${locationLabel}\n   ${url}`;
  });
}

function buildFuseCounterPack(root, saved = loadJson(STORAGE.favorites, [])) {
  const pageLabel = fuseCounterPackKey(root);
  const target = root.querySelector("[data-fuse-counter-target]")?.value || "Parts counter";
  const callback = root.querySelector("[data-fuse-counter-callback]")?.value.trim() || "Not entered";
  const symptom = root.querySelector("[data-fuse-counter-symptom]")?.value.trim() || "Not entered";
  const ask = root.querySelector("[data-fuse-counter-ask]")?.value.trim() || "Confirm next fuse or part to inspect.";
  const savedLines = fuseCounterSavedLines(saved);

  return [
    `${pageLabel} fuse counter pack`,
    `For: ${target}`,
    `Callback / vehicle note: ${callback}`,
    `Symptom / result: ${symptom}`,
    `Question: ${ask}`,
    "Saved fuses:",
    ...(savedLines.length ? savedLines : ["No saved fuses yet. Save a fuse from the diagram first."]),
    "Verify against the truck cover label and owner's manual before replacing anything.",
    `${location.origin}${location.pathname}#${root.closest("[data-saved-fuse-review]")?.id || "fuses"}`
  ].join("\n");
}

function renderFuseCounterPack(root) {
  const saved = loadJson(STORAGE.favorites, []);
  const preview = root.querySelector("[data-fuse-counter-preview]");
  const buttons = root.querySelectorAll("[data-copy-fuse-counter-pack], [data-share-fuse-counter-pack], [data-save-fuse-counter-pack]");
  const count = saved.length;
  buttons.forEach((button) => {
    button.disabled = count === 0;
  });
  if (!preview) {
    return;
  }

  const target = root.querySelector("[data-fuse-counter-target]")?.value || "Parts counter";
  const symptom = root.querySelector("[data-fuse-counter-symptom]")?.value.trim() || "Add symptom or result before sending.";
  const ask = root.querySelector("[data-fuse-counter-ask]")?.value.trim() || "Confirm next fuse or part to inspect.";
  preview.innerHTML = `
    <span>${escapeHtml(target)} pack</span>
    <strong>${escapeHtml(symptom)}</strong>
    <small>${escapeHtml(count ? `${Math.min(count, 6)} saved fuse${count === 1 ? "" : "s"} attached.` : "Save at least one fuse from a diagram first.")}</small>
    <small>${escapeHtml(ask)}</small>
  `;
}

function setFuseCounterStatus(root, message) {
  const review = root.closest("[data-saved-fuse-review]");
  setSavedFuseStatus(review || root, message);
}

function initFuseCounterPacks() {
  const roots = [...document.querySelectorAll("[data-fuse-counter-pack]")];
  if (!roots.length) {
    return;
  }

  roots.forEach((root) => {
    const saved = loadFuseCounterPack(root);
    const target = root.querySelector("[data-fuse-counter-target]");
    const callback = root.querySelector("[data-fuse-counter-callback]");
    const symptom = root.querySelector("[data-fuse-counter-symptom]");
    const ask = root.querySelector("[data-fuse-counter-ask]");
    const fields = [target, callback, symptom, ask].filter(Boolean);

    if (saved.target && target) target.value = saved.target;
    if (saved.callback && callback) callback.value = saved.callback;
    if (saved.symptom && symptom) symptom.value = saved.symptom;
    if (saved.ask && ask) ask.value = saved.ask;

    fields.forEach((field) => {
      field.addEventListener("input", () => {
        saveFuseCounterPack(root);
        renderFuseCounterPack(root);
      });
      field.addEventListener("change", () => {
        saveFuseCounterPack(root);
        renderFuseCounterPack(root);
      });
    });

    root.querySelector("[data-copy-fuse-counter-pack]")?.addEventListener("click", async () => {
      const copied = await copyText(buildFuseCounterPack(root));
      setFuseCounterStatus(root, copied ? "Fuse counter pack copied." : "Copy is unavailable in this browser.");
    });

    root.querySelector("[data-share-fuse-counter-pack]")?.addEventListener("click", async () => {
      const text = buildFuseCounterPack(root);
      try {
        if (navigator.share) {
          await navigator.share({ title: "Ridgeline fuse counter pack", text });
          setFuseCounterStatus(root, "Fuse counter pack shared.");
          return;
        }
        const copied = await copyText(text);
        setFuseCounterStatus(root, copied ? "Share unavailable; fuse counter pack copied instead." : "Share is unavailable in this browser.");
      } catch (error) {
        setFuseCounterStatus(root, "Share canceled or unavailable.");
      }
    });

    root.querySelector("[data-save-fuse-counter-pack]")?.addEventListener("click", () => {
      const timestamp = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
      try {
        prependGarageGeneralNote(`[${timestamp} - Fuse Counter Pack]\n${buildFuseCounterPack(root)}`);
        setFuseCounterStatus(root, "Fuse counter pack saved to Garage Notes.");
      } catch (error) {
        setFuseCounterStatus(root, "Could not save the counter pack in this browser session.");
      }
    });

    renderFuseCounterPack(root);
  });

  window.addEventListener("ridgeline:fuse-favorites-updated", () => {
    roots.forEach((root) => renderFuseCounterPack(root));
  });
}

const SENSOR_SCAN_STORAGE_KEY = "ridgeline-sensor-scan-latest";
const FUSE_CAMERA_ASSIST_STORAGE_KEY = "ridgeline-fuse-camera-assist-latest";

const fuseCameraTargetConfig = {
  "hood-a": {
    label: "Fuse Box A target",
    hint: "Passenger-side damper-house box. Capture cover label and nearby rows.",
    left: "15%",
    top: "20%",
    width: "68%",
    height: "56%",
    route: "hood.html#hood-fuse-box-a"
  },
  "hood-b": {
    label: "Fuse Box B target",
    hint: "Brake-fluid side box. Keep the full lid and connector side visible.",
    left: "18%",
    top: "22%",
    width: "62%",
    height: "52%",
    route: "hood.html#hood-fuse-box-b"
  },
  "relay-bank": {
    label: "Relay bank target",
    hint: "Move closer and keep relay markings sharp before capture.",
    left: "24%",
    top: "26%",
    width: "52%",
    height: "44%",
    route: "hood.html#fuses"
  },
  "cover-label": {
    label: "Cover label target",
    hint: "Fill the frame with the label text so OCR can recover fuse naming.",
    left: "10%",
    top: "12%",
    width: "80%",
    height: "64%",
    route: "hood.html#hood-fuse-glossary"
  }
};

let latestFuseSelection = null;
window.addEventListener("ridgeline:fuse-selected", (event) => {
  latestFuseSelection = event.detail || null;
});

function nowStamp() {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

async function requestRearCamera(videoEl) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("camera-unavailable");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 }
    }
  });

  videoEl.srcObject = stream;
  await videoEl.play();
  return stream;
}

function stopCameraStream(root, key) {
  const stream = root[key];
  if (!stream) {
    return;
  }

  stream.getTracks().forEach((track) => track.stop());
  root[key] = null;
}

function captureFrameToCanvas(videoEl, canvasEl) {
  if (!videoEl?.videoWidth || !videoEl?.videoHeight || !canvasEl) {
    return null;
  }

  canvasEl.width = videoEl.videoWidth;
  canvasEl.height = videoEl.videoHeight;
  const ctx = canvasEl.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }

  ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
  return canvasEl.toDataURL("image/jpeg", 0.92);
}

async function detectTextFromCanvas(canvasEl) {
  if (!canvasEl || typeof window.TextDetector !== "function") {
    return "";
  }

  try {
    const detector = new window.TextDetector();
    const blocks = await detector.detect(canvasEl);
    return blocks
      .map((block) => `${block.rawValue || ""}`.trim())
      .filter(Boolean)
      .join("\n");
  } catch (error) {
    return "";
  }
}

function cleanScanText(raw) {
  return `${raw || ""}`.replace(/[\r\t]+/g, " ").replace(/\s+/g, " ").trim();
}

function detectVin(raw) {
  const matches = `${raw || ""}`.toUpperCase().match(/[A-HJ-NPR-Z0-9]{17}/g) || [];
  return [...new Set(matches)];
}

function detectTireSize(raw) {
  const match = `${raw || ""}`.toUpperCase().match(/(\d{3})\s*\/?\s*(\d{2})\s*R\s*(\d{2})/);
  if (!match) {
    return "";
  }
  return `${match[1]}/${match[2]}R${match[3]}`;
}

const tireSpeedRatings = {
  Q: "99 mph",
  R: "106 mph",
  S: "112 mph",
  T: "118 mph",
  U: "124 mph",
  H: "130 mph",
  V: "149 mph",
  W: "168 mph",
  Y: "186 mph"
};

const tireLoadIndexApprox = {
  95: "1521 lb",
  96: "1565 lb",
  97: "1609 lb",
  98: "1653 lb",
  99: "1709 lb",
  100: "1764 lb",
  101: "1819 lb",
  102: "1874 lb",
  103: "1929 lb",
  104: "1984 lb",
  105: "2039 lb",
  106: "2094 lb",
  107: "2149 lb",
  108: "2205 lb",
  109: "2271 lb",
  110: "2337 lb",
  111: "2403 lb",
  112: "2469 lb",
  113: "2535 lb",
  114: "2601 lb",
  115: "2679 lb",
  116: "2756 lb",
  117: "2833 lb",
  118: "2910 lb",
  119: "2998 lb",
  120: "3086 lb"
};

function detectTireLoadSpeed(raw) {
  const normalized = `${raw || ""}`.toUpperCase();
  const match = normalized.match(/\b(\d{2,3})\s*([A-Z])\b/);
  if (!match) {
    return null;
  }

  const loadIndex = Number(match[1]);
  const speedSymbol = match[2];
  const speedApprox = tireSpeedRatings[speedSymbol] || "Unknown";
  const loadApprox = tireLoadIndexApprox[loadIndex] || "Unknown";
  return {
    label: `${loadIndex}${speedSymbol}`,
    loadIndex,
    speedSymbol,
    speedApprox,
    loadApprox
  };
}

function detectBatterySpecs(raw) {
  const normalized = `${raw || ""}`.toUpperCase();
  const cca = normalized.match(/(\d{3,4})\s*CCA/);
  const voltage = normalized.match(/(\d{1,2}(?:\.\d)?)\s*V\b/);
  const group = normalized.match(/(?:GROUP|GRP)\s*([0-9A-Z]+)/);
  const coldCrank = cca ? `${cca[1]} CCA` : "Not detected";
  const volts = voltage ? `${voltage[1]} V` : "Not detected";
  const size = group ? `Group ${group[1]}` : "Not detected";
  return { coldCrank, volts, size };
}

function parseSensorScan(profile, rawText) {
  const cleaned = cleanScanText(rawText);
  const lines = [];

  if (!cleaned) {
    return {
      title: "No scan text found",
      lines: ["Capture a clearer frame or paste Live Text output to parse."],
      cleaned
    };
  }

  if (profile === "vin") {
    const vins = detectVin(cleaned);
    lines.push(`VIN matches: ${vins.length ? vins.join(", ") : "None detected"}`);
    lines.push("Recommended: compare VIN against door label and title before parts lookup.");
    return { title: "VIN scan", lines, cleaned };
  }

  if (profile === "tire") {
    const tireSize = detectTireSize(cleaned);
    const loadSpeed = detectTireLoadSpeed(cleaned);
    const serviceType = cleaned.toUpperCase().match(/\b(XL|REINFORCED|SL|LT)\b/);
    lines.push(`Tire size: ${tireSize || "Not detected"}`);
    lines.push(`Load/speed index: ${loadSpeed ? loadSpeed.label : "Not detected"}`);
    lines.push(
      `Decoded load/speed: ${loadSpeed ? `${loadSpeed.loadApprox} max load (index ${loadSpeed.loadIndex}), ${loadSpeed.speedApprox} speed class (${loadSpeed.speedSymbol})` : "Not detected"}`
    );
    lines.push(`Service type marker: ${serviceType ? serviceType[1] : "Not detected"}`);
    lines.push("Recommended: confirm all four sidewalls and cold PSI sticker before ordering.");
    return { title: "Tire scan", lines, cleaned };
  }

  const battery = detectBatterySpecs(cleaned);
  lines.push(`Battery CCA: ${battery.coldCrank}`);
  lines.push(`Battery voltage label: ${battery.volts}`);
  lines.push(`Battery group size: ${battery.size}`);
  lines.push("Recommended: verify polarity and tray fitment before purchasing replacement battery.");
  return { title: "Battery scan", lines, cleaned };
}

function buildSensorScanReport(profile, parsed) {
  const profileLabel = profile === "vin" ? "VIN plate" : profile === "tire" ? "Tire sidewall" : "Battery label";
  return [
    `iPhone camera scan report (${profileLabel})`,
    parsed.title,
    ...parsed.lines,
    `Raw text: ${parsed.cleaned || "No raw text"}`,
    "Verify the physical plate/label and owner documentation before acting.",
    `${location.origin}${location.pathname}#hood-sensor-scan`
  ].join("\n");
}

function setStatus(el, message) {
  if (el) {
    el.textContent = message;
  }
}

function initCameraOcrLabs() {
  const roots = [...document.querySelectorAll("[data-camera-ocr-lab]")];
  if (!roots.length) {
    return;
  }

  roots.forEach((root) => {
    const profileEl = root.querySelector("[data-scan-profile]");
    const videoEl = root.querySelector("[data-scan-video]");
    const previewEl = root.querySelector("[data-scan-preview]");
    const canvasEl = root.querySelector("[data-scan-canvas]");
    const rawTextEl = root.querySelector("[data-scan-raw-text]");
    const resultEl = root.querySelector("[data-scan-result]");
    const statusEl = root.querySelector("[data-scan-status]");
    let lastReport = "";

    const savedState = loadJson(SENSOR_SCAN_STORAGE_KEY, {});
    if (savedState.rawText && rawTextEl) {
      rawTextEl.value = savedState.rawText;
    }
    if (savedState.profile && profileEl && ["vin", "tire", "battery"].includes(savedState.profile)) {
      profileEl.value = savedState.profile;
    }

    root.querySelector("[data-scan-start-camera]")?.addEventListener("click", async () => {
      try {
        stopCameraStream(root, "_scanStream");
        root._scanStream = await requestRearCamera(videoEl);
        previewEl.hidden = true;
        setStatus(statusEl, "Camera live. Align label and tap Capture.");
      } catch (error) {
        setStatus(statusEl, "Camera access failed. Check permissions and try again.");
      }
    });

    root.querySelector("[data-scan-stop-camera]")?.addEventListener("click", () => {
      stopCameraStream(root, "_scanStream");
      setStatus(statusEl, "Camera stopped.");
    });

    root.querySelector("[data-scan-capture]")?.addEventListener("click", () => {
      const dataUrl = captureFrameToCanvas(videoEl, canvasEl);
      if (!dataUrl) {
        setStatus(statusEl, "Capture failed. Start camera and retry.");
        return;
      }

      previewEl.src = dataUrl;
      previewEl.hidden = false;
      setStatus(statusEl, "Frame captured. Run OCR or paste Live Text output.");
    });

    root.querySelector("[data-scan-run-ocr]")?.addEventListener("click", async () => {
      if (!canvasEl?.width) {
        const dataUrl = captureFrameToCanvas(videoEl, canvasEl);
        if (dataUrl) {
          previewEl.src = dataUrl;
          previewEl.hidden = false;
        }
      }

      const text = await detectTextFromCanvas(canvasEl);
      if (!text) {
        setStatus(statusEl, "OCR text not available in this browser. Use iPhone Live Text and paste into Raw text.");
        return;
      }

      rawTextEl.value = text;
      setStatus(statusEl, "OCR text captured. Tap Parse Result.");
    });

    root.querySelector("[data-scan-parse]")?.addEventListener("click", () => {
      const profile = profileEl?.value || "vin";
      const parsed = parseSensorScan(profile, rawTextEl?.value || "");
      lastReport = buildSensorScanReport(profile, parsed);
      resultEl.textContent = lastReport;
      localStorage.setItem(
        SENSOR_SCAN_STORAGE_KEY,
        JSON.stringify({ profile, rawText: rawTextEl?.value || "", report: lastReport, timestamp: nowStamp() })
      );
      setStatus(statusEl, "Parsed scan ready. Copy, share, or save.");
    });

    root.querySelector("[data-scan-copy]")?.addEventListener("click", async () => {
      if (!lastReport) {
        root.querySelector("[data-scan-parse]")?.click();
      }
      const copied = await copyText(lastReport || resultEl.textContent || "");
      setStatus(statusEl, copied ? "Scan report copied." : "Copy failed in this browser.");
    });

    root.querySelector("[data-scan-share]")?.addEventListener("click", async () => {
      if (!lastReport) {
        root.querySelector("[data-scan-parse]")?.click();
      }

      const text = lastReport || resultEl.textContent || "";
      try {
        if (navigator.share) {
          await navigator.share({ title: "Ridgeline camera scan", text });
          setStatus(statusEl, "Scan report shared.");
          return;
        }

        const copied = await copyText(text);
        setStatus(statusEl, copied ? "Share unavailable; copied instead." : "Share unavailable in this browser.");
      } catch (error) {
        setStatus(statusEl, "Share canceled or unavailable.");
      }
    });

    root.querySelector("[data-scan-save]")?.addEventListener("click", () => {
      if (!lastReport) {
        root.querySelector("[data-scan-parse]")?.click();
      }

      try {
        prependGarageGeneralNote(`[${nowStamp()} - Camera Scan]\n${lastReport || resultEl.textContent || ""}`);
        setStatus(statusEl, "Scan report saved to Garage Notes.");
      } catch (error) {
        setStatus(statusEl, "Could not save scan report in this browser session.");
      }
    });

    if (savedState.report) {
      resultEl.textContent = savedState.report;
      lastReport = savedState.report;
    }
  });
}

function detectFuseKeywords(rawText) {
  const normalized = `${rawText || ""}`.toUpperCase();
  const keywordSet = new Set();
  const candidateKeywords = [
    ...Object.keys(acronymDefinitions),
    ...phraseDefinitions.map(([key]) => key),
    "TRAILER",
    "SMALL",
    "STOP",
    "AUDIO",
    "ABS",
    "VSA",
    "ACC"
  ];

  candidateKeywords.forEach((keyword) => {
    if (keywordSet.size >= 8) {
      return;
    }
    if (normalized.includes(keyword.toUpperCase())) {
      keywordSet.add(keyword);
    }
  });

  return [...keywordSet];
}

function fuseConfidenceBand(score) {
  if (score >= 80) {
    return "high";
  }
  if (score >= 58) {
    return "medium";
  }
  return "low";
}

function computeFuseAssistConfidence({ targetKey, clueText, ocrText, keywords, selectedFuse }) {
  const reasons = [];
  let score = 18;

  const clueLength = `${clueText || ""}`.trim().length;
  if (clueLength >= 20) {
    score += 22;
    reasons.push("detailed observed clue");
  } else if (clueLength >= 8) {
    score += 14;
    reasons.push("basic observed clue");
  }

  if (selectedFuse) {
    score += 20;
    reasons.push("fuse map selection linked");
  }

  const normalizedOcr = cleanScanText(ocrText);
  if (normalizedOcr.length >= 20) {
    score += 20;
    reasons.push("OCR text captured");
  } else if (normalizedOcr.length > 0) {
    score += 10;
    reasons.push("partial OCR text");
  }

  if (keywords.length) {
    const keywordBoost = Math.min(20, keywords.length * 4);
    score += keywordBoost;
    reasons.push(`${keywords.length} keyword match${keywords.length === 1 ? "" : "es"}`);
  }

  if (targetKey === "cover-label" && normalizedOcr.length >= 20) {
    score += 8;
    reasons.push("cover label target + OCR");
  }

  score = Math.max(12, Math.min(96, score));
  return {
    score,
    band: fuseConfidenceBand(score),
    reasons: reasons.length ? reasons : ["limited scan context"]
  };
}

function parseConfidenceFromReport(reportText = "") {
  const match = `${reportText}`.match(/Confidence score:\s*(\d{1,3})\/100\s*\((low|medium|high)\)/i);
  if (!match) {
    return null;
  }

  return {
    score: Math.max(0, Math.min(100, Number(match[1]))),
    band: `${match[2]}`.toLowerCase()
  };
}

function setFuseConfidenceBadge(badgeEl, confidence = null) {
  if (!badgeEl) {
    return;
  }

  badgeEl.classList.remove("is-high", "is-medium", "is-low", "is-pending");

  if (!confidence || !Number.isFinite(confidence.score)) {
    badgeEl.classList.add("is-pending");
    badgeEl.textContent = "Confidence: waiting for analysis";
    return;
  }

  const band = ["low", "medium", "high"].includes(confidence.band) ? confidence.band : fuseConfidenceBand(confidence.score);
  badgeEl.classList.add(`is-${band}`);
  badgeEl.textContent = `Confidence: ${confidence.score}/100 (${band})`;
}

function applyFuseCameraTarget(root, key) {
  const target = fuseCameraTargetConfig[key] || fuseCameraTargetConfig["hood-a"];
  root.dataset.fuseCameraTarget = key;
  root.style.setProperty("--fuse-target-left", target.left);
  root.style.setProperty("--fuse-target-top", target.top);
  root.style.setProperty("--fuse-target-width", target.width);
  root.style.setProperty("--fuse-target-height", target.height);
  const labelEl = root.querySelector("[data-fuse-target-label]");
  if (labelEl) {
    labelEl.textContent = target.label;
  }

  root.querySelectorAll("[data-fuse-camera-target]").forEach((button) => {
    const active = button.dataset.fuseCameraTarget === key;
    button.classList.toggle("utility-link-strong", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function buildFuseCameraReport(root, ocrText = "") {
  const targetKey = root.dataset.fuseCameraTarget || "hood-a";
  const target = fuseCameraTargetConfig[targetKey] || fuseCameraTargetConfig["hood-a"];
  const clueText = root.querySelector("[data-fuse-camera-clue]")?.value.trim() || "Not entered";
  const keywords = detectFuseKeywords(`${ocrText}\n${clueText}`);
  const confidence = computeFuseAssistConfidence({
    targetKey,
    clueText,
    ocrText,
    keywords,
    selectedFuse: latestFuseSelection
  });
  const selectedFuseLine = latestFuseSelection
    ? `Selected fuse from map: ${latestFuseSelection.panelLabel} ${latestFuseSelection.position} / ${latestFuseSelection.rating} / ${latestFuseSelection.circuit}`
    : "Selected fuse from map: none currently selected";

  const routeHref = new URL(target.route, location.href).href;

  const text = [
    `iPhone fuse camera assistant (${target.label})`,
    `Target hint: ${target.hint}`,
    selectedFuseLine,
    `Observed clue: ${clueText}`,
    `Detected keywords: ${keywords.length ? keywords.join(", ") : "None detected"}`,
    `Confidence score: ${confidence.score}/100 (${confidence.band})`,
    `Confidence drivers: ${confidence.reasons.join(", ")}`,
    ocrText ? `OCR text: ${cleanScanText(ocrText)}` : "OCR text: not available",
    "Open route:",
    routeHref,
    "Verify against the truck cover label and owner references before replacing anything."
  ].join("\n");

  return {
    text,
    confidence
  };
}

function initFuseCameraAssistants() {
  const roots = [...document.querySelectorAll("[data-fuse-camera-assistant]")];
  if (!roots.length) {
    return;
  }

  roots.forEach((root) => {
    const videoEl = root.querySelector("[data-fuse-camera-video]");
    const previewEl = root.querySelector("[data-fuse-camera-preview]");
    const canvasEl = root.querySelector("[data-fuse-camera-canvas]");
    const resultEl = root.querySelector("[data-fuse-camera-result]");
    const confidenceBadgeEl = root.querySelector("[data-fuse-confidence-badge]");
    const statusEl = root.querySelector("[data-fuse-camera-status]");
    const clueEl = root.querySelector("[data-fuse-camera-clue]");
    let lastReport = "";
    let lastOcrText = "";

    const savedState = loadJson(FUSE_CAMERA_ASSIST_STORAGE_KEY, {});
    const defaultTarget = savedState.target && fuseCameraTargetConfig[savedState.target] ? savedState.target : "hood-a";
    applyFuseCameraTarget(root, defaultTarget);
    if (savedState.clue && clueEl) {
      clueEl.value = savedState.clue;
    }
    if (savedState.report) {
      resultEl.textContent = savedState.report;
      lastReport = savedState.report;
      setFuseConfidenceBadge(confidenceBadgeEl, parseConfidenceFromReport(savedState.report));
    } else {
      setFuseConfidenceBadge(confidenceBadgeEl, null);
    }

    root.querySelectorAll("[data-fuse-camera-target]").forEach((button) => {
      button.addEventListener("click", () => {
        applyFuseCameraTarget(root, button.dataset.fuseCameraTarget || "hood-a");
        setStatus(statusEl, `${(fuseCameraTargetConfig[button.dataset.fuseCameraTarget] || fuseCameraTargetConfig["hood-a"]).hint}`);
      });
    });

    root.querySelector("[data-fuse-camera-start]")?.addEventListener("click", async () => {
      try {
        stopCameraStream(root, "_fuseCameraStream");
        root._fuseCameraStream = await requestRearCamera(videoEl);
        previewEl.hidden = true;
        setStatus(statusEl, "Camera live. Align the overlay target and capture.");
      } catch (error) {
        setStatus(statusEl, "Camera access failed. Check permissions and retry.");
      }
    });

    root.querySelector("[data-fuse-camera-stop]")?.addEventListener("click", () => {
      stopCameraStream(root, "_fuseCameraStream");
      setStatus(statusEl, "Camera stopped.");
    });

    root.querySelector("[data-fuse-camera-capture]")?.addEventListener("click", () => {
      const dataUrl = captureFrameToCanvas(videoEl, canvasEl);
      if (!dataUrl) {
        setStatus(statusEl, "Capture failed. Start camera and retry.");
        return;
      }

      previewEl.src = dataUrl;
      previewEl.hidden = false;
      setStatus(statusEl, "Frame captured. Run Analyze for a handoff summary.");
    });

    root.querySelector("[data-fuse-camera-analyze]")?.addEventListener("click", async () => {
      if (!canvasEl?.width) {
        const dataUrl = captureFrameToCanvas(videoEl, canvasEl);
        if (dataUrl) {
          previewEl.src = dataUrl;
          previewEl.hidden = false;
        }
      }

      lastOcrText = await detectTextFromCanvas(canvasEl);
      const report = buildFuseCameraReport(root, lastOcrText);
      lastReport = report.text;
      resultEl.textContent = report.text;
      setFuseConfidenceBadge(confidenceBadgeEl, report.confidence);
      localStorage.setItem(
        FUSE_CAMERA_ASSIST_STORAGE_KEY,
        JSON.stringify({
          target: root.dataset.fuseCameraTarget || "hood-a",
          clue: clueEl?.value.trim() || "",
          report: lastReport,
          timestamp: nowStamp()
        })
      );

      if (!lastOcrText) {
        setStatus(statusEl, "Analysis ready. OCR text was limited; rely on observed clue + fuse map selection.");
        return;
      }
      setStatus(statusEl, "Analysis ready with OCR keywords. Copy, share, or save.");
    });

    root.querySelector("[data-fuse-camera-copy]")?.addEventListener("click", async () => {
      if (!lastReport) {
        root.querySelector("[data-fuse-camera-analyze]")?.click();
      }
      const copied = await copyText(lastReport || resultEl.textContent || "");
      setStatus(statusEl, copied ? "Fuse assistant handoff copied." : "Copy failed in this browser.");
    });

    root.querySelector("[data-fuse-camera-share]")?.addEventListener("click", async () => {
      if (!lastReport) {
        root.querySelector("[data-fuse-camera-analyze]")?.click();
      }

      const text = lastReport || resultEl.textContent || "";
      try {
        if (navigator.share) {
          await navigator.share({ title: "Ridgeline fuse camera handoff", text });
          setStatus(statusEl, "Fuse assistant handoff shared.");
          return;
        }
        const copied = await copyText(text);
        setStatus(statusEl, copied ? "Share unavailable; handoff copied instead." : "Share unavailable in this browser.");
      } catch (error) {
        setStatus(statusEl, "Share canceled or unavailable.");
      }
    });

    root.querySelector("[data-fuse-camera-save]")?.addEventListener("click", () => {
      if (!lastReport) {
        root.querySelector("[data-fuse-camera-analyze]")?.click();
      }

      try {
        prependGarageGeneralNote(`[${nowStamp()} - Fuse Camera Assistant]\n${lastReport || resultEl.textContent || ""}`);
        setStatus(statusEl, "Fuse assistant handoff saved to Garage Notes.");
      } catch (error) {
        setStatus(statusEl, "Could not save handoff in this browser session.");
      }
    });
  });
}

function setSavedFuseStatus(root, message) {
  const statusEl = root.querySelector("[data-saved-fuse-status]");
  if (statusEl) {
    statusEl.textContent = message;
  }
}

function renderSavedFuseReview(root) {
  const listEl = root.querySelector("[data-saved-fuse-list]");
  const copyButton = root.querySelector("[data-copy-saved-fuses]");
  const saveButton = root.querySelector("[data-save-saved-fuses]");
  if (!listEl) {
    return;
  }

  const saved = loadJson(STORAGE.favorites, []).slice(-6).reverse();
  if (copyButton) {
    copyButton.disabled = !saved.length;
  }
  if (saveButton) {
    saveButton.disabled = !saved.length;
  }

  if (!saved.length) {
    listEl.innerHTML = `
      <article class="saved-fuse-empty">
        <strong>No saved fuses yet</strong>
        <span>Open a Hood or Cabin fuse diagram, tap a fuse, then tap Save Fuse.</span>
      </article>
    `;
    return;
  }

  listEl.innerHTML = saved.map((entry, index) => {
    const url = entry.url || "hood.html#fuses";
    return `
      <article class="saved-fuse-item">
        <span>${escapeHtml(`${entry.panel || "panel"}`.toUpperCase().replace("-", " "))}</span>
        <strong>${escapeHtml(entry.position || "?")} - ${escapeHtml(entry.circuit || "Unknown circuit")}</strong>
        <small>${escapeHtml(entry.rating || "?")} / ${escapeHtml(entry.location || "Location not saved")}</small>
        <div class="inspector-actions">
          <button class="utility-link" type="button" data-copy-saved-fuse="${index}">Copy</button>
          <a class="utility-link" href="${escapeHtml(url)}">Open</a>
        </div>
      </article>
    `;
  }).join("");

  listEl.querySelectorAll("[data-copy-saved-fuse]").forEach((button) => {
    button.addEventListener("click", async () => {
      const entry = saved[Number(button.dataset.copySavedFuse)];
      const text = [
        "Ridgeline saved fuse",
        formatSavedFuse(entry),
        entry.location ? `Location: ${entry.location}` : "",
        "Verify against the truck cover label and owner's manual before replacing anything.",
        `${location.origin}/${entry.url || "hood.html#fuses"}`
      ].filter(Boolean).join("\n");
      const copied = await copyText(text);
      setSavedFuseStatus(root, copied ? "Saved fuse copied." : "Copy is unavailable in this browser.");
    });
  });
}

function initSavedFuseReviews() {
  const roots = [...document.querySelectorAll("[data-saved-fuse-review]")];
  if (!roots.length) {
    return;
  }

  roots.forEach((root) => {
    root.querySelector("[data-copy-saved-fuses]")?.addEventListener("click", async () => {
      const saved = loadJson(STORAGE.favorites, []);
      const copied = await copyText(savedFuseReviewText(root, saved));
      setSavedFuseStatus(root, copied ? "Saved fuse list copied." : "Copy is unavailable in this browser.");
    });

    root.querySelector("[data-save-saved-fuses]")?.addEventListener("click", () => {
      const saved = loadJson(STORAGE.favorites, []);
      if (!saved.length) {
        setSavedFuseStatus(root, "Save a fuse first, then store the review.");
        return;
      }

      const timestamp = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
      try {
        prependGarageGeneralNote(`[${timestamp} - Saved Fuse Review]\n${savedFuseReviewText(root, saved)}`);
        setSavedFuseStatus(root, "Saved fuse review added to Garage Notes.");
      } catch (error) {
        setSavedFuseStatus(root, "Could not save the review in this browser session.");
      }
    });

    renderSavedFuseReview(root);
  });

  window.addEventListener("ridgeline:fuse-favorites-updated", () => {
    roots.forEach((root) => renderSavedFuseReview(root));
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
  const actionsEl = saveButton?.closest(".inspector-actions");
  const acronymPanel = inspector.querySelector("[data-acronym-panel]");
  const acronymList = inspector.querySelector("[data-acronym-list]");
  const fieldEls = {
    position: inspector.querySelector('[data-fuse-field="position"]'),
    location: inspector.querySelector('[data-fuse-field="location"]'),
    type: inspector.querySelector('[data-fuse-field="type"]'),
    rating: inspector.querySelector('[data-fuse-field="rating"]')
  };
  let activeEntry = null;
  const copyButton = document.createElement("button");
  const shareButton = document.createElement("button");
  const handoffStatus = document.createElement("p");

  function setHandoffStatus(message) {
    handoffStatus.textContent = message;
  }

  function selectedFuseSummary() {
    if (!activeEntry) {
      return "";
    }

    const page = document.title.replace(/\s*\|\s*Ridgeline Console\s*$/i, "").trim() || "Ridgeline fuse page";
    const url = `${location.origin}${location.pathname}#fuses`;
    return [
      `${page} selected fuse`,
      `Panel: ${key.toUpperCase().replace("-", " ")}`,
      `Position: ${activeEntry.position}`,
      `Location: ${activeEntry.location}`,
      `Type: ${activeEntry.type}`,
      `Rating: ${activeEntry.rating}`,
      `Circuit: ${activeEntry.circuit}`,
      `Verify against the truck cover label before replacing anything.`,
      url
    ].join("\n");
  }

  async function copySelectedFuse(label = "Copied fuse handoff. Verify against the truck cover label before replacing anything.") {
    const summary = selectedFuseSummary();
    if (!summary) {
      return false;
    }

    const copied = await copyText(summary);
    setHandoffStatus(copied ? label : "Copy failed. Verify against the truck cover label before replacing anything.");
    return copied;
  }

  if (actionsEl) {
    copyButton.type = "button";
    copyButton.className = "ghost-button";
    copyButton.dataset.copyFuse = "";
    copyButton.textContent = "Copy Handoff";

    shareButton.type = "button";
    shareButton.className = "ghost-button";
    shareButton.dataset.shareFuse = "";
    shareButton.textContent = "Share";

    handoffStatus.className = "fuse-handoff-status";
    handoffStatus.setAttribute("aria-live", "polite");

    actionsEl.append(copyButton, shareButton);
    actionsEl.after(handoffStatus);
  }

  function renderAcronyms(entry) {
    if (!acronymPanel || !acronymList) {
      return;
    }

    const found = findDefinitions(`${entry.circuit} ${entry.type}`);
    acronymPanel.hidden = !found.size;
    renderDefinitionItems(acronymList, found);
  }

  function setActive(position, shouldScroll = false) {
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
    setHandoffStatus("Copy or share this selected fuse with the symptom note.");
    renderAcronyms(entry);
    window.dispatchEvent(new CustomEvent("ridgeline:fuse-selected", {
      detail: {
        panel: key,
        panelLabel: key.toUpperCase().replace("-", " "),
        position: entry.position,
        location: entry.location,
        type: entry.type,
        rating: entry.rating,
        circuit: entry.circuit
      }
    }));

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

    if (shouldScroll && window.matchMedia("(max-width: 760px)").matches) {
      inspector.scrollIntoView({ block: "nearest", behavior: "smooth" });
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
    window.dispatchEvent(new CustomEvent("ridgeline:fuse-favorites-updated"));
    setTimeout(() => {
      saveButton.textContent = "Save Fuse";
    }, 1200);
  });

  copyButton.addEventListener("click", () => {
    copySelectedFuse();
  });

  shareButton.addEventListener("click", async () => {
    const summary = selectedFuseSummary();
    if (!summary) {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Ridgeline selected fuse",
          text: summary
        });
        setHandoffStatus("Shared selected fuse.");
        return;
      } catch (error) {
        if (error?.name === "AbortError") {
          setHandoffStatus("Share canceled.");
          return;
        }
      }
    }

    copySelectedFuse("Share unavailable. Copied fuse handoff instead.");
  });

  targets.forEach((target) => {
    const handler = () => setActive(target.position, true);
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
  const panelEntries = panelKeys.flatMap((panelKey) => {
    const table = document.querySelector(`[data-fuse-table="${panelKey}"]`);
    if (!table) {
      return [];
    }

    return [...buildTableMap(table).values()].map((entry) => ({ ...entry, panel: panelKey }));
  });
  const text = panelEntries.map((entry) => entry.circuit).join(" ");

  const found = findDefinitions(text);
  glossaryEl.hidden = !found.size;
  renderDefinitionItems(listEl, found);

  const decoderEl = glossaryEl.querySelector("[data-fuse-label-decoder]");
  const inputEl = decoderEl?.querySelector("[data-fuse-label-input]");
  const statusEl = decoderEl?.querySelector("[data-fuse-label-status]");
  const resultsEl = decoderEl?.querySelector("[data-fuse-label-results]");
  const copyButton = decoderEl?.querySelector("[data-fuse-label-copy]");
  let latestSummary = "";

  if (!decoderEl || !inputEl || !statusEl || !resultsEl) {
    return;
  }

  function panelLabel(panel) {
    return panel.toUpperCase().replace("-", " ");
  }

  function buildDecode(query) {
    const normalizedQuery = query.trim().toUpperCase();
    if (!normalizedQuery) {
      return { definitions: [], matches: [] };
    }

    const definitions = [...found.entries()]
      .filter(([key, definition]) => key.includes(normalizedQuery) || definition.toUpperCase().includes(normalizedQuery))
      .map(([key, definition]) => ({ key, definition }));
    const matches = panelEntries
      .filter((entry) => `${entry.position} ${entry.rating} ${entry.type} ${entry.circuit}`.toUpperCase().includes(normalizedQuery))
      .slice(0, 5);

    return { definitions, matches };
  }

  function selectDecodedFuse(entry) {
    const escapedPosition = window.CSS?.escape ? CSS.escape(entry.position) : entry.position.replace(/"/g, '\\"');
    const target = document.querySelector(`[data-fuse-diagram="${entry.panel}"] [data-fuse-position="${escapedPosition}"]`);
    if (target) {
      target.dispatchEvent(new Event("click", { bubbles: true }));
      return;
    }

    entry.row.classList.add("is-active");
    entry.row.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function renderDecode() {
    const query = inputEl.value.trim();
    const decode = buildDecode(query);
    resultsEl.innerHTML = "";
    latestSummary = "";

    if (!query) {
      statusEl.textContent = "Type a label from the cover or tap a chip.";
      return;
    }

    const summaryLines = [
      `${document.title.replace(/\s*\|\s*Ridgeline Console\s*$/i, "").trim()} fuse label decode`,
      `Label: ${query}`
    ];

    if (decode.definitions.length) {
      const defList = document.createElement("div");
      defList.className = "fuse-label-result-group";
      defList.innerHTML = "<strong>Label Meaning</strong>";
      decode.definitions.forEach((item) => {
        const row = document.createElement("p");
        row.innerHTML = `<b>${escapeHtml(item.key)}</b>: ${escapeHtml(item.definition)}`;
        defList.append(row);
        summaryLines.push(`${item.key}: ${item.definition}`);
      });
      resultsEl.append(defList);
    }

    if (decode.matches.length) {
      const matchList = document.createElement("div");
      matchList.className = "fuse-label-result-group";
      matchList.innerHTML = "<strong>Matching Fuse Rows</strong>";
      decode.matches.forEach((entry) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "fuse-label-result";
        item.dataset.fuseLabelResult = `${entry.panel}:${entry.position}`;
        item.innerHTML = `
          <span>${escapeHtml(panelLabel(entry.panel))} ${escapeHtml(entry.position)} · ${escapeHtml(entry.rating)}</span>
          <small>${escapeHtml(entry.circuit)}</small>
        `;
        item.addEventListener("click", () => selectDecodedFuse(entry));
        matchList.append(item);
        summaryLines.push(`${panelLabel(entry.panel)} ${entry.position} (${entry.rating}): ${entry.circuit}`);
      });
      resultsEl.append(matchList);
    }

    if (!decode.definitions.length && !decode.matches.length) {
      statusEl.textContent = "No local glossary or fuse-table match. Check the truck cover label and try another word.";
      resultsEl.innerHTML = `<p class="small-note">No match in the current local tables. This decoder does not add new fuse facts.</p>`;
      latestSummary = summaryLines.concat("No local match. Verify against the truck cover label.").join("\n");
      return;
    }

    statusEl.textContent = `${decode.definitions.length} meaning${decode.definitions.length === 1 ? "" : "s"} and ${decode.matches.length} row${decode.matches.length === 1 ? "" : "s"} found.`;
    summaryLines.push("Verify against the truck cover label before replacing anything.");
    summaryLines.push(`${location.origin}${location.pathname}#${glossaryEl.id || "fuses"}`);
    latestSummary = summaryLines.join("\n");
  }

  inputEl.addEventListener("input", renderDecode);
  decoderEl.querySelectorAll("[data-fuse-label-chip]").forEach((button) => {
    button.addEventListener("click", () => {
      inputEl.value = button.dataset.fuseLabelChip || "";
      renderDecode();
    });
  });
  copyButton?.addEventListener("click", async () => {
    renderDecode();
    const copied = await copyText(latestSummary);
    statusEl.textContent = copied
      ? "Copied label decode. Verify against the truck cover label before replacing anything."
      : "Copy failed. Verify against the truck cover label before replacing anything.";
  });
});
initFusePullChecklists();
initSavedFuseReviews();
initFuseCounterPacks();
initCameraOcrLabs();
initFuseCameraAssistants();
initGarageCloudSync();
