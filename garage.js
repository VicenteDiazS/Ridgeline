import {
  buildGarageBackupPayload,
  filesToPhotoEntries,
  formPayload,
  getGarageCloudState,
  hydrateForm,
  initGarageCloudSync,
  loadAreaJournal,
  loadJson,
  resolvePhotoSrc,
  restoreGarageBackupPayload,
  setGarageCloudEnabled,
  saveJson,
  STORAGE
} from "./garage-data.js";

const notesForm = document.querySelector("[data-notes-form]");
const trackerForm = document.querySelector("[data-tracker-form]");
const profileForm = document.querySelector("[data-profile-form]");
const profileSummary = document.querySelector("[data-profile-summary]");
const photosInput = document.querySelector("[data-photo-input]");
const photosGrid = document.querySelector("[data-photo-grid]");
const favoritesList = document.querySelector("[data-favorites-list]");
const areaSummary = document.querySelector("[data-area-summary]");
const dashboardGrid = document.querySelector("[data-garage-dashboard]");
const diagnosticActivityList = document.querySelector("[data-diagnostic-activity]");
const maintenanceNotePreview = document.querySelector("[data-maintenance-note-preview]");
const maintenanceNoteCopyButton = document.querySelector("[data-copy-maintenance-note]");
const maintenancePartsCopyButton = document.querySelector("[data-copy-maintenance-parts]");
const maintenanceNeededCopyButton = document.querySelector("[data-copy-maintenance-needed]");
const maintenancePartsPreview = document.querySelector("[data-maintenance-parts-preview]");
const maintenanceNoteStatus = document.querySelector("[data-maintenance-note-status]");
const diagnosticActivityFilter = document.querySelector("[data-diagnostic-activity-filter]");
const diagnosticActivityCopyButton = document.querySelector("[data-copy-diagnostic-activity]");
const diagnosticActivityDownloadButton = document.querySelector("[data-download-diagnostic-activity]");
const garageBackupDownloadButton = document.querySelector("[data-download-garage-backup]");
const garageBackupImportInput = document.querySelector("[data-import-garage-backup]");
const garageBackupImportButton = document.querySelector("[data-choose-garage-backup]");
const garageBackupRestoreButton = document.querySelector("[data-restore-garage-backup]");
const garageBackupPreview = document.querySelector("[data-garage-backup-preview]");
const diagnosticActivityStatus = document.querySelector("[data-diagnostic-activity-status]");
const cloudSyncStatus = document.querySelector("[data-cloud-sync-status]");
const cloudSyncRetryButton = document.querySelector("[data-cloud-sync-retry]");
const quickMileageInput = document.querySelector("[data-quick-mileage]");
const quickServiceSelect = document.querySelector("[data-quick-service]");
const quickLogButton = document.querySelector("[data-quick-log-button]");
const quickLogStatus = document.querySelector("[data-quick-log-status]");
const defaultNotes = {
  timing_service:
    "Timing belt service completed 4/25/2026 at 165,980 miles using the AISIN TKH-002 Timing Belt Replacement Kit from RockAuto.com: timing belt, crankshaft sprocket, timing belt tensioner, timing belt pulleys, timing cover seal, and water pump replaced."
};
const defaultTracker = {
  timing_belt_service: "4/25/2026 / 165,980 miles"
};
const defaultProfile = {
  vin: "5FPYK2F64KB002267",
  vehicle: "2019 Honda Ridgeline",
  trim_drive: "2WD",
  engine: "J35Y6 3.5L V6",
  current_mileage: "165980",
  tire_size_pressure: "245/60R18 / 35 psi",
  wheel_torque: "94 lb-ft",
  parts_notes: "Timing belt service completed 4/25/2026 at 165,980 miles using AISIN TKH-002."
};
let currentDiagnosticActivityFilter = "all";
let currentMaintenanceStagingFilter = "all";
let pendingGarageBackup = null;
const MAINTENANCE_STAGING_STATE_KEY = "ridgeline-maintenance-staging-state";
const GARAGE_BACKUP_LABELS = {
  [STORAGE.notes]: "notes",
  [STORAGE.tracker]: "tracker",
  [STORAGE.maintenanceLog]: "service log",
  [STORAGE.photos]: "photo metadata",
  [STORAGE.favorites]: "favorites",
  [STORAGE.areaJournal]: "area journals",
  [STORAGE.profile]: "truck profile"
};
const GARAGE_BACKUP_SHAPES = {
  [STORAGE.notes]: "object",
  [STORAGE.tracker]: "object",
  [STORAGE.maintenanceLog]: "array",
  [STORAGE.photos]: "array",
  [STORAGE.favorites]: "array",
  [STORAGE.areaJournal]: "object",
  [STORAGE.profile]: "object"
};
const GARAGE_BACKUP_FALLBACKS = {
  [STORAGE.notes]: {},
  [STORAGE.tracker]: {},
  [STORAGE.maintenanceLog]: [],
  [STORAGE.photos]: [],
  [STORAGE.favorites]: [],
  [STORAGE.areaJournal]: {},
  [STORAGE.profile]: {}
};

function hydrateGarageForms() {
  if (notesForm) {
    hydrateForm(notesForm, loadJson(STORAGE.notes, defaultNotes));
  }
  if (trackerForm) {
    hydrateForm(trackerForm, loadJson(STORAGE.tracker, defaultTracker));
  }
  if (profileForm) {
    hydrateForm(profileForm, loadJson(STORAGE.profile, defaultProfile));
    renderProfileSummary();
  }
}

if (notesForm) {
  notesForm.addEventListener("input", () => {
    saveJson(STORAGE.notes, {
      ...loadJson(STORAGE.notes, {}),
      ...formPayload(notesForm)
    });
    renderDashboard();
  });
}

if (trackerForm) {
  trackerForm.addEventListener("input", () => {
    saveJson(STORAGE.tracker, formPayload(trackerForm));
  });
}

if (profileForm) {
  profileForm.addEventListener("input", () => {
    saveJson(STORAGE.profile, formPayload(profileForm));
    renderProfileSummary();
    renderDashboard();
  });
}

