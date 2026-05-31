import { searchIndex } from "./search-data.js";

const SETTINGS_KEY = "ridgeline-ask-anton-settings-v1";
const CHAT_KEY = "ridgeline-ask-anton-chat-v1";

const DEFAULT_SETTINGS = {
  endpoint: "https://api.openai.com/v1/responses",
  apiKey: "",
  model: "gpt-4.1",
  webEnabled: true,
  localLimit: 6
};

const state = {
  settings: loadSettings(),
  messages: loadMessages(),
  pageSnippetCache: new Map(),
  lastLocalContext: []
};

const els = {
  form: document.querySelector("[data-ask-form]"),
  input: document.querySelector("[data-ask-input]"),
  submit: document.querySelector("[data-ask-submit]"),
  clear: document.querySelector("[data-ask-clear]"),
  transcript: document.querySelector("[data-ask-transcript]"),
  status: document.querySelector("[data-ask-status]"),
  settingsForm: document.querySelector("[data-ask-settings-form]"),
  endpoint: document.querySelector("[data-ask-endpoint]"),
  key: document.querySelector("[data-ask-key]"),
  model: document.querySelector("[data-ask-model]"),
  webEnabled: document.querySelector("[data-ask-web-enabled]"),
  localLimit: document.querySelector("[data-ask-local-limit]"),
  settingsStatus: document.querySelector("[data-ask-settings-status]"),
  sourceCopy: document.querySelector("[data-ask-source-copy]"),
  sourceList: document.querySelector("[data-ask-sources-list]"),
  promptButtons: [...document.querySelectorAll("[data-ask-prompt]")]
};

hydrateSettingsUi();
renderMessages();
bindEvents();

function bindEvents() {
  els.form?.addEventListener("submit", handleAskSubmit);
  els.clear?.addEventListener("click", clearChat);
  els.settingsForm?.addEventListener("submit", handleSettingsSubmit);
  els.promptButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const prompt = `${button.dataset.askPrompt || ""}`.trim();
      if (!prompt) {
        return;
      }
      if (els.input) {
        els.input.value = prompt;
        els.input.focus();
      }
    });
  });
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = JSON.parse(raw);
    return {
      endpoint: typeof parsed.endpoint === "string" && parsed.endpoint.trim() ? parsed.endpoint.trim() : DEFAULT_SETTINGS.endpoint,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey.trim() : "",
      model: typeof parsed.model === "string" && parsed.model.trim() ? parsed.model.trim() : DEFAULT_SETTINGS.model,
      webEnabled: parsed.webEnabled !== false,
      localLimit: clampLocalLimit(parsed.localLimit)
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function loadMessages() {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.text === "string")
      .slice(-12);
  } catch {
    return [];
  }
}

function saveState() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  localStorage.setItem(CHAT_KEY, JSON.stringify(state.messages.slice(-12)));
}

function clampLocalLimit(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return DEFAULT_SETTINGS.localLimit;
  }
  return Math.max(3, Math.min(12, Math.round(number)));
}

function hydrateSettingsUi() {
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
    els.webEnabled.checked = Boolean(state.settings.webEnabled);
  }
  if (els.localLimit) {
    els.localLimit.value = String(state.settings.localLimit);
  }
}

function handleSettingsSubmit(event) {
  event.preventDefault();
  state.settings = {
    endpoint: (els.endpoint?.value || DEFAULT_SETTINGS.endpoint).trim() || DEFAULT_SETTINGS.endpoint,
    apiKey: (els.key?.value || "").trim(),
    model: (els.model?.value || DEFAULT_SETTINGS.model).trim() || DEFAULT_SETTINGS.model,
    webEnabled: Boolean(els.webEnabled?.checked),
    localLimit: clampLocalLimit(els.localLimit?.value)
  };
  saveState();
  setSettingsStatus("Settings saved on this device.");
}

function setSettingsStatus(message = "") {
  if (els.settingsStatus) {
    els.settingsStatus.textContent = message;
  }
}

function setStatus(message = "") {
  if (els.status) {
    els.status.textContent = message;
  }
}

function clearChat() {
  state.messages = [];
  saveState();
  renderMessages();
  setStatus("Chat cleared.");
}

function renderMessages() {
  if (!els.transcript) {
    return;
  }

  if (!state.messages.length) {
    els.transcript.innerHTML = `
      <article class="ask-message ask-message-assistant">
        <h3>Anton</h3>
        <p>Enter your API key in Settings, ask a question, and I will ground the answer with this site plus optional web results.</p>
      </article>
    `;
    return;
  }

  els.transcript.innerHTML = state.messages.map((message) => renderMessageMarkup(message)).join("");
  els.transcript.scrollTop = els.transcript.scrollHeight;
}

