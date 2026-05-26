import {
  initGarageCloudSync,
  loadJson,
  saveJson,
  STORAGE
} from "./garage-data.js";

const ROADSIDE_RECEIPT_KEY = "ridgeline-roadside-last-handoff";
const ROADSIDE_SESSION_KEY = "ridgeline-roadside-live-session";
const ROADSIDE_CONTACT_KEY = "ridgeline-roadside-contact-card";
const FUSE_NOTE_LAST_KEY = "ridgeline-fuse-check-last-note";
const OFFLINE_ROUTE_RECEIPT_KEY = "ridgeline-offline-route-last-check";
const requestedRoadsidePlan = new URLSearchParams(window.location.search).get("roadside");
const offlineRouteChecks = [
  { label: "Quick Sheet", path: "quick-sheet.html" },
  { label: "Diagnostics", path: "diagnostics.html" },
  { label: "Fuses", path: "hood.html" },
  { label: "Rear Hitch", path: "rear-hitch.html" },
  { label: "7-Way Pinout", path: "rear-hitch.html#pinout" },
  { label: "Garage Backup", path: "garage.html" }
];
let lastOfflineRouteResults = [];
let lastOfflinePrimeSummary = "";

function formatOfflineCheckTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "checked recently";
  }
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function loadOfflineRouteReceipt() {
  try {
    const receipt = JSON.parse(localStorage.getItem(OFFLINE_ROUTE_RECEIPT_KEY) || "null");
    return receipt && Array.isArray(receipt.results) ? receipt : null;
  } catch {
    return null;
  }
}

function saveOfflineRouteReceipt(results, action = "checked") {
  const normalized = Array.isArray(results) ? results : [];
  const readyCount = normalized.filter((route) => route.ready).length;
  const receipt = {
    action,
    savedAt: new Date().toISOString(),
    readyCount,
    totalCount: normalized.length,
    results: normalized.map((route) => ({
      label: route.label,
      path: route.path,
      ready: Boolean(route.ready),
      unavailable: Boolean(route.unavailable)
    }))
  };
  localStorage.setItem(OFFLINE_ROUTE_RECEIPT_KEY, JSON.stringify(receipt));
  return receipt;
}

const fuseNotePlans = {
  accessory: {
    label: "12V accessory power",
    summary: "Phone charger, front accessory socket, console socket, or repeated plug-in issue.",
    routes: ["Diagnostics accessory-power flow", "Cabin fuse table", "Hood fuse table"]
  },
  trailer: {
    label: "Trailer light / adapter",
    summary: "Running, turn, brake, reverse, connector, or adapter symptom before moving.",
    routes: ["Diagnostics trailer-light flow", "Rear Hitch pinout", "Hood/Cabin fuse references"]
  },
  audio: {
    label: "Audio / display",
    summary: "Radio, screen, no-sound, Bluetooth, or recent audio/electrical work.",
    routes: ["Diagnostics audio-display flow", "Cabin fuse table", "Fuse label decoder"]
  },
  start: {
    label: "No-start / battery-adjacent",
    summary: "No-crank, slow-crank, normal crank/no start, recent battery, or fuse work.",
    routes: ["Diagnostics no-start flow", "Hood fuse table", "Battery/jump notes"]
  }
};

const roadsidePlans = {
  flat: {
    kicker: "Flat tire or wheel work",
    title: "Open jack points, pressure, and torque",
    summary: "Use the truck placard and the closest jack point, then keep torque and pressure values visible before moving.",
    steps: [
      "Park safely, set the brake, and confirm the tire/wheel position.",
      "Open the jack map before lifting and use the point closest to the flat tire.",
      "After wheel work, torque wheel nuts to 94 lb-ft in a star pattern and recheck."
    ],
    reference: "Reference: tire card, jack map, door placard.",
    primary: { label: "Tire Card", href: "#tires" },
    secondary: { label: "Jack Map", href: "index.html?system=jack-points#viewer" }
  },
  start: {
    kicker: "No start or weak battery",
    title: "Capture power symptoms before chasing fuses",
    summary: "Separate no-crank, slow-crank, and normal-crank/no-start before jumping into deeper references.",
    steps: [
      "Note whether the starter is silent, slow, or cranking normally.",
      "Open the no-start flow, then use jump notes only if the truck is safe to inspect.",
      "Save a Garage note if the issue follows battery work, fuse work, or repeat short trips."
    ],
    reference: "Reference: no-start flow, battery/jump card, Garage notes.",
    primary: { label: "No-Start Flow", href: "diagnostics.html#no-start-workflow" },
    secondary: { label: "Jump Notes", href: "hood.html#wiring" }
  },
  warning: {
    kicker: "Warning light or MID message",
    title: "Record exact wording before guessing",
    summary: "Color, wording, multiple lights, and recent service context matter more than memory after the light goes away.",
    steps: [
      "Write the exact indicator or MID message and whether it is red or amber.",
      "Check whether multiple systems lit up after battery, fuse, tire, or service work.",
      "Open the warning-light flow and save the structured note before clearing context."
    ],
    reference: "Reference: warning-light flow, emergency card, Garage warning note.",
    primary: { label: "Warning Flow", href: "diagnostics.html#warning-light-workflow" },
    secondary: { label: "Save Warning Note", href: "garage.html#warning-light-template" }
  },
  trailer: {
    kicker: "Trailer light or tow setup",
    title: "Confirm hookup, pinout, and symptom side",
    summary: "Keep the 7-way pinout visible while checking whether the truck, adapter, or trailer side changed.",
    steps: [
      "Confirm coupler, hitch pin, chains, and wiring are connected before moving.",
      "Test running lights, both turns, brake lights, and reverse lights in place.",
      "Use the trailer-light flow if one side, one function, or every trailer light fails."
    ],
    reference: "Reference: towing card, 7-way pinout, trailer-light flow.",
    primary: { label: "Tow Card", href: "#towing" },
    secondary: { label: "Trailer Flow", href: "diagnostics.html#trailer-light-workflow" }
  }
};

