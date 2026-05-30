import { nfcTargets } from "./nfc-data.js";

const targetSelect = document.getElementById("nfc-target-select");
const targetUrl = document.getElementById("nfc-target-url");
const targetTitle = document.getElementById("nfc-selected-title");
const targetPlacement = document.getElementById("nfc-selected-placement");
const targetDescription = document.getElementById("nfc-selected-description");
const targetGrid = document.getElementById("nfc-target-grid");
const supportText = document.getElementById("nfc-support-text");
const statusText = document.getElementById("nfc-status-text");
const platformNote = document.getElementById("nfc-platform-note");
const scanHelp = document.getElementById("nfc-scan-help");
const iphoneWorkflow = document.getElementById("iphone-nfc-workflow");
const scannedResult = document.getElementById("nfc-scanned-result");
const scannedLink = document.getElementById("nfc-scanned-link");
const writeButton = document.querySelector("[data-nfc-write]");
const readButton = document.querySelector("[data-nfc-read]");
const copyButton = document.querySelector("[data-nfc-copy]");
const shareButton = document.querySelector("[data-nfc-share]");
const starterPackButton = document.querySelector("[data-nfc-copy-starter-pack]");
const starterPackStatus = document.querySelector("[data-nfc-starter-status]");
const managerGrid = document.getElementById("nfc-manager-grid");
const managerStatus = document.querySelector("[data-nfc-manager-status]");
const managerCopyPlanButton = document.querySelector("[data-nfc-copy-manager-plan]");
const managerResetButton = document.querySelector("[data-nfc-reset-manager]");
const managerTotal = document.querySelector("[data-nfc-manager-total]");
const managerProgrammed = document.querySelector("[data-nfc-manager-programmed]");
const managerMounted = document.querySelector("[data-nfc-manager-mounted]");
const managerLastActivity = document.querySelector("[data-nfc-manager-last-activity]");
const managerLastDetail = document.querySelector("[data-nfc-manager-last-detail]");

const starterPackTargetIds = ["battery-service", "oil-service", "diagnostics", "trailer-pinout"];
const NFC_MANAGER_STORAGE_KEY = "ridgeline-nfc-manager";

let selectedTarget = nfcTargets[0];
let activeScanController = null;
let nfcManagerState = loadManagerState();

function showToast(message, tone = "info") {
  window.ridgelineShowToast?.(message, tone);
}

function escapeHtml(value) {
  return `${value ?? ""}`.replace(/[&<>"']/g, (character) => (
    {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[character] || character
  ));
}

function absoluteUrl(target = selectedTarget) {
  return new URL(target.url, window.location.href).href;
}

function setStatus(message, tone = "neutral") {
  if (!statusText) {
    return;
  }

  statusText.textContent = message;
  statusText.dataset.tone = tone;
}

function setManagerStatus(message, tone = "neutral") {
  if (!managerStatus) {
    return;
  }

  managerStatus.textContent = message;
  managerStatus.dataset.tone = tone;
}

function webNfcSupported() {
  return "NDEFReader" in window && window.isSecureContext;
}

function isProbablyIos() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isLocalTagUrl(url) {
  try {
    const value = new URL(url);
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(value.hostname);
  } catch {
    return false;
  }
}

function normalizeManagerEntry(value = {}) {
  return {
    label: typeof value.label === "string" ? value.label : "",
    note: typeof value.note === "string" ? value.note : "",
    mounted: Boolean(value.mounted),
    programmedAt: typeof value.programmedAt === "string" ? value.programmedAt : "",
    lastScannedAt: typeof value.lastScannedAt === "string" ? value.lastScannedAt : "",
    lastWrittenUrl: typeof value.lastWrittenUrl === "string" ? value.lastWrittenUrl : ""
  };
}

function loadManagerState() {
  try {
    const raw = localStorage.getItem(NFC_MANAGER_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([id, value]) => [id, normalizeManagerEntry(value)])
    );
  } catch {
    return {};
  }
}

function saveManagerState() {
  try {
    localStorage.setItem(NFC_MANAGER_STORAGE_KEY, JSON.stringify(nfcManagerState));
    return true;
  } catch {
    setManagerStatus("Could not save local NFC tag manager data on this device.", "warning");
    showToast("Could not save NFC tag manager data", "warning");
    return false;
  }
}

