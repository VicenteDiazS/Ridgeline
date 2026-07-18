import {
  initGarageCloudSync,
  loadJson,
  saveJson,
  STORAGE
} from "./garage-data.js";

const DIAGNOSTIC_RECEIPT_KEY = "ridgeline-diagnostic-last-handoff";
const DIAGNOSTIC_CHECK_KEY = "ridgeline-diagnostic-first-checks";
const DIAGNOSTIC_CALL_KEY = "ridgeline-diagnostic-call-summary";

const diagnosticRouteAliases = {
  start: "start",
  "no-start": "start",
  no_start: "start",
  battery: "start",
  warning: "warning",
  "warning-light": "warning",
  warning_light: "warning",
  power: "power",
  accessory: "power",
  "accessory-power": "power",
  accessory_power: "power",
  "12v": "power",
  audio: "audio",
  radio: "audio",
  display: "audio",
  "audio-display": "audio",
  audio_display: "audio",
  trailer: "trailer",
  tow: "trailer",
  towing: "trailer",
  "trailer-light": "trailer",
  trailer_light: "trailer"
};

const diagnosticHashPlans = {
  "#no-start-workflow": "start",
  "#warning-light-workflow": "warning",
  "#accessory-power-workflow": "power",
  "#audio-display-workflow": "audio",
  "#trailer-light-workflow": "trailer"
};

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
    secondary: { label: "Jump Notes", href: "hood.html#wiring" },
    dock: { primary: "No-Start", secondary: "Jump" },
    detailLabel: "Owner detail to preserve",
    detailPlaceholder: "Example: 87,420 mi, two clicks, dash dimmed, jump started after 10 minutes"
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
    secondary: { label: "Save Warning Note", href: "garage.html#warning-light-template" },
    dock: { primary: "Warning", secondary: "Note" },
    detailLabel: "Exact warning clue",
    detailPlaceholder: "Example: amber emissions light, MID said Check Charging System, appeared after battery swap"
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
    secondary: { label: "Cabin Fuses", href: "cabin.html#fuses" },
    dock: { primary: "12V", secondary: "Fuses" },
    detailLabel: "Socket or device clue",
    detailPlaceholder: "Example: front socket dead with phone charger, console socket works, ACCESSORY mode"
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
    secondary: { label: "Cabin Audio", href: "cabin.html#cabin-fuse-box-b" },
    dock: { primary: "Audio", secondary: "Cabin" },
    detailLabel: "Audio or screen clue",
    detailPlaceholder: "Example: screen lit but no sound, Bluetooth only, started after jump"
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
    secondary: { label: "7-Way Pinout", href: "rear-hitch.html#pinout" },
    dock: { primary: "Trailer", secondary: "Pinout" },
    detailLabel: "Trailer setup clue",
    detailPlaceholder: "Example: 4-flat adapter, left turn dead, truck lights still work, tester not checked"
  }
};

const diagnosticCheckPlans = {
  start: {
    kicker: "No start or weak battery",
    title: "Track the first no-start checks before context changes",
    summary: "Use this before moving from battery and jump context into deeper no-start routing.",
    checks: [
      "Starter behavior named",
      "Dash behavior noted",
      "Jump or battery context recorded",
      "Next reference opened"
    ],
    next: "Open No-Start Flow or Jump Notes with the early behavior preserved.",
    reference: "No-start workflow / hood jump notes"
  },
  warning: {
    kicker: "Warning light or MID message",
    title: "Track exact warning clues before a restart changes them",
    summary: "Use this when a dash light, MID message, or multiple alerts need a quick first record.",
    checks: [
      "Color or flashing state captured",
      "Exact MID wording written",
      "Recent service or battery context noted",
      "Warning note route opened"
    ],
    next: "Open Warning Flow or the Garage warning template.",
    reference: "warning-light workflow / Garage warning note"
  },
  power: {
    kicker: "12V socket or accessory power",
    title: "Track outlet and device checks before chasing fuses",
    summary: "Use this when a charger, accessory socket, adapter, or small inverter stopped working.",
    checks: [
      "Exact outlet named",
      "Device or adapter named",
      "Power mode checked",
      "Known-good low-load test tried"
    ],
    next: "Open 12V Power Flow, then Cabin or Hood fuses only after the basics are captured.",
    reference: "accessory-power workflow / Cabin fuses"
  },
  audio: {
    kicker: "Audio, radio, or display issue",
    title: "Track power, source, and screen clues first",
    summary: "Use this when the display, radio, speakers, Bluetooth, source, or camera/display path changes.",
    checks: [
      "Screen versus sound separated",
      "Source or Bluetooth state noted",
      "Volume/mute/power mode checked",
      "Recent battery or accessory work noted"
    ],
    next: "Open Audio Flow with source and power clues already recorded.",
    reference: "audio/display workflow / Cabin Audio"
  },
  trailer: {
    kicker: "Trailer light or connector issue",
    title: "Track connector and failed light function first",
    summary: "Use this when a trailer, adapter, tester, or 7-way/4-flat light behavior changes.",
    checks: [
      "Connector or adapter named",
      "Failed light function named",
      "Truck lights compared",
      "Tester or trailer result noted"
    ],
    next: "Open Trailer Flow or 7-Way Pinout with the failed function preserved.",
    reference: "trailer-light workflow / 7-way pinout"
  }
};