function buildHandoff(plan) {
  return [
    `Ridgeline roadside: ${plan.kicker}`,
    plan.title,
    ...plan.steps.map((step, index) => `${index + 1}. ${step}`),
    plan.reference
  ].join("\n");
}

function buildSavedRoadsideNote(plan) {
  const timestamp = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
  return [
    `[${timestamp} - Roadside Note: ${plan.kicker}]`,
    plan.title,
    "",
    ...plan.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    plan.reference,
    "Saved from Quick Sheet Roadside Action Stack. Current roadside conditions, truck labels, and the owner's manual remain final authority."
  ].join("\n");
}

function buildPrintPackHandoff() {
  const receipt = loadOfflineRouteReceipt();
  const routeLines = lastOfflineRouteResults.length
    ? lastOfflineRouteResults.map((route) => `- ${route.label}: ${route.ready ? "cached" : "check while online"}`)
    : receipt?.results?.length
      ? receipt.results.map((route) => `- ${route.label}: ${route.ready ? "cached" : "check while online"}`)
    : ["- Route check: run Check Routes while online before leaving signal."];
  const primeLine = lastOfflinePrimeSummary ? [`Route prime: ${lastOfflinePrimeSummary}`] : [];
  const receiptLine = receipt
    ? [`Last saved route check: ${receipt.readyCount}/${receipt.totalCount} ready at ${formatOfflineCheckTime(receipt.savedAt)}`]
    : [];
  return [
    "Ridgeline Quick Sheet prep before signal drops",
    "1. Refresh the offline pack while still online.",
    "2. Print or save the Quick Sheet PDF for glove-box use.",
    "3. Download a Garage backup from the Backup Checkpoint.",
    "4. Use truck labels, owner's manual, fuse covers, and current conditions as final authority.",
    "Offline route check:",
    ...receiptLine,
    ...routeLines,
    ...primeLine
  ].join("\n");
}

function buildOfflineRoutePlan() {
  const results = lastOfflineRouteResults.length
    ? lastOfflineRouteResults
    : offlineRouteChecks.map((route) => ({ ...route, ready: false, unchecked: true }));
  const readyRoutes = results.filter((route) => route.ready);
  const openRoutes = results.filter((route) => !route.ready);
  const readyLines = readyRoutes.length
    ? readyRoutes.map((route) => `- ${route.label}: cached`)
    : ["- None confirmed yet"];
  const openLines = openRoutes.length
    ? openRoutes.map((route) => `- ${route.label}: ${route.path}`)
    : ["- All key roadside routes are currently found in cache"];
  const intro = lastOfflineRouteResults.length
    ? `${readyRoutes.length}/${results.length} key routes found in the offline cache.`
    : "Run Check Routes or Prime Routes while online to confirm cache state.";

  return [
    "Ridgeline roadside offline route plan",
    intro,
    "",
    "Cached routes:",
    ...readyLines,
    "",
    "Open while online if needed:",
    ...openLines,
    "",
    "Keep the printed Quick Sheet and Garage backup ready before coverage drops."
  ].join("\n");
}

function buildFuseNoteText(root) {
  const key = root?.dataset.currentFuseNote || "accessory";
  const plan = fuseNotePlans[key] || fuseNotePlans.accessory;
  const detail = `${root?.querySelector("[data-fuse-note-context]")?.value || ""}`.trim();
  const lines = [
    `Ridgeline fuse check: ${plan.label}`,
    plan.summary,
    detail ? `Owner note: ${detail}` : "Owner note: add cover-label wording, photo context, or exact symptom before replacing anything.",
    "Next routes:",
    ...plan.routes.map((route) => `- ${route}`),
    "Use the truck's fuse-cover label, owner's manual, and current condition as final authority before pulling or replacing a fuse."
  ];
  return lines.join("\n");
}

function saveLastFuseNote(root, text) {
  const key = root?.dataset.currentFuseNote || "accessory";
  const plan = fuseNotePlans[key] || fuseNotePlans.accessory;
  localStorage.setItem(FUSE_NOTE_LAST_KEY, JSON.stringify({
    key,
    title: plan.label,
    savedAt: new Date().toISOString(),
    text
  }));
}

function loadRoadsideReceipt() {
  try {
    return JSON.parse(localStorage.getItem(ROADSIDE_RECEIPT_KEY) || "null");
  } catch {
    return null;
  }
}

function saveRoadsideReceipt(receipt) {
  localStorage.setItem(ROADSIDE_RECEIPT_KEY, JSON.stringify(receipt));
}

