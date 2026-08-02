const mapCanvas = document.querySelector("#drive-map-canvas");
const positionPuck = document.querySelector("[data-drive-position-puck]");
const driveMapShell = document.querySelector(".drive-map-shell");
const driveOverlay = document.querySelector(".drive-map-overlay");
const controlsToggleButton = document.querySelector("[data-drive-controls-toggle]");
const markerToast = document.querySelector("[data-drive-marker-toast]");
const driveHud = document.querySelector("[data-drive-hud]");
const statusLabel = document.querySelector("#drive-map-status");
const metaLabel = document.querySelector("#drive-map-meta");
const trackingButton = document.querySelector('[data-drive-action="tracking"]');
const followButton = document.querySelector('[data-drive-action="follow"]');
const recenterButton = document.querySelector('[data-drive-action="recenter"]');
const markerButtons = [...document.querySelectorAll('[data-drive-action="marker"]')];
const undoMarkerButtons = [...document.querySelectorAll('[data-drive-action="undo-marker"]')];
const clearMarkersButton = document.querySelector('[data-drive-action="clear-markers"]');
const zoomInButton = document.querySelector('[data-drive-action="zoom-in"]');
const zoomOutButton = document.querySelector('[data-drive-action="zoom-out"]');
const compassButton = document.querySelector('[data-drive-action="compass"]');
const headingUpButton = document.querySelector('[data-drive-action="heading-up"]');
const hudButton = document.querySelector('[data-drive-action="hud"]');
const baseMapButton = document.querySelector('[data-drive-action="basemap"]');
const proximityButton = document.querySelector('[data-drive-action="proximity"]');
const wakeLockButton = document.querySelector('[data-drive-action="wake-lock"]');
const lowAttentionButton = document.querySelector('[data-drive-action="low-attention"]');
const clearButton = document.querySelector('[data-drive-action="clear"]');
const copyButton = document.querySelector('[data-drive-action="copy"]');
const shareButton = document.querySelector('[data-drive-action="share"]');
const actionStatus = document.querySelector("[data-drive-action-status]");
const copyFallback = document.querySelector("[data-drive-copy-fallback]");
const copyFallbackText = document.querySelector("[data-drive-copy-text]");
const statFix = document.querySelector('[data-drive-stat="fix"]');
const statSpeed = document.querySelector('[data-drive-stat="speed"]');
const statTrail = document.querySelector('[data-drive-stat="trail"]');
const statMarkers = document.querySelector('[data-drive-stat="markers"]');
const hudSpeed = document.querySelector('[data-drive-hud="speed"]');
const hudHeading = document.querySelector('[data-drive-hud="heading"]');
const hudAccuracy = document.querySelector('[data-drive-hud="accuracy"]');

const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const BASE_MAP_STORAGE_KEY = "ridgeline-drive-map-basemap";
const CONTROLS_STORAGE_KEY = "ridgeline-drive-map-controls";
const COMPASS_STORAGE_KEY = "ridgeline-drive-map-compass";
const HEADING_UP_STORAGE_KEY = "ridgeline-drive-map-heading-up";
const HUD_STORAGE_KEY = "ridgeline-drive-map-hud";
const LOW_ATTENTION_STORAGE_KEY = "ridgeline-drive-map-low-attention";
const PROXIMITY_STORAGE_KEY = "ridgeline-drive-map-proximity";
const WAKE_LOCK_STORAGE_KEY = "ridgeline-drive-map-wake-lock";
const PROXIMITY_ALERT_OPTIONS = [0, 50, 100, 200];
const BASE_MAPS = {
  standard: {
    label: "Standard Map",
    buttonLabel: "Dark Map",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }
  },
  dark: {
    label: "Dark Roads",
    buttonLabel: "Light Map",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    options: {
      maxZoom: 20,
      subdomains: "abcd",
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
    }
  }
};