function renderProfileSummary() {
  if (!profileSummary) {
    return;
  }

  const profile = profileForm ? formPayload(profileForm) : loadJson(STORAGE.profile, defaultProfile);
  const summaryItems = [
    ["VIN", profile.vin],
    ["Vehicle", profile.vehicle],
    ["Trim / drive", profile.trim_drive],
    ["Engine", profile.engine],
    ["Mileage", profile.current_mileage ? `${Number(profile.current_mileage).toLocaleString("en-US")} mi` : ""],
    ["Tires", profile.tire_size_pressure],
    ["Wheel torque", profile.wheel_torque],
    ["Battery", profile.battery]
  ].filter(([, value]) => value);

  profileSummary.innerHTML = summaryItems
    .map(([label, value]) => `<div class="mini-spec"><span>${label}</span><span>${value}</span></div>`)
    .join("");
}

function serviceLabelFromKey(key) {
  const labels = {
    oil_change: "Oil change",
    tire_rotation: "Tire rotation",
    brake_service: "Brake service",
    trans_service: "Transmission service",
    battery_install: "Battery install",
    filters: "Air filters",
    timing_belt_service: "Timing belt service",
    trailer_wiring: "Trailer wiring check"
  };

  return labels[key] || "Service";
}

function formatMileage(value) {
  const mileage = Number(value);
  if (!Number.isFinite(mileage) || mileage <= 0) {
    return "";
  }

  return `${Math.round(mileage).toLocaleString("en-US")} miles`;
}

function escapeHtml(value = "") {
  return `${value}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function copyText(value = "") {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  return Promise.resolve();
}

function shortText(value = "", maxLength = 150) {
  const text = `${value}`.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isDiagnosticText(value = "") {
  return /\b(warning|check engine|dash|mid|code|dtc|fuse|battery|voltage|start|crank|trailer|light|radio|audio|display|outlet|socket|electrical|alternator|starter|tpms|abs|awd|brake)\b/i.test(
    `${value}`
  );
}

function getWarningLightSummary(notes = {}) {
  const warningFields = [
    "warning_light_date_mileage",
    "warning_light_indicator",
    "warning_light_behavior",
    "warning_light_context",
    "warning_light_mid_message",
    "warning_light_next_action"
  ];
  const filledFields = warningFields.filter((key) => `${notes[key] || ""}`.trim());
  const title = `${notes.warning_light_indicator || ""}`.trim() || "No warning-light incident saved";
  const detail =
    `${notes.warning_light_date_mileage || ""}`.trim() ||
    `${notes.warning_light_behavior || ""}`.trim() ||
    `${notes.warning_light_mid_message || ""}`.trim() ||
    "Use the template to capture the exact light, message, context, and next action.";

  return {
    count: filledFields.length,
    title,
    detail
  };
}

function getDiagnosticActivityItems() {
  const notes = loadJson(STORAGE.notes, {});
  const maintenanceLog = loadJson(STORAGE.maintenanceLog, []);
  const areas = [
    ["Hood", "hood", "hood.html#area-journal"],
    ["Cabin", "cabin", "cabin.html#area-journal"],
    ["Cargo", "cargo", "cargo.html#area-journal"],
    ["Rear Hitch", "rear-hitch", "rear-hitch.html#area-journal"]
  ];
  const items = [];
  const warningLightSummary = getWarningLightSummary(notes);

  if (warningLightSummary.count) {
    items.push({
      type: "warning",
      source: "Warning light note",
      title: warningLightSummary.title,
      detail: warningLightSummary.detail,
      href: "#warning-light-template",
      rank: 0
    });
  }

  Object.entries(notes)
    .filter(([key, value]) => (key.startsWith("quick_capture_") || key.startsWith("nfc_task_")) && isDiagnosticText(value))
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 4)
    .forEach(([key, value], index) => {
      items.push({
        type: "capture",
        source: key.startsWith("nfc_task_") ? "NFC task" : "Quick capture",
        title: shortText(value, 78),
        detail: "Saved from Quick Capture into Garage notes.",
        href: "#notes",
        rank: 10 + index
      });
    });

  maintenanceLog
    .filter((entry) => isDiagnosticText(`${entry.title || ""} ${entry.details || ""} ${entry.note || ""} ${entry.service || ""}`))
    .slice(0, 4)
    .forEach((entry, index) => {
      const label = entry.title || serviceLabelFromKey(entry.service);
      const mileage = entry.mileageText || (entry.mileage ? formatMileage(entry.mileage) : "");
      items.push({
        type: "service",
        source: "Service log",
        title: label || "Maintenance update",
        detail: shortText([entry.date, mileage, entry.note || entry.details].filter(Boolean).join(" / "), 140),
        href: "maintenance.html#maintenance-updater",
        rank: 20 + index
      });
    });

  areas.forEach(([label, key, href], areaIndex) => {
    const journal = loadAreaJournal(key);
    Object.entries(journal.notes || {})
      .filter(([, value]) => isDiagnosticText(value))
      .slice(0, 2)
      .forEach(([noteKey, value], noteIndex) => {
        items.push({
          type: "area",
          source: `${label} journal`,
          title: noteKey.replace(/[_-]+/g, " "),
          detail: shortText(value, 140),
          href,
          rank: 30 + areaIndex * 5 + noteIndex
        });
      });
  });

  return items.sort((a, b) => a.rank - b.rank);
}

function isMaintenanceNoteTitle(value = "") {
  return /\b(maintenance minder|prep|oil change|tire rotation|brake service|transmission service|battery install|air filters|timing belt service|trailer wiring check)\b/i.test(
    `${value}`
  );
}

function maintenanceNotePlannerLink(title = "") {
  return /\bmaintenance minder\b/i.test(`${title}`) ? "maintenance.html#minder-pocket-planner" : "maintenance.html#service-prep";
}

function maintenanceNotePlannerLabel(title = "") {
  return /\bmaintenance minder\b/i.test(`${title}`) ? "Open Minder Planner" : "Open Prep Planner";
}

function normalizeMaintenanceLine(value = "") {
  return `${value}`
    .replace(/^\s*[-*]\s*/, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/^[A-B1-6]:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function maintenanceStagingItems(body = "") {
  const seen = new Set();
  const stagingPattern =
    /\b(oil|filters?|washers?|crush|drain|tires?|wheels?|lug|torque|brakes?|battery|terminal|cleaner|pollen|spark|plugs?|timing|belt|water pump|coolant|transmission|fluid|wipers?|fuse|tester|gauge|gloves|pan|funnel|parts|supplies|tools|label|photo|level check)\b/i;

  return `${body}`
    .split(/\n+/)
    .map(normalizeMaintenanceLine)
    .filter((line) => line && !/:$/.test(line))
    .filter((line) => line && stagingPattern.test(line))
    .filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

function stagingItemKey(title = "", line = "") {
  return `${title}::${line}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function loadMaintenanceStagingState() {
  try {
    const value = JSON.parse(localStorage.getItem(MAINTENANCE_STAGING_STATE_KEY) || "{}");
    return isPlainObject(value) ? value : {};
  } catch {
    return {};
  }
}

function saveMaintenanceStagingState(state = {}) {
  localStorage.setItem(MAINTENANCE_STAGING_STATE_KEY, JSON.stringify(state));
}

function maintenanceStagingStatus(title = "", line = "") {
  return loadMaintenanceStagingState()[stagingItemKey(title, line)] === "staged" ? "staged" : "need";
}

function setMaintenanceStagingStatus(title = "", line = "", status = "need") {
  const state = loadMaintenanceStagingState();
  const key = stagingItemKey(title, line);
  if (!key) {
    return;
  }

  if (status === "staged") {
    state[key] = "staged";
  } else {
    delete state[key];
  }

  saveMaintenanceStagingState(state);
}

function getMaintenanceNoteItems() {
  const notes = loadJson(STORAGE.notes, {});
  const generalNotes = `${notes.general_notes || ""}`.trim();
  if (!generalNotes) {
    return [];
  }

  const blocks = [];
  const pattern = /\[([^\]\n]+?)\]\s*\n?([\s\S]*?)(?=\n\[[^\]\n]+?\]\s*\n?|\s*$)/g;
  let match;
  while ((match = pattern.exec(generalNotes))) {
    const heading = match[1] || "";
    const body = (match[2] || "").trim();
    const title = heading.replace(/^[^-]+-\s*/, "").trim() || heading;
    if (!isMaintenanceNoteTitle(title)) {
      continue;
    }

    blocks.push({
      title,
      meta: heading,
      detail: shortText(body || title, 180),
      copyText: `[${heading}]\n${body || title}`,
      stagingItems: maintenanceStagingItems(body || title),
      href: maintenanceNotePlannerLink(title),
      hrefLabel: maintenanceNotePlannerLabel(title)
    });
  }

  return blocks.slice(0, 4);
}

