import {
  loadAreaJournal,
  saveAreaJournal
} from "./garage-data.js";

const detail = document.querySelector("[data-pinout-detail]");
const pins = [...document.querySelectorAll("[data-pin]")];
const handoff = document.querySelector("[data-pinout-handoff]");
const choices = [...document.querySelectorAll("[data-pinout-choice]")];
const copyButton = document.querySelector("[data-copy-pinout-handoff]");
const shareButton = document.querySelector("[data-share-pinout-handoff]");
const towSetupSaver = document.querySelector("[data-tow-setup-saver]");
const towLightTest = document.querySelector("[data-tow-light-test]");
let selectedPinKey = "center";
let selectedTowPlug = "7-way blade";
let selectedTowResult = "Lights passed: running, left, right, brake, and reverse if used.";

const pinData = {
  center: {
    title: "Center Pin",
    functionLabel: "Reverse lights",
    copy: "Reverse light circuit for backup lamps or a reverse-lockout feed on trailers that use it."
  },
  aux: {
    title: "1:00 Pin",
    functionLabel: "12V auxiliary power",
    copy: "12V auxiliary power feed, commonly used for trailer battery charge or accessory power."
  },
  right: {
    title: "3:00 Pin",
    functionLabel: "Right turn / brake",
    copy: "Right turn signal and right brake-light circuit."
  },
  brake: {
    title: "5:00 Pin",
    functionLabel: "Electric brake output",
    copy: "Electric trailer brake output from the brake controller circuit."
  },
  ground: {
    title: "7:00 Pin",
    functionLabel: "Ground",
    copy: "Main ground return path for the trailer harness."
  },
  left: {
    title: "9:00 Pin",
    functionLabel: "Left turn / brake",
    copy: "Left turn signal and left brake-light circuit."
  },
  running: {
    title: "11:00 Pin",
    functionLabel: "Running lights",
    copy: "Running lights, marker lights, tail lamps, and clearance light feed."
  }
};

function setStatus(message) {
  const status = handoff?.querySelector("[data-pinout-handoff-status]");
  if (status) {
    status.textContent = message;
  }
}

function buildPinoutHandoff(pinKey = selectedPinKey) {
  const pin = pinData[pinKey] || pinData.center;
  return [
    `Ridgeline trailer pin handoff: ${pin.title}`,
    `Function: ${pin.functionLabel}`,
    `Use: ${pin.copy}`,
    "Next: confirm the truck socket is the mirror image, then check the adapter or trailer side before pulling fuses.",
    "Route: rear-hitch.html#pinout and diagnostics.html#trailer-light-workflow.",
    "Source rule: truck labels, owner manual, connector condition, and current roadside conditions remain final authority."
  ].join("\n");
}

function copyTextFallback(value = "") {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    return true;
  } catch (error) {
    return false;
  } finally {
    textarea.remove();
  }
}

async function copyText(value = "") {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (error) {
      return copyTextFallback(value);
    }
  }
  return copyTextFallback(value);
}

function setTowSetupStatus(message) {
  const status = towSetupSaver?.querySelector("[data-tow-setup-status]");
  if (status) {
    status.textContent = message;
  }
}

function setTowLightStatus(message) {
  const status = towLightTest?.querySelector("[data-tow-light-status]");
  if (status) {
    status.textContent = message;
  }
}

function getTowLightRows() {
  if (!towLightTest) {
    return [];
  }
  return [...towLightTest.querySelectorAll("[data-tow-light-function]")].map((field) => ({
    label: field.dataset.towLightFunction,
    value: field.value || "Not checked"
  }));
}

function getTowLightContext() {
  return towLightTest?.querySelector("[data-tow-light-context]")?.value.trim() || "";
}

function updateTowLightSummary(statusMessage = "") {
  if (!towLightTest) {
    return;
  }
  const rows = getTowLightRows();
  const checked = rows.filter((row) => row.value !== "Not checked").length;
  const issues = rows.filter((row) => row.value === "Issue").length;
  const summary = towLightTest.querySelector("[data-tow-light-summary]");
  if (summary) {
    summary.textContent = issues ? `${checked} of ${rows.length} checked, ${issues} issue` : `${checked} of ${rows.length} checked`;
  }
  if (statusMessage) {
    setTowLightStatus(statusMessage);
  }
}

