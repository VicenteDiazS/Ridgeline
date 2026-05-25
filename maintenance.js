import {
  initGarageCloudSync,
  loadJson,
  saveJson,
  STORAGE
} from "./garage-data.js";

const updateForm = document.querySelector("[data-maintenance-update-form]");
const updateStatus = document.querySelector("[data-maintenance-update-status]");
const updateList = document.querySelector("[data-maintenance-update-list]");
const updateReceipt = document.querySelector("[data-maintenance-save-receipt]");
const servicePrepCards = [...document.querySelectorAll("[data-service-prep-card]")];
const closeoutButtons = [...document.querySelectorAll("[data-closeout-service]")];
const closeoutForm = document.querySelector("[data-service-closeout-form]");
const closeoutStatus = document.querySelector("[data-service-closeout-status]");
const followupForm = document.querySelector("[data-service-followup-form]");
const followupButtons = [...document.querySelectorAll("[data-followup-service]")];
const followupStatus = document.querySelector("[data-service-followup-status]");
const serviceRunPackForm = document.querySelector("[data-service-run-pack-form]");
const serviceRunPackStatus = document.querySelector("[data-service-run-pack-status]");
const minderPlanner = document.querySelector("#minder-pocket-planner");
const minderInput = document.querySelector("[data-minder-code-input]");
const minderOutput = document.querySelector("[data-minder-plan-output]");
const minderStatus = document.querySelector("[data-minder-plan-status]");
const GARAGE_MAINTENANCE_STAGING_URL = "garage.html#maintenance-note-preview";
const MAINTENANCE_STAGE_HANDOFF_KEY = "ridgeline-maintenance-stage-handoff";
const SERVICE_RUN_PACK_DRAFT_KEY = "ridgeline-service-run-pack";

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

const minderMainItems = {
  A: "Replace engine oil.",
  B: "Replace engine oil and oil filter; inspect brakes, parking brake adjustment, steering, suspension, driveshaft boots, brake hoses and lines including ABS/VSA, fluid levels and condition, exhaust system, and fuel lines and connections."
};

const minderSubItems = {
  1: "Rotate tires.",
  2: "Replace engine air filter, replace cabin dust/pollen filter, and inspect drive belt.",
  3: "Replace transmission fluid. Transfer fluid is listed by Honda, but does not apply to your 2WD truck.",
  4: "Replace spark plugs, replace timing belt and inspect water pump, and inspect valve clearance.",
  5: "Replace engine coolant.",
  6: "Replace rear differential fluid. This does not apply to your 2WD truck."
};

let lastMinderPlanText = "";
let lastMinderPlanCode = "";
let lastUpdateReceiptText = "";
let selectedCloseout = null;
let selectedFollowup = null;
let lastServiceRunPackText = "";

const followupPresets = {
  oil_change: {
    title: "Oil change follow-up",
    summary: "Recheck oil level, drain/filter area, reminder reset, and the saved mileage note after the next drive.",
    checks: ["Final oil level looks correct", "Drain bolt and filter area are dry", "Reminder reset or dashboard message checked", "Garage note has oil/filter details"]
  },
  tire_rotation: {
    title: "Wheel/tire follow-up",
    summary: "Recheck torque, cold pressure, steering feel, and any rotation or flat-tire symptoms after driving.",
    checks: ["Wheel torque rechecked", "Cold pressure rechecked", "No new vibration or pull noticed", "Rotation or wheel-work note saved"]
  },
  battery_install: {
    title: "Battery service follow-up",
    summary: "Recheck starts, terminal condition, warning lights, and battery label or warranty details.",
    checks: ["Starts normally after sitting", "Terminals look tight and clean", "No new warning lights noted", "Battery label and warranty saved"]
  },
  filters: {
    title: "Filter service follow-up",
    summary: "Recheck filter fitment, airbox or glove-box closure, noise, and saved part numbers.",
    checks: ["Airbox or glove box fully closed", "No new noise or airflow issue noticed", "Old/new part numbers saved", "Access clips or tabs rechecked"]
  }
};

