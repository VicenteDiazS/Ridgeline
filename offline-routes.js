export const OFFLINE_ROUTE_RECEIPT_KEY = "ridgeline-offline-route-last-check";

export const RIDGELINE_OFFLINE_ROUTES = [
  { label: "Roadside Stack", path: "quick-sheet.html?roadside=flat#roadside-action-stack", cachePath: "quick-sheet.html" },
  { label: "Diagnostics Guide", path: "diagnostics.html#diagnostic-decision-guide", cachePath: "diagnostics.html" },
  { label: "Hood Fuses", path: "hood.html#fuses", cachePath: "hood.html" },
  { label: "Cabin Fuses", path: "cabin.html#fuses", cachePath: "cabin.html" },
  { label: "7-Way Pinout", path: "rear-hitch.html#pinout", cachePath: "rear-hitch.html" },
  { label: "Garage Backup", path: "garage.html#diagnostic-activity", cachePath: "garage.html" }
];

export function formatOfflineRouteCheckTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "checked recently";
  }
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function loadOfflineRouteReceipt() {
  try {
    const receipt = JSON.parse(localStorage.getItem(OFFLINE_ROUTE_RECEIPT_KEY) || "null");
    return receipt && Array.isArray(receipt.results) ? receipt : null;
  } catch {
    return null;
  }
}

export function saveOfflineRouteReceipt(results, action = "checked") {
  const normalized = Array.isArray(results) ? results : [];
  const readyCount = normalized.filter((route) => route.ready).length;
  const receipt = {
    action,
    savedAt: new Date().toISOString(),
    readyCount,
    totalCount: normalized.length,
    results: normalized.map((route) => ({
      label: route.label,
      path: route.path,
      cachePath: route.cachePath,
      ready: Boolean(route.ready),
      unavailable: Boolean(route.unavailable)
    }))
  };
  localStorage.setItem(OFFLINE_ROUTE_RECEIPT_KEY, JSON.stringify(receipt));
  return receipt;
}

export function offlineRouteRequest(path) {
  const url = new URL(path, window.location.href);
  url.hash = "";
  return new Request(url.href, { method: "GET" });
}

export function offlineRouteCacheRequest(route) {
  return offlineRouteRequest(route.cachePath || route.path);
}

export async function offlineRouteCacheKey() {
  if (!("caches" in window)) {
    return "";
  }
  const keys = await caches.keys();
  const ridgelineKeys = keys.filter((key) => key.startsWith("ridgeline-console-"));
  return ridgelineKeys.at(-1) || "ridgeline-console-manual";
}

export async function checkOfflineRoutes(routes = RIDGELINE_OFFLINE_ROUTES) {
  if (!("caches" in window)) {
    return routes.map((route) => ({ ...route, ready: false, unavailable: true }));
  }

  return Promise.all(routes.map(async (route) => {
    try {
      const match = await caches.match(offlineRouteCacheRequest(route), { ignoreSearch: true });
      return { ...route, ready: Boolean(match) };
    } catch {
      return { ...route, ready: false, unavailable: true };
    }
  }));
}

export async function primeOfflineRoutes(routes = RIDGELINE_OFFLINE_ROUTES) {
  if (!("caches" in window)) {
    return routes.map((route) => ({ ...route, primed: false, ready: false, unavailable: true }));
  }

  const cache = await caches.open(await offlineRouteCacheKey());
  return Promise.all(routes.map(async (route) => {
    const request = offlineRouteCacheRequest(route);
    try {
      const response = await fetch(request, { cache: "reload" });
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      const match = await caches.match(request, { ignoreSearch: true });
      return { ...route, primed: true, ready: Boolean(match) };
    } catch {
      const match = await caches.match(request, { ignoreSearch: true });
      return { ...route, primed: false, ready: Boolean(match), unavailable: !match };
    }
  }));
}

export function buildOfflineRoutePlan(results, options = {}) {
  const normalized = Array.isArray(results) && results.length
    ? results
    : RIDGELINE_OFFLINE_ROUTES.map((route) => ({ ...route, ready: false, unchecked: true }));
  const readyRoutes = normalized.filter((route) => route.ready);
  const openRoutes = normalized.filter((route) => !route.ready);
  const readyLines = readyRoutes.length
    ? readyRoutes.map((route) => `- ${route.label}: cached`)
    : ["- None confirmed yet"];
  const openLines = openRoutes.length
    ? openRoutes.map((route) => `- ${route.label}: ${route.path}`)
    : ["- All key routes are currently found in cache"];
  const intro = Array.isArray(results) && results.length
    ? `${readyRoutes.length}/${normalized.length} key routes found in the offline cache.`
    : (options.uncheckedMessage || "Run Check Routes or Prime Routes while online to confirm cache state.");

  return [
    options.title || "Ridgeline offline route plan before signal drops",
    intro,
    "",
    "Cached routes:",
    ...readyLines,
    "",
    "Open while online if needed:",
    ...openLines,
    "",
    options.closing || "Keep a Garage backup and printed Quick Sheet if coverage may be weak."
  ].join("\n");
}
