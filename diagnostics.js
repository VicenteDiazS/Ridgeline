import {
  initGarageCloudSync,
  loadJson,
  saveJson,
  STORAGE
} from "./garage-data.js";

const DIAGNOSTIC_RECEIPT_KEY = "ridgeline-diagnostic-last-handoff";

const diagnosticSharePlans = {
  start: {
    kicker: "No start or weak battery",
    title: "Separate no-crank, slow-crank, and normal-crank/no-start",
    summary: "Capture starter behavior, dash behavior, recent battery work, and whether a jump or short trip changed the symptom.",
    steps: [
      "Note whether the starter is silent, slow, clicking, or cranking normally.",
      "Open the no-start workflow and keep the jump-point reference nearby.",
      "Save a Garage note if the problem follows battery, accessory, fuse, or trailer work."
    ],
    reference: "References: no-start workflow, battery/jump card, Garage notes.",
    primary: { label: "No-Start Flow", href: "#no-start-workflow" },
    secondary: { label: "Jump Notes", href: "hood.html#wiring" }
  },
  warning: {
    kicker: "Warning light or MID message",
    title: "Record color, exact wording, and what happened before it appeared",
    summary: "Use this when a red or amber indicator, MID message, or several alerts appear and might disappear after restart.",
    steps: [
      "Write the exact indicator name or MID wording and whether the light is red, amber, blinking, or steady.",
      "Note recent battery, fuse, tire, trailer, or service work before clearing context.",
      "Open the warning-light flow and save the structured Garage warning note."
    ],
    reference: "References: warning-light flow, emergency card, Garage warning note.",
    primary: { label: "Warning Flow", href: "#warning-light-workflow" },
    secondary: { label: "Save Warning Note", href: "garage.html#warning-light-template" }
  },
  power: {
    kicker: "12V socket or accessory power",
    title: "Name the socket, device, and load before chasing fuses",
    summary: "Use this when a phone charger, front socket, console socket, or small inverter stopped working.",
    steps: [
      "Record the exact outlet, device, adapter, and whether the truck was in ACCESSORY or ON.",
      "Retest with a known-good low-load device before opening the fuse tables.",
      "Use the accessory-power flow, then save a Garage note if the issue repeats."
    ],
    reference: "References: accessory-power flow, Cabin fuses, Garage notes.",
    primary: { label: "12V Power Flow", href: "#accessory-power-workflow" },
    secondary: { label: "Cabin Fuses", href: "cabin.html#fuses" }
  },
  audio: {
    kicker: "Audio, radio, or display issue",
    title: "Separate power, screen, speaker, source, and recent-work clues",
    summary: "Use this when the radio, speakers, display audio, Bluetooth audio, or camera/display path acts up.",
    steps: [
      "Note whether the issue is dark screen, no sound, source-specific, Bluetooth-only, or full audio loss.",
      "Record power mode, volume/mute/source state, and any recent battery or accessory work.",
      "Open the audio/display flow before replacing parts or resetting context."
    ],
    reference: "References: audio/display flow, Cabin Audio / ACC, Garage notes.",
    primary: { label: "Audio Flow", href: "#audio-display-workflow" },
    secondary: { label: "Cabin Audio", href: "cabin.html#cabin-fuse-box-b" }
  },
  trailer: {
    kicker: "Trailer light or connector issue",
    title: "Identify connector, adapter, and failed light function",
    summary: "Use this when brake, turn, running, reverse, adapter, or 7-way behavior changes after hookup.",
    steps: [
      "Record connector type, adapter, trailer, and which light function failed.",
      "Check whether truck lights still work before assuming the truck-side fuse path.",
      "Open the trailer-light flow and save the adapter or tester result for next time."
    ],
    reference: "References: trailer-light flow, 7-way pinout, Garage or hitch journal.",
    primary: { label: "Trailer Flow", href: "#trailer-light-workflow" },
    secondary: { label: "7-Way Pinout", href: "rear-hitch.html#pinout" }
  }
};

