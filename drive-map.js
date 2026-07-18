const mapCanvas = document.querySelector("#drive-map-canvas");
const statusLabel = document.querySelector("#drive-map-status");
const metaLabel = document.querySelector("#drive-map-meta");
const trackingButton = document.querySelector('[data-drive-action="tracking"]');
const followButton = document.querySelector('[data-drive-action="follow"]');
const recenterButton = document.querySelector('[data-drive-action="recenter"]');
const clearButton = document.querySelector('[data-drive-action="clear"]');
const copyButton = document.querySelector('[data-drive-action="copy"]');
const shareButton = document.querySelector('[data-drive-action="share"]');
const actionStatus = document.querySelector("[data-drive-action-status]");
const copyFallback = document.querySelector("[data-drive-copy-fallback]");
const copyFallbackText = document.querySelector("[data-drive-copy-text]");
const statFix = document.querySelector('[data-drive-stat="fix"]');
const statSpeed = document.querySelector('[data-drive-stat="speed"]');
const statTrail = document.querySelector('[data-drive-stat="trail"]');

const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

let map = null;
let marker = null;
let accuracyRing = null;
let trailLine = null;
let watchId = null;
let followMode = true;
let hasCentered = false;
let lastSnapshot = null;
const trailPoints = [];

function setStatus(headline, detail = "") {
  if (statusLabel) {
    statusLabel.textContent = headline;
  }
  if (metaLabel) {
    metaLabel.textContent = detail;
  }
}

function formatSpeedMph(speedMetersPerSecond) {
  if (!Number.isFinite(speedMetersPerSecond) || speedMetersPerSecond < 0) {
    return "-- mph";
  }
  return `${(speedMetersPerSecond * 2.236936).toFixed(1)} mph`;
}

function formatHeading(headingDegrees) {
  if (!Number.isFinite(headingDegrees)) {
    return "--";
  }

  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
  const normalized = ((headingDegrees % 360) + 360) % 360;
  const index = Math.round(normalized / 45);
  return `${Math.round(normalized)} deg ${directions[index]}`;
}

function loadLeafletCss() {
  if (document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) {
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = LEAFLET_CSS_URL;
  link.crossOrigin = "";
  document.head.appendChild(link);
}

function loadLeafletScript() {
  if (window.L) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${LEAFLET_JS_URL}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    const timer = window.setTimeout(() => {
      reject(new Error("Leaflet load timed out"));
    }, 8000);

    script.src = LEAFLET_JS_URL;
    script.crossOrigin = "";
    script.async = true;
    script.addEventListener("load", () => {
      window.clearTimeout(timer);
      resolve();
    }, { once: true });
    script.addEventListener("error", () => {
      window.clearTimeout(timer);
      reject(new Error("Leaflet failed to load"));
    }, { once: true });
    document.head.appendChild(script);
  });
}

async function ensureMapEngine() {
  if (location.protocol === "file:") {
    setStatus("Map engine skipped in file mode", "Open the hosted site for live map tiles. Snapshot controls still show the GPS fallback.");
    setActionStatus("Local file audits skip the online map engine to keep the page responsive.");
    return false;
  }

  loadLeafletCss();
  try {
    await loadLeafletScript();
    return true;
  } catch {
    setStatus("Map engine unavailable", "Live map tiles need network access. You can still copy the GPS fallback note.");
    setActionStatus("Leaflet did not load before timeout; reload when online for the visual map.");
    return false;
  }
}

function formatCoordinate(value) {
  if (!Number.isFinite(value)) {
    return "--";
  }
  return value.toFixed(6);
}

function setActionStatus(message) {
  if (actionStatus) {
    actionStatus.textContent = message;
  }
}

function hideManualCopyFallback() {
  if (copyFallback) {
    copyFallback.hidden = true;
  }
}

function showManualCopyFallback(text) {
  if (!copyFallback || !copyFallbackText) {
    return;
  }
  copyFallbackText.value = text;
  copyFallback.hidden = false;
  copyFallbackText.focus();
  copyFallbackText.select();
}