let map = null;
let tileLayer = null;
let marker = null;
let accuracyRing = null;
let trailLine = null;
let markerLayer = null;
let watchId = null;
let followMode = true;
let hasCentered = false;
let lastSnapshot = null;
let currentBaseMap = localStorage.getItem(BASE_MAP_STORAGE_KEY) === "dark" ? "dark" : "standard";
let controlsCollapsed = localStorage.getItem(CONTROLS_STORAGE_KEY) !== "open";
let compassWanted = localStorage.getItem(COMPASS_STORAGE_KEY) === "1";
let headingUpMode = localStorage.getItem(HEADING_UP_STORAGE_KEY) === "1";
let hudMode = localStorage.getItem(HUD_STORAGE_KEY) === "1";
let lowAttentionMode = localStorage.getItem(LOW_ATTENTION_STORAGE_KEY) === "1";
let proximityFeet = PROXIMITY_ALERT_OPTIONS.includes(Number(localStorage.getItem(PROXIMITY_STORAGE_KEY)))
  ? Number(localStorage.getItem(PROXIMITY_STORAGE_KEY))
  : 100;
let wakeLockWanted = localStorage.getItem(WAKE_LOCK_STORAGE_KEY) === "1";
let wakeLockSentinel = null;
let lastHeading = null;
let markerToastTimer = null;
let compassListening = false;
let proximityFlashTimer = null;
const trailPoints = [];
const droppedMarkers = [];

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

function normalizeHeading(headingDegrees) {
  if (!Number.isFinite(headingDegrees)) {
    return null;
  }
  return ((headingDegrees % 360) + 360) % 360;
}