function buildDiagnosticHandoff(plan) {
  return [
    `Ridgeline diagnostic handoff: ${plan.kicker}`,
    plan.title,
    plan.summary,
    ...plan.steps.map((step, index) => `${index + 1}. ${step}`),
    plan.reference,
    "Use the truck, owner manual, warning state, fuse labels, and current conditions as final authority."
  ].join("\n");
}

function buildSavedDiagnosticNote(plan) {
  const timestamp = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  return [
    `[${timestamp} - Diagnostic Note: ${plan.kicker}]`,
    plan.title,
    "",
    plan.summary,
    "",
    ...plan.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    plan.reference,
    "Saved from Diagnostics Handoff Builder. The truck, owner manual, warning state, fuse labels, and current conditions remain final authority."
  ].join("\n");
}

function loadDiagnosticReceipt() {
  try {
    return JSON.parse(localStorage.getItem(DIAGNOSTIC_RECEIPT_KEY) || "null");
  } catch {
    return null;
  }
}

function saveDiagnosticReceipt(receipt) {
  localStorage.setItem(DIAGNOSTIC_RECEIPT_KEY, JSON.stringify(receipt));
}

function currentDiagnosticReceiptText() {
  const receipt = loadDiagnosticReceipt();
  return receipt?.text || "";
}

function prependGarageGeneralNote(noteText) {
  const notes = loadJson(STORAGE.notes, {});
  const existing = `${notes.general_notes || ""}`.trim();
  saveJson(STORAGE.notes, {
    ...notes,
    general_notes: existing ? `${noteText}\n\n${existing}` : noteText
  });
}

function renderDiagnosticReceipt(root) {
  const receiptCard = root.querySelector("[data-diagnostic-save-receipt]");
  if (!receiptCard) {
    return;
  }

  const receipt = loadDiagnosticReceipt();
  receiptCard.hidden = !receipt;
  if (!receipt) {
    return;
  }

  receiptCard.querySelector("[data-diagnostic-receipt-title]").textContent = receipt.title || "Diagnostic note saved";
  receiptCard.querySelector("[data-diagnostic-receipt-summary]").textContent =
    receipt.summary || "Saved into Garage Notes from Diagnostics.";
  receiptCard.querySelector("[data-diagnostic-receipt-meta]").textContent =
    `${receipt.savedAt || "Saved recently"} / ${receipt.reference || "Garage Notes"}`;
}

function setDiagnosticShareStatus(root, message) {
  const status = root.querySelector("[data-diagnostic-share-status]");
  if (status) {
    status.textContent = message;
  }
}