const diagnosticDecisionPlans = {
  start: {
    priority: "Parked check first",
    kicker: "No start or weak battery",
    title: "Preserve behavior before repeating start attempts",
    summary: "Separate starter behavior, dash behavior, battery context, and whether help is already needed.",
    steps: [
      "Stop repeating attempts if the starter, battery, or warning state changes.",
      "Mark starter and dash behavior in First Checks.",
      "Open the no-start flow or roadside stack with context preserved."
    ],
    primary: { label: "First Checks", href: "#first-check-tracker" },
    secondary: { label: "No-Start Flow", href: "#no-start-workflow" },
    tertiary: { label: "Roadside Stack", href: "quick-sheet.html?roadside=start#roadside-action-stack" }
  },
  warning: {
    priority: "Stop safely for red or flashing",
    kicker: "Warning light or MID message",
    title: "Record exact wording before the light disappears",
    summary: "Color, flashing state, message text, and recent work decide whether this becomes roadside help or a saved diagnostic note.",
    steps: [
      "If the warning is red, flashing, or affects steering, braking, temperature, oil, or charging, stop safely and check the manual entry before continuing.",
      "Write the exact indicator or MID wording before cycling the ignition.",
      "Open the warning flow or roadside stack with the message preserved."
    ],
    primary: { label: "Warning Flow", href: "#warning-light-workflow" },
    secondary: { label: "Save Note", href: "garage.html#warning-light-template" },
    tertiary: { label: "Roadside Stack", href: "quick-sheet.html?roadside=warning#roadside-action-stack" }
  },
  power: {
    priority: "Low-load retest first",
    kicker: "12V socket or accessory power",
    title: "Name the outlet and device before opening fuse tables",
    summary: "A socket, adapter, inverter, or power-mode mismatch can look like a fuse problem on an iPhone-sized screen.",
    steps: [
      "Identify the exact outlet, adapter, and truck power mode.",
      "Retest with a known-good low-load device if it is safe to do so.",
      "Open the 12V flow, then Cabin or Hood fuses only after basics are captured."
    ],
    primary: { label: "12V Flow", href: "#accessory-power-workflow" },
    secondary: { label: "Cabin Fuses", href: "cabin.html#fuses" },
    tertiary: { label: "Fuse Note", href: "quick-sheet.html#fuse-triage" }
  },
  audio: {
    priority: "Separate screen from sound",
    kicker: "Audio, radio, or display issue",
    title: "Sort power, source, speaker, and recent-work clues",
    summary: "Screen-only, no-sound, Bluetooth-only, and full-power issues need different reference paths.",
    steps: [
      "Record whether the screen, sound, source, Bluetooth, or camera/display path changed.",
      "Check power mode, volume, mute, and source state before assuming a part failure.",
      "Open the audio flow and save the clue if the issue follows a jump, battery, or accessory change."
    ],
    primary: { label: "Audio Flow", href: "#audio-display-workflow" },
    secondary: { label: "Cabin Audio", href: "cabin.html#cabin-fuse-box-b" },
    tertiary: { label: "Save Handoff", href: "#diagnostic-share-builder" }
  },
  trailer: {
    priority: "Do not move until lights are checked",
    kicker: "Trailer light or connector issue",
    title: "Confirm hookup, failed function, and truck-side lights",
    summary: "The useful split is truck, adapter, connector, or trailer side before chasing fuses.",
    steps: [
      "Check coupler, chains, hitch pin, and wiring before moving.",
      "Name the failed function: running, brake, left turn, right turn, or reverse.",
      "Open the trailer flow, pinout, or roadside stack with the failed function saved."
    ],
    primary: { label: "Trailer Flow", href: "#trailer-light-workflow" },
    secondary: { label: "7-Way Pinout", href: "rear-hitch.html#pinout" },
    tertiary: { label: "Roadside Stack", href: "quick-sheet.html?roadside=trailer#roadside-action-stack" }
  }
};

function normalizeDiagnosticPlanKey(value) {
  const key = `${value || ""}`.trim().toLowerCase();
  return diagnosticRouteAliases[key] || null;
}

function requestedDiagnosticPlanKey() {
  const params = new URLSearchParams(window.location.search);
  const queryPlan = normalizeDiagnosticPlanKey(params.get("diagnostic") || params.get("symptom"));
  if (queryPlan) {
    return queryPlan;
  }
  return diagnosticHashPlans[window.location.hash] || null;
}

function updateDiagnosticPlanUrl(key, mode = "push") {
  const planKey = diagnosticSharePlans[key] ? key : null;
  if (!planKey || !window.history?.pushState) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("diagnostic", planKey);
  url.searchParams.delete("symptom");
  if (!url.hash) {
    url.hash = "diagnostic-decision-guide";
  }
  if (url.href === window.location.href) {
    return;
  }

  const state = { diagnosticPlan: planKey };
  if (mode === "replace") {
    window.history.replaceState(state, "", url);
    return;
  }
  window.history.pushState(state, "", url);
}

function syncDiagnosticToolsToLocation() {
  const key = requestedDiagnosticPlanKey();
  if (!key) {
    return;
  }
  document.querySelectorAll("[data-diagnostic-decision-guide]").forEach((root) => {
    updateDiagnosticDecisionPlan(root, key);
  });
  document.querySelectorAll("[data-diagnostic-share-builder]").forEach((root) => {
    updateDiagnosticSharePlan(root, key);
  });
  document.querySelectorAll("[data-diagnostic-check-tracker]").forEach((root) => {
    renderDiagnosticCheckPlan(root, key);
  });
}

function cleanDiagnosticDetail(detail) {
  return `${detail || ""}`.replace(/\s+/g, " ").trim();
}

function buildDiagnosticHandoff(plan, detail = "") {
  const ownerDetail = cleanDiagnosticDetail(detail);
  return [
    `Ridgeline diagnostic handoff: ${plan.kicker}`,
    plan.title,
    plan.summary,
    ownerDetail ? `Owner detail: ${ownerDetail}` : "",
    ...plan.steps.map((step, index) => `${index + 1}. ${step}`),
    plan.reference,
    "Use the truck, owner manual, warning state, fuse labels, and current conditions as final authority."
  ].filter(Boolean).join("\n");
}