const servicePrepCardTitles = {
  oil_change: "Oil Change Prep",
  tire_rotation: "Wheel And Tire Prep",
  battery_install: "Battery Service Prep",
  filters: "Filter Service Prep"
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
  const label = serviceLabels[entry.service] || "Maintenance update";
  const line = `[${entry.date} / ${entry.mileageText} - ${label}]${entry.note ? ` ${entry.note}` : ""}`;
  prependGarageGeneralNote(line);
}

function maintenanceReceiptText(entry) {
  const label = serviceLabels[entry.service] || "Maintenance update";
  return [
    `Ridgeline maintenance receipt: ${label}`,
    `Date: ${entry.date}`,
    `Mileage: ${entry.mileageText}`,
    entry.note ? `Note: ${entry.note}` : "Note: none entered",
    "Saved to: Maintenance log and Garage Notes"
  ].join("\n");
}

function followupText() {
  const preset = followupPresets[selectedFollowup] || followupPresets.oil_change;
  const label = serviceLabels[selectedFollowup] || "Maintenance follow-up";
  const timing = followupForm?.elements.followup_timing?.value || "next drive";
  const mileage = formatMileage(followupForm?.elements.followup_mileage?.value);
  const note = `${followupForm?.elements.followup_note?.value || ""}`.trim();
  const checked = [...(followupForm?.querySelectorAll("[data-service-followup-check]") || [])]
    .filter((item) => item.checked)
    .map((item) => `- ${item.value}`);
  const checks = checked.length ? checked : preset.checks.map((item) => `- ${item}`);
  return [
    `Ridgeline service follow-up: ${label}`,
    `Recheck: ${timing}`,
    mileage ? `Mileage: ${mileage}` : "Mileage: not entered",
    note ? `Owner note: ${note}` : "Owner note: none entered",
    "Checks:",
    ...checks,
    "Save path: Garage Notes"
  ].join("\n");
}

function getServiceRunPrepLines(service) {
  const title = servicePrepCardTitles[service] || "";
  const card = servicePrepCards.find((item) => item.dataset.servicePrepTitle === title);
  if (!card) {
    return ["- No matching prep card selected"];
  }

  const checked = [...card.querySelectorAll("[data-service-prep-item]")]
    .filter((item) => item.checked)
    .map((item) => `- ${item.value}`);
  return checked.length ? checked : ["- No prep boxes checked yet"];
}

function serviceRunPackText() {
  if (!serviceRunPackForm) {
    return "";
  }

  const service = serviceRunPackForm.elements.pack_service?.value || "general_note";
  const label = serviceLabels[service] || "General service";
  const mileage = formatMileage(serviceRunPackForm.elements.pack_mileage?.value);
  const minderCode = `${serviceRunPackForm.elements.pack_minder?.value || minderInput?.value || ""}`.trim().toUpperCase();
  const contact = `${serviceRunPackForm.elements.pack_contact?.value || ""}`.trim();
  const note = `${serviceRunPackForm.elements.pack_note?.value || ""}`.trim();
  const question = `${serviceRunPackForm.elements.pack_question?.value || ""}`.trim();
  const prepLines = getServiceRunPrepLines(service);

  return [
    `Ridgeline service run pack: ${label}`,
    mileage ? `Mileage: ${mileage}` : "Mileage: not entered",
    minderCode ? `Dash/Minder code: ${minderCode}` : "Dash/Minder code: not entered",
    contact ? `Counter/callback: ${contact}` : "Counter/callback: not entered",
    note ? `Owner detail: ${note}` : "Owner detail: none entered",
    question ? `Question: ${question}` : "Question: Verify parts, fitment, condition, and closeout needs before buying or saving final notes.",
    "Checked prep:",
    ...prepLines,
    "Save path: Garage Notes"
  ].join("\n");
}

