import * as ownerAuth from "./owner-auth.js";
import { loadVisitorLog } from "./visitor-log.js";

const DEFAULT_CONTROL_URL = "http://127.0.0.1:8765";
const CONTROL_URL_KEY = "ridgelineAntonControlUrl";
const CONTROL_TOKEN_KEY = "ridgelineAntonControlToken";
const SIGNOFF_KEY = "ridgeline-anton-iphone-signoff";
const FALLBACK_FILES = [
  { name: "ANTON.md", label: "Anton Instructions" },
  { name: "AGENT_STATE.md", label: "Agent State" },
  { name: "AGENT_BACKLOG.md", label: "Backlog" },
  { name: "SITE_QUALITY_AUDIT.md", label: "Quality Audit" },
  { name: "AGENT_LOOP.md", label: "Loop Guide" }
];

const state = {
  files: FALLBACK_FILES,
  selectedFile: "ANTON.md",
  serverOnline: false,
  latestStatus: null,
  latestReviewContext: null,
  signoffChoice: "reviewed",
  isOwner: false
};

const els = {
  agentCard: document.querySelector("[data-anton-agent-card]"),
  agentState: document.querySelector("[data-anton-agent-state]"),
  agentDetail: document.querySelector("[data-anton-agent-detail]"),
  publicLastChange: document.querySelector("[data-anton-last-change]"),
  publicNext: document.querySelector("[data-anton-public-next]"),
  publicGithub: document.querySelector("[data-anton-public-github]"),
  publicImpactScore: document.querySelector("[data-anton-impact-score]"),
  publicVisibleChange: document.querySelector("[data-anton-visible-change]"),
  publicImpactReason: document.querySelector("[data-anton-impact-reason]"),
  runSnapshot: document.querySelector("[data-anton-run-snapshot]"),
  ownerCheckTitle: document.querySelector("[data-anton-owner-check-title]"),
  ownerCheckDetail: document.querySelector("[data-anton-owner-check-detail]"),
  ownerCheckLink: document.querySelector("[data-anton-owner-check-link]"),
  ownerActionTitle: document.querySelector("[data-anton-owner-action-title]"),
  ownerActionDetail: document.querySelector("[data-anton-owner-action-detail]"),
  ownerNextTitle: document.querySelector("[data-anton-owner-next-title]"),
  ownerNextDetail: document.querySelector("[data-anton-owner-next-detail]"),
  reviewQueue: document.querySelector("[data-anton-review-queue]"),
  signoff: document.querySelector("[data-anton-signoff]"),
  signoffChoices: document.querySelectorAll("[data-anton-signoff-choice]"),
  signoffNote: document.querySelector("[data-anton-signoff-note]"),
  signoffStatus: document.querySelector("[data-anton-signoff-status]"),
  signoffLatest: document.querySelector("[data-anton-signoff-latest]"),
  signoffSave: document.querySelector("[data-anton-save-signoff]"),
  signoffCopy: document.querySelector("[data-anton-copy-signoff]"),
  signoffShare: document.querySelector("[data-anton-share-signoff]"),
  publicSummary: document.querySelector("[data-anton-run-summary]"),
  publicFiles: document.querySelector("[data-anton-public-files]"),
  serverState: document.querySelector("[data-anton-server-state]"),
  serverDetail: document.querySelector("[data-anton-server-detail]"),
  liveCard: document.querySelector("[data-anton-live-card]"),
  scheduleState: document.querySelector("[data-anton-schedule-state]"),
  scheduleDetail: document.querySelector("[data-anton-schedule-detail]"),
  remoteState: document.querySelector("[data-anton-remote-state]"),
  remoteDetail: document.querySelector("[data-anton-remote-detail]"),
  taskState: document.querySelector("[data-anton-task-state]"),
  lastRun: document.querySelector("[data-anton-last-run]"),
  nextRun: document.querySelector("[data-anton-next-run]"),
  lock: document.querySelector("[data-anton-lock]"),
  actionMessage: document.querySelector("[data-anton-action-message]"),
  tabs: document.querySelector("[data-anton-file-tabs]"),
  fileTitle: document.querySelector("[data-anton-file-title]"),
  fileTime: document.querySelector("[data-anton-file-time]"),
  fileContent: document.querySelector("[data-anton-file-content]"),
  historyList: document.querySelector("[data-anton-history-list]"),
  noteForm: document.querySelector("[data-anton-note-form]"),
  visitorLogStatus: document.querySelector("[data-visitor-log-status]"),
  visitorLogList: document.querySelector("[data-visitor-log-list]")
};

function getControlUrl() {
  try {
    return localStorage.getItem(CONTROL_URL_KEY) || DEFAULT_CONTROL_URL;
  } catch {
    return DEFAULT_CONTROL_URL;
  }
}

