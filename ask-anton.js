import { searchIndex } from "./search-data.js";

const STORAGE_PREFIX = "ridgeline-ask-anton:";
const SETTINGS_KEY = `${STORAGE_PREFIX}settings`;
const CHAT_KEY = `${STORAGE_PREFIX}chat`;
const LEGACY_SETTINGS_KEY = "ridgeline-ask-anton-settings-v1";
const LEGACY_CHAT_KEY = "ridgeline-ask-anton-chat-v1";
const DEFAULT_ENDPOINT = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_LOCAL_LIMIT = 6;

const els = {
  transcript: document.querySelector("[data-ask-transcript]"),
  form: document.querySelector("[data-ask-form]"),
  input: document.querySelector("[data-ask-input]"),
  submit: document.querySelector("[data-ask-submit]"),
  clear: document.querySelector("[data-ask-clear]"),
  status: document.querySelector("[data-ask-status]"),
  endpoint: document.querySelector("[data-ask-endpoint]"),
  key: document.querySelector("[data-ask-key]"),
  model: document.querySelector("[data-ask-model]"),
  webEnabled: document.querySelector("[data-ask-web-enabled]"),
  localLimit: document.querySelector("[data-ask-local-limit]"),
  settingsForm: document.querySelector("[data-ask-settings-form]"),
  settingsStatus: document.querySelector("[data-ask-settings-status]"),
  sourcesList: document.querySelector("[data-ask-sources-list]"),
  sourceCopy: document.querySelector("[data-ask-source-copy]")
};

const state = {
  messages: loadConversation(),
  settings: loadSettings(),
  busy: false
};

function storageForKey(key) {
  return localStorage;
}

function readStoredJson(key, fallback) {
  try {
    const raw = storageForKey(key).getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredJson(key, value) {
  try {
    storageForKey(key).setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map((message) => {
      const role = message?.role === "user" ? "user" : message?.role === "assistant" ? "assistant" : "";
      const content = typeof message?.content === "string" ? message.content : typeof message?.text === "string" ? message.text : "";
      if (!role || !content.trim()) {
        return null;
      }
      return {
        role,
        content,
        sources: Array.isArray(message.sources) ? message.sources : []
      };
    })
    .filter(Boolean)
    .slice(-24);
}

function loadConversation() {
  const stored = readStoredJson(CHAT_KEY, null);
  const legacy = stored ? null : readStoredJson(LEGACY_CHAT_KEY, null);
  const messages = normalizeMessages(stored || legacy);
  if (!stored && legacy && messages.length) {
    writeStoredJson(CHAT_KEY, messages);
  }
  return messages;
}

function saveConversation() {
  return writeStoredJson(CHAT_KEY, state.messages.slice(-24));
}

function clampLimit(value) {
  return Math.min(12, Math.max(3, Math.round(value || DEFAULT_LOCAL_LIMIT)));
}

function loadSettings() {
  const stored = readStoredJson(SETTINGS_KEY, null);
  const legacy = stored ? null : readStoredJson(LEGACY_SETTINGS_KEY, null);
  const source = stored || legacy || {};
  const settings = {
    endpoint: typeof source.endpoint === "string" && source.endpoint.trim() ? source.endpoint.trim() : DEFAULT_ENDPOINT,
    apiKey: typeof source.apiKey === "string" ? source.apiKey : "",
    model: typeof source.model === "string" && source.model.trim() ? source.model.trim() : DEFAULT_MODEL,
    webEnabled: source.webEnabled !== false,
    localLimit: Number.isFinite(Number(source.localLimit)) ? clampLimit(Number(source.localLimit)) : DEFAULT_LOCAL_LIMIT
  };
  if (!stored && legacy) {
    writeStoredJson(SETTINGS_KEY, settings);
  }
  return settings;
}

function saveSettings() {
  return writeStoredJson(SETTINGS_KEY, state.settings);
}

function setStatus(message, tone = "idle", target = els.status) {
  if (!target) {
    return;
  }
  target.dataset.askStatusTone = tone;
  target.textContent = message;
}

function normalizeText(value = "") {
  return `${value}`.toLowerCase().replace(/[^a-z0-9/]+/g, " ").trim();
}

function tokenize(value = "") {
  return normalizeText(value)
    .split(/\s+/)
    .filter((term) => term.length > 1);
}

function scoreEntry(entry, terms) {
  const haystack = normalizeText([
    entry.title,
    entry.url,
    entry.category,
    entry.excerpt,
    ...(entry.keywords || [])
  ].join(" "));
  let score = 0;

  for (const term of terms) {
    if (!term) {
      continue;
    }
    if (normalizeText(entry.title).includes(term)) {
      score += 12;
    }
    if ((entry.keywords || []).some((keyword) => normalizeText(keyword).includes(term))) {
      score += 8;
    }
    if (haystack.includes(term)) {
      score += term.length > 4 ? 6 : 3;
    }
  }

  return score;
}

function buildLocalMatches(query, limit = DEFAULT_LOCAL_LIMIT) {
  const terms = tokenize(query);
  const ranked = searchIndex
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, terms)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.entry.title.localeCompare(right.entry.title))
    .slice(0, limit)
    .map((item) => item.entry);

  if (ranked.length) {
    return ranked;
  }

  return searchIndex
    .filter((entry) => ["Vehicle Map", "Diagnostic Handoff Builder", "Owner Shortcut Strip", "Emergency Card", "Anton Owner Check"].includes(entry.title))
    .slice(0, limit);
}

function makeAssistantLocalAnswer(query, matches) {
  if (!matches.length) {
    return {
      title: "I could not find a strong local match yet.",
      body:
        "Try a more specific Ridgeline phrase, or jump to Diagnostics, Quick Sheet, or Search so I can anchor the question to a known page.",
      sources: []
    };
  }

  const top = matches[0];
  const routeLines = matches.slice(0, 4).map((entry) => {
      const summary = entry.excerpt || entry.category || "Local site route";
      return `${entry.title} (${entry.url}): ${summary}`;
  });

  return {
    title: `Best local route: ${top.title}`,
    body: [
      top.excerpt || `That question looks closest to ${top.title}.`,
      routeLines.length ? `Open these next: ${routeLines.join(" | ")}.` : "",
      "If you want a broader answer, turn on web search in Settings and add an API key."
    ]
      .filter(Boolean)
      .join(" "),
    sources: matches
  };
}

function formatSources(matches) {
  if (!els.sourcesList) {
    return;
  }

  els.sourcesList.innerHTML = "";

  if (!matches.length) {
    const item = document.createElement("li");
    item.textContent = "No local context selected yet.";
    els.sourcesList.append(item);
    if (els.sourceCopy) {
      els.sourceCopy.textContent = "Ask a question to see which local site entries were used as grounding context.";
    }
    return;
  }

  if (els.sourceCopy) {
    els.sourceCopy.textContent = `Anton grounded this question with ${matches.length} local site route${matches.length === 1 ? "" : "s"}.`;
  }

  matches.forEach((entry) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = entry.url;
    link.textContent = entry.title;
    const text = document.createElement("span");
    text.textContent = ` - ${entry.excerpt || entry.category || entry.url}`;
    item.append(link, text);
    els.sourcesList.append(item);
  });
}