function setMaintenanceNoteStatus(message = "") {
  if (maintenanceNoteStatus) {
    maintenanceNoteStatus.textContent = message;
  }
}

function maintenanceStagingExportText(index = null) {
  return maintenanceStagingExport({ index }).text;
}

function maintenanceStagingExport({ index = null, status = "all" } = {}) {
  const items = getMaintenanceNoteItems();
  const selectedItems = Number.isInteger(index) ? items.slice(index, index + 1) : items;
  const groups = selectedItems
    .map((item) => ({
      title: item.title,
      lines: (item.stagingItems || []).filter((line) => {
        if (status === "need") {
          return maintenanceStagingStatus(item.title, line) !== "staged";
        }
        if (status === "staged") {
          return maintenanceStagingStatus(item.title, line) === "staged";
        }
        return true;
      })
    }))
    .filter((group) => group.lines.length);

  if (!groups.length) {
    return { text: "", count: 0 };
  }

  const count = groups.reduce((sum, group) => sum + group.lines.length, 0);
  const title =
    status === "need"
      ? "Ridgeline Need-To-Buy Maintenance List"
      : status === "staged"
        ? "Ridgeline Staged Maintenance List"
        : "Ridgeline Maintenance Staging List";

  const text = [
    title,
    status === "need" ? "Remaining items only. Verify part numbers and truck labels before ordering." : "Verify part numbers and truck labels before ordering.",
    "",
    ...groups.flatMap((group) => [
      `${group.title}:`,
      ...group.lines.map((line) => {
        const label = maintenanceStagingStatus(group.title, line) === "staged" ? "Staged" : "Need to buy";
        return `- [${label}] ${line}`;
      }),
      ""
    ])
  ]
    .join("\n")
    .trim();

  return { text, count };
}

function getMaintenanceStagingSummary(items = getMaintenanceNoteItems()) {
  const groups = items
    .map((item) => ({
      title: item.title,
      lines: item.stagingItems || []
    }))
    .filter((group) => group.lines.length);
  const total = groups.reduce((sum, group) => sum + group.lines.length, 0);
  const staged = groups.reduce(
    (sum, group) =>
      sum + group.lines.filter((line) => maintenanceStagingStatus(group.title, line) === "staged").length,
    0
  );
  const need = Math.max(total - staged, 0);

  return { groups: groups.length, total, staged, need };
}

