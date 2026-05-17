const DEFAULT_CONTROL_URL = "http://127.0.0.1:8765";
const CONTROL_URL_KEY = "ridgelineAntonControlUrl";
const CONTROL_TOKEN_KEY = "ridgelineAntonControlToken";
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
  serverOnline: false
};

const els = {
  agentCard: document.querySelector("[data-anton-agent-card]"),
  agentState: document.querySelector("[data-anton-agent-state]"),
  agentDetail: document.querySelector("[data-anton-agent-detail]"),
  publicLastChange: document.querySelector("[data-anton-last-change]"),
  publicNext: document.querySelector("[data-anton-public-next]"),
  publicGithub: document.querySelector("[data-anton-public-github]"),
  publicSummary: document.querySelector("[data-anton-run-summary]"),
  publicFiles: document.querySelector("[data-anton-public-files]"),
  serverState: document.querySelector("[data-anton-server-state]"),
  serverDetail: document.querySelector("[data-anton-server-detail]"),
  liveCard: document.querySelector("[data-anton-live-card]"),
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
  noteForm: document.querySelector("[data-anton-note-form]")
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

function requestHeaders() {
  const token = getControlToken();
  return token ? { "X-Anton-Token": token } : {};
}

function summarizeText(value = "") {
  return `${value}`.trim() || "No summary recorded yet.";
}

function firstSummaryLine(value = "") {
  const text = summarizeText(value);
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .find((line) => line && !/^changed:?$/i.test(line) && !/^verified:?$/i.test(line)) || text;
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

async function loadStatus() {
  await loadAgentRunStatus();

  try {
    const status = await controlFetch("/status");
    state.serverOnline = true;
    els.liveCard?.setAttribute("data-anton-server", "online");
    if (els.serverState) {
      els.serverState.textContent = "Online";
    }
    if (els.serverDetail) {
      els.serverDetail.textContent = `Laptop helper connected at ${getControlUrl()}.`;
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
    if (els.publicSummary) {
      els.publicSummary.textContent = summarizeText(status.summary);
    }
    if (els.publicFiles) {
      const files = Array.isArray(status.changedFiles) ? status.changedFiles.filter(Boolean).slice(0, 10) : [];
      els.publicFiles.innerHTML = files.length
        ? files.map((file) => `<li>${file}</li>`).join("")
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
  }
}

async function loadFiles() {
  try {
    const payload = await controlFetch("/files");
    state.files = Array.isArray(payload.files) && payload.files.length ? payload.files : FALLBACK_FILES;
  } catch {
    state.files = FALLBACK_FILES;
  }
  renderTabs();
}

async function loadFile(name = state.selectedFile) {
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

renderTabs();
loadStatus();
loadFiles().then(() => loadFile(state.selectedFile));
setInterval(loadStatus, 30000);