function getControlToken() {
  try {
    return localStorage.getItem(CONTROL_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function setMessage(message, stateName = "idle") {
  if (!els.actionMessage) {
    return;
  }
  els.actionMessage.dataset.agentControlState = stateName;
  els.actionMessage.textContent = message;
}

function ownerCanInspectAntonInternals() {
  return Boolean(state.isOwner);
}

function formatDate(value) {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function describeNextRun(value) {
  if (!value) {
    return "next check pending";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const minutes = Math.round((date.getTime() - Date.now()) / 60000);
  if (minutes <= -1) {
    return `${Math.abs(minutes)} min overdue`;
  }
  if (minutes <= 1) {
    return "due now";
  }
  return `next check in about ${minutes} min`;
}

function minutesSince(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
}

function compactAge(value, fallback = "Not recorded") {
  const minutes = minutesSince(value);
  if (minutes === null) {
    return fallback;
  }
  if (minutes <= 1) {
    return "just now";
  }
  return `${minutes} min ago`;
}

function requestHeaders() {
  const token = getControlToken();
  return token ? { "X-Anton-Token": token } : {};
}

function describeScheduleState(taskState = "", nextRunTime = "") {
  const normalized = `${taskState}`.trim().toLowerCase();
  if (normalized === "disabled") {
    return {
      label: "Paused",
      detail: "Anton's scheduled loop is disabled. It will not auto-run until you resume the schedule."
    };
  }
  if (normalized === "ready") {
    return {
      label: "Enabled",
      detail: `Anton's scheduled loop is armed and waiting. ${describeNextRun(nextRunTime)}.`
    };
  }
  if (normalized === "running") {
    return {
      label: "Running Now",
      detail: "Anton's scheduled task is active right now."
    };
  }
  if (normalized === "missing") {
    return {
      label: "Missing Task",
      detail: "The Anton scheduled task was not found on this laptop."
    };
  }
  return {
    label: taskState || "Unknown",
    detail: "The laptop helper responded, but the scheduler state was not recognized cleanly."
  };
}

function summarizeText(value = "") {
  return `${value}`.trim() || "No summary recorded yet.";
}

function escapeHtml(value = "") {
  return `${value}`.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function firstSummaryLine(value = "") {
  const text = summarizeText(value);
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .find((line) => line && !/^changed:?$/i.test(line) && !/^verified:?$/i.test(line)) || text;
}

function readStoredJson(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function changedPageFromFiles(files = []) {
  const htmlFile = files
    .filter(Boolean)
    .find((file) => /\.html$/i.test(file) && file !== "anton.html");
  return htmlFile || "index.html";
}

function shortFileLabel(file = "") {
  const label = file
    .replace(/\.html$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return label ? label.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Home";
}

function renderOwnerCheck(status) {
  const files = Array.isArray(status.changedFiles) ? status.changedFiles.filter(Boolean) : [];
  const changedPage = changedPageFromFiles(files);
  const changedLabel = shortFileLabel(changedPage);
  const isRunning = status.status === "running";
  const actionRequired = summarizeText(status.actionRequired || "");
  const next = describeNextRun(status.nextExpectedRunAt);
  const visibleChange = status.visibleChange || firstSummaryLine(status.summary);
  const score = Number.isFinite(Number(status.impactScore)) ? `${Number(status.impactScore)}/5` : "Not scored";

  if (els.ownerCheckTitle) {
    els.ownerCheckTitle.textContent = isRunning ? "Wait for finish" : `Review ${changedLabel}`;
  }
  if (els.ownerCheckDetail) {
    els.ownerCheckDetail.textContent = isRunning
      ? "Anton is still working; refresh after it finishes before judging the visible change."
      : `${score}: ${visibleChange}`;
  }
  if (els.ownerCheckLink) {
    els.ownerCheckLink.href = changedPage;
    els.ownerCheckLink.textContent = changedPage === "index.html" ? "Open Home" : `Open ${changedLabel}`;
  }
  if (els.ownerActionTitle) {
    els.ownerActionTitle.textContent = /no action needed/i.test(actionRequired) ? "No action needed" : "Check note";
  }
  if (els.ownerActionDetail) {
    els.ownerActionDetail.textContent = actionRequired || "Anton has not published an action note yet.";
  }
  if (els.ownerNextTitle) {
    els.ownerNextTitle.textContent = next;
  }
  if (els.ownerNextDetail) {
    els.ownerNextDetail.textContent = status.pushed
      ? "The public status is pushed; the next scheduled run can rotate to a new high-value slice."
      : "This status is local until the run finishes and publishes its result.";
  }
  renderReviewQueue(status, {
    changedPage,
    changedLabel,
    visibleChange,
    actionRequired,
    next,
    score
  });
  renderSignoffPanel(status, {
    changedPage,
    changedLabel,
    visibleChange,
    actionRequired,
    next,
    score
  });
}

function buildReviewPackText(status, context) {
  const tone = reviewToneForStatus(status);
  const logPath = status.outputLog || status.log || "No run log path published";
  const changedUrl = new URL(context.changedPage || "index.html", window.location.href).href;
  const homeUrl = new URL("index.html#agent-status", window.location.href).href;
  return [
    "Ridgeline Anton review pack",
    `Status: ${status.statusTitle || status.status || "Unknown"}`,
    `Impact: ${context.score || "Not scored"} - ${context.visibleChange || firstSummaryLine(status.summary)}`,
    `Changed page: ${context.changedLabel || "Home"} - ${changedUrl}`,
    `Home monitor: ${homeUrl}`,
    `Owner move: ${tone.title}`,
    `Action note: ${firstSummaryLine(context.actionRequired || tone.detail)}`,
    `Next check: ${context.next || describeNextRun(status.nextExpectedRunAt)}`,
    `Trace: ${logPath}`
  ].join("\n");
}

async function copyText(value = "") {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    textarea.remove();
  }
  return copied;
}

function signoffChoiceLabel(choice = state.signoffChoice) {
  return choice === "followup" ? "Needs follow-up" : "Works on iPhone";
}

function setSignoffStatus(message = "") {
  if (els.signoffStatus) {
    els.signoffStatus.textContent = message;
  }
}

function buildSignoffRecord(status = state.latestStatus, context = state.latestReviewContext) {
  const note = els.signoffNote?.value?.trim() || "";
  const changedPage = context?.changedPage || "index.html";
  const record = {
    savedAt: new Date().toISOString(),
    choice: state.signoffChoice,
    note,
    statusTitle: status?.statusTitle || status?.status || "Anton status",
    impact: context?.score || (Number.isFinite(Number(status?.impactScore)) ? `${Number(status.impactScore)}/5` : "Not scored"),
    visibleChange: context?.visibleChange || status?.visibleChange || firstSummaryLine(status?.summary || ""),
    changedLabel: context?.changedLabel || shortFileLabel(changedPage),
    changedPage,
    next: context?.next || describeNextRun(status?.nextExpectedRunAt),
    actionRequired: context?.actionRequired || status?.actionRequired || ""
  };
  record.text = [
    "Ridgeline Anton iPhone sign-off",
    `Result: ${signoffChoiceLabel(record.choice)}`,
    `Changed page: ${record.changedLabel} - ${new URL(changedPage, window.location.href).href}`,
    `Impact: ${record.impact} - ${record.visibleChange}`,
    `Home monitor: ${new URL("index.html#agent-status", window.location.href).href}`,
    `Next check: ${record.next}`,
    `Action note: ${firstSummaryLine(record.actionRequired || "No action note recorded.")}`,
    note ? `Owner note: ${note}` : "Owner note: No extra note.",
    `Saved: ${formatDate(record.savedAt)}`
  ].join("\n");
  return record;
}

function renderSavedSignoff() {
  if (!els.signoffLatest) {
    return;
  }

  const saved = readStoredJson(SIGNOFF_KEY, null);
  if (!saved) {
    els.signoffLatest.innerHTML = `
      <span>Latest saved review</span>
      <p>No iPhone review saved on this device yet.</p>
    `;
    return;
  }

  els.signoffLatest.innerHTML = `
    <span>Latest saved review</span>
    <strong>${escapeHtml(signoffChoiceLabel(saved.choice))} - ${escapeHtml(saved.changedLabel || "Changed page")}</strong>
    <p>${escapeHtml(`${formatDate(saved.savedAt)}. ${saved.note || saved.visibleChange || "No note recorded."}`)}</p>
  `;
}

function renderSignoffPanel(status, context) {
  if (!els.signoff) {
    return;
  }

  state.latestStatus = status;
  state.latestReviewContext = context;
  els.signoff.dataset.antonSignoffChoice = state.signoffChoice;
  els.signoffChoices.forEach((button) => {
    const pressed = button.dataset.antonSignoffChoice === state.signoffChoice;
    button.setAttribute("aria-pressed", pressed ? "true" : "false");
  });
  if (els.signoffNote && !els.signoffNote.placeholder.includes(context.changedLabel)) {
    els.signoffNote.placeholder = `Add what you checked on ${context.changedLabel}, what looked wrong, or what should be picked up next.`;
  }
  renderSavedSignoff();
}

function setReviewPackStatus(message = "") {
  els.reviewQueue?.querySelector("[data-anton-review-pack-status]")?.replaceChildren(document.createTextNode(message));
}

function renderRunSnapshot(status) {
  if (!els.runSnapshot) {
    return;
  }

  const state = status.status || "unknown";
  const phase = status.phase || state || "Unknown";
  const startedAge = compactAge(status.startedAt, "Start not recorded");
  const heartbeatAge = compactAge(status.lastHeartbeatAt, "Heartbeat not recorded");
  const isRunning = state === "running";
  const needsFix = ["error", "blocked-dirty-worktree", "waiting-for-tokens-or-auth", "command-error"].includes(state);
  const score = Number.isFinite(Number(status.impactScore)) ? `${Number(status.impactScore)}/5` : "Not scored";
  const visibleChange = status.visibleChange || firstSummaryLine(status.summary);
  const ownerTitle = isRunning ? "Wait for finish" : needsFix ? "Fix before next run" : "Review on iPhone";
  const ownerDetail = isRunning
    ? "Refresh this page after the run finishes before judging the site change."
    : needsFix
      ? summarizeText(status.actionRequired || status.diagnostic || "Check the run log before starting another slice.")
      : `${score}: ${visibleChange}`;
  const heartbeatDetail = isRunning
    ? `Started ${startedAge}; latest heartbeat ${heartbeatAge}.`
    : `Finished ${compactAge(status.finishedAt || status.lastHeartbeatAt, "finish not recorded")}; next check ${describeNextRun(status.nextExpectedRunAt)}.`;

  els.runSnapshot.dataset.antonRunState = state;
  els.runSnapshot.innerHTML = `
    <article>
      <span>Stage</span>
      <strong>${escapeHtml(phase)}</strong>
      <p>${escapeHtml(status.statusTitle || state || "Anton status")}</p>
    </article>
    <article>
      <span>Heartbeat</span>
      <strong>${escapeHtml(heartbeatAge)}</strong>
      <p>${escapeHtml(heartbeatDetail)}</p>
    </article>
    <article>
      <span>Owner Move</span>
      <strong>${escapeHtml(ownerTitle)}</strong>
      <p>${escapeHtml(ownerDetail)}</p>
    </article>
  `;
}

function reviewToneForStatus(status) {
  const state = status.status || "unknown";
  if (state === "running") {
    return {
      label: "Wait",
      title: "Run still active",
      detail: "Refresh this page when Anton finishes before reviewing the changed page."
    };
  }
  if (["error", "blocked-dirty-worktree", "waiting-for-tokens-or-auth", "command-error"].includes(state)) {
    return {
      label: "Fix",
      title: "Loop needs attention",
      detail: status.diagnostic || status.actionRequired || "Open the home monitor and run log before starting another slice."
    };
  }
  return {
    label: "Ready",
    title: "Ready for iPhone check",
    detail: status.pushed
      ? "Review the changed page on iPhone, then let the next scheduled run rotate to a fresh slice."
      : "The result is local until Anton publishes the completed run."
  };
}

function renderReviewQueue(status, context) {
  if (!els.reviewQueue) {
    return;
  }

  const tone = reviewToneForStatus(status);
  const logPath = status.outputLog || status.log || "";
  const safeDetail = summarizeText(context.visibleChange || status.summary);
  const reviewPackText = buildReviewPackText(status, context);
  els.reviewQueue.innerHTML = `
    <article data-anton-review-card="changed-page">
      <span>${escapeHtml(tone.label)}</span>
      <strong>${escapeHtml(context.changedLabel)}</strong>
      <p>${escapeHtml(`${context.score}: ${safeDetail}`)}</p>
      <a class="agent-control-button agent-control-button-secondary" href="${escapeHtml(context.changedPage)}">Open Changed Page</a>
    </article>
    <article data-anton-review-card="home-monitor">
      <span>Confirm</span>
      <strong>Home Monitor</strong>
      <p>Check that the public tile shows the same visible change, impact score, and next run timing.</p>
      <a class="agent-control-button agent-control-button-secondary" href="index.html#agent-status">Open Home Monitor</a>
    </article>
    <article data-anton-review-card="next-action">
      <span>Next</span>
      <strong>${escapeHtml(tone.title)}</strong>
      <p>${escapeHtml(firstSummaryLine(context.actionRequired || tone.detail))}</p>
      <a class="agent-control-button agent-control-button-secondary" href="#anton-controls">Open Controls</a>
    </article>
    <article data-anton-review-card="run-log">
      <span>Trace</span>
      <strong>${escapeHtml(logPath ? "Run Log Recorded" : "No Log Path")}</strong>
      <p>${escapeHtml(logPath || "Anton has not published an output log path for this run yet.")}</p>
    </article>
    <article data-anton-review-card="review-pack">
      <span>Pack</span>
      <strong>Review Pack</strong>
      <p>Copy or share the changed page, impact, home monitor check, next action, and run trace as one iPhone note.</p>
      <div class="anton-review-pack-actions">
        <button class="agent-control-button agent-control-button-secondary" type="button" data-anton-copy-review-pack>Copy Pack</button>
        <button class="agent-control-button agent-control-button-secondary" type="button" data-anton-share-review-pack>Share Pack</button>
      </div>
      <p class="anton-review-pack-status" data-anton-review-pack-status aria-live="polite"></p>
    </article>
  `;
  els.reviewQueue.querySelector("[data-anton-copy-review-pack]")?.addEventListener("click", async () => {
    try {
      const copied = await copyText(reviewPackText);
      setReviewPackStatus(copied ? "Review pack copied." : "Copy is unavailable in this browser.");
    } catch {
      setReviewPackStatus("Copy failed. Select the review cards manually.");
    }
  });
  els.reviewQueue.querySelector("[data-anton-share-review-pack]")?.addEventListener("click", async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline Anton review pack", text: reviewPackText });
        setReviewPackStatus("Review pack shared.");
        return;
      }
      const copied = await copyText(reviewPackText);
      setReviewPackStatus(copied ? "Share unavailable; review pack copied instead." : "Share is unavailable in this browser.");
    } catch {
      setReviewPackStatus("Share canceled or unavailable.");
    }
  });
}

async function controlFetch(path, options = {}) {
  const controlUrl = getControlUrl().replace(/\/+$/, "");
  const headers = {
    ...requestHeaders(),
    ...(options.headers || {})
  };
  const response = await fetch(`${controlUrl}${path}`, {
    ...options,
    headers
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || `Control server returned ${response.status}.`);
  }
  return payload;
}

function renderTabs() {
  if (!els.tabs) {
    return;
  }

  if (!ownerCanInspectAntonInternals()) {
    els.tabs.innerHTML = `
      <p class="agent-status-empty">Sign in as owner to inspect Anton memory files and history.</p>
    `;
    return;
  }

  els.tabs.innerHTML = state.files.map((file) => `
    <button
      class="anton-file-tab"
      type="button"
      data-anton-file="${file.name}"
      aria-pressed="${file.name === state.selectedFile ? "true" : "false"}"
    >${file.name}</button>
  `).join("");

  els.tabs.querySelectorAll("[data-anton-file]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedFile = button.dataset.antonFile;
      renderTabs();
      loadFile(state.selectedFile);
    });
  });
}

function renderHistory(history = []) {
  if (!els.historyList) {
    return;
  }

  if (!ownerCanInspectAntonInternals()) {
    els.historyList.innerHTML = `<p class="agent-status-empty">Anton file history is visible only to the signed-in owner.</p>`;
    return;
  }

  if (!history.length) {
    els.historyList.innerHTML = `<p class="agent-status-empty">No git history found for this file yet.</p>`;
    return;
  }

  els.historyList.innerHTML = history.map((item) => `
    <article class="anton-history-item">
      <strong>${item.hash || "unknown"}</strong>
      <span>${formatDate(item.date)}</span>
      <p>${item.subject || "No subject recorded"}</p>
    </article>
  `).join("");
}

function renderVisitorLog(entries = []) {
  if (!els.visitorLogList) {
    return;
  }

  if (!ownerCanInspectAntonInternals()) {
    els.visitorLogList.innerHTML = `<p class="agent-status-empty">Visitor log is visible only to the signed-in owner.</p>`;
    return;
  }

  if (!entries.length) {
    els.visitorLogList.innerHTML = `<p class="agent-status-empty">No visitor entries recorded yet.</p>`;
    return;
  }

  els.visitorLogList.innerHTML = entries.map((entry) => {
    const name = entry.visitor_name ? escapeHtml(entry.visitor_name) : "Unnamed visitor";
    const browser = escapeHtml(entry.browser_label || "Browser");
    const page = escapeHtml(entry.page_title || entry.page || "Unknown page");
    const seen = escapeHtml(formatDate(entry.seen_at));
    const referrer = entry.referrer ? `Referrer: ${escapeHtml(entry.referrer)}` : "Direct visit";
    const viewport = entry.viewport ? `Viewport: ${escapeHtml(entry.viewport)}` : "";
    const visitId = entry.visit_id ? `Visitor ID: ${escapeHtml(entry.visit_id)}` : "";

    return `
      <article class="anton-history-item">
        <strong>${name}</strong>
        <span>${seen}</span>
        <p>${browser} opened ${page}.</p>
        <p>${referrer}${viewport ? ` - ${viewport}` : ""}${visitId ? ` - ${visitId}` : ""}</p>
      </article>
    `;
  }).join("");
}

async function refreshVisitorLog() {
  if (!els.visitorLogStatus) {
    return;
  }

  if (!ownerCanInspectAntonInternals()) {
    els.visitorLogStatus.textContent = "Sign in as owner to load the visitor log.";
    renderVisitorLog([]);
    return;
  }

  els.visitorLogStatus.textContent = "Loading visitor log...";
  try {
    const entries = await loadVisitorLog(80);
    renderVisitorLog(entries);
    els.visitorLogStatus.textContent = entries.length
      ? `Loaded ${entries.length} recent visitor entr${entries.length === 1 ? "y" : "ies"}.`
      : "No visitor entries recorded yet.";
  } catch (error) {
    renderVisitorLog([]);
    els.visitorLogStatus.textContent = `Could not load visitor log: ${error.message}`;
  }
}

async function loadStatus() {
  await loadAgentRunStatus();

  if (!ownerCanInspectAntonInternals()) {
    state.serverOnline = false;
    els.liveCard?.setAttribute("data-anton-server", "offline");
    if (els.serverState) {
      els.serverState.textContent = "Owner Only";
    }
    if (els.serverDetail) {
      els.serverDetail.textContent = "Sign in as owner to inspect the helper, control settings, and private Anton runtime details.";
    }
    if (els.scheduleState) {
      els.scheduleState.textContent = "Protected";
    }
    if (els.scheduleDetail) {
      els.scheduleDetail.textContent = "Schedule state is hidden until the owner signs in.";
    }
    if (els.remoteState) {
      els.remoteState.textContent = "Protected";
    }
    if (els.remoteDetail) {
      els.remoteDetail.textContent = "Control endpoint details are hidden until the owner signs in.";
    }
    if (els.taskState) {
      els.taskState.textContent = "Protected";
    }
    if (els.lastRun) {
      els.lastRun.textContent = "Protected";
    }
    if (els.nextRun) {
      els.nextRun.textContent = "Protected";
    }
    if (els.lock) {
      els.lock.textContent = "Protected";
    }
    return;
  }

  try {
    const status = await controlFetch("/status");
    const controlUrl = getControlUrl();
    const schedule = describeScheduleState(status.taskState, status.nextRunTime);
    state.serverOnline = true;
    els.liveCard?.setAttribute("data-anton-server", "online");
    if (els.serverState) {
      els.serverState.textContent = "Online";
    }
    if (els.serverDetail) {
      els.serverDetail.textContent = `Laptop helper connected at ${controlUrl}.`;
    }
    if (els.scheduleState) {
      els.scheduleState.textContent = schedule.label;
    }
    if (els.scheduleDetail) {
      els.scheduleDetail.textContent = schedule.detail;
    }
    if (els.remoteState) {
      els.remoteState.textContent = /^https?:\/\/127\.0\.0\.1/i.test(controlUrl) || /localhost/i.test(controlUrl)
        ? "Local only"
        : "Remote ready";
    }
    if (els.remoteDetail) {
      els.remoteDetail.textContent = /^https?:\/\/127\.0\.0\.1/i.test(controlUrl) || /localhost/i.test(controlUrl)
        ? "This browser is pointing at the laptop's localhost helper. From iPhone, set the Control URL to the laptop's private-network address and keep a token on."
        : `This browser is pointing at ${controlUrl}. Remote enable/disable should work while your iPhone can reach that helper on your private network.`;
    }
    if (els.taskState) {
      els.taskState.textContent = status.taskState || status.status || "Online";
    }
    if (els.lastRun) {
      els.lastRun.textContent = formatDate(status.lastRunTime);
    }
    if (els.nextRun) {
      els.nextRun.textContent = formatDate(status.nextRunTime);
    }
    if (els.lock) {
      els.lock.textContent = status.lockActive ? `Active since ${formatDate(status.lockUpdatedAt)}` : "Clear";
    }
  } catch (error) {
    state.serverOnline = false;
    els.liveCard?.setAttribute("data-anton-server", "offline");
    if (els.serverState) {
      els.serverState.textContent = "Helper Offline";
    }
    if (els.serverDetail) {
      els.serverDetail.textContent = `Local controls are unavailable from this browser. On iPhone this is normal unless the helper is exposed on your private network. ${error.message}`;
    }
    if (els.scheduleState) {
      els.scheduleState.textContent = "Unavailable";
    }
    if (els.scheduleDetail) {
      els.scheduleDetail.textContent = "The browser could not reach the laptop helper, so enable/disable status is unavailable here.";
    }
    if (els.remoteState) {
      els.remoteState.textContent = "Unavailable";
    }
    if (els.remoteDetail) {
      els.remoteDetail.textContent = "Remote toggle needs the Anton helper to be reachable from this browser.";
    }
    if (els.taskState) {
      els.taskState.textContent = "Helper offline";
    }
    if (els.lastRun) {
      els.lastRun.textContent = "Unknown";
    }
    if (els.nextRun) {
      els.nextRun.textContent = "Unknown";
    }
    if (els.lock) {
      els.lock.textContent = "Unknown";
    }
  }
}

async function loadAgentRunStatus() {
  if (!els.agentState && !els.agentDetail) {
    return;
  }

  try {
    const response = await fetch(`agent-last-run.json?__live=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Status request failed: ${response.status}`);
    }
    const status = await response.json();
    const state = status.status || "unknown";
    const title = status.statusTitle || (state === "completed" ? "Anton Finished" : state);
    const detail = status.statusDetail || status.summary || "No Anton run summary has been recorded yet.";
    const next = describeNextRun(status.nextExpectedRunAt);
    els.agentCard?.setAttribute("data-anton-server", state === "completed" ? "online" : state);
    if (els.agentState) {
      els.agentState.textContent = title;
    }
    if (els.agentDetail) {
      els.agentDetail.textContent = `${detail} Last heartbeat ${formatDate(status.lastHeartbeatAt)}; ${next}.`;
    }
    if (els.publicLastChange) {
      els.publicLastChange.textContent = firstSummaryLine(status.summary);
    }
    if (els.publicNext) {
      els.publicNext.textContent = next;
    }
    if (els.publicGithub) {
      els.publicGithub.textContent = status.pushed ? `Pushed ${status.commit || ""}`.trim() : "Not pushed yet";
    }
    if (els.publicImpactScore) {
      const score = Number.isFinite(Number(status.impactScore)) ? `${Number(status.impactScore)}/5` : "Not scored";
      els.publicImpactScore.textContent = `${score} - ${status.impactLabel || "Not scored yet"}`;
    }
    if (els.publicVisibleChange) {
      els.publicVisibleChange.textContent = status.visibleChange || firstSummaryLine(status.summary);
    }
    if (els.publicImpactReason) {
      els.publicImpactReason.textContent = status.impactReason || "Anton will publish an impact reason after the next scored run.";
    }
    renderRunSnapshot(status);
    renderOwnerCheck(status);
    if (els.publicSummary) {
      els.publicSummary.textContent = summarizeText(status.summary);
    }
    if (els.publicFiles) {
      const files = Array.isArray(status.changedFiles) ? status.changedFiles.filter(Boolean).slice(0, 10) : [];
      els.publicFiles.innerHTML = files.length
        ? files.map((file) => `<li>${escapeHtml(file)}</li>`).join("")
        : "<li>No changed files recorded.</li>";
    }
  } catch (error) {
    els.agentCard?.setAttribute("data-anton-server", "offline");
    if (els.agentState) {
      els.agentState.textContent = "Status Unavailable";
    }
    if (els.agentDetail) {
      els.agentDetail.textContent = `Could not load the pushed Anton status. ${error.message}`;
    }
    if (els.publicLastChange) {
      els.publicLastChange.textContent = "Status unavailable";
    }
    if (els.publicSummary) {
      els.publicSummary.textContent = `Could not load Anton's pushed status. ${error.message}`;
    }
    if (els.runSnapshot) {
      els.runSnapshot.dataset.antonRunState = "unavailable";
      els.runSnapshot.innerHTML = `
        <article>
          <span>Stage</span>
          <strong>Status unavailable</strong>
          <p>${escapeHtml(error.message)}</p>
        </article>
      `;
    }
  }
}