function shortHeading(headingDegrees) {
  const normalized = normalizeHeading(headingDegrees);
  if (!Number.isFinite(normalized)) {
    return "--";
  }
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
  return directions[Math.round(normalized / 45)];
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
    setActionStatus("Running in local file mode; map tiles still require network access.");
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

function updateModeButtons() {
  if (compassButton) {
    compassButton.textContent = compassWanted ? "Compass On" : "Enable Compass";
    compassButton.setAttribute("aria-pressed", String(compassWanted && compassListening));
  }
  if (headingUpButton) {
    headingUpButton.textContent = headingUpMode ? "North Up" : "Heading Up";
    headingUpButton.setAttribute("aria-pressed", String(headingUpMode));
  }
  if (hudButton) {
    hudButton.textContent = hudMode ? "Hide HUD" : "HUD";
    hudButton.setAttribute("aria-pressed", String(hudMode));
  }
  if (lowAttentionButton) {
    lowAttentionButton.textContent = lowAttentionMode ? "Full UI" : "Low Attention";
    lowAttentionButton.setAttribute("aria-pressed", String(lowAttentionMode));
  }
  if (proximityButton) {
    proximityButton.textContent = proximityFeet > 0 ? `Alerts ${proximityFeet} ft` : "Alerts Off";
    proximityButton.setAttribute("aria-pressed", String(proximityFeet > 0));
  }
  if (wakeLockButton) {
    wakeLockButton.textContent = wakeLockWanted ? "Awake On" : "Keep Awake";
    wakeLockButton.setAttribute("aria-pressed", String(wakeLockWanted && Boolean(wakeLockSentinel)));
  }
}

function updateLowAttentionMode() {
  document.body.classList.toggle("drive-low-attention", lowAttentionMode);
  if (lowAttentionMode) {
    setControlsCollapsed(true);
  }
  updateModeButtons();
}

function updateDrivingHud(snapshot = lastSnapshot) {
  if (driveHud) {
    driveHud.hidden = !hudMode;
  }
  if (hudSpeed) {
    hudSpeed.textContent = snapshot ? formatSpeedMph(snapshot.speed) : "-- mph";
  }
  if (hudHeading) {
    hudHeading.textContent = Number.isFinite(lastHeading)
      ? shortHeading(lastHeading)
      : snapshot
        ? shortHeading(snapshot.heading)
        : "--";
  }
  if (hudAccuracy) {
    hudAccuracy.textContent = snapshot ? `${Math.round(snapshot.accuracy || 0)} m` : "-- m";
  }
}

function handleCompassHeading(event) {
  const iosHeading = Number(event.webkitCompassHeading);
  const alphaHeading = event.absolute && Number.isFinite(event.alpha)
    ? 360 - Number(event.alpha)
    : null;
  const heading = Number.isFinite(iosHeading) ? iosHeading : alphaHeading;
  const normalized = normalizeHeading(heading);
  if (!Number.isFinite(normalized)) {
    return;
  }

  lastHeading = normalized;
  updateDrivingHud();
  updateHeadingUpMode();
}

function startCompassListening() {
  if (compassListening || !("DeviceOrientationEvent" in window)) {
    updateModeButtons();
    return compassListening;
  }

  window.addEventListener("deviceorientation", handleCompassHeading, true);
  compassListening = true;
  updateModeButtons();
  return true;
}

async function enableCompass() {
  if (!("DeviceOrientationEvent" in window)) {
    setActionStatus("Compass unavailable in this browser.");
    updateModeButtons();
    return;
  }

  try {
    if (typeof window.DeviceOrientationEvent.requestPermission === "function") {
      const permission = await window.DeviceOrientationEvent.requestPermission();
      if (permission !== "granted") {
        compassWanted = false;
        localStorage.setItem(COMPASS_STORAGE_KEY, "0");
        setActionStatus("Compass permission was not granted.");
        updateModeButtons();
        return;
      }
    }

    compassWanted = true;
    localStorage.setItem(COMPASS_STORAGE_KEY, "1");
    startCompassListening();
    setActionStatus("Compass enabled for heading-up mode.");
  } catch {
    compassWanted = false;
    localStorage.setItem(COMPASS_STORAGE_KEY, "0");
    setActionStatus("Compass permission could not be opened.");
    updateModeButtons();
  }
}

function cycleProximityAlerts() {
  const currentIndex = PROXIMITY_ALERT_OPTIONS.indexOf(proximityFeet);
  const nextIndex = currentIndex === -1 ? 2 : (currentIndex + 1) % PROXIMITY_ALERT_OPTIONS.length;
  proximityFeet = PROXIMITY_ALERT_OPTIONS[nextIndex];
  localStorage.setItem(PROXIMITY_STORAGE_KEY, String(proximityFeet));
  updateModeButtons();
  setActionStatus(proximityFeet > 0 ? `Marker alerts set to ${proximityFeet} ft.` : "Marker alerts off.");
}

function updateHeadingUpMode() {
  const heading = normalizeHeading(lastHeading);
  const enabled = headingUpMode && Number.isFinite(heading);
  if (driveMapShell) {
    driveMapShell.classList.toggle("is-heading-up", enabled);
    driveMapShell.style.setProperty("--drive-map-bearing", enabled ? `${-heading}deg` : "0deg");
    driveMapShell.style.setProperty("--drive-marker-bearing", enabled ? `${heading}deg` : "0deg");
  }
  updateModeButtons();
}

function setHeadingUpMode(enabled) {
  headingUpMode = Boolean(enabled);
  localStorage.setItem(HEADING_UP_STORAGE_KEY, headingUpMode ? "1" : "0");
  updateHeadingUpMode();
  setActionStatus(headingUpMode ? "Heading-up mode on." : "North-up mode on.");
}

function setHudMode(enabled) {
  hudMode = Boolean(enabled);
  localStorage.setItem(HUD_STORAGE_KEY, hudMode ? "1" : "0");
  updateDrivingHud();
  updateModeButtons();
}

function setLowAttentionMode(enabled) {
  lowAttentionMode = Boolean(enabled);
  localStorage.setItem(LOW_ATTENTION_STORAGE_KEY, lowAttentionMode ? "1" : "0");
  updateLowAttentionMode();
  setActionStatus(lowAttentionMode ? "Low attention mode on." : "Full controls restored.");
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator) || document.visibilityState !== "visible") {
    updateModeButtons();
    return false;
  }

  try {
    wakeLockSentinel = await navigator.wakeLock.request("screen");
    wakeLockSentinel.addEventListener("release", () => {
      wakeLockSentinel = null;
      updateModeButtons();
    }, { once: true });
    updateModeButtons();
    return true;
  } catch {
    wakeLockSentinel = null;
    updateModeButtons();
    return false;
  }
}

async function releaseWakeLock() {
  const sentinel = wakeLockSentinel;
  wakeLockSentinel = null;
  if (sentinel) {
    try {
      await sentinel.release();
    } catch {
      // The browser may already have released it.
    }
  }
  updateModeButtons();
}

