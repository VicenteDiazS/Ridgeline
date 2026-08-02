const statusRoot = document.querySelector("[data-agent-status]");
const homeAgentCard = document.querySelector("[data-agent-home-card]");
const homeResumePanel = document.querySelector("[data-home-resume-work]");
const STALE_GRACE_MINUTES = 30;
const STALE_RUNNING_MINUTES = 20;
const DEFAULT_CONTROL_URL = "http://127.0.0.1:8765";
const CONTROL_URL_KEY = "ridgelineAntonControlUrl";
const CONTROL_TOKEN_KEY = "ridgelineAntonControlToken";
const DRIVE_MAP_LAST_SNAPSHOT_KEY = "ridgeline-drive-map-last-snapshot";
const ROADSIDE_CONTACT_KEY = "ridgeline-roadside-contact-card";
const HOME_RESUME_NOTE_TYPES = [
  { match: /roadside|live roadside/i, label: "Roadside note", href: "quick-sheet.html#roadside-action-stack" },
  { match: /first checks|diagnostic|warning light|no-start|12v|audio|trailer-light/i, label: "Diagnostic note", href: "diagnostics.html#first-check-tracker" },
  { match: /tire pressure recheck|tire|wheel/i, label: "Tire note", href: "tires.html#tire-recheck-planner" },
  { match: /fuse|saved fuse/i, label: "Fuse note", href: "hood.html#hood-saved-fuse-review" },
  { match: /trailer light|tow setup|pinout/i, label: "Tow note", href: "rear-hitch.html#tow-setup-saver" },
  { match: /service|maintenance|follow-up|minder|prep/i, label: "Service note", href: "maintenance.html#service-followup" }
];
const HOME_DIAGNOSTIC_CHECK_LABELS = {
  start: "No start or weak battery",
  warning: "Warning light or MID message",
  power: "12V socket or accessory power",
  audio: "Audio, radio, or display issue",
  trailer: "Trailer light or connector issue"
};

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