function updateStats(snapshot = lastSnapshot) {
  if (statFix) {
    statFix.textContent = snapshot ? `${Math.round(snapshot.accuracy || 0)} m` : "Waiting";
  }
  if (statSpeed) {
    statSpeed.textContent = snapshot ? formatSpeedMph(snapshot.speed) : "-- mph";
  }
  if (statTrail) {
    statTrail.textContent = `${trailPoints.length} ${trailPoints.length === 1 ? "pt" : "pts"}`;
  }
}

function updateFollowButton() {
  if (!followButton) {
    return;
  }
  followButton.textContent = followMode ? "Follow: On" : "Follow: Off";
  followButton.setAttribute("aria-pressed", String(followMode));
}

function updateTrackingButton() {
  if (!trackingButton) {
    return;
  }
  trackingButton.textContent = watchId ? "Pause Tracking" : "Resume Tracking";
}

function ensureMap() {
  if (!mapCanvas) {
    return false;
  }

  if (!window.L) {
    setStatus("Map engine unavailable", "Leaflet did not load. Check your network and reload.");
    return false;
  }

  map = window.L.map(mapCanvas, {
    zoomControl: true,
    attributionControl: true,
    fadeAnimation: false
  });

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  trailLine = window.L.polyline([], {
    color: "#79d4ff",
    weight: 4,
    opacity: 0.9,
    lineJoin: "round"
  }).addTo(map);

  map.setView([39.8283, -98.5795], 4);
  window.requestAnimationFrame(() => {
    map?.invalidateSize();
  });
  window.addEventListener("load", () => map?.invalidateSize(), { once: true });
  window.addEventListener("resize", () => map?.invalidateSize());
  return true;
}

function pushTrailPoint(latlng) {
  if (!trailLine || !map) {
    return;
  }

  const previous = trailPoints[trailPoints.length - 1];
  if (previous) {
    const delta = map.distance(previous, latlng);
    if (delta < 4) {
      return;
    }
  }

  trailPoints.push(latlng);
  trailLine.setLatLngs(trailPoints);
  updateStats();
}

function onLocation(position) {
  if (!map || !window.L) {
    return;
  }

  const { latitude, longitude, accuracy, speed, heading } = position.coords;
  const latlng = window.L.latLng(latitude, longitude);
  lastSnapshot = {
    latitude,
    longitude,
    accuracy,
    speed,
    heading,
    timestamp: position.timestamp || Date.now()
  };

  if (!marker) {
    marker = window.L.circleMarker(latlng, {
      radius: 9,
      color: "#071019",
      weight: 2,
      fillColor: "#6fffb4",
      fillOpacity: 0.95
    }).addTo(map);

    accuracyRing = window.L.circle(latlng, {
      radius: Math.max(accuracy || 0, 8),
      color: "#79d4ff",
      weight: 2,
      fillColor: "#79d4ff",
      fillOpacity: 0.15
    }).addTo(map);
  } else {
    marker.setLatLng(latlng);
    if (accuracyRing) {
      accuracyRing.setLatLng(latlng);
      accuracyRing.setRadius(Math.max(accuracy || 0, 8));
    }
  }

  pushTrailPoint(latlng);

  const firstFix = !hasCentered;
  if (firstFix || followMode) {
    const targetZoom = firstFix ? 16 : Math.max(map.getZoom(), 16);
    map.setView(latlng, targetZoom, { animate: !firstFix });
  }
  hasCentered = true;

  const detail = `Speed ${formatSpeedMph(speed)} | Heading ${formatHeading(heading)} | Accuracy ${Math.round(accuracy || 0)} m`;
  setStatus("Tracking live location", detail);
  updateStats(lastSnapshot);
  hideManualCopyFallback();
}

function onLocationError(error) {
  const message = error?.message || "Location permission denied or unavailable.";
  setStatus("GPS unavailable", message);
  setActionStatus("Allow location access in Safari to create a live snapshot.");
  updateStats();
}

function startTracking() {
  if (!navigator.geolocation) {
    setStatus("Geolocation unsupported", "Your browser cannot provide live GPS location.");
    return;
  }

  if (watchId) {
    return;
  }

  watchId = navigator.geolocation.watchPosition(onLocation, onLocationError, {
    enableHighAccuracy: true,
    maximumAge: 1500,
    timeout: 12000
  });

  updateTrackingButton();
}