async function setWakeLockWanted(enabled) {
  wakeLockWanted = Boolean(enabled);
  localStorage.setItem(WAKE_LOCK_STORAGE_KEY, wakeLockWanted ? "1" : "0");
  if (wakeLockWanted) {
    const active = await requestWakeLock();
    setActionStatus(active ? "Screen will stay awake while this page is visible." : "Wake lock unavailable in this browser.");
  } else {
    await releaseWakeLock();
    setActionStatus("Screen wake lock off.");
  }
  updateModeButtons();
}

function updateControlsVisibility() {
  if (!driveMapShell || !driveOverlay || !controlsToggleButton) {
    return;
  }

  driveMapShell.classList.toggle("is-controls-collapsed", controlsCollapsed);
  driveOverlay.hidden = controlsCollapsed;
  controlsToggleButton.textContent = controlsCollapsed ? "Controls" : "Hide";
  controlsToggleButton.setAttribute("aria-expanded", String(!controlsCollapsed));
  controlsToggleButton.setAttribute("aria-label", controlsCollapsed ? "Show drive map controls" : "Hide drive map controls");
}

function setControlsCollapsed(collapsed) {
  controlsCollapsed = Boolean(collapsed);
  localStorage.setItem(CONTROLS_STORAGE_KEY, controlsCollapsed ? "closed" : "open");
  updateControlsVisibility();
  window.requestAnimationFrame(() => map?.invalidateSize());
}

function toggleControls() {
  setControlsCollapsed(!controlsCollapsed);
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
  if (statMarkers) {
    statMarkers.textContent = `${droppedMarkers.length}`;
  }
}

function updateFollowButton() {
  if (!followButton) {
    return;
  }
  followButton.textContent = followMode ? "Follow On" : "Follow Off";
  followButton.setAttribute("aria-pressed", String(followMode));
}

function updateTrackingButton() {
  if (!trackingButton) {
    return;
  }
  trackingButton.textContent = watchId !== null ? "Pause GPS" : "Resume GPS";
}

function setFollowMode(enabled, message = "") {
  followMode = Boolean(enabled);
  updateFollowButton();
  updatePositionPuck();
  if (message) {
    setActionStatus(message);
  }
}

function updateBaseMapButton() {
  if (!baseMapButton) {
    return;
  }
  baseMapButton.textContent = BASE_MAPS[currentBaseMap]?.buttonLabel || "Dark Map";
}

function setBaseMap(mode) {
  if (!map || !window.L || !BASE_MAPS[mode]) {
    return;
  }

  currentBaseMap = mode;
  localStorage.setItem(BASE_MAP_STORAGE_KEY, mode);

  if (tileLayer) {
    tileLayer.remove();
  }

  const config = BASE_MAPS[mode];
  tileLayer = window.L.tileLayer(config.url, config.options).addTo(map);
  tileLayer.setZIndex(1);
  trailLine?.bringToFront?.();
  accuracyRing?.bringToFront?.();
  marker?.bringToFront?.();
  markerLayer?.bringToFront?.();
  updateBaseMapButton();
  setActionStatus(`${config.label} active.`);
}

function toggleBaseMap() {
  setBaseMap(currentBaseMap === "dark" ? "standard" : "dark");
}

function updatePositionPuck() {
  if (!positionPuck) {
    return;
  }

  positionPuck.hidden = !followMode || !lastSnapshot;
}

function getFollowAnchor() {
  if (!mapCanvas) {
    return { x: 0.5, y: 0.5 };
  }

  const styles = getComputedStyle(mapCanvas);
  const x = Number.parseFloat(styles.getPropertyValue("--drive-puck-x")) / 100;
  const y = Number.parseFloat(styles.getPropertyValue("--drive-puck-y")) / 100;
  return {
    x: Number.isFinite(x) ? x : 0.5,
    y: Number.isFinite(y) ? y : 0.5
  };
}

