import {
  initGarageCloudSync,
  loadJson,
  saveJson,
  STORAGE
} from "./garage-data.js";

const updateForm = document.querySelector("[data-maintenance-update-form]");
const updateStatus = document.querySelector("[data-maintenance-update-status]");
const updateList = document.querySelector("[data-maintenance-update-list]");

const serviceLabels = {
  oil_change: "Oil change",
  tire_rotation: "Tire rotation",
  brake_service: "Brake service",
  trans_service: "Transmission service",
  battery_install: "Battery install",
  filters: "Air filters",
  timing_belt_service: "Timing belt service",
  trailer_wiring: "Trailer wiring check",
  general_note: "General note"
};

function formatMileage(value) {
  const mileage = Number(value);
  if (!Number.isFinite(mileage) || mileage <= 0) {
    return "";
  }

  return `${Math.round(mileage).toLocaleString("en-US")} miles`;
}

function renderRecentUpdates() {
  if (!updateList) {
    return;
  }

  const entries = loadJson(STORAGE.maintenanceLog, []);
  updateList.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "small-note";
    empty.textContent = "No quick maintenance updates saved yet.";
    updateList.appendChild(empty);
    return;
  }

  entries.slice(0, 4).forEach((entry) => {
    const card = document.createElement("article");
    card.className = "quick-update-entry";
    const meta = document.createElement("span");
    meta.textContent = `${entry.date || ""} / ${entry.mileageText || ""}`;
    const title = document.createElement("strong");
    title.textContent = serviceLabels[entry.service] || "Maintenance update";
    card.append(meta, title);
    if (entry.note) {
      const note = document.createElement("p");
      note.textContent = entry.note;
      card.appendChild(note);
    }
    updateList.appendChild(card);
  });
}

function appendGarageNote(entry) {
  const notes = loadJson(STORAGE.notes, {});
  const label = serviceLabels[entry.service] || "Maintenance update";
  const line = `[${entry.date} / ${entry.mileageText} - ${label}]${entry.note ? ` ${entry.note}` : ""}`;
  const existing = notes.general_notes || "";
  notes.general_notes = existing ? `${line}\n${existing}` : line;
  saveJson(STORAGE.notes, notes);
}

function saveQuickUpdate(event) {
  event.preventDefault();
  const formData = new FormData(updateForm);
  const mileageText = formatMileage(formData.get("mileage"));
  const service = formData.get("service") || "general_note";
  const note = `${formData.get("note") || ""}`.trim();

  if (!mileageText) {
    updateStatus.textContent = "Enter the current mileage first.";
    return;
  }

  const date = new Date().toLocaleDateString("en-US");
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    date,
    mileageText,
    mileage: Number(formData.get("mileage")),
    service,
    note
  };

  const entries = loadJson(STORAGE.maintenanceLog, []);
  saveJson(STORAGE.maintenanceLog, [entry, ...entries].slice(0, 80));

  if (service !== "general_note") {
    const tracker = loadJson(STORAGE.tracker, {});
    tracker[service] = `${date} / ${mileageText}`;
    saveJson(STORAGE.tracker, tracker);
  }

  appendGarageNote(entry);
  updateForm.reset();
  renderRecentUpdates();
  updateStatus.textContent = `${serviceLabels[service]} saved at ${mileageText} on ${date}.`;
}

updateForm?.addEventListener("submit", saveQuickUpdate);

window.addEventListener("ridgeline:storage-hydrated", renderRecentUpdates);
renderRecentUpdates();
initGarageCloudSync();