els.signoffChoices.forEach((button) => {
  button.addEventListener("click", () => {
    state.signoffChoice = button.dataset.antonSignoffChoice || "reviewed";
    renderSignoffPanel(state.latestStatus || {}, state.latestReviewContext || {
      changedPage: "index.html",
      changedLabel: "Home",
      visibleChange: "",
      actionRequired: "",
      next: describeNextRun(""),
      score: "Not scored"
    });
    setSignoffStatus(`${signoffChoiceLabel()} selected.`);
  });
});

els.signoffSave?.addEventListener("click", () => {
  try {
    const record = buildSignoffRecord();
    writeStoredJson(SIGNOFF_KEY, record);
    renderSavedSignoff();
    setSignoffStatus(`Saved sign-off: ${signoffChoiceLabel(record.choice)}.`);
  } catch {
    setSignoffStatus("Sign-off could not be saved in this browser.");
  }
});

els.signoffCopy?.addEventListener("click", async () => {
  try {
    const record = buildSignoffRecord();
    const copied = await copyText(record.text);
    setSignoffStatus(copied ? "Sign-off copied." : "Copy is unavailable in this browser.");
  } catch {
    setSignoffStatus("Copy failed. Select the sign-off text manually.");
  }
});

els.signoffShare?.addEventListener("click", async () => {
  try {
    const record = buildSignoffRecord();
    if (navigator.share) {
      await navigator.share({ title: "Ridgeline Anton iPhone sign-off", text: record.text });
      setSignoffStatus("Sign-off shared.");
      return;
    }
    const copied = await copyText(record.text);
    setSignoffStatus(copied ? "Share unavailable; sign-off copied instead." : "Share is unavailable in this browser.");
  } catch {
    setSignoffStatus("Share canceled or unavailable.");
  }
});