function persistServiceRunPackDraft() {
  if (!serviceRunPackForm) {
    return;
  }

  const draft = {
    service: serviceRunPackForm.elements.pack_service?.value || "general_note",
    mileage: serviceRunPackForm.elements.pack_mileage?.value || "",
    minder: serviceRunPackForm.elements.pack_minder?.value || "",
    contact: serviceRunPackForm.elements.pack_contact?.value || "",
    note: serviceRunPackForm.elements.pack_note?.value || "",
    question: serviceRunPackForm.elements.pack_question?.value || "",
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(SERVICE_RUN_PACK_DRAFT_KEY, JSON.stringify(draft));
}

function renderServiceRunPackPreview() {
  const preview = serviceRunPackForm?.querySelector("[data-service-run-pack-preview]");
  if (!preview) {
    return;
  }

  lastServiceRunPackText = serviceRunPackText();
  const lines = lastServiceRunPackText.split("\n");
  preview.innerHTML = "";
  const title = document.createElement("strong");
  title.textContent = lines[0] || "Ridgeline service run pack";
  const meta = document.createElement("p");
  meta.textContent = lines.slice(1, 6).join(" / ");
  const prep = document.createElement("ul");
  prep.className = "highlight-list";
  lines.slice(lines.indexOf("Checked prep:") + 1, -1).forEach((line) => {
    const item = document.createElement("li");
    item.textContent = line.replace(/^- /, "");
    prep.appendChild(item);
  });
  preview.append(title, meta, prep);
}

function renderUpdateReceipt(entry) {
  if (!updateReceipt || !entry) {
    return;
  }

  const label = serviceLabels[entry.service] || "Maintenance update";
  lastUpdateReceiptText = maintenanceReceiptText(entry);
  updateReceipt.hidden = false;
  updateReceipt.querySelector("[data-maintenance-receipt-title]").textContent = `${label} saved`;
  updateReceipt.querySelector("[data-maintenance-receipt-summary]").textContent = entry.note || "No note entered. The mileage and service type were still saved.";
  updateReceipt.querySelector("[data-maintenance-receipt-meta]").textContent = `${entry.date} / ${entry.mileageText} / Garage Notes updated`;
}

function selectFollowupService(service = "oil_change", { mileage = "", announce = false } = {}) {
  if (!followupForm || !followupButtons.length) {
    return;
  }

  selectedFollowup = followupPresets[service] ? service : "oil_change";
  const preset = followupPresets[selectedFollowup];
  followupButtons.forEach((button) => {
    const active = button.dataset.followupService === selectedFollowup;
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });

  followupForm.querySelector("[data-service-followup-title]").textContent = preset.title;
  followupForm.querySelector("[data-service-followup-summary]").textContent = preset.summary;
  const mileageField = followupForm.querySelector("[data-service-followup-mileage]");
  if (mileageField && mileage) {
    mileageField.value = `${mileage}`.replace(/[^\d]/g, "");
  }

  const checks = followupForm.querySelector("[data-service-followup-checks]");
  if (checks) {
    checks.innerHTML = "";
    preset.checks.forEach((item, index) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = item;
      input.dataset.serviceFollowupCheck = "";
      input.checked = index < 2;
      label.append(input, item);
      checks.appendChild(label);
    });
  }

  if (announce && followupStatus) {
    followupStatus.textContent = `${preset.title} is ready. Adjust timing or notes, then save the follow-up.`;
  }
}

function setServiceRunPackService(service = "general_note") {
  const serviceField = serviceRunPackForm?.elements.pack_service;
  if (serviceField && [...serviceField.options].some((option) => option.value === service)) {
    serviceField.value = service;
    renderServiceRunPackPreview();
    persistServiceRunPackDraft();
  }
}

