const statusRoot = document.querySelector("[data-agent-status]");
const STALE_GRACE_MINUTES = 30;

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

  if (["error", "blocked-dirty-worktree", "waiting-for-tokens-or-auth"].includes(status)) {
    return {
      state: "attention",
      label: "Needs attention",
      copy: "Anton checked in, but the last run needs a fix before useful work can continue."
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

  statusRoot.innerHTML = `
    <div class="agent-status-head">
      <div>
        <p class="eyebrow">Coding Agent</p>
        <h2>Anton Automatic Site Loop</h2>
      </div>
      <span class="agent-status-pill" data-agent-run-state="${escapeHtml(data.status || "unknown")}">${escapeHtml(data.status || "unknown")}</span>
    </div>
    <div class="agent-heartbeat" data-agent-health="${health.state}">
      <strong>${health.label}</strong>
      <span>${health.copy}</span>
    </div>
    <p class="agent-status-summary">${escapeHtml(data.summary || "No agent run summary has been recorded yet.")}</p>
    <div class="agent-status-grid">
      <div><span>Loop</span><strong>Every ${intervalText}</strong></div>
      <div><span>Next Check</span><strong>${describeNextRun(data.nextExpectedRunAt)}</strong></div>
      <div><span>Heartbeat</span><strong>${formatDate(data.lastHeartbeatAt)}</strong></div>
      <div><span>Started</span><strong>${formatDate(data.startedAt)}</strong></div>
      <div><span>Finished</span><strong>${formatDate(data.finishedAt)}</strong></div>
      <div><span>Commit</span><strong>${escapeHtml(data.commit || "None yet")}</strong></div>
      <div><span>GitHub</span><strong>${pushedText}</strong></div>
    </div>
    ${
      visibleFiles.length
        ? `<ul class="agent-status-files">${visibleFiles.map((file) => `<li>${escapeHtml(file)}</li>`).join("")}${extraCount ? `<li>+ ${extraCount} more</li>` : ""}</ul>`
        : `<p class="agent-status-empty">No changed files were recorded for the last run.</p>`
    }
  `;
}

if (statusRoot) {
  fetch("agent-last-run.json", { cache: "no-store" })
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
