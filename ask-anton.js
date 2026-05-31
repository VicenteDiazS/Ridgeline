import { searchIndex } from "./search-data.js";

const STORAGE_PREFIX = "ridgeline-ask-anton:";
const SETTINGS_KEY = `${STORAGE_PREFIX}settings`;
const CHAT_KEY = `${STORAGE_PREFIX}chat`;
const THREAD_KEY = `${STORAGE_PREFIX}thread`;
const LEGACY_SETTINGS_KEY = "ridgeline-ask-anton-settings-v1";
const LEGACY_CHAT_KEY = "ridgeline-ask-anton-chat-v1";
const DEFAULT_ENDPOINT = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_LOCAL_LIMIT = 6;
const MAX_WEB_CITATIONS = 3;
const GARAGE_NOTES_STORAGE_KEY = "ridgeline-notes";

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
  webThis: document.querySelector("[data-ask-web-this]"),
  inlineMode: document.querySelector("[data-ask-inline-mode]"),
  localLimit: document.querySelector("[data-ask-local-limit]"),
  defaultMode: document.querySelector("[data-ask-default-mode]"),
  citationQuality: document.querySelector("[data-ask-citation-quality]"),
  settingsForm: document.querySelector("[data-ask-settings-form]"),
  settingsStatus: document.querySelector("[data-ask-settings-status]"),
  sourcesList: document.querySelector("[data-ask-sources-list]"),
  sourceCopy: document.querySelector("[data-ask-source-copy]"),
  voice: document.querySelector("[data-ask-voice]"),
  copyLast: document.querySelector("[data-ask-copy-last]"),
  saveLastGarage: document.querySelector("[data-ask-save-last-garage]"),
  threadSummary: document.querySelector("[data-ask-thread-summary]"),
  threadList: document.querySelector("[data-ask-thread-list]"),
  clearThread: document.querySelector("[data-ask-clear-thread]")
};

const defaultIntent = {
  id: "general",
  label: "General",
  actions: [
    { label: "Vehicle Map", href: "index.html#viewer" },
    { label: "Diagnostics", href: "diagnostics.html#workflow-index" },
    { label: "Emergency Card", href: "quick-sheet.html#emergency-card" }
  ],
  plan: {
    now: ["Start with the most specific symptom or goal."],
    next: ["Open the best local route and save a short note."],
    stop: ["For safety-critical choices, verify with truck labels/manual."]
  }
};

const state = {
  messages: loadConversation(),
  settings: loadSettings(),
  thread: loadThread(),
  busy: false,
  recognition: null,
  listening: false
};