function loadRoadsideSession() {
  try {
    return JSON.parse(localStorage.getItem(ROADSIDE_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function saveRoadsideSession(session) {
  localStorage.setItem(ROADSIDE_SESSION_KEY, JSON.stringify(session));
}

function clearRoadsideSession() {
  localStorage.removeItem(ROADSIDE_SESSION_KEY);
}

function loadRoadsideContact() {
  try {
    return JSON.parse(localStorage.getItem(ROADSIDE_CONTACT_KEY) || "null") || {};
  } catch {
    return {};
  }
}

function saveRoadsideContact(contact) {
  localStorage.setItem(ROADSIDE_CONTACT_KEY, JSON.stringify(contact));
}

function hasRoadsideContact(contact) {
  return ["location", "callback", "helper", "eta"].some((key) => `${contact?.[key] || ""}`.trim());
}

function roadsideContactLines(contact = loadRoadsideContact()) {
  const fields = [
    ["Location", contact.location],
    ["Callback", contact.callback],
    ["Help/tow", contact.helper],
    ["ETA/next check", contact.eta]
  ].filter((entry) => `${entry[1] || ""}`.trim());

  return fields.length
    ? ["Roadside contact:", ...fields.map(([label, value]) => `- ${label}: ${value.trim()}`)]
    : ["Roadside contact: add location/callback details before sending if needed."];
}

function buildRoadsideContactText(contact = loadRoadsideContact()) {
  return [
    "Ridgeline roadside contact card",
    ...roadsideContactLines(contact),
    "Saved from Quick Sheet. Use current roadside conditions, local emergency guidance, and the owner's manual as final authority."
  ].join("\n");
}

function renderRoadsideReceipt(root) {
  const receiptCard = root.querySelector("[data-roadside-receipt]");
  if (!receiptCard) {
    return;
  }

  const receipt = loadRoadsideReceipt();
  receiptCard.hidden = !receipt;
  if (!receipt) {
    return;
  }

  receiptCard.querySelector("[data-roadside-receipt-title]").textContent = receipt.title || "Roadside note saved";
  receiptCard.querySelector("[data-roadside-receipt-summary]").textContent =
    receipt.summary || "Saved into Garage Notes from Quick Sheet.";
  receiptCard.querySelector("[data-roadside-receipt-meta]").textContent =
    `${receipt.savedAt || "Saved recently"} / ${receipt.reference || "Garage Notes"}`;
}

function currentReceiptText() {
  const receipt = loadRoadsideReceipt();
  return receipt?.text || "";
}

function formatSessionTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatElapsed(startedAt) {
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) {
    return "Elapsed: not started";
  }
  const minutes = Math.max(0, Math.floor((Date.now() - started) / 60000));
  if (minutes < 1) {
    return "Elapsed: under 1 min";
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours ? `Elapsed: ${hours}h ${remaining}m` : `Elapsed: ${minutes} min`;
}

function buildRoadsideSessionText(session) {
  const plan = roadsidePlans[session?.planKey] || roadsidePlans.flat;
  const checkpoints = Array.isArray(session?.checkpoints) ? session.checkpoints : [];
  const checkpointLines = checkpoints.length
    ? checkpoints.map((item, index) => `${index + 1}. ${item.label} - ${formatSessionTime(item.at)}`)
    : ["1. No checkpoints marked yet."];
  return [
    `Ridgeline live roadside update: ${plan.kicker}`,
    `${plan.title}`,
    `Started: ${formatSessionTime(session?.startedAt)}`,
    formatElapsed(session?.startedAt),
    ...roadsideContactLines(),
    "Checkpoints:",
    ...checkpointLines,
    plan.reference,
    "Current roadside conditions, truck labels, and the owner's manual remain final authority."
  ].join("\n");
}

function buildRoadsideDispatchText(root) {
  const session = loadRoadsideSession();
  const planKey = session?.planKey || root?.dataset.currentRoadsidePlan || "flat";
  const plan = roadsidePlans[planKey] || roadsidePlans.flat;
  const routeLines = lastOfflineRouteResults.length
    ? lastOfflineRouteResults.map((route) => `- ${route.label}: ${route.ready ? "cached" : "open while online"}`)
    : ["- Route cache: run Check Routes or Prime Routes before leaving signal."];
  const checkpoints = Array.isArray(session?.checkpoints) ? session.checkpoints : [];
  const checkpointLines = checkpoints.length
    ? checkpoints.map((item, index) => `${index + 1}. ${item.label} - ${formatSessionTime(item.at)}`)
    : ["1. No live checkpoints marked yet."];
  return [
    `Ridgeline roadside dispatch: ${plan.kicker}`,
    plan.title,
    `Primary route: ${plan.primary.label} (${plan.primary.href})`,
    `Backup route: ${plan.secondary.label} (${plan.secondary.href})`,
    "",
    ...roadsideContactLines(),
    "",
    session ? `Session started: ${formatSessionTime(session.startedAt)}` : "Session: not started on this iPhone.",
    session ? formatElapsed(session.startedAt) : "",
    "Checkpoints:",
    ...checkpointLines,
    "",
    "Offline route status:",
    ...routeLines,
    "",
    plan.reference,
    "Current roadside conditions, truck labels, local emergency guidance, and the owner's manual remain final authority."
  ].filter(Boolean).join("\n");
}

function renderRoadsideContact(root) {
  const card = root.querySelector("[data-roadside-contact-card]");
  if (!card) {
    return;
  }

  const contact = loadRoadsideContact();
  card.querySelectorAll("[data-roadside-contact-field]").forEach((field) => {
    const key = field.dataset.roadsideContactField;
    if (key && field.value !== (contact[key] || "")) {
      field.value = contact[key] || "";
    }
  });

  const preview = card.querySelector("[data-roadside-contact-preview]");
  if (preview) {
    preview.textContent = hasRoadsideContact(contact)
      ? roadsideContactLines(contact).slice(1).join(" / ")
      : "Add location or callback detail to include it in copied roadside updates.";
  }
}

function renderRoadsideSession(root) {
  const card = root.querySelector("[data-roadside-live-session]");
  if (!card) {
    return;
  }

  const session = loadRoadsideSession();
  const title = card.querySelector("[data-roadside-live-title]");
  const summary = card.querySelector("[data-roadside-live-summary]");
  const elapsed = card.querySelector("[data-roadside-live-elapsed]");
  const count = card.querySelector("[data-roadside-live-count]");
  const checks = card.querySelector("[data-roadside-live-checks]");
  const startButton = card.querySelector("[data-start-roadside-session]");
  const plan = roadsidePlans[session?.planKey] || roadsidePlans[root.dataset.currentRoadsidePlan] || roadsidePlans.flat;
  const checkpoints = Array.isArray(session?.checkpoints) ? session.checkpoints : [];

  title.textContent = session ? `${plan.kicker} session running` : "No session running";
  summary.textContent = session
    ? "Copy a live update or save the session log when the roadside event is stable."
    : "Start when stopped safely, then mark major checkpoints so the next update is ready to copy or save.";
  elapsed.textContent = session ? formatElapsed(session.startedAt) : "Elapsed: not started";
  count.textContent = `${checkpoints.length} ${checkpoints.length === 1 ? "checkpoint" : "checkpoints"}`;
  startButton.textContent = session ? "Restart Session" : "Start Session";
  checks.replaceChildren();
  if (checkpoints.length) {
    checkpoints.forEach((item) => {
      const row = document.createElement("span");
      const time = document.createElement("small");
      row.textContent = item.label || "Roadside checkpoint";
      time.textContent = formatSessionTime(item.at);
      row.appendChild(time);
      checks.appendChild(row);
    });
    return;
  }
  const empty = document.createElement("span");
  empty.textContent = "No checkpoints yet";
  checks.appendChild(empty);
}

function renderRoadsideDispatch(root) {
  const card = root.querySelector("[data-roadside-dispatch-pack]");
  if (!card) {
    return;
  }

  const session = loadRoadsideSession();
  const plan = roadsidePlans[session?.planKey] || roadsidePlans[root.dataset.currentRoadsidePlan] || roadsidePlans.flat;
  const contact = loadRoadsideContact();
  const readyCount = lastOfflineRouteResults.filter((route) => route.ready).length;
  const routeSummary = lastOfflineRouteResults.length
    ? `${readyCount}/${lastOfflineRouteResults.length} routes cached`
    : "routes not checked";
  const checkpointCount = Array.isArray(session?.checkpoints) ? session.checkpoints.length : 0;
  const contactSummary = hasRoadsideContact(contact) ? "contact ready" : "contact not filled";
  const preview = card.querySelector("[data-roadside-dispatch-preview]");
  if (preview) {
    preview.textContent = `${plan.kicker} / ${contactSummary} / ${checkpointCount} checkpoints / ${routeSummary}.`;
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

function setStatus(root, message) {
  const status = root.querySelector("[data-roadside-status]");
  if (status) {
    status.textContent = message;
  }
}

function setFuseNoteStatus(root, message) {
  const status = root.querySelector("[data-fuse-note-status]");
  if (status) {
    status.textContent = message;
  }
}

function renderFuseNote(root) {
  const key = root.dataset.currentFuseNote || "accessory";
  const plan = fuseNotePlans[key] || fuseNotePlans.accessory;
  const preview = root.querySelector("[data-fuse-note-preview]");
  root.querySelectorAll("[data-fuse-note-symptom]").forEach((button) => {
    const isActive = button.dataset.fuseNoteSymptom === key;
    button.classList.toggle("utility-link-strong", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  if (preview) {
    preview.innerHTML = `
      <span>${plan.label}</span>
      <strong>${plan.summary}</strong>
      <small>Routes: ${plan.routes.join(" / ")}</small>
    `;
  }
}

function updateRoadsidePlan(root, key) {
  const plan = roadsidePlans[key] || roadsidePlans.flat;
  root.dataset.currentRoadsidePlan = key;
  root.querySelector("[data-roadside-kicker]").textContent = plan.kicker;
  root.querySelector("[data-roadside-title]").textContent = plan.title;
  root.querySelector("[data-roadside-summary]").textContent = plan.summary;
  root.querySelector("[data-roadside-reference]").textContent = plan.reference;

  const steps = root.querySelector("[data-roadside-steps]");
  steps.innerHTML = plan.steps.map((step) => `<li>${step}</li>`).join("");

  const primary = root.querySelector("[data-roadside-primary]");
  const secondary = root.querySelector("[data-roadside-secondary]");
  primary.textContent = plan.primary.label;
  primary.setAttribute("href", plan.primary.href);
  secondary.textContent = plan.secondary.label;
  secondary.setAttribute("href", plan.secondary.href);

  root.querySelectorAll("[data-roadside-plan]").forEach((button) => {
    const isActive = button.dataset.roadsidePlan === key;
    button.classList.toggle("utility-link-strong", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  setStatus(root, `${plan.kicker} handoff ready.`);
  renderRoadsideSession(root);
  renderRoadsideDispatch(root);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

async function refreshServiceWorkerRegistrations() {
  if (!("serviceWorker" in navigator)) {
    return false;
  }
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.update()));
  return registrations.length > 0;
}

function setPrintPackStatus(root, message) {
  const status = root.querySelector("[data-print-pack-status]");
  if (status) {
    status.textContent = message;
  }
}

function renderQuickOfflineStatus(root, message = "") {
  const status = root.querySelector("[data-quick-offline-status]");
  if (!status) {
    return;
  }
  if (!("serviceWorker" in navigator)) {
    status.textContent = "Offline pack unavailable";
    return;
  }
  const ready = Boolean(navigator.serviceWorker.controller);
  const network = navigator.onLine === false ? "Offline" : "Online";
  status.textContent = message || `${network}; ${ready ? "offline pack ready" : "offline pack loading"}`;
}

function offlineRouteRequest(path) {
  const url = new URL(path, window.location.href);
  url.hash = "";
  return new Request(url.href, { method: "GET" });
}

async function checkOfflineRoutes() {
  if (!("caches" in window)) {
    return offlineRouteChecks.map((route) => ({ ...route, ready: false, unavailable: true }));
  }

  const results = await Promise.all(offlineRouteChecks.map(async (route) => {
    try {
      const match = await caches.match(offlineRouteRequest(route.path), { ignoreSearch: true });
      return { ...route, ready: Boolean(match) };
    } catch (error) {
      return { ...route, ready: false, unavailable: true };
    }
  }));
  lastOfflineRouteResults = results;
  return results;
}

async function cacheKeyForOfflinePrime() {
  const keys = await caches.keys();
  const ridgelineKeys = keys.filter((key) => key.startsWith("ridgeline-console-"));
  return ridgelineKeys.at(-1) || "ridgeline-console-manual";
}

async function primeOfflineRoutes() {
  if (!("caches" in window)) {
    return offlineRouteChecks.map((route) => ({ ...route, primed: false, ready: false, unavailable: true }));
  }

  const cache = await caches.open(await cacheKeyForOfflinePrime());
  const results = await Promise.all(offlineRouteChecks.map(async (route) => {
    const request = offlineRouteRequest(route.path);
    try {
      const response = await fetch(request, { cache: "reload" });
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      const match = await caches.match(request, { ignoreSearch: true });
      return { ...route, primed: true, ready: Boolean(match) };
    } catch (error) {
      const match = await caches.match(request, { ignoreSearch: true });
      return { ...route, primed: false, ready: Boolean(match), unavailable: !match };
    }
  }));
  lastOfflineRouteResults = results;
  const readyCount = results.filter((route) => route.ready).length;
  lastOfflinePrimeSummary = `${readyCount}/${results.length} routes ready after prime`;
  return results;
}

function renderOfflineRouteResults(root, results = lastOfflineRouteResults) {
  const summary = root.querySelector("[data-offline-route-summary]");
  const list = root.querySelector("[data-offline-route-list]");
  if (!summary || !list) {
    return;
  }

  if (!results.length) {
    summary.textContent = "Check cached routes before leaving signal.";
    list.innerHTML = offlineRouteChecks
      .map((route) => `<li data-route-status="unknown">${route.label}</li>`)
      .join("");
    return;
  }

  const readyCount = results.filter((route) => route.ready).length;
  const unavailable = results.some((route) => route.unavailable);
  summary.textContent = unavailable
    ? "This browser could not inspect the cache; refresh while online."
    : `${readyCount}/${results.length} key routes found in the offline cache.`;
  list.innerHTML = results
    .map((route) => `<li data-route-status="${route.ready ? "ready" : "missing"}"><a href="${route.path}">${route.label}</a></li>`)
    .join("");

  document.querySelectorAll("[data-roadside-stack]").forEach((stackRoot) => renderRoadsideDispatch(stackRoot));
}

function renderOfflineRouteReceipt(root, receipt = loadOfflineRouteReceipt()) {
  const card = root.querySelector("[data-offline-route-receipt]");
  if (!card) {
    return;
  }

  card.hidden = !receipt;
  if (!receipt) {
    return;
  }

  const title = card.querySelector("[data-offline-receipt-title]");
  const summary = card.querySelector("[data-offline-receipt-summary]");
  const missing = card.querySelector("[data-offline-missing-routes]");
  const missingRoutes = receipt.results.filter((route) => !route.ready);
  const readyText = `${receipt.readyCount}/${receipt.totalCount} routes ready`;

  if (title) {
    title.textContent = `${readyText} after ${receipt.action === "primed" ? "prime" : "check"}`;
  }
  if (summary) {
    summary.textContent = `${formatOfflineCheckTime(receipt.savedAt)}. ${missingRoutes.length ? "Open missing routes while online before coverage drops." : "All key routes were found in this browser cache."}`;
  }
  if (missing) {
    missing.replaceChildren();
    if (!missingRoutes.length) {
      const allSet = document.createElement("span");
      allSet.textContent = "No missing routes from the last check";
      missing.appendChild(allSet);
      return;
    }
    missingRoutes.forEach((route) => {
      const link = document.createElement("a");
      link.className = "utility-link";
      link.href = route.path;
      link.textContent = route.label;
      missing.appendChild(link);
    });
  }
}

function initQuickPrintPack() {
  const root = document.querySelector("[data-quick-print-pack]");
  if (!root) {
    return;
  }

  renderQuickOfflineStatus(root);
  renderOfflineRouteResults(root);
  renderOfflineRouteReceipt(root);
  navigator.serviceWorker?.ready?.then(() => renderQuickOfflineStatus(root)).catch(() => {});
  navigator.serviceWorker?.addEventListener?.("controllerchange", () => renderQuickOfflineStatus(root, "Offline pack updated"));
  window.addEventListener("online", () => renderQuickOfflineStatus(root));
  window.addEventListener("offline", () => renderQuickOfflineStatus(root));

  root.querySelector("[data-refresh-quick-pack]")?.addEventListener("click", async () => {
    renderQuickOfflineStatus(root, "Checking offline pack");
    try {
      const hadRegistrations = await refreshServiceWorkerRegistrations();
      const routeResults = await checkOfflineRoutes();
      const receipt = saveOfflineRouteReceipt(routeResults, "checked");
      renderOfflineRouteResults(root, routeResults);
      renderOfflineRouteReceipt(root, receipt);
      renderQuickOfflineStatus(root, hadRegistrations ? "Offline pack update check complete" : "Offline pack not registered yet");
      setPrintPackStatus(root, hadRegistrations ? "Offline pack update check complete." : "Open the site once while online to finish offline setup.");
    } catch (error) {
      renderQuickOfflineStatus(root, "Offline pack check failed");
      setPrintPackStatus(root, "Could not refresh the offline pack in this browser session.");
    }
  });

  root.querySelector("[data-check-offline-routes]")?.addEventListener("click", async () => {
    setPrintPackStatus(root, "Checking cached roadside routes...");
    try {
      const routeResults = await checkOfflineRoutes();
      const receipt = saveOfflineRouteReceipt(routeResults, "checked");
      renderOfflineRouteResults(root, routeResults);
      renderOfflineRouteReceipt(root, receipt);
      const readyCount = routeResults.filter((route) => route.ready).length;
      setPrintPackStatus(root, `${readyCount}/${routeResults.length} key offline routes found.`);
    } catch (error) {
      renderOfflineRouteResults(root, []);
      setPrintPackStatus(root, "Could not inspect cached routes in this browser session.");
    }
  });

  root.querySelector("[data-prime-offline-routes]")?.addEventListener("click", async () => {
    setPrintPackStatus(root, "Priming key roadside routes while online...");
    try {
      const routeResults = await primeOfflineRoutes();
      const receipt = saveOfflineRouteReceipt(routeResults, "primed");
      renderOfflineRouteResults(root, routeResults);
      renderOfflineRouteReceipt(root, receipt);
      const readyCount = routeResults.filter((route) => route.ready).length;
      const unavailable = routeResults.every((route) => route.unavailable);
      renderQuickOfflineStatus(root, `${readyCount}/${routeResults.length} routes ready`);
      setPrintPackStatus(root, unavailable
        ? `${readyCount}/${routeResults.length} roadside routes checked; browser cache unavailable in this session.`
        : `${readyCount}/${routeResults.length} roadside routes primed for offline use.`);
    } catch (error) {
      setPrintPackStatus(root, "Could not prime routes in this browser session; open each key page once while online.");
    }
  });

  root.querySelector("[data-copy-offline-route-plan]")?.addEventListener("click", async () => {
    try {
      const copied = await copyText(buildOfflineRoutePlan());
      setPrintPackStatus(root, copied ? "Offline route plan copied." : "Copy is unavailable in this browser.");
    } catch (error) {
      setPrintPackStatus(root, "Copy failed. Run Check Routes, then select the route list if needed.");
    }
  });

  root.querySelector("[data-copy-print-pack]")?.addEventListener("click", async () => {
    try {
      const copied = await copyText(buildPrintPackHandoff());
      setPrintPackStatus(root, copied ? "Print prep copied." : "Copy is unavailable in this browser.");
    } catch (error) {
      setPrintPackStatus(root, "Copy failed. Select and copy the visible prep steps instead.");
    }
  });

  root.querySelector("[data-share-print-pack]")?.addEventListener("click", async () => {
    const text = buildPrintPackHandoff();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline Quick Sheet prep", text });
        setPrintPackStatus(root, "Print prep shared.");
        return;
      }
      const copied = await copyText(text);
      setPrintPackStatus(root, copied ? "Share unavailable; print prep copied instead." : "Share is unavailable in this browser.");
    } catch (error) {
      setPrintPackStatus(root, "Share canceled or unavailable.");
    }
  });
}

function initFuseCheckNote() {
  const root = document.querySelector("[data-fuse-check-note]");
  if (!root) {
    return;
  }

  root.dataset.currentFuseNote = "accessory";
  root.querySelectorAll("[data-fuse-note-symptom]").forEach((button) => {
    button.addEventListener("click", () => {
      root.dataset.currentFuseNote = button.dataset.fuseNoteSymptom || "accessory";
      renderFuseNote(root);
      setFuseNoteStatus(root, `${(fuseNotePlans[root.dataset.currentFuseNote] || fuseNotePlans.accessory).label} note ready.`);
    });
  });
  root.querySelector("[data-fuse-note-context]")?.addEventListener("input", () => renderFuseNote(root));

  root.querySelector("[data-copy-fuse-note]")?.addEventListener("click", async () => {
    try {
      const copied = await copyText(buildFuseNoteText(root));
      setFuseNoteStatus(root, copied ? "Fuse check note copied." : "Copy is unavailable in this browser.");
    } catch (error) {
      setFuseNoteStatus(root, "Copy failed. Keep the note visible for reference.");
    }
  });

  root.querySelector("[data-share-fuse-note]")?.addEventListener("click", async () => {
    const text = buildFuseNoteText(root);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline fuse check note", text });
        setFuseNoteStatus(root, "Fuse check note shared.");
        return;
      }
      const copied = await copyText(text);
      setFuseNoteStatus(root, copied ? "Share unavailable; fuse note copied instead." : "Share is unavailable in this browser.");
    } catch (error) {
      setFuseNoteStatus(root, "Share canceled or unavailable.");
    }
  });

  root.querySelector("[data-save-fuse-note]")?.addEventListener("click", () => {
    const key = root.dataset.currentFuseNote || "accessory";
    const plan = fuseNotePlans[key] || fuseNotePlans.accessory;
    const timestamp = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
    const text = [
      `[${timestamp} - Fuse Check Note: ${plan.label}]`,
      buildFuseNoteText(root)
    ].join("\n");
    try {
      prependGarageGeneralNote(text);
      saveLastFuseNote(root, text);
      setFuseNoteStatus(root, `${plan.label} saved to Garage Notes.`);
    } catch (error) {
      setFuseNoteStatus(root, "Could not save the fuse note in this browser session.");
    }
  });

  renderFuseNote(root);
}

function initRoadsideStack() {
  const root = document.querySelector("[data-roadside-stack]");
  if (!root) {
    return;
  }

  root.querySelectorAll("[data-roadside-plan]").forEach((button) => {
    button.addEventListener("click", () => updateRoadsidePlan(root, button.dataset.roadsidePlan));
  });

  root.querySelector("[data-copy-roadside-stack]")?.addEventListener("click", async () => {
    const plan = roadsidePlans[root.dataset.currentRoadsidePlan] || roadsidePlans.flat;
    try {
      const copied = await copyText(buildHandoff(plan));
      setStatus(root, copied ? "Roadside handoff copied." : "Copy is unavailable in this browser.");
    } catch (error) {
      setStatus(root, "Copy failed. Select and copy the visible steps instead.");
    }
  });

  root.querySelector("[data-share-roadside-stack]")?.addEventListener("click", async () => {
    const plan = roadsidePlans[root.dataset.currentRoadsidePlan] || roadsidePlans.flat;
    const text = buildHandoff(plan);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline roadside handoff", text });
        setStatus(root, "Roadside handoff shared.");
        return;
      }
      const copied = await copyText(text);
      setStatus(root, copied ? "Share unavailable; handoff copied instead." : "Share is unavailable in this browser.");
    } catch (error) {
      setStatus(root, "Share canceled or unavailable.");
    }
  });

  root.querySelector("[data-save-roadside-note]")?.addEventListener("click", () => {
    const planKey = root.dataset.currentRoadsidePlan || "flat";
    const plan = roadsidePlans[planKey] || roadsidePlans.flat;
    const noteText = buildSavedRoadsideNote(plan);
    const savedAt = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });

    try {
      prependGarageGeneralNote(noteText);
      saveRoadsideReceipt({
        planKey,
        title: plan.kicker,
        summary: `${plan.title} saved into Garage Notes.`,
        reference: plan.reference.replace(/^Reference:\s*/i, ""),
        savedAt,
        text: noteText
      });
      renderRoadsideReceipt(root);
      setStatus(root, `${plan.kicker} saved to Garage Notes.`);
      renderRoadsideDispatch(root);
    } catch (error) {
      setStatus(root, "Could not save the roadside note in this browser session.");
    }
  });

  root.querySelector("[data-copy-roadside-receipt]")?.addEventListener("click", async () => {
    const text = currentReceiptText();
    if (!text) {
      setStatus(root, "Save a roadside note before copying the receipt.");
      return;
    }

    try {
      const copied = await copyText(text);
      setStatus(root, copied ? "Saved roadside note copied." : "Copy is unavailable in this browser.");
    } catch (error) {
      setStatus(root, "Copy failed. Open Garage Notes to select the saved note.");
    }
  });

  root.querySelector("[data-share-roadside-receipt]")?.addEventListener("click", async () => {
    const text = currentReceiptText();
    if (!text) {
      setStatus(root, "Save a roadside note before sharing the receipt.");
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline roadside note", text });
        setStatus(root, "Saved roadside note shared.");
        return;
      }
      const copied = await copyText(text);
      setStatus(root, copied ? "Share unavailable; saved note copied instead." : "Share is unavailable in this browser.");
    } catch (error) {
      setStatus(root, "Share canceled or unavailable.");
    }
  });

  root.querySelectorAll("[data-roadside-contact-field]").forEach((field) => {
    field.addEventListener("input", () => {
      const contact = loadRoadsideContact();
      contact[field.dataset.roadsideContactField] = field.value.trim();
      saveRoadsideContact(contact);
      renderRoadsideContact(root);
      renderRoadsideDispatch(root);
      setStatus(root, "Roadside contact card saved on this iPhone.");
    });
  });

  root.querySelector("[data-copy-roadside-contact]")?.addEventListener("click", async () => {
    try {
      const copied = await copyText(buildRoadsideContactText());
      setStatus(root, copied ? "Roadside contact card copied." : "Copy is unavailable in this browser.");
    } catch (error) {
      setStatus(root, "Copy failed. Keep the contact card visible for reference.");
    }
  });

  root.querySelector("[data-save-roadside-contact]")?.addEventListener("click", () => {
    try {
      prependGarageGeneralNote(buildRoadsideContactText());
      renderRoadsideDispatch(root);
      setStatus(root, "Roadside contact card saved to Garage Notes.");
    } catch (error) {
      setStatus(root, "Could not save the roadside contact card in this browser.");
    }
  });

  root.querySelector("[data-start-roadside-session]")?.addEventListener("click", () => {
    const planKey = root.dataset.currentRoadsidePlan || "flat";
    saveRoadsideSession({
      planKey,
      startedAt: new Date().toISOString(),
      checkpoints: [{
        label: "Session started",
        at: new Date().toISOString()
      }]
    });
    renderRoadsideSession(root);
    renderRoadsideDispatch(root);
    setStatus(root, "Live roadside session started on this iPhone.");
  });

  root.querySelectorAll("[data-roadside-checkpoint]").forEach((button) => {
    button.addEventListener("click", () => {
      const planKey = root.dataset.currentRoadsidePlan || "flat";
      const session = loadRoadsideSession() || {
        planKey,
        startedAt: new Date().toISOString(),
        checkpoints: []
      };
      session.planKey = session.planKey || planKey;
      session.checkpoints = Array.isArray(session.checkpoints) ? session.checkpoints : [];
      session.checkpoints.push({
        label: button.dataset.roadsideCheckpoint,
        at: new Date().toISOString()
      });
      saveRoadsideSession(session);
      renderRoadsideSession(root);
      renderRoadsideDispatch(root);
      setStatus(root, `${button.dataset.roadsideCheckpoint} checkpoint added.`);
    });
  });

  root.querySelector("[data-copy-roadside-session]")?.addEventListener("click", async () => {
    const session = loadRoadsideSession();
    if (!session) {
      setStatus(root, "Start a live roadside session before copying an update.");
      return;
    }
    try {
      const copied = await copyText(buildRoadsideSessionText(session));
      setStatus(root, copied ? "Live roadside update copied." : "Copy is unavailable in this browser.");
    } catch (error) {
      setStatus(root, "Copy failed. Keep the session card visible for reference.");
    }
  });

  root.querySelector("[data-save-roadside-session]")?.addEventListener("click", () => {
    const session = loadRoadsideSession();
    if (!session) {
      setStatus(root, "Start a live roadside session before saving a log.");
      return;
    }
    try {
      prependGarageGeneralNote(buildRoadsideSessionText(session));
      renderRoadsideDispatch(root);
      setStatus(root, "Live roadside session saved to Garage Notes.");
    } catch (error) {
      setStatus(root, "Could not save the live roadside session in this browser.");
    }
  });

  root.querySelector("[data-reset-roadside-session]")?.addEventListener("click", () => {
    clearRoadsideSession();
    renderRoadsideSession(root);
    renderRoadsideDispatch(root);
    setStatus(root, "Live roadside session reset on this iPhone.");
  });

  root.querySelector("[data-copy-roadside-dispatch]")?.addEventListener("click", async () => {
    try {
      const copied = await copyText(buildRoadsideDispatchText(root));
      setStatus(root, copied ? "Roadside dispatch pack copied." : "Copy is unavailable in this browser.");
    } catch (error) {
      setStatus(root, "Copy failed. Keep the dispatch pack visible for reference.");
    }
  });

  root.querySelector("[data-share-roadside-dispatch]")?.addEventListener("click", async () => {
    const text = buildRoadsideDispatchText(root);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline roadside dispatch pack", text });
        setStatus(root, "Roadside dispatch pack shared.");
        return;
      }
      const copied = await copyText(text);
      setStatus(root, copied ? "Share unavailable; dispatch pack copied instead." : "Share is unavailable in this browser.");
    } catch (error) {
      setStatus(root, "Share canceled or unavailable.");
    }
  });

  root.querySelector("[data-save-roadside-dispatch]")?.addEventListener("click", () => {
    try {
      prependGarageGeneralNote(buildRoadsideDispatchText(root));
      setStatus(root, "Roadside dispatch pack saved to Garage Notes.");
    } catch (error) {
      setStatus(root, "Could not save the roadside dispatch pack in this browser.");
    }
  });

  updateRoadsidePlan(root, roadsidePlans[requestedRoadsidePlan] ? requestedRoadsidePlan : "flat");
  renderRoadsideReceipt(root);
  renderRoadsideContact(root);
  renderRoadsideSession(root);
  renderRoadsideDispatch(root);
  window.setInterval(() => {
    renderRoadsideSession(root);
    renderRoadsideDispatch(root);
  }, 60000);
}

initQuickPrintPack();
initFuseCheckNote();
initRoadsideStack();
initGarageCloudSync();