function stopTracking() {
  if (!watchId || !navigator.geolocation) {
    watchId = null;
    updateTrackingButton();
    return;
  }

  navigator.geolocation.clearWatch(watchId);
  watchId = null;
  updateTrackingButton();
  setStatus("Tracking paused", "Tap Resume Tracking to continue live location updates.");
}

function clearTrail() {
  trailPoints.length = 0;
  if (trailLine) {
    trailLine.setLatLngs([]);
  }
  updateStats();
}

function buildSnapshotText() {
  if (!lastSnapshot) {
    return [
      "Ridgeline drive snapshot",
      "No live GPS fix yet.",
      "Open Drive Map and allow location access before sharing a location handoff."
    ].join("\n");
  }

  const mapUrl = `https://www.openstreetmap.org/?mlat=${formatCoordinate(lastSnapshot.latitude)}&mlon=${formatCoordinate(lastSnapshot.longitude)}#map=17/${formatCoordinate(lastSnapshot.latitude)}/${formatCoordinate(lastSnapshot.longitude)}`;
  const checkedAt = new Date(lastSnapshot.timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  return [
    "Ridgeline drive snapshot",
    `Location: ${formatCoordinate(lastSnapshot.latitude)}, ${formatCoordinate(lastSnapshot.longitude)}`,
    `Accuracy: ${Math.round(lastSnapshot.accuracy || 0)} m`,
    `Speed: ${formatSpeedMph(lastSnapshot.speed)}`,
    `Heading: ${formatHeading(lastSnapshot.heading)}`,
    `Trail points: ${trailPoints.length}`,
    `Checked: ${checkedAt}`,
    `Map: ${mapUrl}`
  ].join("\n");
}

async function copySnapshot() {
  const text = buildSnapshotText();
  hideManualCopyFallback();

  try {
    await navigator.clipboard.writeText(text);
    setActionStatus(lastSnapshot ? "Drive snapshot copied." : "GPS fallback note copied.");
  } catch {
    showManualCopyFallback(text);
    setActionStatus("Clipboard blocked. Select the snapshot text to copy manually.");
  }
}

async function shareSnapshot() {
  const text = buildSnapshotText();
  hideManualCopyFallback();

  if (navigator.share) {
    try {
      await navigator.share({ title: "Ridgeline drive snapshot", text });
      setActionStatus("Drive snapshot opened in the share sheet.");
      return;
    } catch (error) {
      if (error?.name === "AbortError") {
        setActionStatus("Share canceled.");
        return;
      }
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    setActionStatus("Share unavailable. Snapshot copied instead.");
  } catch {
    showManualCopyFallback(text);
    setActionStatus("Share and clipboard unavailable. Select the snapshot text manually.");
  }
}

function recenterMap() {
  if (!map || !marker) {
    setActionStatus("Waiting for a GPS fix before recentering.");
    return;
  }
  map.setView(marker.getLatLng(), Math.max(map.getZoom(), 16), { animate: true });
  setActionStatus("Map recentered on the truck.");
}

function initActions() {
  trackingButton?.addEventListener("click", () => {
    if (watchId) {
      stopTracking();
    } else {
      startTracking();
      setStatus("Reconnecting to GPS...", "Waiting for a fresh location fix.");
    }
  });

  followButton?.addEventListener("click", () => {
    followMode = !followMode;
    updateFollowButton();
    if (followMode && marker && map) {
      map.panTo(marker.getLatLng(), { animate: true });
    }
  });

  recenterButton?.addEventListener("click", () => {
    recenterMap();
  });

  clearButton?.addEventListener("click", () => {
    clearTrail();
    setStatus("Trail cleared", "Location tracking is still active.");
  });

  copyButton?.addEventListener("click", copySnapshot);
  shareButton?.addEventListener("click", shareSnapshot);

  window.addEventListener("ridgeline:drive-action", (event) => {
    const action = event.detail?.action;
    if (action === "copy") {
      copySnapshot();
    }
    if (action === "share") {
      shareSnapshot();
    }
    if (action === "recenter") {
      recenterMap();
    }
  });
}

async function initDriveMap() {
  updateFollowButton();
  updateTrackingButton();
  updateStats();
  initActions();

  if (await ensureMapEngine() && ensureMap()) {
    startTracking();
  }
}

initDriveMap();

window.addEventListener("pagehide", () => {
  stopTracking();
});