function saveMaintenanceEntry(entry) {
  const entries = loadJson(STORAGE.maintenanceLog, []);
  saveJson(STORAGE.maintenanceLog, [entry, ...entries].slice(0, 80));

  if (entry.service !== "general_note") {
    const tracker = loadJson(STORAGE.tracker, {});
    tracker[entry.service] = `${entry.date} / ${entry.mileageText}`;
    saveJson(STORAGE.tracker, tracker);
  }

  appendGarageNote(entry);
  renderRecentUpdates();
  renderUpdateReceipt(entry);
  selectFollowupService(entry.service, { mileage: entry.mileage, announce: true });
  setServiceRunPackService(entry.service);
}

function buildMaintenanceEntry({ mileage, service = "general_note", note = "" } = {}) {
  const mileageText = formatMileage(mileage);
  if (!mileageText) {
    return null;
  }

  const date = new Date().toLocaleDateString("en-US");
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    date,
    mileageText,
    mileage: Number(mileage),
    service,
    note: `${note || ""}`.trim()
  };
}

function prependGarageGeneralNote(line) {
  const notes = loadJson(STORAGE.notes, {});
  const existing = notes.general_notes || "";
  notes.general_notes = existing ? `${line}\n${existing}` : line;
  saveJson(STORAGE.notes, notes);
}

function copyTextFallback(value = "") {
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

function copyText(value = "") {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value).catch(() => copyTextFallback(value));
  }

  return copyTextFallback(value);
}

function parseMinderCode(value = "") {
  const normalized = `${value}`.toUpperCase().replace(/[^AB1-9]/g, "");
  const main = normalized.match(/[AB]/)?.[0] || "";
  const subItems = [...new Set([...normalized].filter((char) => /[1-9]/.test(char)))];
  const invalid = subItems.filter((char) => !minderSubItems[char]);
  return {
    original: normalized,
    main,
    subItems: subItems.filter((char) => minderSubItems[char]),
    invalid
  };
}

function renderMinderPlan(codeValue = "") {
  if (!minderOutput) {
    return;
  }

  const parsed = parseMinderCode(codeValue);
  minderOutput.innerHTML = "";
  if (minderStatus) {
    minderStatus.textContent = "";
  }

  if (!parsed.main && !parsed.subItems.length) {
    lastMinderPlanText = "";
    lastMinderPlanCode = "";
    minderOutput.textContent = "Enter A, B, or a combined code like B12. Sub-items are limited to 1-6 for this Ridgeline.";
    return;
  }

  const title = document.createElement("strong");
  title.textContent = `Maintenance Minder ${parsed.original || codeValue}`;
  const list = document.createElement("ul");
  list.className = "highlight-list";
  const lines = [`Maintenance Minder ${parsed.original || codeValue}:`];

  if (parsed.main) {
    const item = document.createElement("li");
    item.textContent = `${parsed.main}: ${minderMainItems[parsed.main]}`;
    list.appendChild(item);
    lines.push(`- ${parsed.main}: ${minderMainItems[parsed.main]}`);
  }

  parsed.subItems.forEach((code) => {
    const item = document.createElement("li");
    item.textContent = `${code}: ${minderSubItems[code]}`;
    list.appendChild(item);
    lines.push(`- ${code}: ${minderSubItems[code]}`);
  });

  if (parsed.invalid.length) {
    const invalid = document.createElement("p");
    invalid.className = "source-note";
    invalid.textContent = `Unsupported sub-code ignored: ${parsed.invalid.join(", ")}. This 2019 Ridgeline guide lists Maintenance Minder sub-items 1-6 only; brake fluid stays separate as a 3-year calendar item.`;
    minderOutput.append(title, list, invalid);
    lines.push(`- Ignored unsupported sub-code(s): ${parsed.invalid.join(", ")}.`);
  } else {
    minderOutput.append(title, list);
  }

  const note = document.createElement("p");
  note.className = "field-hint";
  note.textContent = "Use the Quick Maintenance Update after the work is complete; this planner does not predict mileage or add brake-fluid sub-codes.";
  minderOutput.appendChild(note);
  lines.push("Brake fluid: separate 3-year calendar item, not a Maintenance Minder sub-code.");
  lastMinderPlanText = lines.join("\n");
  lastMinderPlanCode = parsed.original || `${codeValue}`;
}