function buildSavedDiagnosticNote(plan, detail = "") {
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
    cleanDiagnosticDetail(detail) ? `Owner detail: ${cleanDiagnosticDetail(detail)}` : "",
    "",
    ...plan.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    plan.reference,
    "Saved from Diagnostics Handoff Builder. The truck, owner manual, warning state, fuse labels, and current conditions remain final authority."
  ].filter((line, index, lines) => line || lines[index - 1]).join("\n");
}

function buildDiagnosticCheckText(plan, markedChecks = [], detail = "") {
  const ownerDetail = cleanDiagnosticDetail(detail);
  const completed = plan.checks.filter((check) => markedChecks.includes(check));
  const pending = plan.checks.filter((check) => !markedChecks.includes(check));
  return [
    `Ridgeline first diagnostic checks: ${plan.kicker}`,
    plan.title,
    completed.length ? `Marked complete: ${completed.join("; ")}` : "Marked complete: none yet",
    pending.length ? `Still not marked: ${pending.join("; ")}` : "Still not marked: all first checks marked",
    ownerDetail ? `Result or next clue: ${ownerDetail}` : "",
    `Next: ${plan.next}`,
    `Reference: ${plan.reference}`,
    "Use current warnings, truck labels, the owner manual, and conditions as final authority."
  ].filter(Boolean).join("\n");
}