const intentMap = {
  noStart: {
    label: "No-Start",
    patterns: [/no\s*start|won\s*t\s*start|click|crank|battery|jump/i],
    actions: [
      { label: "No-Start Workflow", href: "diagnostics.html#no-start-workflow" },
      { label: "Jump Notes", href: "hood.html#wiring" },
      { label: "Roadside Stack", href: "quick-sheet.html#roadside-action-stack" }
    ],
    plan: {
      now: ["Classify symptom: no-crank, slow-crank, or normal-crank/no-start.", "Record dash behavior before retries."],
      next: ["Open no-start workflow and jump references.", "Save a short handoff note for repeated symptoms."],
      stop: ["Do not keep repeated long cranking attempts.", "Use truck labels/owner manual as final authority."]
    },
    tree: {
      question: "Which no-start pattern do you have right now?",
      options: [
        "No crank, only clicks",
        "Slow crank",
        "Cranks but does not fire"
      ]
    }
  },
  warning: {
    label: "Warning Light",
    patterns: [/warning|check\s*engine|tpms|abs|dash\s*light|indicator|mid/i],
    actions: [
      { label: "Warning Workflow", href: "diagnostics.html#warning-light-workflow" },
      { label: "Diagnostic Share", href: "diagnostics.html#diagnostic-share-builder" },
      { label: "Garage Warning Note", href: "garage.html#warning-light-template" }
    ],
    plan: {
      now: ["Capture exact color/text before ignition cycle changes it.", "Note recent service or weather context."],
      next: ["Route through warning workflow.", "Create a diagnostic handoff note for shop/tow calls."],
      stop: ["Do not ignore red warnings.", "Confirm with owner manual and active warning state."]
    },
    tree: {
      question: "Which warning behavior matches now?",
      options: ["Red warning", "Amber warning", "Multiple lights together"]
    }
  },
  trailer: {
    label: "Trailer Lights",
    patterns: [/trailer|hitch|7\s*way|brake\s*light|turn\s*signal/i],
    actions: [
      { label: "Trailer-Light Workflow", href: "diagnostics.html#trailer-light-workflow" },
      { label: "Pinout", href: "rear-hitch.html#pinout" },
      { label: "Hookup Flow", href: "rear-hitch.html#trailer-hookup-flow" }
    ],
    plan: {
      now: ["Identify exactly which light function fails.", "Check connector seating and adapter state."],
      next: ["Follow trailer-light workflow and pinout path.", "Log a handoff note if intermittent."],
      stop: ["Do not merge AC outlet and 12V fuse paths.", "Verify against truck/manual before rewiring." ]
    },
    tree: {
      question: "Which trailer-light function is failing?",
      options: ["Brake", "Left/Right turn", "Running lights", "Reverse"]
    }
  },
  electrical: {
    label: "Electrical",
    patterns: [/fuse|outlet|radio|screen|12v|power/i],
    actions: [
      { label: "Fuse Symptom Finder", href: "diagnostics.html#fuse-symptom-finder" },
      { label: "Hood Fuses", href: "hood.html#fuses" },
      { label: "Cabin Fuses", href: "cabin.html#fuses" }
    ],
    plan: {
      now: ["Describe the failed feature before choosing a fuse.", "Check if multiple accessories failed together."],
      next: ["Use symptom-first fuse route.", "Record label text before pulling any fuse."],
      stop: ["Do not swap unknown fuse ratings.", "Use truck cover labels/manual as final authority."]
    },
    tree: {
      question: "Which electrical symptom is closest?",
      options: ["Outlet dead", "Radio/display dead", "Multiple cabin accessories dead"]
    }
  },
  maintenance: {
    label: "Maintenance",
    patterns: [/maintenance|service|oil|fluid|minder|interval/i],
    actions: [
      { label: "Service Closeout", href: "maintenance.html#service-closeout" },
      { label: "Service Prep", href: "maintenance.html#service-prep" },
      { label: "Garage Fill-In", href: "garage.html#garage-fill-in-checklist" }
    ],
    plan: {
      now: ["Capture mileage, date, and what was done.", "List parts/fluids used."],
      next: ["Use closeout form and save to Garage notes.", "Set follow-up checks in planner."],
      stop: ["Do not assume fitment from unsourced lists.", "Confirm specs from manual/truck labels."]
    }
  },
  parts: {
    label: "Parts",
    patterns: [/part|sku|buy|purchase|brand|fitment|rockauto/i],
    actions: [
      { label: "Garage Staging", href: "garage.html#maintenance-note-preview" },
      { label: "Truck Profile Notes", href: "garage.html#truck-profile" },
      { label: "Maintenance Prep", href: "maintenance.html#service-prep" }
    ],
    plan: {
      now: ["Describe job and exact symptom before choosing parts.", "Separate consumables from fitment-critical parts."],
      next: ["Use Garage staging and save candidate list.", "Finalize only verified part numbers."],
      stop: ["Never treat forum/vendor listings as final fitment authority.", "Confirm part number against catalog + truck/manual."]
    }
  }
};

function readStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function clampLimit(value) {
  return Math.min(12, Math.max(3, Math.round(value || DEFAULT_LOCAL_LIMIT)));
}

function normalizeText(value = "") {
  return `${value}`.toLowerCase().replace(/[^a-z0-9/]+/g, " ").trim();
}

function tokenize(value = "") {
  return normalizeText(value)
    .split(/\s+/)
    .filter((term) => term.length > 1);
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map((message) => {
      const role = message?.role === "user" ? "user" : message?.role === "assistant" ? "assistant" : "";
      const content = typeof message?.content === "string" ? message.content : "";
      if (!role || !content.trim()) {
        return null;
      }
      return {
        role,
        content,
        sources: Array.isArray(message.sources) ? message.sources : [],
        citations: Array.isArray(message.citations) ? message.citations : [],
        intent: message.intent || defaultIntent,
        confidence: message.confidence || null,
        plan: message.plan || null,
        decisionTree: message.decisionTree || null,
        actions: Array.isArray(message.actions) ? message.actions : [],
        handoff: typeof message.handoff === "string" ? message.handoff : "",
        partsGuardrail: typeof message.partsGuardrail === "string" ? message.partsGuardrail : ""
      };
    })
    .filter(Boolean)
    .slice(-24);
}