function renderMaintenancePartsPreview(items = getMaintenanceNoteItems()) {
  if (!maintenancePartsPreview) {
    return;
  }

  const groups = items
    .map((item, index) => ({
      index,
      title: item.title,
      lines: item.stagingItems || []
    }))
    .filter((group) => group.lines.length)
    .slice(0, 3);

  if (maintenancePartsCopyButton) {
    maintenancePartsCopyButton.disabled = !groups.length;
  }
  if (maintenanceNeededCopyButton) {
    maintenanceNeededCopyButton.disabled = !groups.length;
  }

  if (!groups.length) {
    maintenancePartsPreview.innerHTML = items.length
      ? `
        <article class="maintenance-parts-card maintenance-parts-empty">
          <strong>No staging items detected yet.</strong>
          <p>Saved notes are visible below. Add checked Service Prep items when you want this panel to build a parts-counter list.</p>
        </article>
      `
      : "";
    return;
  }

  maintenancePartsPreview.innerHTML = `
    <article class="maintenance-parts-card">
      <div class="compact-section-head">
        <div>
          <p class="eyebrow">Parts and supplies staging</p>
          <h5>Pull From Saved Notes Before Ordering</h5>
        </div>
        <a class="utility-link" href="#rockauto-parts">Open Parts Sources</a>
      </div>
      <div class="maintenance-staging-filter" role="group" aria-label="Filter staging items">
        ${["all", "need", "staged"]
          .map((filter) => {
            const active = currentMaintenanceStagingFilter === filter;
            const label = filter === "all" ? "All" : filter === "need" ? "Need" : "Staged";
            return `<button class="staging-filter-button" type="button" data-maintenance-staging-filter="${filter}" aria-pressed="${active ? "true" : "false"}">${label}</button>`;
          })
          .join("")}
      </div>
      <div class="maintenance-parts-groups">
        ${groups
          .map((group) => {
            const stagedCount = group.lines.filter((line) => maintenanceStagingStatus(group.title, line) === "staged").length;
            const visibleLines = group.lines.filter((line) => {
              const status = maintenanceStagingStatus(group.title, line);
              if (currentMaintenanceStagingFilter === "need") {
                return status !== "staged";
              }
              if (currentMaintenanceStagingFilter === "staged") {
                return status === "staged";
              }
              return true;
            });
            const emptyMessage =
              currentMaintenanceStagingFilter === "need"
                ? "No need-to-buy items left in this saved note."
                : "No staged items yet in this saved note.";
            return `
              <section class="maintenance-parts-group">
                <div class="maintenance-parts-group-head">
                  <strong>${escapeHtml(group.title)}</strong>
                  <span>${stagedCount}/${group.lines.length} staged</span>
                </div>
                ${
                  visibleLines.length
                    ? `<ul class="maintenance-staging-checklist">
                        ${visibleLines
                          .map((line) => {
                            const status = maintenanceStagingStatus(group.title, line);
                            const staged = status === "staged";
                            return `
                              <li class="${staged ? "is-staged" : ""}">
                                <span>${escapeHtml(line)}</span>
                                <button
                                  class="staging-toggle"
                                  type="button"
                                  data-maintenance-staging-toggle
                                  data-maintenance-staging-title="${escapeHtml(group.title)}"
                                  data-maintenance-staging-line="${escapeHtml(line)}"
                                  aria-pressed="${staged ? "true" : "false"}"
                                >${staged ? "Staged" : "Need to buy"}</button>
                              </li>
                            `;
                          })
                          .join("")}
                      </ul>`
                    : `<p class="small-note maintenance-staging-empty">${emptyMessage}</p>`
                }
                <button class="utility-link" type="button" data-copy-maintenance-parts-index="${group.index}">Copy This List</button>
              </section>
            `;
          })
          .join("")}
      </div>
      <p class="small-note">This is a handoff from your saved planner notes, not a fitment guarantee. Confirm final part numbers in the truck profile, the real truck labels, or the parts catalog.</p>
    </article>
  `;
}

function filterDiagnosticActivityItems(items = getDiagnosticActivityItems()) {
  if (currentDiagnosticActivityFilter === "all") {
    return items;
  }

  return items.filter((item) => item.type === currentDiagnosticActivityFilter);
}

function diagnosticActivityExportText(items = filterDiagnosticActivityItems()) {
  if (!items.length) {
    return currentDiagnosticActivityFilter === "all" ? "No diagnostic activity saved yet." : "No matching diagnostic activity.";
  }

  return [
    "Ridgeline Diagnostic Activity",
    `Filter: ${diagnosticActivityFilter?.selectedOptions?.[0]?.textContent || "All activity"}`,
    "",
    ...items.map((item, index) => {
      return `${index + 1}. ${item.source}: ${item.title}\n   ${item.detail}\n   ${new URL(item.href, location.href).href}`;
    })
  ].join("\n");
}

function diagnosticActivityExportPayload(items = filterDiagnosticActivityItems()) {
  const filterLabel = diagnosticActivityFilter?.selectedOptions?.[0]?.textContent || "All activity";

  return {
    kind: "ridgeline-diagnostic-activity-export",
    generatedAt: new Date().toISOString(),
    filter: currentDiagnosticActivityFilter,
    filterLabel,
    count: items.length,
    items: items.map((item) => ({
      type: item.type,
      source: item.source,
      title: item.title,
      detail: item.detail,
      href: new URL(item.href, location.href).href
    }))
  };
}

function setDiagnosticActivityStatus(text = "") {
  if (diagnosticActivityStatus) {
    diagnosticActivityStatus.textContent = text;
  }
}

function downloadJsonFile(payload, fileName) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadDiagnosticActivity() {
  if (!diagnosticActivityDownloadButton) {
    return;
  }

  try {
    const payload = diagnosticActivityExportPayload();
    const stamp = new Date().toISOString().slice(0, 10);
    const filterSlug = (currentDiagnosticActivityFilter || "all").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
    downloadJsonFile(payload, `ridgeline-diagnostic-activity-${filterSlug}-${stamp}.json`);
    setDiagnosticActivityStatus(
      payload.count
        ? `Diagnostic activity JSON downloaded (${payload.count} item${payload.count === 1 ? "" : "s"}).`
        : "Diagnostic activity JSON downloaded with no saved items."
    );
  } catch (error) {
    console.warn("Diagnostic activity download failed.", error);
    setDiagnosticActivityStatus("Could not create a diagnostic activity download.");
  }
}

function downloadGarageBackup() {
  if (!garageBackupDownloadButton) {
    return;
  }

  try {
    const payload = buildGarageBackupPayload();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJsonFile(payload, `ridgeline-garage-backup-${stamp}.json`);
    setDiagnosticActivityStatus("Garage backup JSON downloaded.");
  } catch (error) {
    console.warn("Garage backup download failed.", error);
    setDiagnosticActivityStatus("Could not create a Garage backup download.");
  }
}

function garageBackupPayloadFor(bundle) {
  if (bundle?.kind !== "ridgeline-garage-backup") {
    return null;
  }

  return bundle.payload && typeof bundle.payload === "object" ? bundle.payload : null;
}

function isValidGarageBackupSection(key, value) {
  const shape = GARAGE_BACKUP_SHAPES[key];

  if (shape === "array") {
    return Array.isArray(value);
  }

  if (shape === "object") {
    return isPlainObject(value);
  }

  return false;
}

function validateGarageBackupBundle(bundle) {
  const payload = garageBackupPayloadFor(bundle);
  if (!payload) {
    return null;
  }

  const validPayload = {};
  const skippedLabels = [];
  const entries = Object.keys(GARAGE_BACKUP_LABELS).reduce((list, key) => {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) {
      return list;
    }

    if (!isValidGarageBackupSection(key, payload[key])) {
      skippedLabels.push(GARAGE_BACKUP_LABELS[key]);
      return list;
    }

    validPayload[key] = payload[key];
    list.push({
      key,
      label: GARAGE_BACKUP_LABELS[key],
      count: garageBackupValueCount(payload[key])
    });
    return list;
  }, []);

  return {
    generatedAt: bundle.generatedAt || "",
    labels: entries.map((entry) => entry.label),
    entries,
    skippedLabels,
    payload: validPayload
  };
}

function garageBackupSummary(bundle) {
  const validation = validateGarageBackupBundle(bundle);
  return validation?.entries?.length ? validation : null;
}

