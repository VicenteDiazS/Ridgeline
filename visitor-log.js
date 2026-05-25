import { SUPABASE_PUBLIC_CONFIG, getOwnerAccessToken, getOwnerAuthState } from "./owner-auth.js";

const VISIT_TABLE = "ridgeline_visits";
const VISITOR_ID_KEY = "ridgeline-visitor-id-v1";
const VISITOR_NAME_KEY = "ridgeline-visitor-name-v1";
const VISIT_THROTTLE_PREFIX = "ridgeline-visit-log-v1:";
const VISIT_THROTTLE_MS = 30 * 60 * 1000;

function storageGet(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors and keep logging best-effort.
  }
}

function currentPageName() {
  return location.pathname.split("/").pop() || "index.html";
}

function getVisitorId() {
  let visitorId = storageGet(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = `visitor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    storageSet(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

export function getVisitorName() {
  return storageGet(VISITOR_NAME_KEY);
}

export function setVisitorName(name = "") {
  const next = `${name || ""}`.trim().slice(0, 80);
  storageSet(VISITOR_NAME_KEY, next);
  return next;
}

function visitThrottleKey(page = currentPageName()) {
  return `${VISIT_THROTTLE_PREFIX}${page}`;
}

function shouldLogVisit(page = currentPageName()) {
  const lastSeen = Number(storageGet(visitThrottleKey(page)) || 0);
  return !Number.isFinite(lastSeen) || Date.now() - lastSeen > VISIT_THROTTLE_MS;
}

function markVisitLogged(page = currentPageName()) {
  storageSet(visitThrottleKey(page), `${Date.now()}`);
}

function requestHeaders(accessToken = "") {
  return {
    apikey: SUPABASE_PUBLIC_CONFIG.publishableKey,
    Authorization: `Bearer ${accessToken || SUPABASE_PUBLIC_CONFIG.publishableKey}`,
    "Content-Type": "application/json"
  };
}

function browserLabel() {
  const ua = navigator.userAgent || "";
  if (/iPhone/i.test(ua)) {
    return "iPhone";
  }
  if (/iPad/i.test(ua)) {
    return "iPad";
  }
  if (/Android/i.test(ua)) {
    return "Android";
  }
  if (/Macintosh|Mac OS X/i.test(ua)) {
    return "Mac";
  }
  if (/Windows/i.test(ua)) {
    return "Windows";
  }
  return "Browser";
}

function referrerLabel() {
  if (!document.referrer) {
    return "";
  }

  try {
    return new URL(document.referrer).hostname || document.referrer;
  } catch {
    return document.referrer;
  }
}

function buildVisitPayload() {
  const page = currentPageName();
  return {
    visit_id: getVisitorId(),
    page,
    page_path: `${location.pathname}${location.search || ""}${location.hash || ""}`,
    page_title: document.title || page,
    visitor_name: getVisitorName() || null,
    referrer: referrerLabel() || null,
    browser_label: browserLabel(),
    language: navigator.language || "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    viewport: `${window.innerWidth || 0}x${window.innerHeight || 0}`,
    screen_size: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
    user_agent: navigator.userAgent || "",
    metadata: {
      platform: navigator.platform || "",
      path: location.pathname,
      search: location.search || "",
      hash: location.hash || ""
    }
  };
}

export async function trackVisit() {
  if (!SUPABASE_PUBLIC_CONFIG.url || !SUPABASE_PUBLIC_CONFIG.publishableKey || location.protocol === "file:") {
    return false;
  }

  const page = currentPageName();
  if (!shouldLogVisit(page)) {
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_PUBLIC_CONFIG.url}/rest/v1/${VISIT_TABLE}`, {
      method: "POST",
      cache: "no-store",
      headers: requestHeaders(),
      body: JSON.stringify(buildVisitPayload())
    });

    if (!response.ok) {
      return false;
    }

    markVisitLogged(page);
    return true;
  } catch {
    return false;
  }
}

export async function loadVisitorLog(limit = 60) {
  const authState = getOwnerAuthState();
  const accessToken = getOwnerAccessToken();
  if (!authState.isOwner || !accessToken) {
    return [];
  }

  const response = await fetch(
    `${SUPABASE_PUBLIC_CONFIG.url}/rest/v1/${VISIT_TABLE}?select=id,seen_at,visit_id,page,page_path,page_title,visitor_name,referrer,browser_label,language,timezone,viewport,screen_size&order=seen_at.desc&limit=${Math.max(1, Math.min(limit, 200))}`,
    {
      method: "GET",
      cache: "no-store",
      headers: requestHeaders(accessToken)
    }
  );

  if (!response.ok) {
    throw new Error(`Visitor log request failed: ${response.status}`);
  }

  return response.json();
}