function escapeHtml(value = "") {
  return `${value}`.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderTextBlock(value = "") {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function readStoredJson(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function homeResumeTimestamp(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function firstLine(value = "") {
  return `${value}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";
}

function compactNoteBody(value = "", maxLength = 118) {
  const text = `${value}`.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function classifyHomeResumeNote(text = "") {
  const found = HOME_RESUME_NOTE_TYPES.find((type) => type.match.test(text));
  return found || { label: "Garage note", href: "garage.html#notes" };
}

function parseGarageGeneralNotes() {
  const notes = readStoredJson("ridgeline-notes", {});
  const general = notes?.general_notes || "";
  if (!general.trim()) {
    return [];
  }

  const blocks = general
    .split(/\n(?=\[[^\]]+\])/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    const heading = firstLine(block).replace(/^\[|\]$/g, "");
    const type = classifyHomeResumeNote(block);
    return {
      title: heading || type.label,
      label: type.label,
      body: block,
      href: type.href,
      source: "Garage Notes",
      order: index
    };
  });
}

function latestDiagnosticCheckResumeItem() {
  const checks = readStoredJson("ridgeline-diagnostic-first-checks", {});
  const latest = Object.entries(checks || {})
    .map(([planKey, value]) => ({
      planKey,
      value: value || {},
      at: homeResumeTimestamp(value?.updatedAt)
    }))
    .filter((entry) => entry.at || entry.value?.detail || entry.value?.markedChecks?.length)
    .sort((a, b) => b.at - a.at)[0];

  if (!latest) {
    return null;
  }

  const markedCount = Array.isArray(latest.value.markedChecks) ? latest.value.markedChecks.length : 0;
  const title = HOME_DIAGNOSTIC_CHECK_LABELS[latest.planKey] || "Diagnostic first checks";
  return {
    title,
    label: "Diagnostic checks",
    body: [
      `Ridgeline first diagnostic checks: ${title}`,
      `${markedCount} first checks marked on this iPhone.`,
      latest.value.detail ? `Result or next clue: ${latest.value.detail}` : "",
      latest.value.updatedAt ? `Updated: ${formatDate(latest.value.updatedAt)}` : ""
    ].filter(Boolean).join("\n"),
    href: "diagnostics.html#first-check-tracker",
    source: "Diagnostics",
    at: latest.at
  };
}

function diagnosticCallResumeItem() {
  const call = readStoredJson("ridgeline-diagnostic-call-summary", {});
  if (!call?.updatedAt && !call?.truckStatus && !call?.callback && !call?.ask) {
    return null;
  }

  return {
    title: `${call.target || "Repair shop"} call summary`,
    label: "Diagnostic call",
    body: [
      `Ridgeline diagnostic call summary for ${call.target || "Repair shop"}`,
      call.truckStatus ? `Truck status: ${call.truckStatus}` : "",
      call.callback ? `Callback: ${call.callback}` : "",
      call.ask ? `Question / ask: ${call.ask}` : "",
      call.updatedAt ? `Updated: ${formatDate(call.updatedAt)}` : ""
    ].filter(Boolean).join("\n"),
    href: "diagnostics.html#diagnostic-call-summary",
    source: "Diagnostics",
    at: homeResumeTimestamp(call.updatedAt)
  };
}

function hasHomeRoadsideContact(contact) {
  return ["location", "callback", "helper", "eta"].some((key) => `${contact?.[key] || ""}`.trim());
}

function roadsideContactResumeItem() {
  const contact = readStoredJson(ROADSIDE_CONTACT_KEY, {});
  if (!hasHomeRoadsideContact(contact)) {
    return null;
  }

  const lines = [
    "Ridgeline roadside contact card",
    contact.location ? `Location / landmark: ${contact.location}` : "",
    contact.callback ? `Callback / party: ${contact.callback}` : "",
    contact.helper ? `Help / tow detail: ${contact.helper}` : "",
    contact.eta ? `ETA / next check: ${contact.eta}` : "",
    contact.updatedAt ? `Updated: ${formatDate(contact.updatedAt)}` : "",
    "Use current roadside conditions, local emergency guidance, truck labels, and the owner's manual as final authority."
  ].filter(Boolean);

  return {
    title: contact.location || contact.helper || contact.callback || "Roadside contact card",
    label: "Roadside contact",
    body: lines.join("\n"),
    href: "quick-sheet.html#roadside-arrival-pack",
    source: "Quick Sheet",
    at: homeResumeTimestamp(contact.updatedAt)
  };
}

function driveMapResumeItem() {
  const snapshot = readStoredJson(DRIVE_MAP_LAST_SNAPSHOT_KEY, null);
  const at = homeResumeTimestamp(snapshot?.timestamp);
  if (!snapshot?.latitude || !snapshot?.longitude || !at) {
    return null;
  }

  const lat = Number(snapshot.latitude).toFixed(5);
  const lon = Number(snapshot.longitude).toFixed(5);
  return {
    title: "Latest drive location snapshot",
    label: "Drive snapshot",
    body: [
      "Ridgeline drive snapshot",
      `Location: ${lat}, ${lon}`,
      Number.isFinite(Number(snapshot.accuracy)) ? `Accuracy: ${Math.round(Number(snapshot.accuracy))} m` : "",
      Number.isFinite(Number(snapshot.speed)) ? `Speed: ${Math.round(Number(snapshot.speed) * 2.236936)} mph` : "",
      `Updated: ${formatDate(snapshot.timestamp)}`
    ].filter(Boolean).join("\n"),
    href: "drive-map.html#drive-map",
    source: "Drive Map",
    at
  };
}

function getHomeResumeItems() {
  const items = parseGarageGeneralNotes();
  const roadsideReceipt = readStoredJson("ridgeline-roadside-last-handoff", null);
  const roadsideSession = readStoredJson("ridgeline-roadside-live-session", null);
  const diagnosticReceipt = readStoredJson("ridgeline-diagnostic-last-handoff", null);
  const fuseNote = readStoredJson("ridgeline-fuse-check-last-note", null);
  const roadsideContact = roadsideContactResumeItem();

  if (roadsideReceipt?.text) {
    items.unshift({
      title: roadsideReceipt.title || "Latest roadside note",
      label: "Roadside receipt",
      body: roadsideReceipt.text,
      href: "quick-sheet.html#roadside-action-stack",
      source: "Quick Sheet",
      at: homeResumeTimestamp(roadsideReceipt.savedAt)
    });
  }

  if (roadsideSession?.startedAt || roadsideSession?.checkpoints?.length) {
    const checkpoints = Array.isArray(roadsideSession.checkpoints) ? roadsideSession.checkpoints : [];
    const planKey = `${roadsideSession.planKey || "flat"}`.trim().toLowerCase();
    const routeKey = ["flat", "start", "warning", "trailer"].includes(planKey) ? planKey : "flat";
    const body = [
      `Live roadside session: ${routeKey}`,
      roadsideSession.startedAt ? `Started: ${formatDate(roadsideSession.startedAt)}` : "",
      checkpoints.length ? `Checkpoints: ${checkpoints.map((item) => item.label || item).join(", ")}` : "No checkpoints marked yet."
    ].filter(Boolean).join("\n");
    items.unshift({
      title: "Live roadside session",
      label: "Roadside session",
      body,
      href: `quick-sheet.html?roadside=${routeKey}#roadside-action-stack`,
      source: "Quick Sheet",
      at: homeResumeTimestamp(roadsideSession.startedAt)
    });
  }

  if (roadsideContact) {
    items.unshift(roadsideContact);
  }

  if (diagnosticReceipt?.text) {
    items.unshift({
      title: diagnosticReceipt.title || "Latest diagnostic handoff",
      label: "Diagnostic receipt",
      body: diagnosticReceipt.text,
      href: "diagnostics.html#diagnostic-share-builder",
      source: "Diagnostics",
      at: homeResumeTimestamp(diagnosticReceipt.savedAt)
    });
  }

  const diagnosticChecks = latestDiagnosticCheckResumeItem();
  if (diagnosticChecks) {
    items.unshift(diagnosticChecks);
  }

  const diagnosticCall = diagnosticCallResumeItem();
  if (diagnosticCall) {
    items.unshift(diagnosticCall);
  }

  if (fuseNote?.text) {
    items.unshift({
      title: fuseNote.title || "Latest fuse check",
      label: "Fuse check",
      body: fuseNote.text,
      href: "quick-sheet.html#fuse-triage",
      source: "Quick Sheet",
      at: homeResumeTimestamp(fuseNote.savedAt)
    });
  }

  const driveSnapshot = driveMapResumeItem();
  if (driveSnapshot) {
    items.unshift(driveSnapshot);
  }

  return items
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .slice(0, 8);
}

function homeResumeActionForItem(item) {
  const label = `${item?.label || ""}`.toLowerCase();
  const source = `${item?.source || ""}`.toLowerCase();
  const fallback = {
    kicker: item?.source || "Resume",
    title: item?.label || "Open latest",
    href: item?.href || "garage.html#recent-handoffs"
  };

  if (label.includes("roadside session")) {
    return { kicker: "Live", title: "Continue Roadside", href: item.href };
  }
  if (label.includes("roadside contact")) {
    return { kicker: "Contact", title: "Open Arrival", href: item.href };
  }
  if (label.includes("roadside")) {
    return { kicker: "Roadside", title: "Open Stack", href: item.href };
  }
  if (label.includes("diagnostic call")) {
    return { kicker: "Call", title: "Finish Summary", href: item.href };
  }
  if (label.includes("diagnostic checks")) {
    return { kicker: "Checks", title: "Resume Checks", href: item.href };
  }
  if (label.includes("diagnostic")) {
    return { kicker: "Diag", title: "Share Symptom", href: item.href };
  }
  if (label.includes("drive") || source.includes("drive")) {
    return { kicker: "GPS", title: "Open Map", href: item.href };
  }
  if (label.includes("service")) {
    return { kicker: "Service", title: "Follow Up", href: item.href };
  }
  if (label.includes("fuse")) {
    return { kicker: "Fuse", title: "Review Fuse", href: item.href };
  }
  if (label.includes("tire")) {
    return { kicker: "Tire", title: "Recheck Tire", href: item.href };
  }

  return fallback;
}

function getHomeResumeActions(items = []) {
  const seen = new Set();
  return items
    .map(homeResumeActionForItem)
    .filter((action) => {
      const key = `${action.kicker}|${action.title}|${action.href}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function renderHomeResumePanel() {
  if (!homeResumePanel) {
    return;
  }

  const titleNode = homeResumePanel.querySelector("[data-home-resume-title]");
  const summaryNode = homeResumePanel.querySelector("[data-home-resume-summary]");
  const copyButton = homeResumePanel.querySelector("[data-home-resume-copy]");
  const openLink = homeResumePanel.querySelector("[data-home-resume-open]");
  const activeActionsNode = homeResumePanel.querySelector("[data-home-resume-active-actions]");
  const routesNode = homeResumePanel.querySelector("[data-home-resume-routes]");
  const statusNode = homeResumePanel.querySelector("[data-home-resume-status]");
  const manualCopyPanel = homeResumePanel.querySelector("[data-home-resume-copy-fallback]");
  const manualCopyField = homeResumePanel.querySelector("[data-home-resume-manual-copy]");
  const items = getHomeResumeItems();
  const latest = items[0];

  homeResumePanel.hidden = !latest;
  homeResumePanel.dataset.resumeState = latest ? "ready" : "empty";
  if (titleNode) {
    titleNode.textContent = latest ? `${latest.label}: ${latest.title}` : "No saved handoffs yet";
  }
  if (summaryNode) {
    summaryNode.textContent = latest
      ? `${latest.source} has ${items.length} recoverable owner note${items.length === 1 ? "" : "s"}. ${compactNoteBody(latest.body)}`
      : "Save a roadside note, diagnostic check, fuse review, tire recheck, tow note, or service follow-up, then resume it here.";
  }
  if (copyButton) {
    copyButton.disabled = !latest;
    copyButton.onclick = () => {
      if (!latest) {
        return;
      }
      const write = navigator.clipboard?.writeText
        ? navigator.clipboard.writeText(latest.body)
        : Promise.reject(new Error("Clipboard unavailable"));
      write
        .then(() => {
          if (manualCopyPanel) {
            manualCopyPanel.hidden = true;
          }
          if (statusNode) {
            statusNode.textContent = `Copied ${latest.label.toLowerCase()}.`;
          }
        })
        .catch(() => {
          if (manualCopyField) {
            manualCopyField.value = latest.body;
          }
          if (manualCopyPanel) {
            manualCopyPanel.hidden = false;
          }
          if (statusNode) {
            statusNode.textContent = "Copy is unavailable in this browser. Select the fallback text below.";
          }
        });
    };
  }
  if (openLink) {
    openLink.setAttribute("href", latest?.href || "garage.html#recent-handoffs");
    openLink.textContent = latest ? "Open Latest" : "Open Handoffs";
    openLink.toggleAttribute("aria-disabled", !latest);
  }
  if (activeActionsNode) {
    const activeActions = getHomeResumeActions(items);
    activeActionsNode.hidden = !activeActions.length;
    activeActionsNode.innerHTML = activeActions
      .map((action) => `
        <a href="${escapeHtml(action.href)}">
          <span>${escapeHtml(action.kicker)}</span>
          <strong>${escapeHtml(action.title)}</strong>
        </a>
      `)
      .join("");
  }
  if (routesNode) {
    const seen = new Set();
    const routes = items
      .filter((item) => item?.href)
      .filter((item) => {
        const key = `${item.label}|${item.href}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .slice(0, 3);

    routesNode.hidden = !routes.length;
    routesNode.innerHTML = routes
      .map((item) => `
        <a href="${escapeHtml(item.href)}">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(compactNoteBody(item.title, 46))}</strong>
        </a>
      `)
      .join("");
  }
  if (statusNode) {
    statusNode.textContent = latest
      ? "Latest local note is ready to copy; recent routes stay one tap below."
      : "";
  }
  if (manualCopyPanel && !latest) {
    manualCopyPanel.hidden = true;
  }
  if (manualCopyField && latest) {
    manualCopyField.value = latest.body;
  }
}

window.addEventListener("storage", renderHomeResumePanel);
window.addEventListener("ridgeline:storage-hydrated", () => window.setTimeout(renderHomeResumePanel, 250));
window.addEventListener("ridgeline:quick-capture-saved", () => window.setTimeout(renderHomeResumePanel, 250));
window.addEventListener("ridgeline:roadside-contact-saved", () => window.setTimeout(renderHomeResumePanel, 250));

function firstUsefulLine(value = "") {
  return `${value}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";
}

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

function setControlMessage(message, state = "idle") {
  const messageNode = statusRoot?.querySelector("[data-agent-control-message]");
  if (!messageNode) {
    return;
  }
  messageNode.dataset.agentControlState = state;
  messageNode.textContent = message;
}

async function startAntonNow(button) {
  const controlUrl = getControlUrl().replace(/\/+$/, "");
  const token = getControlToken();
  const headers = token ? { "X-Anton-Token": token } : {};

  button.disabled = true;
  button.textContent = "Starting...";
  setControlMessage("Contacting Anton control server...", "pending");

  try {
    const response = await fetch(`${controlUrl}/start`, {
      method: "POST",
      headers
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message || `Control server returned ${response.status}.`);
    }
    setControlMessage(payload.message || "Anton start request sent.", "ok");
  } catch (error) {
    setControlMessage(`Start failed: ${error.message}`, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Start Anton";
  }
}

function editControlSettings() {
  const currentUrl = getControlUrl();
  const nextUrl = window.prompt("Anton control server URL", currentUrl);
  if (nextUrl === null) {
    return;
  }

  const trimmedUrl = nextUrl.trim() || DEFAULT_CONTROL_URL;
  const currentToken = getControlToken();
  const nextToken = window.prompt("Anton control token, if your server requires one", currentToken);
  if (nextToken === null) {
    return;
  }

  try {
    localStorage.setItem(CONTROL_URL_KEY, trimmedUrl);
    localStorage.setItem(CONTROL_TOKEN_KEY, nextToken.trim());
    setControlMessage(`Control server set to ${trimmedUrl}.`, "ok");
  } catch {
    setControlMessage("Control settings could not be saved in this browser.", "error");
  }
}

function minutesUntil(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.round((date.getTime() - Date.now()) / 60000);
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

function compactAge(value, fallback = "") {
  const minutes = minutesSince(value);
  if (minutes === null) {
    return fallback;
  }
  if (minutes <= 1) {
    return "now";
  }
  return `${minutes} min`;
}

function describeNextRun(value) {
  const minutes = minutesUntil(value);
  if (minutes === null) {
    return "After the next check-in";
  }
  if (minutes <= -1) {
    return `${Math.abs(minutes)} min overdue`;
  }
  if (minutes <= 1) {
    return "Due now";
  }
  return `About ${minutes} min`;
}

function summarizeRun(data) {
  if (data.statusDetail) {
    return data.statusDetail;
  }

  const summary = data.summary || "No agent run summary has been recorded yet.";
  const lowered = summary.toLowerCase();

  if (lowered.includes("unrecognized subcommand") || lowered.includes("unexpected argument")) {
    return "Anton launched, but the Codex command line was malformed. The runner needs a script fix rather than more tokens.";
  }

  if ((data.status || "").includes("waiting-for-tokens-or-auth")) {
    return "Anton launched, but Codex stopped before doing useful work. Check the run log to separate auth, quota, service, and command-line errors.";
  }

  return summary;
}

function describeImpact(data) {
  const score = Number(data.impactScore);
  const hasScore = Number.isFinite(score);
  const scoreText = hasScore ? `${score}/5` : "Not scored";
  const label = data.impactLabel || "Not scored yet";
  const visibleChange = data.visibleChange || firstUsefulLine(data.summary || "");
  const reason = data.impactReason || "Anton will publish an impact reason after the next scored run.";

  return {
    scoreText,
    label,
    visibleChange,
    reason
  };
}

function renderHomeAgentCard(data) {
  if (!homeAgentCard) {
    return;
  }

  const health = getLoopHealth(data);
  const impact = describeImpact(data);
  const titleNode = homeAgentCard.querySelector("[data-agent-home-title]");
  const detailNode = homeAgentCard.querySelector("[data-agent-home-detail]");
  const kickerNode = homeAgentCard.querySelector("[data-agent-home-kicker]");
  const score = Number.isFinite(Number(data.impactScore)) ? `${Number(data.impactScore)}/5` : "";
  const running = data.status === "running" && health.state !== "stale";
  const rawTitle = health.state === "stale"
    ? health.label
    : running
    ? (data.statusTitle || "Anton is working")
    : (impact.visibleChange || data.statusTitle || health.label || "Anton status");
  const title = compactNoteBody(rawTitle, running ? 54 : 60);
  const next = describeNextRun(data.nextExpectedRunAt);
  const detailParts = running
    ? [
        data.phase || health.label,
        "running",
        compactAge(data.startedAt, "active"),
        compactAge(data.lastHeartbeatAt, "heartbeat")
      ]
    : [
        score ? `Impact ${score}` : health.label,
        data.pushed ? "pushed" : "local",
        next
      ].filter(Boolean);

  homeAgentCard.dataset.agentHealth = health.state;
  homeAgentCard.setAttribute(
    "aria-label",
    `Anton status: ${title}. ${impact.reason || health.copy}`
  );
  if (kickerNode) {
    kickerNode.textContent = data.status === "running" ? "Anton running" : "Anton latest";
  }
  if (titleNode) {
    titleNode.textContent = title;
  }
  if (detailNode) {
    detailNode.textContent = detailParts.join(" - ");
  }
}

function getLoopHealth(data) {
  const interval = Number(data.intervalMinutes) || 90;
  const heartbeat = data.lastHeartbeatAt || data.finishedAt || data.startedAt;
  const heartbeatDate = heartbeat ? new Date(heartbeat) : null;
  const heartbeatAgeMinutes = heartbeatDate && !Number.isNaN(heartbeatDate.getTime())
    ? (Date.now() - heartbeatDate.getTime()) / 60000
    : null;
  const staleAfter = interval + STALE_GRACE_MINUTES;
  const status = data.status || "unknown";

  if (status === "running") {
    if (heartbeatAgeMinutes !== null && heartbeatAgeMinutes > STALE_RUNNING_MINUTES) {
      return {
        state: "stale",
        label: "Running status may be stale",
        copy: `Anton still says running, but the last heartbeat was ${Math.round(heartbeatAgeMinutes)} minutes ago. Refresh once, then check Anton controls or the run log.`
      };
    }
    return {
      state: "running",
      label: "Running now",
      copy: "Anton is currently checked in and working."
    };
  }

  if (["error", "blocked-dirty-worktree", "waiting-for-tokens-or-auth", "command-error"].includes(status)) {
    const copy = status === "command-error"
      ? "Anton reached Codex, but the runner command failed before site work could begin."
      : "Anton checked in, but the last run needs a fix before useful work can continue.";
    return {
      state: "attention",
      label: "Needs attention",
      copy
    };
  }

  if (heartbeatAgeMinutes === null) {
    return {
      state: "unknown",
      label: "Waiting for first check",
      copy: "Anton is installed, but the site has not seen a completed check-in yet."
    };
  }

  if (heartbeatAgeMinutes > staleAfter) {
    return {
      state: "stale",
      label: "No recent check-in",
      copy: `Anton has not checked in for ${Math.round(heartbeatAgeMinutes)} minutes. The laptop may have slept through a run; wake it, sign in, and check Task Scheduler.`
    };
  }

  return {
    state: "healthy",
    label: "Loop healthy",
    copy: `Anton checked in ${Math.max(0, Math.round(heartbeatAgeMinutes))} minutes ago and is expected every ${interval} minutes.`
  };
}

function renderAgentStatus(data) {
  renderHomeAgentCard(data);

  if (!statusRoot) {
    return;
  }

  const changedFiles = Array.isArray(data.changedFiles) ? data.changedFiles : [];
  const visibleFiles = changedFiles.slice(0, 8);
  const extraCount = Math.max(changedFiles.length - visibleFiles.length, 0);
  const pushedText = data.pushed ? "Pushed to GitHub" : "Not pushed";
  const health = getLoopHealth(data);
  const intervalText = `${Number(data.intervalMinutes) || 90} min`;
  const runSummary = summarizeRun(data);
  const statusTitle = data.statusTitle || health.label || "Anton status";
  const actionRequired = data.actionRequired || (health.state === "healthy" ? "No action needed." : health.copy);
  const phase = data.phase || data.status || "Unknown";
  const duration = Number.isFinite(Number(data.durationMinutes)) ? `${Number(data.durationMinutes)} min` : "In progress";
  const diagnostic = data.diagnostic ? firstUsefulLine(data.diagnostic) : "";
  const impact = describeImpact(data);
  const endedEarlyBecause = firstUsefulLine(data.endedEarlyBecause || "");
  const timeLostTo = firstUsefulLine(data.timeLostTo || "");
  const blockedBy = firstUsefulLine(data.blockedBy || "");

  statusRoot.innerHTML = `
    <div class="agent-status-head">
      <div>
        <p class="eyebrow">Anton Monitor</p>
        <h2>Anton Automatic Site Loop</h2>
      </div>
      <span class="agent-status-pill" data-agent-run-state="${escapeHtml(data.status || "unknown")}">${escapeHtml(data.status || "unknown")}</span>
    </div>
    <div class="agent-heartbeat" data-agent-health="${health.state}">
      <strong>${health.label}</strong>
      <span>${health.copy}</span>
    </div>
    <div class="agent-now-grid">
      <article class="agent-now-card agent-now-card-strong">
        <span>Right Now</span>
        <strong>${escapeHtml(statusTitle)}</strong>
        <p>${escapeHtml(runSummary)}</p>
      </article>
      <article class="agent-now-card">
        <span>Action Needed</span>
        <strong>${escapeHtml(actionRequired)}</strong>
        ${diagnostic ? `<p>${escapeHtml(diagnostic)}</p>` : ""}
      </article>
      <article class="agent-now-card">
        <span>Impact Score</span>
        <strong>${escapeHtml(`${impact.scoreText} - ${impact.label}`)}</strong>
        <p>${escapeHtml(impact.visibleChange || impact.reason)}</p>
      </article>
    </div>
    <div class="agent-impact-bar">
      <span>Visible Change</span>
      <strong>${escapeHtml(impact.visibleChange || "Waiting for Anton's next scored run.")}</strong>
      <p>${escapeHtml(impact.reason)}</p>
    </div>
    ${
      endedEarlyBecause || timeLostTo || blockedBy
        ? `<div class="agent-now-grid">
            ${
              endedEarlyBecause
                ? `<article class="agent-now-card">
                    <span>Ended Early Because</span>
                    <strong>${escapeHtml(endedEarlyBecause)}</strong>
                  </article>`
                : ""
            }
            ${
              timeLostTo
                ? `<article class="agent-now-card">
                    <span>Time Lost To</span>
                    <strong>${escapeHtml(timeLostTo)}</strong>
                  </article>`
                : ""
            }
            ${
              blockedBy
                ? `<article class="agent-now-card">
                    <span>Blocked By</span>
                    <strong>${escapeHtml(blockedBy)}</strong>
                  </article>`
                : ""
            }
          </div>`
        : ""
    }
    <div class="agent-control-panel">
      <div>
        <strong>Remote Start</strong>
        <span data-agent-control-message>Start Anton through the local control server at ${escapeHtml(getControlUrl())}.</span>
      </div>
      <div class="agent-control-actions">
        <button class="agent-control-button" type="button" data-agent-start>Start Anton</button>
        <button class="agent-control-button agent-control-button-secondary" type="button" data-agent-control-settings>Control URL</button>
      </div>
    </div>
    <details class="agent-status-details" open>
      <summary>What Anton Did</summary>
      <p class="agent-status-summary">${renderTextBlock(data.summary || runSummary)}</p>
    </details>
    <div class="agent-status-grid">
      <div><span>Loop</span><strong>Every ${intervalText}</strong></div>
      <div><span>Next Check</span><strong>${describeNextRun(data.nextExpectedRunAt)}</strong></div>
      <div><span>Heartbeat</span><strong>${formatDate(data.lastHeartbeatAt)}</strong></div>
      <div><span>Started</span><strong>${formatDate(data.startedAt)}</strong></div>
      <div><span>Finished</span><strong>${formatDate(data.finishedAt)}</strong></div>
      <div><span>Duration</span><strong>${escapeHtml(duration)}</strong></div>
      <div><span>Phase</span><strong>${escapeHtml(phase)}</strong></div>
      <div><span>Commit</span><strong>${escapeHtml(data.commit || "None yet")}</strong></div>
      <div><span>GitHub</span><strong>${pushedText}</strong></div>
      <div><span>Status Version</span><strong>${escapeHtml(data.statusVersion || "Legacy")}</strong></div>
      <div><span>Output Log</span><strong>${escapeHtml(data.outputLog || data.log || "Not recorded")}</strong></div>
    </div>
    ${
      visibleFiles.length
        ? `<ul class="agent-status-files">${visibleFiles.map((file) => `<li>${escapeHtml(file)}</li>`).join("")}${extraCount ? `<li>+ ${extraCount} more</li>` : ""}</ul>`
        : `<p class="agent-status-empty">No changed files were recorded for the last run.</p>`
    }
  `;

  const startButton = statusRoot.querySelector("[data-agent-start]");
  const settingsButton = statusRoot.querySelector("[data-agent-control-settings]");
  startButton?.addEventListener("click", () => startAntonNow(startButton));
  settingsButton?.addEventListener("click", editControlSettings);
}

if (statusRoot) {
  fetch(`agent-last-run.json?__live=${Date.now()}`, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Status request failed: ${response.status}`);
      }
      return response.json();
    })
    .then(renderAgentStatus)
    .catch(() => {
      renderAgentStatus({
        status: "unavailable",
        summary: "The local agent status file could not be loaded. Run the agent loop once to refresh it.",
        changedFiles: []
      });
    });
}

renderHomeResumePanel();