function currentMinderCode() {
  return parseMinderCode(minderInput?.value || "").original;
}

function minderPlanNeedsRefresh() {
  return !lastMinderPlanText || currentMinderCode() !== lastMinderPlanCode;
}

function servicePrepText(card) {
  const title = card.dataset.servicePrepTitle || "Service Prep";
  const items = [...card.querySelectorAll("[data-service-prep-item]")];
  const checkedItems = items.filter((item) => item.checked);
  const selected = checkedItems.length ? checkedItems : items;
  const lines = selected.map((item) => `- ${item.value}`);
  return [`${title}:`, ...lines].join("\n");
}

function saveServicePrepNote(card) {
  const title = card.dataset.servicePrepTitle || "Service Prep";
  const date = new Date().toLocaleDateString("en-US");
  const checkedCount = [...card.querySelectorAll("[data-service-prep-item]")].filter((item) => item.checked).length;
  prependGarageGeneralNote(`[${date} - ${title}]\n${servicePrepText(card)}`);
  return checkedCount;
}

function openMaintenanceStaging() {
  window.location.href = GARAGE_MAINTENANCE_STAGING_URL;
}

function recordMaintenanceStageHandoff(title = "Maintenance planner note", scope = "planner note") {
  try {
    sessionStorage.setItem(
      MAINTENANCE_STAGE_HANDOFF_KEY,
      JSON.stringify({
        title,
        scope,
        savedAt: Date.now()
      })
    );
  } catch {
    // Session storage is only used for a one-page confirmation after navigation.
  }
}

function setServicePrepStatus(card, message) {
  const status = card.querySelector("[data-service-prep-status]");
  if (status) {
    status.textContent = message;
  }
}

function initServicePrepCards() {
  servicePrepCards.forEach((card) => {
    card.querySelector("[data-copy-service-prep]")?.addEventListener("click", () => {
      copyText(servicePrepText(card))
        .then(() => setServicePrepStatus(card, "Prep copied. Checked items are included; if none are checked, the full card is copied."))
        .catch(() => setServicePrepStatus(card, "Could not copy automatically. Select the checklist text and copy it manually."));
    });

    card.querySelector("[data-save-service-prep]")?.addEventListener("click", () => {
      const checkedCount = saveServicePrepNote(card);
      const scope = checkedCount ? "checked prep items" : "full prep card";
      setServicePrepStatus(card, `${scope} saved to Garage Notes.`);
    });

    card.querySelector("[data-save-open-service-staging]")?.addEventListener("click", () => {
      const checkedCount = saveServicePrepNote(card);
      const scope = checkedCount ? "checked prep items" : "full prep card";
      recordMaintenanceStageHandoff(card.dataset.servicePrepTitle || "Service Prep", scope);
      setServicePrepStatus(card, `${scope} saved. Opening Garage staging...`);
      openMaintenanceStaging();
    });

    card.querySelector("[data-reset-service-prep]")?.addEventListener("click", () => {
      card.querySelectorAll("[data-service-prep-item]").forEach((item) => {
        item.checked = false;
      });
      setServicePrepStatus(card, "Checklist reset.");
      renderServiceRunPackPreview();
    });

    card.querySelectorAll("[data-service-prep-item]").forEach((item) => {
      item.addEventListener("change", renderServiceRunPackPreview);
    });
  });
}

