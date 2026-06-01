import { createServer } from "node:http";

const PORT = Number(process.env.PORT || 8787);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/responses";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "gpt-4.1-mini";

const allowedOriginList = ALLOWED_ORIGIN
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!OPENAI_API_KEY) {
  console.warn("[ask-anton-proxy] OPENAI_API_KEY is missing. Requests will fail until it is set.");
}

function setCors(res, reqOrigin = "") {
  const allowAll = allowedOriginList.includes("*") || ALLOWED_ORIGIN === "*";
  const allowOrigin = allowAll ? "*" : reqOrigin;
  res.setHeader("Access-Control-Allow-Origin", allowOrigin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function sendJson(res, status, data, reqOrigin = "") {
  setCors(res, reqOrigin);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function isAllowedOrigin(reqOrigin = "") {
  if (allowedOriginList.includes("*") || ALLOWED_ORIGIN === "*") {
    return true;
  }
  if (!reqOrigin && allowedOriginList.includes("null")) {
    return true;
  }
  return allowedOriginList.includes(reqOrigin);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large."));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sanitizePayload(rawPayload = {}) {
  const payload = {
    model: typeof rawPayload.model === "string" && rawPayload.model.trim() ? rawPayload.model.trim() : DEFAULT_MODEL,
    input: typeof rawPayload.input === "string" ? rawPayload.input : ""
  };

  if (!payload.input.trim()) {
    throw new Error("Missing input text.");
  }

  if (Array.isArray(rawPayload.tools)) {
    const safeTools = rawPayload.tools
      .filter((tool) => {
        const type = typeof tool?.type === "string" ? tool.type : "";
        return type === "web_search_preview" || type === "web_search";
      })
      .slice(0, 1);

    if (safeTools.length) {
      payload.tools = safeTools;
    }
  }

  return payload;
}

async function forwardToOpenAI(payload) {
  const response = await fetch(OPENAI_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

const server = createServer(async (req, res) => {
  const reqOrigin = req.headers.origin || "";

  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(reqOrigin)) {
      sendJson(res, 403, { error: "Origin not allowed." }, reqOrigin);
      return;
    }
    setCors(res, reqOrigin);
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true, service: "ask-anton-proxy" }, reqOrigin);
    return;
  }

  if (req.method !== "POST" || req.url !== "/api/ask-anton") {
    sendJson(res, 404, { error: "Not found." }, reqOrigin);
    return;
  }

  if (!isAllowedOrigin(reqOrigin)) {
    sendJson(res, 403, { error: "Origin not allowed." }, reqOrigin);
    return;
  }

  if (!OPENAI_API_KEY) {
    sendJson(res, 500, { error: "Server is missing OPENAI_API_KEY." }, reqOrigin);
    return;
  }

  try {
    const bodyRaw = await readBody(req);
    const body = bodyRaw ? JSON.parse(bodyRaw) : {};
    const payload = sanitizePayload(body);
    const upstream = await forwardToOpenAI(payload);

    if (!upstream.ok) {
      sendJson(res, upstream.status, {
        error: "Upstream model request failed.",
        details: upstream.data
      }, reqOrigin);
      return;
    }

    sendJson(res, 200, upstream.data, reqOrigin);
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Invalid request." }, reqOrigin);
  }
});

server.listen(PORT, () => {
  console.log(`[ask-anton-proxy] listening on http://localhost:${PORT}`);
  console.log(`[ask-anton-proxy] POST endpoint: http://localhost:${PORT}/api/ask-anton`);
});
