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
  DBW: "Drive-By-Wire throttle control",
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
  AC: "Air conditioning",
  RLY: "Relay",
  METER: "Gauge cluster / instrument cluster circuit",
  AUDIO: "Audio head unit or amplifier circuit"
};

function normalizePosition(value) {
  return value.replace(/\s+/g, "").toUpperCase();
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

function distanceBetween(a, b) {
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  return Math.hypot(ax - bx, ay - by);
}

function createFuseTargets(svg, entries) {
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

    const text = `${entry.circuit} ${entry.type}`.toUpperCase();
    const found = Object.entries(acronymDefinitions).filter(([key]) => {
      const pattern = new RegExp(`\\b${key}\\b`);
      return pattern.test(text);
    });

    acronymList.innerHTML = "";
    acronymPanel.hidden = !found.length;

    found.forEach(([key, definition]) => {
      const item = document.createElement("div");
      item.className = "acronym-item";
      item.innerHTML = `<strong>${key}</strong><span>${definition}</span>`;
      acronymList.appendChild(item);
    });
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
      target.text.classList.remove("is-active");
      target.rect?.classList.remove("is-active");
    });

    const target = targets.get(normalized);
    if (target) {
      target.text.classList.add("is-active");
      target.rect?.classList.add("is-active");
    }
  }

  saveButton?.addEventListener("click", () => {
    if (!activeEntry) {
      return;
    }

    const favorites = JSON.parse(localStorage.getItem("ridgeline-favorites") || "[]");
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

    localStorage.setItem("ridgeline-favorites", JSON.stringify(favorites.slice(-20)));
    saveButton.textContent = "Saved";
    setTimeout(() => {
      saveButton.textContent = "Save Fuse";
    }, 1200);
  });

  targets.forEach((target) => {
    const handler = () => setActive(target.position);
    target.text.addEventListener("click", handler);
    target.text.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handler();
      }
    });
    target.text.setAttribute("tabindex", "0");
    target.text.setAttribute("role", "button");

    if (target.rect) {
      target.rect.addEventListener("click", handler);
    }
  });

  const firstPosition = table.querySelector("tr:nth-child(2) td");
  if (firstPosition) {
    setActive(firstPosition.textContent.trim());
  }
}

diagramEls.forEach(bindDiagram);