function buildTowSetupNote() {
  return [
    "Ridgeline tow setup note",
    `Plug / adapter: ${selectedTowPlug}`,
    `Light check: ${selectedTowResult}`,
    "Next: keep rear-hitch.html#tow-checklist, rear-hitch.html#pinout, and diagnostics.html#trailer-light-workflow available for the tow day.",
    "Source rule: truck labels, owner manual, actual trailer condition, and current road conditions remain final authority."
  ].join("\n");
}

function buildTowLightNote() {
  const context = getTowLightContext();
  const rows = getTowLightRows().map((row) => `- ${row.label}: ${row.value}`);
  return [
    "Ridgeline trailer light test note",
    `Plug / adapter: ${selectedTowPlug}`,
    "Light functions:",
    ...rows,
    context ? `Detail: ${context}` : "Detail: no extra trailer or adapter note entered.",
    "Next: if any function shows Issue, use rear-hitch.html#pinout and diagnostics.html#trailer-light-workflow before blaming the truck, adapter, or trailer side.",
    "Source rule: truck labels, owner manual, connector condition, and current roadside conditions remain final authority."
  ].join("\n");
}

function renderTowSetup(statusMessage = "") {
  if (!towSetupSaver) {
    return;
  }

  towSetupSaver.querySelector("[data-tow-setup-title]")?.replaceChildren(
    document.createTextNode(`${selectedTowPlug} setup ready to save`)
  );
  towSetupSaver.querySelector("[data-tow-setup-copy]")?.replaceChildren(
    document.createTextNode(selectedTowResult)
  );

  towSetupSaver.querySelectorAll("[data-tow-setup-plug]").forEach((button) => {
    const isActive = button.dataset.towSetupPlug === selectedTowPlug;
    button.classList.toggle("utility-link-strong", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  towSetupSaver.querySelectorAll("[data-tow-setup-result]").forEach((button) => {
    const isActive = button.dataset.towSetupResult === selectedTowResult;
    button.classList.toggle("utility-link-strong", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (statusMessage) {
    setTowSetupStatus(statusMessage);
  }
}

function updateAreaJournalForm(notes = {}) {
  const journalForm = document.querySelector('[data-area-journal="rear-hitch"] [data-area-form]');
  if (!journalForm) {
    return;
  }

  ["primary_setup", "tow_notes"].forEach((name) => {
    const field = journalForm.elements[name];
    if (field && notes[name] !== undefined) {
      field.value = notes[name];
    }
  });
}

function saveTowSetupNote() {
  const journal = loadAreaJournal("rear-hitch");
  const notes = journal.notes || {};
  const savedAt = new Date().toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
  const noteText = [
    `[Tow setup saved ${savedAt}]`,
    `Plug / adapter: ${selectedTowPlug}`,
    `Light check: ${selectedTowResult}`,
    "Routes: Tow checklist, 7-way pinout, and Trailer-Light Flow."
  ].join("\n");
  const existingTowNotes = `${notes.tow_notes || ""}`.trim();
  const nextNotes = {
    ...notes,
    primary_setup: notes.primary_setup || selectedTowPlug,
    tow_notes: existingTowNotes ? `${noteText}\n\n${existingTowNotes}` : noteText
  };

  saveAreaJournal("rear-hitch", {
    notes: nextNotes,
    photos: journal.photos || []
  });
  updateAreaJournalForm(nextNotes);
  setTowSetupStatus("Tow setup saved into the existing Rear Hitch Journal.");
}

function saveTowLightNote() {
  const journal = loadAreaJournal("rear-hitch");
  const notes = journal.notes || {};
  const savedAt = new Date().toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
  const noteText = [
    `[Trailer light test saved ${savedAt}]`,
    buildTowLightNote(),
    "Routes: 7-way pinout and Trailer-Light Flow."
  ].join("\n");
  const existingTowNotes = `${notes.tow_notes || ""}`.trim();
  const nextNotes = {
    ...notes,
    primary_setup: notes.primary_setup || selectedTowPlug,
    tow_notes: existingTowNotes ? `${noteText}\n\n${existingTowNotes}` : noteText
  };

  saveAreaJournal("rear-hitch", {
    notes: nextNotes,
    photos: journal.photos || []
  });
  updateAreaJournalForm(nextNotes);
  setTowLightStatus("Trailer light test saved into the existing Rear Hitch Journal.");
}

function renderPin(pinKey, statusMessage = "") {
  const pin = pinData[pinKey];
  if (!pin) {
    return;
  }
  selectedPinKey = pinKey;

  if (detail) {
    detail.innerHTML = `
      <p class="eyebrow">Interactive Pinout</p>
      <h4>${pin.title}</h4>
      <p>${pin.copy}</p>
    `;
  }

  handoff?.querySelector("[data-pinout-handoff-title]")?.replaceChildren(document.createTextNode(`${pin.title} / ${pin.functionLabel}`));
  handoff?.querySelector("[data-pinout-handoff-copy]")?.replaceChildren(document.createTextNode(pin.copy));

  pins.forEach((node) => node.classList.toggle("is-active", node.dataset.pin === pinKey));
  choices.forEach((button) => {
    const isActive = button.dataset.pinoutChoice === pinKey;
    button.classList.toggle("utility-link-strong", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (statusMessage) {
    setStatus(statusMessage);
  }
}

pins.forEach((pin) => {
  pin.addEventListener("click", () => {
    renderPin(pin.dataset.pin, "Pin selected. Copy or share the handoff before testing.");
  });
});

choices.forEach((button) => {
  button.addEventListener("click", () => {
    renderPin(button.dataset.pinoutChoice, "Function selected. Copy or share the handoff before testing.");
  });
});

copyButton?.addEventListener("click", async () => {
  setStatus("Selected trailer pin handoff copied. Verify connector condition and truck labels before testing.");
  const copied = await copyText(buildPinoutHandoff());
  if (!copied) {
    setStatus("Copy is unavailable in this browser.");
  }
});

shareButton?.addEventListener("click", async () => {
  const text = buildPinoutHandoff();
  try {
    if (navigator.share) {
      await navigator.share({ title: "Ridgeline trailer pin handoff", text });
      setStatus("Selected trailer pin handoff shared.");
      return;
    }
    const copied = await copyText(text);
    setStatus(copied ? "Share unavailable, so the selected trailer pin handoff was copied." : "Share and copy are unavailable in this browser.");
  } catch (error) {
    setStatus("Share canceled or unavailable.");
  }
});

if (towSetupSaver) {
  towSetupSaver.querySelectorAll("[data-tow-setup-plug]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedTowPlug = button.dataset.towSetupPlug || selectedTowPlug;
      renderTowSetup("Adapter selected. Copy, share, or save the setup note.");
    });
  });

  towSetupSaver.querySelectorAll("[data-tow-setup-result]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedTowResult = button.dataset.towSetupResult || selectedTowResult;
      renderTowSetup("Light-check result selected. Save it before the next tow day.");
    });
  });

  towSetupSaver.querySelector("[data-copy-tow-setup]")?.addEventListener("click", async () => {
    const copied = await copyText(buildTowSetupNote());
    setTowSetupStatus(copied ? "Tow setup note copied." : "Copy is unavailable in this browser.");
  });

  towSetupSaver.querySelector("[data-share-tow-setup]")?.addEventListener("click", async () => {
    const text = buildTowSetupNote();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline tow setup note", text });
        setTowSetupStatus("Tow setup note shared.");
        return;
      }
      const copied = await copyText(text);
      setTowSetupStatus(copied ? "Share unavailable, so the tow setup note was copied." : "Share and copy are unavailable in this browser.");
    } catch (error) {
      setTowSetupStatus("Share canceled or unavailable.");
    }
  });

  towSetupSaver.querySelector("[data-save-tow-setup]")?.addEventListener("click", saveTowSetupNote);
}

if (towLightTest) {
  towLightTest.querySelectorAll("[data-tow-light-function], [data-tow-light-context]").forEach((field) => {
    field.addEventListener("input", () => updateTowLightSummary("Light test note updated."));
    field.addEventListener("change", () => updateTowLightSummary("Light test note updated."));
  });

  towLightTest.querySelector("[data-copy-tow-light]")?.addEventListener("click", async () => {
    const copied = await copyText(buildTowLightNote());
    setTowLightStatus(copied ? "Trailer light test copied." : "Copy is unavailable in this browser.");
  });

  towLightTest.querySelector("[data-share-tow-light]")?.addEventListener("click", async () => {
    const text = buildTowLightNote();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline trailer light test", text });
        setTowLightStatus("Trailer light test shared.");
        return;
      }
      const copied = await copyText(text);
      setTowLightStatus(copied ? "Share unavailable, so the trailer light test was copied." : "Share and copy are unavailable in this browser.");
    } catch (error) {
      setTowLightStatus("Share canceled or unavailable.");
    }
  });

  towLightTest.querySelector("[data-save-tow-light]")?.addEventListener("click", saveTowLightNote);
}

renderPin(selectedPinKey);
renderTowSetup();
updateTowLightSummary();