function loadConversation() {
  const stored = readStoredJson(CHAT_KEY, null);
  const legacy = stored ? null : readStoredJson(LEGACY_CHAT_KEY, null);
  const normalized = normalizeMessages(stored || legacy);
  if (!stored && legacy && normalized.length) {
    writeStoredJson(CHAT_KEY, normalized);
  }
  return normalized;
}

function saveConversation() {
  return writeStoredJson(CHAT_KEY, state.messages.slice(-24));
}

function loadSettings() {
  const stored = readStoredJson(SETTINGS_KEY, null);
  const legacy = stored ? null : readStoredJson(LEGACY_SETTINGS_KEY, null);
  const source = stored || legacy || {};
  const settings = {
    endpoint: typeof source.endpoint === "string" && source.endpoint.trim() ? source.endpoint.trim() : DEFAULT_ENDPOINT,
    apiKey: typeof source.apiKey === "string" ? source.apiKey : "",
    model: typeof source.model === "string" && source.model.trim() ? source.model.trim() : DEFAULT_MODEL,
    webEnabled: source.webEnabled === true,
    localLimit: Number.isFinite(Number(source.localLimit)) ? clampLimit(Number(source.localLimit)) : DEFAULT_LOCAL_LIMIT,
    defaultMode: source.defaultMode === "deep" ? "deep" : "quick",
    citationQuality: source.citationQuality === "all" ? "all" : "high"
  };
  if (!stored && legacy) {
    writeStoredJson(SETTINGS_KEY, settings);
  }
  return settings;
}

function saveSettings() {
  return writeStoredJson(SETTINGS_KEY, state.settings);
}

function loadThread() {
  const stored = readStoredJson(THREAD_KEY, []);
  return Array.isArray(stored) ? stored.filter((item) => typeof item === "string" && item.trim()).slice(-8) : [];
}

function saveThread() {
  return writeStoredJson(THREAD_KEY, state.thread.slice(-8));
}

function setStatus(message, tone = "idle", target = els.status) {
  if (!target) {
    return;
  }
  target.dataset.askStatusTone = tone;
  target.textContent = message;
}

function detectIntent(query = "") {
  const normalized = normalizeText(query);
  for (const [id, intent] of Object.entries(intentMap)) {
    if (intent.patterns.some((pattern) => pattern.test(normalized))) {
      return {
        id,
        label: intent.label,
        actions: intent.actions,
        plan: intent.plan,
        decisionTree: intent.tree || null
      };
    }
  }

  return {
    ...defaultIntent,
    decisionTree: null
  };
}

function isPartsIntent(query = "", intent = null) {
  if (intent?.id === "parts") {
    return true;
  }
  return /\b(part|sku|fitment|buy|purchase|brand|oem)\b/i.test(query);
}

function buildPartsGuardrail() {
  return "Parts guardrail: candidate parts are planning hints only. Verify fitment/part numbers against your catalog, truck labels, and owner documentation before purchase or install.";
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
    .filter((entry) => ["Vehicle Map", "Diagnostic Handoff Builder", "Emergency Card", "Garage Recent Handoffs"].includes(entry.title))
    .slice(0, limit);
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
    const summary = document.createElement("span");
    summary.textContent = ` - ${entry.excerpt || entry.category || entry.url}`;
    item.append(link, summary);
    els.sourcesList.append(item);
  });
}

function updateThreadMemory(query, intentLabel) {
  const line = `${intentLabel}: ${query}`;
  state.thread.push(line);
  state.thread = state.thread.slice(-8);
  saveThread();
  renderThreadMemory();
}

function renderThreadMemory() {
  if (!els.threadList || !els.threadSummary) {
    return;
  }

  els.threadList.innerHTML = "";
  if (!state.thread.length) {
    const item = document.createElement("li");
    item.textContent = "No follow-up turns yet.";
    els.threadList.append(item);
    els.threadSummary.textContent = "No follow-up context yet. Ask a question and Anton will keep a short memory thread for next steps.";
    return;
  }

  state.thread.slice(-6).forEach((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    els.threadList.append(item);
  });

  els.threadSummary.textContent = `Thread memory active: ${state.thread.length} follow-up turn${state.thread.length === 1 ? "" : "s"} retained locally.`;
}

function confidenceForResponse(localMatches, usedWebSearch, citations, intentId = "general") {
  const localScore = Math.min(95, 35 + localMatches.length * 12);
  const webScore = usedWebSearch ? Math.min(90, 45 + citations.length * 12) : 0;
  const safety = ["warning", "electrical", "noStart", "trailer"].includes(intentId)
    ? "Safety-critical: verify against truck labels/manual."
    : "Operational guidance: verify final specs before action.";

  return {
    local: localScore,
    web: webScore,
    safety
  };
}