function initServiceCloseout() {
  if (!updateForm || !closeoutButtons.length) {
    return;
  }

  const closeoutTitle = closeoutForm?.querySelector("[data-service-closeout-title]");
  const closeoutMileage = closeoutForm?.querySelector("[data-service-closeout-mileage]");
  const closeoutNote = closeoutForm?.querySelector("[data-service-closeout-note]");

  function closeoutText() {
    const label = serviceLabels[selectedCloseout?.service] || "Maintenance update";
    const mileage = formatMileage(closeoutMileage?.value);
    return [
      `Ridgeline service closeout: ${label}`,
      mileage ? `Mileage: ${mileage}` : "Mileage: enter before saving",
      closeoutNote?.value ? `Note: ${closeoutNote.value.trim()}` : "Note: none entered",
      "Save path: Maintenance log and Garage Notes"
    ].join("\n");
  }

  closeoutButtons.forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      const service = button.dataset.closeoutService || "general_note";
      const note = button.dataset.closeoutNote || "";
      const serviceField = updateForm.elements.service;
      const noteField = updateForm.elements.note;

      if (serviceField) {
        serviceField.value = service;
      }
      if (noteField && note) {
        noteField.value = note;
      }

      selectedCloseout = { service, note };
      setServiceRunPackService(service);
      closeoutButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-selected", active);
        item.setAttribute("aria-pressed", active ? "true" : "false");
      });

      const label = serviceLabels[service] || "Maintenance update";
      if (closeoutForm) {
        closeoutForm.hidden = false;
      }
      if (closeoutTitle) {
        closeoutTitle.textContent = `${label} closeout`;
      }
      if (closeoutNote && note) {
        closeoutNote.value = note;
      }
      window.setTimeout(() => closeoutMileage?.focus(), 120);
      if (closeoutStatus) {
        closeoutStatus.textContent = `${label} closeout is ready. Enter mileage here, edit the note if needed, then save.`;
      }
      if (updateStatus) {
        updateStatus.textContent = `${label} closeout selected from the Service Closeout panel. The full update form is also prefilled.`;
      }
    });
  });

  closeoutForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!selectedCloseout) {
      closeoutStatus.textContent = "Select the completed service first.";
      return;
    }

    const entry = buildMaintenanceEntry({
      mileage: closeoutMileage?.value,
      service: selectedCloseout.service,
      note: closeoutNote?.value || selectedCloseout.note
    });
    if (!entry) {
      closeoutStatus.textContent = "Enter the current mileage before saving the closeout.";
      closeoutMileage?.focus();
      return;
    }

    saveMaintenanceEntry(entry);
    closeoutMileage.value = "";
    const label = serviceLabels[entry.service] || "Maintenance update";
    closeoutStatus.textContent = `${label} saved at ${entry.mileageText}. Receipt is ready below.`;
    if (updateStatus) {
      updateStatus.textContent = `${label} saved at ${entry.mileageText} on ${entry.date}.`;
    }
  });

  closeoutForm?.querySelector("[data-copy-service-closeout]")?.addEventListener("click", () => {
    copyText(closeoutText())
      .then(() => {
        closeoutStatus.textContent = "Closeout note copied.";
      })
      .catch(() => {
        closeoutStatus.textContent = "Could not copy the closeout note automatically.";
      });
  });

  closeoutForm?.querySelector("[data-share-service-closeout]")?.addEventListener("click", async () => {
    const text = closeoutText();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline service closeout", text });
        closeoutStatus.textContent = "Closeout note shared.";
        return;
      }
      await copyText(text);
      closeoutStatus.textContent = "Share unavailable; closeout note copied instead.";
    } catch {
      closeoutStatus.textContent = "Share canceled or unavailable.";
    }
  });
}