function renderMessageMarkup(message) {
  const role = message.role === "user" ? "user" : "assistant";
  const title = role === "user" ? "You" : "Anton";
  const paragraphs = splitParagraphs(message.text)
    .map((line) => `<p>${linkifyText(escapeHtml(line))}</p>`)
    .join("");

  const citations = Array.isArray(message.citations) && message.citations.length
    ? `<ul class="ask-message-citations">${message.citations
        .map((citation) => `<li><a href="${escapeHtml(citation.url)}" target="_blank" rel="noreferrer">${escapeHtml(citation.title || citation.url)}</a></li>`)
        .join("")}</ul>`
    : "";

  return `
    <article class="ask-message ask-message-${role}">
      <h3>${title}</h3>
      ${paragraphs}
      ${citations}
    </article>
  `;
}

function splitParagraphs(value = "") {
  const clean = `${value}`.trim();
  if (!clean) {
    return ["No response text returned."];
  }
  return clean.split(/\n\s*\n/g).map((line) => line.trim()).filter(Boolean);
}

function escapeHtml(value = "") {
  return `${value}`.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function linkifyText(value = "") {
  return value.replace(/(https?:\/\/[^\s)]+)/gi, (url) => {
    return `<a href="${url}" target="_blank" rel="noreferrer">${url}</a>`;
  });
}

