const statusRoot = document.querySelector("[data-agent-status]");
const STALE_GRACE_MINUTES = 30;
const DEFAULT_CONTROL_URL = "http://127.0.0.1:8765";
const CONTROL_URL_KEY = "ridgelineAntonControlUrl";
const CONTROL_TOKEN_KEY = "ridgelineAntonControlToken";

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
        <span>Current Phase</span>
        <strong>${escapeHtml(phase)}</strong>
        <p>${escapeHtml(data.failureKind ? `Issue type: ${data.failureKind}` : `Run time: ${duration}`)}</p>
      </article>
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