function sanitizedGarageBackupBundle(bundle, summary) {
  return {
    ...bundle,
    payload: summary?.payload || {}
  };
}

function setGarageRestoreReady(ready) {
  if (garageBackupRestoreButton) {
    garageBackupRestoreButton.disabled = !ready;
  }
}

function garageBackupValueCount(value) {
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  if (value && typeof value === "object") {
    const count = Object.keys(value).filter((key) => value[key] !== undefined && value[key] !== null && `${value[key]}` !== "").length;
    return `${count} field${count === 1 ? "" : "s"}`;
  }

  return value ? "1 field" : "0 fields";
}

function currentGarageBackupCount(key) {
  return garageBackupValueCount(loadJson(key, GARAGE_BACKUP_FALLBACKS[key]));
}

function garageBackupImpact(summary) {
  const replaceLabels = [];
  const mergeLabels = [];
  const hasEntry = (key) => summary?.entries?.some((entry) => entry.key === key);

  [
    [STORAGE.notes, "notes"],
    [STORAGE.tracker, "tracker"],
    [STORAGE.maintenanceLog, "service log"],
    [STORAGE.favorites, "favorites"],
    [STORAGE.profile, "truck profile"]
  ].forEach(([key, label]) => {
    if (hasEntry(key)) {
      replaceLabels.push(label);
    }
  });

  if (hasEntry(STORAGE.areaJournal)) {
    replaceLabels.push("area-journal notes for matching areas");
    mergeLabels.push("area-journal photo metadata");
  }

  if (hasEntry(STORAGE.photos)) {
    mergeLabels.push("photo metadata");
  }

  return { replaceLabels, mergeLabels };
}

function garageBackupImpactMarkup(summary) {
  const { replaceLabels, mergeLabels } = garageBackupImpact(summary);
  const rows = [];

  if (replaceLabels.length) {
    rows.push(`<p><b>Will replace</b> ${escapeHtml(replaceLabels.join(", "))}</p>`);
  }

  if (mergeLabels.length) {
    rows.push(`<p><b>Will merge</b> ${escapeHtml(mergeLabels.join(", "))}</p>`);
  }

  if (summary?.skippedLabels?.length) {
    rows.push(`<p><b>Skipped invalid</b> ${escapeHtml(summary.skippedLabels.join(", "))}</p>`);
  }

  return rows.length ? `<div class="garage-backup-impact" data-garage-backup-impact>${rows.join("")}</div>` : "";
}

function renderGarageBackupPreview(summary) {
  if (!garageBackupPreview) {
    return;
  }

  if (!summary?.entries?.length) {
    garageBackupPreview.hidden = true;
    garageBackupPreview.innerHTML = "";
    return;
  }

  const generated = summary.generatedAt ? new Date(summary.generatedAt).toLocaleString("en-US") : "Date not recorded";
  garageBackupPreview.hidden = false;
  garageBackupPreview.innerHTML = `
    <strong>Backup ready to restore</strong>
    <span>Created ${escapeHtml(generated)}</span>
    <div class="garage-backup-preview-list">
      ${summary.entries
        .map(
          (entry) => `
            <span class="garage-backup-preview-chip">
              <b>${escapeHtml(entry.label)}</b>
              <small><b>Backup</b> ${escapeHtml(entry.count)}</small>
              <small><b>Current</b> ${escapeHtml(currentGarageBackupCount(entry.key))}</small>
            </span>
          `
        )
        .join("")}
    </div>
    ${garageBackupImpactMarkup(summary)}
    <p>Download a fresh Garage backup first if you might need to undo this import.</p>
  `;
}

function clearPendingGarageBackup() {
  pendingGarageBackup = null;
  setGarageRestoreReady(false);
  renderGarageBackupPreview(null);
  if (garageBackupImportInput) {
    garageBackupImportInput.value = "";
  }
}

function readGarageBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error || new Error("Could not read backup file."));
    reader.readAsText(file);
  });
}

garageBackupImportButton?.addEventListener("click", () => {
  garageBackupImportInput?.click();
});

garageBackupImportInput?.addEventListener("change", async () => {
  const file = garageBackupImportInput.files?.[0];
  clearPendingGarageBackup();
  if (!file) {
    return;
  }

  try {
    const bundle = await readGarageBackupFile(file);
    const summary = garageBackupSummary(bundle);
    if (!summary || !summary.labels.length) {
      setDiagnosticActivityStatus("Choose a Ridgeline Garage backup JSON file, not a diagnostic activity handoff.");
      return;
    }

    pendingGarageBackup = sanitizedGarageBackupBundle(bundle, summary);
    setGarageRestoreReady(true);
    renderGarageBackupPreview(summary);
    const generated = summary.generatedAt ? ` from ${new Date(summary.generatedAt).toLocaleString("en-US")}` : "";
    const skipped = summary.skippedLabels.length ? ` Skipped invalid ${summary.skippedLabels.join(", ")}.` : "";
    setDiagnosticActivityStatus(`Backup ready${generated}. Review the preview, then tap Restore Backup to import it.${skipped}`);
  } catch (error) {
    console.warn("Garage backup import preview failed.", error);
    setDiagnosticActivityStatus("Could not read that backup JSON file.");
  }
});

garageBackupRestoreButton?.addEventListener("click", async () => {
  if (!pendingGarageBackup) {
    setDiagnosticActivityStatus("Choose a Garage backup JSON file first.");
    return;
  }

  try {
    const summary = garageBackupSummary(pendingGarageBackup);
    const restored = restoreGarageBackupPayload(pendingGarageBackup, { notify: false });
    if (!restored) {
      setDiagnosticActivityStatus("Could not restore that Garage backup.");
      return;
    }

    hydrateGarageForms();
    await renderPhotos();
    renderFavorites();
    renderAreaSummary();
    renderDashboard();
    setDiagnosticActivityStatus(`Garage backup restored: ${summary?.labels.join(", ") || "Garage data"}.`);
    clearPendingGarageBackup();
  } catch (error) {
    console.warn("Garage backup restore failed.", error);
    setDiagnosticActivityStatus("Could not restore that Garage backup.");
  }
});