async function handleAskSubmit(event) {
  event.preventDefault();
  const question = `${els.input?.value || ""}`.trim();

  if (!question) {
    setStatus("Enter a question first.");
    return;
  }

  if (!state.settings.apiKey) {
    setStatus("Save an API key in Settings first.");
    return;
  }

  const localContext = await buildLocalContext(question, state.settings.localLimit);
  state.lastLocalContext = localContext.entries;
  renderSourcePanel(localContext.entries, state.settings.webEnabled);

  state.messages.push({ role: "user", text: question });
  renderMessages();
  setStatus("Asking Anton...");
  setBusy(true);

  try {
    const response = await askModel(question, localContext);
    state.messages.push({
      role: "assistant",
      text: response.text,
      citations: response.citations
    });
    saveState();
    renderMessages();
    setStatus(state.settings.webEnabled ? "Answer ready. Web search was enabled." : "Answer ready.");
    if (els.input) {
      els.input.value = "";
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Request failed.");
  } finally {
    setBusy(false);
  }
}

function setBusy(isBusy) {
  if (els.submit) {
    els.submit.disabled = isBusy;
    els.submit.textContent = isBusy ? "Thinking..." : "Ask Anton";
  }
  if (els.input) {
    els.input.disabled = isBusy;
  }
}

function tokenize(value = "") {
  return `${value}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function scoreEntry(entry, tokens) {
  const title = `${entry.title || ""}`.toLowerCase();
  const excerpt = `${entry.excerpt || ""}`.toLowerCase();
  const category = `${entry.category || ""}`.toLowerCase();
  const url = `${entry.url || ""}`.toLowerCase();
  const keywords = Array.isArray(entry.keywords) ? entry.keywords.map((keyword) => `${keyword}`.toLowerCase()) : [];

  let score = 0;
  for (const token of tokens) {
    if (title.includes(token)) score += 8;
    if (excerpt.includes(token)) score += 5;
    if (category.includes(token)) score += 3;
    if (url.includes(token)) score += 2;
    for (const keyword of keywords) {
      if (keyword.includes(token)) {
        score += 4;
      }
    }
  }

  if (tokens.length && score === 0) {
    return 0;
  }

  if (/fuse|electrical|12v|outlet|radio/.test(tokens.join(" ")) && /fuse|electrical/.test(`${title} ${excerpt} ${keywords.join(" ")}`)) {
    score += 6;
  }

  return score;
}

async function buildLocalContext(question, limit) {
  const tokens = tokenize(question);
  const scored = searchIndex
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, tokens)
    }))
    .sort((a, b) => b.score - a.score);

  const picked = scored
    .filter((item) => item.score > 0)
    .slice(0, limit)
    .map((item) => item.entry);

  const fallback = searchIndex.slice(0, Math.max(3, limit));
  const entries = picked.length ? picked : fallback;

  const uniquePageUrls = [...new Set(entries.map((entry) => normalizePageUrl(entry.url)).filter(Boolean))].slice(0, 3);
  const pageSnippets = [];
  for (const pageUrl of uniquePageUrls) {
    const snippet = await fetchPageSnippet(pageUrl);
    if (snippet) {
      pageSnippets.push(snippet);
    }
  }

  return { entries, pageSnippets };
}

function normalizePageUrl(value = "") {
  const clean = `${value}`.trim();
  if (!clean) {
    return "";
  }
  const noHash = clean.split("#")[0].split("?")[0];
  return noHash || "";
}

async function fetchPageSnippet(pageUrl) {
  if (state.pageSnippetCache.has(pageUrl)) {
    return state.pageSnippetCache.get(pageUrl);
  }

  try {
    const response = await fetch(pageUrl, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const title = doc.querySelector("title")?.textContent?.trim() || pageUrl;
    const parts = [
      ...doc.querySelectorAll("main h1, main h2, main h3, main p, main li")
    ]
      .map((node) => node.textContent?.trim() || "")
      .filter(Boolean)
      .slice(0, 28);

    const snippet = {
      pageUrl,
      title,
      text: parts.join(" ").replace(/\s+/g, " ").slice(0, 1300)
    };
    state.pageSnippetCache.set(pageUrl, snippet);
    return snippet;
  } catch {
    return null;
  }
}

function renderSourcePanel(entries = [], webEnabled = false) {
  if (!els.sourceList || !els.sourceCopy) {
    return;
  }

  if (!entries.length) {
    els.sourceCopy.textContent = "No local context selected yet.";
    els.sourceList.innerHTML = "<li>No local context selected yet.</li>";
    return;
  }

  els.sourceCopy.textContent = webEnabled
    ? `Using ${entries.length} local site entries plus optional live web search.`
    : `Using ${entries.length} local site entries only.`;

  els.sourceList.innerHTML = entries
    .map((entry) => {
      const excerpt = entry.excerpt || "No excerpt available for this item.";
      return `
        <li>
          <a href="${escapeHtml(entry.url)}">${escapeHtml(entry.title || entry.url)}</a>
          <p>${escapeHtml(excerpt)}</p>
        </li>
      `;
    })
    .join("");
}

function buildSystemPrompt(settings) {
  const webRule = settings.webEnabled
    ? "You can use web search results for additional context when needed."
    : "Do not use internet sources in this response.";

  return [
    "You are Anton, a Ridgeline service assistant for a 2019 Honda Ridgeline owner reference site.",
    "Prioritize local Ridgeline context first, then supplement with reputable web sources if needed.",
    webRule,
    "If a question involves safety-critical repair facts, advise verifying with truck labels and official owner manual.",
    "Prefer concise practical answers with clear next steps.",
    "When citing pages from local context, include their relative URL in plain text."
  ].join("\n");
}

function buildUserPrompt(question, localContext) {
  const entryText = localContext.entries
    .map((entry, index) => {
      const keywords = Array.isArray(entry.keywords) ? entry.keywords.slice(0, 10).join(", ") : "";
      return [
        `${index + 1}. ${entry.title || "Untitled"}`,
        `URL: ${entry.url}`,
        `Category: ${entry.category || "Unknown"}`,
        `Excerpt: ${entry.excerpt || "None"}`,
        `Keywords: ${keywords}`
      ].join("\n");
    })
    .join("\n\n");

  const pageText = localContext.pageSnippets
    .map((snippet, index) => {
      return [
        `Page ${index + 1}: ${snippet.title}`,
        `URL: ${snippet.pageUrl}`,
        `Snippet: ${snippet.text}`
      ].join("\n");
    })
    .join("\n\n");

  return [
    `User question: ${question}`,
    "",
    "Local Ridgeline index matches:",
    entryText || "No index matches.",
    "",
    "Local page snippets:",
    pageText || "No page snippets captured.",
    "",
    "Answer format:",
    "1) Direct answer.",
    "2) Next Ridgeline pages to open (include relative URLs).",
    "3) Quick caution if safety-critical."
  ].join("\n");
}

async function askModel(question, localContext) {
  const history = state.messages.slice(-6).map((message) => ({
    role: message.role,
    content: [{ type: "input_text", text: message.text }]
  }));

  const body = {
    model: state.settings.model,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: buildSystemPrompt(state.settings) }]
      },
      ...history,
      {
        role: "user",
        content: [{ type: "input_text", text: buildUserPrompt(question, localContext) }]
      }
    ]
  };

  if (state.settings.webEnabled) {
    body.tools = [{ type: "web_search_preview" }];
  }

  const response = await fetch(state.settings.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.settings.apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    const compact = `${errorText}`.replace(/\s+/g, " ").slice(0, 220);
    throw new Error(`Model request failed (${response.status}): ${compact || response.statusText}`);
  }

  const data = await response.json();
  return extractModelResult(data);
}

function extractModelResult(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return {
      text: data.output_text.trim(),
      citations: extractCitations(data)
    };
  }

  const textParts = [];
  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    if (item?.type !== "message" || !Array.isArray(item.content)) {
      continue;
    }
    for (const block of item.content) {
      if (block?.type === "output_text" && typeof block.text === "string") {
        textParts.push(block.text);
      }
      if (block?.type === "text" && typeof block.text === "string") {
        textParts.push(block.text);
      }
    }
  }

  return {
    text: textParts.join("\n\n").trim() || "No text response returned by the model.",
    citations: extractCitations(data)
  };
}

function extractCitations(data) {
  const seen = new Set();
  const citations = [];
  const output = Array.isArray(data.output) ? data.output : [];

  for (const item of output) {
    if (!Array.isArray(item?.content)) {
      continue;
    }
    for (const block of item.content) {
      const annotations = Array.isArray(block?.annotations) ? block.annotations : [];
      for (const annotation of annotations) {
        const url = annotation?.url;
        if (!url || seen.has(url)) {
          continue;
        }
        seen.add(url);
        citations.push({
          url,
          title: annotation.title || annotation.source_title || url
        });
      }
    }
  }

  return citations.slice(0, 8);
}