function managerEntryFor(id) {
  if (!nfcManagerState[id]) {
    nfcManagerState[id] = normalizeManagerEntry();
  }

  return nfcManagerState[id];
}

function formatManagerDate(value) {
  if (!value) {
    return "Not yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not yet";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function managerBadgeState(entry) {
  if (entry.lastScannedAt) {
    return { label: "Verified", state: "verified" };
  }

  if (entry.mounted) {
    return { label: "Mounted", state: "mounted" };
  }

  if (entry.programmedAt) {
    return { label: "Written", state: "programmed" };
  }

  return { label: "Planned", state: "planned" };
}

function latestManagerActivity() {
  const activities = nfcTargets.flatMap((target) => {
    const entry = managerEntryFor(target.id);
    const next = [];

    if (entry.programmedAt) {
      next.push({ type: "Programmed", target, at: entry.programmedAt });
    }

    if (entry.lastScannedAt) {
      next.push({ type: "Scanned", target, at: entry.lastScannedAt });
    }

    return next;
  });

  return activities
    .filter((activity) => !Number.isNaN(new Date(activity.at).getTime()))
    .sort((left, right) => new Date(right.at) - new Date(left.at))[0] || null;
}

function renderManagerSummary() {
  if (managerTotal) {
    managerTotal.textContent = `${nfcTargets.length}`;
  }

  if (managerProgrammed) {
    managerProgrammed.textContent = `${nfcTargets.filter((target) => managerEntryFor(target.id).programmedAt).length}`;
  }

  if (managerMounted) {
    managerMounted.textContent = `${nfcTargets.filter((target) => managerEntryFor(target.id).mounted).length}`;
  }

  const latest = latestManagerActivity();
  if (!latest) {
    if (managerLastActivity) {
      managerLastActivity.textContent = "Not yet";
    }
    if (managerLastDetail) {
      managerLastDetail.textContent = "No recorded writes or scans on this device.";
    }
    return;
  }

  if (managerLastActivity) {
    managerLastActivity.textContent = latest.target.title;
  }
  if (managerLastDetail) {
    managerLastDetail.textContent = `${latest.type} ${formatManagerDate(latest.at)}`;
  }
}

function browserNfcState() {
  const hasNfc = "NDEFReader" in window;
  const secure = window.isSecureContext;
  const ios = isProbablyIos();

  return {
    direct: hasNfc && secure,
    hasNfc,
    secure,
    ios
  };
}

function updateSupportState() {
  const state = browserNfcState();
  document.body?.classList.toggle("nfc-direct-ready", state.direct);
  document.body?.classList.toggle("nfc-limited-browser", !state.direct);
  document.body?.classList.toggle("nfc-ios-browser", state.ios);

  if (supportText) {
    if (state.direct) {
      supportText.textContent = "Direct NFC read/write is available here.";
    } else if (state.hasNfc && !state.secure) {
      supportText.textContent = "Direct NFC needs HTTPS. URL tags will still open normally after they are written.";
    } else if (state.ios) {
      supportText.textContent = "iPhone Safari cannot read or write NFC tags from a web page.";
    } else {
      supportText.textContent = "This browser does not expose direct NFC read/write. Use the URL tag workflow.";
    }
  }

  if (writeButton) {
    writeButton.disabled = false;
    writeButton.textContent = state.direct ? "Write NFC" : state.ios ? "Show iPhone Write Steps" : "Show Write Steps";
  }
  if (readButton) {
    readButton.disabled = false;
    readButton.textContent = state.direct ? "Read NFC Tag" : state.ios ? "Show iPhone Scan Steps" : "Show Scan Steps";
  }
  if (scanHelp) {
    scanHelp.textContent = state.direct
      ? "Use this to verify a written URL tag without leaving the page."
      : "On iPhone, scan the finished tag from the home screen or lock screen. Safari opens the URL tag itself.";
  }
}

function updatePlatformNote() {
  if (!platformNote) {
    return;
  }

  const url = absoluteUrl();
  const state = browserNfcState();
  if (isLocalTagUrl(url)) {
    platformNote.textContent =
      "This selected URL is local to the current device. For final truck tags, open the deployed site address on your iPhone before copying and writing tags.";
  } else if (state.direct) {
    platformNote.textContent =
      "This browser supports direct Web NFC. You can use the Write NFC and Read NFC Tag buttons directly.";
  } else if (state.ios) {
    platformNote.textContent =
      "This iPhone can still use your tags: write each one as a website URL record, then scan it normally so Safari opens the matching section.";
  } else {
    platformNote.textContent =
      "This browser cannot access NFC directly. The generated URLs are still valid for NFC tags written by another app or device.";
  }
}

function showFallbackWorkflow(action) {
  const state = browserNfcState();
  const message =
    action === "read"
      ? "iPhone Safari cannot read NFC tags inside the page. Scan the finished URL tag from the iPhone home screen or lock screen instead."
      : "iPhone Safari cannot write NFC tags inside the page. Copy this URL and write it as a URL / URI record with an iPhone NFC writer app.";

  setStatus(
    state.ios
      ? message
      : "This browser does not expose direct NFC access. Use Copy URL or Share, then write the URL with an NFC writer app.",
    "warning"
  );
  iphoneWorkflow?.scrollIntoView({ behavior: "smooth", block: "start" });
  iphoneWorkflow?.focus({ preventScroll: true });
}

function updateSelectedTarget(id = selectedTarget.id) {
  selectedTarget = nfcTargets.find((target) => target.id === id) || nfcTargets[0];
  const url = absoluteUrl(selectedTarget);

  if (targetSelect) {
    targetSelect.value = selectedTarget.id;
  }
  if (targetUrl) {
    targetUrl.value = url;
  }
  if (targetTitle) {
    targetTitle.textContent = selectedTarget.title;
  }
  if (targetPlacement) {
    targetPlacement.textContent = selectedTarget.placement;
  }
  if (targetDescription) {
    targetDescription.textContent = selectedTarget.description;
  }
  updatePlatformNote();

  targetGrid?.querySelectorAll("[data-nfc-target]").forEach((card) => {
    const active = card.dataset.nfcTarget === selectedTarget.id;
    card.classList.toggle("is-active", active);
    card.setAttribute("aria-current", active ? "true" : "false");
  });

  document.querySelectorAll("[data-nfc-starter-card]").forEach((card) => {
    const active = card.dataset.nfcStarterCard === selectedTarget.id;
    card.classList.toggle("is-active", active);
    card.setAttribute("aria-current", active ? "true" : "false");
  });

  managerGrid?.querySelectorAll("[data-nfc-manager-card]").forEach((card) => {
    const active = card.dataset.nfcManagerCard === selectedTarget.id;
    card.classList.toggle("is-active", active);
    card.setAttribute("aria-current", active ? "true" : "false");
  });
}

function renderTargetSelect() {
  if (!targetSelect) {
    return;
  }

  targetSelect.replaceChildren();
  nfcTargets.forEach((target) => {
    const option = document.createElement("option");
    option.value = target.id;
    option.textContent = target.title;
    targetSelect.appendChild(option);
  });
}

function renderTargetCards() {
  if (!targetGrid) {
    return;
  }

  targetGrid.innerHTML = nfcTargets
    .map(
      (target) => `
        <article class="nfc-target-card" data-nfc-target="${target.id}">
          <div class="nfc-target-head">
            <span>${target.badge}</span>
            <strong>${target.title}</strong>
          </div>
          <p>${target.description}</p>
          <dl>
            <div>
              <dt>Place</dt>
              <dd>${target.placement}</dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>${target.url}</dd>
            </div>
          </dl>
          <div class="nfc-card-actions">
            <button type="button" data-nfc-select="${target.id}">Select</button>
            <a href="${target.url}">Open Landing</a>
            <a href="${target.sectionUrl}">Open Section</a>
          </div>
        </article>
      `
    )
    .join("");
}

function managerPlanManifest() {
  return nfcTargets
    .map((target, index) => {
      const entry = managerEntryFor(target.id);
      const status = managerBadgeState(entry).label;
      const label = entry.label.trim() || target.title;
      const note = entry.note.trim() || target.placement;
      const lines = [
        `${index + 1}. ${label}`,
        `Status: ${status}`,
        `Target: ${target.title}`,
        `Placement: ${note}`,
        `URL: ${absoluteUrl(target)}`
      ];

      if (entry.programmedAt) {
        lines.push(`Programmed: ${formatManagerDate(entry.programmedAt)}`);
      }

      if (entry.lastScannedAt) {
        lines.push(`Last scan: ${formatManagerDate(entry.lastScannedAt)}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

function renderManager() {
  if (!managerGrid) {
    return;
  }

  managerGrid.innerHTML = nfcTargets
    .map((target) => {
      const entry = managerEntryFor(target.id);
      const badge = managerBadgeState(entry);
      const displayLabel = entry.label.trim() || target.title;

      return `
        <article class="nfc-manager-card${target.id === selectedTarget.id ? " is-active" : ""}" data-nfc-manager-card="${target.id}">
          <div class="nfc-manager-card-head">
            <div class="nfc-manager-card-title">
              <div class="nfc-manager-card-kicker">
                <span>${escapeHtml(target.badge)}</span>
                <small>${escapeHtml(target.category)}</small>
              </div>
              <strong>${escapeHtml(displayLabel)}</strong>
              ${entry.label.trim() ? `<p class="nfc-manager-card-subtitle">Maps to ${escapeHtml(target.title)}</p>` : ""}
            </div>
            <div class="nfc-manager-status-badge" data-state="${badge.state}">${badge.label}</div>
          </div>
          <p class="nfc-manager-card-copy">${escapeHtml(target.quickUse || target.description)}</p>
          <div class="nfc-manager-card-meta">
            <article>
              <span>Placement</span>
              <strong>${escapeHtml(target.placement)}</strong>
            </article>
            <article>
              <span>Programmed</span>
              <strong>${escapeHtml(formatManagerDate(entry.programmedAt))}</strong>
            </article>
            <article>
              <span>Last Scan</span>
              <strong>${escapeHtml(formatManagerDate(entry.lastScannedAt))}</strong>
            </article>
          </div>
          <div class="nfc-manager-field-grid">
            <label class="nfc-manager-field">
              <span>Custom Label</span>
              <input type="text" maxlength="80" data-nfc-manager-label value="${escapeHtml(entry.label)}" placeholder="${escapeHtml(target.title)}" />
            </label>
            <label class="nfc-manager-field">
              <span>Placement Note</span>
              <input type="text" maxlength="120" data-nfc-manager-note value="${escapeHtml(entry.note)}" placeholder="${escapeHtml(target.placement)}" />
            </label>
          </div>
          <label class="nfc-manager-toggle">
            <input type="checkbox" data-nfc-manager-mounted ${entry.mounted ? "checked" : ""} />
            <span>Mounted on the truck and ready to scan in place.</span>
          </label>
          <div class="nfc-card-actions">
            <button type="button" data-nfc-manager-save="${target.id}">Save</button>
            <button type="button" data-nfc-manager-load="${target.id}">Use In Writer</button>
            <button type="button" data-nfc-manager-copy="${target.id}">Copy URL</button>
            <a href="${target.url}">Open Landing</a>
          </div>
        </article>
      `;
    })
    .join("");

  renderManagerSummary();
}

function readManagerDraft(id) {
  const card = managerGrid?.querySelector(`[data-nfc-manager-card="${id}"]`);
  if (!card) {
    return null;
  }

  return {
    label: card.querySelector("[data-nfc-manager-label]")?.value.trim() || "",
    note: card.querySelector("[data-nfc-manager-note]")?.value.trim() || "",
    mounted: Boolean(card.querySelector("[data-nfc-manager-mounted]")?.checked)
  };
}

function saveManagerCard(id) {
  const target = nfcTargets.find((item) => item.id === id);
  const draft = readManagerDraft(id);
  if (!target || !draft) {
    return;
  }

  const entry = managerEntryFor(id);
  entry.label = draft.label;
  entry.note = draft.note;
  entry.mounted = draft.mounted;

  if (!saveManagerState()) {
    return;
  }

  renderManager();
  updateSelectedTarget(selectedTarget.id);
  setManagerStatus(`Saved manager details for ${draft.label || target.title}.`, "success");
  showToast(`Saved ${draft.label || target.title}`);
}

function recordManagerWrite(target = selectedTarget) {
  const entry = managerEntryFor(target.id);
  entry.programmedAt = new Date().toISOString();
  entry.lastWrittenUrl = absoluteUrl(target);

  if (!saveManagerState()) {
    return;
  }

  renderManager();
  updateSelectedTarget(selectedTarget.id);
  setManagerStatus(`Recorded a write for ${entry.label.trim() || target.title}.`, "success");
}

function recordManagerScan(target) {
  const entry = managerEntryFor(target.id);
  entry.lastScannedAt = new Date().toISOString();

  if (!saveManagerState()) {
    return;
  }

  renderManager();
  updateSelectedTarget(target.id);
  setManagerStatus(`Recorded a scan for ${entry.label.trim() || target.title}.`, "success");
}

async function copySelectedUrl() {
  const url = absoluteUrl();
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    setStatus(
      isProbablyIos()
        ? "Copied. Paste this into an NFC writer app as a URL / URI record."
        : "Copied the NFC URL.",
      "success"
    );
    return;
  }

  targetUrl?.select();
  setStatus("URL selected. Use Copy from the browser menu.", "neutral");
}

async function shareSelectedUrl() {
  const url = absoluteUrl();
  if (!navigator.share) {
    await copySelectedUrl();
    return;
  }

  await navigator.share({
    title: selectedTarget.title,
    text: selectedTarget.description,
    url
  });
  setStatus("Shared the NFC URL.", "success");
}

function starterPackManifest() {
  return starterPackTargetIds
    .map((id) => nfcTargets.find((target) => target.id === id))
    .filter(Boolean)
    .map((target, index) => {
      const url = absoluteUrl(target);
      return `${index + 1}. ${target.title}\nPlace: ${target.placement}\nURL: ${url}`;
    })
    .join("\n\n");
}

async function copyStarterPack() {
  const manifest = starterPackManifest();
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(manifest);
    if (starterPackStatus) {
      starterPackStatus.textContent = "Copied the starter tag pack list with placements and URLs.";
    }
    setStatus("Copied the starter tag pack list.", "success");
    return;
  }

  if (starterPackStatus) {
    starterPackStatus.textContent = "Starter list ready. Copy is blocked in this browser, so use the selected URL field below.";
  }
  setStatus("Copy is blocked in this browser. Use the selected URL field below.", "warning");
}

async function copyManagerPlan() {
  const manifest = managerPlanManifest();
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(manifest);
    setManagerStatus("Copied the local NFC tag plan with status and placement notes.", "success");
    setStatus("Copied the NFC tag plan.", "success");
    showToast("Copied NFC tag plan");
    return;
  }

  setManagerStatus("Copy is blocked in this browser, so the local tag plan could not be copied.", "warning");
  setStatus("Copy is blocked in this browser.", "warning");
}

function resetManager() {
  if (!window.confirm("Clear the local NFC tag manager details on this device?")) {
    return;
  }

  localStorage.removeItem(NFC_MANAGER_STORAGE_KEY);
  nfcManagerState = {};
  renderManager();
  updateSelectedTarget(selectedTarget.id);
  setManagerStatus("Cleared the local NFC tag manager data for this device.", "success");
  setStatus("Cleared the local NFC tag manager data.", "success");
  showToast("Cleared NFC tag manager");
}

async function copyTargetUrlFromManager(id) {
  const target = nfcTargets.find((item) => item.id === id);
  if (!target) {
    return;
  }

  if (!navigator.clipboard?.writeText) {
    setManagerStatus("Copy is blocked in this browser. Use the main writer field instead.", "warning");
    return;
  }

  await navigator.clipboard.writeText(absoluteUrl(target));
  setManagerStatus(`Copied the URL for ${managerEntryFor(id).label.trim() || target.title}.`, "success");
  setStatus(`Copied ${target.title}.`, "success");
}

async function writeSelectedTag() {
  if (!webNfcSupported()) {
    showFallbackWorkflow("write");
    return;
  }

  const url = absoluteUrl();
  try {
    const ndef = new NDEFReader();
    setStatus(`Hold a writable NFC tag near the phone for ${selectedTarget.title}.`, "neutral");
    await ndef.write({
      records: [{ recordType: "url", data: url }]
    });
    recordManagerWrite(selectedTarget);
    setStatus(`Wrote ${selectedTarget.title} to the NFC tag.`, "success");
  } catch (error) {
    setStatus(`NFC write failed: ${error.message || error.name || error}`, "warning");
  }
}

function decodeRecordData(record) {
  if (!record.data) {
    return "";
  }

  try {
    const view = record.data instanceof DataView ? record.data : new DataView(record.data);
    return new TextDecoder(record.encoding || "utf-8").decode(view);
  } catch {
    return "";
  }
}

function matchingTargetFromUrl(value) {
  try {
    const scanned = new URL(value, window.location.href);
    return nfcTargets.find((target) => {
      const targetUrlValue = new URL(target.url, window.location.href);
      return (
        scanned.origin === targetUrlValue.origin &&
        scanned.pathname === targetUrlValue.pathname &&
        scanned.search === targetUrlValue.search &&
        scanned.hash === targetUrlValue.hash
      );
    });
  } catch {
    return null;
  }
}

function renderScannedUrl(value) {
  if (!scannedResult || !scannedLink) {
    return;
  }

  const match = matchingTargetFromUrl(value);
  scannedResult.hidden = false;
  scannedLink.href = value;
  scannedLink.textContent = match ? `Open ${match.title}` : value;

  if (match) {
    recordManagerScan(match);
  }

  setStatus(match ? `Scanned ${match.title}.` : "Scanned a URL tag.", "success");
}

async function readTag() {
  if (!webNfcSupported()) {
    showFallbackWorkflow("read");
    return;
  }

  try {
    activeScanController?.abort();
    activeScanController = new AbortController();
    const ndef = new NDEFReader();
    await ndef.scan({ signal: activeScanController.signal });
    setStatus("Scan is active. Hold a tag near the phone.", "neutral");
    ndef.addEventListener("readingerror", () => {
      setStatus("The tag could not be read. Try another NDEF URL tag.", "warning");
    });
    ndef.addEventListener("reading", ({ message }) => {
      const urlRecord = [...message.records].find((record) => ["url", "absolute-url"].includes(record.recordType));
      const url = urlRecord ? decodeRecordData(urlRecord) : "";
      if (url) {
        renderScannedUrl(url);
      } else {
        setStatus("The tag was read, but it did not contain a URL record.", "warning");
      }
    });
  } catch (error) {
    setStatus(`NFC scan failed: ${error.message || error.name || error}`, "warning");
  }
}

renderTargetSelect();
renderTargetCards();
renderManager();
updateSupportState();
updateSelectedTarget(new URLSearchParams(window.location.search).get("target") || nfcTargets[0].id);
setStatus(
  webNfcSupported()
    ? "Choose a truck location, then write or read a tag directly from this browser."
    : "Choose a truck location, then Copy URL or Share. On iPhone, paste it into an NFC writer app as a URL / URI record.",
  "neutral"
);

targetSelect?.addEventListener("change", () => updateSelectedTarget(targetSelect.value));
copyButton?.addEventListener("click", () => copySelectedUrl().catch((error) => setStatus(error.message, "warning")));
shareButton?.addEventListener("click", () => shareSelectedUrl().catch((error) => setStatus(error.message, "warning")));
starterPackButton?.addEventListener("click", () => copyStarterPack().catch((error) => setStatus(error.message, "warning")));
managerCopyPlanButton?.addEventListener("click", () => copyManagerPlan().catch((error) => setStatus(error.message, "warning")));
managerResetButton?.addEventListener("click", resetManager);
writeButton?.addEventListener("click", writeSelectedTag);
readButton?.addEventListener("click", readTag);

targetGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-nfc-select]");
  if (!button) {
    return;
  }

  updateSelectedTarget(button.dataset.nfcSelect);
  document.getElementById("tag-writer")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-nfc-starter-select]");
  if (!button) {
    return;
  }

  updateSelectedTarget(button.dataset.nfcStarterSelect);
  if (starterPackStatus) {
    starterPackStatus.textContent = `Loaded ${selectedTarget.title}. Copy, share, or write this URL from the writer below.`;
  }
  document.getElementById("tag-writer")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

managerGrid?.addEventListener("click", (event) => {
  const saveButton = event.target.closest("[data-nfc-manager-save]");
  if (saveButton) {
    saveManagerCard(saveButton.dataset.nfcManagerSave);
    return;
  }

  const loadButton = event.target.closest("[data-nfc-manager-load]");
  if (loadButton) {
    updateSelectedTarget(loadButton.dataset.nfcManagerLoad);
    setManagerStatus(`Loaded ${selectedTarget.title} into the writer.`, "success");
    document.getElementById("tag-writer")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const copyManagerButton = event.target.closest("[data-nfc-manager-copy]");
  if (copyManagerButton) {
    copyTargetUrlFromManager(copyManagerButton.dataset.nfcManagerCopy).catch((error) => setStatus(error.message, "warning"));
  }
});