function buildStructuredPlan(intent, localMatches) {
  const basePlan = intent?.plan || defaultIntent.plan;
  const bestRoute = localMatches[0]?.title || "best local route";
  return {
    now: [...(basePlan.now || []), `Use ${bestRoute} as your first route.`].slice(0, 3),
    next: (basePlan.next || []).slice(0, 3),
    stop: (basePlan.stop || []).slice(0, 3)
  };
}

function buildHandoffText(query, intent, plan, answerText) {
  const now = Array.isArray(plan?.now) ? plan.now.join("; ") : "No immediate steps listed.";
  const next = Array.isArray(plan?.next) ? plan.next.join("; ") : "No next steps listed.";
  return [
    `[${new Date().toLocaleString()} - Ask Anton Handoff]`,
    `Intent: ${intent?.label || "General"}`,
    `Question: ${query}`,
    `Immediate: ${now}`,
    `Next: ${next}`,
    `Summary: ${answerText}`,
    "Authority reminder: confirm safety-critical actions with truck labels and owner documentation."
  ].join("\n");
}

function normalizeUrl(value = "") {
  const url = `${value}`.trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

function citationQuality(url = "") {
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();

  if (!host) {
    return "low";
  }

  if (host.includes("honda") || host.endsWith(".gov") || host.includes("nhtsa") || host.includes("carmanualsonline")) {
    return "high";
  }

  if (host.includes("ownersclub") || host.includes("forum") || host.includes("reddit")) {
    return "medium";
  }

  return "low";
}

function collectCitations(payload) {
  if (!payload || !Array.isArray(payload.output)) {
    return [];
  }

  const seen = new Set();
  const citations = [];

  const addCitation = (title, url) => {
    const normalized = normalizeUrl(url);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    citations.push({
      title: `${title || ""}`.trim() || normalized,
      url: normalized,
      quality: citationQuality(normalized)
    });
  };

  payload.output.forEach((item) => {
    if (Array.isArray(item?.content)) {
      item.content.forEach((content) => {
        if (Array.isArray(content?.annotations)) {
          content.annotations.forEach((annotation) => {
            addCitation(
              annotation?.title || annotation?.source || annotation?.domain || "Web Source",
              annotation?.url || annotation?.source_url || annotation?.uri
            );
          });
        }
      });
    }
    if (Array.isArray(item?.results)) {
      item.results.forEach((result) => {
        addCitation(result?.title || result?.name || "Web Source", result?.url || result?.link);
      });
    }
  });

  const filtered = state.settings.citationQuality === "high"
    ? citations.filter((citation) => citation.quality === "high")
    : citations;

  return filtered.slice(0, MAX_WEB_CITATIONS);
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
    payload.output.forEach((item) => {
      if (item?.type === "message" && Array.isArray(item.content)) {
        item.content.forEach((content) => {
          if (typeof content?.text === "string") {
            segments.push(content.text);
          }
        });
      }
    });
    const text = segments.join("\n").trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function shouldUseWebSearch(query = "", forceWeb = false) {
  if (forceWeb) {
    return true;
  }
  const normalized = normalizeText(query);
  if (!normalized) {
    return false;
  }
  const signals = [
    "latest",
    "current",
    "recent",
    "recall",
    "tsb",
    "bulletin",
    "nhtsa",
    "news",
    "outside site",
    "internet",
    "online"
  ];
  return signals.some((signal) => normalized.includes(signal));
}

function buildModelInput(query, localMatches, mode = "quick") {
  const localContext = localMatches
    .slice(0, 4)
    .map((entry, index) => `${index + 1}. ${entry.title} (${entry.url}) - ${entry.excerpt || entry.category || "Local route"}`)
    .join("\n");

  const threadContext = state.thread.slice(-4).map((line, index) => `${index + 1}. ${line}`).join("\n");

  return [
    "You are Anton for the Ridgeline service site.",
    mode === "deep"
      ? "Deep mode: provide concise but complete reasoning and alternatives."
      : "Quick mode: provide a short direct answer first, then minimal next steps.",
    "Always prioritize local Ridgeline context. Use web context only when available and needed.",
    "For safety-critical instructions, include a verification reminder.",
    localContext ? `Local context:\n${localContext}` : "No strong local context.",
    threadContext ? `Recent follow-up thread:\n${threadContext}` : "No follow-up thread.",
    `Question: ${query}`
  ].join("\n\n");
}

async function requestModelAnswer(query, localMatches, options) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${state.settings.apiKey}`
  };

  const useWebSearch = shouldUseWebSearch(query, options.forceWeb) && (state.settings.webEnabled || options.forceWeb);

  const basePayload = {
    model: state.settings.model,
    input: buildModelInput(query, localMatches, options.mode)
  };

  const attemptPayloads = useWebSearch
    ? [
        { ...basePayload, tools: [{ type: "web_search_preview" }] },
        { ...basePayload, tools: [{ type: "web_search" }] },
        basePayload
      ]
    : [basePayload];

  let response = null;
  for (const payload of attemptPayloads) {
    response = await fetch(state.settings.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      break;
    }
  }

  if (!response || !response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Model request failed with ${response?.status || "unknown"}`);
  }

  const data = await response.json();
  const text = extractResponseText(data);
  if (!text) {
    throw new Error("The model returned no text.");
  }

  return {
    text,
    citations: collectCitations(data),
    usedWebSearch: useWebSearch
  };
}