function renderMessage(message) {
  if (!els.transcript) {
    return;
  }

  const article = document.createElement("article");
  article.className = `ask-message ask-message-${message.role}`;

  const heading = document.createElement("h3");
  heading.textContent = message.role === "user" ? "You" : "Anton";

  const body = document.createElement("p");
  body.textContent = message.content;

  article.append(heading, body);

  if (message.role === "assistant" && Array.isArray(message.sources) && message.sources.length) {
    const sourceList = document.createElement("ul");
    sourceList.className = "ask-source-links";
    message.sources.slice(0, 5).forEach((entry) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = entry.url;
      link.textContent = entry.title;
      item.append(link);
      sourceList.append(item);
    });
    article.append(sourceList);
  }

  els.transcript.append(article);
}

function renderTranscript() {
  if (!els.transcript) {
    return;
  }

  els.transcript.innerHTML = "";
  if (!state.messages.length) {
    const intro = document.createElement("article");
    intro.className = "ask-message ask-message-assistant";
    const heading = document.createElement("h3");
    heading.textContent = "Anton";
    const body = document.createElement("p");
    body.textContent = "Ask a question to get local Ridgeline routes now. Add an API key in Settings when you want model answers with optional web search.";
    intro.append(heading, body);
    els.transcript.append(intro);
    return;
  }

  state.messages.forEach(renderMessage);
  els.transcript.scrollTop = els.transcript.scrollHeight;
}

function renderSettings() {
  if (els.endpoint) {
    els.endpoint.value = state.settings.endpoint;
  }
  if (els.key) {
    els.key.value = state.settings.apiKey;
  }
  if (els.model) {
    els.model.value = state.settings.model;
  }
  if (els.webEnabled) {
    els.webEnabled.checked = state.settings.webEnabled;
  }
  if (els.localLimit) {
    els.localLimit.value = `${state.settings.localLimit}`;
  }
}

function collectSettings() {
  return {
    endpoint: els.endpoint?.value.trim() || DEFAULT_ENDPOINT,
    apiKey: els.key?.value.trim() || "",
    model: els.model?.value.trim() || DEFAULT_MODEL,
    webEnabled: Boolean(els.webEnabled?.checked),
    localLimit: clampLimit(Number(els.localLimit?.value || DEFAULT_LOCAL_LIMIT))
  };
}

