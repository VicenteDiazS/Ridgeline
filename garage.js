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
import { getOwnerAuthState, onOwnerAuthChange } from "./owner-auth.js";

const notesForm = document.querySelector("[data-notes-form]");
const trackerForm = document.querySelector("[data-tracker-form]");
const profileForm = document.querySelector("[data-profile-form]");
const profileSummary = document.querySelector("[data-profile-summary]");
const photosInput = document.querySelector("[data-photo-input]");
const photosGrid = document.querySelector("[data-photo-grid]");
const favoritesList = document.querySelector("[data-favorites-list]");
const areaSummary = document.querySelector("[data-area-summary]");
const dashboardGrid = document.querySelector("[data-garage-dashboard]");
const garageSetupChecklist = document.querySelector("[data-garage-setup-checklist]");
const recentHandoffList = document.querySelector("[data-recent-handoffs]");
const recentHandoffCopyButton = document.querySelector("[data-copy-recent-handoff]");
const recentHandoffStatus = document.querySelector("[data-recent-handoff-status]");
const diagnosticActivityList = document.querySelector("[data-diagnostic-activity]");
const maintenanceNotePreview = document.querySelector("[data-maintenance-note-preview]");
const maintenanceNoteCopyButton = document.querySelector("[data-copy-maintenance-note]");
const maintenancePartsCopyButton = document.querySelector("[data-copy-maintenance-parts]");
const maintenanceNeededCopyButton = document.querySelector("[data-copy-maintenance-needed]");
const maintenancePartsPreview = document.querySelector("[data-maintenance-parts-preview]");
const maintenanceNoteStatus = document.querySelector("[data-maintenance-note-status]");
const MAINTENANCE_STAGE_HANDOFF_KEY = "ridgeline-maintenance-stage-handoff";
const diagnosticActivityFilter = document.querySelector("[data-diagnostic-activity-filter]");
const diagnosticActivityCopyButton = document.querySelector("[data-copy-diagnostic-activity]");
const diagnosticActivityDownloadButton = document.querySelector("[data-download-diagnostic-activity]");
const garageBackupDownloadButton = document.querySelector("[data-download-garage-backup]");
const garageBackupImportInput = document.querySelector("[data-import-garage-backup]");
const garageBackupImportButton = document.querySelector("[data-choose-garage-backup]");
const garageBackupRestoreButton = document.querySelector("[data-restore-garage-backup]");
const garageBackupRestorePlanButton = document.querySelector("[data-copy-garage-restore-plan]");
const garageBackupQuickButtons = [...document.querySelectorAll("[data-garage-backup-quick]")];
const garageBackupPreview = document.querySelector("[data-garage-backup-preview]");
const diagnosticActivityStatus = document.querySelector("[data-diagnostic-activity-status]");
const cloudSyncStatus = document.querySelector("[data-cloud-sync-status]");
const cloudSyncRetryButton = document.querySelector("[data-cloud-sync-retry]");
const quickMileageInput = document.querySelector("[data-quick-mileage]");
const quickServiceSelect = document.querySelector("[data-quick-service]");
const quickLogButton = document.querySelector("[data-quick-log-button]");
const quickLogStatus = document.querySelector("[data-quick-log-status]");
const jobNoteCopyButton = document.querySelector("[data-copy-job-note]");
const jobNoteAppendButton = document.querySelector("[data-append-job-note]");
const jobNoteStatus = document.querySelector("[data-job-note-status]");
const defaultNotes = {
  timing_service:
    "Timing belt service completed 4/25/2026 at 165,980 miles using the AISIN TKH-002 Timing Belt Replacement Kit from RockAuto.com: timing belt, crankshaft sprocket, timing belt tensioner, timing belt pulleys, timing cover seal, and water pump replaced."
};
const defaultTracker = {
  timing_belt_service: "4/25/2026 / 165,980 miles"
};
const defaultProfile = {
  vin: "",
  vehicle: "2019 Honda Ridgeline",
  trim_drive: "2WD",
  engine: "J35Y6 3.5L V6",
  current_mileage: "",
  tire_size_pressure: "245/60R18 / 35 psi",
  wheel_torque: "94 lb-ft",
  parts_notes: "Timing belt service completed 4/25/2026 at 165,980 miles using AISIN TKH-002."
};
let currentDiagnosticActivityFilter = "all";
let currentMaintenanceStagingFilter = "all";
let currentMaintenanceCounterMode = false;
let currentMaintenanceStageHandoff = consumeMaintenanceStageHandoff();
let maintenanceCounterLastStaged = null;
let maintenanceCounterSkippedKeys = [];
let maintenanceFinalPartsDraft = "";
let pendingGarageBackup = null;
let pendingGarageBackupSummary = null;
let currentGarageFillPlan = null;
const MAINTENANCE_STAGING_STATE_KEY = "ridgeline-maintenance-staging-state";
const MAINTENANCE_CUSTOM_STAGING_KEY = "ridgeline-maintenance-custom-staging";
const MAINTENANCE_CUSTOM_STAGING_TITLE = "One-Off Store Items";
const MAINTENANCE_CUSTOM_STAGING_SUGGESTIONS = [
  "Shop towels",
  "Funnel",
  "Gloves",
  "Brake cleaner",
  "Trim clips",
  "Drain pan"
];
const MAINTENANCE_CUSTOM_STAGING_KITS = [
  {
    label: "Oil run",
    items: ["Shop towels", "Funnel", "Gloves", "Drain pan"]
  },
  {
    label: "Filter run",
    items: ["Gloves", "Shop towels"]
  },
  {
    label: "Electrical check",
    items: ["Trim clips", "Gloves"]
  },
  {
    label: "Cleanup",
    items: ["Shop towels", "Brake cleaner", "Gloves"]
  }
];
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
const SENSITIVE_PROFILE_FIELDS = new Set(["vin", "current_mileage", "registration"]);

function ownerCanViewSensitiveProfile() {
  return Boolean(getOwnerAuthState().isOwner);
}

function maskVin(value = "") {
  const cleaned = `${value || ""}`.trim();
  if (!cleaned) {
    return "";
  }
  const tail = cleaned.slice(-4);
  return `Hidden for public view (${tail ? `ending ${tail}` : "owner only"})`;
}

function maskMileage(value = "") {
  const numeric = Number(`${value || ""}`.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "";
  }
  return "Hidden for public view";
}

function redactedProfile(profile = {}) {
  if (ownerCanViewSensitiveProfile()) {
    return profile;
  }

  return {
    ...profile,
    vin: maskVin(profile.vin),
    current_mileage: maskMileage(profile.current_mileage),
    registration: profile.registration ? "Hidden for public view" : ""
  };
}

function profileValue(profile = {}) {
  if (ownerCanViewSensitiveProfile()) {
    return profile.vin || "VIN not set";
  }
  return profile.vin ? "Truck identity hidden" : "Truck identity hidden";
}