function makeLocalAnswer(query, intent, localMatches, mode = "quick") {
  const top = localMatches[0];
  const routeSummary = localMatches.slice(0, 4)
    .map((entry) => `${entry.title} (${entry.url})`)
    .join(" | ");

  if (mode === "deep") {
    return [
      `Best local route: ${top?.title || "Diagnostics"}.`,
      top?.excerpt || "Use the closest local workflow first.",
      `Do this now: ${intent.plan.now?.[0] || "capture current symptom details."}`,
      `Then: ${intent.plan.next?.[0] || "follow the linked workflow."}`,
      routeSummary ? `Open next: ${routeSummary}.` : "",
      "Enable internet for this question if you want broader external references."
    ].filter(Boolean).join("\n\n");
  }

  return [
    `Best route: ${top?.title || "Diagnostics"}`,
    top?.excerpt || "Open the top local route and start with symptom-first checks.",
    routeSummary ? `Open: ${routeSummary}` : "",
    "Enable internet for this question if you need current outside sources."
  ].filter(Boolean).join("\n\n");
}

function appendToGarageNotes(text) {
  const notes = readStoredJson(GARAGE_NOTES_STORAGE_KEY, {});
  const existing = `${notes.general_notes || ""}`.trim();
  const nextGeneral = existing ? `${text}\n\n${existing}` : text;
  return writeStoredJson(GARAGE_NOTES_STORAGE_KEY, {
    ...notes,
    general_notes: nextGeneral
  });
}

async function copyText(value = "") {
  if (!value.trim()) {
    return false;
  }
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
  }
  textarea.remove();
  return copied;
}

function speakText(text = "") {
  if (!("speechSynthesis" in window) || !text.trim()) {
    return false;
  }
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 900));
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

function getLastAssistantMessage() {
  for (let index = state.messages.length - 1; index >= 0; index -= 1) {
    if (state.messages[index].role === "assistant") {
      return { index, message: state.messages[index] };
    }
  }
  return null;
}

function renderThreadActions(article, messageIndex, message) {
  const actions = document.createElement("div");
  actions.className = "ask-reply-actions";

  (message.actions || []).slice(0, 4).forEach((action) => {
    if (!action?.href) {
      return;
    }
    const link = document.createElement("a");
    link.className = "utility-link";
    link.href = action.href;
    link.textContent = action.label || "Open";
    actions.append(link);
  });

  const copyButton = document.createElement("button");
  copyButton.className = "utility-link";
  copyButton.type = "button";
  copyButton.dataset.askAction = "copy";
  copyButton.dataset.messageIndex = `${messageIndex}`;
  copyButton.textContent = "Copy Answer";
  actions.append(copyButton);

  const speakButton = document.createElement("button");
  speakButton.className = "utility-link";
  speakButton.type = "button";
  speakButton.dataset.askAction = "speak";
  speakButton.dataset.messageIndex = `${messageIndex}`;
  speakButton.textContent = "Read Aloud";
  actions.append(speakButton);

  const handoffCopy = document.createElement("button");
  handoffCopy.className = "utility-link";
  handoffCopy.type = "button";
  handoffCopy.dataset.askAction = "copy-handoff";
  handoffCopy.dataset.messageIndex = `${messageIndex}`;
  handoffCopy.textContent = "Copy Shop/Tow Pack";
  actions.append(handoffCopy);

  const handoffSave = document.createElement("button");
  handoffSave.className = "utility-link";
  handoffSave.type = "button";
  handoffSave.dataset.askAction = "save-handoff";
  handoffSave.dataset.messageIndex = `${messageIndex}`;
  handoffSave.textContent = "Save To Garage";
  actions.append(handoffSave);

  if (actions.children.length) {
    article.append(actions);
  }
}