function buildSavedDiagnosticCheckNote(plan, markedChecks = [], detail = "") {
  const timestamp = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  return [
    `[${timestamp} - First Diagnostic Checks: ${plan.kicker}]`,
    buildDiagnosticCheckText(plan, markedChecks, detail),
    "Saved from Diagnostics First Check Tracker."
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

function loadDiagnosticChecks() {
  try {
    return JSON.parse(localStorage.getItem(DIAGNOSTIC_CHECK_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDiagnosticChecks(state) {
  localStorage.setItem(DIAGNOSTIC_CHECK_KEY, JSON.stringify(state));
}

function loadDiagnosticCallSummary() {
  try {
    return JSON.parse(localStorage.getItem(DIAGNOSTIC_CALL_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDiagnosticCallSummary(state) {
  localStorage.setItem(DIAGNOSTIC_CALL_KEY, JSON.stringify(state));
}

function currentDiagnosticReceiptText() {
  const receipt = loadDiagnosticReceipt();
  return receipt?.text || "";
}

function latestDiagnosticCheckEntry() {
  const stored = loadDiagnosticChecks();
  return Object.entries(stored)
    .map(([planKey, value]) => ({
      planKey,
      plan: diagnosticCheckPlans[planKey] || diagnosticCheckPlans.start,
      markedChecks: Array.isArray(value?.markedChecks) ? value.markedChecks : [],
      detail: value?.detail || "",
      updatedAt: value?.updatedAt || ""
    }))
    .sort((a, b) => `${b.updatedAt}`.localeCompare(`${a.updatedAt}`))[0] || null;
}

function hasUsefulDiagnosticCallState(state = loadDiagnosticCallSummary()) {
  return ["truckStatus", "callback", "ask"].some((key) => `${state?.[key] || ""}`.trim());
}

function latestDiagnosticResumeItems() {
  const receipt = loadDiagnosticReceipt();
  const latestCheck = latestDiagnosticCheckEntry();
  const call = loadDiagnosticCallSummary();
  const items = [];

  if (receipt) {
    items.push({
      label: "Saved handoff",
      title: receipt.title || "Diagnostic handoff",
      summary: receipt.summary || "Saved diagnostic note on this iPhone.",
      detail: receipt.reference ? `Route: ${receipt.reference}` : "Route: Diagnostics",
      savedAt: receipt.savedAt || "",
      text: receipt.text || ""
    });
  }

  if (latestCheck) {
    const markedCount = latestCheck.markedChecks.length;
    items.push({
      label: "First checks",
      title: latestCheck.plan.kicker,
      summary: `${markedCount} of ${latestCheck.plan.checks.length} checks marked.`,
      detail: latestCheck.detail || latestCheck.plan.next,
      savedAt: latestCheck.updatedAt || "",
      text: buildDiagnosticCheckText(latestCheck.plan, latestCheck.markedChecks, latestCheck.detail)
    });
  }

  if (hasUsefulDiagnosticCallState(call)) {
    const target = call.target || "Repair shop";
    items.push({
      label: "Call draft",
      title: `Call summary for ${target}`,
      summary: call.truckStatus || call.ask || "Diagnostic call details saved on this iPhone.",
      detail: call.callback ? `Callback: ${call.callback}` : "Open Call Summary to finish the ask.",
      savedAt: call.updatedAt || "",
      text: [
        `Ridgeline diagnostic call summary for ${target}`,
        call.truckStatus ? `Truck status: ${call.truckStatus}` : "",
        call.callback ? `Callback: ${call.callback}` : "",
        call.ask ? `Question / ask: ${call.ask}` : "",
        "Use the truck, current warning state, fuse labels, owner manual, and roadside conditions as final authority."
      ].filter(Boolean).join("\n")
    });
  }

  return items.sort((a, b) => `${b.savedAt || ""}`.localeCompare(`${a.savedAt || ""}`));
}

function buildDiagnosticResumeText() {
  const items = latestDiagnosticResumeItems();
  if (!items.length) {
    return "";
  }
  const lines = ["Ridgeline latest diagnostic context"];
  items.forEach((item, index) => {
    lines.push("", `${index + 1}. ${item.label}: ${item.title}`, item.summary, item.detail);
  });
  lines.push("", "Current warnings, truck labels, fuse covers, owner manual, and roadside conditions remain final authority.");
  return lines.join("\n");
}

function diagnosticCallTimestamp() {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getDiagnosticCallState(root) {
  const receipt = loadDiagnosticReceipt();
  const latestCheck = latestDiagnosticCheckEntry();
  return {
    target: root.querySelector("[data-diagnostic-call-target]")?.value || "Repair shop",
    truckStatus: cleanDiagnosticDetail(root.querySelector("[data-diagnostic-call-status]")?.value || ""),
    callback: cleanDiagnosticDetail(root.querySelector("[data-diagnostic-call-callback]")?.value || ""),
    ask: cleanDiagnosticDetail(root.querySelector("[data-diagnostic-call-ask]")?.value || ""),
    receipt,
    latestCheck
  };
}

function buildDiagnosticCallText(root) {
  const { target, truckStatus, callback, ask, receipt, latestCheck } = getDiagnosticCallState(root);
  const lines = [
    `Ridgeline diagnostic call summary for ${target}`,
    truckStatus ? `Truck status: ${truckStatus}` : "Truck status: not entered yet",
    callback ? `Callback: ${callback}` : "Callback: not entered yet",
    ask ? `Question / ask: ${ask}` : "Question / ask: confirm next diagnostic step or handoff need",
    receipt?.title ? `Latest saved handoff: ${receipt.title}` : "Latest saved handoff: none saved on this iPhone yet",
    receipt?.summary ? `Handoff note: ${receipt.summary}` : "",
    latestCheck
      ? `Latest first checks: ${latestCheck.plan.kicker} / ${latestCheck.markedChecks.length} of ${latestCheck.plan.checks.length} marked`
      : "Latest first checks: none saved on this iPhone yet",
    latestCheck?.detail ? `First-check clue: ${latestCheck.detail}` : "",
    receipt?.reference ? `Reference route: ${receipt.reference}` : "Reference route: Diagnostics workflow index, Garage Recent Handoffs, or Roadside Stack",
    "Use the truck, current warning state, fuse labels, owner manual, and roadside conditions as final authority."
  ];
  return lines.filter(Boolean).join("\n");
}

function renderDiagnosticCallSummary(root) {
  const { receipt, latestCheck } = getDiagnosticCallState(root);
  const title = root.querySelector("[data-diagnostic-call-title]");
  const preview = root.querySelector("[data-diagnostic-call-preview]");
  const context = root.querySelector("[data-diagnostic-call-context]");

  if (title) {
    title.textContent = receipt?.title || latestCheck?.plan.kicker || "No saved diagnostic context yet";
  }
  if (preview) {
    preview.textContent = receipt?.summary || latestCheck?.plan.title || "Save a Diagnostic Handoff or First Check Tracker note, then this panel will include the latest local context automatically.";
  }
  if (context) {
    const items = [
      receipt?.savedAt ? `Handoff saved: ${receipt.savedAt}` : "",
      latestCheck ? `${latestCheck.markedChecks.length} of ${latestCheck.plan.checks.length} first checks marked` : "",
      latestCheck?.detail ? `Clue: ${latestCheck.detail}` : "",
      receipt?.reference ? `Route: ${receipt.reference}` : "Route: Diagnostics workflow index"
    ].filter(Boolean);
    context.innerHTML = "";
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      context.append(li);
    });
  }
}

function persistDiagnosticCallSummary(root) {
  saveDiagnosticCallSummary({
    target: root.querySelector("[data-diagnostic-call-target]")?.value || "Repair shop",
    truckStatus: cleanDiagnosticDetail(root.querySelector("[data-diagnostic-call-status]")?.value || ""),
    callback: cleanDiagnosticDetail(root.querySelector("[data-diagnostic-call-callback]")?.value || ""),
    ask: cleanDiagnosticDetail(root.querySelector("[data-diagnostic-call-ask]")?.value || ""),
    updatedAt: new Date().toISOString()
  });
}

function setDiagnosticCallStatus(root, message) {
  const status = root.querySelector("[data-diagnostic-call-status-text]");
  if (status) {
    status.textContent = message;
  }
}

function setDiagnosticResumeStatus(root, message) {
  const status = root.querySelector("[data-diagnostic-resume-status]");
  if (status) {
    status.textContent = message;
  }
}

function renderDiagnosticResumeCards() {
  const items = latestDiagnosticResumeItems();
  document.querySelectorAll("[data-diagnostic-local-resume]").forEach((root) => {
    root.hidden = false;
    if (!items.length) {
      root.querySelector("[data-diagnostic-resume-kicker]").textContent = "No local context";
      root.querySelector("[data-diagnostic-resume-title]").textContent = "No saved diagnostic thread yet";
      root.querySelector("[data-diagnostic-resume-summary]").textContent =
        "Save a handoff, mark first checks, or draft a call summary to make this iPhone resume the thread here.";
      const list = root.querySelector("[data-diagnostic-resume-list]");
      list.innerHTML = "";
      const li = document.createElement("li");
      const strong = document.createElement("strong");
      const span = document.createElement("span");
      strong.textContent = "Next:";
      span.textContent = "Use Decision Guide, First Checks, or Call Summary to create local context.";
      li.append(strong, span);
      list.appendChild(li);
      return;
    }

    const latest = items[0];
    root.querySelector("[data-diagnostic-resume-kicker]").textContent = latest.label;
    root.querySelector("[data-diagnostic-resume-title]").textContent = latest.title;
    root.querySelector("[data-diagnostic-resume-summary]").textContent = latest.summary;

    const list = root.querySelector("[data-diagnostic-resume-list]");
    list.innerHTML = "";
    items.slice(0, 3).forEach((item) => {
      const li = document.createElement("li");
      const strong = document.createElement("strong");
      const span = document.createElement("span");
      strong.textContent = item.label;
      span.textContent = item.detail;
      li.append(strong, span);
      list.appendChild(li);
    });
  });
}

function initDiagnosticLocalResume() {
  document.querySelectorAll("[data-diagnostic-local-resume]").forEach((root) => {
    root.querySelector("[data-copy-diagnostic-resume]")?.addEventListener("click", async (event) => {
      const text = buildDiagnosticResumeText();
      if (!text) {
        setDiagnosticResumeStatus(root, "Save a diagnostic handoff, first check, or call draft first.");
        return;
      }
      try {
        const copied = await copyText(text);
        if (copied) {
          hideManualCopyFallback(event.currentTarget);
        } else {
          showManualCopyFallback(event.currentTarget, text);
        }
        setDiagnosticResumeStatus(root, copied ? "Latest diagnostic context copied." : "Copy is unavailable in this browser.");
      } catch (error) {
        showManualCopyFallback(event.currentTarget, text);
        setDiagnosticResumeStatus(root, "Copy failed. Select the fallback text below.");
      }
    });

    root.querySelector("[data-share-diagnostic-resume]")?.addEventListener("click", async (event) => {
      const text = buildDiagnosticResumeText();
      if (!text) {
        setDiagnosticResumeStatus(root, "Save a diagnostic handoff, first check, or call draft first.");
        return;
      }
      try {
        if (navigator.share) {
          await navigator.share({ title: "Ridgeline latest diagnostic context", text });
          hideManualCopyFallback(event.currentTarget);
          setDiagnosticResumeStatus(root, "Latest diagnostic context shared.");
          return;
        }
        const copied = await copyText(text);
        if (copied) {
          hideManualCopyFallback(event.currentTarget);
        } else {
          showManualCopyFallback(event.currentTarget, text);
        }
        setDiagnosticResumeStatus(root, copied ? "Share unavailable; latest context copied instead." : "Share is unavailable in this browser.");
      } catch (error) {
        showManualCopyFallback(event.currentTarget, text);
        setDiagnosticResumeStatus(root, "Share canceled or unavailable. Select the fallback text below.");
      }
    });
  });
  renderDiagnosticResumeCards();
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

function updateDiagnosticDock(plan) {
  const dock = document.querySelector("[data-diagnostic-dock]");
  const contextBar = document.querySelector(".context-action-bar");
  if (!plan) {
    return;
  }

  const primary = dock?.querySelector("[data-diagnostic-dock-primary]");
  const secondary = dock?.querySelector("[data-diagnostic-dock-secondary]");
  if (primary) {
    primary.textContent = plan.dock?.primary || plan.primary.label;
    primary.setAttribute("href", plan.primary.href);
  }
  if (secondary) {
    secondary.textContent = plan.dock?.secondary || plan.secondary.label;
    secondary.setAttribute("href", plan.secondary.href);
  }
  dock?.setAttribute("aria-label", `Diagnostic quick return for ${plan.kicker}`);

  const contextPrimary = contextBar?.querySelector('[data-diagnostic-context="primary"]');
  const contextSecondary = contextBar?.querySelector('[data-diagnostic-context="secondary"]');
  if (contextPrimary) {
    contextPrimary.querySelector("span").textContent = plan.dock?.primary || plan.primary.label;
    contextPrimary.setAttribute("href", plan.primary.href);
  }
  if (contextSecondary) {
    contextSecondary.querySelector("span").textContent = plan.dock?.secondary || plan.secondary.label;
    contextSecondary.setAttribute("href", plan.secondary.href);
  }
  contextBar?.setAttribute("aria-label", `Context actions for ${plan.kicker}`);
}

function updateDiagnosticDecisionPlan(root, key) {
  const plan = diagnosticDecisionPlans[key] || diagnosticDecisionPlans.start;
  const sharePlan = diagnosticSharePlans[key] || diagnosticSharePlans.start;
  root.dataset.currentDiagnosticDecisionPlan = key;
  root.querySelector("[data-diagnostic-decision-priority]").textContent = plan.priority;
  root.querySelector("[data-diagnostic-decision-kicker]").textContent = plan.kicker;
  root.querySelector("[data-diagnostic-decision-title]").textContent = plan.title;
  root.querySelector("[data-diagnostic-decision-summary]").textContent = plan.summary;

  const steps = root.querySelector("[data-diagnostic-decision-steps]");
  if (steps) {
    steps.innerHTML = "";
    plan.steps.forEach((step) => {
      const item = document.createElement("li");
      item.textContent = step;
      steps.append(item);
    });
  }

  [
    ["[data-diagnostic-decision-primary]", plan.primary],
    ["[data-diagnostic-decision-secondary]", plan.secondary],
    ["[data-diagnostic-decision-tertiary]", plan.tertiary]
  ].forEach(([selector, link]) => {
    const anchor = root.querySelector(selector);
    if (anchor && link) {
      anchor.textContent = link.label;
      anchor.setAttribute("href", link.href);
    }
  });

  root.querySelectorAll("[data-diagnostic-decision-plan]").forEach((button) => {
    const isActive = button.dataset.diagnosticDecisionPlan === key;
    button.classList.toggle("utility-link-strong", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  updateDiagnosticDock(sharePlan);
}

function setDiagnosticPlanEverywhere(key, options = {}) {
  const planKey = diagnosticSharePlans[key] ? key : "start";
  document.querySelectorAll("[data-diagnostic-decision-guide]").forEach((root) => {
    updateDiagnosticDecisionPlan(root, planKey);
  });
  document.querySelectorAll("[data-diagnostic-share-builder]").forEach((root) => {
    updateDiagnosticSharePlan(root, planKey);
  });
  document.querySelectorAll("[data-diagnostic-check-tracker]").forEach((root) => {
    renderDiagnosticCheckPlan(root, planKey);
  });
  if (options.updateUrl) {
    updateDiagnosticPlanUrl(planKey, options.urlMode);
  }
}

function updateDiagnosticSharePlan(root, key) {
  const plan = diagnosticSharePlans[key] || diagnosticSharePlans.start;
  root.dataset.currentDiagnosticSharePlan = key;
  root.querySelector("[data-diagnostic-share-kicker]").textContent = plan.kicker;
  root.querySelector("[data-diagnostic-share-title]").textContent = plan.title;
  root.querySelector("[data-diagnostic-share-summary]").textContent = plan.summary;
  root.querySelector("[data-diagnostic-share-reference]").textContent = plan.reference;
  const detailLabel = root.querySelector("[data-diagnostic-detail-label]");
  const detailField = root.querySelector("[data-diagnostic-detail]");
  if (detailLabel) {
    detailLabel.textContent = plan.detailLabel || "Owner detail to preserve";
  }
  if (detailField) {
    detailField.setAttribute("placeholder", plan.detailPlaceholder || "");
  }

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
  updateDiagnosticDock(plan);
}

function initDiagnosticDecisionGuide() {
  const root = document.querySelector("[data-diagnostic-decision-guide]");
  if (!root) {
    return;
  }

  root.querySelectorAll("[data-diagnostic-decision-plan]").forEach((button) => {
    button.addEventListener("click", () => setDiagnosticPlanEverywhere(button.dataset.diagnosticDecisionPlan, { updateUrl: true }));
  });

  updateDiagnosticDecisionPlan(root, requestedDiagnosticPlanKey() || "start");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

function manualCopyScope(trigger) {
  return trigger?.closest?.("article, section") || trigger || document;
}

function showManualCopyFallback(trigger, text) {
  const fallback = manualCopyScope(trigger).querySelector?.("[data-manual-copy-fallback]");
  const field = fallback?.querySelector("[data-manual-copy-text]");
  if (!fallback || !field) {
    return;
  }
  document.querySelectorAll("[data-manual-copy-fallback]").forEach((panel) => {
    if (panel !== fallback) {
      panel.hidden = true;
    }
  });
  field.value = text;
  fallback.hidden = false;
  window.requestAnimationFrame(() => {
    field.focus({ preventScroll: true });
    field.select();
  });
}

function hideManualCopyFallback(trigger) {
  const fallback = manualCopyScope(trigger).querySelector?.("[data-manual-copy-fallback]");
  if (fallback) {
    fallback.hidden = true;
  }
}

function initDiagnosticShareBuilder() {
  const root = document.querySelector("[data-diagnostic-share-builder]");
  if (!root) {
    return;
  }

  root.querySelectorAll("[data-diagnostic-share-plan]").forEach((button) => {
    button.addEventListener("click", () => setDiagnosticPlanEverywhere(button.dataset.diagnosticSharePlan, { updateUrl: true }));
  });

  root.querySelector("[data-copy-diagnostic-share]")?.addEventListener("click", async (event) => {
    const plan = diagnosticSharePlans[root.dataset.currentDiagnosticSharePlan] || diagnosticSharePlans.start;
    const detail = root.querySelector("[data-diagnostic-detail]")?.value || "";
    const text = buildDiagnosticHandoff(plan, detail);
    try {
      const copied = await copyText(text);
      if (copied) {
        hideManualCopyFallback(event.currentTarget);
      } else {
        showManualCopyFallback(event.currentTarget, text);
      }
      setDiagnosticShareStatus(root, copied ? "Diagnostic handoff copied." : "Copy is unavailable in this browser.");
    } catch (error) {
      showManualCopyFallback(event.currentTarget, text);
      setDiagnosticShareStatus(root, "Copy failed. Select the fallback text below.");
    }
  });

  root.querySelector("[data-share-diagnostic-share]")?.addEventListener("click", async (event) => {
    const plan = diagnosticSharePlans[root.dataset.currentDiagnosticSharePlan] || diagnosticSharePlans.start;
    const detail = root.querySelector("[data-diagnostic-detail]")?.value || "";
    const text = buildDiagnosticHandoff(plan, detail);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline diagnostic handoff", text });
        hideManualCopyFallback(event.currentTarget);
        setDiagnosticShareStatus(root, "Diagnostic handoff shared.");
        return;
      }
      const copied = await copyText(text);
      if (copied) {
        hideManualCopyFallback(event.currentTarget);
      } else {
        showManualCopyFallback(event.currentTarget, text);
      }
      setDiagnosticShareStatus(root, copied ? "Share unavailable; handoff copied instead." : "Share is unavailable in this browser.");
    } catch (error) {
      showManualCopyFallback(event.currentTarget, text);
      setDiagnosticShareStatus(root, "Share canceled or unavailable. Select the fallback text below.");
    }
  });

  root.querySelector("[data-save-diagnostic-note]")?.addEventListener("click", () => {
    const planKey = root.dataset.currentDiagnosticSharePlan || "start";
    const plan = diagnosticSharePlans[planKey] || diagnosticSharePlans.start;
    const detail = root.querySelector("[data-diagnostic-detail]")?.value || "";
    const noteText = buildSavedDiagnosticNote(plan, detail);
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
      document.querySelectorAll("[data-diagnostic-call-summary]").forEach(renderDiagnosticCallSummary);
      renderDiagnosticResumeCards();
      setDiagnosticShareStatus(root, `${plan.kicker} saved to Garage Notes.`);
    } catch (error) {
      setDiagnosticShareStatus(root, "Could not save the diagnostic note in this browser session.");
    }
  });

  root.querySelector("[data-copy-diagnostic-receipt]")?.addEventListener("click", async (event) => {
    const text = currentDiagnosticReceiptText();
    if (!text) {
      setDiagnosticShareStatus(root, "Save a diagnostic note before copying the receipt.");
      return;
    }

    try {
      const copied = await copyText(text);
      if (copied) {
        hideManualCopyFallback(event.currentTarget);
      } else {
        showManualCopyFallback(event.currentTarget, text);
      }
      setDiagnosticShareStatus(root, copied ? "Saved diagnostic note copied." : "Copy is unavailable in this browser.");
    } catch (error) {
      showManualCopyFallback(event.currentTarget, text);
      setDiagnosticShareStatus(root, "Copy failed. Select the fallback text below.");
    }
  });

  root.querySelector("[data-share-diagnostic-receipt]")?.addEventListener("click", async (event) => {
    const text = currentDiagnosticReceiptText();
    if (!text) {
      setDiagnosticShareStatus(root, "Save a diagnostic note before sharing the receipt.");
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline diagnostic note", text });
        hideManualCopyFallback(event.currentTarget);
        setDiagnosticShareStatus(root, "Saved diagnostic note shared.");
        return;
      }
      const copied = await copyText(text);
      if (copied) {
        hideManualCopyFallback(event.currentTarget);
      } else {
        showManualCopyFallback(event.currentTarget, text);
      }
      setDiagnosticShareStatus(root, copied ? "Share unavailable; saved note copied instead." : "Share is unavailable in this browser.");
    } catch (error) {
      showManualCopyFallback(event.currentTarget, text);
      setDiagnosticShareStatus(root, "Share canceled or unavailable. Select the fallback text below.");
    }
  });

  updateDiagnosticSharePlan(root, requestedDiagnosticPlanKey() || "start");
  renderDiagnosticReceipt(root);
}

function getDiagnosticCheckState(root) {
  const planKey = root.dataset.currentDiagnosticCheckPlan || "start";
  const plan = diagnosticCheckPlans[planKey] || diagnosticCheckPlans.start;
  const markedChecks = [...root.querySelectorAll("[data-diagnostic-check]:checked")].map((input) => input.value);
  const detail = root.querySelector("[data-diagnostic-check-detail]")?.value || "";
  return { planKey, plan, markedChecks, detail };
}

function setDiagnosticCheckStatus(root, message) {
  const status = root.querySelector("[data-diagnostic-check-status]");
  if (status) {
    status.textContent = message;
  }
}

function persistDiagnosticCheckState(root) {
  const { planKey, markedChecks, detail } = getDiagnosticCheckState(root);
  const stored = loadDiagnosticChecks();
  stored[planKey] = {
    markedChecks,
    detail: cleanDiagnosticDetail(detail),
    updatedAt: new Date().toISOString()
  };
  saveDiagnosticChecks(stored);
}

function renderDiagnosticCheckPlan(root, key) {
  const plan = diagnosticCheckPlans[key] || diagnosticCheckPlans.start;
  const stored = loadDiagnosticChecks()[key] || {};
  const marked = Array.isArray(stored.markedChecks) ? stored.markedChecks : [];
  root.dataset.currentDiagnosticCheckPlan = key;
  root.querySelector("[data-diagnostic-check-kicker]").textContent = plan.kicker;
  root.querySelector("[data-diagnostic-check-title]").textContent = plan.title;
  root.querySelector("[data-diagnostic-check-summary]").textContent = plan.summary;

  const list = root.querySelector("[data-diagnostic-check-list]");
  list.innerHTML = "";
  plan.checks.forEach((check, index) => {
    const item = document.createElement("label");
    item.className = "diagnostic-check-item";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = check;
    input.dataset.diagnosticCheck = String(index);
    input.checked = marked.includes(check);
    const labelText = document.createElement("span");
    labelText.textContent = check;
    item.append(input, labelText);
    list.append(item);
  });

  const detailField = root.querySelector("[data-diagnostic-check-detail]");
  if (detailField) {
    detailField.value = stored.detail || "";
  }

  root.querySelectorAll("[data-diagnostic-check-plan]").forEach((button) => {
    const isActive = button.dataset.diagnosticCheckPlan === key;
    button.classList.toggle("utility-link-strong", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  updateDiagnosticCheckCount(root);
  setDiagnosticCheckStatus(root, `${plan.kicker} tracker ready.`);
}

function updateDiagnosticCheckCount(root) {
  const { plan, markedChecks } = getDiagnosticCheckState(root);
  const count = root.querySelector("[data-diagnostic-check-count]");
  const next = root.querySelector("[data-diagnostic-check-next]");
  const remaining = plan.checks.filter((check) => !markedChecks.includes(check));
  if (count) {
    count.textContent = `${markedChecks.length} of ${plan.checks.length} checks marked`;
  }
  if (next) {
    next.textContent = remaining.length ? `Next: ${remaining[0]}.` : `Next: ${plan.next}`;
  }
}

function initDiagnosticCheckTracker() {
  const root = document.querySelector("[data-diagnostic-check-tracker]");
  if (!root) {
    return;
  }

  root.querySelectorAll("[data-diagnostic-check-plan]").forEach((button) => {
    button.addEventListener("click", () => setDiagnosticPlanEverywhere(button.dataset.diagnosticCheckPlan, { updateUrl: true }));
  });

  root.addEventListener("change", (event) => {
    if (event.target.matches("[data-diagnostic-check]")) {
      updateDiagnosticCheckCount(root);
      persistDiagnosticCheckState(root);
      renderDiagnosticResumeCards();
      setDiagnosticCheckStatus(root, "First-check tracker updated on this iPhone.");
    }
  });

  root.querySelector("[data-diagnostic-check-detail]")?.addEventListener("input", () => {
    persistDiagnosticCheckState(root);
    renderDiagnosticResumeCards();
  });

  root.querySelector("[data-copy-diagnostic-checks]")?.addEventListener("click", async (event) => {
    const { plan, markedChecks, detail } = getDiagnosticCheckState(root);
    const text = buildDiagnosticCheckText(plan, markedChecks, detail);
    try {
      const copied = await copyText(text);
      if (copied) {
        hideManualCopyFallback(event.currentTarget);
      } else {
        showManualCopyFallback(event.currentTarget, text);
      }
      setDiagnosticCheckStatus(root, copied ? "First diagnostic checks copied." : "Copy is unavailable in this browser.");
    } catch (error) {
      showManualCopyFallback(event.currentTarget, text);
      setDiagnosticCheckStatus(root, "Copy failed. Select the fallback text below.");
    }
  });

  root.querySelector("[data-share-diagnostic-checks]")?.addEventListener("click", async (event) => {
    const { plan, markedChecks, detail } = getDiagnosticCheckState(root);
    const text = buildDiagnosticCheckText(plan, markedChecks, detail);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline first diagnostic checks", text });
        hideManualCopyFallback(event.currentTarget);
        setDiagnosticCheckStatus(root, "First diagnostic checks shared.");
        return;
      }
      const copied = await copyText(text);
      if (copied) {
        hideManualCopyFallback(event.currentTarget);
      } else {
        showManualCopyFallback(event.currentTarget, text);
      }
      setDiagnosticCheckStatus(root, copied ? "Share unavailable; checks copied instead." : "Share is unavailable in this browser.");
    } catch (error) {
      showManualCopyFallback(event.currentTarget, text);
      setDiagnosticCheckStatus(root, "Share canceled or unavailable. Select the fallback text below.");
    }
  });

  root.querySelector("[data-save-diagnostic-checks]")?.addEventListener("click", () => {
    const { plan, markedChecks, detail } = getDiagnosticCheckState(root);
    try {
      prependGarageGeneralNote(buildSavedDiagnosticCheckNote(plan, markedChecks, detail));
      document.querySelectorAll("[data-diagnostic-call-summary]").forEach(renderDiagnosticCallSummary);
      renderDiagnosticResumeCards();
      setDiagnosticCheckStatus(root, `${plan.kicker} first checks saved to Garage Notes.`);
    } catch (error) {
      setDiagnosticCheckStatus(root, "Could not save first checks in this browser session.");
    }
  });

  renderDiagnosticCheckPlan(root, requestedDiagnosticPlanKey() || "start");
}

function initDiagnosticCallSummary() {
  const root = document.querySelector("[data-diagnostic-call-summary]");
  if (!root) {
    return;
  }

  const stored = loadDiagnosticCallSummary();
  const target = root.querySelector("[data-diagnostic-call-target]");
  const truckStatus = root.querySelector("[data-diagnostic-call-status]");
  const callback = root.querySelector("[data-diagnostic-call-callback]");
  const ask = root.querySelector("[data-diagnostic-call-ask]");
  if (target && stored.target) {
    target.value = stored.target;
  }
  if (truckStatus) {
    truckStatus.value = stored.truckStatus || "";
  }
  if (callback) {
    callback.value = stored.callback || "";
  }
  if (ask) {
    ask.value = stored.ask || "";
  }

  root.querySelectorAll("input, textarea, select").forEach((field) => {
    field.addEventListener("input", () => {
      persistDiagnosticCallSummary(root);
      renderDiagnosticCallSummary(root);
      renderDiagnosticResumeCards();
    });
    field.addEventListener("change", () => {
      persistDiagnosticCallSummary(root);
      renderDiagnosticCallSummary(root);
      renderDiagnosticResumeCards();
    });
  });

  root.querySelector("[data-copy-diagnostic-call]")?.addEventListener("click", async (event) => {
    const text = buildDiagnosticCallText(root);
    try {
      const copied = await copyText(text);
      if (copied) {
        hideManualCopyFallback(event.currentTarget);
      } else {
        showManualCopyFallback(event.currentTarget, text);
      }
      setDiagnosticCallStatus(root, copied ? "Diagnostic call summary copied." : "Copy is unavailable in this browser.");
    } catch (error) {
      showManualCopyFallback(event.currentTarget, text);
      setDiagnosticCallStatus(root, "Copy failed. Select the fallback text below.");
    }
  });

  root.querySelector("[data-share-diagnostic-call]")?.addEventListener("click", async (event) => {
    const text = buildDiagnosticCallText(root);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline diagnostic call summary", text });
        hideManualCopyFallback(event.currentTarget);
        setDiagnosticCallStatus(root, "Diagnostic call summary shared.");
        return;
      }
      const copied = await copyText(text);
      if (copied) {
        hideManualCopyFallback(event.currentTarget);
      } else {
        showManualCopyFallback(event.currentTarget, text);
      }
      setDiagnosticCallStatus(root, copied ? "Share unavailable; call summary copied instead." : "Share is unavailable in this browser.");
    } catch (error) {
      showManualCopyFallback(event.currentTarget, text);
      setDiagnosticCallStatus(root, "Share canceled or unavailable. Select the fallback text below.");
    }
  });

  root.querySelector("[data-save-diagnostic-call]")?.addEventListener("click", () => {
    try {
      prependGarageGeneralNote(`[${diagnosticCallTimestamp()} - Diagnostic Call Summary]\n${buildDiagnosticCallText(root)}`);
      renderDiagnosticResumeCards();
      setDiagnosticCallStatus(root, "Diagnostic call summary saved to Garage Notes.");
    } catch (error) {
      setDiagnosticCallStatus(root, "Could not save the call summary in this browser session.");
    }
  });

  renderDiagnosticCallSummary(root);
  setDiagnosticCallStatus(root, "Call summary ready on this iPhone.");
}

initDiagnosticDecisionGuide();
initDiagnosticLocalResume();
initDiagnosticShareBuilder();
initDiagnosticCheckTracker();
initDiagnosticCallSummary();
window.addEventListener("hashchange", syncDiagnosticToolsToLocation);
window.addEventListener("popstate", syncDiagnosticToolsToLocation);
initGarageCloudSync();