function hydrateGarageForms() {
  if (notesForm) {
    hydrateForm(notesForm, loadJson(STORAGE.notes, defaultNotes));
  }
  if (trackerForm) {
    hydrateForm(trackerForm, loadJson(STORAGE.tracker, defaultTracker));
  }
  if (profileForm) {
    hydrateForm(profileForm, redactedProfile(loadJson(STORAGE.profile, defaultProfile)));
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

function setJobNoteStatus(message = "") {
  if (jobNoteStatus) {
    jobNoteStatus.textContent = message;
  }
}

function buildJobNoteText() {
  const notes = notesForm ? formPayload(notesForm) : loadJson(STORAGE.notes, {});
  const dateMileage = `${notes.job_note_date_mileage || ""}`.trim() || "Date / mileage not recorded";
  const title = `${notes.job_note_title || ""}`.trim() || "Service job";
  const lines = [
    `Ridgeline Service Job Note - ${title}`,
    `Date / mileage: ${dateMileage}`,
    `Area / system: ${`${notes.job_note_area || ""}`.trim() || "Not recorded"}`,
    `Parts / supplies: ${`${notes.job_note_parts || ""}`.trim() || "Not recorded"}`,
    `Work performed / result: ${`${notes.job_note_result || ""}`.trim() || "Not recorded"}`,
    `Follow-up / next buy: ${`${notes.job_note_followup || ""}`.trim() || "Not recorded"}`
  ];

  return lines.join("\n");
}

function appendJobNoteToGeneralNotes() {
  if (!notesForm) {
    return;
  }

  const payload = formPayload(notesForm);
  const title = `${payload.job_note_title || ""}`.trim() || "Service job";
  const date = new Date().toLocaleDateString("en-US");
  const block = `[${date} - ${title}]\n${buildJobNoteText()}`;
  const generalInput = notesForm.querySelector("[name='general_notes']");
  const currentGeneral = `${payload.general_notes || ""}`.trim();
  const nextGeneral = currentGeneral ? `${block}\n\n${currentGeneral}` : block;

  if (generalInput) {
    generalInput.value = nextGeneral;
  }

  saveJson(STORAGE.notes, {
    ...loadJson(STORAGE.notes, {}),
    ...payload,
    general_notes: nextGeneral
  });
  renderDashboard();
  renderMaintenancePartsPreview();
  renderDiagnosticActivity();
  setJobNoteStatus(`Appended ${title} to General Notes.`);
}

jobNoteCopyButton?.addEventListener("click", () => {
  copyText(buildJobNoteText())
    .then(() => {
      setJobNoteStatus("Service job note copied.");
    })
    .catch(() => {
      setJobNoteStatus("Could not copy automatically. Select the job note text and copy it manually.");
    });
});

jobNoteAppendButton?.addEventListener("click", appendJobNoteToGeneralNotes);
recentHandoffCopyButton?.addEventListener("click", () => copyRecentHandoff());

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

  const profile = redactedProfile(profileForm ? formPayload(profileForm) : loadJson(STORAGE.profile, defaultProfile));
  const summaryItems = [
    ["VIN", profile.vin],
    ["Vehicle", profile.vehicle],
    ["Trim / drive", profile.trim_drive],
    ["Engine", profile.engine],
    ["Mileage", ownerCanViewSensitiveProfile() && profile.current_mileage ? `${Number(profile.current_mileage).toLocaleString("en-US")} mi` : profile.current_mileage],
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

function parseGarageNoteBlocks(value = "") {
  const text = `${value || ""}`.trim();
  if (!text) {
    return [];
  }

  const blocks = [];
  const pattern = /\[([^\]\n]+?)\]\s*\n?([\s\S]*?)(?=\n\[[^\]\n]+?\]\s*\n?|\s*$)/g;
  let match;
  while ((match = pattern.exec(text))) {
    blocks.push({
      heading: match[1] || "",
      body: (match[2] || "").trim(),
      copyText: `[${match[1] || ""}]\n${(match[2] || "").trim()}`.trim()
    });
  }

  return blocks;
}

function classifyRecentHandoff(heading = "", body = "", sourceOverride = "") {
  const haystack = `${heading}\n${body}`;
  const source = sourceOverride || "Garage Notes";
  const matchers = [
    {
      test: /\broadside note\b/i,
      source: "Quick Sheet",
      title: heading.replace(/^[^-]+-\s*/i, "").trim() || "Roadside note",
      href: "quick-sheet.html#roadside-action-stack"
    },
    {
      test: /\blive roadside update\b/i,
      source: "Quick Sheet",
      title: "Live roadside session",
      href: "quick-sheet.html#roadside-action-stack"
    },
    {
      test: /\bfuse check note\b/i,
      source: "Quick Sheet",
      title: heading.replace(/^[^-]+-\s*/i, "").trim() || "Fuse check note",
      href: "quick-sheet.html#fuse-triage"
    },
    {
      test: /\bfuse pull checklist\b/i,
      source: "Fuse Checklist",
      title: heading.replace(/^[^-]+-\s*/i, "").trim() || "Fuse pull checklist",
      href: /cabin/i.test(haystack) ? "cabin.html#cabin-fuse-pull-checklist" : "hood.html#hood-fuse-pull-checklist"
    },
    {
      test: /\bdiagnostic note\b/i,
      source: "Diagnostics",
      title: heading.replace(/^[^-]+-\s*/i, "").trim() || "Diagnostic note",
      href: "diagnostics.html#diagnostic-share-builder"
    },
    {
      test: /\btire pressure recheck\b/i,
      source: "Tires",
      title: "Tire Pressure Recheck",
      href: "tires.html#tire-recheck-planner"
    },
    {
      test: /\btrailer light test\b/i,
      source: source || "Rear Hitch Journal",
      title: "Trailer Light Test",
      href: "rear-hitch.html#tow-setup-saver"
    }
  ];
  const match = matchers.find((item) => item.test.test(haystack));
  if (!match) {
    return null;
  }

  return {
    source: match.source,
    title: match.title,
    detail: shortText(body || heading, 170),
    href: match.href
  };
}

function getRecentHandoffItems() {
  const notes = loadJson(STORAGE.notes, {});
  const items = [];

  parseGarageNoteBlocks(notes.general_notes).forEach((block, index) => {
    const item = classifyRecentHandoff(block.heading, block.body);
    if (item) {
      items.push({
        ...item,
        meta: block.heading,
        copyText: block.copyText,
        rank: index
      });
    }
  });

  const generalNotes = `${notes.general_notes || ""}`.trim();
  const liveRoadsideIndex = generalNotes.search(/Ridgeline live roadside update:/i);
  if (liveRoadsideIndex >= 0) {
    const liveBlock = generalNotes.slice(liveRoadsideIndex).split(/\n(?=\[[^\]\n]+?\])/)[0].trim();
    const item = classifyRecentHandoff("Live roadside update", liveBlock);
    if (item) {
      items.push({
        ...item,
        meta: "Live roadside update",
        copyText: liveBlock,
        rank: liveRoadsideIndex
      });
    }
  }

  const hitch = loadAreaJournal("rear-hitch");
  parseGarageNoteBlocks(hitch?.notes?.tow_notes).forEach((block, index) => {
    const item = classifyRecentHandoff(block.heading, block.body, "Rear Hitch Journal");
    if (item) {
      items.push({
        ...item,
        meta: block.heading,
        copyText: block.copyText,
        rank: 100 + index
      });
    }
  });

  const seen = new Set();
  return items
    .filter((item) => {
      const key = `${item.meta}::${item.title}::${item.detail}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5);
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

function consumeMaintenanceStageHandoff() {
  try {
    const value = JSON.parse(sessionStorage.getItem(MAINTENANCE_STAGE_HANDOFF_KEY) || "null");
    sessionStorage.removeItem(MAINTENANCE_STAGE_HANDOFF_KEY);
    if (!isPlainObject(value)) {
      return null;
    }

    const age = Date.now() - Number(value.savedAt || 0);
    if (age < 0 || age > 1000 * 60 * 10) {
      return null;
    }

    return {
      title: shortText(value.title || "Maintenance planner note", 80),
      scope: shortText(value.scope || "planner note", 80)
    };
  } catch {
    return null;
  }
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
    .filter((line) => !/\bbrake fluid\b.*\b(separate|calendar|sub-code|maintenance minder)\b/i.test(line))
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

function loadCustomMaintenanceStagingItems() {
  try {
    const value = JSON.parse(localStorage.getItem(MAINTENANCE_CUSTOM_STAGING_KEY) || "[]");
    return Array.isArray(value) ? value.map(normalizeMaintenanceLine).filter(Boolean).slice(0, 12) : [];
  } catch {
    return [];
  }
}

function saveCustomMaintenanceStagingItems(items = []) {
  const seen = new Set();
  const cleaned = items
    .map(normalizeMaintenanceLine)
    .filter(Boolean)
    .filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 12);

  localStorage.setItem(MAINTENANCE_CUSTOM_STAGING_KEY, JSON.stringify(cleaned));
  return cleaned;
}

function addCustomMaintenanceStagingItem(value = "") {
  const line = normalizeMaintenanceLine(value).slice(0, 90);
  if (!line) {
    setMaintenanceNoteStatus("Enter a one-off store item before adding it.");
    return false;
  }

  const items = loadCustomMaintenanceStagingItems();
  if (items.some((item) => item.toLowerCase() === line.toLowerCase())) {
    setMaintenanceNoteStatus("That one-off store item is already in the staging list.");
    return false;
  }

  saveCustomMaintenanceStagingItems([line, ...items]);
  setMaintenanceStagingStatus(MAINTENANCE_CUSTOM_STAGING_TITLE, line, "need");
  renderDashboard();
  renderMaintenancePartsPreview();
  setMaintenanceNoteStatus(`Added ${line} to the local-only staging list.`);
  return true;
}

function addCustomMaintenanceStagingKit(label = "") {
  const kit = MAINTENANCE_CUSTOM_STAGING_KITS.find((item) => item.label.toLowerCase() === `${label}`.toLowerCase());
  if (!kit) {
    return;
  }

  const existing = loadCustomMaintenanceStagingItems();
  const existingKeys = new Set(existing.map((item) => item.toLowerCase()));
  const newItems = kit.items
    .map((item) => normalizeMaintenanceLine(item).slice(0, 90))
    .filter((item) => item && !existingKeys.has(item.toLowerCase()));

  if (!newItems.length) {
    setMaintenanceNoteStatus(`${kit.label} quick kit is already in the local-only staging list.`);
    return;
  }

  saveCustomMaintenanceStagingItems([...newItems, ...existing]);
  newItems.forEach((item) => setMaintenanceStagingStatus(MAINTENANCE_CUSTOM_STAGING_TITLE, item, "need"));
  renderDashboard();
  renderMaintenancePartsPreview();
  setMaintenanceNoteStatus(`Added ${newItems.length} ${kit.label} item${newItems.length === 1 ? "" : "s"} to the local-only staging list.`);
}

function removeCustomMaintenanceStagingItem(line = "") {
  const normalized = normalizeMaintenanceLine(line);
  if (!normalized) {
    return;
  }

  const items = loadCustomMaintenanceStagingItems().filter((item) => item.toLowerCase() !== normalized.toLowerCase());
  saveCustomMaintenanceStagingItems(items);
  setMaintenanceStagingStatus(MAINTENANCE_CUSTOM_STAGING_TITLE, normalized, "need");
  renderDashboard();
  renderMaintenancePartsPreview();
  setMaintenanceNoteStatus(`Removed ${normalized} from the local-only staging list.`);
}

function clearCustomMaintenanceStagingItems() {
  const items = loadCustomMaintenanceStagingItems();
  if (!items.length) {
    setMaintenanceNoteStatus("No one-off store items are in the local-only staging list.");
    return;
  }

  saveCustomMaintenanceStagingItems([]);
  items.forEach((item) => setMaintenanceStagingStatus(MAINTENANCE_CUSTOM_STAGING_TITLE, item, "need"));
  renderDashboard();
  renderMaintenancePartsPreview();
  setMaintenanceNoteStatus(`Cleared ${items.length} one-off store item${items.length === 1 ? "" : "s"} from the local-only staging list.`);
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

function maintenanceStagingGroups({ items = getMaintenanceNoteItems(), index = null, includeCustom = true } = {}) {
  const selectedItems = Number.isInteger(index) ? items.slice(index, index + 1) : items;
  const savedGroups = selectedItems
    .map((item) => ({
      title: item.title,
      lines: item.stagingItems || [],
      index: items.indexOf(item),
      custom: false
    }))
    .filter((group) => group.lines.length);
  const customLines = includeCustom && !Number.isInteger(index) ? loadCustomMaintenanceStagingItems() : [];
  const customGroup = customLines.length
    ? [
        {
          title: MAINTENANCE_CUSTOM_STAGING_TITLE,
          lines: customLines,
          index: null,
          custom: true
        }
      ]
    : [];

  return [...customGroup, ...savedGroups];
}

function setMaintenanceNoteStatus(message = "") {
  if (maintenanceNoteStatus) {
    maintenanceNoteStatus.textContent = message;
  }
}

function maintenanceStagingExportText(index = null) {
  return maintenanceStagingExport({ index }).text;
}

function maintenanceStagingPlainLines(status = "need") {
  return maintenanceStagingGroups()
    .flatMap((group) =>
      group.lines
        .filter((line) => {
          if (status === "need") {
            return maintenanceStagingStatus(group.title, line) !== "staged";
          }
          if (status === "staged") {
            return maintenanceStagingStatus(group.title, line) === "staged";
          }
          return true;
        })
        .map((line) => `${group.title}: ${line}`)
    )
    .slice(0, 12);
}

function maintenanceCounterNeedItems(items = getMaintenanceNoteItems()) {
  const needItems = maintenanceStagingGroups({ items })
    .flatMap((group) =>
      group.lines
        .filter((line) => maintenanceStagingStatus(group.title, line) !== "staged")
        .map((line) => ({
          title: group.title,
          line
        }))
    )
    .slice(0, 12);
  const activeSkippedKeys = maintenanceCounterSkippedKeys.filter((key) =>
    needItems.some((item) => maintenanceCounterItemKey(item) === key)
  );
  maintenanceCounterSkippedKeys = activeSkippedKeys;

  if (!activeSkippedKeys.length) {
    return needItems;
  }

  const activeSkippedSet = new Set(activeSkippedKeys);
  const readyItems = needItems.filter((item) => !activeSkippedSet.has(maintenanceCounterItemKey(item)));
  const skippedItems = activeSkippedKeys
    .map((key) => needItems.find((item) => maintenanceCounterItemKey(item) === key))
    .filter(Boolean);

  return [...readyItems, ...skippedItems];
}

function maintenanceCounterItemKey(item) {
  return `${item?.title || ""}::${item?.line || ""}`;
}

function maintenanceStagingExport({ index = null, status = "all" } = {}) {
  const items = getMaintenanceNoteItems();
  const groups = maintenanceStagingGroups({ items, index })
    .map((group) => ({
      ...group,
      lines: (group.lines || []).filter((line) => {
        if (status === "need") {
          return maintenanceStagingStatus(group.title, line) !== "staged";
        }
        if (status === "staged") {
          return maintenanceStagingStatus(group.title, line) === "staged";
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
    status === "need"
      ? "Remaining items only. Verify part numbers and truck labels before ordering. One-off items are local-only helper entries."
      : "Verify part numbers and truck labels before ordering. One-off items are local-only helper entries.",
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

function maintenanceFinalPartsMarkup(summary = getMaintenanceStagingSummary()) {
  const profile = loadJson(STORAGE.profile, defaultProfile);
  const profileNoteCount = `${profile.parts_notes || ""}`.trim().split(/\n+/).filter(Boolean).length;
  return `
    <section class="maintenance-final-parts" data-maintenance-final-parts>
      <div>
        <p class="eyebrow">Final part numbers</p>
        <h5>Save Confirmed Parts To Truck Profile</h5>
        <p class="small-note">Paste verified part numbers, brands, or store SKUs here after checking the catalog or truck labels. This saves into the existing Truck Profile parts notes.</p>
      </div>
      <label>
        <span>Confirmed parts / notes</span>
        <textarea rows="4" maxlength="900" data-maintenance-final-parts-input placeholder="Oil filter: ...&#10;Cabin filter: ...&#10;Battery: ...">${escapeHtml(maintenanceFinalPartsDraft)}</textarea>
      </label>
      <div class="maintenance-final-parts-actions">
        <span>${profileNoteCount ? `${profileNoteCount} Truck Profile note line${profileNoteCount === 1 ? "" : "s"} saved` : "Truck Profile parts notes are empty"}</span>
        <div class="inspector-actions">
          <button class="ghost-button" type="button" data-maintenance-final-parts-fill="need" ${summary.need ? "" : "disabled"}>Use Need List</button>
          <button class="ghost-button" type="button" data-maintenance-final-parts-fill="staged" ${summary.staged ? "" : "disabled"}>Use Staged List</button>
          <button class="ghost-button" type="button" data-maintenance-final-parts-save>Save To Profile</button>
          <a class="utility-link" href="#truck-profile">Open Profile</a>
        </div>
      </div>
    </section>
  `;
}

function getMaintenanceStagingSummary(items = getMaintenanceNoteItems()) {
  const groups = maintenanceStagingGroups({ items });
  const total = groups.reduce((sum, group) => sum + group.lines.length, 0);
  const staged = groups.reduce(
    (sum, group) =>
      sum + group.lines.filter((line) => maintenanceStagingStatus(group.title, line) === "staged").length,
    0
  );
  const need = Math.max(total - staged, 0);

  return { groups: groups.length, total, staged, need };
}

function maintenanceStagingGuideMarkup(items = getMaintenanceNoteItems()) {
  const summary = getMaintenanceStagingSummary(items);
  const skipped = items.filter((item) => !(item.stagingItems || []).length).length;
  const skippedText =
    skipped > 0
      ? `${skipped} saved note${skipped === 1 ? "" : "s"} visible below did not include detected parts, tools, or supplies.`
      : "Every detected saved planner note has staging lines.";

  return `
    <div class="maintenance-staging-guide" data-maintenance-staging-guide>
      <span><strong>${summary.total}</strong> staging line${summary.total === 1 ? "" : "s"} from saved notes and one-off items</span>
      <span>Need/Staged toggles and one-off items stay on this iPhone in local browser storage, outside Garage backup and sync.</span>
      <span>${escapeHtml(skippedText)}</span>
    </div>
  `;
}

function maintenanceCounterModeMarkup(items = getMaintenanceNoteItems()) {
  if (!currentMaintenanceCounterMode) {
    return "";
  }

  const needItems = maintenanceCounterNeedItems(items);
  const nextItem = needItems[0];
  const followingItem = needItems[1];
  const skippedCount = maintenanceCounterSkippedKeys.length;
  const lastStaged =
    maintenanceCounterLastStaged &&
    maintenanceStagingStatus(maintenanceCounterLastStaged.title, maintenanceCounterLastStaged.line) === "staged"
      ? maintenanceCounterLastStaged
      : null;
  if (!nextItem) {
    return `
      <section class="maintenance-counter-panel is-complete" data-maintenance-counter-panel>
        <div>
          <p class="eyebrow">Counter Mode</p>
          <h5>All Need-To-Buy Items Are Staged</h5>
          <p class="small-note">No current need-to-buy lines remain. Save final part numbers only after checking the receipt, catalog, or truck labels.</p>
          ${
            lastStaged
              ? `<p class="maintenance-counter-last">Last staged: ${escapeHtml(lastStaged.line)}</p>`
              : ""
          }
        </div>
        <div class="inspector-actions">
          ${
            lastStaged
              ? `<button class="ghost-button" type="button" data-maintenance-counter-undo>Undo Last</button>`
              : ""
          }
          <button class="ghost-button" type="button" data-save-maintenance-run-inline>Save Run Note</button>
          <button class="ghost-button" type="button" data-copy-maintenance-staged-inline>Copy Staged List</button>
          <button class="ghost-button" type="button" data-share-maintenance-staged-inline>Share Staged List</button>
          <button class="ghost-button" type="button" data-maintenance-counter-final-parts>Open Final Parts</button>
          <button class="ghost-button" type="button" data-maintenance-counter-draft-staged>Draft Staged Parts</button>
          <button class="ghost-button" type="button" data-maintenance-counter-exit>Exit Counter Mode</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="maintenance-counter-panel" data-maintenance-counter-panel>
      <div>
        <p class="eyebrow">Counter Mode</p>
        <h5>Next Need-To-Buy Item</h5>
        <p class="maintenance-counter-progress">Item 1 of ${needItems.length}</p>
        <p class="maintenance-counter-next">${escapeHtml(nextItem.line)}</p>
        <p class="small-note">${needItems.length} need-to-buy item${needItems.length === 1 ? "" : "s"} remain. Source note: ${escapeHtml(nextItem.title)}.</p>
        ${
          followingItem
            ? `<p class="maintenance-counter-peek">Next up: ${escapeHtml(followingItem.line)}</p>`
            : `<p class="maintenance-counter-peek">Last item in the current Counter Mode list.</p>`
        }
        ${
          skippedCount
            ? `<p class="maintenance-counter-skip-note">${skippedCount} skipped for this Counter Mode visit. Skips do not change saved Garage data.</p>`
            : ""
        }
        ${
          lastStaged
            ? `<p class="maintenance-counter-last">Last staged: ${escapeHtml(lastStaged.line)}</p>`
            : ""
        }
      </div>
      <div class="inspector-actions">
        <button class="ghost-button" type="button" data-maintenance-counter-mark-next>Mark Next Staged</button>
        <button class="ghost-button" type="button" data-maintenance-counter-skip-next ${needItems.length > 1 ? "" : "disabled"}>Skip This Item</button>
        <button class="ghost-button" type="button" data-maintenance-counter-copy-next>Copy Next Item</button>
        <button class="ghost-button" type="button" data-maintenance-counter-share-next>Share Next Item</button>
        ${
          lastStaged
            ? `<button class="ghost-button" type="button" data-maintenance-counter-undo>Undo Last</button>`
            : ""
        }
        ${
          skippedCount
            ? `<button class="ghost-button" type="button" data-maintenance-counter-reset-skips>Reset Skips</button>`
            : ""
        }
        <button class="ghost-button" type="button" data-copy-maintenance-needed-inline>Copy Buy List</button>
        <button class="ghost-button" type="button" data-maintenance-counter-exit>Exit Counter Mode</button>
      </div>
    </section>
  `;
}

function maintenanceCustomStagingMarkup() {
  const customCount = loadCustomMaintenanceStagingItems().length;
  return `
    <form class="maintenance-custom-staging-form" data-maintenance-custom-staging-form>
      <label>
        <span>Add one-off store item</span>
        <input type="text" maxlength="90" autocomplete="off" data-maintenance-custom-staging-input placeholder="Shop towels, funnel, trim clips" />
      </label>
      <button class="ghost-button" type="submit">Add Item</button>
    </form>
    <div class="maintenance-custom-staging-kits" aria-label="Quick add one-off store kits">
      <span>Quick kits</span>
      ${MAINTENANCE_CUSTOM_STAGING_KITS.map(
        (kit) => `<button class="staging-kit" type="button" data-maintenance-custom-staging-kit="${escapeHtml(kit.label)}">${escapeHtml(kit.label)}</button>`
      ).join("")}
    </div>
    <div class="maintenance-custom-staging-suggestions" aria-label="Quick add common one-off store items">
      ${MAINTENANCE_CUSTOM_STAGING_SUGGESTIONS.map(
        (item) => `<button class="staging-suggestion" type="button" data-maintenance-custom-staging-suggestion="${escapeHtml(item)}">${escapeHtml(item)}</button>`
      ).join("")}
    </div>
    <div class="maintenance-custom-staging-clear">
      <p class="small-note">One-off items are quick local helpers for this iPhone and are not included in Garage backup or sync.</p>
      <button class="ghost-button" type="button" data-maintenance-custom-staging-clear ${customCount ? "" : "disabled"}>Clear One-Offs</button>
    </div>
  `;
}

function maintenanceStageConfirmationMarkup(items = getMaintenanceNoteItems()) {
  if (!currentMaintenanceStageHandoff) {
    return "";
  }

  const latest = items[0];
  const latestLines = latest?.stagingItems || [];
  const needLines = latestLines.filter((line) => maintenanceStagingStatus(latest?.title || "", line) !== "staged");
  const previewLines = needLines.slice(0, 3);
  const lineCount = latestLines.length;
  const summary = getMaintenanceStagingSummary(items);
  const lineText = lineCount
    ? `${lineCount} staging line${lineCount === 1 ? "" : "s"} ready below.`
    : "No parts or supplies lines were detected, but the saved note is visible below.";
  const needText = needLines.length
    ? `${needLines.length} current need-to-buy line${needLines.length === 1 ? "" : "s"} from this saved note.`
    : lineCount
      ? "All detected lines from this saved note are already marked staged."
      : "";

  return `
    <article class="maintenance-stage-confirmation" data-maintenance-stage-confirmation>
      <div>
        <p class="eyebrow">Just saved from Maintenance</p>
        <strong>${escapeHtml(currentMaintenanceStageHandoff.title)}</strong>
        <p>${escapeHtml(currentMaintenanceStageHandoff.scope)} saved into Garage Notes. ${escapeHtml(lineText)}</p>
        ${
          needText
            ? `<p class="maintenance-stage-next">${escapeHtml(needText)}</p>`
            : ""
        }
        ${
          previewLines.length
            ? `<ul class="maintenance-stage-preview" aria-label="Need-to-buy lines from just-saved note">
                ${previewLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
              </ul>`
            : ""
        }
      </div>
      <div class="inspector-actions">
        <button class="utility-link" type="button" data-share-maintenance-needed-inline ${summary.need ? "" : "disabled"}>Share Buy List</button>
        <button class="utility-link" type="button" data-copy-maintenance-needed-inline ${summary.need ? "" : "disabled"}>Copy Buy List</button>
        <button class="utility-link" type="button" data-maintenance-counter-mode ${summary.need ? "" : "disabled"}>Counter Mode</button>
        <button class="utility-link" type="button" data-save-maintenance-needed-inline ${summary.need ? "" : "disabled"}>Save Buy Note</button>
        <button class="utility-link" type="button" data-save-maintenance-run-inline ${summary.total ? "" : "disabled"}>Save Run Note</button>
        <button class="utility-link" type="button" data-dismiss-maintenance-stage-confirmation>Dismiss</button>
        <a class="utility-link" href="#notes">Open Full Note</a>
      </div>
    </article>
  `;
}

function updateMaintenanceStagingBulk(action = "") {
  const items = getMaintenanceNoteItems();
  const groups = maintenanceStagingGroups({ items });
  let changed = 0;

  groups.forEach((group) => {
    group.lines.forEach((line) => {
      const status = maintenanceStagingStatus(group.title, line);
      if (action === "stage-needed" && status !== "staged") {
        setMaintenanceStagingStatus(group.title, line, "staged");
        changed += 1;
      }
      if (action === "reset-staged" && status === "staged") {
        setMaintenanceStagingStatus(group.title, line, "need");
        changed += 1;
      }
    });
  });

  renderDashboard();
  if (action === "stage-needed") {
    setMaintenanceNoteStatus(
      changed ? `Marked ${changed} need-to-buy item${changed === 1 ? "" : "s"} as staged.` : "No need-to-buy staging items left."
    );
  } else if (action === "reset-staged") {
    setMaintenanceNoteStatus(changed ? `Reset ${changed} staged item${changed === 1 ? "" : "s"} to need to buy.` : "No staged items to reset.");
  }
}

function updateMaintenanceStagingGroup(index = 0, action = "", title = "") {
  const item =
    title === MAINTENANCE_CUSTOM_STAGING_TITLE
      ? { title: MAINTENANCE_CUSTOM_STAGING_TITLE, stagingItems: loadCustomMaintenanceStagingItems() }
      : getMaintenanceNoteItems()[index];
  const lines = item?.stagingItems || [];
  let changed = 0;

  lines.forEach((line) => {
    const status = maintenanceStagingStatus(item.title, line);
    if (action === "stage-needed" && status !== "staged") {
      setMaintenanceStagingStatus(item.title, line, "staged");
      changed += 1;
    }
    if (action === "reset-staged" && status === "staged") {
      setMaintenanceStagingStatus(item.title, line, "need");
      changed += 1;
    }
  });

  renderDashboard();
  if (action === "stage-needed") {
    setMaintenanceNoteStatus(
      changed ? `Marked ${changed} ${item?.title || "saved note"} item${changed === 1 ? "" : "s"} as staged.` : "No need-to-buy items left in this saved note."
    );
  } else if (action === "reset-staged") {
    setMaintenanceNoteStatus(
      changed ? `Reset ${changed} ${item?.title || "saved note"} item${changed === 1 ? "" : "s"} to need to buy.` : "No staged items to reset in this saved note."
    );
  }
}

function startMaintenanceCounterMode() {
  const summary = getMaintenanceStagingSummary();
  if (!summary.need) {
    setMaintenanceNoteStatus("No need-to-buy items are left for Counter Mode.");
    return;
  }

  currentMaintenanceCounterMode = true;
  currentMaintenanceStagingFilter = "need";
  maintenanceCounterLastStaged = null;
  maintenanceCounterSkippedKeys = [];
  renderMaintenancePartsPreview();
  const target =
    maintenancePartsPreview?.querySelector(".maintenance-staging-run") ||
    maintenancePartsPreview?.querySelector("[data-maintenance-staging-toggle]");
  target?.scrollIntoView({ block: "nearest" });
  setMaintenanceNoteStatus(
    `Counter Mode is showing ${summary.need} need-to-buy item${summary.need === 1 ? "" : "s"}. Confirm fitment before saving final part numbers.`
  );
}

function exitMaintenanceCounterMode() {
  currentMaintenanceCounterMode = false;
  maintenanceCounterLastStaged = null;
  maintenanceCounterSkippedKeys = [];
  renderMaintenancePartsPreview();
  setMaintenanceNoteStatus("Counter Mode closed. Saved notes and local staging state are unchanged.");
}

function skipNextMaintenanceCounterItem() {
  const needItems = maintenanceCounterNeedItems();
  const nextItem = needItems[0];
  if (!nextItem || needItems.length <= 1) {
    setMaintenanceNoteStatus("No other Counter Mode item is ready to show.");
    return;
  }

  const key = maintenanceCounterItemKey(nextItem);
  maintenanceCounterSkippedKeys = [...maintenanceCounterSkippedKeys.filter((itemKey) => itemKey !== key), key];
  currentMaintenanceCounterMode = true;
  currentMaintenanceStagingFilter = "need";
  renderMaintenancePartsPreview();
  const newNextItem = maintenanceCounterNeedItems()[0];
  setMaintenanceNoteStatus(
    `Skipped ${nextItem.line} for this Counter Mode visit. Showing ${newNextItem?.line || "the next need-to-buy item"} next; saved staging data is unchanged.`
  );
}

function resetMaintenanceCounterSkips() {
  const skipped = maintenanceCounterSkippedKeys.length;
  maintenanceCounterSkippedKeys = [];
  currentMaintenanceCounterMode = true;
  currentMaintenanceStagingFilter = "need";
  renderMaintenancePartsPreview();
  setMaintenanceNoteStatus(
    skipped ? `Reset ${skipped} Counter Mode skip${skipped === 1 ? "" : "s"}. Original need-to-buy order is restored.` : "No Counter Mode skips to reset."
  );
}

function markNextMaintenanceCounterItemStaged() {
  const nextItem = maintenanceCounterNeedItems()[0];
  if (!nextItem) {
    currentMaintenanceCounterMode = false;
    renderMaintenancePartsPreview();
    setMaintenanceNoteStatus("No need-to-buy items are left for Counter Mode.");
    return;
  }

  setMaintenanceStagingStatus(nextItem.title, nextItem.line, "staged");
  maintenanceCounterLastStaged = nextItem;
  maintenanceCounterSkippedKeys = maintenanceCounterSkippedKeys.filter((key) => key !== maintenanceCounterItemKey(nextItem));
  renderDashboard();
  const remaining = maintenanceCounterNeedItems().length;
  if (!remaining) {
    currentMaintenanceStagingFilter = "all";
  } else {
    currentMaintenanceStagingFilter = "need";
  }
  renderMaintenancePartsPreview();
  setMaintenanceNoteStatus(
    remaining
      ? `Marked next Counter Mode item staged. ${remaining} need-to-buy item${remaining === 1 ? "" : "s"} remain.`
      : "Marked the last Counter Mode item staged. Save final part numbers after receipt or catalog verification."
  );
}

function copyNextMaintenanceCounterItem() {
  const nextItem = maintenanceCounterNeedItems()[0];
  if (!nextItem) {
    setMaintenanceNoteStatus("No Counter Mode need-to-buy item is ready to copy.");
    return;
  }

  copyText(nextItem.line)
    .then(() => {
      setMaintenanceNoteStatus(`Copied next Counter Mode item from ${nextItem.title}.`);
    })
    .catch(() => {
      setMaintenanceNoteStatus("Could not copy the next Counter Mode item automatically.");
    });
}

function shareNextMaintenanceCounterItem() {
  const nextItem = maintenanceCounterNeedItems()[0];
  if (!nextItem) {
    setMaintenanceNoteStatus("No Counter Mode need-to-buy item is ready to share.");
    return;
  }

  const text = [
    nextItem.line,
    "",
    `Source note: ${nextItem.title}`,
    "Confirm fitment against the receipt, catalog, or truck labels before saving final part numbers."
  ].join("\n");
  const title = "Ridgeline Counter Mode Next Item";

  if (navigator.share) {
    navigator
      .share({
        title,
        text
      })
      .then(() => {
        setMaintenanceNoteStatus(`Shared next Counter Mode item from ${nextItem.title}.`);
      })
      .catch((error) => {
        if (error?.name === "AbortError") {
          setMaintenanceNoteStatus("Share canceled.");
          return;
        }
        copyText(text)
          .then(() => {
            setMaintenanceNoteStatus("Share was unavailable, so the next Counter Mode item was copied.");
          })
          .catch(() => {
            setMaintenanceNoteStatus("Could not share or copy the next Counter Mode item automatically.");
          });
      });
    return;
  }

  copyText(text)
    .then(() => {
      setMaintenanceNoteStatus("Share is unavailable here, so the next Counter Mode item was copied.");
    })
    .catch(() => {
      setMaintenanceNoteStatus("Could not share or copy the next Counter Mode item automatically.");
    });
}

function undoLastMaintenanceCounterItem() {
  if (
    !maintenanceCounterLastStaged ||
    maintenanceStagingStatus(maintenanceCounterLastStaged.title, maintenanceCounterLastStaged.line) !== "staged"
  ) {
    setMaintenanceNoteStatus("No Counter Mode item is ready to undo.");
    return;
  }

  setMaintenanceStagingStatus(maintenanceCounterLastStaged.title, maintenanceCounterLastStaged.line, "need");
  const restoredLine = maintenanceCounterLastStaged.line;
  maintenanceCounterLastStaged = null;
  currentMaintenanceCounterMode = true;
  currentMaintenanceStagingFilter = "need";
  renderDashboard();
  renderMaintenancePartsPreview();
  setMaintenanceNoteStatus(`Undid the last Counter Mode item: ${restoredLine} is back on the need-to-buy list.`);
}

function openCounterFinalParts(statusMessage = "Opened Final Part Numbers. Save only user-confirmed part numbers or store SKUs here.") {
  const target = maintenancePartsPreview?.querySelector("[data-maintenance-final-parts]");
  const input = maintenancePartsPreview?.querySelector("[data-maintenance-final-parts-input]");
  if (!target) {
    setMaintenanceNoteStatus("Final part-number handoff is not available yet.");
    return;
  }

  target.scrollIntoView({ block: "nearest" });
  input?.focus({ preventScroll: true });
  setMaintenanceNoteStatus(statusMessage);
}

function draftCounterStagedFinalParts() {
  fillMaintenanceFinalPartsDraft("staged");
  openCounterFinalParts("Drafted staged lines into Final Part Numbers. Add confirmed part numbers before saving.");
}

function renderMaintenancePartsPreview(items = getMaintenanceNoteItems()) {
  if (!maintenancePartsPreview) {
    return;
  }

  const groups = maintenanceStagingGroups({ items }).slice(0, 4);

  if (maintenancePartsCopyButton) {
    maintenancePartsCopyButton.disabled = !groups.length;
  }
  if (maintenanceNeededCopyButton) {
    maintenanceNeededCopyButton.disabled = !groups.length;
  }

  if (!groups.length) {
    maintenancePartsPreview.innerHTML = `
        ${maintenanceStageConfirmationMarkup(items)}
        <article class="maintenance-parts-card maintenance-parts-empty">
          ${maintenanceStagingGuideMarkup(items)}
          ${maintenanceCustomStagingMarkup()}
          <strong>No staging items detected yet.</strong>
          <p>Saved notes are visible below. Add checked Service Prep items or a built Minder checklist when you want this panel to build a parts-counter list.</p>
        </article>
      `;
    return;
  }

  const summary = getMaintenanceStagingSummary(items);

  maintenancePartsPreview.innerHTML = `
    ${maintenanceStageConfirmationMarkup(items)}
    <article class="maintenance-parts-card">
      <div class="compact-section-head">
        <div>
          <p class="eyebrow">Parts and supplies staging</p>
          <h5>Pull From Saved Notes Before Ordering</h5>
        </div>
        <a class="utility-link" href="#rockauto-parts">Open Parts Sources</a>
      </div>
      ${maintenanceStagingGuideMarkup(items)}
      ${maintenanceCustomStagingMarkup()}
      <div class="maintenance-staging-filter" role="group" aria-label="Filter staging items">
        ${["all", "need", "staged"]
          .map((filter) => {
            const active = currentMaintenanceStagingFilter === filter;
            const label = filter === "all" ? "All" : filter === "need" ? "Need" : "Staged";
            return `<button class="staging-filter-button" type="button" data-maintenance-staging-filter="${filter}" aria-pressed="${active ? "true" : "false"}">${label}</button>`;
          })
          .join("")}
      </div>
      <div class="maintenance-staging-run">
        <p><strong>${summary.need}</strong> need to buy <span>/</span> <strong>${summary.staged}</strong> staged</p>
        <div class="inspector-actions">
          <button
            class="ghost-button"
            type="button"
            data-copy-maintenance-needed-inline
            ${summary.need ? "" : "disabled"}
          >Copy Buy List</button>
          <button
            class="ghost-button"
            type="button"
            data-maintenance-counter-mode
            ${summary.need ? "" : "disabled"}
          >Counter Mode</button>
          <button
            class="ghost-button"
            type="button"
            data-share-maintenance-needed-inline
            ${summary.need ? "" : "disabled"}
          >Share Buy List</button>
          <button
            class="ghost-button"
            type="button"
            data-save-maintenance-needed-inline
            ${summary.need ? "" : "disabled"}
          >Save Buy Note</button>
          <button
            class="ghost-button"
            type="button"
            data-save-maintenance-run-inline
            ${summary.total ? "" : "disabled"}
          >Save Run Note</button>
          <button
            class="ghost-button"
            type="button"
            data-maintenance-staging-bulk="stage-needed"
            ${summary.need ? "" : "disabled"}
          >Mark Need Staged</button>
          <button
            class="ghost-button"
            type="button"
            data-maintenance-staging-bulk="reset-staged"
            ${summary.staged ? "" : "disabled"}
          >Reset Staged</button>
        </div>
      </div>
      ${maintenanceCounterModeMarkup(items)}
      ${maintenanceFinalPartsMarkup(summary)}
      <div class="maintenance-parts-groups">
        ${groups
          .map((group) => {
            const stagedCount = group.lines.filter((line) => maintenanceStagingStatus(group.title, line) === "staged").length;
            const needCount = Math.max(group.lines.length - stagedCount, 0);
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
                <div class="maintenance-group-actions">
                  ${
                    group.custom
                      ? ""
                      : `
                        <button
                          class="ghost-button"
                          type="button"
                          data-copy-maintenance-needed-index="${group.index}"
                          ${needCount ? "" : "disabled"}
                        >Copy Need</button>
                        <button
                          class="ghost-button"
                          type="button"
                          data-share-maintenance-needed-index="${group.index}"
                          ${needCount ? "" : "disabled"}
                        >Share Need</button>
                        <button
                          class="ghost-button"
                          type="button"
                          data-save-maintenance-needed-index="${group.index}"
                          ${needCount ? "" : "disabled"}
                        >Save Need</button>
                      `
                  }
                  <button
                    class="ghost-button"
                    type="button"
                    data-maintenance-staging-group-bulk="stage-needed"
                    data-maintenance-staging-group-index="${group.index ?? ""}"
                    data-maintenance-staging-group-title="${escapeHtml(group.title)}"
                    ${stagedCount === group.lines.length ? "disabled" : ""}
                  >Mark Group Staged</button>
                  <button
                    class="ghost-button"
                    type="button"
                    data-maintenance-staging-group-bulk="reset-staged"
                    data-maintenance-staging-group-index="${group.index ?? ""}"
                    data-maintenance-staging-group-title="${escapeHtml(group.title)}"
                    ${stagedCount ? "" : "disabled"}
                  >Reset Group</button>
                </div>
                ${
                  visibleLines.length
                    ? `<ul class="maintenance-staging-checklist">
                        ${visibleLines
                          .map((line) => {
                            const status = maintenanceStagingStatus(group.title, line);
                            const staged = status === "staged";
                            return `
                              <li class="${staged ? "is-staged" : ""} ${group.custom ? "is-custom-staging-item" : ""}">
                                <span>${escapeHtml(line)}</span>
                                <span class="staging-line-actions">
                                  <button
                                    class="staging-toggle"
                                    type="button"
                                    data-maintenance-staging-toggle
                                    data-maintenance-staging-title="${escapeHtml(group.title)}"
                                    data-maintenance-staging-line="${escapeHtml(line)}"
                                    aria-pressed="${staged ? "true" : "false"}"
                                  >${staged ? "Staged" : "Need to buy"}</button>
                                  ${
                                    group.custom
                                      ? `<button class="staging-remove" type="button" data-maintenance-custom-staging-remove="${escapeHtml(line)}">Remove</button>`
                                      : ""
                                  }
                                </span>
                              </li>
                            `;
                          })
                          .join("")}
                      </ul>`
                    : `<p class="small-note maintenance-staging-empty">${emptyMessage}</p>`
                }
                ${
                  group.custom
                    ? ""
                    : `<button class="utility-link" type="button" data-copy-maintenance-parts-index="${group.index}">Copy This List</button>`
                }
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
  if (garageBackupRestorePlanButton) {
    garageBackupRestorePlanButton.disabled = !ready;
  }
  garageBackupQuickButtons
    .filter((button) => button.dataset.garageBackupQuick === "restore")
    .forEach((button) => {
      button.disabled = !ready;
    });
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

function garageBackupRestorePlanText(summary) {
  if (!summary?.entries?.length) {
    return "No Garage backup file is ready for restore.";
  }

  const generated = summary.generatedAt ? new Date(summary.generatedAt).toLocaleString("en-US") : "Date not recorded";
  const { replaceLabels, mergeLabels } = garageBackupImpact(summary);
  const lines = [
    "Ridgeline Garage Restore Plan",
    `Backup created: ${generated}`,
    "",
    "Recognized backup areas:",
    ...summary.entries.map((entry) => `- ${entry.label}: backup ${entry.count}; current ${currentGarageBackupCount(entry.key)}`),
    "",
    replaceLabels.length ? `Will replace: ${replaceLabels.join(", ")}` : "Will replace: none",
    mergeLabels.length ? `Will merge: ${mergeLabels.join(", ")}` : "Will merge: none",
    summary.skippedLabels.length ? `Skipped invalid sections: ${summary.skippedLabels.join(", ")}` : "Skipped invalid sections: none",
    "",
    "Before restore: Download a fresh Garage backup from this iPhone if you may need to undo the import.",
    "Photos: backup includes photo metadata, not browser-local image bytes."
  ];

  return lines.join("\n");
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
    <div class="garage-backup-preview-actions">
      <button class="ghost-button" type="button" data-copy-garage-restore-plan-inline>Copy Restore Plan</button>
    </div>
    <p>Download a fresh Garage backup first if you might need to undo this import.</p>
  `;
}

function clearPendingGarageBackup() {
  pendingGarageBackup = null;
  pendingGarageBackupSummary = null;
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

garageBackupQuickButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.garageBackupQuick;
    if (action === "download") {
      downloadGarageBackup();
      return;
    }
    if (action === "choose") {
      garageBackupImportInput?.click();
      return;
    }
    if (action === "restore" && !button.disabled) {
      garageBackupRestoreButton?.click();
    }
  });
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
    pendingGarageBackupSummary = summary;
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

function copyGarageRestorePlan() {
  if (!pendingGarageBackupSummary) {
    setDiagnosticActivityStatus("Choose a Garage backup JSON file before copying a restore plan.");
    return;
  }

  copyText(garageBackupRestorePlanText(pendingGarageBackupSummary))
    .then(() => {
      setDiagnosticActivityStatus("Garage restore plan copied.");
    })
    .catch(() => {
      setDiagnosticActivityStatus("Could not copy automatically. Review the backup preview and copy manually.");
    });
}

garageBackupRestorePlanButton?.addEventListener("click", copyGarageRestorePlan);

garageBackupPreview?.addEventListener("click", (event) => {
  const planButton = event.target.closest("[data-copy-garage-restore-plan-inline]");
  if (planButton) {
    copyGarageRestorePlan();
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
  const recentHandoffItems = getRecentHandoffItems();
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
      value: profileValue(profile),
      note: `${profile.vehicle || "2019 Ridgeline"} / ${profile.trim_drive || "Drive not set"} / ${profile.engine || "Engine not set"}`
    },
    { label: "Saved Notes", value: `${noteFields} fields`, note: "Installed parts and general truck memory" },
    {
      label: "Recent Handoffs",
      value: recentHandoffItems.length ? `${recentHandoffItems.length} saved` : "Ready to recover",
      note: recentHandoffItems.length
        ? `${recentHandoffItems[0].source}: ${recentHandoffItems[0].title}`
        : "Saved roadside, tire, fuse, diagnostic, and tow notes will appear here.",
      href: "#recent-handoffs",
      actionLabel: "Open Handoffs",
      actionClass: "dashboard-handoff-card"
    },
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

  renderGarageSetupChecklist({
    profile,
    maintenanceLog,
    warningLightSummary,
    areaPhotos,
    areaNotes,
    maintenanceNoteItems,
    maintenanceStagingSummary
  });
  renderRecentHandoffs(recentHandoffItems);
  renderDiagnosticActivity();
  renderMaintenanceNotePreview(maintenanceNoteItems);
}

function renderGarageSetupChecklist({
  profile,
  maintenanceLog,
  warningLightSummary,
  areaPhotos,
  areaNotes,
  maintenanceNoteItems,
  maintenanceStagingSummary
} = {}) {
  if (!garageSetupChecklist) {
    return;
  }

  const profileReady = Boolean(profile?.vin && profile?.current_mileage && profile?.parts_notes);
  const serviceReady = maintenanceLog?.length || maintenanceNoteItems?.length;
  const diagnosticReady = warningLightSummary?.count > 0;
  const photoReady = areaPhotos > 0 || areaNotes > 0;
  const stagingReady = maintenanceStagingSummary?.total > 0;
  const latestMaintenanceNote = maintenanceNoteItems?.[0] || null;
  const latestMaintenanceNeed = latestMaintenanceNote
    ? (latestMaintenanceNote.stagingItems || []).filter(
        (line) => maintenanceStagingStatus(latestMaintenanceNote.title, line) !== "staged"
      )
    : [];
  const latestService = Array.isArray(maintenanceLog) ? maintenanceLog[0] : null;

  const checklistItems = [
    {
      status: profileReady ? "done" : "next",
      label: profileReady ? "Profile saved" : "Add truck identity",
      title: "Truck Profile",
      detail: profileReady
        ? ownerCanViewSensitiveProfile()
          ? `${profile.vehicle || "Ridgeline"} has truck identity, mileage, and parts notes ready for backups.`
          : `${profile.vehicle || "Ridgeline"} has owner-managed truck identity and parts notes ready.`
        : "Save truck identity, current mileage, and verified parts notes before a parts counter or shop handoff.",
      href: "#truck-profile",
      action: "Open Profile"
    },
    {
      status: serviceReady ? "done" : "next",
      label: serviceReady ? "Service trail started" : "Log today's service",
      title: "Service Closeout",
      detail: serviceReady
        ? `${maintenanceLog.length} quick update${maintenanceLog.length === 1 ? "" : "s"} and ${maintenanceNoteItems.length} planner note${maintenanceNoteItems.length === 1 ? "" : "s"} are visible.`
        : "After oil, wheel, battery, or filter work, save mileage through Maintenance so Garage has the receipt.",
      href: "maintenance.html#service-closeout",
      action: "Open Closeout"
    },
    {
      status: diagnosticReady ? "done" : "next",
      label: diagnosticReady ? "Warning note ready" : "Capture warning wording",
      title: "Diagnostic Memory",
      detail: diagnosticReady
        ? `${warningLightSummary.count} warning-light field${warningLightSummary.count === 1 ? "" : "s"} saved for repeat issues.`
        : "Record exact dash light wording, MID text, recent service context, and next action before details fade.",
      href: "#warning-light-template",
      action: "Open Warning Note"
    },
    {
      status: photoReady ? "done" : "next",
      label: photoReady ? "Area context saved" : "Add area photos",
      title: "Photo And Area Notes",
      detail: photoReady
        ? `${areaPhotos} area photo${areaPhotos === 1 ? "" : "s"} and ${areaNotes} area note${areaNotes === 1 ? "" : "s"} are tied to the truck.`
        : "Capture hood labels, cabin fuse references, bed setup, or hitch adapter photos from the area journals.",
      href: "photo-atlas.html#photo-capture-plan",
      action: "Open Capture Plan"
    }
  ];
  const completedItems = checklistItems.filter((item) => item.status === "done");
  const nextItem = checklistItems.find((item) => item.status !== "done") || checklistItems[0];
  const latestRecord = latestService
    ? {
        title: "Latest Service Record",
        detail: `${latestService.service ? latestService.service.replace(/_/g, " ") : "Service"}${
          latestService.mileage ? ` at ${Number(latestService.mileage).toLocaleString("en-US")} miles` : ""
        }`,
        href: "#maintenance-note-preview",
        action: "Review Maintenance"
      }
    : diagnosticReady
      ? {
          title: "Latest Diagnostic Memory",
          detail: `${warningLightSummary.title} - ${warningLightSummary.detail}`,
          href: "#diagnostic-activity",
          action: "Review Diagnostics"
        }
      : profileReady
        ? {
            title: "Truck Profile Ready",
            detail: `${profile.vehicle || "Ridgeline"} identity and parts notes are saved.`,
            href: "#truck-profile",
            action: "Review Profile"
          }
        : {
            title: "No fresh record yet",
            detail: "Use the next checklist card to start the Garage memory trail.",
            href: nextItem.href,
            action: nextItem.action
          };

  currentGarageFillPlan = {
    completed: completedItems.length,
    total: checklistItems.length,
    nextItem,
    latestRecord,
    text: [
      "Ridgeline Garage record plan",
      `Complete: ${completedItems.length}/${checklistItems.length}`,
      `Next: ${nextItem.title} - ${nextItem.detail}`,
      `Latest: ${latestRecord.title} - ${latestRecord.detail}`,
      latestMaintenanceNote
        ? `Latest maintenance handoff: ${latestMaintenanceNote.title} - ${latestMaintenanceNeed.length} need-to-buy line${latestMaintenanceNeed.length === 1 ? "" : "s"} remain.`
        : "Latest maintenance handoff: none saved yet.",
      "Backup note: Download Backup exports Garage notes, tracker, logs, favorites, profile, and photo metadata."
    ].join("\n")
  };

  garageSetupChecklist.innerHTML = `
    <div class="compact-section-head garage-setup-head">
      <div>
        <p class="eyebrow">Garage fill-in checklist</p>
        <h4>What To Record Next</h4>
      </div>
      <button class="utility-link" type="button" data-garage-fill-backup>Download Backup</button>
    </div>
    <p class="small-note">
      iPhone-first next steps for making Garage useful before service, diagnostics, parts runs, or phone cleanup. This checklist only reads existing Garage data.
    </p>
    <article class="garage-setup-snapshot" data-garage-fill-snapshot>
      <div>
        <span>Garage snapshot</span>
        <strong>${completedItems.length}/${checklistItems.length} record paths started</strong>
        <p>${escapeHtml(latestRecord.title)}: ${escapeHtml(latestRecord.detail)}</p>
      </div>
      <div class="garage-setup-next">
        <span>Next on this iPhone</span>
        <strong>${escapeHtml(nextItem.title)}</strong>
        <p>${escapeHtml(nextItem.detail)}</p>
      </div>
      <div class="garage-setup-actions">
        <a class="utility-link" href="${escapeHtml(nextItem.href)}" data-garage-fill-next>${escapeHtml(nextItem.action)}</a>
        <button class="utility-link" type="button" data-garage-fill-copy>Copy Plan</button>
        <button class="utility-link" type="button" data-garage-fill-share>Share Plan</button>
      </div>
    </article>
    ${
      latestMaintenanceNote
        ? `
          <article class="garage-setup-maintenance-handoff" data-garage-maintenance-handoff>
            <div>
              <span>Latest Maintenance Handoff</span>
              <strong>${escapeHtml(latestMaintenanceNote.title)}</strong>
              <p>${escapeHtml(latestMaintenanceNote.detail)}</p>
              <p class="small-note">
                ${escapeHtml(
                  latestMaintenanceNeed.length
                    ? `${latestMaintenanceNeed.length} need-to-buy line${latestMaintenanceNeed.length === 1 ? "" : "s"} still open on this iPhone.`
                    : latestMaintenanceNote.stagingItems?.length
                      ? "All detected staging lines for this saved note are marked staged on this iPhone."
                      : "This saved note did not produce parts or supplies staging lines."
                )}
              </p>
            </div>
            <div class="garage-setup-actions">
              <button class="utility-link" type="button" data-garage-fill-copy-latest-maintenance>Copy Note</button>
              <button class="utility-link" type="button" data-garage-fill-copy-latest-buy ${latestMaintenanceNeed.length ? "" : "disabled"}>Copy Need</button>
              <a class="utility-link" href="#maintenance-note-preview">Open Staging</a>
            </div>
          </article>
        `
        : ""
    }
    <div class="garage-setup-grid">
      ${checklistItems
        .map(
          (item) => `
            <article class="garage-setup-card is-${item.status}">
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.title)}</strong>
              <p>${escapeHtml(item.detail)}</p>
              <a class="utility-link" href="${escapeHtml(item.href)}">${escapeHtml(item.action)}</a>
            </article>
          `
        )
        .join("")}
    </div>
    <p class="small-note garage-setup-boundary">
      ${stagingReady ? "Parts staging remains local-only unless you save a Garage note." : "Save planner notes from Maintenance to unlock parts staging."} Download Backup exports Garage notes, tracker, logs, favorites, profile, and photo metadata.
    </p>
    <p class="small-note garage-setup-status" data-garage-fill-status aria-live="polite"></p>
  `;
}

function setGarageFillStatus(message = "") {
  const status = garageSetupChecklist?.querySelector("[data-garage-fill-status]");
  if (status) {
    status.textContent = message;
  }
}

function copyGarageFillPlan() {
  if (!currentGarageFillPlan?.text) {
    setGarageFillStatus("Garage record plan is not ready yet.");
    return;
  }

  setGarageFillStatus("Copying Garage record plan...");
  copyText(currentGarageFillPlan.text)
    .then(() => setGarageFillStatus("Garage record plan copied."))
    .catch(() => setGarageFillStatus("Could not copy the Garage record plan automatically."));
}

function shareGarageFillPlan() {
  if (!currentGarageFillPlan?.text) {
    setGarageFillStatus("Garage record plan is not ready yet.");
    return;
  }

  if (navigator.share) {
    navigator
      .share({
        title: "Ridgeline Garage record plan",
        text: currentGarageFillPlan.text
      })
      .then(() => setGarageFillStatus("Garage record plan shared."))
      .catch((error) => {
        if (error?.name === "AbortError") {
          setGarageFillStatus("Share canceled.");
          return;
        }
        copyText(currentGarageFillPlan.text)
          .then(() => setGarageFillStatus("Share was unavailable, so the Garage record plan was copied."))
          .catch(() => setGarageFillStatus("Could not share or copy the Garage record plan automatically."));
      });
    return;
  }

  copyText(currentGarageFillPlan.text)
    .then(() => setGarageFillStatus("Share is unavailable here, so the Garage record plan was copied."))
    .catch(() => setGarageFillStatus("Could not share or copy the Garage record plan automatically."));
}

function copyGarageLatestMaintenanceNote() {
  const item = getMaintenanceNoteItems()[0];
  if (!item) {
    setGarageFillStatus("No saved maintenance planner note is ready to copy yet.");
    return;
  }

  copyText(item.copyText)
    .then(() => setGarageFillStatus(`Copied latest maintenance handoff: ${item.title}.`))
    .catch(() => setGarageFillStatus("Could not copy the latest maintenance handoff automatically."));
}

function copyGarageLatestMaintenanceNeed() {
  const { text, count } = maintenanceStagingExport({ index: 0, status: "need" });
  if (!text) {
    setGarageFillStatus("No need-to-buy lines remain on the latest maintenance handoff.");
    return;
  }

  copyText(text)
    .then(() =>
      setGarageFillStatus(`Copied latest maintenance need list with ${count} item${count === 1 ? "" : "s"}.`)
    )
    .catch(() => setGarageFillStatus("Could not copy the latest maintenance need list automatically."));
}

function setRecentHandoffStatus(message = "") {
  if (recentHandoffStatus) {
    recentHandoffStatus.textContent = message;
  }
}

function renderRecentHandoffs(items = getRecentHandoffItems()) {
  if (!recentHandoffList) {
    return;
  }

  setRecentHandoffStatus(items.length ? `Showing ${items.length} recent saved handoff${items.length === 1 ? "" : "s"}.` : "");
  if (recentHandoffCopyButton) {
    recentHandoffCopyButton.disabled = !items.length;
  }

  if (!items.length) {
    recentHandoffList.innerHTML = `
      <article class="roadside-note-empty">
        <strong>No saved handoffs yet.</strong>
        <p>Save a roadside note, diagnostic handoff, tire pressure recheck, fuse checklist, or trailer light test, then recover it here before opening the full notes form.</p>
        <div class="inspector-actions">
          <a class="utility-link" href="quick-sheet.html#roadside-action-stack">Open Quick Sheet</a>
          <a class="utility-link" href="diagnostics.html#diagnostic-share-builder">Open Diagnostics</a>
          <a class="utility-link" href="tires.html#tire-recheck-planner">Open Tire Recheck</a>
        </div>
      </article>
    `;
    return;
  }

  recentHandoffList.innerHTML = items
    .map(
      (item, index) => `
        <article class="roadside-note-item">
          <span>${escapeHtml(item.source)} / ${escapeHtml(item.meta)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.detail)}</p>
          <div class="maintenance-note-actions">
            <button class="utility-link" type="button" data-copy-recent-handoff-index="${index}">Copy Handoff</button>
            <a class="utility-link" href="${escapeHtml(item.href)}">Open Source</a>
            <a class="utility-link" href="#notes">Open Full Note</a>
          </div>
        </article>
      `
    )
    .join("");
}

function copyRecentHandoff(index = 0) {
  const item = getRecentHandoffItems()[index];
  if (!item) {
    setRecentHandoffStatus("No saved handoff is ready to copy yet.");
    return;
  }

  copyText(item.copyText)
    .then(() => setRecentHandoffStatus(`Copied ${item.title}.`))
    .catch(() => setRecentHandoffStatus("Could not copy automatically. Open the full note and copy it manually."));
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
        <article class="maintenance-note-item${index === 0 && currentMaintenanceStageHandoff ? " is-fresh-maintenance-note" : ""}">
          ${index === 0 && currentMaintenanceStageHandoff ? '<span class="maintenance-note-fresh">Just saved</span>' : ""}
          <span>${escapeHtml(item.meta)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.detail)}</p>
          ${
            item.stagingItems?.length
              ? `<span class="maintenance-note-staging-state">${item.stagingItems.length} staging line${item.stagingItems.length === 1 ? "" : "s"} detected</span>`
              : '<span class="maintenance-note-staging-state is-empty">No staging lines detected</span>'
          }
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

function copyMaintenanceNeedList(index = null) {
  const { text, count } = maintenanceStagingExport({ index, status: "need" });
  if (!text) {
    setMaintenanceNoteStatus(Number.isInteger(index) ? "All items in this saved note are already marked staged." : "All saved staging items are already marked staged.");
    return;
  }

  copyText(text)
    .then(() => {
      setMaintenanceNoteStatus(
        Number.isInteger(index)
          ? `Copied saved-note buy list with ${count} item${count === 1 ? "" : "s"}.`
          : `Copied need-to-buy list with ${count} item${count === 1 ? "" : "s"}.`
      );
    })
    .catch(() => {
      setMaintenanceNoteStatus("Could not copy the need-to-buy list automatically. Open the staging list and copy it manually.");
    });
}

function copyMaintenanceStagedList(index = null) {
  const { text, count } = maintenanceStagingExport({ index, status: "staged" });
  if (!text) {
    setMaintenanceNoteStatus(Number.isInteger(index) ? "No staged items found in this saved note yet." : "No staged maintenance items are ready to copy yet.");
    return;
  }

  copyText(text)
    .then(() => {
      setMaintenanceNoteStatus(
        Number.isInteger(index)
          ? `Copied saved-note staged list with ${count} item${count === 1 ? "" : "s"}.`
          : `Copied staged list with ${count} item${count === 1 ? "" : "s"}.`
      );
    })
    .catch(() => {
      setMaintenanceNoteStatus("Could not copy the staged list automatically. Open the staging list and copy it manually.");
    });
}

function saveMaintenanceRunNote() {
  const { text, count } = maintenanceStagingExport();
  if (!text) {
    setMaintenanceNoteStatus("No maintenance staging items are ready to save yet.");
    return;
  }

  const notes = loadJson(STORAGE.notes, {});
  const timestamp = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
  const existing = `${notes.general_notes || ""}`.trim();
  const savedNote = [
    `[${timestamp} - Maintenance Staging Run]`,
    text,
    "",
    "Saved from Garage staging. Need/Staged toggles remain local browser state outside Garage backup and sync."
  ].join("\n");

  saveJson(STORAGE.notes, {
    ...notes,
    general_notes: existing ? `${savedNote}\n\n${existing}` : savedNote
  });
hydrateGarageForms();
onOwnerAuthChange(() => {
  if (profileForm) {
    hydrateForm(profileForm, redactedProfile(loadJson(STORAGE.profile, defaultProfile)));
  }
  renderProfileSummary();
  renderDashboard();
});
  renderDashboard();
  setMaintenanceNoteStatus(`Saved staging run note with ${count} item${count === 1 ? "" : "s"} into Garage Notes.`);
}

function saveMaintenanceNeedNote(index = null) {
  const { text, count } = maintenanceStagingExport({ index, status: "need" });
  if (!text) {
    setMaintenanceNoteStatus(Number.isInteger(index) ? "All items in this saved note are already marked staged." : "All saved staging items are already marked staged.");
    return;
  }

  const item = Number.isInteger(index) ? getMaintenanceNoteItems()[index] : null;
  const notes = loadJson(STORAGE.notes, {});
  const timestamp = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
  const existing = `${notes.general_notes || ""}`.trim();
  const savedNote = [
    `[${timestamp} - ${item?.title ? "Job Buy List" : "Maintenance Buy List"}]`,
    ...(item?.title ? [`Source saved note: ${item.title}`, ""] : []),
    text,
    "",
    "Saved from Garage staging as a remaining-purchases snapshot. Need/Staged toggles remain local browser state outside Garage backup and sync."
  ].join("\n");

  saveJson(STORAGE.notes, {
    ...notes,
    general_notes: existing ? `${savedNote}\n\n${existing}` : savedNote
  });
  hydrateGarageForms();
  renderDashboard();
  setMaintenanceNoteStatus(
    Number.isInteger(index)
      ? `Saved ${item?.title || "saved-note"} buy note with ${count} need-to-buy item${count === 1 ? "" : "s"} into Garage Notes.`
      : `Saved buy note with ${count} need-to-buy item${count === 1 ? "" : "s"} into Garage Notes.`
  );
}

function fillMaintenanceFinalPartsDraft(status = "need") {
  const isStagedDraft = status === "staged";
  const lines = maintenanceStagingPlainLines(isStagedDraft ? "staged" : "need");
  if (!lines.length) {
    setMaintenanceNoteStatus(
      isStagedDraft
        ? "No staged lines are available to use as a final-parts draft."
        : "No need-to-buy lines are available to use as a final-parts draft."
    );
    return;
  }

  maintenanceFinalPartsDraft = lines.map((line) => `${line} -> `).join("\n");
  renderMaintenancePartsPreview();
  const input = maintenancePartsPreview?.querySelector("[data-maintenance-final-parts-input]");
  input?.focus();
  setMaintenanceNoteStatus(
    isStagedDraft
      ? "Staged lines were copied into the final-parts draft. Add confirmed part numbers before saving."
      : "Need-to-buy lines were copied into the final-parts draft. Add confirmed part numbers before saving."
  );
}

function saveMaintenanceFinalPartsToProfile() {
  const input = maintenancePartsPreview?.querySelector("[data-maintenance-final-parts-input]");
  const draft = `${input?.value || maintenanceFinalPartsDraft}`.trim();
  if (!draft) {
    setMaintenanceNoteStatus("Enter confirmed part numbers or notes before saving to Truck Profile.");
    input?.focus();
    return;
  }

  const profile = loadJson(STORAGE.profile, defaultProfile);
  const timestamp = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
  const existing = `${profile.parts_notes || ""}`.trim();
  const savedBlock = [
    `[${timestamp} - Maintenance Final Part Numbers]`,
    draft,
    "",
    "User-entered from Garage staging after final catalog, receipt, or truck-label verification."
  ].join("\n");

  saveJson(STORAGE.profile, {
    ...profile,
    parts_notes: existing ? `${savedBlock}\n\n${existing}` : savedBlock
  });
  maintenanceFinalPartsDraft = "";
  hydrateGarageForms();
  renderDashboard();
  renderMaintenancePartsPreview();
  setMaintenanceNoteStatus("Saved final part-number notes into Truck Profile.");
}

function shareMaintenanceNeedList(index = null) {
  const { text, count } = maintenanceStagingExport({ index, status: "need" });
  if (!text) {
    setMaintenanceNoteStatus(Number.isInteger(index) ? "All items in this saved note are already marked staged." : "All saved staging items are already marked staged.");
    return;
  }

  const item = Number.isInteger(index) ? getMaintenanceNoteItems()[index] : null;
  const title = item?.title ? `Ridgeline ${item.title} Buy List` : "Ridgeline Need-To-Buy Maintenance List";

  if (navigator.share) {
    navigator
      .share({
        title,
        text
      })
      .then(() => {
        setMaintenanceNoteStatus(
          Number.isInteger(index)
            ? `Shared saved-note buy list with ${count} item${count === 1 ? "" : "s"}.`
            : `Shared need-to-buy list with ${count} item${count === 1 ? "" : "s"}.`
        );
      })
      .catch((error) => {
        if (error?.name === "AbortError") {
          setMaintenanceNoteStatus("Share canceled.");
          return;
        }
        copyText(text)
          .then(() => {
            setMaintenanceNoteStatus(`Share was unavailable, so the ${count}-item buy list was copied.`);
          })
          .catch(() => {
            setMaintenanceNoteStatus("Could not share or copy the need-to-buy list automatically.");
          });
      });
    return;
  }

  copyText(text)
    .then(() => {
      setMaintenanceNoteStatus(`Share is unavailable here, so the ${count}-item buy list was copied.`);
    })
    .catch(() => {
      setMaintenanceNoteStatus("Could not share or copy the need-to-buy list automatically.");
    });
}

function shareMaintenanceStagedList(index = null) {
  const { text, count } = maintenanceStagingExport({ index, status: "staged" });
  if (!text) {
    setMaintenanceNoteStatus(Number.isInteger(index) ? "No staged items found in this saved note yet." : "No staged maintenance items are ready to share yet.");
    return;
  }

  const item = Number.isInteger(index) ? getMaintenanceNoteItems()[index] : null;
  const title = item?.title ? `Ridgeline ${item.title} Staged List` : "Ridgeline Staged Maintenance List";

  if (navigator.share) {
    navigator
      .share({
        title,
        text
      })
      .then(() => {
        setMaintenanceNoteStatus(
          Number.isInteger(index)
            ? `Shared saved-note staged list with ${count} item${count === 1 ? "" : "s"}.`
            : `Shared staged list with ${count} item${count === 1 ? "" : "s"}.`
        );
      })
      .catch((error) => {
        if (error?.name === "AbortError") {
          setMaintenanceNoteStatus("Share canceled.");
          return;
        }
        copyText(text)
          .then(() => {
            setMaintenanceNoteStatus(`Share was unavailable, so the ${count}-item staged list was copied.`);
          })
          .catch(() => {
            setMaintenanceNoteStatus("Could not share or copy the staged list automatically.");
          });
      });
    return;
  }

  copyText(text)
    .then(() => {
      setMaintenanceNoteStatus(`Share is unavailable here, so the ${count}-item staged list was copied.`);
    })
    .catch(() => {
      setMaintenanceNoteStatus("Could not share or copy the staged list automatically.");
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
garageSetupChecklist?.addEventListener("click", (event) => {
  const backupButton = event.target.closest("[data-garage-fill-backup]");
  if (backupButton) {
    downloadGarageBackup();
    return;
  }

  const copyButton = event.target.closest("[data-garage-fill-copy]");
  if (copyButton) {
    copyGarageFillPlan();
    return;
  }

  const shareButton = event.target.closest("[data-garage-fill-share]");
  if (shareButton) {
    shareGarageFillPlan();
    return;
  }

  const latestMaintenanceCopyButton = event.target.closest("[data-garage-fill-copy-latest-maintenance]");
  if (latestMaintenanceCopyButton) {
    copyGarageLatestMaintenanceNote();
    return;
  }

  const latestMaintenanceNeedButton = event.target.closest("[data-garage-fill-copy-latest-buy]");
  if (latestMaintenanceNeedButton) {
    copyGarageLatestMaintenanceNeed();
  }
});
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
  const kitButton = event.target.closest("[data-maintenance-custom-staging-kit]");
  if (kitButton) {
    addCustomMaintenanceStagingKit(kitButton.dataset.maintenanceCustomStagingKit || "");
    return;
  }

  const suggestionButton = event.target.closest("[data-maintenance-custom-staging-suggestion]");
  if (suggestionButton) {
    addCustomMaintenanceStagingItem(suggestionButton.dataset.maintenanceCustomStagingSuggestion || "");
    return;
  }

  const removeCustomButton = event.target.closest("[data-maintenance-custom-staging-remove]");
  if (removeCustomButton) {
    removeCustomMaintenanceStagingItem(removeCustomButton.dataset.maintenanceCustomStagingRemove || "");
    return;
  }

  const clearCustomButton = event.target.closest("[data-maintenance-custom-staging-clear]");
  if (clearCustomButton) {
    clearCustomMaintenanceStagingItems();
    return;
  }

  const filterButton = event.target.closest("[data-maintenance-staging-filter]");
  if (filterButton) {
    currentMaintenanceStagingFilter = filterButton.dataset.maintenanceStagingFilter || "all";
    if (currentMaintenanceStagingFilter !== "need") {
      currentMaintenanceCounterMode = false;
      maintenanceCounterLastStaged = null;
      maintenanceCounterSkippedKeys = [];
    }
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

  const dismissStageConfirmationButton = event.target.closest("[data-dismiss-maintenance-stage-confirmation]");
  if (dismissStageConfirmationButton) {
    currentMaintenanceStageHandoff = null;
    sessionStorage.removeItem(MAINTENANCE_STAGE_HANDOFF_KEY);
    renderMaintenancePartsPreview();
    setMaintenanceNoteStatus("Dismissed the one-visit Maintenance handoff receipt. Saved notes and staging items are still here.");
    return;
  }

  const finalPartsInput = event.target.closest("[data-maintenance-final-parts-input]");
  if (finalPartsInput) {
    maintenanceFinalPartsDraft = finalPartsInput.value;
    return;
  }

  const bulkButton = event.target.closest("[data-maintenance-staging-bulk]");
  if (bulkButton) {
    updateMaintenanceStagingBulk(bulkButton.dataset.maintenanceStagingBulk || "");
    return;
  }

  const finalPartsFillButton = event.target.closest("[data-maintenance-final-parts-fill]");
  if (finalPartsFillButton) {
    fillMaintenanceFinalPartsDraft(finalPartsFillButton.dataset.maintenanceFinalPartsFill || "need");
    return;
  }

  const finalPartsSaveButton = event.target.closest("[data-maintenance-final-parts-save]");
  if (finalPartsSaveButton) {
    saveMaintenanceFinalPartsToProfile();
    return;
  }

  const inlineNeededButton = event.target.closest("[data-copy-maintenance-needed-inline]");
  if (inlineNeededButton) {
    copyMaintenanceNeedList();
    return;
  }

  const inlineStagedButton = event.target.closest("[data-copy-maintenance-staged-inline]");
  if (inlineStagedButton) {
    copyMaintenanceStagedList();
    return;
  }

  const counterModeButton = event.target.closest("[data-maintenance-counter-mode]");
  if (counterModeButton) {
    startMaintenanceCounterMode();
    return;
  }

  const counterMarkNextButton = event.target.closest("[data-maintenance-counter-mark-next]");
  if (counterMarkNextButton) {
    markNextMaintenanceCounterItemStaged();
    return;
  }

  const counterSkipNextButton = event.target.closest("[data-maintenance-counter-skip-next]");
  if (counterSkipNextButton) {
    skipNextMaintenanceCounterItem();
    return;
  }

  const counterCopyNextButton = event.target.closest("[data-maintenance-counter-copy-next]");
  if (counterCopyNextButton) {
    copyNextMaintenanceCounterItem();
    return;
  }

  const counterShareNextButton = event.target.closest("[data-maintenance-counter-share-next]");
  if (counterShareNextButton) {
    shareNextMaintenanceCounterItem();
    return;
  }

  const counterUndoButton = event.target.closest("[data-maintenance-counter-undo]");
  if (counterUndoButton) {
    undoLastMaintenanceCounterItem();
    return;
  }

  const counterResetSkipsButton = event.target.closest("[data-maintenance-counter-reset-skips]");
  if (counterResetSkipsButton) {
    resetMaintenanceCounterSkips();
    return;
  }

  const counterFinalPartsButton = event.target.closest("[data-maintenance-counter-final-parts]");
  if (counterFinalPartsButton) {
    openCounterFinalParts();
    return;
  }

  const counterDraftStagedButton = event.target.closest("[data-maintenance-counter-draft-staged]");
  if (counterDraftStagedButton) {
    draftCounterStagedFinalParts();
    return;
  }

  const counterExitButton = event.target.closest("[data-maintenance-counter-exit]");
  if (counterExitButton) {
    exitMaintenanceCounterMode();
    return;
  }

  const itemNeededButton = event.target.closest("[data-copy-maintenance-needed-index]");
  if (itemNeededButton) {
    copyMaintenanceNeedList(Number(itemNeededButton.dataset.copyMaintenanceNeededIndex || 0));
    return;
  }

  const inlineShareButton = event.target.closest("[data-share-maintenance-needed-inline]");
  if (inlineShareButton) {
    shareMaintenanceNeedList();
    return;
  }

  const inlineShareStagedButton = event.target.closest("[data-share-maintenance-staged-inline]");
  if (inlineShareStagedButton) {
    shareMaintenanceStagedList();
    return;
  }

  const itemShareButton = event.target.closest("[data-share-maintenance-needed-index]");
  if (itemShareButton) {
    shareMaintenanceNeedList(Number(itemShareButton.dataset.shareMaintenanceNeededIndex || 0));
    return;
  }

  const inlineSaveRunButton = event.target.closest("[data-save-maintenance-run-inline]");
  if (inlineSaveRunButton) {
    saveMaintenanceRunNote();
    return;
  }

  const inlineSaveNeededButton = event.target.closest("[data-save-maintenance-needed-inline]");
  if (inlineSaveNeededButton) {
    saveMaintenanceNeedNote();
    return;
  }

  const itemSaveNeededButton = event.target.closest("[data-save-maintenance-needed-index]");
  if (itemSaveNeededButton) {
    saveMaintenanceNeedNote(Number(itemSaveNeededButton.dataset.saveMaintenanceNeededIndex || 0));
    return;
  }

  const groupBulkButton = event.target.closest("[data-maintenance-staging-group-bulk]");
  if (groupBulkButton) {
    updateMaintenanceStagingGroup(
      Number(groupBulkButton.dataset.maintenanceStagingGroupIndex || 0),
      groupBulkButton.dataset.maintenanceStagingGroupBulk || "",
      groupBulkButton.dataset.maintenanceStagingGroupTitle || ""
    );
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
maintenancePartsPreview?.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-maintenance-custom-staging-form]");
  if (!form) {
    return;
  }

  event.preventDefault();
  const input = form.querySelector("[data-maintenance-custom-staging-input]");
  if (addCustomMaintenanceStagingItem(input?.value || "") && input) {
    input.value = "";
  }
});
maintenancePartsPreview?.addEventListener("input", (event) => {
  const input = event.target.closest("[data-maintenance-final-parts-input]");
  if (input) {
    maintenanceFinalPartsDraft = input.value;
  }
});
maintenanceNotePreview?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-copy-maintenance-parts-index]");
  if (!button) {
    return;
  }

  copyMaintenanceStaging(Number(button.dataset.copyMaintenancePartsIndex || 0));
});
recentHandoffList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-copy-recent-handoff-index]");
  if (!button) {
    return;
  }

  copyRecentHandoff(Number(button.dataset.copyRecentHandoffIndex || 0));
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