function renderMessage(message, index) {
  if (!els.transcript) {
    return;
  }

  const article = document.createElement("article");
  article.className = `ask-message ask-message-${message.role}`;

  const heading = document.createElement("h3");
  heading.textContent = message.role === "user" ? "You" : `Anton${message.intent?.label ? ` - ${message.intent.label}` : ""}`;
  article.append(heading);

  const body = document.createElement("p");
  body.textContent = message.content;
  article.append(body);

  if (message.role === "assistant" && message.confidence) {
    const confidence = document.createElement("p");
    confidence.className = "ask-confidence";
    confidence.textContent = `Confidence: local ${message.confidence.local}%${message.confidence.web ? ` | web ${message.confidence.web}%` : ""} | ${message.confidence.safety}`;
    article.append(confidence);
  }

  if (message.role === "assistant" && message.plan) {
    const plan = document.createElement("div");
    plan.className = "ask-plan-grid";

    const sections = [
      { title: "Do This Now", lines: message.plan.now || [] },
      { title: "Next", lines: message.plan.next || [] },
      { title: "Stop / Verify", lines: message.plan.stop || [] }
    ];

    sections.forEach((section) => {
      const card = document.createElement("section");
      card.className = "ask-plan-card";
      const title = document.createElement("strong");
      title.textContent = section.title;
      const list = document.createElement("ul");
      section.lines.forEach((line) => {
        const item = document.createElement("li");
        item.textContent = line;
        list.append(item);
      });
      card.append(title, list);
      plan.append(card);
    });

    article.append(plan);
  }

  if (message.role === "assistant" && message.decisionTree?.question) {
    const tree = document.createElement("div");
    tree.className = "ask-tree";
    const q = document.createElement("p");
    q.className = "ask-source-kicker";
    q.textContent = message.decisionTree.question;
    tree.append(q);

    const options = document.createElement("div");
    options.className = "ask-tree-options";
    (message.decisionTree.options || []).forEach((option) => {
      const button = document.createElement("button");
      button.className = "utility-link";
      button.type = "button";
      button.dataset.askAction = "followup";
      button.dataset.followup = option;
      button.dataset.messageIndex = `${index}`;
      button.textContent = option;
      options.append(button);
    });
    tree.append(options);
    article.append(tree);
  }

  if (message.role === "assistant" && message.partsGuardrail) {
    const guardrail = document.createElement("p");
    guardrail.className = "ask-guardrail";
    guardrail.textContent = message.partsGuardrail;
    article.append(guardrail);
  }

  if (message.role === "assistant" && Array.isArray(message.citations) && message.citations.length) {
    const citationHeading = document.createElement("p");
    citationHeading.className = "ask-source-kicker";
    citationHeading.textContent = "Web Sources";
    article.append(citationHeading);

    const citationList = document.createElement("ul");
    citationList.className = "ask-source-links";
    message.citations.forEach((citation) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = citation.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = citation.title || citation.url;
      item.append(link);
      citationList.append(item);
    });
    article.append(citationList);
  }

  if (message.role === "assistant" && Array.isArray(message.sources) && message.sources.length) {
    const sourceHeading = document.createElement("p");
    sourceHeading.className = "ask-source-kicker";
    sourceHeading.textContent = "Local Routes";
    article.append(sourceHeading);

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

  if (message.role === "assistant") {
    renderThreadActions(article, index, message);
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
    body.textContent = "Ask a question to get local Ridgeline routes now, or enable API mode for model answers. This assistant now supports intent routing, quick/deep mode, decision trees, handoff packs, voice input, and Garage saves.";
    intro.append(heading, body);
    els.transcript.append(intro);
    return;
  }

  state.messages.forEach((message, index) => renderMessage(message, index));
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
  if (els.defaultMode) {
    els.defaultMode.value = state.settings.defaultMode;
  }
  if (els.inlineMode) {
    els.inlineMode.value = state.settings.defaultMode;
  }
  if (els.citationQuality) {
    els.citationQuality.value = state.settings.citationQuality;
  }
}

