const statusRoot = document.querySelector("[data-agent-status]");
const homeAgentCard = document.querySelector("[data-agent-home-card]");
const homeResumePanel = document.querySelector("[data-home-resume-work]");
const STALE_GRACE_MINUTES = 30;
const DEFAULT_CONTROL_URL = "http://127.0.0.1:8765";
const CONTROL_URL_KEY = "ridgelineAntonControlUrl";
const CONTROL_TOKEN_KEY = "ridgelineAntonControlToken";
const HOME_RESUME_NOTE_TYPES = [
  { match: /roadside|live roadside/i, label: "Roadside note", href: "quick-sheet.html#roadside-action-stack" },
  { match: /first checks|diagnostic|warning light|no-start|12v|audio|trailer-light/i, label: "Diagnostic note", href: "diagnostics.html#first-check-tracker" },
  { match: /tire pressure recheck|tire|wheel/i, label: "Tire note", href: "tires.html#tire-recheck-planner" },
  { match: /fuse|saved fuse/i, label: "Fuse note", href: "hood.html#hood-saved-fuse-review" },
  { match: /trailer light|tow setup|pinout/i, label: "Tow note", href: "rear-hitch.html#tow-setup-saver" },
  { match: /service|maintenance|follow-up|minder|prep/i, label: "Service note", href: "maintenance.html#service-followup" }
];

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

function getHomeResumeItems() {
  const items = parseGarageGeneralNotes();
  const roadsideReceipt = readStoredJson("ridgeline-roadside-last-handoff", null);
  const roadsideSession = readStoredJson("ridgeline-roadside-live-session", null);

  if (roadsideReceipt?.text) {
    items.unshift({
      title: roadsideReceipt.title || "Latest roadside note",
      label: "Roadside receipt",
      body: roadsideReceipt.text,
      href: "quick-sheet.html#roadside-action-stack",
      source: "Quick Sheet"
    });
  }

  if (roadsideSession?.startedAt || roadsideSession?.checkpoints?.length) {
    const checkpoints = Array.isArray(roadsideSession.checkpoints) ? roadsideSession.checkpoints : [];
    const body = [
      `Live roadside session: ${roadsideSession.planKey || "roadside"}`,
      roadsideSession.startedAt ? `Started: ${formatDate(roadsideSession.startedAt)}` : "",
      checkpoints.length ? `Checkpoints: ${checkpoints.map((item) => item.label || item).join(", ")}` : "No checkpoints marked yet."
    ].filter(Boolean).join("\n");
    items.unshift({
      title: "Live roadside session",
      label: "Roadside session",
      body,
      href: "quick-sheet.html#roadside-action-stack",
      source: "Quick Sheet"
    });
  }

  return items.slice(0, 8);
}

function renderHomeResumePanel() {
  if (!homeResumePanel) {
    return;
  }

  const titleNode = homeResumePanel.querySelector("[data-home-resume-title]");
  const summaryNode = homeResumePanel.querySelector("[data-home-resume-summary]");
  const copyButton = homeResumePanel.querySelector("[data-home-resume-copy]");
  const statusNode = homeResumePanel.querySelector("[data-home-resume-status]");
  const items = getHomeResumeItems();
  const latest = items[0];

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
      navigator.clipboard?.writeText(latest.body)
        .then(() => {
          if (statusNode) {
            statusNode.textContent = `Copied ${latest.label.toLowerCase()}.`;
          }
        })
        .catch(() => {
          if (statusNode) {
            statusNode.textContent = "Copy is unavailable in this browser. Open Handoffs to copy manually.";
          }
        });
    };
  }
  if (statusNode) {
    statusNode.textContent = latest ? "Latest local note is ready to copy or open in Garage Recent Handoffs." : "";
  }
}

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
  const running = data.status === "running";
  const title = running
    ? (data.statusTitle || "Anton is working")
    : (impact.visibleChange || data.statusTitle || health.label || "Anton status");
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