function logQuickServiceEntry() {
  if (!trackerForm || !quickMileageInput || !quickServiceSelect || !quickLogStatus) {
    return;
  }

  const key = quickServiceSelect.value;
  const field = trackerForm.querySelector(`[name='${key}']`);
  const mileageText = formatMileage(quickMileageInput.value);
  if (!field) {
    return;
  }

  if (!mileageText) {
    quickLogStatus.textContent = "Enter a valid mileage to log this service.";
    return;
  }

  const dateText = new Date().toLocaleDateString("en-US");
  field.value = `${dateText} / ${mileageText}`;
  saveJson(STORAGE.tracker, formPayload(trackerForm));
  renderDashboard();
  quickLogStatus.textContent = `${serviceLabelFromKey(key)} logged at ${mileageText} on ${dateText}.`;
}

quickLogButton?.addEventListener("click", logQuickServiceEntry);

async function renderPhotos() {
  if (!photosGrid) {
    return;
  }

  const photos = loadJson(STORAGE.photos, []);
  photosGrid.innerHTML = "";

  if (!photos.length) {
    const empty = document.createElement("p");
    empty.className = "small-note";
    empty.textContent = "No saved reference photos yet.";
    photosGrid.appendChild(empty);
    return;
  }

  for (const [index, photo] of photos.entries()) {
    const resolvedSrc = await resolvePhotoSrc(photo);
    const card = document.createElement("figure");
    card.className = "photo-card";
    card.innerHTML = `
      <img src="${resolvedSrc || photo.src || ""}" alt="${photo.label}" />
      <figcaption>
        <strong>${photo.label}</strong>
        <button type="button" data-remove-photo="${index}">Remove</button>
      </figcaption>
    `;
    photosGrid.appendChild(card);
  }

  photosGrid.querySelectorAll("[data-remove-photo]").forEach((button) => {
    button.addEventListener("click", () => {
      const photos = loadJson(STORAGE.photos, []);
      photos.splice(Number(button.dataset.removePhoto), 1);
      saveJson(STORAGE.photos, photos);
      renderPhotos();
    });
  });
}

photosInput?.addEventListener("change", async () => {
  const files = [...photosInput.files].slice(0, 4);
  const current = loadJson(STORAGE.photos, []).slice(0, 8);
  const additions = await filesToPhotoEntries(files, { scope: "garage" });
  current.push(...additions);

  saveJson(STORAGE.photos, current.slice(0, 8));
  renderPhotos();
  photosInput.value = "";
});

function renderFavorites() {
  if (!favoritesList) {
    return;
  }

  const favorites = loadJson(STORAGE.favorites, []);
  favoritesList.innerHTML = "";

  if (!favorites.length) {
    const empty = document.createElement("p");
    empty.className = "small-note";
    empty.textContent = "No saved fuse favorites yet. Save them from a fuse diagram.";
    favoritesList.appendChild(empty);
    return;
  }

  favorites.forEach((favorite, index) => {
    const card = document.createElement("article");
    card.className = "tech-card";
    card.innerHTML = `
      <h3>${favorite.panel ? `${favorite.panel.toUpperCase()} - ` : ""}${favorite.position}</h3>
      <p>${favorite.circuit}</p>
      <div class="mini-specs">
        <div class="mini-spec"><span>Rating</span><span>${favorite.rating}</span></div>
        <div class="mini-spec"><span>Type</span><span>${favorite.type}</span></div>
      </div>
      <div class="inspector-actions">
        <a class="utility-link" href="${favorite.url}">Open Fuse</a>
        <button class="ghost-button" type="button" data-remove-favorite="${index}">Remove</button>
      </div>
    `;
    favoritesList.appendChild(card);
  });

  favoritesList.querySelectorAll("[data-remove-favorite]").forEach((button) => {
    button.addEventListener("click", () => {
      const favorites = loadJson(STORAGE.favorites, []);
      favorites.splice(Number(button.dataset.removeFavorite), 1);
      saveJson(STORAGE.favorites, favorites);
      renderFavorites();
    });
  });
}

function renderAreaSummary() {
  if (!areaSummary) {
    return;
  }

  const areas = [
    { key: "hood", title: "Hood / Engine Bay", url: "hood.html#area-journal" },
    { key: "cabin", title: "Cabin / Electronics", url: "cabin.html#area-journal" },
    { key: "cargo", title: "Bed / In-Bed Trunk", url: "cargo.html#area-journal" },
    { key: "rear-hitch", title: "Rear Hitch / Wiring", url: "rear-hitch.html#area-journal" }
  ];

  areaSummary.innerHTML = "";

  areas.forEach((area) => {
    const journal = loadAreaJournal(area.key);
    const noteCount = Object.values(journal.notes || {}).filter(Boolean).length;
    const photoCount = (journal.photos || []).length;
    const card = document.createElement("article");
    card.className = "tech-card";
    card.innerHTML = `
      <h3>${area.title}</h3>
      <div class="mini-specs">
        <div class="mini-spec"><span>Saved fields</span><span>${noteCount}</span></div>
        <div class="mini-spec"><span>Photos</span><span>${photoCount}</span></div>
      </div>
      <div class="inspector-actions">
        <a class="utility-link" href="${area.url}">Open Area Journal</a>
      </div>
    `;
    areaSummary.appendChild(card);
  });
}