function initServiceRunPack() {
  if (!serviceRunPackForm) {
    return;
  }

  const draft = loadJson(SERVICE_RUN_PACK_DRAFT_KEY, {});
  if (draft && typeof draft === "object") {
    if (draft.service && serviceRunPackForm.elements.pack_service) {
      serviceRunPackForm.elements.pack_service.value = draft.service;
    }
    ["mileage", "minder", "contact", "note", "question"].forEach((key) => {
      const field = serviceRunPackForm.elements[`pack_${key}`];
      if (field && draft[key]) {
        field.value = draft[key];
      }
    });
  }

  serviceRunPackForm.addEventListener("input", () => {
    renderServiceRunPackPreview();
    persistServiceRunPackDraft();
  });
  serviceRunPackForm.addEventListener("change", () => {
    renderServiceRunPackPreview();
    persistServiceRunPackDraft();
  });

  serviceRunPackForm.querySelector("[data-copy-service-run-pack]")?.addEventListener("click", () => {
    renderServiceRunPackPreview();
    copyText(lastServiceRunPackText)
      .then(() => {
        if (serviceRunPackStatus) {
          serviceRunPackStatus.textContent = "Service run pack copied.";
        }
      })
      .catch(() => {
        if (serviceRunPackStatus) {
          serviceRunPackStatus.textContent = "Could not copy the service run pack automatically.";
        }
      });
  });

  serviceRunPackForm.querySelector("[data-share-service-run-pack]")?.addEventListener("click", async () => {
    renderServiceRunPackPreview();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline service run pack", text: lastServiceRunPackText });
        serviceRunPackStatus.textContent = "Service run pack shared.";
        return;
      }
      await copyText(lastServiceRunPackText);
      serviceRunPackStatus.textContent = "Share unavailable; service run pack copied instead.";
    } catch {
      serviceRunPackStatus.textContent = "Share canceled or unavailable.";
    }
  });

  serviceRunPackForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderServiceRunPackPreview();
    prependGarageGeneralNote(`[${new Date().toLocaleDateString("en-US")} - Service Run Pack]\n${lastServiceRunPackText}`);
    persistServiceRunPackDraft();
    if (serviceRunPackStatus) {
      serviceRunPackStatus.textContent = "Service run pack saved to Garage Notes.";
    }
  });

  renderServiceRunPackPreview();
}

function initServiceFollowup() {
  if (!followupForm || !followupButtons.length) {
    return;
  }

  followupButtons.forEach((button) => {
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      selectFollowupService(button.dataset.followupService || "oil_change", { announce: true });
    });
  });

  followupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!selectedFollowup) {
      selectFollowupService("oil_change");
    }
    prependGarageGeneralNote(`[${new Date().toLocaleDateString("en-US")} - Service Follow-Up]\n${followupText()}`);
    if (followupStatus) {
      followupStatus.textContent = "Follow-up saved to Garage Notes.";
    }
  });

  followupForm.querySelector("[data-copy-service-followup]")?.addEventListener("click", () => {
    if (!selectedFollowup) {
      selectFollowupService("oil_change");
    }
    copyText(followupText())
      .then(() => {
        if (followupStatus) {
          followupStatus.textContent = "Follow-up copied.";
        }
      })
      .catch(() => {
        if (followupStatus) {
          followupStatus.textContent = "Could not copy the follow-up automatically.";
        }
      });
  });

  followupForm.querySelector("[data-share-service-followup]")?.addEventListener("click", async () => {
    if (!selectedFollowup) {
      selectFollowupService("oil_change");
    }
    const text = followupText();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline service follow-up", text });
        followupStatus.textContent = "Follow-up shared.";
        return;
      }
      await copyText(text);
      followupStatus.textContent = "Share unavailable; follow-up copied instead.";
    } catch {
      followupStatus.textContent = "Share canceled or unavailable.";
    }
  });

  selectFollowupService("oil_change");
}