function updateDiagnosticSharePlan(root, key) {
  const plan = diagnosticSharePlans[key] || diagnosticSharePlans.start;
  root.dataset.currentDiagnosticSharePlan = key;
  root.querySelector("[data-diagnostic-share-kicker]").textContent = plan.kicker;
  root.querySelector("[data-diagnostic-share-title]").textContent = plan.title;
  root.querySelector("[data-diagnostic-share-summary]").textContent = plan.summary;
  root.querySelector("[data-diagnostic-share-reference]").textContent = plan.reference;

  const steps = root.querySelector("[data-diagnostic-share-steps]");
  steps.innerHTML = plan.steps.map((step) => `<li>${step}</li>`).join("");

  const primary = root.querySelector("[data-diagnostic-share-primary]");
  primary.textContent = plan.primary.label;
  primary.setAttribute("href", plan.primary.href);

  const secondary = root.querySelector("[data-diagnostic-share-secondary]");
  secondary.textContent = plan.secondary.label;
  secondary.setAttribute("href", plan.secondary.href);

  root.querySelectorAll("[data-diagnostic-share-plan]").forEach((button) => {
    const isActive = button.dataset.diagnosticSharePlan === key;
    button.classList.toggle("utility-link-strong", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  setDiagnosticShareStatus(root, `${plan.kicker} handoff ready.`);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

function initDiagnosticShareBuilder() {
  const root = document.querySelector("[data-diagnostic-share-builder]");
  if (!root) {
    return;
  }

  root.querySelectorAll("[data-diagnostic-share-plan]").forEach((button) => {
    button.addEventListener("click", () => updateDiagnosticSharePlan(root, button.dataset.diagnosticSharePlan));
  });

  root.querySelector("[data-copy-diagnostic-share]")?.addEventListener("click", async () => {
    const plan = diagnosticSharePlans[root.dataset.currentDiagnosticSharePlan] || diagnosticSharePlans.start;
    try {
      const copied = await copyText(buildDiagnosticHandoff(plan));
      setDiagnosticShareStatus(root, copied ? "Diagnostic handoff copied." : "Copy is unavailable in this browser.");
    } catch (error) {
      setDiagnosticShareStatus(root, "Copy failed. Select and copy the visible handoff instead.");
    }
  });

  root.querySelector("[data-share-diagnostic-share]")?.addEventListener("click", async () => {
    const plan = diagnosticSharePlans[root.dataset.currentDiagnosticSharePlan] || diagnosticSharePlans.start;
    const text = buildDiagnosticHandoff(plan);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline diagnostic handoff", text });
        setDiagnosticShareStatus(root, "Diagnostic handoff shared.");
        return;
      }
      const copied = await copyText(text);
      setDiagnosticShareStatus(root, copied ? "Share unavailable; handoff copied instead." : "Share is unavailable in this browser.");
    } catch (error) {
      setDiagnosticShareStatus(root, "Share canceled or unavailable.");
    }
  });

  root.querySelector("[data-save-diagnostic-note]")?.addEventListener("click", () => {
    const planKey = root.dataset.currentDiagnosticSharePlan || "start";
    const plan = diagnosticSharePlans[planKey] || diagnosticSharePlans.start;
    const noteText = buildSavedDiagnosticNote(plan);
    const savedAt = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });

    try {
      prependGarageGeneralNote(noteText);
      saveDiagnosticReceipt({
        planKey,
        title: plan.kicker,
        summary: `${plan.title} saved into Garage Notes.`,
        reference: plan.reference.replace(/^References:\s*/i, ""),
        savedAt,
        text: noteText
      });
      renderDiagnosticReceipt(root);
      setDiagnosticShareStatus(root, `${plan.kicker} saved to Garage Notes.`);
    } catch (error) {
      setDiagnosticShareStatus(root, "Could not save the diagnostic note in this browser session.");
    }
  });

  root.querySelector("[data-copy-diagnostic-receipt]")?.addEventListener("click", async () => {
    const text = currentDiagnosticReceiptText();
    if (!text) {
      setDiagnosticShareStatus(root, "Save a diagnostic note before copying the receipt.");
      return;
    }

    try {
      const copied = await copyText(text);
      setDiagnosticShareStatus(root, copied ? "Saved diagnostic note copied." : "Copy is unavailable in this browser.");
    } catch (error) {
      setDiagnosticShareStatus(root, "Copy failed. Open Garage Notes to select the saved note.");
    }
  });

  root.querySelector("[data-share-diagnostic-receipt]")?.addEventListener("click", async () => {
    const text = currentDiagnosticReceiptText();
    if (!text) {
      setDiagnosticShareStatus(root, "Save a diagnostic note before sharing the receipt.");
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline diagnostic note", text });
        setDiagnosticShareStatus(root, "Saved diagnostic note shared.");
        return;
      }
      const copied = await copyText(text);
      setDiagnosticShareStatus(root, copied ? "Share unavailable; saved note copied instead." : "Share is unavailable in this browser.");
    } catch (error) {
      setDiagnosticShareStatus(root, "Share canceled or unavailable.");
    }
  });

  updateDiagnosticSharePlan(root, "start");
  renderDiagnosticReceipt(root);
}

initDiagnosticShareBuilder();
initGarageCloudSync();