function renderDashboard() {
  if (!dashboardGrid) {
    return;
  }

  const notes = loadJson(STORAGE.notes, {});
  const tracker = loadJson(STORAGE.tracker, {});
  const maintenanceLog = loadJson(STORAGE.maintenanceLog, []);
  const favorites = loadJson(STORAGE.favorites, []);
  const photos = loadJson(STORAGE.photos, []);
  const profile = loadJson(STORAGE.profile, defaultProfile);
  const areas = ["hood", "cabin", "cargo", "rear-hitch"].map((key) => loadAreaJournal(key));
  const maintenanceNoteItems = getMaintenanceNoteItems();
  const maintenanceStagingSummary = getMaintenanceStagingSummary(maintenanceNoteItems);
  const noteFields = Object.values(notes).filter(Boolean).length;
  const trackerFields = Object.values(tracker).filter(Boolean).length;
  const areaPhotos = areas.reduce((sum, area) => sum + (area.photos || []).length, 0);
  const areaNotes = areas.reduce(
    (sum, area) => sum + Object.values(area.notes || {}).filter(Boolean).length,
    0
  );
  const warningLightSummary = getWarningLightSummary(notes);

  const cards = [
    {
      label: "Truck Profile",
      value: profile.vin || "VIN not set",
      note: `${profile.vehicle || "2019 Ridgeline"} / ${profile.trim_drive || "Drive not set"} / ${profile.engine || "Engine not set"}`
    },
    { label: "Saved Notes", value: `${noteFields} fields`, note: "Installed parts and general truck memory" },
    {
      label: "Diagnostic Notes",
      value: warningLightSummary.count ? `${warningLightSummary.count} warning-light fields` : "Ready to capture",
      note: warningLightSummary.count
        ? `${warningLightSummary.title} - ${warningLightSummary.detail}`
        : "Open the warning-light template before codes are cleared or parts are replaced.",
      href: "#warning-light-template",
      actionLabel: "Open Warning Light Note",
      actionClass: "dashboard-diagnostic-card"
    },
    { label: "Service Tracker", value: `${trackerFields} entries`, note: "Mileage and last-service checkpoints" },
    {
      label: "Parts Staging",
      value: maintenanceStagingSummary.total
        ? `${maintenanceStagingSummary.need} need / ${maintenanceStagingSummary.staged} staged`
        : "Ready for planner notes",
      note: maintenanceStagingSummary.total
        ? `${maintenanceStagingSummary.total} saved-note line${maintenanceStagingSummary.total === 1 ? "" : "s"} ready for parts-counter review.`
        : "Save a Service Prep or Minder checklist, then track what still needs to be bought.",
      href: "#maintenance-note-preview",
      actionLabel: "Open Staging",
      actionClass: "dashboard-maintenance-card"
    },
    ["Quick Updates", `${maintenanceLog.length} entries`, "Fast maintenance notes saved from the Maintenance page"],
    ["Fuse Saves", `${favorites.length} favorites`, "Frequently checked circuits saved locally"],
    ["Photo Atlas", `${photos.length + areaPhotos} photos`, "Garage and area-reference images"],
    ["Area Journals", `${areaNotes} notes`, "Hood, cabin, cargo, and hitch journals"]
  ];

  dashboardGrid.innerHTML = cards
    .map((card) => {
      const normalized = Array.isArray(card) ? { label: card[0], value: card[1], note: card[2], href: card[3] } : card;
      return `
        <article class="dashboard-card${
          normalized.href ? ` dashboard-card-action ${normalized.actionClass || ""}` : ""
        }">
          <span>${escapeHtml(normalized.label)}</span>
          <strong>${escapeHtml(normalized.value)}</strong>
          <p>${escapeHtml(normalized.note)}</p>
          ${
            normalized.href
              ? `<a class="utility-link" href="${escapeHtml(normalized.href)}">${escapeHtml(normalized.actionLabel || "Open")}</a>`
              : ""
          }
        </article>
      `;
    })
    .join("");

  renderDiagnosticActivity();
  renderMaintenanceNotePreview(maintenanceNoteItems);
}

function renderDiagnosticActivity() {
  if (!diagnosticActivityList) {
    return;
  }

  const allItems = getDiagnosticActivityItems();
  const filteredItems = filterDiagnosticActivityItems(allItems);
  const items = filteredItems.slice(0, 6);
  diagnosticActivityList.innerHTML = "";
  setDiagnosticActivityStatus("");

  if (!items.length) {
    const isFiltered = currentDiagnosticActivityFilter !== "all" && allItems.length;
    diagnosticActivityList.innerHTML = `
      <article class="diagnostic-activity-empty">
        <strong>${isFiltered ? "No matching diagnostic activity." : "No diagnostic activity saved yet."}</strong>
        <p>${isFiltered ? "Switch the filter back to All activity or save a note in this category." : "Use Warning Light Note or Quick Capture to save symptoms, exact dash messages, fuse checks, and follow-up actions."}</p>
        <div class="inspector-actions">
          <a class="utility-link" href="#warning-light-template">Open Warning Light Note</a>
          <a class="utility-link" href="diagnostics.html#workflow-index">Open Diagnostics</a>
        </div>
      </article>
    `;
    return;
  }

  if (filteredItems.length > items.length) {
    setDiagnosticActivityStatus(`Showing 6 of ${filteredItems.length} matching diagnostic items.`);
  }

  diagnosticActivityList.innerHTML = items
    .map(
      (item) => `
        <article class="diagnostic-activity-item">
          <span>${escapeHtml(item.source)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.detail)}</p>
          <a class="utility-link" href="${item.href}">Open Source</a>
        </article>
      `
    )
    .join("");
}

function renderMaintenanceNotePreview(items = getMaintenanceNoteItems()) {
  if (!maintenanceNotePreview) {
    return;
  }

  renderMaintenancePartsPreview(items);
  setMaintenanceNoteStatus(items.length ? `Showing ${items.length} recent saved planner note${items.length === 1 ? "" : "s"}.` : "");
  if (maintenanceNoteCopyButton) {
    maintenanceNoteCopyButton.disabled = !items.length;
  }
  if (maintenancePartsCopyButton && !items.length) {
    maintenancePartsCopyButton.disabled = true;
  }
  if (maintenanceNeededCopyButton && !items.length) {
    maintenanceNeededCopyButton.disabled = true;
  }
  if (!items.length) {
    maintenanceNotePreview.innerHTML = `
      <article class="maintenance-note-empty">
        <strong>No saved maintenance planner notes yet.</strong>
        <p>Save a Service Prep card or Maintenance Minder checklist from the Maintenance page, then confirm it here before opening the full notes form.</p>
        <div class="inspector-actions">
          <a class="utility-link" href="maintenance.html#service-prep">Open Prep Planner</a>
          <a class="utility-link" href="maintenance.html#minder-pocket-planner">Open Minder Planner</a>
        </div>
      </article>
    `;
    return;
  }

  maintenanceNotePreview.innerHTML = items
    .map(
      (item, index) => `
        <article class="maintenance-note-item">
          <span>${escapeHtml(item.meta)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.detail)}</p>
          <div class="maintenance-note-actions">
            <button class="utility-link" type="button" data-copy-maintenance-note-index="${index}">Copy Note</button>
            ${
              item.stagingItems?.length
                ? `<button class="utility-link" type="button" data-copy-maintenance-parts-index="${index}">Copy Staging</button>`
                : ""
            }
            <a class="utility-link" href="${item.href}">${item.hrefLabel}</a>
            <a class="utility-link" href="#notes">Open Full Note</a>
          </div>
        </article>
      `
    )
    .join("");
}