async function loadFiles() {
  if (!ownerCanInspectAntonInternals()) {
    state.files = FALLBACK_FILES;
    renderTabs();
    return;
  }

  try {
    const payload = await controlFetch("/files");
    state.files = Array.isArray(payload.files) && payload.files.length ? payload.files : FALLBACK_FILES;
  } catch {
    state.files = FALLBACK_FILES;
  }
  renderTabs();
}

async function loadFile(name = state.selectedFile) {
  if (!ownerCanInspectAntonInternals()) {
    if (els.fileTitle) {
      els.fileTitle.textContent = "Anton Memory";
    }
    if (els.fileTime) {
      els.fileTime.textContent = "Owner sign-in required";
    }
    if (els.fileContent) {
      els.fileContent.textContent = "Anton markdown files are hidden from public viewers. Sign in as owner to read or edit them.";
    }
    renderHistory([]);
    return;
  }

  if (els.fileTitle) {
    els.fileTitle.textContent = name;
  }
  if (els.fileTime) {
    els.fileTime.textContent = "Loading...";
  }

  try {
    const payload = await controlFetch(`/file?name=${encodeURIComponent(name)}`);
    if (els.fileTitle) {
      els.fileTitle.textContent = `${payload.name} - ${payload.label || "Markdown"}`;
    }
    if (els.fileTime) {
      els.fileTime.textContent = `Last saved ${formatDate(payload.lastWriteTime)}`;
    }
    if (els.fileContent) {
      els.fileContent.textContent = payload.content || "";
    }
    renderHistory(payload.history);
  } catch (error) {
    if (els.fileTime) {
      els.fileTime.textContent = "Loaded read-only fallback";
    }
    try {
      const response = await fetch(name, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Could not load ${name}.`);
      }
      const text = await response.text();
      if (els.fileContent) {
        els.fileContent.textContent = text;
      }
      renderHistory([]);
    } catch {
      if (els.fileContent) {
        els.fileContent.textContent = `Could not load ${name}. Start the Anton control server for local file access.\n\n${error.message}`;
      }
      renderHistory([]);
    }
  }
}

async function runAction(action, button) {
  const labels = {
    start: "Starting...",
    enable: "Resuming...",
    disable: "Pausing..."
  };
  const original = button.textContent;
  button.disabled = true;
  button.textContent = labels[action] || "Working...";
  setMessage("Contacting Anton control server...", "pending");

  try {
    const payload = await controlFetch(`/${action}`, { method: "POST" });
    setMessage(payload.message || "Anton control command completed.", "ok");
    await loadStatus();
  } catch (error) {
    setMessage(`Control command failed: ${error.message}`, "error");
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function editControlSettings() {
  const currentUrl = getControlUrl();
  const nextUrl = window.prompt("Anton control server URL", currentUrl);
  if (nextUrl === null) {
    return;
  }

  const currentToken = getControlToken();
  const nextToken = window.prompt("Anton control token, if your server requires one", currentToken);
  if (nextToken === null) {
    return;
  }

  try {
    localStorage.setItem(CONTROL_URL_KEY, nextUrl.trim() || DEFAULT_CONTROL_URL);
    localStorage.setItem(CONTROL_TOKEN_KEY, nextToken.trim());
    setMessage(`Control server set to ${getControlUrl()}.`, "ok");
    loadStatus();
  } catch {
    setMessage("Control settings could not be saved in this browser.", "error");
  }
}

async function appendNote(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.elements.note;
  const note = input.value.trim();
  if (!note) {
    setMessage("Write a note before appending it to ANTON.md.", "error");
    input.focus();
    return;
  }

  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "Appending...";
  setMessage("Appending note to ANTON.md...", "pending");

  try {
    const payload = await controlFetch("/append-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note })
    });
    input.value = "";
    state.selectedFile = "ANTON.md";
    renderTabs();
    if (els.fileContent) {
      els.fileContent.textContent = payload.content || "";
    }
    if (els.fileTitle) {
      els.fileTitle.textContent = "ANTON.md - Anton Instructions";
    }
    if (els.fileTime) {
      els.fileTime.textContent = "Updated just now";
    }
    renderHistory(payload.history);
    setMessage(payload.message || "Note appended to ANTON.md.", "ok");
  } catch (error) {
    setMessage(`Could not append note: ${error.message}`, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Append Note";
  }
}

document.querySelectorAll("[data-anton-action]").forEach((button) => {
  button.addEventListener("click", () => runAction(button.dataset.antonAction, button));
});

document.querySelector("[data-anton-settings]")?.addEventListener("click", editControlSettings);
document.querySelector("[data-anton-refresh]")?.addEventListener("click", () => {
  loadStatus();
  loadFile(state.selectedFile);
});
els.noteForm?.addEventListener("submit", appendNote);

(async () => {
  await ownerAuth.initOwnerAuth();
  const applyOwnerState = () => {
    state.isOwner = Boolean(ownerAuth.getOwnerAuthState().isOwner);
    renderTabs();
    renderSavedSignoff();
    loadStatus();
    loadFiles().then(() => loadFile(state.selectedFile));
    refreshVisitorLog();
  };

  ownerAuth.onOwnerAuthChange(applyOwnerState);
  document.querySelector("[data-visitor-log-refresh]")?.addEventListener("click", refreshVisitorLog);
  applyOwnerState();
  setInterval(loadStatus, 30000);
})();