function buildModelInput(query, localMatches) {
  const localContext = localMatches
    .map((entry, index) => {
      const summary = entry.excerpt || entry.category || "Local site route";
      return `${index + 1}. ${entry.title} (${entry.url}) - ${summary}`;
    })
    .join("\n");

  return [
    "You are Anton, an assistant for the Ridgeline service site.",
    "Use Ridgeline site context first. If the user asks for broader current knowledge, use web search when available.",
    "Do not invent vehicle facts. If the answer depends on a label, manual, or exact truck configuration, say so.",
    "Keep the answer concise and practical for an iPhone screen.",
    localContext ? `Local Ridgeline context:\n${localContext}` : "No strong local site match was found.",
    `Question: ${query}`
  ].join("\n\n");
}

function extractResponseText(payload) {
  if (!payload) {
    return "";
  }

  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (Array.isArray(payload.output)) {
    const segments = [];
    for (const item of payload.output) {
      if (item?.type === "message" && Array.isArray(item.content)) {
        for (const content of item.content) {
          if (typeof content?.text === "string") {
            segments.push(content.text);
          }
        }
      }
    }
    const text = segments.join("\n").trim();
    if (text) {
      return text;
    }
  }

  return "";
}

async function requestModelAnswer(query, localMatches) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${state.settings.apiKey}`
  };

  const basePayload = {
    model: state.settings.model,
    input: buildModelInput(query, localMatches)
  };

  const payload = state.settings.webEnabled
    ? {
        ...basePayload,
        tools: [{ type: "web_search" }]
      }
    : basePayload;

  let response = await fetch(state.settings.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok && state.settings.webEnabled) {
    response = await fetch(state.settings.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(basePayload)
    });
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Model request failed with ${response.status}`);
  }

  const data = await response.json();
  const text = extractResponseText(data);
  if (!text) {
    throw new Error("The model returned no text.");
  }

  return text;
}

function pushMessage(role, content, extra = {}) {
  state.messages.push({ role, content, ...extra });
  const saved = saveConversation();
  renderTranscript();
  if (!saved) {
    setStatus("Answer shown, but Safari storage did not save this chat.", "warn");
  }
}

function updateGrounding(query) {
  const matches = buildLocalMatches(query, state.settings.localLimit);
  formatSources(matches);
  return matches;
}

async function handleQuestionSubmit(event) {
  event.preventDefault();
  if (state.busy) {
    return;
  }

  const query = els.input?.value.trim();
  if (!query) {
    setStatus("Type a question first.", "warn");
    return;
  }

  state.settings = collectSettings();
  saveSettings();

  const localMatches = updateGrounding(query);
  pushMessage("user", query);

  state.busy = true;
  if (els.submit) {
    els.submit.disabled = true;
  }
  setStatus(
    state.settings.apiKey
      ? state.settings.webEnabled
        ? "Asking Anton with web search enabled..."
        : "Asking Anton with the API..."
      : "Answering from local Ridgeline routes only.",
    "busy"
  );

  try {
    if (state.settings.apiKey) {
      const answerText = await requestModelAnswer(query, localMatches);
      pushMessage("assistant", answerText, { sources: localMatches });
      setStatus(state.settings.webEnabled ? "Answered with the model and web search enabled." : "Answered with the model and local Ridgeline context.", "success");
    } else {
      const localAnswer = makeAssistantLocalAnswer(query, localMatches);
      pushMessage("assistant", `${localAnswer.title}\n\n${localAnswer.body}`, { sources: localAnswer.sources });
      setStatus("Local answer only. Add an API key in Settings for model-backed answers.", "info");
    }
  } catch (error) {
    const localAnswer = makeAssistantLocalAnswer(query, localMatches);
    pushMessage("assistant", `${localAnswer.title}\n\n${localAnswer.body}`, { sources: localAnswer.sources });
    setStatus(`Model request failed, so Anton fell back to local routes: ${error.message}`, "warn");
  } finally {
    state.busy = false;
    if (els.submit) {
      els.submit.disabled = false;
    }
    if (els.input) {
      els.input.focus();
    }
  }
}

function clearChat() {
  state.messages = [];
  saveConversation();
  renderTranscript();
  formatSources([]);
  setStatus("Chat cleared.", "info");
}

function saveSettingsFromForm(event) {
  event.preventDefault();
  state.settings = collectSettings();
  const saved = saveSettings();
  setStatus(
    saved ? "Saved settings in this browser." : "Settings could not be saved in this browser.",
    saved ? "success" : "warn",
    els.settingsStatus
  );
}

function attachQuickPrompts() {
  document.querySelectorAll("[data-ask-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      if (els.input) {
        els.input.value = button.dataset.askPrompt || "";
        els.input.focus();
      }
    });
  });
}

function syncInitialUi() {
  renderSettings();
  renderTranscript();
  formatSources([]);
  setStatus("Ready. Use local site routes first, then add an API key for model answers with internet search.", "info");
}

els.form?.addEventListener("submit", handleQuestionSubmit);
els.clear?.addEventListener("click", clearChat);
els.settingsForm?.addEventListener("submit", saveSettingsFromForm);
attachQuickPrompts();
syncInitialUi();