function copyMaintenanceNote(index = 0) {
  const items = getMaintenanceNoteItems();
  const item = items[index];
  if (!item) {
    setMaintenanceNoteStatus("No saved maintenance planner notes to copy yet.");
    return;
  }

  copyText(item.copyText)
    .then(() => {
      setMaintenanceNoteStatus(`Copied ${item.title}.`);
    })
    .catch(() => {
      setMaintenanceNoteStatus("Could not copy automatically. Open the full note and copy it manually.");
    });
}

function copyMaintenanceStaging(index = null) {
  const { text } = maintenanceStagingExport({ index });
  if (!text) {
    setMaintenanceNoteStatus("No parts or supplies staging list found in saved planner notes yet.");
    return;
  }

  copyText(text)
    .then(() => {
      setMaintenanceNoteStatus(Number.isInteger(index) ? "Copied staging list for this saved note." : "Copied maintenance staging list.");
    })
    .catch(() => {
      setMaintenanceNoteStatus("Could not copy the staging list automatically. Open the saved note and copy it manually.");
    });
}

function copyMaintenanceNeedList() {
  const { text, count } = maintenanceStagingExport({ status: "need" });
  if (!text) {
    setMaintenanceNoteStatus("All saved staging items are already marked staged.");
    return;
  }

  copyText(text)
    .then(() => {
      setMaintenanceNoteStatus(`Copied need-to-buy list with ${count} item${count === 1 ? "" : "s"}.`);
    })
    .catch(() => {
      setMaintenanceNoteStatus("Could not copy the need-to-buy list automatically. Open the staging list and copy it manually.");
    });
}

function toggleMaintenanceStaging(button) {
  const title = button.dataset.maintenanceStagingTitle || "";
  const line = button.dataset.maintenanceStagingLine || "";
  const nextStatus = button.getAttribute("aria-pressed") === "true" ? "need" : "staged";
  setMaintenanceStagingStatus(title, line, nextStatus);
  renderDashboard();
  setMaintenanceNoteStatus(nextStatus === "staged" ? "Marked staging item as already staged." : "Marked staging item as need to buy.");
}

diagnosticActivityFilter?.addEventListener("change", () => {
  currentDiagnosticActivityFilter = diagnosticActivityFilter.value || "all";
  renderDiagnosticActivity();
});

diagnosticActivityCopyButton?.addEventListener("click", () => {
  const text = diagnosticActivityExportText();
  copyText(text)
    .then(() => {
      setDiagnosticActivityStatus("Diagnostic activity summary copied.");
    })
    .catch(() => {
      setDiagnosticActivityStatus("Could not copy automatically. Select the activity text and copy it manually.");
    });
});

diagnosticActivityDownloadButton?.addEventListener("click", downloadDiagnosticActivity);
garageBackupDownloadButton?.addEventListener("click", downloadGarageBackup);
maintenanceNoteCopyButton?.addEventListener("click", () => copyMaintenanceNote(0));
maintenancePartsCopyButton?.addEventListener("click", () => copyMaintenanceStaging());
maintenanceNeededCopyButton?.addEventListener("click", copyMaintenanceNeedList);
maintenanceNotePreview?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-copy-maintenance-note-index]");
  if (!button) {
    return;
  }

  copyMaintenanceNote(Number(button.dataset.copyMaintenanceNoteIndex || 0));
});
maintenancePartsPreview?.addEventListener("click", (event) => {
  const filterButton = event.target.closest("[data-maintenance-staging-filter]");
  if (filterButton) {
    currentMaintenanceStagingFilter = filterButton.dataset.maintenanceStagingFilter || "all";
    renderMaintenancePartsPreview();
    const filterLabel =
      currentMaintenanceStagingFilter === "all"
        ? "all"
        : currentMaintenanceStagingFilter === "need"
          ? "need-to-buy"
          : "staged";
    setMaintenanceNoteStatus(`Showing ${filterLabel} staging items.`);
    return;
  }

  const toggle = event.target.closest("[data-maintenance-staging-toggle]");
  if (toggle) {
    toggleMaintenanceStaging(toggle);
    return;
  }

  const button = event.target.closest("[data-copy-maintenance-parts-index]");
  if (!button) {
    return;
  }

  copyMaintenanceStaging(Number(button.dataset.copyMaintenancePartsIndex || 0));
});
maintenanceNotePreview?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-copy-maintenance-parts-index]");
  if (!button) {
    return;
  }

  copyMaintenanceStaging(Number(button.dataset.copyMaintenancePartsIndex || 0));
});

async function renderGaragePage() {
  hydrateGarageForms();
  await renderPhotos();
  renderFavorites();
  renderAreaSummary();
  renderDashboard();
}

function setCloudStatus(text) {
  if (!cloudSyncStatus) {
    return;
  }

  cloudSyncStatus.textContent = text;
}

function updateCloudStatusFromState() {
  const state = getGarageCloudState();
  if (!state.configured) {
    setCloudStatus("Cloud sync status: local-only mode. Supabase config missing.");
    return;
  }

  if (!state.enabled) {
    setCloudStatus("Cloud sync status: local-only mode. Tap Retry Cloud Sync after Supabase setup.");
    return;
  }

  if (state.temporarilyDisabled) {
    const retryDate = new Date(state.disabledUntil);
    const retryText = retryDate.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
    setCloudStatus(`Cloud sync status: local-only fallback. Retry after ${retryText}.`);
    return;
  }

  setCloudStatus(
    `Cloud sync status: Supabase ready. GitHub backup ${
      state.githubBackupConfigured ? "configured." : "not configured."
    }`
  );
}

async function retryCloudSyncNow() {
  setCloudStatus("Cloud sync status: retrying...");
  setGarageCloudEnabled(true);
  const ok = await initGarageCloudSync();
  if (ok) {
    setCloudStatus("Cloud sync status: connected.");
    renderGaragePage();
    return;
  }

  updateCloudStatusFromState();
}

cloudSyncRetryButton?.addEventListener("click", () => {
  retryCloudSyncNow().catch(() => updateCloudStatusFromState());
});

window.addEventListener("ridgeline:storage-hydrated", () => {
  renderGaragePage();
});

window.addEventListener("ridgeline:quick-capture-saved", () => {
  renderGaragePage();
});

renderGaragePage();
initGarageCloudSync().then((ok) => {
  if (ok) {
    setCloudStatus("Cloud sync status: connected.");
  } else {
    updateCloudStatusFromState();
  }
}).catch(() => {
  updateCloudStatusFromState();
});
updateCloudStatusFromState();