function getAnchoredCenter(latlng, zoom = map?.getZoom()) {
  if (!map || !window.L || !Number.isFinite(zoom)) {
    return latlng;
  }

  const size = map.getSize();
  const anchor = getFollowAnchor();
  const targetPoint = map.project(latlng, zoom);
  const offset = window.L.point((anchor.x - 0.5) * size.x, (anchor.y - 0.5) * size.y);
  return map.unproject(targetPoint.subtract(offset), zoom);
}

function followLatLng(latlng, { animate = false, zoom = map?.getZoom() } = {}) {
  if (!map || !latlng) {
    return;
  }

  const targetZoom = Number.isFinite(zoom) ? zoom : map.getZoom();
  map.setView(getAnchoredCenter(latlng, targetZoom), targetZoom, { animate });
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

  trailLine = window.L.polyline([], {
    color: "#79d4ff",
    weight: 4,
    opacity: 0.9,
    lineJoin: "round"
  }).addTo(map);

  markerLayer = window.L.layerGroup().addTo(map);
  map.setView([39.8283, -98.5795], 4);
  setBaseMap(currentBaseMap);
  const refreshMapSize = () => {
    map?.invalidateSize();
  };

  window.requestAnimationFrame(refreshMapSize);
  window.setTimeout(refreshMapSize, 180);
  window.addEventListener("load", refreshMapSize, { once: true });
  window.addEventListener("pageshow", refreshMapSize);
  window.addEventListener("resize", refreshMapSize);
  window.addEventListener("orientationchange", () => {
    window.setTimeout(refreshMapSize, 180);
  });

  map.on("dragstart", () => {
    if (followMode) {
      setFollowMode(false, "Follow paused while you pan the map.");
    }
  });

  map.on("zoomend", () => {
    if (followMode && marker) {
      followLatLng(marker.getLatLng(), { animate: false });
    }
  });
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
  if (Number.isFinite(heading)) {
    lastHeading = heading;
  }

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
    const targetZoom = firstFix ? 16 : map.getZoom();
    followLatLng(latlng, { zoom: targetZoom, animate: false });
  }
  hasCentered = true;
  updatePositionPuck();

  const detail = `Speed ${formatSpeedMph(speed)} | Heading ${formatHeading(heading)} | Accuracy ${Math.round(accuracy || 0)} m`;
  setStatus("Tracking live location", detail);
  updateStats(lastSnapshot);
  updateDrivingHud(lastSnapshot);
  updateHeadingUpMode();
  checkMarkerProximity(latlng);
  hideManualCopyFallback();
}

function onLocationError(error) {
  const message = error?.message || "Location permission denied or unavailable.";
  setStatus("GPS unavailable", message);
  setActionStatus("Allow location access in Safari to create a live snapshot.");
  updateStats();
  updateDrivingHud();
}