function initMinderPlanner() {
  if (!minderPlanner || !minderInput) {
    return;
  }

  minderPlanner.querySelector("[data-build-minder-plan]")?.addEventListener("click", () => {
    renderMinderPlan(minderInput.value);
  });

  minderInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      renderMinderPlan(minderInput.value);
    }
  });

  minderPlanner.querySelector("[data-copy-minder-plan]")?.addEventListener("click", () => {
    if (minderPlanNeedsRefresh()) {
      renderMinderPlan(minderInput.value);
    }
    copyText(lastMinderPlanText || "No Maintenance Minder checklist built yet.")
      .then(() => {
        if (minderStatus) {
          minderStatus.textContent = "Checklist copied.";
        }
      })
      .catch(() => {
        if (minderStatus) {
          minderStatus.textContent = "Could not copy automatically.";
        }
      });
  });

  function saveCurrentMinderNote() {
    if (minderPlanNeedsRefresh()) {
      renderMinderPlan(minderInput.value);
    }

    if (!lastMinderPlanText) {
      if (minderStatus) {
        minderStatus.textContent = "Build a checklist before saving a Garage note.";
      }
      return false;
    }

    const code = lastMinderPlanCode || "code";
    const date = new Date().toLocaleDateString("en-US");
    prependGarageGeneralNote(`[${date} - Maintenance Minder ${code} planner]\n${lastMinderPlanText}`);
    return true;
  }

  minderPlanner.querySelector("[data-save-minder-note]")?.addEventListener("click", () => {
    if (!saveCurrentMinderNote()) {
      return;
    }

    if (minderStatus) {
      minderStatus.textContent = "Checklist saved to Garage Notes.";
    }
  });

  minderPlanner.querySelector("[data-save-open-minder-staging]")?.addEventListener("click", () => {
    if (!saveCurrentMinderNote()) {
      return;
    }

    if (minderStatus) {
      minderStatus.textContent = "Checklist saved. Opening Garage staging...";
    }
    recordMaintenanceStageHandoff(`Maintenance Minder ${lastMinderPlanCode || "planner"}`, "built checklist");
    openMaintenanceStaging();
  });

  minderPlanner.querySelector("[data-reset-minder-plan]")?.addEventListener("click", () => {
    minderInput.value = "";
    renderMinderPlan("");
    minderInput.focus();
    if (minderStatus) {
      minderStatus.textContent = "Planner reset.";
    }
  });

  minderPlanner.querySelectorAll("[data-minder-sample]").forEach((button) => {
    button.addEventListener("click", () => {
      minderInput.value = button.dataset.minderSample || "";
      renderMinderPlan(minderInput.value);
    });
  });
}

function saveQuickUpdate(event) {
  event.preventDefault();
  const formData = new FormData(updateForm);
  const entry = buildMaintenanceEntry({
    mileage: formData.get("mileage"),
    service: formData.get("service") || "general_note",
    note: formData.get("note")
  });

  if (!entry) {
    updateStatus.textContent = "Enter the current mileage first.";
    return;
  }

  saveMaintenanceEntry(entry);
  updateForm.reset();
  updateStatus.textContent = `${serviceLabels[entry.service]} saved at ${entry.mileageText} on ${entry.date}.`;
}

updateForm?.addEventListener("submit", saveQuickUpdate);
updateReceipt?.querySelector("[data-copy-maintenance-receipt]")?.addEventListener("click", async () => {
  try {
    await copyText(lastUpdateReceiptText || "No maintenance receipt is ready yet.");
    updateStatus.textContent = "Maintenance receipt copied.";
  } catch {
    updateStatus.textContent = "Could not copy the maintenance receipt automatically.";
  }
});
updateReceipt?.querySelector("[data-share-maintenance-receipt]")?.addEventListener("click", async () => {
  try {
    if (navigator.share) {
      await navigator.share({ title: "Ridgeline maintenance receipt", text: lastUpdateReceiptText });
      updateStatus.textContent = "Maintenance receipt shared.";
      return;
    }
    await copyText(lastUpdateReceiptText || "No maintenance receipt is ready yet.");
    updateStatus.textContent = "Share unavailable; maintenance receipt copied instead.";
  } catch {
    updateStatus.textContent = "Share canceled or unavailable.";
  }
});
initServiceCloseout();
initServicePrepCards();
initServiceFollowup();
initMinderPlanner();
initServiceRunPack();

window.addEventListener("ridgeline:storage-hydrated", renderRecentUpdates);
renderRecentUpdates();
initGarageCloudSync();
