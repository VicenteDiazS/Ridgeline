const statusRoot = document.querySelector("[data-agent-status]");

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

function renderAgentStatus(data) {
  if (!statusRoot) {
    return;
  }

  const changedFiles = Array.isArray(data.changedFiles) ? data.changedFiles : [];
  const visibleFiles = changedFiles.slice(0, 8);
  const extraCount = Math.max(changedFiles.length - visibleFiles.length, 0);
  const pushedText = data.pushed ? "Pushed to GitHub" : "Not pushed";

  statusRoot.innerHTML = `
    <div class="agent-status-head">
      <div>
        <p class="eyebrow">Coding Agent</p>
        <h2>Last Automatic Site Run</h2>
      </div>
      <span class="agent-status-pill" data-agent-run-state="${data.status || "unknown"}">${data.status || "unknown"}</span>
    </div>
    <p class="agent-status-summary">${data.summary || "No agent run summary has been recorded yet."}</p>
    <div class="agent-status-grid">
      <div><span>Started</span><strong>${formatDate(data.startedAt)}</strong></div>
      <div><span>Finished</span><strong>${formatDate(data.finishedAt)}</strong></div>
      <div><span>Commit</span><strong>${data.commit || "None yet"}</strong></div>
      <div><span>GitHub</span><strong>${pushedText}</strong></div>
    </div>
    ${
      visibleFiles.length
        ? `<ul class="agent-status-files">${visibleFiles.map((file) => `<li>${file}</li>`).join("")}${extraCount ? `<li>+ ${extraCount} more</li>` : ""}</ul>`
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