function startTracking() {
  if (!navigator.geolocation) {
    setStatus("Geolocation unsupported", "Your browser cannot provide live GPS location.");
    return;
  }

  if (watchId !== null) {
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
  if (watchId === null || !navigator.geolocation) {
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

function markerLabel(index) {
  return `Marker ${index}`;
}

function buildMarkerPopup(markerEntry) {
  const checkedAt = new Date(markerEntry.timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  return [
    `<strong>${markerLabel(markerEntry.index)}</strong>`,
    `<span>Lat ${formatCoordinate(markerEntry.latitude)}</span>`,
    `<span>Long ${formatCoordinate(markerEntry.longitude)}</span>`,
    `<span>${checkedAt} | ${formatSpeedMph(markerEntry.speed)}</span>`
  ].join("<br>");
}

function signalMarkerFeedback(success = true) {
  if (!navigator.vibrate) {
    return;
  }

  navigator.vibrate(success ? [60, 40, 60] : 120);
}

function showMarkerToast(markerEntry) {
  if (!markerToast || !markerEntry) {
    return;
  }

  showDriveToast(
    `Saved ${markerLabel(markerEntry.index)}`,
    `${formatCoordinate(markerEntry.latitude)}, ${formatCoordinate(markerEntry.longitude)}`
  );
}

function showDriveToast(headline, detail = "") {
  if (!markerToast) {
    return;
  }

  window.clearTimeout(markerToastTimer);
  markerToast.innerHTML = `
    <strong>${headline}</strong>
    ${detail ? `<span>${detail}</span>` : ""}
  `;
  markerToast.hidden = false;
  markerToast.classList.remove("is-hiding");
  markerToastTimer = window.setTimeout(() => {
    markerToast.classList.add("is-hiding");
    markerToastTimer = window.setTimeout(() => {
      markerToast.hidden = true;
      markerToast.classList.remove("is-hiding");
    }, 220);
  }, 2000);
}

function flashProximityAlert() {
  if (!driveMapShell) {
    return;
  }

  window.clearTimeout(proximityFlashTimer);
  driveMapShell.classList.add("is-proximity-alert");
  proximityFlashTimer = window.setTimeout(() => {
    driveMapShell.classList.remove("is-proximity-alert");
  }, 1600);
}

function addMarkerAtSnapshot(snapshot = lastSnapshot) {
  if (!snapshot || !map || !window.L || !markerLayer) {
    setActionStatus("Waiting for GPS before dropping a marker.");
    signalMarkerFeedback(false);
    return;
  }

  const index = droppedMarkers.length + 1;
  const latlng = window.L.latLng(snapshot.latitude, snapshot.longitude);
  const markerEntry = {
    index,
    latitude: snapshot.latitude,
    longitude: snapshot.longitude,
    accuracy: snapshot.accuracy,
    speed: snapshot.speed,
    heading: snapshot.heading,
    timestamp: snapshot.timestamp || Date.now(),
    proximityArmed: false,
    proximityAlerted: false
  };

  const pin = window.L.marker(latlng, {
    keyboard: false,
    title: markerLabel(index),
    icon: window.L.divIcon({
      className: "drive-marker-pin",
      html: `<span>${index}</span>`,
      iconSize: [38, 38],
      iconAnchor: [19, 34],
      popupAnchor: [0, -30]
    })
  }).bindPopup(buildMarkerPopup(markerEntry));

  pin.addTo(markerLayer);
  droppedMarkers.push({ ...markerEntry, pin });
  updateStats();
  signalMarkerFeedback(true);
  showMarkerToast(markerEntry);
  setActionStatus(`${markerLabel(index)} saved: ${formatCoordinate(snapshot.latitude)}, ${formatCoordinate(snapshot.longitude)}`);
}

function undoLastMarker() {
  const markerEntry = droppedMarkers.pop();
  if (!markerEntry) {
    setActionStatus("No marker to undo.");
    signalMarkerFeedback(false);
    return;
  }

  if (markerEntry.pin && markerLayer) {
    markerLayer.removeLayer(markerEntry.pin);
  }
  updateStats();
  signalMarkerFeedback(true);
  setActionStatus(`${markerLabel(markerEntry.index)} removed.`);
}

function clearMarkers() {
  droppedMarkers.length = 0;
  if (markerLayer) {
    markerLayer.clearLayers();
  }
  updateStats();
  setActionStatus("Pins cleared.");
}

function feetToMeters(feet) {
  return feet * 0.3048;
}

function checkMarkerProximity(currentLatLng) {
  if (!map || !currentLatLng || proximityFeet <= 0 || !droppedMarkers.length) {
    return;
  }

  const alertMeters = feetToMeters(proximityFeet);
  const armMeters = alertMeters * 1.75;
  droppedMarkers.forEach((markerEntry) => {
    const markerLatLng = window.L.latLng(markerEntry.latitude, markerEntry.longitude);
    const distanceMeters = map.distance(currentLatLng, markerLatLng);
    if (!markerEntry.proximityArmed && distanceMeters > armMeters) {
      markerEntry.proximityArmed = true;
    }
    if (markerEntry.proximityArmed && !markerEntry.proximityAlerted && distanceMeters <= alertMeters) {
      markerEntry.proximityAlerted = true;
      const distanceFeet = Math.max(0, Math.round(distanceMeters / 0.3048));
      signalMarkerFeedback(true);
      flashProximityAlert();
      showDriveToast(`Near ${markerLabel(markerEntry.index)}`, `${distanceFeet} ft away`);
      setActionStatus(`Near ${markerLabel(markerEntry.index)}: ${distanceFeet} ft away.`);
    }
  });
}

function buildMarkersText() {
  if (!droppedMarkers.length) {
    return "Markers: none";
  }

  return [
    `Markers: ${droppedMarkers.length}`,
    ...droppedMarkers.map((item) =>
      `${markerLabel(item.index)}: ${formatCoordinate(item.latitude)}, ${formatCoordinate(item.longitude)} at ${new Date(item.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
    )
  ].join("\n");
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
    buildMarkersText(),
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
  setFollowMode(true);
  followLatLng(marker.getLatLng(), { animate: true });
  setActionStatus("Following your location at the current zoom.");
}

function toggleFollowMode() {
  setFollowMode(!followMode);
  if (followMode && marker && map) {
    map.panTo(marker.getLatLng(), { animate: true });
    setActionStatus("Follow mode on. Zoom level stays where you set it.");
  } else if (!followMode) {
    setActionStatus("Follow mode off.");
  }
}

function zoomMap(delta) {
  if (!map) {
    return;
  }
  const nextZoom = Math.min(map.getMaxZoom(), Math.max(map.getMinZoom(), map.getZoom() + delta));
  map.setZoom(nextZoom, { animate: true });
  if (followMode && marker) {
    window.setTimeout(() => {
      followLatLng(marker.getLatLng(), { animate: false });
    }, 120);
  }
}

function initActions() {
  trackingButton?.addEventListener("click", () => {
    if (watchId !== null) {
      stopTracking();
    } else {
      startTracking();
      setStatus("Reconnecting to GPS...", "Waiting for a fresh location fix.");
    }
  });

  followButton?.addEventListener("click", () => {
    toggleFollowMode();
  });

  markerButtons.forEach((button) => button.addEventListener("click", () => {
    addMarkerAtSnapshot();
  }));

  undoMarkerButtons.forEach((button) => button.addEventListener("click", () => {
    undoLastMarker();
  }));

  recenterButton?.addEventListener("click", () => {
    recenterMap();
  });

  zoomOutButton?.addEventListener("click", () => {
    zoomMap(-1);
  });

  zoomInButton?.addEventListener("click", () => {
    zoomMap(1);
  });

  compassButton?.addEventListener("click", enableCompass);

  headingUpButton?.addEventListener("click", () => {
    setHeadingUpMode(!headingUpMode);
  });

  hudButton?.addEventListener("click", () => {
    setHudMode(!hudMode);
  });

  baseMapButton?.addEventListener("click", toggleBaseMap);
  controlsToggleButton?.addEventListener("click", toggleControls);

  proximityButton?.addEventListener("click", cycleProximityAlerts);

  wakeLockButton?.addEventListener("click", () => {
    setWakeLockWanted(!wakeLockWanted);
  });

  lowAttentionButton?.addEventListener("click", () => {
    setLowAttentionMode(!lowAttentionMode);
  });

  clearButton?.addEventListener("click", () => {
    clearTrail();
    setStatus("Trail cleared", "Location tracking is still active.");
  });

  clearMarkersButton?.addEventListener("click", clearMarkers);

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
    if (action === "marker") {
      addMarkerAtSnapshot();
    }
    if (action === "undo-marker") {
      undoLastMarker();
    }
    if (action === "follow") {
      toggleFollowMode();
    }
    if (action === "basemap") {
      toggleBaseMap();
    }
  });
}

async function initDriveMap() {
  updateFollowButton();
  updateTrackingButton();
  updateBaseMapButton();
  updatePositionPuck();
  updateControlsVisibility();
  updateModeButtons();
  updateDrivingHud();
  updateHeadingUpMode();
  updateLowAttentionMode();
  updateStats();
  initActions();

  if (compassWanted) {
    startCompassListening();
  }

  if (await ensureMapEngine() && ensureMap()) {
    startTracking();
  }

  if (wakeLockWanted) {
    requestWakeLock();
  }
}

initDriveMap();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && wakeLockWanted && !wakeLockSentinel) {
    requestWakeLock();
  }
});

window.addEventListener("pagehide", () => {
  stopTracking();
  releaseWakeLock();
});