function collectSettings() {
  return {
    endpoint: els.endpoint?.value.trim() || DEFAULT_ENDPOINT,
    apiKey: els.key?.value.trim() || "",
    model: els.model?.value.trim() || DEFAULT_MODEL,
    webEnabled: Boolean(els.webEnabled?.checked),
    localLimit: clampLimit(Number(els.localLimit?.value || DEFAULT_LOCAL_LIMIT)),
    defaultMode: els.defaultMode?.value === "deep" ? "deep" : "quick",
    citationQuality: els.citationQuality?.value === "all" ? "all" : "high"
  };
}

function pushMessage(message) {
  state.messages.push(message);
  state.messages = state.messages.slice(-24);
  const saved = saveConversation();
  renderTranscript();
  if (!saved) {
    setStatus("Answer shown, but browser storage could not save the chat.", "warn");
  }
}

function updateGrounding(query) {
  const matches = buildLocalMatches(query, state.settings.localLimit);
  formatSources(matches);
  return matches;
}

function currentMode() {
  return els.inlineMode?.value === "deep" ? "deep" : state.settings.defaultMode;
}

async function handleQuestionSubmit(event) {
  event.preventDefault();
  if (state.busy) {
    return;
  }

  const query = `${els.input?.value || ""}`.trim();
  if (!query) {
    setStatus("Type a question first.", "warn");
    return;
  }

  state.settings = collectSettings();
  saveSettings();

  const mode = currentMode();
  const forceWebForThisQuestion = Boolean(els.webThis?.checked);
  const intent = detectIntent(query);
  const localMatches = updateGrounding(query);
  const plan = buildStructuredPlan(intent, localMatches);
  const decisionTree = intent.decisionTree || null;
  const guardrail = isPartsIntent(query, intent) ? buildPartsGuardrail() : "";

  updateThreadMemory(query, intent.label || "General");

  pushMessage({
    role: "user",
    content: query,
    intent,
    sources: [],
    citations: [],
    actions: [],
    confidence: null,
    plan: null,
    decisionTree: null,
    handoff: "",
    partsGuardrail: ""
  });

  state.busy = true;
  if (els.submit) {
    els.submit.disabled = true;
  }

  const webNote = forceWebForThisQuestion
    ? "internet forced for this question"
    : state.settings.webEnabled
      ? "smart internet mode"
      : "local/model mode";
  setStatus(`Thinking in ${mode} mode (${webNote})...`, "busy");

  try {
    let answerText = "";
    let citations = [];
    let usedWebSearch = false;

    if (state.settings.apiKey) {
      const answer = await requestModelAnswer(query, localMatches, {
        mode,
        forceWeb: forceWebForThisQuestion
      });
      answerText = answer.text;
      citations = answer.citations;
      usedWebSearch = answer.usedWebSearch;
    } else {
      answerText = makeLocalAnswer(query, intent, localMatches, mode);
    }

    const confidence = confidenceForResponse(localMatches, usedWebSearch, citations, intent.id);
    const handoff = buildHandoffText(query, intent, plan, answerText);

    pushMessage({
      role: "assistant",
      content: answerText,
      sources: localMatches,
      citations,
      intent,
      confidence,
      plan,
      decisionTree,
      actions: intent.actions || defaultIntent.actions,
      handoff,
      partsGuardrail: guardrail
    });

    if (usedWebSearch) {
      setStatus("Answered with local grounding plus internet references for this question.", "success");
    } else if (state.settings.apiKey) {
      setStatus("Answered with model + local grounding.", "success");
    } else {
      setStatus("Answered from local Ridgeline intelligence. Add API key for model/web results.", "info");
    }
  } catch (error) {
    const fallbackText = makeLocalAnswer(query, intent, localMatches, mode);
    const confidence = confidenceForResponse(localMatches, false, [], intent.id);
    const handoff = buildHandoffText(query, intent, plan, fallbackText);

    pushMessage({
      role: "assistant",
      content: fallbackText,
      sources: localMatches,
      citations: [],
      intent,
      confidence,
      plan,
      decisionTree,
      actions: intent.actions || defaultIntent.actions,
      handoff,
      partsGuardrail: guardrail
    });

    setStatus(`Model request failed. Fallback local answer shown: ${error.message}`, "warn");
  } finally {
    state.busy = false;
    if (els.submit) {
      els.submit.disabled = false;
    }
    if (els.webThis) {
      els.webThis.checked = false;
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

function clearThreadMemory() {
  state.thread = [];
  saveThread();
  renderThreadMemory();
  setStatus("Follow-up memory cleared.", "info");
}

function saveSettingsFromForm(event) {
  event.preventDefault();
  state.settings = collectSettings();
  const saved = saveSettings();
  if (els.inlineMode) {
    els.inlineMode.value = state.settings.defaultMode;
  }
  setStatus(saved ? "Saved settings in this browser." : "Settings could not be saved in this browser.", saved ? "success" : "warn", els.settingsStatus);
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

async function copyLastAnswer() {
  const last = getLastAssistantMessage();
  if (!last) {
    setStatus("No assistant answer to copy yet.", "warn");
    return;
  }
  const copied = await copyText(last.message.content);
  setStatus(copied ? "Last answer copied." : "Could not copy automatically.", copied ? "success" : "warn");
}

function saveLastHandoffToGarage() {
  const last = getLastAssistantMessage();
  if (!last || !last.message.handoff) {
    setStatus("No handoff pack available yet.", "warn");
    return;
  }
  const saved = appendToGarageNotes(last.message.handoff);
  setStatus(saved ? "Saved handoff to Garage general notes." : "Could not save to Garage notes.", saved ? "success" : "warn");
}

function setupTranscriptActions() {
  els.transcript?.addEventListener("click", async (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest("[data-ask-action]") : null;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.askAction;
    const index = Number(target.dataset.messageIndex || -1);
    const message = Number.isInteger(index) && index >= 0 ? state.messages[index] : null;

    if (action === "copy" && message) {
      const copied = await copyText(message.content);
      setStatus(copied ? "Answer copied." : "Could not copy answer.", copied ? "success" : "warn");
      return;
    }

    if (action === "speak" && message) {
      const spoken = speakText(message.content);
      setStatus(spoken ? "Reading answer aloud." : "Read-aloud is not available in this browser.", spoken ? "info" : "warn");
      return;
    }

    if (action === "copy-handoff" && message?.handoff) {
      const copied = await copyText(message.handoff);
      setStatus(copied ? "Shop/tow handoff copied." : "Could not copy handoff.", copied ? "success" : "warn");
      return;
    }

    if (action === "save-handoff" && message?.handoff) {
      const saved = appendToGarageNotes(message.handoff);
      setStatus(saved ? "Handoff saved to Garage notes." : "Could not save handoff to Garage notes.", saved ? "success" : "warn");
      return;
    }

    if (action === "followup") {
      const followup = `${target.dataset.followup || ""}`.trim();
      if (followup && els.input) {
        const prefix = message?.intent?.label ? `${message.intent.label}: ` : "";
        els.input.value = `${prefix}${followup}`;
        els.input.focus();
      }
    }
  });
}

function initVoiceInput() {
  if (!els.voice) {
    return;
  }

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    els.voice.disabled = true;
    els.voice.textContent = "Voice Unavailable";
    return;
  }

  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = `${event.results?.[0]?.[0]?.transcript || ""}`.trim();
    if (transcript && els.input) {
      els.input.value = transcript;
      els.input.focus();
      setStatus("Voice input captured.", "success");
    }
  };

  recognition.onerror = () => {
    state.listening = false;
    els.voice.textContent = "Voice Input";
    setStatus("Voice input error. Try again.", "warn");
  };

  recognition.onend = () => {
    state.listening = false;
    els.voice.textContent = "Voice Input";
  };

  state.recognition = recognition;

  els.voice.addEventListener("click", () => {
    if (!state.recognition) {
      return;
    }
    if (state.listening) {
      state.recognition.stop();
      state.listening = false;
      els.voice.textContent = "Voice Input";
      return;
    }
    state.listening = true;
    els.voice.textContent = "Listening...";
    setStatus("Listening for voice input...", "info");
    state.recognition.start();
  });
}

function syncInitialUi() {
  renderSettings();
  renderTranscript();
  renderThreadMemory();
  formatSources([]);
  setStatus("Ready. Ask Anton now includes intent routing, quick/deep modes, decision trees, action buttons, voice input, and shop/tow handoff packs.", "info");
}

els.form?.addEventListener("submit", handleQuestionSubmit);
els.clear?.addEventListener("click", clearChat);
els.settingsForm?.addEventListener("submit", saveSettingsFromForm);
els.copyLast?.addEventListener("click", copyLastAnswer);
els.saveLastGarage?.addEventListener("click", saveLastHandoffToGarage);
els.clearThread?.addEventListener("click", clearThreadMemory);

attachQuickPrompts();
setupTranscriptActions();
initVoiceInput();
syncInitialUi();
