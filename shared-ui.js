import { searchIndex } from "./search-data.js";
import { nfcTargets } from "./nfc-data.js";
import * as ownerAuth from "./owner-auth.js";
import * as visitorLog from "./visitor-log.js";
import {
  RIDGELINE_OFFLINE_ROUTES,
  buildOfflineRoutePlan as buildSharedOfflineRoutePlan,
  checkOfflineRoutes as checkSharedOfflineRoutes,
  primeOfflineRoutes as primeSharedOfflineRoutes
} from "./offline-routes.js";

const searchButtons = document.querySelectorAll("[data-open-search]");
const topbar = document.querySelector(".topbar");
const topbarActions = document.querySelector(".topbar-actions");
const main = document.querySelector("main");
const nfcTargetId = new URLSearchParams(location.search).get("nfc");
const hasDeepTargetOnLoad = Boolean(location.hash) || Boolean(nfcTargetId);
const CONTENT_MODE_STORAGE_KEY = "ridgeline-content-mode";
const RECENT_NAV_STORAGE_KEY = "ridgeline-recent-nav";
const LAST_SECTION_STORAGE_PREFIX = "ridgeline-last-section:";
const WORK_AREA_STORAGE_KEY = "ridgeline-work-area";
const FAVORITE_PINS_STORAGE_KEY = "ridgeline-favorite-pins";
const LAST_TASK_STORAGE_KEY = "ridgeline-last-task";
const SITE_THEME_STORAGE_KEY = "ridgeline-site-theme";
const BG_INTENSITY_STORAGE_KEY = "ridgeline-bg-intensity";
const HOME_COCKPIT_LAYOUT_STORAGE_KEY = "ridgeline-home-cockpit-layout";
const RECENT_SEARCH_STORAGE_KEY = "ridgeline-recent-searches";
const MOTION_MODE_CLASSES = ["motion-rich", "motion-standard", "motion-economy", "motion-off"];
const prefersCompactDefault =
  window.matchMedia("(max-width: 900px)").matches || window.matchMedia("(pointer: coarse)").matches;
const isMobileNavMode = prefersCompactDefault;

let currentContentMode = prefersCompactDefault ? "essential" : "full";
let optionalSections = [];
let navOnlySections = [];
let viewModeButtons = [];
let navActionButtons = [];
let fullSearchIndexPromise = null;
let fullSearchIndexCache = null;
let memoryWriteObserver = null;
let currentSiteTheme = localStorage.getItem(SITE_THEME_STORAGE_KEY) === "light" ? "light" : "dark";
let currentBackgroundIntensity = ["subtle", "balanced", "cinematic"].includes(localStorage.getItem(BG_INTENSITY_STORAGE_KEY))
  ? localStorage.getItem(BG_INTENSITY_STORAGE_KEY)
  : "balanced";
let lastRenderedSearchResults = [];
let deferredInstallPrompt = null;
let liveActiveSectionId = location.hash.replace(/^#/, "");
let activeNavSyncFrame = 0;

const MEMORY_WRITE_SELECTORS = [
  "[data-notes-form] input",
  "[data-notes-form] textarea",
  "[data-notes-form] select",
  "[data-tracker-form] input",
  "[data-tracker-form] textarea",
  "[data-tracker-form] select",
  "[data-profile-form] input",
  "[data-profile-form] textarea",
  "[data-profile-form] select",
  "[data-area-form] input",
  "[data-area-form] textarea",
  "[data-area-form] select",
  "[data-photo-input]",
  "[data-area-photo-input]",
  "[data-remove-area-photo]",
  "[data-import-garage-backup]",
  "[data-choose-garage-backup]",
  "[data-restore-garage-backup]",
  "[data-garage-backup-quick='choose']",
  "[data-garage-backup-quick='restore']",
  "[data-cloud-sync-retry]",
  "[data-append-job-note]",
  "[data-quick-log-button]",
  "[data-save-service-prep]",
  "[data-save-open-service-staging]",
  "[data-save-minder-note]",
  "[data-save-open-minder-staging]",
  "[data-save-diagnostic-note]",
  "[data-save-diagnostic-checks]",
  "[data-save-roadside-note]",
  "[data-save-roadside-contact]",
  "[data-save-roadside-session]",
  "[data-save-fuse-note]",
  "[data-save-fuse-pull]",
  "[data-save-saved-fuses]",
  "[data-save-fuse]",
  "[data-save-tow-light]",
  "[data-save-tow-setup]",
  "[data-save-tire-handoff]",
  "[data-save-tire-recheck]",
  "[data-save-tire-pressure]",
  "[data-save-maintenance-needed-inline]",
  "[data-save-maintenance-run-inline]",
  "[data-save-maintenance-needed-index]",
  "[data-maintenance-final-parts-save]",
  "[data-maintenance-custom-staging-remove]",
  "[data-remove-photo]",
  "[data-remove-favorite]",
  "[data-remove-pin]",
  "[data-save-sync-settings]",
  "[data-sync-enabled]",
  "[data-github-backup-endpoint]",
  "[data-quick-capture-form] input",
  "[data-quick-capture-form] textarea",
  "[data-quick-capture-form] select",
  "[data-quick-capture-form] button[type='submit']",
  "[data-anton-action]",
  "[data-anton-settings]",
  "[data-anton-note-form] textarea",
  "[data-anton-note-form] button[type='submit']",
  "[data-anton-signoff-choice]",
  "[data-anton-signoff-note]",
  "[data-anton-save-signoff]"
];

const workAreas = [
  {
    id: "all",
    label: "All",
    title: "All Truck Areas",
    links: [
      { label: "Vehicle Map", href: "index.html#viewer" },
      { label: "Search", action: "search" },
      { label: "Maintenance", href: "maintenance.html" }
    ]
  },
  {
    id: "engine",
    label: "Engine Bay",
    title: "Working On Engine Bay",
    links: [
      { label: "Engine Model", href: "engine.html#engine-model" },
      { label: "Oil Service", href: "maintenance.html#oil-service" },
      { label: "Hood Fuses", href: "hood.html#fuses" }
    ]
  },
  {
    id: "cabin",
    label: "Cabin",
    title: "Working On Cabin",
    links: [
      { label: "Cabin Fuses", href: "cabin.html#fuses" },
      { label: "Diagnostics", href: "diagnostics.html" },
      { label: "NFC Tags", href: "nfc.html" }
    ]
  },
  {
    id: "wheels",
    label: "Wheels",
    title: "Working On Wheels",
    links: [
      { label: "Tire Lab", href: "tires.html" },
      { label: "Jack Points", href: "index.html?system=jack-points#viewer" },
      { label: "Brake/Tire", href: "maintenance.html#brake-tire" }
    ]
  },
  {
    id: "cargo",
    label: "Cargo",
    title: "Working On Cargo",
    links: [
      { label: "Cargo", href: "cargo.html" },
      { label: "Photo Atlas", href: "photo-atlas.html" },
      { label: "Garage Notes", href: "garage.html#notes" }
    ]
  },
  {
    id: "hitch",
    label: "Hitch",
    title: "Working On Hitch",
    links: [
      { label: "Pinout", href: "rear-hitch.html#pinout" },
      { label: "Diagnostics", href: "diagnostics.html" },
      { label: "Emergency", href: "quick-sheet.html#emergency-card" }
    ]
  }
];

function getAdaptiveMotionMode() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return "off";
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) {
    return "standard";
  }

  if (connection.saveData) {
    return "off";
  }

  const effectiveType = `${connection.effectiveType || ""}`.toLowerCase();
  if (effectiveType === "slow-2g" || effectiveType === "2g") {
    return "off";
  }

  if (effectiveType === "3g") {
    return "economy";
  }

  const downlink = Number(connection.downlink || 0);
  const rtt = Number(connection.rtt || 0);
  const highQualityConnection =
    effectiveType === "4g" &&
    (downlink >= 4 || downlink === 0) &&
    (rtt <= 180 || rtt === 0);

  return highQualityConnection ? "rich" : "standard";
}

function applyAdaptiveMotionMode() {
  if (!document.body) {
    return;
  }

  const mode = getAdaptiveMotionMode();
  document.body.classList.remove(...MOTION_MODE_CLASSES);
  document.documentElement.classList.remove(...MOTION_MODE_CLASSES);
  document.body.classList.add(`motion-${mode}`);
  document.documentElement.classList.add(`motion-${mode}`);
  document.body.dataset.motionMode = mode;
  document.documentElement.dataset.motionMode = mode;
}

applyAdaptiveMotionMode();

const connectionForMotion = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
connectionForMotion?.addEventListener?.("change", applyAdaptiveMotionMode);
window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", applyAdaptiveMotionMode);

function applySiteTheme(theme = "dark") {
  currentSiteTheme = theme === "light" ? "light" : "dark";
  document.body?.setAttribute("data-site-theme", currentSiteTheme);
  document.documentElement?.setAttribute("data-site-theme", currentSiteTheme);
  const themeMeta = document.querySelector("meta[name='theme-color']");
  if (themeMeta) {
    themeMeta.setAttribute("content", currentSiteTheme === "light" ? "#f3f7fb" : "#071019");
  }
}

function commitSiteTheme(theme) {
  localStorage.setItem(SITE_THEME_STORAGE_KEY, theme);
  applySiteTheme(theme);
  window.dispatchEvent(
    new CustomEvent("ridgeline:theme-change", {
      detail: { theme }
    })
  );
  showToast(theme === "light" ? "Light theme on." : "Dark theme on.");
}

function applyBackgroundIntensity(level = "balanced") {
  currentBackgroundIntensity = ["subtle", "balanced", "cinematic"].includes(level)
    ? level
    : "balanced";
  document.body?.setAttribute("data-bg-intensity", currentBackgroundIntensity);
  document.documentElement?.setAttribute("data-bg-intensity", currentBackgroundIntensity);
}

function commitBackgroundIntensity(level) {
  localStorage.setItem(BG_INTENSITY_STORAGE_KEY, level);
  applyBackgroundIntensity(level);
  window.dispatchEvent(
    new CustomEvent("ridgeline:bg-intensity-change", {
      detail: { level }
    })
  );
  showToast(`Background ${level}.`);
}

function cycleBackgroundIntensity() {
  const levels = ["subtle", "balanced", "cinematic"];
  const currentIndex = levels.indexOf(currentBackgroundIntensity);
  const nextLevel = levels[(currentIndex + 1 + levels.length) % levels.length];
  commitBackgroundIntensity(nextLevel);
}

function toggleSiteTheme() {
  const nextTheme = currentSiteTheme === "light" ? "dark" : "light";
  const supportsViewTransitions =
    typeof document.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (supportsViewTransitions) {
    document.startViewTransition(() => {
      commitSiteTheme(nextTheme);
    });
    return;
  }

  commitSiteTheme(nextTheme);
}

applySiteTheme(currentSiteTheme);
applyBackgroundIntensity(currentBackgroundIntensity);

function bindPress(target, handler) {
  if (!target || typeof handler !== "function") {
    return;
  }
  target.addEventListener("click", (event) => {
    handler(event);
  });
}

function setPanelVisibility(panel, visible, displayValue = "grid") {
  if (!panel) {
    return;
  }
  panel.hidden = !visible;
  panel.style.display = visible ? displayValue : "none";
  panel.setAttribute("aria-hidden", visible ? "false" : "true");
}

function restoreFocusTo(element) {
  if (element instanceof HTMLElement && document.contains(element)) {
    element.focus();
  }
}

function getFocusableElements(container) {
  if (!container) {
    return [];
  }

  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  return [...container.querySelectorAll(selector)].filter((element) => {
    const style = window.getComputedStyle(element);
    return (
      element instanceof HTMLElement &&
      !element.hidden &&
      !element.closest("[hidden]") &&
      element.tabIndex >= 0 &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  });
}

function focusFirstIn(container, preferredSelector = "") {
  const preferred = preferredSelector ? container?.querySelector(preferredSelector) : null;
  if (preferred instanceof HTMLElement && !preferred.disabled) {
    preferred.focus();
    if (typeof preferred.select === "function") {
      preferred.select();
    }
    return preferred;
  }

  const [first] = getFocusableElements(container);
  first?.focus();
  return first || null;
}

function keepFocusInside(container, event) {
  if (event.key !== "Tab" || !container || container.hidden) {
    return;
  }

  const focusable = getFocusableElements(container);
  if (!focusable.length) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
    return;
  }

  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function bindFocusTrap(container) {
  container?.addEventListener("keydown", (event) => keepFocusInside(container, event));
}

function isAnyModalOpen() {
  return [
    ".search-modal",
    "#site-menu",
    ".command-palette",
    ".quick-capture-modal",
    ".sync-settings-modal",
    ".mini-tools-drawer"
  ].some((selector) => document.querySelector(selector)?.hidden === false);
}

function normalizeContentMode(mode) {
  if (mode === "navigation") {
    return "navigation";
  }
  if (mode === "essential") {
    return "essential";
  }
  return "full";
}

function normalizeRecentHref(value = "") {
  try {
    const url = new URL(value, location.href);
    if (url.origin !== location.origin) {
      return value;
    }
    return `${url.pathname.split("/").pop() || "index.html"}${url.search || ""}${url.hash || ""}`;
  } catch {
    return value;
  }
}

function loadRecentNav() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_NAV_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentNav(items) {
  localStorage.setItem(RECENT_NAV_STORAGE_KEY, JSON.stringify(items));
}

function showToast(message, tone = "info") {
  if (!message) {
    return;
  }

  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
  }

  const toast = document.createElement("div");
  toast.className = `toast-message toast-${tone}`;
  toast.textContent = message;
  stack.appendChild(toast);

  window.setTimeout(() => toast.classList.add("is-leaving"), 2400);
  window.setTimeout(() => toast.remove(), 2900);
}

function saveLastTask(task = {}, announce = false) {
  if (!task.href || !task.label) {
    return;
  }

  const next = {
    href: normalizeRecentHref(task.href),
    label: `${task.label}`.trim(),
    kind: task.kind || "page",
    at: task.at || new Date().toISOString()
  };
  localStorage.setItem(LAST_TASK_STORAGE_KEY, JSON.stringify(next));
  if (announce) {
    showToast(`Saved ${next.label} as your last task`);
  }
}

function getLastTask() {
  try {
    return JSON.parse(localStorage.getItem(LAST_TASK_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function restoreLastTask() {
  const task = getLastTask();
  if (!task?.href) {
    showToast("No last task saved yet", "warning");
    return;
  }

  showToast(`Opening ${task.label}`);
  window.location.href = task.href;
}

function currentLocationHref() {
  return `${currentPageName()}${location.search || ""}${location.hash || ""}`;
}

function copyText(value) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  return Promise.resolve();
}

function copyCurrentLocation() {
  const url = new URL(currentLocationHref(), location.href).href;
  copyText(url)
    .then(() => showToast("Copied this location"))
    .catch(() => showToast("Could not copy link", "warning"));
}

function shareCurrentLocation() {
  const url = new URL(currentLocationHref(), location.href).href;
  const title = document.title || "Ridgeline Service Console";
  const text = `Open ${currentPageDisplayLabel()} in the Ridgeline site.`;

  if (navigator.share) {
    navigator.share({ title, text, url })
      .then(() => showToast("Shared from your phone"))
      .catch((error) => {
        if (error?.name === "AbortError") {
          return;
        }
        copyText(url)
          .then(() => showToast("Share unavailable, copied link instead"))
          .catch(() => showToast("Could not share or copy link", "warning"));
      });
    return;
  }

  copyText(url)
    .then(() => showToast("Share unavailable, copied link instead"))
    .catch(() => showToast("Could not copy link", "warning"));
}

function installHelpMode() {
  if (isStandaloneLaunch()) {
    return "installed";
  }
  if (deferredInstallPrompt) {
    return "prompt";
  }
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua)) {
    return "ios";
  }
  return "manual";
}

function recordRecentNavEntry({ href, label }) {
  if (!href || !label) {
    return;
  }

  const normalizedHref = normalizeRecentHref(href);
  const current = loadRecentNav();
  const next = [
    { href: normalizedHref, label: `${label}`.trim(), at: new Date().toISOString() },
    ...current.filter((item) => item.href !== normalizedHref)
  ].slice(0, 8);
  saveRecentNav(next);
  saveLastTask({ href: normalizedHref, label, kind: "page" });
}

function currentPageDisplayLabel() {
  const page = currentPageName();
  const known = menuLinks.find((link) => link.match === page);
  if (known) {
    return known.label;
  }
  return document.querySelector("h1")?.textContent?.trim() || "Page";
}

function buildRecentNavMarkup() {
  const items = loadRecentNav().slice(0, 5);
  if (!items.length) {
    return `<p class="site-menu-tool-status">No recent pages yet.</p>`;
  }

  return items
    .map((item) => `<a class="site-menu-tool-link" href="${item.href}">${item.label}</a>`)
    .join("");
}

function refreshRecentPanel(panel) {
  if (!panel) {
    return;
  }

  panel.innerHTML = buildRecentNavMarkup();
}

function getSavedWorkArea() {
  const saved = localStorage.getItem(WORK_AREA_STORAGE_KEY) || "all";
  return workAreas.some((area) => area.id === saved) ? saved : "all";
}

function getWorkArea(id = getSavedWorkArea()) {
  return workAreas.find((area) => area.id === id) || workAreas[0];
}

function setWorkArea(id) {
  const area = getWorkArea(id);
  localStorage.setItem(WORK_AREA_STORAGE_KEY, area.id);
  document.body.dataset.workArea = area.id;
  window.dispatchEvent(new CustomEvent("ridgeline:work-area", { detail: { area } }));
  return area;
}

function lastSectionStorageKey() {
  return `${LAST_SECTION_STORAGE_PREFIX}${currentPageName()}`;
}

function saveLastSection(sectionId) {
  if (!sectionId) {
    return;
  }
  localStorage.setItem(lastSectionStorageKey(), sectionId);
}

function getLastSection() {
  return localStorage.getItem(lastSectionStorageKey()) || "";
}

if (nfcTargetId) {
  document.body?.classList.add("nfc-deep-link");
}

function stripLiveRefreshParam() {
  const url = new URL(location.href);
  if (!url.searchParams.has("__live")) {
    return;
  }

  url.searchParams.delete("__live");
  const next = `${url.pathname}${url.search}${url.hash}`;
  history.replaceState({}, "", next);
}

function keepPlainPageLoadsAtTop() {
  if (location.hash || new URLSearchParams(location.search).has("nfc")) {
    return;
  }

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  const resetOpeningScroll = () => {
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;

    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.scrollTop = 0;
    document.body.scrollTop = 0;
    root.style.scrollBehavior = previousScrollBehavior;
  };

  let openingScrollLockReleased = false;
  let openingScrollLockTimer = null;
  let openingScrollLockInterval = null;

  const releaseOpeningScrollLock = () => {
    if (openingScrollLockReleased) {
      return;
    }

    openingScrollLockReleased = true;
    clearTimeout(openingScrollLockTimer);
    clearInterval(openingScrollLockInterval);
    window.removeEventListener("pointerdown", releaseOpeningScrollLock, true);
    window.removeEventListener("touchstart", releaseOpeningScrollLock, true);
    window.removeEventListener("wheel", releaseOpeningScrollLock, true);
    window.removeEventListener("keydown", releaseOpeningScrollLock, true);
  };

  const enforceTopUntilInteraction = () => {
    if (openingScrollLockReleased) {
      return;
    }

    if (window.scrollY > 2 || document.documentElement.scrollTop > 2 || document.body.scrollTop > 2) {
      resetOpeningScroll();
    }
  };

  resetOpeningScroll();
  requestAnimationFrame(resetOpeningScroll);
  window.addEventListener("load", () => {
    resetOpeningScroll();
    setTimeout(resetOpeningScroll, 100);
    setTimeout(resetOpeningScroll, 400);
  });
  window.addEventListener("pageshow", resetOpeningScroll);
  window.addEventListener("pointerdown", releaseOpeningScrollLock, true);
  window.addEventListener("touchstart", releaseOpeningScrollLock, true);
  window.addEventListener("wheel", releaseOpeningScrollLock, true);
  window.addEventListener("keydown", releaseOpeningScrollLock, true);
  openingScrollLockInterval = window.setInterval(enforceTopUntilInteraction, 70);
  openingScrollLockTimer = window.setTimeout(releaseOpeningScrollLock, 1600);
}

keepPlainPageLoadsAtTop();
stripLiveRefreshParam();

const menuLinks = [
  { label: "Vehicle Map", href: "index.html#viewer", match: "index.html", note: "3D truck viewer and interactive zones" },
  { label: "Drive Map", href: "drive-map.html", match: "drive-map.html", note: "Full-screen live map with GPS tracking while driving" },
  { label: "Engine Explorer", href: "engine.html", match: "engine.html", note: "Interactive J35Y6 technical engine model" },
  { label: "Tire And Wheel Lab", href: "tires.html", match: "tires.html", note: "3D tire model, wheel specs, and fitment guidance" },
  { label: "NFC Tags", href: "nfc.html", match: "nfc.html", note: "Program truck tags that open exact pages and diagrams" },
  { label: "NFC Landing", href: "nfc-landing.html?target=vehicle-map", match: "nfc-landing.html", note: "Scanned tag landing page with Garage note handoff" },
  { label: "AR Lab", href: "ar-lab.html", match: "ar-lab.html", note: "Open the truck model in AR or 3D" },
  { label: "Photo Atlas", href: "photo-atlas.html", match: "photo-atlas.html", note: "Real truck area photos grouped by zone" },
  { label: "Fuse Boxes", href: "hood.html#fuses", match: "hood.html", note: "Under-hood and driver-left fuse references" },
  { label: "Cabin", href: "cabin.html#fuses", match: "cabin.html", note: "Interior fuse and electronics section" },
  { label: "Cargo", href: "cargo.html", match: "cargo.html", note: "Bed, trunk, and dimensions" },
  { label: "Towing", href: "rear-hitch.html", match: "rear-hitch.html", note: "Connector, pinout, and towing checklist" },
  { label: "Maintenance", href: "maintenance.html", match: "maintenance.html", note: "Oil, filters, service codes, brakes, tires, and fluids" },
  { label: "Emergency Card", href: "quick-sheet.html#emergency-card", match: "quick-sheet.html", note: "Critical specs and links for roadside or garage work" },
  { label: "Diagnostics", href: "diagnostics.html", match: "diagnostics.html", note: "Symptom-based troubleshooting shortcuts" },
  { label: "Garage Log", href: "garage.html", match: "garage.html", note: "Your notes, service history, and saved references" },
  { label: "Ask Anton", href: "ask-anton.html", match: "ask-anton.html", note: "Ridgeline Q&A with local grounding and web search" },
  { label: "Anton Console", href: "anton.html", match: "anton.html", note: "Agent instructions, notes, history, and controls" }
];

function currentPageName() {
  const page = location.pathname.split("/").pop();
  return page || "index.html";
}

function ensureIndexViewerFirst() {
  if (currentPageName() !== "index.html" || !main) {
    return;
  }

  const viewerSection = main.querySelector("#viewer");
  if (!viewerSection) {
    return;
  }

  if (main.firstElementChild !== viewerSection) {
    main.insertBefore(viewerSection, main.firstElementChild);
  }

  const viewerLayout = viewerSection.querySelector(":scope > .viewer-layout");
  const homeViewerHeader = viewerSection.querySelector(":scope > .home-viewer-header");
  if (viewerLayout instanceof HTMLElement && homeViewerHeader instanceof HTMLElement) {
    viewerSection.insertBefore(viewerLayout, homeViewerHeader);
  }

  const routeStrip = document.querySelector(".route-strip");
  if (routeStrip instanceof HTMLElement && routeStrip.parentElement !== main) {
    main.insertBefore(routeStrip, viewerSection.nextElementSibling);
  }
}

function getSavedHomeCockpitLayout() {
  const savedLayout = localStorage.getItem(HOME_COCKPIT_LAYOUT_STORAGE_KEY);
  return ["dashboard", "shortcuts", "logbook"].includes(savedLayout) ? savedLayout : "dashboard";
}

function applyHomeCockpitLayout(layout, persist = true) {
  if (currentPageName() !== "index.html" || !document.body) {
    return;
  }

  const nextLayout = ["dashboard", "shortcuts", "logbook"].includes(layout) ? layout : "dashboard";
  document.body.dataset.homeCockpitLayout = nextLayout;
  if (persist) {
    localStorage.setItem(HOME_COCKPIT_LAYOUT_STORAGE_KEY, nextLayout);
  }

  document.querySelectorAll("[data-home-layout]").forEach((button) => {
    const isActive = button.dataset.homeLayout === nextLayout;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function bindHomeCockpitLayoutControls() {
  if (currentPageName() !== "index.html") {
    return;
  }

  const cockpitPanel = document.querySelector("[data-home-cockpit-panel]");
  if (!cockpitPanel || cockpitPanel.dataset.homeCockpitBound === "true") {
    return;
  }

  cockpitPanel.dataset.homeCockpitBound = "true";
  cockpitPanel.querySelectorAll("[data-home-layout]").forEach((button) => {
    button.addEventListener("click", () => applyHomeCockpitLayout(button.dataset.homeLayout));
  });

  applyHomeCockpitLayout(getSavedHomeCockpitLayout(), false);
}

function isStandaloneLaunch() {
  const displayStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = window.navigator.standalone === true;
  return Boolean(displayStandalone || iosStandalone);
}

function maybeForceIndexHomeOnStandaloneLaunch() {
  if (!isStandaloneLaunch()) {
    return;
  }

  const page = currentPageName();
  if (page === "index.html") {
    return;
  }

  const params = new URLSearchParams(location.search);
  const hasDeepContext =
    Boolean(location.hash) ||
    params.has("nfc") ||
    params.has("system") ||
    params.has("part") ||
    params.has("section");
  if (hasDeepContext) {
    return;
  }

  // If user navigated from another page within this same app, keep their intent.
  let internalReferrer = false;
  try {
    if (document.referrer) {
      const referrer = new URL(document.referrer);
      internalReferrer = referrer.origin === location.origin;
    }
  } catch {}

  if (internalReferrer) {
    return;
  }

  location.replace("index.html");
}

maybeForceIndexHomeOnStandaloneLaunch();
ensureIndexViewerFirst();

function inferRepositoryUrl() {
  if (location.hostname.endsWith(".github.io")) {
    const owner = location.hostname.replace(".github.io", "");
    const repo = location.pathname.split("/").filter(Boolean)[0];
    if (owner && repo) {
      return `https://github.com/${owner}/${repo}`;
    }
  }

  return "https://github.com/VicenteDiazS/Ridgeline";
}

function buildLiveReloadUrl() {
  const url = new URL(location.href);
  url.searchParams.set("__live", `${Date.now()}`);
  return url.toString();
}

function getSavedContentMode() {
  if (hasDeepTargetOnLoad) {
    return "full";
  }

  const page = currentPageName();
  if (page === "hood.html" || page === "cabin.html") {
    return "full";
  }

  const saved = localStorage.getItem(CONTENT_MODE_STORAGE_KEY);
  if (saved === "essential" || saved === "full" || saved === "navigation") {
    return normalizeContentMode(saved);
  }

  return "full";
}

function collectOptionalSections() {
  if (!main) {
    return [];
  }

  const sections = [...main.querySelectorAll(":scope > section")];
  if (sections.length < 3) {
    return [];
  }

  const page = currentPageName();
  const keepCount = page === "index.html" ? 2 : 3;
  return sections.filter((section, index) => index >= keepCount);
}

function collectNavigationOnlySections() {
  if (!main) {
    return [];
  }

  const sections = [...main.querySelectorAll(":scope > section")];
  if (sections.length < 2) {
    return [];
  }

  return sections.filter((section, index) => index >= 1);
}

function setContentMode(mode = "full", persist = true) {
  currentContentMode = normalizeContentMode(mode);
  document.body.classList.toggle("essential-mode", currentContentMode === "essential");
  document.body.classList.toggle("nav-only-mode", currentContentMode === "navigation");

  optionalSections.forEach((section) => section.classList.add("is-optional-section"));
  navOnlySections.forEach((section) => section.classList.add("is-nav-only-section"));

  const allManagedSections = new Set([...optionalSections, ...navOnlySections]);
  allManagedSections.forEach((section) => {
    const hideForEssential = currentContentMode === "essential" && section.classList.contains("is-optional-section");
    const hideForNavigation = currentContentMode === "navigation" && section.classList.contains("is-nav-only-section");
    section.hidden = hideForEssential || hideForNavigation;
  });

  viewModeButtons.forEach((button) => {
    const isActive = button.dataset.contentMode === currentContentMode;
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  navActionButtons.forEach((button) => {
    const isActive = currentContentMode === "navigation";
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.classList.toggle("is-active", isActive);
    button.textContent = isActive ? "Full" : "Nav";
    button.title = isActive ? "Return to full page view" : "Switch to navigation view";
    button.setAttribute("aria-label", button.title);
  });

  if (persist) {
    localStorage.setItem(CONTENT_MODE_STORAGE_KEY, currentContentMode);
  }
}

function getSubpageIntroAnchor() {
  return (
    document.querySelector(
      "main .section-page-hero, main .section-page-main, main .engine-page-main, main .wheel-page-main, main .nfc-page-main, main .nfc-landing-main"
    ) || document.querySelector("main > section, main > article")
  );
}

function insertSubpageIntroTool(element) {
  if (!element) {
    return false;
  }

  const introTools = main ? [...main.querySelectorAll(":scope > .subpage-intro-tool")] : [];
  const anchor = introTools.at(-1) || getSubpageIntroAnchor();
  if (!anchor) {
    return false;
  }

  element.classList.add("subpage-intro-tool");
  anchor.insertAdjacentElement("afterend", element);
  return true;
}

function buildViewModeRail() {
  if (!topbar || !main || document.querySelector(".view-mode-rail") || !isMobileNavMode) {
    return;
  }

  optionalSections = collectOptionalSections();
  navOnlySections = collectNavigationOnlySections();
  if (!optionalSections.length && !navOnlySections.length) {
    return;
  }

  const rail = document.createElement("div");
  rail.className = "view-mode-rail";
  rail.setAttribute("role", "group");
  rail.setAttribute("aria-label", "Page view mode");
  rail.innerHTML = `
    <span>View</span>
    <button class="view-mode-button" type="button" data-content-mode="navigation" aria-pressed="false">Navigation</button>
    <button class="view-mode-button" type="button" data-content-mode="essential" aria-pressed="false">Essentials</button>
    <button class="view-mode-button" type="button" data-content-mode="full" aria-pressed="false">All Content</button>
  `;

  const isIndexPage = currentPageName() === "index.html";
  const indexLeadSection = isIndexPage ? document.querySelector("main > section:first-child") : null;
  const quickActionBar = document.querySelector(".quick-action-bar");
  if (isIndexPage && indexLeadSection) {
    indexLeadSection.insertAdjacentElement("afterend", rail);
  } else if (quickActionBar) {
    quickActionBar.insertAdjacentElement("afterend", rail);
  } else if (insertSubpageIntroTool(rail)) {
    // Keep subpage titles as the first content after the header.
  } else {
    topbar.insertAdjacentElement("afterend", rail);
  }

  viewModeButtons = [...rail.querySelectorAll(".view-mode-button")];
  viewModeButtons.forEach((button) => {
    bindPress(button, () => {
      setContentMode(button.dataset.contentMode, true);
    });
  });
}

async function refreshServiceWorkerRegistrations() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map(async (registration) => {
      try {
        await registration.update();
      } catch {}

      if (registration.waiting) {
        registration.waiting.postMessage({ type: "RIDGELINE_SKIP_WAITING" });
      }
    })
  );
}

async function clearBrowserCaches() {
  if (!("caches" in window)) {
    return;
  }

  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

async function triggerLiveRefresh(setStatus) {
  setStatus("Refreshing saved data from Supabase and backup hooks...");

  try {
    const garageData = await import("./garage-data.js");
    await garageData.refreshGarageBackups();
  } catch {}

  setStatus("Refreshing with live network code...");

  try {
    await refreshServiceWorkerRegistrations();
    await clearBrowserCaches();
    navigator.serviceWorker?.controller?.postMessage({ type: "RIDGELINE_BYPASS_NEXT_NAV" });
  } catch {}

  location.replace(buildLiveReloadUrl());
}

function openInlineNavigation() {
  const mobileNav = document.querySelector(".mobile-nav-accordion");
  if (mobileNav) {
    const pagesToggle = mobileNav.querySelector("[data-mobile-nav-toggle='pages']");
    const pagesPanel = mobileNav.querySelector("[data-mobile-nav-panel='pages']");
    if (pagesToggle && pagesPanel?.hidden) {
      pagesToggle.click();
    }
    scrollToSectionElement(mobileNav, "smooth");
    return;
  }

  const viewRail = document.querySelector(".view-mode-rail");
  if (viewRail) {
    scrollToSectionElement(viewRail, "smooth");
    return;
  }

  if (main?.firstElementChild) {
    scrollToSectionElement(main.firstElementChild, "smooth");
  }
}

function toggleNavigationMode() {
  const enteringNavigation = currentContentMode !== "navigation";
  setContentMode(enteringNavigation ? "navigation" : "full", true);

  if (enteringNavigation) {
    openInlineNavigation();
    return;
  }

  if (main?.firstElementChild) {
    scrollToSectionElement(main.firstElementChild, "smooth");
  }
}

function buildUniversalHeaderActions() {
  if (!topbarActions) {
    return;
  }

  const actions = [
    {
      key: "ask",
      label: "Ask Anton",
      href: "ask-anton.html#ask-anton-chat",
      icon: "ask",
      aria: "Open Ask Anton assistant",
      title: "Ask Anton"
    },
    {
      key: "map",
      label: "Map",
      href: "index.html#viewer",
      icon: "map",
      aria: "Open vehicle map",
      title: "Vehicle map"
    },
    {
      key: "drive",
      label: "Drive",
      href: "drive-map.html",
      icon: "map",
      aria: "Open drive tracking map",
      title: "Drive map"
    },
    {
      key: "service",
      label: "Service",
      href: "maintenance.html",
      icon: "wrench",
      aria: "Open service page",
      title: "Service"
    },
    {
      key: "garage",
      label: "Garage",
      href: "garage.html",
      icon: "garage",
      aria: "Open garage page",
      title: "Garage"
    }
  ];

  const searchButton = topbarActions.querySelector("[data-open-search]");
  actions.forEach((action) => {
    if (topbarActions.querySelector(`[data-header-action="${action.key}"]`)) {
      return;
    }

    const existingLink = Array.from(topbarActions.querySelectorAll("a[href]")).find((link) => (
      normalizeRecentHref(link.getAttribute("href")) === normalizeRecentHref(action.href)
    ));
    if (existingLink) {
      existingLink.classList.add("header-nav-button");
      existingLink.dataset.headerAction = action.key;
      existingLink.dataset.navIcon = existingLink.dataset.navIcon || action.icon;
      if (action.key === "ask") {
        existingLink.classList.add("header-nav-button-ask");
        existingLink.textContent = action.label;
      }
      existingLink.setAttribute("aria-label", existingLink.getAttribute("aria-label") || action.aria);
      existingLink.title = existingLink.title || action.title;
      return;
    }

    const link = document.createElement("a");
    link.className = "header-nav-button";
    if (action.key === "ask") {
      link.classList.add("header-nav-button-ask");
    }
    link.href = action.href;
    link.dataset.headerAction = action.key;
    link.dataset.navIcon = action.icon;
    link.setAttribute("aria-label", action.aria);
    link.title = action.title;
    link.textContent = action.label;
    topbarActions.insertBefore(link, searchButton || null);
  });

  if (!topbarActions.querySelector("[data-open-site-menu]")) {
    const moreButton = document.createElement("button");
    moreButton.className = "header-nav-button header-more-button";
    moreButton.type = "button";
    moreButton.dataset.openSiteMenu = "true";
    moreButton.dataset.navIcon = "menu";
    moreButton.setAttribute("aria-label", "Open full site menu");
    moreButton.title = "Full menu";
    moreButton.textContent = "More";
    topbarActions.appendChild(moreButton);
  }

  if (topbar && !topbar.querySelector(".header-current-page")) {
    const currentPage = document.createElement("a");
    currentPage.className = "header-current-page is-current-link";
    currentPage.href = currentLocationHref();
    currentPage.setAttribute("aria-current", "page");
    currentPage.setAttribute("aria-label", `Current page: ${currentPageDisplayLabel()}`);
    currentPage.innerHTML = `
      <span data-header-current-kicker>Current</span>
      <strong data-header-page-label>${currentPageDisplayLabel()}</strong>
      <small data-header-section-label hidden></small>
    `;
    topbar.insertBefore(currentPage, topbarActions);

    window.addEventListener("ridgeline:active-section", (event) => {
      const label = `${event.detail?.label || ""}`.trim();
      const id = `${event.detail?.id || ""}`.trim();
      if (!label || !id) {
        return;
      }

      const sectionLabel = currentPage.querySelector("[data-header-section-label]");
      const kicker = currentPage.querySelector("[data-header-current-kicker]");
      const index = Number(event.detail?.index || 0);
      const total = Number(event.detail?.total || 0);
      const progress = index > 0 && total > 1 ? `${index}/${total} ` : "";
      sectionLabel.textContent = `${progress}${label}`;
      sectionLabel.hidden = false;
      if (kicker) {
        kicker.textContent = "Viewing";
      }
      currentPage.href = `${currentPageName()}${location.search || ""}#${id}`;
      currentPage.setAttribute("aria-label", `Viewing ${label} on ${currentPageDisplayLabel()}`);
    });
  }
}

function buildTopbarLiveRefreshButton() {
  if (!topbarActions || document.querySelector("[data-live-refresh-button]")) {
    return null;
  }

  const button = document.createElement("button");
  button.className = "live-refresh-button";
  button.type = "button";
  button.dataset.liveRefreshButton = "true";
  button.textContent = "Refresh";
  button.title = "Reload fresh saved data and code";
  button.setAttribute("aria-label", "Reload fresh saved data and code");

  const searchButton = topbarActions.querySelector("[data-open-search]");
  topbarActions.insertBefore(button, searchButton || null);

  bindPress(button, async () => {
    button.disabled = true;
    button.classList.add("is-refreshing");
    await triggerLiveRefresh((message) => {
      button.title = message;
      button.setAttribute("aria-label", message);
    });
  });

  return button;
}

function buildThemeToggleButton() {
  if (!topbarActions || topbarActions.querySelector("[data-theme-toggle]")) {
    return;
  }

  const button = document.createElement("button");
  button.className = "header-nav-button theme-toggle-button";
  button.type = "button";
  button.dataset.themeToggle = "true";
  button.dataset.navIcon = "theme";

  const render = () => {
    const nextTheme = currentSiteTheme === "light" ? "dark" : "light";
    button.textContent = currentSiteTheme === "light" ? "Dark" : "Light";
    button.dataset.themeState = currentSiteTheme;
    button.title = `Switch to ${nextTheme} theme`;
    button.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
  };

  button.addEventListener("click", toggleSiteTheme);
  window.addEventListener("ridgeline:theme-change", render);
  render();

  const searchButton = topbarActions.querySelector("[data-open-search]");
  if (searchButton) {
    topbarActions.insertBefore(button, searchButton);
  } else {
    topbarActions.appendChild(button);
  }
}

function buildBackgroundIntensityButton() {
  if (!topbarActions || topbarActions.querySelector("[data-bg-intensity-toggle]")) {
    return;
  }

  const button = document.createElement("button");
  button.className = "header-nav-button background-intensity-button";
  button.type = "button";
  button.dataset.bgIntensityToggle = "true";
  button.dataset.navIcon = "background";

  const labelByLevel = {
    subtle: "Soft",
    balanced: "Balanced",
    cinematic: "Bold"
  };

  const nextLevelByLevel = {
    subtle: "balanced",
    balanced: "cinematic",
    cinematic: "subtle"
  };

  const render = () => {
    const level = ["subtle", "balanced", "cinematic"].includes(currentBackgroundIntensity)
      ? currentBackgroundIntensity
      : "balanced";
    const nextLevel = nextLevelByLevel[level];
    button.textContent = labelByLevel[level];
    button.dataset.bgIntensityState = level;
    button.title = `Switch background intensity to ${nextLevel}`;
    button.setAttribute("aria-label", `Switch background intensity to ${nextLevel}`);
  };

  button.addEventListener("click", cycleBackgroundIntensity);
  window.addEventListener("ridgeline:bg-intensity-change", render);
  render();

  const themeButton = topbarActions.querySelector("[data-theme-toggle]");
  const searchButton = topbarActions.querySelector("[data-open-search]");
  if (themeButton) {
    topbarActions.insertBefore(button, themeButton);
  } else if (searchButton) {
    topbarActions.insertBefore(button, searchButton);
  } else {
    topbarActions.appendChild(button);
  }
}

function slugFromLabel(value) {
  return `${value || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getSectionTitle(section) {
  return (
    section.querySelector("h2, h3")?.textContent?.trim() ||
    section.getAttribute("aria-label") ||
    section.id ||
    "Section"
  );
}

function getNavIcon(label, href) {
  const value = `${label} ${href}`.toLowerCase();
  if (value.includes("search")) return "search";
  if (value.includes("more") || value.includes("menu") || value.includes("tool")) return "menu";
  if (value.includes("viewer") || value.includes("map")) return "map";
  if (value.includes("engine") || value.includes("j35")) return "engine";
  if (value.includes("tire") || value.includes("wheel")) return "wheel";
  if (value.includes("emergency")) return "flash";
  if (value.includes("garage")) return "garage";
  if (value.includes("diagnostic")) return "diag";
  if (value.includes("maintenance") || value.includes("service")) return "wrench";
  if (value.includes("fuse") || value.includes("electrical")) return "bolt";
  if (value.includes("photo")) return "photo";
  if (value.includes("nfc") || value.includes("tag")) return "nfc";
  if (value.includes("ar")) return "cube";
  if (value.includes("quick")) return "flash";
  if (value.includes("reference") || value.includes("source")) return "book";
  return "dot";
}

function normalizeLocalHref(href) {
  if (!href) {
    return "";
  }

  try {
    const url = new URL(href, location.href);
    if (url.origin === location.origin && url.pathname === location.pathname && url.hash) {
      return url.hash;
    }
  } catch {}

  return href.startsWith("#") ? href : "";
}

function pageNameFromHref(href = "") {
  try {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) {
      return "";
    }
    return url.pathname.split("/").pop() || "index.html";
  } catch {
    return "";
  }
}

function isCurrentPageHref(href = "") {
  const targetPage = pageNameFromHref(href);
  return Boolean(targetPage && targetPage === currentPageName());
}

function getTargetFromHash(hashValue = "") {
  const targetId = hashValue && hashValue !== "#top" ? hashValue.replace(/^#/, "") : "";
  if (!targetId) {
    return null;
  }

  try {
    return document.getElementById(decodeURIComponent(targetId));
  } catch {
    return document.getElementById(targetId);
  }
}

function getHashTarget() {
  const nfcTarget = new URLSearchParams(location.search).get("nfc");
  if (nfcTarget) {
    return getTargetFromHash(`#${nfcTarget}`);
  }

  return getTargetFromHash(location.hash);
}

function currentDeepTargetHash() {
  const nfcTarget = new URLSearchParams(location.search).get("nfc");
  return nfcTarget ? `#${nfcTarget}` : location.hash;
}

function revealNavigationTarget(target) {
  if (!target) {
    return false;
  }

  const targetSection = target.closest("main > section");
  if (targetSection?.hidden) {
    setContentMode("full", true);
  }

  target.classList?.add("is-visible");
  let revealParent = target.closest(".section-reveal");
  while (revealParent) {
    revealParent.classList.add("is-visible");
    revealParent = revealParent.parentElement?.closest(".section-reveal");
  }
  return true;
}

function isInsideHiddenContent(target) {
  return Boolean(target?.closest("[hidden]"));
}

function getNavigationScrollOffset() {
  const topbarHeight = document.querySelector(".topbar")?.getBoundingClientRect().height || 0;
  if (window.matchMedia("(max-width: 760px)").matches) {
    return Math.max(44, Math.min(62, topbarHeight + 8));
  }

  return Math.max(72, topbarHeight + 18);
}

function scrollWindowTo(top, behavior = "smooth") {
  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;

  if (behavior === "auto") {
    root.style.scrollBehavior = "auto";
  }

  window.scrollTo({ top, left: 0, behavior });

  if (behavior === "auto") {
    root.style.scrollBehavior = previousScrollBehavior;
  }
}

function scrollToHashTarget() {
  const target = getHashTarget();
  const wasHidden = isInsideHiddenContent(target);
  if (!revealNavigationTarget(target)) {
    return;
  }

  const scroll = () => {
    const offset = getNavigationScrollOffset();
    const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
    scrollWindowTo(top, "auto");
  };

  if (wasHidden) {
    requestAnimationFrame(() => requestAnimationFrame(scroll));
    return;
  }

  scroll();
}

function scrollToSectionElement(target, behavior = "smooth") {
  if (!target) {
    return;
  }

  const wasHidden = isInsideHiddenContent(target);
  revealNavigationTarget(target);

  const scroll = () => {
    const offset = getNavigationScrollOffset();
    const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
    scrollWindowTo(top, behavior);
  };

  if (wasHidden) {
    requestAnimationFrame(() => requestAnimationFrame(scroll));
    return;
  }

  scroll();
}

function scrollToHashValue(hashValue, behavior = "smooth") {
  const target = hashValue ? getTargetFromHash(hashValue) : getHashTarget();
  if (!target) {
    if (hashValue === "#top") {
      scrollWindowTo(0, behavior);
    }
    return false;
  }

  scrollToSectionElement(target, behavior);
  return true;
}

function sectionNavigationBehavior() {
  return window.matchMedia("(max-width: 760px)").matches ? "auto" : "smooth";
}

let pendingHashScrollTimers = [];

function clearScheduledHashScroll() {
  pendingHashScrollTimers.forEach((timer) => window.clearTimeout(timer));
  pendingHashScrollTimers = [];
}

function scheduleHashScroll(hashValue = location.hash, behavior = "auto", delays = [0, 120, 360]) {
  clearScheduledHashScroll();

  const stop = () => {
    clearScheduledHashScroll();
    window.removeEventListener("pointerdown", stop, true);
    window.removeEventListener("touchstart", stop, true);
    window.removeEventListener("wheel", stop, true);
    window.removeEventListener("keydown", stop, true);
  };

  window.addEventListener("pointerdown", stop, true);
  window.addEventListener("touchstart", stop, true);
  window.addEventListener("wheel", stop, true);
  window.addEventListener("keydown", stop, true);

  pendingHashScrollTimers = delays.map((delay) => window.setTimeout(() => {
    scrollToHashValue(hashValue, behavior);
    if (delay === delays[delays.length - 1]) {
      stop();
    }
  }, delay));
}

function keepHashTargetAligned(hashValue = location.hash, behavior = "auto", duration = 6500) {
  const startedAt = performance.now();
  let stopped = false;
  let observer = null;
  let interval = null;

  const stop = () => {
    if (stopped) {
      return;
    }

    stopped = true;
    clearScheduledHashScroll();
    observer?.disconnect();
    clearInterval(interval);
    window.removeEventListener("pointerdown", stop, true);
    window.removeEventListener("touchstart", stop, true);
    window.removeEventListener("wheel", stop, true);
    window.removeEventListener("keydown", stop, true);
  };

  const alignIfNeeded = () => {
    if (stopped) {
      return;
    }

    if (performance.now() - startedAt > duration) {
      stop();
      return;
    }

    const target = hashValue ? getTargetFromHash(hashValue) : getHashTarget();
    if (!target) {
      return;
    }

    revealNavigationTarget(target);
    const offset = getNavigationScrollOffset();
    const top = target.getBoundingClientRect().top;
    if (Math.abs(top - offset) > 18) {
      scrollToHashValue(hashValue, behavior);
    }
  };

  window.addEventListener("pointerdown", stop, true);
  window.addEventListener("touchstart", stop, true);
  window.addEventListener("wheel", stop, true);
  window.addEventListener("keydown", stop, true);

  observer = new ResizeObserver(() => requestAnimationFrame(alignIfNeeded));
  observer.observe(document.documentElement);
  if (document.body) {
    observer.observe(document.body);
  }

  interval = window.setInterval(alignIfNeeded, 180);
  requestAnimationFrame(alignIfNeeded);
  window.setTimeout(stop, duration + 200);
}

function shouldHandleLocalSectionLink(link) {
  const rawHref = link?.getAttribute("href") || "";
  if (!rawHref || rawHref === "#") {
    return null;
  }

  let url;
  try {
    url = new URL(rawHref, location.href);
  } catch {
    return null;
  }

  const currentPathName = location.pathname.split("/").pop() || "index.html";
  const targetPathName = url.pathname.split("/").pop() || "index.html";
  if (url.origin !== location.origin || targetPathName !== currentPathName || url.search !== location.search) {
    return null;
  }

  if (!url.hash) {
    return null;
  }

  return url;
}

function promoteNfcTarget() {
  if (!nfcTargetId || !main) {
    return;
  }

  const target = getHashTarget();
  const targetBlock = target?.closest("article, section");
  if (!targetBlock || targetBlock === main.firstElementChild || !main.contains(targetBlock)) {
    return;
  }

  targetBlock.classList.add("nfc-promoted-target");
  main.insertBefore(targetBlock, main.firstElementChild);
}

function collectPageSections() {
  if (!main) {
    return [];
  }

  const page = currentPageName();
  const seen = new Set();

  if (page === "index.html") {
    return [...main.querySelectorAll("section[id]")]
      .filter((section) => section.id)
      .map((section) => ({
        id: section.id,
        label: getSectionTitle(section),
        target: section
      }));
  }

  const navLinks = [
    ...document.querySelectorAll(".section-utility-nav a[href^='#']"),
    ...document.querySelectorAll(".section-dock a[href^='#']")
  ];

  const sections = navLinks
    .map((link) => {
      const hash = normalizeLocalHref(link.getAttribute("href"));
      if (!hash || hash === "#top" || seen.has(hash)) {
        return null;
      }

      const target = document.querySelector(hash);
      if (!target) {
        return null;
      }

      seen.add(hash);
      return {
        id: hash.slice(1),
        label: link.textContent.trim(),
        target
      };
    })
    .filter(Boolean);

  if (sections.length) {
    return sections;
  }

  return [...main.querySelectorAll("section[id], article[id]")]
    .filter((section) => section.id)
    .map((section) => ({
      id: section.id,
      label: getSectionTitle(section),
      target: section
    }));
}

function buildQuickActionBar() {
  if (!topbar || document.querySelector(".quick-action-bar")) {
    return;
  }

  const actions = [
    { label: "Vehicle Map", href: "index.html#viewer" },
    { label: "Emergency", href: "quick-sheet.html#emergency-card" },
    { label: "Engine", href: "engine.html" },
    { label: "Tires", href: "tires.html" },
    { label: "Fuses", href: "hood.html#fuses" },
    { label: "Maintenance", href: "maintenance.html" },
    { label: "Diagnostics", href: "diagnostics.html" },
    { label: "Garage", href: "garage.html#dashboard" },
    { label: "AR Lab", href: "ar-lab.html" },
    { label: "NFC", href: "nfc.html" }
  ];

  const bar = document.createElement("nav");
  bar.className = "quick-action-bar";
  bar.setAttribute("aria-label", "Quick actions");
  bar.innerHTML = actions
    .map((action) => {
      const local = action.href.replace("./", "");
      const isActive = currentPageName() === local.split("#")[0];
      return `<a class="quick-action-link${isActive ? " is-active" : ""}" href="${action.href}" data-nav-icon="${getNavIcon(action.label, action.href)}">${action.label}</a>`;
    })
    .join("");

  const routeStrip = document.querySelector(".route-strip");
  if (routeStrip) {
    routeStrip.insertAdjacentElement("afterend", bar);
  } else {
    topbar.insertAdjacentElement("afterend", bar);
  }
}

function uniqueNavEntries(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.href || ""}`;
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function dedupeLinksByHref(container) {
  if (!container) {
    return;
  }

  const seen = new Set();
  [...container.querySelectorAll("a[href]")].forEach((link) => {
    const href = (link.getAttribute("href") || "").trim();
    if (!href) {
      return;
    }

    const key = normalizeRecentHref(href);
    if (seen.has(key)) {
      link.remove();
      return;
    }

    seen.add(key);
  });
}

function validateInternalAnchors() {
  const links = [...document.querySelectorAll("a[href^='#']")];
  links.forEach((link) => {
    const href = (link.getAttribute("href") || "").trim();
    if (!href || href === "#") {
      return;
    }

    const id = href.slice(1);
    if (!id || id === "top") {
      return;
    }

    const target = document.getElementById(id);
    if (target) {
      return;
    }

    link.setAttribute("href", "#top");
    link.classList.add("is-disabled-link");
  });
}

function simplifyNavigationLayout() {
  const routeStrip = document.querySelector(".route-strip");
  const utilityNav = document.querySelector(".section-utility-nav");
  const sectionDock = document.querySelector(".section-dock");
  const quickActionBar = document.querySelector(".quick-action-bar");

  dedupeLinksByHref(routeStrip);
  dedupeLinksByHref(utilityNav);

  // Use one persistent nav pattern to avoid redundant on-screen controls.
  sectionDock?.remove();
  quickActionBar?.remove();

  if (isMobileNavMode) {
    utilityNav?.setAttribute("hidden", "true");
    document.querySelector(".back-to-map-fab")?.remove();
  }

  validateInternalAnchors();
}

function buildMobileNavAccordion(sections) {
  if (
    document.body?.hasAttribute("data-no-navigation-support") ||
    !isMobileNavMode ||
    !topbar ||
    document.querySelector(".mobile-nav-accordion")
  ) {
    return;
  }

  const pageLinks = uniqueNavEntries([
    { label: "Vehicle Map", href: "index.html#viewer" },
    { label: "Engine", href: "engine.html" },
    { label: "Tires", href: "tires.html" },
    { label: "Maintenance", href: "maintenance.html" },
    { label: "Emergency Card", href: "quick-sheet.html#emergency-card" },
    { label: "Diagnostics", href: "diagnostics.html" },
    { label: "Garage", href: "garage.html#dashboard" },
    { label: "NFC", href: "nfc.html" },
    { label: "AR Lab", href: "ar-lab.html" }
  ]);

  const sectionLinks = uniqueNavEntries(
    (sections || []).map((section) => ({ label: section.label, href: `#${section.id}` }))
  );
  const hasSectionDock = !isMobileNavMode && Boolean(document.querySelector(".section-dock"));

  const container = document.createElement("nav");
  container.className = "mobile-nav-accordion";
  container.setAttribute("aria-label", "Mobile navigation");

  const sectionsMarkup = sectionLinks.length && !hasSectionDock
    ? sectionLinks
        .map(
          (item) => `<a class="mobile-nav-link" href="${item.href}" data-nav-icon="${getNavIcon(item.label, item.href)}">${item.label}</a>`
        )
        .join("")
    : `<p class="mobile-nav-empty">No section shortcuts on this page.</p>`;

  const pagesMarkup = pageLinks
    .map(
      (item) => `<a class="mobile-nav-link" href="${item.href}" data-nav-icon="${getNavIcon(item.label, item.href)}">${item.label}</a>`
    )
    .join("");

  const askShortcutMarkup = `
    <a class="mobile-nav-ask-link" href="ask-anton.html#ask-anton-chat" data-nav-icon="ask" aria-label="Open Ask Anton assistant">
      <span>Ask Anton</span>
      <strong>AI Assistant</strong>
    </a>
  `;

  container.innerHTML = `
    ${askShortcutMarkup}
    ${hasSectionDock ? "" : `
    <button class="mobile-nav-toggle" type="button" data-mobile-nav-toggle="sections" aria-expanded="false">
      <span>Page Sections</span>
      <strong>Expand</strong>
    </button>
    <div class="mobile-nav-panel" data-mobile-nav-panel="sections" hidden>
      ${sectionsMarkup}
    </div>
    `}
    <button class="mobile-nav-toggle" type="button" data-mobile-nav-toggle="pages" aria-expanded="false">
      <span>Site Sections</span>
      <strong>Expand</strong>
    </button>
    <div class="mobile-nav-panel" data-mobile-nav-panel="pages" hidden>
      ${pagesMarkup}
    </div>
  `;

  const isIndexPage = currentPageName() === "index.html";
  const indexLeadSection = isIndexPage ? document.querySelector("main > section:first-child") : null;
  if (isIndexPage && indexLeadSection) {
    indexLeadSection.insertAdjacentElement("afterend", container);
  } else if (insertSubpageIntroTool(container)) {
    // Keep subpage titles as the first content after the header.
  } else {
    topbar.insertAdjacentElement("afterend", container);
  }

  const toggles = [...container.querySelectorAll("[data-mobile-nav-toggle]")];
  const panels = [...container.querySelectorAll("[data-mobile-nav-panel]")];
  panels.forEach((panel) => setPanelVisibility(panel, false, "grid"));

  const closeAll = () => {
    toggles.forEach((toggle) => {
      toggle.setAttribute("aria-expanded", "false");
      const id = toggle.dataset.mobileNavToggle;
      const panel = container.querySelector(`[data-mobile-nav-panel='${id}']`);
      const label = toggle.querySelector("strong");
      setPanelVisibility(panel, false, "grid");
      if (label) {
        label.textContent = "Expand";
      }
    });
  };

  toggles.forEach((toggle) => {
    bindPress(toggle, () => {
      const id = toggle.dataset.mobileNavToggle;
      const panel = container.querySelector(`[data-mobile-nav-panel='${id}']`);
      const isExpanded = toggle.getAttribute("aria-expanded") === "true";
      closeAll();
      if (isExpanded || !panel) {
        return;
      }
      toggle.setAttribute("aria-expanded", "true");
      const label = toggle.querySelector("strong");
      if (label) {
        label.textContent = "Collapse";
      }
      setPanelVisibility(panel, true, "grid");
    });
  });

  container.addEventListener("click", (event) => {
    if (event.target.closest("a.mobile-nav-link") || event.target.closest("a.mobile-nav-ask-link")) {
      closeAll();
    }
  });
}

function actionHint(label) {
  const value = `${label}`.toLowerCase();
  if (value.includes("emergency")) return "Open critical specs and links for fast roadside checks.";
  if (value.includes("engine")) return "Open the interactive J35Y6 engine model.";
  if (value.includes("fuse")) return "Fastest route into the electrical reference.";
  if (value.includes("maintenance")) return "Open the recurring service and spec page.";
  if (value.includes("diagnostic")) return "Start from symptoms and quick checks.";
  if (value.includes("garage")) return "See truck-specific notes and service memory.";
  if (value.includes("map") || value.includes("viewer")) return "Jump back into the live truck view.";
  if (/\bar\b/.test(value)) return "Open the truck in AR or 3D preview.";
  if (value.includes("photo")) return "Switch to real area photos.";
  if (value.includes("quick")) return "Use the condensed fast-reference sheet.";
  return "Open this section directly.";
}

function buildHeroActionCards() {
  if (document.body?.hasAttribute("data-no-hero-actions")) {
    return;
  }

  const hero = document.querySelector(".section-page-hero");
  const utilityNav = hero?.querySelector(".section-utility-nav");
  if (!hero || !utilityNav || hero.querySelector(".hero-action-grid")) {
    return;
  }

  const cards = [...utilityNav.querySelectorAll("a")]
    .filter((link) => !link.getAttribute("href")?.startsWith("#top"))
    .slice(0, 3);

  if (!cards.length) {
    return;
  }

  const grid = document.createElement("div");
  grid.className = "hero-action-grid";
  grid.setAttribute("aria-label", "Most used actions");
  grid.innerHTML = cards
    .map((link, index) => {
      const label = link.textContent.trim();
      const href = link.getAttribute("href") || "#";
      const tone = index === 0 ? " action-card-strong" : "";
      return `
        <a class="action-card${tone}" href="${href}" data-nav-icon="${getNavIcon(label, href)}">
          <span>${label}</span>
          <p>${actionHint(label)}</p>
        </a>
      `;
    })
    .join("");

  utilityNav.insertAdjacentElement("afterend", grid);
}

function buildSectionRail(sections) {
  if (
    document.body?.hasAttribute("data-no-section-rail") ||
    !main ||
    sections.length < 2 ||
    document.querySelector(".page-section-rail")
  ) {
    return null;
  }

  const rail = document.createElement("nav");
  rail.className = "page-section-rail";
  rail.setAttribute("aria-label", "Page sections");
  rail.innerHTML = `
    <div class="page-section-rail-label">On This Page</div>
    <div class="page-section-rail-links">
      ${sections
        .map(
          (section, index) =>
            `<a class="page-section-link${index === 0 ? " is-active" : ""}" href="#${section.id}" data-section-link="${section.id}" data-nav-icon="${getNavIcon(section.label, section.id)}">${section.label}</a>`
        )
        .join("")}
    </div>
  `;

  const hero = main.querySelector(".section-page-hero, .viewer-section");
  if (hero) {
    hero.insertAdjacentElement("afterend", rail);
  } else {
    main.insertAdjacentElement("afterbegin", rail);
  }

  return rail;
}

function setLiveActiveSection(id = "") {
  liveActiveSectionId = `${id || ""}`.replace(/^#/, "");
  if (!document.body) {
    return;
  }

  if (liveActiveSectionId) {
    document.body.dataset.activeSection = liveActiveSectionId;
  } else {
    document.body.removeAttribute("data-active-section");
  }
}

function centerActiveLinkWithinScroller(link) {
  if (!(link instanceof HTMLElement)) {
    return;
  }

  const scroller = link.closest(
    ".route-strip, .header-quick-nav, .page-section-rail-links, .section-dock, .section-utility-nav, .topnav"
  );
  if (!(scroller instanceof HTMLElement) || scroller.scrollWidth <= scroller.clientWidth + 12) {
    return;
  }

  const scrollerRect = scroller.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();
  const targetLeft =
    scroller.scrollLeft + (linkRect.left - scrollerRect.left) - (scroller.clientWidth - linkRect.width) / 2;
  const nextLeft = Math.max(0, Math.min(targetLeft, scroller.scrollWidth - scroller.clientWidth));

  if (Math.abs(nextLeft - scroller.scrollLeft) < 8) {
    return;
  }

  scroller.scrollTo({
    left: nextLeft,
    behavior: document.body?.dataset.motionMode === "off" ? "auto" : "smooth"
  });
}

function scheduleActiveNavSync() {
  if (activeNavSyncFrame) {
    cancelAnimationFrame(activeNavSyncFrame);
  }

  activeNavSyncFrame = requestAnimationFrame(() => {
    activeNavSyncFrame = 0;
    const activeLinks = [
      ...document.querySelectorAll(
        ".topnav a.is-current-link, .route-strip a.is-current-link, .header-quick-nav a.is-current-link, .page-section-link.is-active, .section-dock a.is-current-link, .section-utility-nav a.is-current-link"
      )
    ];

    activeLinks.forEach((link) => centerActiveLinkWithinScroller(link));
  });
}

function syncActiveSectionUi(sections, rail) {
  if (!sections.length) {
    return;
  }

  const linkMap = rail
    ? new Map(
        [...rail.querySelectorAll("[data-section-link]")].map((link) => [link.dataset.sectionLink, link])
      )
    : new Map();

  const setActive = (id) => {
    const nextId = sections.some((section) => section.id === id) ? id : sections[0].id;
    const activeIndex = sections.findIndex((section) => section.id === nextId);
    const activeSection = sections[activeIndex] || sections[0];
    if (linkMap.size) {
      linkMap.forEach((link, key) => {
        const active = key === nextId;
        link.classList.toggle("is-active", active);
        link.setAttribute("aria-current", active ? "true" : "false");
      });
    }
    setLiveActiveSection(nextId);
    saveLastSection(nextId);
    enhanceActiveLinks();
    window.dispatchEvent(new CustomEvent("ridgeline:active-section", {
      detail: {
        id: nextId,
        label: activeSection?.label || "",
        index: activeIndex + 1,
        total: sections.length
      }
    }));
  };

  setActive(sections[0].id);

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible?.target?.id) {
        setActive(visible.target.id);
      }
    },
    {
      rootMargin: "-22% 0px -55% 0px",
      threshold: [0.2, 0.45, 0.7]
    }
  );

  sections.forEach((section) => observer.observe(section.target));
}

function buildResumeButton() {
  if (!topbarActions || topbarActions.querySelector("[data-resume-section]")) {
    return;
  }

  const sectionId = getLastSection();
  if (!sectionId || !document.getElementById(sectionId)) {
    return;
  }

  const button = document.createElement("button");
  button.className = "resume-button";
  button.type = "button";
  button.dataset.resumeSection = "true";
  button.textContent = "Resume";
  button.title = "Resume last section";
  button.setAttribute("aria-label", "Resume last section");
  button.addEventListener("click", () => {
    const target = document.getElementById(getLastSection());
    scrollToSectionElement(target, "smooth");
  });

  const searchButton = topbarActions.querySelector("[data-open-search]");
  topbarActions.insertBefore(button, searchButton || null);
}

function buildBackToMapButton() {
  if (isMobileNavMode || document.querySelector(".back-to-map-fab")) {
    return;
  }

  const button = document.createElement("a");
  button.className = "back-to-map-fab";
  button.href = "index.html#viewer";
  button.dataset.navIcon = "map";
  button.textContent = "Back To Map";
  document.body.appendChild(button);
}

function buildAskAntonFloatingButton() {
  if (document.body.classList.contains("drive-map-page") || document.querySelector(".ask-anton-fab")) {
    return;
  }

  const askPage = currentPageName() === "ask-anton.html";
  const button = document.createElement("a");
  button.className = "ask-anton-fab";
  button.href = askPage ? "#ask-anton-chat" : "ask-anton.html#ask-anton-chat";
  button.dataset.navIcon = "ask";
  button.setAttribute("aria-label", askPage ? "Jump to Ask Anton chat" : "Open Ask Anton assistant");
  button.title = askPage ? "Ask Anton chat" : "Ask Anton";
  button.innerHTML = `<span>Ask</span><strong>Anton</strong>`;
  document.body.appendChild(button);
}

function buildScrollProgress() {
  if (!topbar || topbar.querySelector(".scroll-progress")) {
    return;
  }

  const track = document.createElement("div");
  track.className = "scroll-progress";
  track.setAttribute("aria-hidden", "true");
  const fill = document.createElement("span");
  fill.className = "scroll-progress-fill";
  track.appendChild(fill);
  topbar.appendChild(track);

  const update = () => {
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0, window.scrollY / max));
    fill.style.width = `${ratio * 100}%`;
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
}

function bindCompactStickyHeader() {
  if (!topbar) {
    return;
  }

  const isHomePage = document.body.classList.contains("is-home-page");
  const isDriveMapPage = document.body.classList.contains("drive-map-page");

  const update = () => {
    const compact =
      window.matchMedia("(max-width: 760px)").matches &&
      (window.scrollY > 84 || isHomePage || isDriveMapPage);
    topbar.classList.toggle("is-compact", compact);
    document.body.classList.toggle("has-compact-topbar", compact);
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
}

function buildDynamicIslandShelf() {
  if (document.querySelector(".dynamic-island-shelf")) {
    return;
  }

  const isiOSLike =
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isiOSLike) {
    return;
  }

  const shelf = document.createElement("div");
  shelf.className = "dynamic-island-shelf";
  shelf.setAttribute("aria-hidden", "true");
  document.body.classList.add("has-dynamic-island-shelf");
  document.body.prepend(shelf);
}

function buildOwnerAuthModal() {
  if (document.querySelector("[data-owner-auth-modal]")) {
    return document.querySelector("[data-owner-auth-modal]");
  }

  const modal = document.createElement("section");
  modal.className = "search-modal owner-auth-modal";
  modal.hidden = true;
  modal.setAttribute("data-owner-auth-modal", "");
  modal.innerHTML = `
    <div class="search-dialog owner-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="owner-auth-title">
      <button class="search-close" type="button" data-close-owner-auth aria-label="Close owner sign-in">Close</button>
      <div class="owner-auth-head">
        <p class="eyebrow">Owner Access</p>
        <h2 id="owner-auth-title" data-owner-auth-title>Sign In To Change Site Memory</h2>
        <p data-owner-auth-detail>Anyone can browse memory content. Only the owner account can change it.</p>
      </div>
      <section class="owner-auth-session-card" data-owner-auth-session hidden>
        <span class="owner-auth-session-badge" data-owner-auth-session-badge>Owner Session</span>
        <strong data-owner-auth-session-email>Not signed in</strong>
        <p data-owner-auth-session-copy>You're signed in on this device.</p>
        <div class="owner-auth-actions">
          <button class="agent-control-button agent-control-button-secondary" type="button" data-owner-auth-signout>Sign Out</button>
        </div>
      </section>
      <form class="owner-auth-form" data-owner-auth-form>
        <label>
          <span>Email</span>
          <input type="email" name="email" autocomplete="email" inputmode="email" required />
        </label>
        <label>
          <span>Password</span>
          <input type="password" name="password" autocomplete="current-password" required />
        </label>
        <div class="owner-auth-actions">
          <button class="agent-control-button" type="submit" data-owner-auth-submit>Sign In</button>
        </div>
      </form>
      <p class="agent-status-summary owner-auth-message" data-owner-auth-message aria-live="polite"></p>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => {
    modal.hidden = true;
    if (!isAnyModalOpen()) {
      document.body.classList.remove("modal-open");
    }
  };

  modal.closeOwnerAuthModal = close;

  modal.querySelectorAll("[data-close-owner-auth]").forEach((button) => {
    button.addEventListener("click", close);
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      close();
    }
  });

  const form = modal.querySelector("[data-owner-auth-form]");
  const message = modal.querySelector("[data-owner-auth-message]");
  const signOutButton = modal.querySelector("[data-owner-auth-signout]");
  const detail = modal.querySelector("[data-owner-auth-detail]");
  const title = modal.querySelector("[data-owner-auth-title]");
  const sessionCard = modal.querySelector("[data-owner-auth-session]");
  const sessionBadge = modal.querySelector("[data-owner-auth-session-badge]");
  const sessionEmail = modal.querySelector("[data-owner-auth-session-email]");
  const sessionCopy = modal.querySelector("[data-owner-auth-session-copy]");

  const render = () => {
    const authState = ownerAuth.getOwnerAuthState();
    const configured = authState.ownerEmailConfigured;
    const userEmail = authState.user?.email || "";
    const signedIn = Boolean(authState.user);
    const ownerSignedIn = Boolean(authState.isOwner);

    if (title) {
      title.textContent = ownerSignedIn
        ? "Owner Account"
        : signedIn
          ? "Signed In"
          : "Sign In To Change Site Memory";
    }

    if (detail) {
      detail.textContent = configured
        ? ownerSignedIn
          ? `Signed in as ${userEmail}. Owner write access is enabled on this device.`
          : signedIn
            ? `${userEmail} is signed in on this device. Only the configured owner account can change site memory.`
            : "Anyone can browse memory content. Only the configured owner account can change it."
        : "Owner email is not configured yet, so this browser keeps local saves available while setup is finished.";
    }

    if (form) {
      form.hidden = ownerSignedIn;
    }

    if (sessionCard && sessionBadge && sessionEmail && sessionCopy) {
      sessionCard.hidden = !signedIn;
      sessionBadge.textContent = ownerSignedIn ? "Owner Session" : "Signed In";
      sessionBadge.dataset.ownerAuthTone = ownerSignedIn ? "owner" : "viewer";
      sessionEmail.textContent = userEmail || "Signed in";
      sessionCopy.textContent = ownerSignedIn
        ? "This browser has full owner access to update, upload, restore, and delete site memory."
        : configured
          ? "This account can browse, but only the configured owner account can change site memory."
          : "This browser is signed in, but owner setup is still incomplete.";
    }

    if (signOutButton) {
      signOutButton.disabled = !signedIn;
    }

    if (message) {
      if (ownerSignedIn) {
        message.textContent = `Signed in as ${userEmail}. Memory write controls are unlocked.`;
      } else if (signedIn && !ownerSignedIn) {
        message.textContent = configured
          ? `${userEmail} is signed in, but that account is not the configured owner.`
          : "An account is signed in, but owner email is not configured yet.";
      } else {
        message.textContent = configured
          ? "Sign in with the owner email and password to write, upload, restore, or delete memory."
          : "Local saves are available. Set the owner email in owner-auth.js and Supabase policies to lock shared-memory writes.";
      }
    }
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector("[data-owner-auth-submit]");
    const formData = new FormData(form);
    const email = `${formData.get("email") || ""}`.trim();
    const password = `${formData.get("password") || ""}`;
    if (!email || !password) {
      if (message) {
        message.textContent = "Enter both email and password.";
      }
      return;
    }

    submit.disabled = true;
    submit.textContent = "Signing In...";
    if (message) {
      message.textContent = "Checking owner account...";
    }

    try {
      await ownerAuth.signInOwner(email, password);
      form.reset();
      showToast("Signed in successfully.");
      close();
    } catch (error) {
      if (message) {
        message.textContent = error.message;
      }
    } finally {
      submit.disabled = false;
      submit.textContent = "Sign In";
      render();
    }
  });

  signOutButton?.addEventListener("click", async () => {
    signOutButton.disabled = true;
    if (message) {
      message.textContent = "Signing out...";
    }
    await ownerAuth.signOutOwner();
    signOutButton.disabled = false;
    render();
  });

  ownerAuth.onOwnerAuthChange(render);
  render();
  return modal;
}

function openOwnerAuthModal() {
  const modal = buildOwnerAuthModal();
  modal.hidden = false;
  document.body.classList.add("modal-open");
  const authState = ownerAuth.getOwnerAuthState();
  const preferredTarget = authState.user
    ? modal.querySelector("[data-owner-auth-signout]")
    : modal.querySelector("input");
  preferredTarget?.focus();
}

function buildInstallAppModal() {
  if (document.querySelector("[data-install-app-modal]")) {
    return document.querySelector("[data-install-app-modal]");
  }

  const modal = document.createElement("section");
  modal.className = "search-modal install-app-modal";
  modal.hidden = true;
  modal.setAttribute("data-install-app-modal", "");
  modal.innerHTML = `
    <div class="search-dialog owner-auth-dialog install-app-dialog" role="dialog" aria-modal="true" aria-labelledby="install-app-title">
      <button class="search-close" type="button" data-close-install-app aria-label="Close install app panel">Close</button>
      <div class="owner-auth-head">
        <p class="eyebrow">Mobile App</p>
        <h2 id="install-app-title" data-install-app-title>Add Ridgeline To Your Home Screen</h2>
        <p data-install-app-detail>Open this site faster and use it more like an app on your phone.</p>
      </div>
      <section class="install-app-steps" data-install-app-steps></section>
      <div class="owner-auth-actions">
        <button class="agent-control-button" type="button" data-install-app-primary>Install App</button>
        <button class="agent-control-button agent-control-button-secondary" type="button" data-install-app-copy>Copy Link</button>
      </div>
      <p class="agent-status-summary owner-auth-message" data-install-app-message aria-live="polite"></p>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => {
    modal.hidden = true;
    if (!isAnyModalOpen()) {
      document.body.classList.remove("modal-open");
    }
  };

  modal.querySelectorAll("[data-close-install-app]").forEach((button) => {
    button.addEventListener("click", close);
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      close();
    }
  });

  const title = modal.querySelector("[data-install-app-title]");
  const detail = modal.querySelector("[data-install-app-detail]");
  const steps = modal.querySelector("[data-install-app-steps]");
  const message = modal.querySelector("[data-install-app-message]");
  const primary = modal.querySelector("[data-install-app-primary]");
  const copy = modal.querySelector("[data-install-app-copy]");

  const render = () => {
    const mode = installHelpMode();
    if (!title || !detail || !steps || !message || !primary) {
      return;
    }

    if (mode === "installed") {
      title.textContent = "Ridgeline Is Already Installed";
      detail.textContent = "This phone is already opening the site in app-style mode.";
      steps.innerHTML = `
        <div class="install-app-step">
          <strong>Already set</strong>
          <p>Launch Ridgeline from your home screen whenever you want the cleanest mobile experience.</p>
        </div>
      `;
      primary.textContent = "Installed";
      primary.disabled = true;
      message.textContent = "No install needed on this device.";
      return;
    }

    primary.disabled = false;

    if (mode === "prompt") {
      title.textContent = "Install Ridgeline As An App";
      detail.textContent = "Your browser can install this site directly for a faster, cleaner mobile launch.";
      steps.innerHTML = `
        <div class="install-app-step">
          <strong>One tap install</strong>
          <p>Use the browser install prompt, then launch Ridgeline from your home screen like an app.</p>
        </div>
      `;
      primary.textContent = "Install App";
      message.textContent = "Install prompt ready.";
      return;
    }

    if (mode === "ios") {
      title.textContent = "Add Ridgeline To Home Screen";
      detail.textContent = "On iPhone, adding the site to your home screen gives you the cleanest full-screen version.";
      steps.innerHTML = `
        <div class="install-app-step">
          <strong>1. Open Share</strong>
          <p>Tap the Share button in Safari.</p>
        </div>
        <div class="install-app-step">
          <strong>2. Choose Add to Home Screen</strong>
          <p>Scroll in the share sheet if you do not see it right away.</p>
        </div>
        <div class="install-app-step">
          <strong>3. Launch from your home screen</strong>
          <p>That opens Ridgeline in the more app-like mobile view.</p>
        </div>
      `;
      primary.textContent = "Got It";
      message.textContent = "Use Safari's Share menu to finish install.";
      return;
    }

    title.textContent = "Install Ridgeline";
    detail.textContent = "If your browser supports it, look for Install App or Add to Home Screen in the browser menu.";
    steps.innerHTML = `
      <div class="install-app-step">
        <strong>Install from browser menu</strong>
        <p>Look for Install App, Add to Home Screen, or Create Shortcut in your browser menu.</p>
      </div>
    `;
    primary.textContent = "Got It";
    message.textContent = "Browser menu install is the fallback on this device.";
  };

  primary?.addEventListener("click", async () => {
    const mode = installHelpMode();
    if (mode === "prompt" && deferredInstallPrompt) {
      try {
        await deferredInstallPrompt.prompt();
        const outcome = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        render();
        message.textContent = outcome?.outcome === "accepted"
          ? "Install prompt accepted."
          : "Install prompt dismissed.";
      } catch {
        message.textContent = "Could not open the install prompt in this browser session.";
      }
      return;
    }

    if (mode === "installed") {
      close();
      return;
    }

    close();
  });

  copy?.addEventListener("click", () => copyCurrentLocation());

  modal.renderInstallApp = render;
  render();
  return modal;
}

function openInstallAppModal() {
  const modal = buildInstallAppModal();
  modal.renderInstallApp?.();
  modal.hidden = false;
  document.body.classList.add("modal-open");
  focusFirstIn(modal, "[data-install-app-primary], [data-install-app-copy], [data-close-install-app]");
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  document.querySelector("[data-install-app-modal]")?.renderInstallApp?.();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  document.querySelector("[data-install-app-modal]")?.renderInstallApp?.();
  showToast("Ridgeline installed on this device.");
});

function buildOwnerAuthButton() {
  if (!topbarActions || topbarActions.querySelector("[data-open-owner-auth]")) {
    return;
  }

  const button = document.createElement("button");
  button.className = "header-nav-button owner-auth-button";
  button.type = "button";
  button.dataset.openOwnerAuth = "true";
  button.setAttribute("aria-label", "Open sign-in");
  button.textContent = "Sign In";
  button.addEventListener("click", openOwnerAuthModal);

  const searchButton = topbarActions.querySelector("[data-open-search]");
  if (searchButton) {
    topbarActions.insertBefore(button, searchButton);
  } else {
    topbarActions.appendChild(button);
  }

  const render = () => {
    const authState = ownerAuth.getOwnerAuthState();
    button.dataset.ownerAuthState = authState.isOwner
      ? "owner"
      : authState.ownerEmailConfigured
        ? authState.user
          ? "viewer"
          : "locked"
        : "setup";
    button.textContent = authState.isOwner
      ? "Account"
      : authState.user
        ? "Signed In"
      : authState.ownerEmailConfigured
        ? "Sign In"
        : "Access";
    button.setAttribute(
      "aria-label",
      authState.isOwner
        ? "Open owner account"
        : authState.user
          ? "Open signed-in account"
        : authState.ownerEmailConfigured
          ? "Open owner sign-in"
          : "Owner access setup"
    );
    button.title = authState.isOwner
      ? `Signed in as ${authState.user?.email || "owner"}`
      : authState.ownerEmailConfigured
        ? "Sign in to unlock site-memory write controls"
        : "Local saves stay available until owner auth is configured";
  };

  ownerAuth.onOwnerAuthChange(render);
  render();
}

function applyOwnerWriteProtection() {
  const authState = ownerAuth.getOwnerAuthState();
  const canWrite = ownerAuth.canWriteMemory();
  document.body.classList.toggle("memory-write-locked", !canWrite);

  MEMORY_WRITE_SELECTORS.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      const node = element;
      if (!node.dataset.ownerLockManaged) {
        node.dataset.ownerLockManaged = "true";
        node.dataset.ownerLockWasDisabled = node.disabled ? "true" : "false";
        if ("readOnly" in node) {
          node.dataset.ownerLockWasReadonly = node.readOnly ? "true" : "false";
        }
      }

      if (canWrite) {
        if (node.dataset.ownerLockApplied === "true") {
          node.disabled = node.dataset.ownerLockWasDisabled === "true";
          if ("readOnly" in node) {
            node.readOnly = node.dataset.ownerLockWasReadonly === "true";
          }
        }
        node.dataset.ownerLockApplied = "false";
        node.removeAttribute("aria-disabled");
        return;
      }

      node.dataset.ownerLockApplied = "true";
      if (node.tagName === "INPUT" && !["checkbox", "radio", "file", "button", "submit"].includes((node.type || "").toLowerCase())) {
        node.readOnly = true;
      } else if ("readOnly" in node && node.tagName === "TEXTAREA") {
        node.readOnly = true;
      } else {
        node.disabled = true;
      }
      node.setAttribute("aria-disabled", "true");
    });
  });
}

function enableOwnerWriteProtection() {
  applyOwnerWriteProtection();

  if (!memoryWriteObserver && main) {
    memoryWriteObserver = new MutationObserver(() => applyOwnerWriteProtection());
    memoryWriteObserver.observe(main, { subtree: true, childList: true });
  }

  ownerAuth.onOwnerAuthChange(() => applyOwnerWriteProtection());
  window.addEventListener("ridgeline:memory-write-blocked", (event) => {
    const message = event.detail?.message || "Owner sign-in is required to change site memory.";
    showToast(message);
    openOwnerAuthModal();
  });
}

function buildViewerParallax() {
  const viewerSection = document.querySelector(".viewer-section#viewer");
  const viewerStage = viewerSection?.querySelector(".viewer-stage");
  if (!viewerSection || !viewerStage) {
    return;
  }

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
  let rafId = 0;
  let pointerX = 0;
  let pointerY = 0;

  const applyParallax = () => {
    rafId = 0;

    if (reducedMotionQuery.matches) {
      viewerSection.style.setProperty("--viewer-parallax-x", "0px");
      viewerSection.style.setProperty("--viewer-parallax-y", "0px");
      viewerStage.style.setProperty("--viewer-stage-shift-x", "0px");
      viewerStage.style.setProperty("--viewer-stage-shift-y", "0px");
      document.body.classList.add("motion-reduced");
      return;
    }

    document.body.classList.remove("motion-reduced");

    const rect = viewerSection.getBoundingClientRect();
    const viewportHeight = Math.max(window.innerHeight, 1);
    const sectionCenter = rect.top + rect.height / 2;
    const viewportCenter = viewportHeight / 2;
    const scrollRatio = Math.max(-1, Math.min(1, (viewportCenter - sectionCenter) / viewportHeight));
    const scrollY = scrollRatio * 18;
    const scrollX = scrollRatio * -8;

    const pointerWeight = coarsePointerQuery.matches ? 0 : 1;
    const totalX = scrollX + pointerX * pointerWeight;
    const totalY = scrollY + pointerY * pointerWeight;

    viewerSection.style.setProperty("--viewer-parallax-x", `${totalX.toFixed(2)}px`);
    viewerSection.style.setProperty("--viewer-parallax-y", `${totalY.toFixed(2)}px`);
    viewerStage.style.setProperty("--viewer-stage-shift-x", `${(totalX * 0.45).toFixed(2)}px`);
    viewerStage.style.setProperty("--viewer-stage-shift-y", `${(totalY * 0.35).toFixed(2)}px`);
  };

  const requestParallaxFrame = () => {
    if (!rafId) {
      rafId = requestAnimationFrame(applyParallax);
    }
  };

  viewerSection.querySelectorAll(".viewer-ambient-a").forEach((el) => {
    el.style.setProperty("--viewer-parallax-depth-x", "1.15");
    el.style.setProperty("--viewer-parallax-depth-y", "0.92");
    el.style.setProperty("--viewer-parallax-scale", "1.04");
  });
  viewerSection.querySelectorAll(".viewer-ambient-b").forEach((el) => {
    el.style.setProperty("--viewer-parallax-depth-x", "-0.78");
    el.style.setProperty("--viewer-parallax-depth-y", "-0.58");
    el.style.setProperty("--viewer-parallax-scale", "1.02");
  });

  viewerSection.addEventListener("pointermove", (event) => {
    if (coarsePointerQuery.matches) {
      return;
    }
    const rect = viewerSection.getBoundingClientRect();
    const relativeX = rect.width > 0 ? (event.clientX - rect.left) / rect.width - 0.5 : 0;
    const relativeY = rect.height > 0 ? (event.clientY - rect.top) / rect.height - 0.5 : 0;
    pointerX = relativeX * 18;
    pointerY = relativeY * 14;
    requestParallaxFrame();
  });

  viewerSection.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
    requestParallaxFrame();
  });

  window.addEventListener("scroll", requestParallaxFrame, { passive: true });
  window.addEventListener("resize", requestParallaxFrame, { passive: true });
  reducedMotionQuery.addEventListener?.("change", requestParallaxFrame);
  coarsePointerQuery.addEventListener?.("change", requestParallaxFrame);
  requestParallaxFrame();
}

function buildSectionStepper(sections) {
  if (
    !sections.length ||
    sections.length < 2 ||
    document.body?.hasAttribute("data-no-section-stepper") ||
    document.querySelector(".section-stepper") ||
    document.querySelector(".section-dock") ||
    document.querySelector(".page-section-rail")
  ) {
    return;
  }

  const stepper = document.createElement("nav");
  stepper.className = "section-stepper";
  stepper.setAttribute("aria-label", "Section navigator");
  stepper.innerHTML = `
    <button class="section-stepper-button" type="button" data-stepper-prev aria-label="Previous section">Prev</button>
    <button class="section-stepper-current" type="button" data-stepper-current aria-label="Toggle navigation view"></button>
    <button class="section-stepper-button" type="button" data-stepper-next aria-label="Next section">Next</button>
  `;
  document.body.appendChild(stepper);

  const prevButton = stepper.querySelector("[data-stepper-prev]");
  const nextButton = stepper.querySelector("[data-stepper-next]");
  const currentButton = stepper.querySelector("[data-stepper-current]");
  const sectionIds = sections.map((section) => section.id);
  let activeIndex = 0;

  const updateStepper = () => {
    const current = sections[activeIndex];
    if (currentButton) {
      currentButton.textContent = current?.label || "Sections";
      currentButton.title = current?.label || "Sections";
    }

    if (prevButton) {
      prevButton.disabled = activeIndex <= 0;
    }
    if (nextButton) {
      nextButton.disabled = activeIndex >= sections.length - 1;
    }
  };

  const setActiveFromId = (id) => {
    const index = sectionIds.indexOf(id);
    if (index === -1 || index === activeIndex) {
      return;
    }
    activeIndex = index;
    updateStepper();
  };

  const saved = getLastSection();
  const savedIndex = sectionIds.indexOf(saved);
  if (savedIndex !== -1) {
    activeIndex = savedIndex;
  }
  updateStepper();

  prevButton?.addEventListener("click", () => {
    const nextIndex = Math.max(0, activeIndex - 1);
    activeIndex = nextIndex;
    updateStepper();
    scrollToSectionElement(sections[nextIndex].target, "smooth");
  });

  nextButton?.addEventListener("click", () => {
    const nextIndex = Math.min(sections.length - 1, activeIndex + 1);
    activeIndex = nextIndex;
    updateStepper();
    scrollToSectionElement(sections[nextIndex].target, "smooth");
  });

  currentButton?.addEventListener("click", () => {
    document.querySelector("[data-open-site-menu]")?.click();
  });

  window.addEventListener("ridgeline:active-section", (event) => {
    setActiveFromId(event.detail?.id);
  });
}

function actionForPage(page) {
  const actions = {
    "index.html": [
      { label: "Models", href: "#model-launchpad", icon: "cube" },
      { label: "Jack", href: "index.html?system=jack-points#viewer", icon: "wrench" },
      { label: "Search", action: "search", icon: "search" },
      { label: "More", action: "tools", icon: "menu" }
    ],
    "engine.html": [
      { label: "Labels", href: "#engine-model", icon: "engine" },
      { label: "Parts", href: "#engine-part-reference", icon: "wrench" },
      { label: "Search", action: "search", icon: "search" },
      { label: "More", action: "tools", icon: "menu" }
    ],
    "maintenance.html": [
      { label: "Done", href: "#service-closeout", icon: "check" },
      { label: "Prep", href: "#service-prep", icon: "check" },
      { label: "Follow", href: "#service-followup", icon: "note" },
      { label: "More", action: "tools", icon: "menu" }
    ],
    "tires.html": [
      { label: "Roadside", href: "#tire-roadside-launcher", icon: "flash" },
      { label: "Pressure", href: "#tire-pressure-sweep", icon: "check" },
      { label: "Recheck", href: "#tire-recheck-planner", icon: "note" },
      { label: "Shop", href: "#tire-shop-pack", icon: "note" },
      { label: "Handoff", href: "#tire-handoff-builder", icon: "note" },
      { label: "More", action: "tools", icon: "menu" }
    ],
    "nfc.html": [
      { label: "Starter", href: "#starter-tag-pack", icon: "nfc" },
      { label: "Write", href: "#tag-writer", icon: "nfc" },
      { label: "Map", href: "#tag-map", icon: "map" },
      { label: "More", action: "tools", icon: "menu" }
    ],
    "nfc-landing.html": [
      { label: "Open", href: "#nfc-landing-hero", icon: "nfc" },
      { label: "Note", href: "#nfc-scan-handoff", icon: "note" },
      { label: "Tags", href: "nfc.html#tag-writer", icon: "map" },
      { label: "More", action: "tools", icon: "menu" }
    ],
    "diagnostics.html": [
      { label: "Share", href: "#diagnostic-share-builder", icon: "note" },
      { label: "Checks", href: "#first-check-tracker", icon: "check" },
      { label: "No-Start", href: "#no-start-workflow", icon: "diag", diagnosticContext: "primary" },
      { label: "Jump", href: "hood.html#wiring", icon: "bolt", diagnosticContext: "secondary" },
      { label: "Call", href: "#diagnostic-call-summary", icon: "note" },
      { label: "More", action: "tools", icon: "menu" }
    ],
    "quick-sheet.html": [
      { label: "Emergency", href: "#emergency-card", icon: "flash" },
      { label: "Offline", href: "#print-offline-pack", icon: "save" },
      { label: "Stack", href: "#roadside-action-stack", icon: "check" },
      { label: "Dispatch", href: "#roadside-dispatch-pack", icon: "note" },
      { label: "More", action: "tools", icon: "menu" }
    ],
    "drive-map.html": [
      { label: "Mark GPS", action: "drive-marker", icon: "note" },
      { label: "Follow", action: "drive-follow", icon: "map" },
      { label: "Center", action: "drive-recenter", icon: "map" },
      { label: "More", action: "tools", icon: "menu" }
    ],
    "rear-hitch.html": [
      { label: "Tow Day", href: "#tow-day-readiness", icon: "wrench" },
      { label: "Pinout", href: "#pinout", icon: "bolt" },
      { label: "Hookup", href: "#trailer-hookup-flow", icon: "check" },
      { label: "More", action: "tools", icon: "menu" }
    ],
    "garage.html": [
      { label: "Fill-In", href: "#garage-fill-in-checklist", icon: "garage" },
      { label: "Handoffs", href: "#recent-handoffs", icon: "note" },
      { label: "Staging", href: "#maintenance-note-preview", icon: "wrench" },
      { label: "Backup", href: "#diagnostic-activity", icon: "save" },
      { label: "More", action: "tools", icon: "menu" }
    ],
    "ask-anton.html": [
      { label: "Chat", href: "#ask-anton-chat", icon: "note" },
      { label: "Settings", href: "#ask-anton-settings", icon: "wrench" },
      { label: "Sources", href: "#ask-anton-sources", icon: "search" },
      { label: "More", action: "tools", icon: "menu" }
    ],
    "anton.html": [
      { label: "Review", href: "#anton-progress", icon: "check" },
      { label: "Sign", href: "#anton-signoff", icon: "note" },
      { label: "Home", href: "index.html#agent-status", icon: "home" },
      { label: "Controls", href: "#anton-controls", icon: "wrench" },
      { label: "More", action: "tools", icon: "menu" }
    ]
  };

  return actions[page] || [
    { label: "Home", href: "index.html", icon: "home" },
    { label: "Search", action: "search", icon: "search" },
    { label: "Emergency", href: "quick-sheet.html#emergency-card", icon: "flash" },
    { label: "More", action: "tools", icon: "menu" }
  ];
}

function performUiAction(action) {
  if (action === "print-page") {
    window.print();
    return;
  }
  if (action === "command") {
    openCommandPalette();
    return;
  }
  if (action === "quick-capture") {
    openQuickCapture();
    return;
  }
  if (action === "sync-settings") {
    openSyncSettings();
    return;
  }
  if (action === "search") {
    openSearch();
    return;
  }
  if (action === "drive-copy" || action === "drive-share" || action === "drive-recenter" || action === "drive-marker" || action === "drive-follow") {
    window.dispatchEvent(new CustomEvent("ridgeline:drive-action", {
      detail: { action: action.replace("drive-", "") }
    }));
    return;
  }
  if (action === "share") {
    shareCurrentLocation();
    return;
  }
  if (action === "copy-location") {
    copyCurrentLocation();
    return;
  }
  if (action === "install-app") {
    openInstallAppModal();
    return;
  }
  if (action === "last-task") {
    restoreLastTask();
    return;
  }
  if (action === "tools") {
    toggleMiniToolsDrawer();
    return;
  }
  if (action === "top") {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    return;
  }
  if (action === "refresh") {
    triggerLiveRefresh(() => {});
  }
}

function buildContextualBottomBar() {
  if (document.querySelector(".context-action-bar")) {
    return;
  }

  const bar = document.createElement("nav");
  bar.className = "context-action-bar";
  bar.setAttribute("aria-label", "Context actions");
  bar.innerHTML = actionForPage(currentPageName())
    .map((item) => {
      const attrs = item.action
        ? `href="#" data-context-action="${item.action}"`
        : `href="${item.href}"`;
      const diagnosticContext = item.diagnosticContext ? ` data-diagnostic-context="${item.diagnosticContext}"` : "";
      return `<a class="context-action" ${attrs}${diagnosticContext} data-nav-icon="${item.icon || getNavIcon(item.label, item.href || item.action)}"><span>${item.label}</span></a>`;
    })
    .join("");

  bar.addEventListener("click", (event) => {
    const actionLink = event.target.closest("[data-context-action]");
    if (!actionLink) {
      return;
    }
    event.preventDefault();
    performUiAction(actionLink.dataset.contextAction);
  });

  document.body.appendChild(bar);
}

function buildMiniToolsDrawer() {
  if (document.querySelector(".mini-tools-drawer")) {
    return;
  }

  const drawer = document.createElement("div");
  drawer.className = "mini-tools-drawer";
  drawer.hidden = true;
  drawer.innerHTML = `
    <div class="mini-tools-backdrop" data-mini-tools-close></div>
    <aside class="mini-tools-panel" aria-label="Quick tools">
      <div class="mini-tools-head">
        <div>
          <p class="eyebrow">Quick Tools</p>
          <h2>Control Center</h2>
        </div>
        <button class="modal-close" type="button" data-mini-tools-close>Close</button>
      </div>
      <div class="mini-tools-grid">
        <button type="button" data-mini-action="command" data-nav-icon="search">Command Palette</button>
        <button type="button" data-mini-action="search" data-nav-icon="search">Search Site</button>
        <button type="button" data-mini-action="share" data-nav-icon="share">Share This Page</button>
        <button type="button" data-mini-action="last-task" data-nav-icon="history">Last Task</button>
        <button type="button" data-mini-action="quick-capture" data-nav-icon="garage">Quick Add</button>
        <button type="button" data-mini-action="sync-settings" data-nav-icon="bolt">Sync Settings</button>
        <a href="index.html" data-nav-icon="home">Home Console</a>
        <button type="button" data-mini-action="refresh" data-nav-icon="flash">Live Refresh</button>
        <a href="nfc.html" data-nav-icon="nfc">NFC Console</a>
        <a href="maintenance.html" data-nav-icon="wrench">Add Update</a>
        <a href="quick-sheet.html#emergency-card" data-nav-icon="flash">Emergency Card</a>
      </div>
      <section class="work-mode-panel" aria-label="Working area">
        <div class="section-head">
          <div>
            <p class="eyebrow">Focus</p>
            <h3>I'm Working On</h3>
          </div>
        </div>
        <div class="work-mode-options">
          ${workAreas
            .map((area) => `<button type="button" data-work-area="${area.id}">${area.label}</button>`)
            .join("")}
        </div>
        <div class="work-mode-links" data-work-mode-links></div>
      </section>
    </aside>
  `;

  document.body.appendChild(drawer);
  bindFocusTrap(drawer);

  drawer.addEventListener("click", (event) => {
    if (event.target.closest("[data-mini-tools-close]")) {
      closeMiniToolsDrawer();
      return;
    }

    const action = event.target.closest("[data-mini-action]");
    if (action) {
      performUiAction(action.dataset.miniAction);
      closeMiniToolsDrawer();
      return;
    }

    const workButton = event.target.closest("[data-work-area]");
    if (workButton) {
      updateWorkModeUi(setWorkArea(workButton.dataset.workArea));
    }
  });

  drawer.addEventListener("click", (event) => {
    if (event.target.closest(".mini-tools-grid a, .work-mode-links a")) {
      closeMiniToolsDrawer();
    }
  });

  updateWorkModeUi(getWorkArea());
}

function updateWorkModeUi(area = getWorkArea()) {
  document.querySelectorAll("[data-work-area]").forEach((button) => {
    const active = button.dataset.workArea === area.id;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });

  const links = document.querySelector("[data-work-mode-links]");
  if (links) {
    links.innerHTML = area.links
      .map((link) =>
        link.action
          ? `<button type="button" data-mini-action="${link.action}">${link.label}</button>`
          : `<a href="${link.href}">${link.label}</a>`
      )
      .join("");
  }

  const chip = document.querySelector("[data-work-chip-label]");
  if (chip) {
    chip.textContent = area.title;
  }
}

function openMiniToolsDrawer() {
  buildMiniToolsDrawer();
  const drawer = document.querySelector(".mini-tools-drawer");
  if (!drawer) {
    return;
  }
  if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
    drawer.returnFocusElement = document.activeElement;
  }
  drawer.hidden = false;
  document.body.classList.add("modal-open");
  updateWorkModeUi(getWorkArea());
  focusFirstIn(drawer, "[data-mini-tools-close], button, a[href]");
}

function closeMiniToolsDrawer() {
  const drawer = document.querySelector(".mini-tools-drawer");
  if (!drawer) {
    return;
  }
  const returnFocusElement = drawer.returnFocusElement;
  drawer.hidden = true;
  const anotherModalOpen = isAnyModalOpen();
  if (!anotherModalOpen) {
    document.body.classList.remove("modal-open");
    restoreFocusTo(returnFocusElement);
  }
  drawer.returnFocusElement = null;
}

function toggleMiniToolsDrawer() {
  const drawer = document.querySelector(".mini-tools-drawer");
  if (drawer && !drawer.hidden) {
    closeMiniToolsDrawer();
  } else {
    openMiniToolsDrawer();
  }
}

function buildCurrentPageChip(sections) {
  if (
    document.body?.hasAttribute("data-no-navigation-support") ||
    !main ||
    document.querySelector(".current-page-chip")
  ) {
    return;
  }

  const chip = document.createElement("button");
  chip.className = "current-page-chip";
  chip.type = "button";
  chip.setAttribute("aria-expanded", "false");
  chip.innerHTML = `
    <span>${currentPageDisplayLabel()}</span>
    <strong data-current-section-label>${sections[0]?.label || "Top"}</strong>
  `;

  const panel = document.createElement("div");
  panel.className = "current-page-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="current-page-panel-head">
      <span data-work-chip-label>${getWorkArea().title}</span>
      <button type="button" data-current-page-close>Close</button>
    </div>
    <div class="current-page-panel-links">
      ${(sections || [])
        .map((section) => `<a href="#${section.id}">${section.label}</a>`)
        .join("") || `<a href="#top">Top</a>`}
    </div>
  `;

  const wrapper = document.createElement("div");
  wrapper.className = "current-page-wrapper";
  wrapper.append(chip, panel);

  if (topbar) {
    topbar.insertAdjacentElement("afterend", wrapper);
  } else {
    document.body.insertAdjacentElement("afterbegin", wrapper);
  }

  const closePanel = () => {
    chip.setAttribute("aria-expanded", "false");
    panel.hidden = true;
  };

  bindPress(chip, () => {
    const expanded = chip.getAttribute("aria-expanded") === "true";
    chip.setAttribute("aria-expanded", expanded ? "false" : "true");
    panel.hidden = expanded;
  });

  panel.addEventListener("click", (event) => {
    if (event.target.closest("[data-current-page-close], a")) {
      closePanel();
    }
  });

  window.addEventListener("ridgeline:active-section", (event) => {
    const target = chip.querySelector("[data-current-section-label]");
    const mapLabel = event.detail?.id === "viewer" ? target?.dataset.vehicleMapLabel : "";
    const label = mapLabel || sections.find((section) => section.id === event.detail?.id)?.label;
    if (target && label) {
      target.textContent = label;
    }
  });
}

function buildHomeCommandCenter() {
  if (currentPageName() !== "index.html" || !main || document.querySelector(".home-command-center")) {
    return;
  }

  const recent = loadRecentNav().slice(0, 4);
  const cards = [
    { label: "Service", href: "maintenance.html", icon: "wrench", note: "Log work, check fluids, torque, filters, bulbs, and recurring intervals." },
    { label: "Electrical", href: "hood.html", icon: "bolt", note: "Open hood and cabin fuse maps, battery notes, circuits, and diagnostics routes." },
    { label: "3D Models", href: "#model-launchpad", icon: "cube", note: "Jump into the truck map, J35Y6 engine model, tire lab, or AR view." },
    { label: "Garage", href: "garage.html", icon: "garage", note: "Review saved notes, service tracker, fuse favorites, and reference photos." },
    { label: "Emergency", href: "quick-sheet.html", icon: "flash", note: "Fast roadside specs, jack points, tire pressure, and need-it-now references." },
    { label: "Diagnostics", href: "diagnostics.html", icon: "diag", note: "Start from symptoms and move into the right electrical or service checks." }
  ];

  const section = document.createElement("section");
  section.className = "home-command-center";
  section.id = "command-center";
  section.innerHTML = `
    <div class="home-command-head">
      <div class="home-command-title">
        <p class="eyebrow">Command Center</p>
        <h2>Choose The Work, Then The Page</h2>
        <p>Use the truck map first, then jump into the exact reference layer you need.</p>
      </div>
      <div class="home-command-status" aria-label="Current truck summary">
        <span>2019 Ridgeline</span>
        <strong>Service reference, garage memory, and live 3D navigation</strong>
      </div>
    </div>
    <div class="visual-card-grid">
      ${cards
        .map(
          (card) => `
            <a class="visual-nav-card" href="${card.href}" data-nav-icon="${card.icon}">
              <strong>${card.label}</strong>
              <span>${card.note}</span>
            </a>
          `
        )
        .join("")}
    </div>
    <div class="home-memory-grid">
      <article class="home-memory-card">
        <span>Recently Used</span>
        <div class="home-memory-links">
          ${
            recent.length
              ? recent.map((item) => `<a href="${item.href}">${item.label}</a>`).join("")
              : `<a href="maintenance.html">Oil Service</a><a href="hood.html">Fuse Boxes</a>`
          }
        </div>
      </article>
      <article class="home-memory-card">
        <span>High Priority</span>
        <div class="home-memory-links">
          <a href="maintenance.html">Quick Update</a>
          <a href="index.html?system=jack-points#viewer">Jack Points</a>
          <a href="quick-sheet.html">Emergency Card</a>
          <a href="nfc.html">NFC Tags</a>
        </div>
      </article>
    </div>
  `;

  const viewer = document.getElementById("viewer");
  if (viewer) {
    viewer.insertAdjacentElement("afterend", section);
  } else {
    main.insertAdjacentElement("afterbegin", section);
  }
}

function buildMaintenanceJobMode() {
  if (currentPageName() !== "maintenance.html" || document.getElementById("job-mode")) {
    return;
  }

  const jobs = [
    {
      title: "Oil Change",
      href: "#oil-service",
      steps: ["Open oil reference", "Enter mileage", "Save update"],
      parts: "0W-20, filter, 94109-14000 washer"
    },
    {
      title: "Tire Rotation",
      href: "#brake-tire",
      steps: ["Open jack points", "Torque wheels", "Save mileage"],
      parts: "94 lb-ft wheel torque, 35 psi cold"
    },
    {
      title: "Battery Check",
      href: "hood.html#battery-service",
      steps: ["Check terminals", "Test voltage", "Log battery note"],
      parts: "Group 48 / H6 reference"
    },
    {
      title: "Fuse Diagnosis",
      href: "hood.html#fuses",
      steps: ["Pick fuse box", "Check fuse table", "Open diagnostics"],
      parts: "Fuse puller, spare low-profile fuses"
    },
    {
      title: "Trailer Lights",
      href: "rear-hitch.html#pinout",
      steps: ["Open pinout", "Check ground", "Test running/turn lights"],
      parts: "7-way tester or multimeter"
    }
  ];

  const section = document.createElement("section");
  section.className = "job-mode-section";
  section.id = "job-mode";
  section.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">Job Mode</p>
        <h2>Start A Truck Job</h2>
        <p class="section-copy">Pick the task first, then the page only shows the links and reminders you need while working.</p>
      </div>
    </div>
    <div class="job-card-grid">
      ${jobs
        .map(
          (job) => `
            <article class="job-card">
              <span>${job.parts}</span>
              <strong>${job.title}</strong>
              <ol>
                ${job.steps.map((step) => `<li>${step}</li>`).join("")}
              </ol>
              <div class="job-card-actions">
                <a class="utility-link utility-link-strong" href="${job.href}">Open Job</a>
                <a class="utility-link" href="#maintenance-updater">Log It</a>
              </div>
            </article>
          `
        )
        .join("")}
    </div>
  `;

  const grid = document.querySelector(".section-page-grid");
  if (grid) {
    grid.insertAdjacentElement("beforebegin", section);
  } else {
    main?.appendChild(section);
  }
}

function parseMaintenanceLog() {
  try {
    const entries = JSON.parse(localStorage.getItem("ridgeline-maintenance-log") || "[]");
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

function buildMaintenanceTimeline() {
  if (currentPageName() !== "maintenance.html" || document.getElementById("maintenance-timeline")) {
    return;
  }

  const savedEntries = parseMaintenanceLog().slice(0, 6);
  const fallbackEntries = [
    {
      date: "April 25, 2026",
      mileageText: "165,980 miles",
      service: "Timing belt service",
      note: "AISIN TKH-002 timing belt kit, water pump, sprocket, tensioner, pulleys, and cover seal."
    }
  ];
  const entries = savedEntries.length
    ? savedEntries.map((entry) => ({
        date: entry.date,
        mileageText: entry.mileageText,
        service: entry.service?.replace(/_/g, " ") || "Maintenance update",
        note: entry.note || "Saved maintenance update."
      }))
    : fallbackEntries;

  const section = document.createElement("section");
  section.className = "maintenance-timeline-section";
  section.id = "maintenance-timeline";
  section.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">Timeline</p>
        <h2>Maintenance History</h2>
      </div>
      <a class="utility-link" href="#maintenance-updater">Add Update</a>
    </div>
    <div class="maintenance-timeline">
      ${entries
        .map(
          (entry) => `
            <article class="timeline-item">
              <span>${entry.date || "Saved date"} / ${entry.mileageText || "Mileage not set"}</span>
              <strong>${entry.service}</strong>
              <p>${entry.note}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;

  const jobMode = document.getElementById("job-mode");
  if (jobMode) {
    jobMode.insertAdjacentElement("afterend", section);
  } else {
    main?.appendChild(section);
  }
}

function improveModelLoadingSurfaces() {
  document.querySelectorAll("[data-model-preview]").forEach((stage) => {
    stage.setAttribute("data-loading-label", stage.getAttribute("aria-label") || "Preparing 3D model");
  });

  const engineStage = document.querySelector(".engine-stage");
  if (engineStage && !engineStage.querySelector(".model-loading-plate")) {
    engineStage.insertAdjacentHTML(
      "afterbegin",
      `<div class="model-loading-plate" aria-hidden="true"><span>Preparing Engine Model</span><strong>3D</strong></div>`
    );
  }

  const wheelStage = document.querySelector(".wheel-stage");
  if (wheelStage && !wheelStage.querySelector(".model-loading-plate")) {
    wheelStage.insertAdjacentHTML(
      "afterbegin",
      `<div class="model-loading-plate" aria-hidden="true"><span>Preparing Tire Model</span><strong>3D</strong></div>`
    );
  }
}

function enableSectionTransitions() {
  if (!main || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const revealTargets = [
    ...main.querySelectorAll(":scope > section"),
    ...main.querySelectorAll(".section-page-grid > article"),
    ...main.querySelectorAll(".system-card, .tech-card, .dashboard-card, .related-card, .model-preview-card")
  ];

  if (!revealTargets.length) {
    return;
  }

  revealTargets.forEach((target) => {
    target.classList.add("section-reveal");
  });

  revealTargets.forEach((target, index) => {
    target.style.setProperty("--motion-index", `${Math.min(index, 8)}`);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -10% 0px",
      threshold: 0.08
    }
  );

  revealTargets.forEach((target) => observer.observe(target));
}

function relatedLinksForPage(page) {
  const map = {
    "index.html": [
      { label: "Engine Explorer", href: "engine.html", note: "Inspect the J35Y6 technical engine model." },
      { label: "Tire And Wheel Lab", href: "tires.html", note: "Open the 3D tire model and fitment guide." },
      { label: "Maintenance", href: "maintenance.html", note: "Service intervals, fluids, and specs." }
    ],
    "engine.html": [
      { label: "NFC Tags", href: "nfc.html", note: "Make physical tags open this engine model or a part reference." },
      { label: "Timing Service Record", href: "maintenance.html#major-service-log", note: "Open the recorded AISIN timing kit service." },
      { label: "Vehicle Map", href: "index.html#viewer", note: "Return to the full truck map." }
    ],
    "tires.html": [
      { label: "Maintenance", href: "maintenance.html#brake-tire", note: "Cross-check tire pressure and wheel torque." },
      { label: "Vehicle Map", href: "index.html#viewer", note: "Return to the live truck view." },
      { label: "Garage Log", href: "garage.html#dashboard", note: "Save tire changes and fitment notes." }
    ],
    "nfc.html": [
      { label: "Fuse Box A", href: "hood.html#hood-fuse-box-a", note: "Test the exact under-hood fuse-box deep link." },
      { label: "Cabin Fuses", href: "cabin.html#cabin-fuse-box-a", note: "Test the exact driver-left fuse-box deep link." },
      { label: "Vehicle Map", href: "index.html#viewer", note: "Return to the main truck map." }
    ],
    "maintenance.html": [
      { label: "Engine Explorer", href: "engine.html", note: "View the timing-side engine model." },
      { label: "Tire And Wheel Lab", href: "tires.html", note: "Open the 3D tire model and fitment guide." },
      { label: "Garage Log", href: "garage.html#dashboard", note: "Save what was actually installed and serviced." },
    ],
    "garage.html": [
      { label: "Maintenance", href: "maintenance.html#major-service-log", note: "Cross-check the service record and specs." },
      { label: "Vehicle Map", href: "index.html#viewer", note: "Return to the live vehicle map." },
      { label: "Photo Atlas", href: "photo-atlas.html", note: "Compare notes against real truck photos." }
    ],
    "diagnostics.html": [
      { label: "Vehicle Map", href: "index.html#viewer", note: "Jump to the area you need on the truck." },
      { label: "Fuse Boxes", href: "hood.html#fuses", note: "Go straight to front-bay fuse references." },
      { label: "Maintenance", href: "maintenance.html", note: "Open service specs and fluid references." }
    ]
  };

  return map[page] || [
    { label: "Vehicle Map", href: "index.html#viewer", note: "Return to the live truck view." },
    { label: "Maintenance", href: "maintenance.html", note: "Open specs, fluids, and service details." },
    { label: "Garage Log", href: "garage.html#dashboard", note: "Check truck-specific notes and service memory." }
  ];
}

function buildRelatedStrip() {
  const mainElement = document.querySelector("main");
  if (
    document.body?.hasAttribute("data-no-related-strip") ||
    !mainElement ||
    document.querySelector(".related-strip")
  ) {
    return;
  }

  const section = document.createElement("section");
  section.className = "related-strip";
  section.innerHTML = `
    <div class="section-head">
      <div>
        <p class="eyebrow">Related Stops</p>
        <h2>Next Likely Pages</h2>
      </div>
    </div>
    <div class="related-grid">
      ${relatedLinksForPage(currentPageName())
        .map(
          (link) => `
            <a class="related-card" href="${link.href}" data-nav-icon="${getNavIcon(link.label, link.href)}">
              <strong>${link.label}</strong>
              <span>${link.note}</span>
            </a>
          `
        )
        .join("")}
    </div>
  `;

  const dock = document.querySelector(".section-dock");
  if (dock) {
    dock.insertAdjacentElement("beforebegin", section);
  } else {
    mainElement.appendChild(section);
  }
}

function enhanceActiveLinks() {
  const page = currentPageName();
  const hash = liveActiveSectionId ? `#${liveActiveSectionId}` : location.hash;
  const links = [
    ...document.querySelectorAll(
      ".topnav a, .route-strip a, .header-quick-nav a, .header-current-page, .header-nav-button[href], .mobile-nav-link, .context-action[href], .site-menu-link, .section-dock a, .section-utility-nav a"
    )
  ];

  links.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const localHash = normalizeLocalHref(href);
    const isSectionOnlyLink =
      link.closest(".section-dock, .section-utility-nav") ||
      (href.startsWith("#") && !link.closest(".topnav, .route-strip, .header-quick-nav, .site-menu-links"));
    let active = false;
    let ariaCurrent = "page";

    if (href.startsWith("#")) {
      active = !!hash && href === hash;
      ariaCurrent = "location";
    } else if (href.includes(".html")) {
      active = isSectionOnlyLink
        ? href.split("#")[0] === page && (!localHash || localHash === hash)
        : isCurrentPageHref(href);
      ariaCurrent = link.closest(".site-menu-links")
        ? "page"
        : localHash && localHash === hash
          ? "location"
          : "page";
    }

    link.classList.toggle("is-current-link", active);
    if (active) {
      link.setAttribute("aria-current", ariaCurrent);
    } else {
      link.removeAttribute("aria-current");
    }
  });

  scheduleActiveNavSync();
}

function buildCollapsibleCards() {
  const pageMain = document.querySelector(".section-page-main");
  if (!pageMain) {
    return;
  }

  const cards = [
    ...document.querySelectorAll(".section-page-grid > article.tech-card, .section-page-grid > article.diagram-card")
  ];

  cards.forEach((card) => {
    if (card.dataset.collapsibleReady === "true") {
      return;
    }

    const title = card.querySelector(":scope > h3");
    if (!title) {
      return;
    }

    const children = [...card.children].filter((child) => child !== title);
    if (!children.length) {
      return;
    }

    const content = document.createElement("div");
    content.className = "collapsible-card-content";
    children.forEach((child) => content.appendChild(child));
    content.hidden = false;
    content.style.display = "";

    const button = document.createElement("button");
    button.className = "collapsible-card-toggle";
    button.type = "button";
    button.setAttribute("aria-expanded", "true");
    button.innerHTML = `<span>${title.textContent.trim()}</span><strong>Collapse</strong>`;

    const heading = document.createElement("div");
    heading.className = "collapsible-card-head";
    heading.append(title, button);

    card.append(heading, content);

    bindPress(button, () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", expanded ? "false" : "true");
      button.querySelector("strong").textContent = expanded ? "Expand" : "Collapse";
      content.hidden = expanded;
      content.style.display = expanded ? "none" : "";
      card.classList.toggle("is-collapsed", expanded);
    });

    card.dataset.collapsibleReady = "true";
  });
}

function buildSiteMenu() {
  if (!topbarActions) {
    return null;
  }

  const page = currentPageName();
  const menu = document.createElement("div");
  menu.className = "site-menu";
  menu.id = "site-menu";
  menu.hidden = true;

  const linkMarkup = menuLinks
    .map((link) => {
      const activeClass = page === link.match ? " is-active" : "";
      const ariaCurrent = page === link.match ? ` aria-current="page"` : "";
      const currentBadge = page === link.match ? `<em>Current</em>` : "";
      return `
        <a class="site-menu-link${activeClass}" href="${link.href}"${ariaCurrent}>
          <strong>${link.label}</strong>
          ${currentBadge}
          <span>${link.note}</span>
        </a>
      `;
    })
    .join("");

  menu.innerHTML = `
    <div class="site-menu-backdrop" data-close-menu></div>
    <aside class="site-menu-panel" aria-modal="true" role="dialog" aria-labelledby="site-menu-title">
      <div class="site-menu-head">
        <div>
          <p class="eyebrow">Site Menu</p>
          <h2 id="site-menu-title">Open A Section Fast</h2>
        </div>
        <button class="modal-close" type="button" data-close-menu aria-label="Close menu">Close</button>
      </div>
      <div class="site-menu-links">
        ${linkMarkup}
      </div>
      <section class="site-menu-tools" aria-label="Recent pages">
        <button class="site-menu-tools-toggle" type="button" data-recent-toggle aria-expanded="false">
          <span>Recent Pages</span>
          <strong>Expand</strong>
        </button>
        <div class="site-menu-tools-panel" data-recent-panel hidden>
          ${buildRecentNavMarkup()}
        </div>
      </section>
      <section class="site-menu-tools" aria-label="Quick tools">
        <button class="site-menu-tools-toggle" type="button" data-tools-toggle aria-expanded="false">
          <span>Quick Tools</span>
          <strong>Expand</strong>
        </button>
        <div class="site-menu-tools-panel" data-tools-panel hidden>
          <button class="site-menu-tool-button" type="button" data-tool-action="toggle-view">
            Cycle View Mode
          </button>
          <button class="site-menu-tool-button" type="button" data-tool-action="refresh-sw">
            Update Service Worker
          </button>
          <button class="site-menu-tool-button" type="button" data-tool-action="refresh-live">
            Live Refresh
          </button>
          <button class="site-menu-tool-button" type="button" data-tool-action="owner-auth">
            Owner Sign In
          </button>
          <button class="site-menu-tool-button" type="button" data-tool-action="resume-section">
            Resume Last Section
          </button>
          <button class="site-menu-tool-button" type="button" data-tool-action="top">
            Scroll To Top
          </button>
          <a class="site-menu-tool-link" href="${inferRepositoryUrl()}" target="_blank" rel="noreferrer">
            Open GitHub Repo
          </a>
          <p class="site-menu-tool-status" data-tool-status aria-live="polite"></p>
        </div>
      </section>
    </aside>
  `;

  document.body.appendChild(menu);
  bindFocusTrap(menu);
  let menuReturnFocus = null;

  const openMenu = (event) => {
    menuReturnFocus =
      event?.currentTarget instanceof HTMLElement
        ? event.currentTarget
        : document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    refreshRecentPanel(recentPanel);
    menu.hidden = false;
    document.body.classList.add("modal-open");
    focusFirstIn(menu, ".site-menu-panel button, .site-menu-link, .site-menu-panel a");
  };

  const closeMenu = () => {
    menu.hidden = true;
    if (!isAnyModalOpen()) {
      document.body.classList.remove("modal-open");
    }
    restoreFocusTo(menuReturnFocus);
    menuReturnFocus = null;
  };

  menu.querySelectorAll("[data-close-menu], .site-menu-link").forEach((element) => {
    element.addEventListener("click", closeMenu);
  });

  document.querySelectorAll("[data-open-site-menu]").forEach((element) => {
    bindPress(element, openMenu);
  });

  const toolsToggle = menu.querySelector("[data-tools-toggle]");
  const toolsPanel = menu.querySelector("[data-tools-panel]");
  const toolsStatus = menu.querySelector("[data-tool-status]");
  const recentToggle = menu.querySelector("[data-recent-toggle]");
  const recentPanel = menu.querySelector("[data-recent-panel]");

  const setToolsStatus = (message = "") => {
    if (!toolsStatus) {
      return;
    }
    toolsStatus.textContent = message;
  };

  if (toolsToggle) {
    setPanelVisibility(toolsPanel, false, "grid");
    bindPress(toolsToggle, () => {
      const expanded = toolsToggle.getAttribute("aria-expanded") === "true";
      toolsToggle.setAttribute("aria-expanded", expanded ? "false" : "true");
      const label = toolsToggle.querySelector("strong");
      if (label) {
        label.textContent = expanded ? "Expand" : "Collapse";
      }
      setPanelVisibility(toolsPanel, !expanded, "grid");
    });
  }

  if (recentToggle) {
    setPanelVisibility(recentPanel, false, "grid");
    bindPress(recentToggle, () => {
      const expanded = recentToggle.getAttribute("aria-expanded") === "true";
      recentToggle.setAttribute("aria-expanded", expanded ? "false" : "true");
      const label = recentToggle.querySelector("strong");
      if (label) {
        label.textContent = expanded ? "Expand" : "Collapse";
      }
      setPanelVisibility(recentPanel, !expanded, "grid");
    });
  }

  menu.querySelector("[data-tool-action='toggle-view']") && bindPress(
    menu.querySelector("[data-tool-action='toggle-view']"),
    () => {
      const modeOrder = ["navigation", "essential", "full"];
      const modeIndex = modeOrder.indexOf(currentContentMode);
      const nextMode = modeOrder[(modeIndex + 1) % modeOrder.length] || "full";
      setContentMode(nextMode, true);
      const modeLabel =
        nextMode === "navigation"
          ? "Navigation only enabled."
          : nextMode === "essential"
            ? "Essential view enabled."
            : "All content restored.";
      setToolsStatus(modeLabel);
    }
  );

  menu.querySelector("[data-tool-action='top']") && bindPress(
    menu.querySelector("[data-tool-action='top']"),
    () => {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      setToolsStatus("Scrolled to top.");
    }
  );

  menu.querySelector("[data-tool-action='owner-auth']") && bindPress(
    menu.querySelector("[data-tool-action='owner-auth']"),
    () => {
      closeMenu();
      openOwnerAuthModal();
    }
  );

  menu.querySelector("[data-tool-action='refresh-live']")?.addEventListener("click", async () => {
    setToolsStatus("Refreshing saved data and code...");
    await triggerLiveRefresh(setToolsStatus);
  });

  menu.querySelector("[data-tool-action='resume-section']") && bindPress(
    menu.querySelector("[data-tool-action='resume-section']"),
    () => {
      const target = document.getElementById(getLastSection());
      if (!target) {
        setToolsStatus("No saved section to resume yet.");
        return;
      }
      scrollToSectionElement(target, "smooth");
      setToolsStatus("Resumed last section.");
      closeMenu();
    }
  );

  menu.querySelector("[data-tool-action='refresh-sw']")?.addEventListener("click", async () => {
    setToolsStatus("Updating service worker...");
    try {
      await refreshServiceWorkerRegistrations();
      setToolsStatus("Service worker update check complete.");
    } catch {
      setToolsStatus("Could not update the service worker in this browser session.");
    }
  });

  recentPanel?.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      closeMenu();
    }
  });

  return { menu, openMenu, closeMenu };
}

function buildBreadcrumbTrail(sections = []) {
  if (document.querySelector(".breadcrumb-trail")) {
    return;
  }

  const supportHost = getNavigationSupportHost();
  const trail = document.createElement("nav");
  trail.className = "breadcrumb-trail";
  trail.setAttribute("aria-label", "Current location");
  trail.innerHTML = `
    <a href="index.html">Home</a>
    <span>/</span>
    <a href="${currentPageName() === "index.html" ? "index.html#viewer" : location.pathname.split("/").pop()}">${currentPageDisplayLabel()}</a>
    <span data-breadcrumb-section-wrap hidden>/ <strong data-breadcrumb-section></strong></span>
  `;
  if (supportHost) {
    supportHost.appendChild(trail);
  } else {
    document.querySelector(".topbar")?.insertAdjacentElement("afterend", trail);
  }

  const sectionWrap = trail.querySelector("[data-breadcrumb-section-wrap]");
  const sectionLabel = trail.querySelector("[data-breadcrumb-section]");
  window.addEventListener("ridgeline:active-section", (event) => {
    const label = sections.find((section) => section.id === event.detail?.id)?.label;
    sectionWrap.hidden = !label;
    if (label) {
      sectionLabel.textContent = label;
    }
  });
}

function buildRecentStrip() {
  if (document.querySelector(".recent-strip")) {
    return;
  }

  const supportHost = getNavigationSupportHost();
  const items = loadRecentNav().slice(0, 5);
  const fallback = [
    { label: "Vehicle Map", href: "index.html#viewer" },
    { label: "Maintenance", href: "maintenance.html" },
    { label: "Fuse Boxes", href: "hood.html#fuses" },
    { label: "Garage", href: "garage.html" }
  ];
  const links = items.length ? items : fallback;
  const strip = document.createElement("nav");
  strip.className = "recent-strip";
  strip.setAttribute("aria-label", "Recently viewed");
  strip.innerHTML = `
    <span>Recent</span>
    ${links.map((item) => `<a href="${item.href}">${item.label}</a>`).join("")}
  `;
  if (supportHost) {
    supportHost.appendChild(strip);
  } else {
    document.querySelector(".breadcrumb-trail")?.insertAdjacentElement("afterend", strip);
  }
}

function buildSyncStatusBadges() {
  if (document.querySelector(".sync-status-badges")) {
    return;
  }

  const supportHost = getNavigationSupportHost();
  const badges = document.createElement("div");
  badges.className = "sync-status-badges";
  badges.setAttribute("aria-label", "Save, backup, and offline status");
  let offlinePackReady = false;
  const render = (message = "Saved locally") => {
    const githubReady = Boolean(localStorage.getItem("ridgeline-github-backup-endpoint"));
    const supabaseOff = localStorage.getItem("ridgeline-remote-enabled") === "0";
    const online = navigator.onLine !== false;
    const hasServiceWorker = "serviceWorker" in navigator;
    const serviceWorkerControlled = Boolean(navigator.serviceWorker?.controller);
    const offlinePackLabel = hasServiceWorker
      ? serviceWorkerControlled || offlinePackReady
        ? "Offline pack ready"
        : "Offline pack loading"
      : "Offline pack unavailable";
    const statusMessage = online ? message : "Browsing cached site";
    badges.innerHTML = `
      <span>Saved</span>
      <span>${supabaseOff ? "Supabase off" : "Supabase ready"}</span>
      <span>${githubReady ? "GitHub backup ready" : "GitHub backup not set"}</span>
      <span data-sync-network>${online ? "Online" : "Offline"}</span>
      <strong data-sync-offline-pack>${offlinePackLabel}</strong>
      <strong data-sync-local-message>${statusMessage}</strong>
    `;
  };
  render();
  window.addEventListener("ridgeline:storage-hydrated", () => render("Synced from remote"));
  window.addEventListener("storage", () => render());
  window.addEventListener("online", () => render("Back online"));
  window.addEventListener("offline", () => render("Browsing cached site"));
  navigator.serviceWorker?.addEventListener?.("controllerchange", () => render("Offline pack updated"));
  navigator.serviceWorker?.ready?.then(() => {
    offlinePackReady = true;
    render();
  }).catch(() => {});
  if (supportHost) {
    supportHost.appendChild(badges);
  } else {
    document.querySelector(".recent-strip")?.insertAdjacentElement("afterend", badges);
  }
}

function buildPageActionBar() {
  if (document.querySelector(".page-action-bar")) {
    return;
  }

  const supportHost = getNavigationSupportHost();
  const current = currentPageName();
  const relatedHref =
    current === "index.html"
      ? "hood.html#fuses"
      : current === "maintenance.html"
        ? "garage.html"
        : current === "garage.html"
          ? "maintenance.html"
          : "index.html#viewer";
  const bar = document.createElement("nav");
  bar.className = "page-action-bar";
  bar.setAttribute("aria-label", "Page actions");
  bar.innerHTML = `
    <a href="garage.html#notes">Save Note</a>
    <a href="${relatedHref}">Related</a>
    <button type="button" data-page-action="share">Share</button>
    <button type="button" data-page-action="sync-settings">Sync</button>
  `;
  bar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page-action]");
    if (!button) {
      return;
    }
    performUiAction(button.dataset.pageAction);
  });
  if (supportHost) {
    supportHost.appendChild(bar);
  } else {
    document.querySelector(".sync-status-badges")?.insertAdjacentElement("afterend", bar);
  }
}

const quickCommands = [
  { label: "Open Garage Notes", hint: "Save notes, records, and reminders", href: "garage.html#notes", icon: "garage" },
  { label: "Open Truck Profile", hint: "VIN, fluids, tires, torque, and common part numbers", href: "garage.html#truck-profile", icon: "garage" },
  { label: "Open Maintenance Staging", hint: "Saved prep and Minder staging checklist", href: "garage.html#maintenance-note-preview", icon: "wrench" },
  { label: "Open RockAuto Parts", hint: "2019 Ridgeline 3.5L V6 catalog shortcuts", href: "garage.html#rockauto-parts", icon: "wrench" },
  { label: "Find Under-Hood Fuse Box A", hint: "Jump to the active 3D map hotspot", href: "index.html?system=fuse-engine-a#viewer", icon: "bolt" },
  { label: "Show Jack Points", hint: "Open the truck map on roadside jack points", href: "index.html?system=jack-points#viewer", icon: "wrench" },
  { label: "Run Diagnostics", hint: "Go to quick checks and troubleshooting", href: "diagnostics.html#quick-checks", icon: "diag" },
  { label: "Open Tire Lab", hint: "Fitment, pressure, and wheel reference", href: "tires.html#wheel-model", icon: "wheel" },
  { label: "Open Emergency Card", hint: "Fast roadside reference", href: "quick-sheet.html#emergency-card", icon: "flash" },
  { label: "Write NFC Tag", hint: "Open the NFC tag console", href: "nfc.html#tag-writer", icon: "nfc" },
  { label: "Back To Vehicle Map", hint: "Return to the 3D truck home screen", href: "index.html#viewer", icon: "map" }
];

const needLauncherActions = [
  { label: "Find a fuse", href: "hood.html#fuses", icon: "bolt" },
  { label: "Diagnose a problem", href: "diagnostics.html#quick-checks", icon: "diag" },
  { label: "Log service", href: "maintenance.html", icon: "wrench" },
  { label: "Jack the truck", href: "index.html?system=jack-points#viewer", icon: "wrench" },
  { label: "Save a note", href: "garage.html#notes", icon: "garage" },
  { label: "Use emergency card", href: "quick-sheet.html#emergency-card", icon: "flash" }
];

const visualSiteMapGroups = [
  {
    label: "Electrical",
    links: [
      { label: "Hood Fuses", href: "hood.html#fuses" },
      { label: "Cabin Fuses", href: "cabin.html#fuses" },
      { label: "Diagnostics", href: "diagnostics.html#quick-checks" }
    ]
  },
  {
    label: "Maintenance",
    links: [
      { label: "Service Log", href: "maintenance.html" },
      { label: "Tire Lab", href: "tires.html#wheel-model" },
      { label: "Quick Sheet", href: "quick-sheet.html#emergency-card" }
    ]
  },
  {
    label: "Garage",
    links: [
      { label: "Truck Profile", href: "garage.html#truck-profile" },
      { label: "Maintenance Staging", href: "garage.html#maintenance-note-preview" },
      { label: "RockAuto Parts", href: "garage.html#rockauto-parts" },
      { label: "Notes", href: "garage.html#notes" },
      { label: "Photo Atlas", href: "photo-atlas.html" },
      { label: "NFC Tags", href: "nfc.html#tag-writer" }
    ]
  },
  {
    label: "Models",
    links: [
      { label: "Vehicle Map", href: "index.html#viewer" },
      { label: "Engine", href: "engine.html#engine-model" },
      { label: "AR Lab", href: "ar-lab.html" }
    ]
  }
];

function runCommand(command) {
  saveLastTask({ href: command.href, label: command.label, kind: "command" });
  showToast(`Opening ${command.label}`);
  window.location.href = command.href;
}

function buildCommandPalette() {
  const modal = document.createElement("div");
  modal.className = "command-palette";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="command-backdrop" data-close-command></div>
    <section class="command-panel" aria-modal="true" role="dialog" aria-labelledby="command-title">
      <div class="command-head">
        <div>
          <p class="eyebrow">Command Palette</p>
          <h2 id="command-title">Jump Straight To The Task</h2>
        </div>
        <button class="modal-close" type="button" data-close-command aria-label="Close command palette">Close</button>
      </div>
      <input class="command-input" type="search" placeholder="Try fuse, jack, note, tire, emergency..." />
      <div class="command-list"></div>
      <div class="search-foot">
        <span>Tip: press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>K</kbd></span>
      </div>
    </section>
  `;
  document.body.appendChild(modal);
  bindFocusTrap(modal);

  const input = modal.querySelector(".command-input");
  const list = modal.querySelector(".command-list");
  const render = () => {
    const query = input.value.trim().toLowerCase();
    const matches = quickCommands.filter((command) => {
      const haystack = `${command.label} ${command.hint}`.toLowerCase();
      return !query || haystack.includes(query);
    });
    list.innerHTML = matches
      .map(
        (command, index) => `
          <button type="button" data-command-index="${quickCommands.indexOf(command)}" data-nav-icon="${command.icon}">
            <strong>${command.label}</strong>
            <span>${command.hint}</span>
          </button>
        `
      )
      .join("");
    if (!matches.length) {
      list.innerHTML = `<p class="search-empty">No command found. Try a simpler truck word.</p>`;
    }
  };

  input.addEventListener("input", render);
  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-command]")) {
      closeCommandPalette();
      return;
    }
    const commandButton = event.target.closest("[data-command-index]");
    if (!commandButton) {
      return;
    }
    const command = quickCommands[Number(commandButton.dataset.commandIndex)];
    if (command) {
      closeCommandPalette();
      runCommand(command);
    }
  });
  render();
  return { modal, input, render };
}

let commandPaletteReturnFocus = null;

function openCommandPalette() {
  commandPaletteReturnFocus =
    document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : commandPaletteReturnFocus;
  commandPalette.modal.hidden = false;
  document.body.classList.add("modal-open");
  commandPalette.render();
  focusFirstIn(commandPalette.modal, ".command-input");
}

function closeCommandPalette() {
  commandPalette.modal.hidden = true;
  if (!isAnyModalOpen()) {
    document.body.classList.remove("modal-open");
  }
  restoreFocusTo(commandPaletteReturnFocus);
  commandPaletteReturnFocus = null;
}

function loadFavoritePins() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAVORITE_PINS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavoritePins(pins) {
  localStorage.setItem(FAVORITE_PINS_STORAGE_KEY, JSON.stringify(pins.slice(0, 6)));
}

function buildNeedLauncher() {
  if (document.querySelector(".need-launcher")) {
    return;
  }

  const supportHost = getNavigationSupportHost();
  const launcher = document.createElement("section");
  launcher.className = "need-launcher";
  launcher.setAttribute("aria-label", "Task launcher");
  launcher.innerHTML = `
    <div class="compact-section-head">
      <div>
        <p class="eyebrow">I Need To</p>
        <h2>Start From The Job</h2>
      </div>
      <button type="button" data-launch-command>Command Palette</button>
    </div>
    <div class="need-launcher-grid">
      ${needLauncherActions
        .map((action) => `<a href="${action.href}" data-nav-icon="${action.icon}">${action.label}</a>`)
        .join("")}
    </div>
  `;
  launcher.querySelector("[data-launch-command]")?.addEventListener("click", openCommandPalette);

  if (supportHost) {
    supportHost.appendChild(launcher);
  } else {
    document.querySelector(".page-action-bar")?.insertAdjacentElement("afterend", launcher);
  }
}

function buildFavoritePins() {
  if (document.querySelector(".favorite-pins")) {
    return;
  }

  const supportHost = getNavigationSupportHost();
  const panel = document.createElement("section");
  panel.className = "favorite-pins";
  panel.setAttribute("aria-label", "Favorite pins");
  panel.innerHTML = `
    <div class="compact-section-head">
      <div>
        <p class="eyebrow">Pinned</p>
        <h2>Favorite Stops</h2>
      </div>
      <button type="button" data-pin-current>Pin Current</button>
    </div>
    <div class="favorite-pin-list" data-favorite-pin-list></div>
  `;

  const list = panel.querySelector("[data-favorite-pin-list]");
  const defaultPins = [
    { label: "Vehicle Map", href: "index.html#viewer" },
    { label: "Garage Notes", href: "garage.html#notes" },
    { label: "Emergency Card", href: "quick-sheet.html#emergency-card" }
  ];
  const render = () => {
    const pins = loadFavoritePins();
    const visible = pins.length ? pins : defaultPins;
    list.innerHTML = visible
      .map(
        (pin, index) => `
          <span class="favorite-pin">
            <a href="${pin.href}">${pin.label}</a>
            ${pins.length ? `<button type="button" data-remove-pin="${index}" aria-label="Remove ${pin.label}">Remove</button>` : ""}
          </span>
        `
      )
      .join("");
  };

  panel.addEventListener("click", (event) => {
    const pinButton = event.target.closest("[data-pin-current]");
    if (pinButton) {
      const current = { label: currentPageDisplayLabel(), href: currentLocationHref() };
      const next = [current, ...loadFavoritePins().filter((pin) => pin.href !== current.href)].slice(0, 6);
      saveFavoritePins(next);
      render();
      showToast(`Pinned ${current.label}`);
      return;
    }

    const removeButton = event.target.closest("[data-remove-pin]");
    if (removeButton) {
      const pins = loadFavoritePins();
      pins.splice(Number(removeButton.dataset.removePin), 1);
      saveFavoritePins(pins);
      render();
      showToast("Pin removed");
    }
  });
  render();

  if (supportHost) {
    supportHost.appendChild(panel);
  } else {
    document.querySelector(".need-launcher")?.insertAdjacentElement("afterend", panel);
  }
}

function buildVisualSiteMap() {
  if (document.querySelector(".visual-site-map")) {
    return;
  }

  const supportHost = getNavigationSupportHost();
  const map = document.createElement("section");
  map.className = "visual-site-map";
  map.setAttribute("aria-label", "Visual site map");
  map.innerHTML = `
    <div class="compact-section-head">
      <div>
        <p class="eyebrow">Site Map</p>
        <h2>Find It By Area</h2>
      </div>
      <button type="button" data-page-action="last-task">Back To Last Task</button>
    </div>
    <div class="site-map-grid">
      ${visualSiteMapGroups
        .map(
          (group) => `
            <article class="site-map-group">
              <h3>${group.label}</h3>
              ${group.links.map((link) => `<a href="${link.href}">${link.label}</a>`).join("")}
            </article>
          `
        )
        .join("")}
    </div>
  `;
  map.querySelector("[data-page-action='last-task']")?.addEventListener("click", restoreLastTask);

  if (supportHost) {
    supportHost.appendChild(map);
  } else {
    document.querySelector(".favorite-pins")?.insertAdjacentElement("afterend", map);
  }
}

function buildQuickCapture() {
  if (document.body.classList.contains("drive-map-page") || document.querySelector(".quick-capture-modal")) {
    return;
  }

  const fab = document.createElement("button");
  fab.className = "quick-capture-fab";
  fab.type = "button";
  fab.setAttribute("aria-label", "Quick add");
  fab.innerHTML = `<span>+</span>`;
  fab.addEventListener("click", openQuickCapture);
  document.body.appendChild(fab);

  const modal = document.createElement("div");
  modal.className = "quick-capture-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="quick-capture-backdrop" data-close-quick-capture></div>
    <section class="quick-capture-panel" aria-modal="true" role="dialog" aria-labelledby="quick-capture-title">
      <div class="command-head">
        <div>
          <p class="eyebrow">Quick Capture</p>
          <h2 id="quick-capture-title">Save It Before You Forget</h2>
        </div>
        <button class="modal-close" type="button" data-close-quick-capture>Close</button>
      </div>
      <form class="quick-capture-form" data-quick-capture-form>
        <label>
          <span>Save type</span>
          <select name="kind" data-quick-capture-kind>
            <option value="note">Garage note</option>
            <option value="service">Service log</option>
            <option value="photo">Reference photo</option>
            <option value="nfc">NFC tag task</option>
          </select>
        </label>
        <label><span>Title</span><input name="title" type="text" placeholder="Battery label, oil change, fuse cover..." /></label>
        <label><span>Mileage</span><input name="mileage" type="number" min="0" step="1" inputmode="numeric" placeholder="165980" /></label>
        <label><span>Details</span><textarea name="details" rows="4" placeholder="Part numbers, symptoms, tools, reminders, or anything useful."></textarea></label>
        <label data-quick-photo-field hidden><span>Photos</span><input name="photos" type="file" accept="image/*" multiple /></label>
        <p class="quick-capture-status" data-quick-capture-status aria-live="polite"></p>
        <div class="quick-capture-actions">
          <button class="primary-button" type="submit">Save Capture</button>
          <a class="secondary-button" href="garage.html#dashboard">Open Garage</a>
        </div>
      </form>
    </section>
  `;
  document.body.appendChild(modal);
  bindFocusTrap(modal);

  const form = modal.querySelector("[data-quick-capture-form]");
  const kindSelect = modal.querySelector("[data-quick-capture-kind]");
  const photoField = modal.querySelector("[data-quick-photo-field]");
  const status = modal.querySelector("[data-quick-capture-status]");

  const syncKindUi = () => {
    photoField.hidden = kindSelect.value !== "photo";
  };

  kindSelect.addEventListener("change", syncKindUi);
  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-quick-capture]")) {
      closeQuickCapture();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "Saving...";
    const formData = new FormData(form);
    const kind = formData.get("kind");
    const title = `${formData.get("title") || ""}`.trim() || "Quick capture";
    const mileage = `${formData.get("mileage") || ""}`.trim();
    const details = `${formData.get("details") || ""}`.trim();
    const capturedAt = new Date().toISOString();

    try {
      const garageData = await import("./garage-data.js");
      if (kind === "photo") {
        const files = [...(form.elements.photos?.files || [])];
        if (!files.length) {
          status.textContent = "Choose at least one photo first.";
          return;
        }
        const photos = garageData.loadJson(garageData.STORAGE.photos, []);
        const entries = await garageData.filesToPhotoEntries(files, { scope: "quick-capture" });
        garageData.saveJson(garageData.STORAGE.photos, [
          ...entries.map((entry) => ({ ...entry, label: title || entry.label, note: details, mileage, capturedAt })),
          ...photos
        ]);
      } else if (kind === "service") {
        const log = garageData.loadJson(garageData.STORAGE.maintenanceLog, []);
        garageData.saveJson(garageData.STORAGE.maintenanceLog, [
          { id: `service-${Date.now()}`, title, mileage, details, capturedAt },
          ...log
        ]);
      } else if (kind === "nfc") {
        const notes = garageData.loadJson(garageData.STORAGE.notes, {});
        notes[`nfc_task_${Date.now()}`] = `${title}${mileage ? ` | ${mileage} mi` : ""}${details ? ` | ${details}` : ""}`;
        garageData.saveJson(garageData.STORAGE.notes, notes);
        window.location.href = "nfc.html#tag-writer";
        return;
      } else {
        const notes = garageData.loadJson(garageData.STORAGE.notes, {});
        notes[`quick_capture_${Date.now()}`] = `${title}${mileage ? ` | ${mileage} mi` : ""}${details ? ` | ${details}` : ""}`;
        garageData.saveJson(garageData.STORAGE.notes, notes);
      }

      localStorage.setItem("ridgeline-last-capture", capturedAt);
      window.dispatchEvent(new CustomEvent("ridgeline:quick-capture-saved"));
      showToast("Quick capture saved");
      status.textContent = "Saved to Garage data and queued for backup.";
      form.reset();
      syncKindUi();
    } catch (error) {
      console.warn("Quick capture failed.", error);
      status.textContent = "Could not save this capture.";
      showToast("Quick capture failed", "warning");
    }
  });

  syncKindUi();
}

let quickCaptureReturnFocus = null;

function openQuickCapture() {
  const modal = document.querySelector(".quick-capture-modal");
  quickCaptureReturnFocus =
    document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : quickCaptureReturnFocus;
  modal?.removeAttribute("hidden");
  document.body.classList.add("modal-open");
  focusFirstIn(modal, "input[name='title']");
}

function closeQuickCapture() {
  const modal = document.querySelector(".quick-capture-modal");
  if (!modal) {
    return;
  }
  modal.hidden = true;
  if (!isAnyModalOpen()) {
    document.body.classList.remove("modal-open");
  }
  restoreFocusTo(quickCaptureReturnFocus);
  quickCaptureReturnFocus = null;
}

function buildSyncSettingsPanel() {
  if (document.querySelector(".sync-settings-modal")) {
    return;
  }

  const modal = document.createElement("div");
  modal.className = "sync-settings-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="quick-capture-backdrop" data-close-sync-settings></div>
    <section class="sync-settings-panel" aria-modal="true" role="dialog" aria-labelledby="sync-settings-title">
      <div class="command-head">
        <div>
          <p class="eyebrow">Backup Health</p>
          <h2 id="sync-settings-title">Supabase And GitHub Sync</h2>
        </div>
        <button class="modal-close" type="button" data-close-sync-settings>Close</button>
      </div>
      <div class="sync-health-grid" data-sync-health-grid></div>
      <label class="sync-toggle-row">
        <input type="checkbox" data-sync-enabled />
        <span>Use Supabase remote refresh and saves</span>
      </label>
      <label>
        <span>GitHub backup endpoint</span>
        <input data-github-backup-endpoint type="url" placeholder="https://..." />
      </label>
      <p class="small-note" data-sync-settings-status aria-live="polite"></p>
      <div class="quick-capture-actions">
        <button class="primary-button" type="button" data-force-sync-refresh>Force Remote Refresh</button>
        <button class="secondary-button" type="button" data-save-sync-settings>Save Settings</button>
      </div>
    </section>
  `;
  document.body.appendChild(modal);
  bindFocusTrap(modal);

  modal.addEventListener("click", async (event) => {
    if (event.target.closest("[data-close-sync-settings]")) {
      closeSyncSettings();
      return;
    }

    if (event.target.closest("[data-save-sync-settings]")) {
      await saveSyncSettings();
      return;
    }

    if (event.target.closest("[data-force-sync-refresh]")) {
      await forceSyncRefresh();
    }
  });
}

async function renderSyncSettings() {
  const modal = document.querySelector(".sync-settings-modal");
  if (!modal) {
    return;
  }

  const grid = modal.querySelector("[data-sync-health-grid]");
  const status = modal.querySelector("[data-sync-settings-status]");
  const endpoint = modal.querySelector("[data-github-backup-endpoint]");
  const enabled = modal.querySelector("[data-sync-enabled]");
  const lastRefresh = localStorage.getItem("ridgeline-last-remote-refresh");
  const lastCapture = localStorage.getItem("ridgeline-last-capture");

  try {
    const garageData = await import("./garage-data.js");
    const state = garageData.getGarageCloudState();
    endpoint.value = localStorage.getItem("ridgeline-github-backup-endpoint") || "";
    enabled.checked = state.enabled;
    grid.innerHTML = `
      <article><span>Supabase</span><strong>${state.configured && state.enabled ? "Ready" : "Off"}</strong><p>${state.temporarilyDisabled ? "Temporarily paused after a failed request." : "Loads with no-store refresh requests."}</p></article>
      <article><span>GitHub Backup</span><strong>${state.githubBackupConfigured ? "Configured" : "Not Set"}</strong><p>${state.githubBackupConfigured ? "Queued after Garage data saves." : "Add an endpoint to enable backup posts."}</p></article>
      <article><span>Last Refresh</span><strong>${lastRefresh ? new Date(lastRefresh).toLocaleString() : "Not yet"}</strong><p>Refresh pulls from GitHub and Supabase, not cached page data.</p></article>
      <article><span>Last Capture</span><strong>${lastCapture ? new Date(lastCapture).toLocaleString() : "None"}</strong><p>Quick captures save through Garage data.</p></article>
    `;
    status.textContent = "Sync state loaded.";
  } catch {
    grid.innerHTML = `<article><span>Sync</span><strong>Unavailable</strong><p>Could not load the Garage data module.</p></article>`;
    status.textContent = "Sync settings could not load.";
  }
}

async function saveSyncSettings() {
  const modal = document.querySelector(".sync-settings-modal");
  const status = modal?.querySelector("[data-sync-settings-status]");
  try {
    const garageData = await import("./garage-data.js");
    garageData.setGarageCloudEnabled(Boolean(modal.querySelector("[data-sync-enabled]")?.checked));
    garageData.setGitHubBackupEndpoint(modal.querySelector("[data-github-backup-endpoint]")?.value || "");
    status.textContent = "Settings saved.";
    showToast("Sync settings saved");
    await renderSyncSettings();
  } catch {
    status.textContent = "Could not save sync settings.";
  }
}

async function forceSyncRefresh() {
  const modal = document.querySelector(".sync-settings-modal");
  const status = modal?.querySelector("[data-sync-settings-status]");
  status.textContent = "Refreshing from remote...";
  try {
    const garageData = await import("./garage-data.js");
    const ok = await garageData.refreshGarageBackups({ enableRemote: true });
    localStorage.setItem("ridgeline-last-remote-refresh", new Date().toISOString());
    window.dispatchEvent(new CustomEvent("ridgeline:storage-hydrated"));
    status.textContent = ok ? "Remote refresh complete." : "Refresh ran, but no remote backup responded.";
    showToast(status.textContent);
    await renderSyncSettings();
  } catch {
    status.textContent = "Could not refresh remote backups.";
    showToast("Remote refresh failed", "warning");
  }
}

let syncSettingsReturnFocus = null;

function openSyncSettings() {
  const modal = document.querySelector(".sync-settings-modal");
  syncSettingsReturnFocus =
    document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement
      : syncSettingsReturnFocus;
  modal?.removeAttribute("hidden");
  document.body.classList.add("modal-open");
  renderSyncSettings();
  focusFirstIn(modal, "[data-sync-enabled], input, button");
}

function closeSyncSettings() {
  const modal = document.querySelector(".sync-settings-modal");
  if (!modal) {
    return;
  }
  modal.hidden = true;
  if (!isAnyModalOpen()) {
    document.body.classList.remove("modal-open");
  }
  restoreFocusTo(syncSettingsReturnFocus);
  syncSettingsReturnFocus = null;
}

function buildEmptyStates() {
  const configs = [
    { selector: "[data-favorites-list]", title: "No fuse favorites saved yet.", copy: "Save repeat fuse checks so they show up here.", href: "hood.html#fuses", action: "Open Fuses" },
    { selector: "[data-photo-grid]", title: "No reference photos yet.", copy: "Add real truck photos for fuse covers, labels, hitch wiring, and service areas.", action: "Quick Add Photo", quickKind: "photo" },
    { selector: "[data-atlas-grid]", title: "No photos in this atlas yet.", copy: "Photos added in Garage appear here by truck area.", href: "garage.html#photos", action: "Open Photos" },
    { selector: "[data-area-summary]", title: "No area journals yet.", copy: "Use area pages or quick capture to start building truck-specific notes.", action: "Quick Add Note", quickKind: "note" },
    { selector: "#nfc-target-grid", title: "No NFC targets rendered yet.", copy: "Open the writer to choose a truck location and prepare a tag.", href: "nfc.html#tag-writer", action: "Open Writer" }
  ];

  const render = () => {
    configs.forEach((config) => {
      document.querySelectorAll(config.selector).forEach((container) => {
        const hasRealContent = [...container.children].some((child) => !child.classList.contains("empty-state-card"));
        container.querySelector(".empty-state-card")?.remove();
        if (hasRealContent || (container.textContent || "").trim()) {
          return;
        }
        const empty = document.createElement(config.href ? "a" : "button");
        empty.className = "empty-state-card";
        if (config.href) {
          empty.href = config.href;
        } else {
          empty.type = "button";
          empty.addEventListener("click", () => openQuickCaptureWithKind(config.quickKind || "note"));
        }
        empty.innerHTML = `
          <span>${config.title}</span>
          <p>${config.copy}</p>
          <strong>${config.action}</strong>
        `;
        container.appendChild(empty);
      });
    });
  };

  window.setTimeout(render, 900);
  window.addEventListener("ridgeline:storage-hydrated", () => window.setTimeout(render, 250));
  window.addEventListener("ridgeline:quick-capture-saved", () => window.setTimeout(render, 250));
}

function openQuickCaptureWithKind(kind) {
  openQuickCapture();
  const select = document.querySelector("[data-quick-capture-kind]");
  if (select) {
    select.value = kind;
    select.dispatchEvent(new Event("change"));
  }
}

function getNavigationSupportHost() {
  const isHome = currentPageName() === "index.html";
  if (document.body.classList.contains("drive-map-page")) {
    return null;
  }

  let host = document.querySelector(isHome ? ".home-support-panel" : ".subpage-support-panel");
  if (host) {
    return host;
  }

  host = document.createElement("section");
  host.className = isHome ? "home-support-panel" : "subpage-support-panel";
  host.setAttribute("aria-label", isHome ? "Home navigation support" : "Page navigation support");

  if (isHome) {
    const viewer = document.querySelector("#viewer");
    if (!viewer) {
      return null;
    }
    viewer.insertAdjacentElement("afterend", host);
    return host;
  }

  if (insertSubpageIntroTool(host)) {
    return host;
  }

  if (main) {
    main.insertAdjacentElement("afterbegin", host);
  } else {
    document.querySelector(".topbar")?.insertAdjacentElement("afterend", host);
  }

  return host;
}

function recordCurrentPageVisit() {
  const hash = location.hash && location.hash !== "#top" ? location.hash : "";
  recordRecentNavEntry({
    href: `${currentPageName()}${hash}`,
    label: currentPageDisplayLabel()
  });
}

function registerRecentNavTracking() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) {
      return;
    }

    const href = link.getAttribute("href");
    if (!href || href.startsWith("javascript:")) {
      return;
    }

    let url;
    try {
      url = new URL(href, location.href);
    } catch {
      return;
    }

    if (url.origin !== location.origin) {
      return;
    }

    const page = url.pathname.split("/").pop() || "index.html";
    const label = link.textContent?.trim() || link.getAttribute("aria-label") || page;
    recordRecentNavEntry({
      href: `${page}${url.hash || ""}`,
      label
    });
  });
}

function buildSearchModal() {
  const modal = document.createElement("div");
  modal.className = "search-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="search-backdrop" data-close-search></div>
    <section class="search-panel" aria-modal="true" role="dialog" aria-labelledby="search-title">
      <div class="search-head">
        <div>
          <p class="eyebrow">Global Search</p>
          <h2 id="search-title">Find Anything Fast</h2>
        </div>
        <button class="modal-close" type="button" data-close-search aria-label="Close search">Close</button>
      </div>
      <input class="search-input" id="site-search-input" type="search" placeholder="Search fuses, specs, acronyms, pages..." />
      <section class="search-lens-strip" aria-label="How search understands this query" data-search-lens-strip hidden>
        <div class="search-lens-head">
          <strong>Search Lens</strong>
          <span data-search-lens-copy>Search by symptom, location, task, or part.</span>
        </div>
        <div class="search-lens-grid" data-search-lens-list></div>
      </section>
      <section class="search-resume-strip" aria-label="Resume owner workflow" data-search-resume-work hidden>
        <div class="search-resume-head">
          <strong>Resume</strong>
          <span>Return to the last useful spot on this iPhone</span>
        </div>
        <div class="search-resume-grid" data-search-resume-list></div>
      </section>
      <section class="search-offline-card" aria-label="Offline launch pad" data-search-offline-card>
        <div>
          <span data-search-network>Checking network</span>
          <strong data-search-offline-pack>Offline pack checking</strong>
          <p data-search-offline-message>Roadside references stay close when the pack is ready.</p>
        </div>
        <div class="search-offline-prep" aria-label="Signal-loss prep">
          <strong>Before Signal Drops</strong>
          <ol>
            <li>Refresh the offline pack.</li>
            <li>Open or print the Quick Sheet.</li>
            <li>Save a Garage backup.</li>
          </ol>
        </div>
        <div class="search-route-check" aria-label="Cached route readiness">
          <div>
            <strong>Route Readiness</strong>
            <small data-search-route-summary>Check key routes before leaving signal.</small>
          </div>
          <ul data-search-route-list>
            <li data-route-status="unknown">Roadside Stack</li>
            <li data-route-status="unknown">Diagnostics Guide</li>
            <li data-route-status="unknown">Hood Fuses</li>
            <li data-route-status="unknown">Cabin Fuses</li>
            <li data-route-status="unknown">7-Way Pinout</li>
            <li data-route-status="unknown">Garage Backup</li>
          </ul>
        </div>
        <div class="search-offline-actions" aria-label="Offline-ready shortcuts">
          <a href="quick-sheet.html#roadside-action-stack">Roadside</a>
          <a href="diagnostics.html#workflow-index">Diagnostics</a>
          <a href="hood.html#fuses">Fuses</a>
          <a href="quick-sheet.html#emergency-card">Print Sheet</a>
          <a href="garage.html#diagnostic-activity">Garage Backup</a>
          <button type="button" data-search-refresh-pack>Refresh Pack</button>
          <button type="button" data-search-check-routes>Check Routes</button>
          <button type="button" data-search-prime-routes>Prime Routes</button>
          <button type="button" data-search-copy-route-plan>Copy Route Plan</button>
        </div>
        <p class="search-offline-status" data-search-refresh-status aria-live="polite"></p>
      </section>
      <section class="search-intent-strip" aria-label="Owner shortcuts">
        <div class="search-intent-head">
          <strong>I need to...</strong>
          <span>Jump straight into the owner workflow</span>
        </div>
        <div class="search-intent-grid">
          <a href="maintenance.html#service-closeout">
            <span>Finish service</span>
            <strong>Prefill the update form after oil, tire, battery, or filter work.</strong>
          </a>
          <a href="garage.html#garage-fill-in-checklist">
            <span>Fill Garage</span>
            <strong>See the next useful record to add before details fade.</strong>
          </a>
          <a href="diagnostics.html#diagnostic-share-builder">
            <span>Share symptom</span>
            <strong>Copy a no-start, warning, power, audio, or trailer-light handoff.</strong>
          </a>
          <a href="quick-sheet.html#print-offline-pack">
            <span>Prep offline</span>
            <strong>Print, save, refresh, or share the roadside pack.</strong>
          </a>
        </div>
      </section>
      <section class="search-recent-strip" aria-label="Recent owner work" data-search-recent-work hidden>
        <div class="search-recent-head">
          <strong>Recent Work</strong>
          <span>Continue from this iPhone</span>
        </div>
        <div class="search-recent-grid" data-search-recent-list></div>
      </section>
      <section class="search-query-strip" aria-label="Recent searches" data-search-query-strip hidden>
        <div class="search-query-head">
          <strong>Recent Searches</strong>
          <span>Pick up the last thing you were trying to find</span>
        </div>
        <div class="search-query-grid" data-search-query-list></div>
      </section>
      <section class="search-smart-strip" aria-label="Best next routes" data-search-smart-strip hidden>
        <div class="search-smart-head">
          <strong>Best Next Routes</strong>
          <span data-search-smart-copy>Search a truck problem, page, or service task.</span>
        </div>
        <div class="search-smart-grid" data-search-smart-list></div>
      </section>
      <div class="search-situation-grid" aria-label="Common situations">
        <a href="quick-sheet.html#roadside-router">
          <span>Roadside</span>
          <strong>Flat tire, no-start, warning, or trailer-light route</strong>
        </a>
        <a href="diagnostics.html#no-start-workflow">
          <span>No start</span>
          <strong>Clicks, slow crank, or cranks without firing</strong>
        </a>
        <a href="diagnostics.html#warning-light-workflow">
          <span>Warning light</span>
          <strong>Red, amber, MID message, or multiple alerts</strong>
        </a>
        <a href="diagnostics.html#accessory-power-workflow">
          <span>12V power</span>
          <strong>Dead phone charger, outlet, socket, or inverter</strong>
        </a>
        <a href="diagnostics.html#trailer-light-workflow">
          <span>Trailer lights</span>
          <strong>Brake, turn, running, reverse, adapter, or plug</strong>
        </a>
        <a href="garage.html#maintenance-note-preview">
          <span>Parts run</span>
          <strong>Need-to-buy list, Counter Mode, and staged parts</strong>
        </a>
      </div>
      <div class="search-suggestions" aria-label="Suggested searches">
        <button type="button" data-search-suggestion="Fuses">Fuses</button>
        <button type="button" data-search-suggestion="Power outlet">Power Outlet</button>
        <button type="button" data-search-suggestion="Trailer lights">Trailer Lights</button>
        <button type="button" data-search-suggestion="Oil">Oil</button>
        <button type="button" data-search-suggestion="Jack Points">Jack Points</button>
        <button type="button" data-search-suggestion="Tire Pressure">Tire Pressure</button>
        <button type="button" data-search-suggestion="NFC">NFC</button>
        <button type="button" data-search-suggestion="Battery">Battery</button>
      </div>
      <p class="search-results-summary" data-search-results-summary></p>
      <div class="search-results" id="site-search-results"></div>
      <div class="search-foot">
        <span>Tip: press <kbd>/</kbd> or <kbd>Ctrl</kbd> + <kbd>K</kbd></span>
      </div>
    </section>
  `;
  document.body.appendChild(modal);
  bindFocusTrap(modal);
  return modal;
}

const SEARCH_PAGE_URLS = [
  "index.html",
  "hood.html",
  "cabin.html",
  "cargo.html",
  "rear-hitch.html",
  "maintenance.html",
  "diagnostics.html",
  "garage.html",
  "engine.html",
  "tires.html",
  "nfc.html",
  "nfc-landing.html",
  "ar-lab.html",
  "photo-atlas.html",
  "quick-sheet.html",
  "drive-map.html"
];

const SEARCH_OFFLINE_ROUTES = RIDGELINE_OFFLINE_ROUTES;
let lastSearchOfflineRouteResults = [];

const SEARCH_SYNONYMS = new Map([
  ["tyre", ["tire", "wheel"]],
  ["tyres", ["tires", "wheels"]],
  ["rim", ["wheel"]],
  ["rims", ["wheels"]],
  ["washer", ["crush washer", "seal", "gasket"]],
  ["washers", ["crush washers", "seals", "gaskets"]],
  ["bolt", ["plug", "fastener"]],
  ["plug", ["bolt", "drain plug"]],
  ["oil", ["engine oil", "oil change", "filter"]],
  ["trans", ["transmission", "atf"]],
  ["tranny", ["transmission", "atf"]],
  ["atf", ["transmission fluid"]],
  ["battery", ["jump", "jump start", "no crank", "group 48", "h6"]],
  ["start", ["starter", "no start", "no crank", "wont start"]],
  ["starting", ["starter", "no crank", "battery"]],
  ["crank", ["starter", "no start", "slow crank", "battery"]],
  ["clicking", ["starter", "no crank", "weak battery"]],
  ["dead", ["battery", "jump start", "no crank"]],
  ["wont", ["won't", "no start", "starter"]],
  ["fuse", ["relay", "electrical", "circuit"]],
  ["fuses", ["relays", "electrical", "circuit"]],
  ["outlet", ["accessory socket", "12v", "charger"]],
  ["socket", ["accessory socket", "power outlet", "12v"]],
  ["charger", ["phone charger", "accessory socket", "power outlet"]],
  ["radio", ["audio", "stereo", "head unit", "display audio"]],
  ["stereo", ["radio", "audio", "head unit"]],
  ["screen", ["display audio", "infotainment", "radio"]],
  ["camera", ["backup camera", "rear camera", "reverse"]],
  ["tag", ["nfc", "landing"]],
  ["tags", ["nfc", "landing"]],
  ["code", ["diagnostic", "obd", "obd2", "trouble code"]],
  ["codes", ["diagnostics", "obd", "obd2", "trouble codes"]],
  ["tow", ["towing", "hitch", "trailer"]],
  ["trailer", ["hitch", "tow", "towing", "pinout"]],
  ["map", ["vehicle map", "3d", "truck model"]],
  ["model", ["3d", "viewer"]],
  ["jack", ["jack point", "jacking", "roadside", "spare tire"]]
]);

const SEARCH_INTENT_RULES = {
  symptom: [
    {
      id: "no-start",
      label: "No-start",
      patterns: ["no start", "won't start", "wont start", "no crank", "slow crank", "dead battery", "jump start", "jump", "click", "clicking", "starter", "dead"]
    },
    {
      id: "warning-light",
      label: "Warning lights",
      patterns: ["warning light", "warning lights", "check engine", "cel", "abs", "vsa", "tpms", "mid message", "warning", "message"]
    },
    {
      id: "accessory-power",
      label: "Accessory power",
      patterns: ["12v", "12 volt", "power outlet", "outlet", "socket", "charger", "usb", "carplay", "radio", "audio", "screen", "display", "accessory power", "phone charger", "inverter"]
    },
    {
      id: "trailer-lights",
      label: "Trailer lights",
      patterns: ["trailer", "trailer lights", "7 way", "7-way", "7 pin", "7-pin", "tow", "hitch", "adapter", "running light", "brake light", "reverse light"]
    },
    {
      id: "service",
      label: "Service",
      patterns: ["oil", "maintenance", "service", "filter", "fluid", "rotation", "brake service", "transmission", "washer", "drain plug", "drain bolt", "torque spec"]
    },
    {
      id: "tire",
      label: "Tires",
      patterns: ["tire", "tires", "wheel", "wheels", "flat", "pressure", "lug", "spare", "jack", "psi"]
    },
    {
      id: "roadside",
      label: "Roadside",
      patterns: ["roadside", "tow truck", "tow driver", "dispatch", "help called", "stuck", "shoulder", "emergency"]
    },
    {
      id: "nfc",
      label: "NFC tags",
      patterns: ["nfc", "tag", "tags", "scan tag", "write tag", "url tag", "landing page"]
    },
    {
      id: "photo",
      label: "Photos",
      patterns: ["photo", "photos", "picture", "pictures", "image", "atlas", "diagram"]
    }
  ],
  location: [
    {
      id: "hood",
      label: "Hood",
      patterns: ["hood", "under hood", "engine bay", "fuse box a", "fuse box b", "battery", "jump point"]
    },
    {
      id: "cabin",
      label: "Cabin",
      patterns: ["cabin", "interior", "under dash", "dashboard", "dash", "kick panel", "driver left"]
    },
    {
      id: "engine",
      label: "Engine",
      patterns: ["engine", "j35", "timing belt", "water pump"]
    },
    {
      id: "hitch",
      label: "Hitch",
      patterns: ["hitch", "rear hitch", "pinout", "7 way", "7-way", "7 pin", "7-pin", "trailer connector"]
    },
    {
      id: "cargo",
      label: "Cargo",
      patterns: ["cargo", "bed", "trunk", "in bed", "tailgate"]
    },
    {
      id: "wheels",
      label: "Wheels",
      patterns: ["wheel", "wheels", "tire", "tires", "jack", "lug", "spare"]
    },
    {
      id: "garage",
      label: "Garage",
      patterns: ["garage", "notes", "backup", "history", "log"]
    },
    {
      id: "nfc",
      label: "NFC",
      patterns: ["nfc", "tag", "landing"]
    }
  ],
  task: [
    {
      id: "diagnose",
      label: "Diagnosis",
      patterns: ["diagnose", "diagnostic", "troubleshoot", "problem", "issue", "not working", "why"]
    },
    {
      id: "find",
      label: "Lookup",
      patterns: ["find", "where", "which", "locate", "lookup", "search", "show me"]
    },
    {
      id: "service",
      label: "Service",
      patterns: ["replace", "change", "install", "maintenance", "service", "torque", "spec", "interval"]
    },
    {
      id: "record",
      label: "Record keeping",
      patterns: ["save", "saved", "log", "record", "track", "history", "note", "backup"]
    },
    {
      id: "copy-share",
      label: "Copy / share",
      patterns: ["copy", "share", "send", "handoff", "export"]
    },
    {
      id: "write-scan",
      label: "Write / scan",
      patterns: ["write", "scan", "read", "program", "tap"]
    },
    {
      id: "prep-offline",
      label: "Offline prep",
      patterns: ["offline", "print", "cache", "prime", "signal", "route plan"]
    }
  ],
  type: [
    {
      id: "workflow",
      label: "Workflow",
      patterns: ["workflow", "steps", "checklist", "triage", "route", "pack", "planner", "launcher", "jumpstart", "check"]
    },
    {
      id: "spec",
      label: "Specs",
      patterns: ["spec", "specs", "torque", "psi", "capacity", "size", "part number", "washer", "bolt"]
    },
    {
      id: "record",
      label: "Saved data",
      patterns: ["note", "notes", "receipt", "history", "log", "backup", "saved", "record"]
    },
    {
      id: "visual",
      label: "Visual reference",
      patterns: ["diagram", "map", "viewer", "photo", "atlas", "pinout", "landing"]
    },
    {
      id: "tool",
      label: "Tool",
      patterns: ["tool", "console", "manager", "builder", "tracker", "lab"]
    }
  ]
};

function normalizeSearchText(value = "") {
  return `${value}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9/.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeSearch(value = "") {
  const normalized = normalizeSearchText(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(" ")
    .filter((token) => token.length > 1 || /\d/.test(token));
}

function searchRuleMatches(phrase, tokenSet, patterns = []) {
  return patterns.some((pattern) => {
    const normalizedPattern = normalizeSearchText(pattern);
    if (!normalizedPattern) {
      return false;
    }

    if (phrase.includes(normalizedPattern)) {
      return true;
    }

    const patternTokens = tokenizeSearch(normalizedPattern);
    if (!patternTokens.length) {
      return false;
    }

    if (patternTokens.length === 1) {
      return tokenSet.has(patternTokens[0]);
    }

    return patternTokens.every((token) => tokenSet.has(token));
  });
}

function buildSearchIntent(queryParts) {
  if (!queryParts?.phrase) {
    return {
      symptom: [],
      location: [],
      task: [],
      type: []
    };
  }

  const tokenSet = queryParts.expandedTokenSet || new Set(queryParts.expandedTokens || []);
  return Object.fromEntries(
    Object.entries(SEARCH_INTENT_RULES).map(([group, rules]) => [
      group,
      rules.filter((rule) => searchRuleMatches(queryParts.phrase, tokenSet, rule.patterns))
    ])
  );
}

function expandSearchQuery(value = "") {
  const normalized = normalizeSearchText(value);
  const tokens = tokenizeSearch(normalized);
  const expanded = new Set(tokens);

  tokens.forEach((token) => {
    SEARCH_SYNONYMS.get(token)?.forEach((term) => {
      tokenizeSearch(term).forEach((expandedToken) => expanded.add(expandedToken));
    });
  });

  const expandedTokens = [...expanded];
  const expandedTokenSet = new Set(expandedTokens);

  return {
    phrase: normalized,
    tokens,
    expandedTokens,
    expandedTokenSet,
    intent: buildSearchIntent({
      phrase: normalized,
      tokens,
      expandedTokens,
      expandedTokenSet
    })
  };
}

function stripSearchNoise(root) {
  root.querySelectorAll("script, style, svg, canvas, nav, header, footer, .section-dock, .topbar-actions").forEach((node) => {
    node.remove();
  });
}

function textFromElement(element) {
  const clone = element.cloneNode(true);
  stripSearchNoise(clone);
  return clone.textContent?.replace(/\s+/g, " ").trim() || "";
}

function getSearchEntryText(entry) {
  return `${entry.title || ""} ${entry.category || ""} ${(entry.keywords || []).join(" ")} ${entry.excerpt || ""} ${entry.url || ""}`;
}

function makeSearchEntry(entry, source = "static") {
  const keywords = Array.isArray(entry.keywords) ? entry.keywords : [];
  const text = getSearchEntryText({ ...entry, keywords });
  const normalized = normalizeSearchText(text);
  const tokens = tokenizeSearch(normalized);
  const ruleMatches = buildSearchIntent({
    phrase: normalized,
    expandedTokens: tokens,
    expandedTokenSet: new Set(tokens)
  });
  const typeSignals = new Set(ruleMatches.type.map((rule) => rule.id));

  if (source === "section") {
    typeSignals.add("section");
  }
  if (/(workflow|checklist|tracker|builder|pack|launcher|jumpstart|planner|triage|route)/.test(normalized)) {
    typeSignals.add("workflow");
  }
  if (/(spec|torque|psi|capacity|size|washer|bolt|fluid)/.test(normalized)) {
    typeSignals.add("spec");
  }
  if (/(note|receipt|log|backup|history|record|save)/.test(normalized)) {
    typeSignals.add("record");
  }
  if (/(viewer|map|atlas|photo|diagram|pinout)/.test(normalized)) {
    typeSignals.add("visual");
  }
  if (/(tool|lab|console|manager|builder|tracker)/.test(normalized)) {
    typeSignals.add("tool");
  }

  return {
    title: entry.title || "Untitled",
    url: entry.url || "#",
    category: entry.category || "Reference",
    keywords,
    excerpt: entry.excerpt || "",
    source,
    normalized,
    tokens,
    signals: {
      symptom: ruleMatches.symptom.map((rule) => rule.id),
      location: ruleMatches.location.map((rule) => rule.id),
      task: ruleMatches.task.map((rule) => rule.id),
      type: [...typeSignals]
    }
  };
}

function titleFromSection(section, pageTitle) {
  return (
    section.querySelector("h1, h2, h3, h4, .subsection-title, strong")?.textContent?.trim() ||
    section.getAttribute("aria-label") ||
    pageTitle ||
    "Reference"
  );
}

function excerptFromText(text = "", maxLength = 150) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 1).trim()}...`;
}

function categoryFromPage(pageUrl, pageTitle) {
  const page = pageUrl.split("?")[0];
  if (page.includes("maintenance")) return "Maintenance";
  if (page.includes("diagnostics")) return "Diagnostics";
  if (page.includes("garage") || page.includes("photo")) return "Garage";
  if (page.includes("engine")) return "Engine";
  if (page.includes("tire")) return "Tires";
  if (page.includes("hood") || page.includes("cabin")) return "Electrical";
  if (page.includes("hitch")) return "Towing";
  if (page.includes("cargo")) return "Cargo";
  if (page.includes("nfc")) return "NFC";
  if (page.includes("ar")) return "AR";
  return pageTitle || "Reference";
}

function entriesFromHtml(pageUrl, html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const pageTitle = doc.querySelector("h1")?.textContent?.trim() || doc.title || pageUrl;
  const category = categoryFromPage(pageUrl, pageTitle);
  const entries = [];

  const pageText = textFromElement(doc.body || doc.documentElement);
  entries.push(
    makeSearchEntry(
      {
        title: pageTitle,
        url: pageUrl,
        category,
        keywords: [pageTitle, doc.title, pageUrl],
        excerpt: excerptFromText(pageText)
      },
      "page"
    )
  );

  const sections = [
    ...doc.querySelectorAll("main section[id], main article[id], main h2[id], main h3[id], main h4[id]")
  ];

  sections.forEach((section) => {
    const id = section.id;
    if (!id) {
      return;
    }

    const targetBlock = section.matches("h2, h3, h4")
      ? section.closest("article, section") || section
      : section;
    const text = textFromElement(targetBlock);
    if (text.length < 18) {
      return;
    }

    const title = titleFromSection(targetBlock, pageTitle);
    entries.push(
      makeSearchEntry(
        {
          title,
          url: `${pageUrl}#${id}`,
          category,
          keywords: [title, pageTitle, id.replace(/-/g, " ")],
          excerpt: excerptFromText(text)
        },
        "section"
      )
    );
  });

  return entries;
}

function entriesFromNfcTargets() {
  return nfcTargets.flatMap((target) => [
    makeSearchEntry(
      {
        title: `${target.title} NFC Landing`,
        url: target.url,
        category: "NFC",
        keywords: [
          target.id,
          target.title,
          target.category,
          target.badge,
          target.placement,
          target.quickUse,
          ...(target.details || []),
          ...(target.relatedLinks || []).map((link) => link.label)
        ],
        excerpt: target.description
      },
      "nfc"
    ),
    makeSearchEntry(
      {
        title: target.title,
        url: target.sectionUrl,
        category: target.category,
        keywords: [target.id, target.title, target.placement, target.description, target.quickUse],
        excerpt: target.quickUse || target.description
      },
      "nfc-section"
    )
  ]);
}

async function buildFullSearchIndex() {
  if (fullSearchIndexCache) {
    return fullSearchIndexCache;
  }

  if (fullSearchIndexPromise) {
    return fullSearchIndexPromise;
  }

  fullSearchIndexPromise = (async () => {
    const staticEntries = searchIndex.map((entry) => makeSearchEntry(entry, "static"));
    const pageEntryGroups = await Promise.all(
      SEARCH_PAGE_URLS.map(async (pageUrl) => {
        try {
          const response = await fetch(pageUrl, { cache: "force-cache" });
          if (!response.ok) {
            return [];
          }
          return entriesFromHtml(pageUrl, await response.text());
        } catch {
          return [];
        }
      })
    );

    const merged = [...staticEntries, ...entriesFromNfcTargets(), ...pageEntryGroups.flat()];
    const byUrlTitle = new Map();
    merged.forEach((entry) => {
      const key = `${entry.url}|${entry.title}`;
      if (!byUrlTitle.has(key)) {
        byUrlTitle.set(key, entry);
      }
    });

    fullSearchIndexCache = [...byUrlTitle.values()];
    return fullSearchIndexCache;
  })();

  return fullSearchIndexPromise;
}

function countSearchSignalMatches(entrySignals = [], querySignals = []) {
  if (!entrySignals.length || !querySignals.length) {
    return 0;
  }

  const ids = new Set(querySignals.map((rule) => rule.id));
  return entrySignals.reduce((count, id) => count + (ids.has(id) ? 1 : 0), 0);
}

function searchIntentIncludes(intent, group, id) {
  return Boolean(intent?.[group]?.some((rule) => rule.id === id));
}

function scoreSearchEntry(entry, queryParts) {
  if (!queryParts.phrase) {
    return 0;
  }

  const title = normalizeSearchText(entry.title);
  const category = normalizeSearchText(entry.category);
  const url = normalizeSearchText(entry.url);
  const haystack = entry.normalized || normalizeSearchText(getSearchEntryText(entry));
  const entryTokens = entry.tokens || tokenizeSearch(haystack);
  const tokenSet = new Set(entryTokens);
  const entrySignals = entry.signals || { symptom: [], location: [], task: [], type: [] };
  const queryIntent = queryParts.intent || buildSearchIntent(queryParts);
  let score = 0;
  let matchedOriginalTokens = 0;

  if (title === queryParts.phrase) score += 180;
  if (title.includes(queryParts.phrase)) score += 90;
  if (haystack.includes(queryParts.phrase)) score += 62;
  if (category.includes(queryParts.phrase)) score += 24;
  if (url.includes(queryParts.phrase)) score += 18;

  queryParts.expandedTokens.forEach((token) => {
    const exact = tokenSet.has(token);
    const starts = entryTokens.some((entryToken) => entryToken.startsWith(token) || token.startsWith(entryToken));
    const partial = haystack.includes(token);

    if (exact) score += title.includes(token) ? 24 : 14;
    else if (starts) score += 9;
    else if (partial) score += 5;
  });

  queryParts.tokens.forEach((token) => {
    if (tokenSet.has(token) || haystack.includes(token) || entryTokens.some((entryToken) => entryToken.startsWith(token))) {
      matchedOriginalTokens += 1;
    }
  });

  if (queryParts.tokens.length > 1) {
    const coverage = matchedOriginalTokens / queryParts.tokens.length;
    score += Math.round(coverage * 34);
    if (coverage < 0.5 && !haystack.includes(queryParts.phrase)) {
      score *= 0.35;
    }
  }

  const symptomMatches = countSearchSignalMatches(entrySignals.symptom, queryIntent.symptom);
  const locationMatches = countSearchSignalMatches(entrySignals.location, queryIntent.location);
  const taskMatches = countSearchSignalMatches(entrySignals.task, queryIntent.task);
  const typeMatches = countSearchSignalMatches(entrySignals.type, queryIntent.type);
  const matchedGroups = [symptomMatches, locationMatches, taskMatches, typeMatches].filter(Boolean).length;

  score += symptomMatches * 30;
  score += locationMatches * 18;
  score += taskMatches * 14;
  score += typeMatches * 11;

  if (matchedGroups >= 2) score += 18;
  if (matchedGroups >= 3) score += 12;

  if (queryIntent.symptom.length && entrySignals.type.includes("workflow")) score += 11;
  if (searchIntentIncludes(queryIntent, "task", "find") && (entrySignals.type.includes("visual") || entry.source === "section")) score += 7;
  if (searchIntentIncludes(queryIntent, "task", "record") && entrySignals.type.includes("record")) score += 10;
  if (searchIntentIncludes(queryIntent, "task", "write-scan") && entry.category === "NFC") score += 12;
  if (searchIntentIncludes(queryIntent, "type", "spec") && entrySignals.type.includes("spec")) score += 12;
  if (queryIntent.location.length && entrySignals.location.length && locationMatches === 0) score -= 8;

  if (entry.source === "static") score += 7;
  if (entry.source === "section") score += 3;

  return score;
}

function searchEntries(entries, query = "") {
  const queryParts = expandSearchQuery(query);
  if (!queryParts.phrase) {
    return entries.slice(0, 10);
  }

  return entries
    .map((entry) => ({ entry, score: scoreSearchEntry(entry, queryParts) }))
    .filter((result) => result.score >= 5)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, 18)
    .map((result) => result.entry);
}

const searchModal = buildSearchModal();
const searchInput = searchModal.querySelector("#site-search-input");
const searchResults = searchModal.querySelector("#site-search-results");
const searchOfflineCard = searchModal.querySelector("[data-search-offline-card]");
const searchLensStrip = searchModal.querySelector("[data-search-lens-strip]");
const searchLensList = searchModal.querySelector("[data-search-lens-list]");
const searchLensCopy = searchModal.querySelector("[data-search-lens-copy]");
const searchResumeWork = searchModal.querySelector("[data-search-resume-work]");
const searchResumeList = searchModal.querySelector("[data-search-resume-list]");
const searchRecentWork = searchModal.querySelector("[data-search-recent-work]");
const searchRecentList = searchModal.querySelector("[data-search-recent-list]");
const searchQueryStrip = searchModal.querySelector("[data-search-query-strip]");
const searchQueryList = searchModal.querySelector("[data-search-query-list]");
const searchSmartStrip = searchModal.querySelector("[data-search-smart-strip]");
const searchSmartList = searchModal.querySelector("[data-search-smart-list]");
const searchSmartCopy = searchModal.querySelector("[data-search-smart-copy]");
const searchResultsSummary = searchModal.querySelector("[data-search-results-summary]");
let searchReturnFocus = null;
const commandPalette = buildCommandPalette();
document.body.classList.add(currentPageName() === "index.html" ? "is-home-page" : "is-subpage");
document.body.classList.add(`page-${currentPageName().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "index"}`);
setWorkArea(getSavedWorkArea());
buildUniversalHeaderActions();
buildThemeToggleButton();
buildBackgroundIntensityButton();
const siteMenu = buildSiteMenu();
const brandLink = document.querySelector(".brand");
const homeEntryHref = "index.html?ask-prominence=2";

if (brandLink) {
  brandLink.href = homeEntryHref;
  brandLink.setAttribute("aria-label", "Return to the Ridgeline Service Console home page");
  brandLink.title = "Return to home";
}
buildHomeCommandCenter();
bindHomeCockpitLayoutControls();
buildMaintenanceJobMode();
buildMaintenanceTimeline();
improveModelLoadingSurfaces();
const pageSections = collectPageSections();
recordCurrentPageVisit();
registerRecentNavTracking();
promoteNfcTarget();
buildViewModeRail();
setContentMode(getSavedContentMode(), false);
buildMobileNavAccordion(pageSections);
simplifyNavigationLayout();
if (!document.body.classList.contains("drive-map-page")) {
  buildBreadcrumbTrail(pageSections);
  buildRecentStrip();
  buildSyncStatusBadges();
  buildPageActionBar();
  buildNeedLauncher();
  buildFavoritePins();
  buildVisualSiteMap();
}
buildQuickCapture();
buildSyncSettingsPanel();
buildEmptyStates();
buildCurrentPageChip(pageSections);
buildContextualBottomBar();
buildMiniToolsDrawer();
const sectionRail = isMobileNavMode ? null : buildSectionRail(pageSections);
syncActiveSectionUi(pageSections, sectionRail);
buildBackToMapButton();
buildAskAntonFloatingButton();
window.setTimeout(() => {
  if (!document.querySelector(".ask-anton-fab")) {
    buildAskAntonFloatingButton();
  }
}, 180);
buildScrollProgress();
bindCompactStickyHeader();
buildDynamicIslandShelf();
buildViewerParallax();
await ownerAuth.initOwnerAuth();
visitorLog.trackVisit();
buildOwnerAuthButton();
buildOwnerAuthModal();
enableOwnerWriteProtection();
if (!isMobileNavMode) {
  buildSectionStepper(pageSections);
}
buildCollapsibleCards();
buildRelatedStrip();
enhanceActiveLinks();
enableSectionTransitions();

if (location.hash || new URLSearchParams(location.search).has("nfc")) {
  requestAnimationFrame(scrollToHashTarget);
  window.addEventListener("load", () => {
    const targetHash = currentDeepTargetHash();
    scheduleHashScroll(targetHash, "auto", [0, 120, 360, 900]);
    keepHashTargetAligned(targetHash, "auto", 1400);
  });
}

window.addEventListener("hashchange", () => {
  clearScheduledHashScroll();
  setLiveActiveSection(location.hash);
  enhanceActiveLinks();
  requestAnimationFrame(scrollToHashTarget);
});
document.addEventListener("click", (event) => {
  if (event.defaultPrevented) {
    return;
  }

  const link = event.target.closest("a[href]");
  if (!link) {
    return;
  }

  const localUrl = shouldHandleLocalSectionLink(link);
  if (!localUrl) {
    return;
  }

  event.preventDefault();
  const nextLocation = `${localUrl.pathname}${localUrl.search}${localUrl.hash}`;
  history.pushState({}, "", nextLocation);
  setLiveActiveSection(localUrl.hash);
  enhanceActiveLinks();
  const behavior = sectionNavigationBehavior();
  scrollToHashValue(localUrl.hash, behavior);
  scheduleHashScroll(localUrl.hash, behavior, [120, 360]);
  keepHashTargetAligned(localUrl.hash, behavior, 900);
}, true);

function applyGarageMode(enabled) {
  document.body.classList.toggle("garage-mode", enabled);
  localStorage.setItem("ridgeline-garage-mode", enabled ? "1" : "0");
}

applyGarageMode(localStorage.getItem("ridgeline-garage-mode") === "1");

if (brandLink) {
  let tapCount = 0;
  let tapTimer = null;

  brandLink.addEventListener("click", (event) => {
    tapCount += 1;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => {
      tapCount = 0;
    }, 700);

    if (tapCount < 4) {
      return;
    }

    event.preventDefault();
    tapCount = 0;
    applyGarageMode(!document.body.classList.contains("garage-mode"));
  });
}

function renderSearchEntries(results) {
  lastRenderedSearchResults = Array.isArray(results) ? results.slice() : [];
  searchResults.innerHTML = "";

  const groups = new Map();
  results.forEach((entry) => {
    const key = entry.category || "Reference";
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(entry);
  });

  groups.forEach((entries, categoryName) => {
    const group = document.createElement("section");
    group.className = "search-result-group";
    const heading = document.createElement("h3");
    heading.textContent = categoryName;
    group.appendChild(heading);

    entries.slice(0, 5).forEach((entry) => {
      const anchor = document.createElement("a");
      anchor.className = "search-result";
      anchor.href = entry.url;
      anchor.dataset.searchQuery = searchInput.value.trim();

      const category = document.createElement("span");
      category.textContent = entry.source === "section" ? "Page section" : entry.category;
      const title = document.createElement("strong");
      title.textContent = entry.title;
      const excerpt = document.createElement("p");
      excerpt.textContent = entry.excerpt || entry.url;

      anchor.append(category, title, excerpt);
      group.appendChild(anchor);
    });

    searchResults.appendChild(group);
  });

  if (!results.length) {
    const empty = document.createElement("p");
    empty.className = "search-empty";
    empty.textContent = "No matches yet. Try a simpler word, part name, fuse label, service phrase, or page name.";
    searchResults.appendChild(empty);
  }
}

function renderResults(query = "") {
  const trimmedQuery = `${query || ""}`.trim();
  const requestId = `${Date.now()}-${Math.random()}`;
  searchResults.dataset.requestId = requestId;

  const staticEntries = [
    ...searchIndex.map((entry) => makeSearchEntry(entry, "static")),
    ...entriesFromNfcTargets()
  ];
  const staticResults = searchEntries(staticEntries, trimmedQuery);
  renderSearchEntries(staticResults);
  renderSearchLens(trimmedQuery);
  renderSmartSearchRoutes(trimmedQuery, staticResults);
  renderSearchSummary(trimmedQuery, staticResults);

  buildFullSearchIndex()
    .then((entries) => {
      if (searchResults.dataset.requestId !== requestId) {
        return;
      }
      const results = searchEntries(entries, trimmedQuery);
      renderSearchEntries(results);
      renderSearchLens(trimmedQuery);
      renderSmartSearchRoutes(trimmedQuery, results);
      renderSearchSummary(trimmedQuery, results);
    })
    .catch(() => {
      if (!searchResults.children.length) {
        renderSearchEntries(staticResults);
      }
      renderSearchLens(trimmedQuery);
      renderSmartSearchRoutes(trimmedQuery, staticResults);
      renderSearchSummary(trimmedQuery, staticResults);
    });
}

function isOfflineSearchQuery(value = "") {
  return /\b(offline|cache|cached|signal|no service|roadside|emergency|tow|trip|prep)\b/i.test(`${value}`);
}

async function checkSearchOfflineRoutes() {
  return checkSharedOfflineRoutes(SEARCH_OFFLINE_ROUTES);
}

async function primeSearchOfflineRoutes() {
  return primeSharedOfflineRoutes(SEARCH_OFFLINE_ROUTES);
}

function renderSearchRouteReadiness(results = []) {
  if (!searchOfflineCard) {
    return;
  }
  const summary = searchOfflineCard.querySelector("[data-search-route-summary]");
  const list = searchOfflineCard.querySelector("[data-search-route-list]");
  if (!summary || !list) {
    return;
  }

  if (!results.length) {
    lastSearchOfflineRouteResults = [];
    summary.textContent = "Check key routes before leaving signal.";
    list.innerHTML = SEARCH_OFFLINE_ROUTES
      .map((route) => `<li data-route-status="unknown">${route.label}</li>`)
      .join("");
    return;
  }

  lastSearchOfflineRouteResults = results;
  const readyCount = results.filter((route) => route.ready).length;
  const unavailable = results.some((route) => route.unavailable);
  summary.textContent = unavailable
    ? "This browser could not inspect every cache; open key routes while online."
    : `${readyCount}/${results.length} key routes found in the offline cache.`;
  list.innerHTML = results
    .map((route) => `<li data-route-status="${route.ready ? "ready" : "missing"}"><a href="${route.path}">${route.label}</a></li>`)
    .join("");
}

function buildSearchOfflineRoutePlan() {
  return buildSharedOfflineRoutePlan(lastSearchOfflineRouteResults);
}

function updateSearchOfflineCard(message = "") {
  if (!searchOfflineCard) {
    return;
  }

  const network = searchOfflineCard.querySelector("[data-search-network]");
  const pack = searchOfflineCard.querySelector("[data-search-offline-pack]");
  const detail = searchOfflineCard.querySelector("[data-search-offline-message]");
  const refreshStatus = searchOfflineCard.querySelector("[data-search-refresh-status]");
  const online = navigator.onLine !== false;
  const hasServiceWorker = "serviceWorker" in navigator;
  const serviceWorkerControlled = Boolean(navigator.serviceWorker?.controller);

  if (network) {
    network.textContent = online ? "Online" : "Offline";
  }

  if (pack) {
    pack.textContent = hasServiceWorker
      ? serviceWorkerControlled
        ? "Offline pack ready"
        : "Offline pack loading"
      : "Offline pack unavailable";
  }

  if (detail) {
    detail.textContent = online
      ? "Refresh the pack before leaving signal, then jump straight into owner workflows."
      : "Use cached quick references first; live links may wait for signal.";
  }

  if (refreshStatus && message) {
    refreshStatus.textContent = message;
  }
}

function readSearchStorage(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function shortSearchText(value = "", maxLength = 86) {
  const compact = `${value}`.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength - 1).trim()}...`;
}

function formatSearchRecentDate(value = "") {
  if (!value) {
    return "Saved recently";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return `${value}`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function safeSearchHref(value = "") {
  try {
    const url = new URL(value, location.href);
    if (url.origin !== location.origin) {
      return "";
    }
    const page = url.pathname.split("/").pop() || "index.html";
    return `${page}${url.search || ""}${url.hash || ""}`;
  } catch {
    return "";
  }
}

function labelFromResumeHref(value = "") {
  const page = `${value}`.split(/[?#]/)[0] || "index.html";
  const matched = menuLinks.find((link) => link.match === page);
  return matched?.label || page.replace(".html", "").replace(/[-_]/g, " ") || "Saved page";
}

function buildStoredSectionResumeItem() {
  const prefix = LAST_SECTION_STORAGE_PREFIX;
  const candidates = [];

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index) || "";
      if (!key.startsWith(prefix)) {
        continue;
      }
      const page = key.slice(prefix.length);
      const section = localStorage.getItem(key);
      const href = safeSearchHref(`${page}#${section}`);
      if (!href || !section) {
        continue;
      }
      candidates.push({
        page,
        label: "Last section",
        detail: `Open ${labelFromResumeHref(href)} at ${section.replace(/-/g, " ")}`,
        meta: "Saved section",
        href
      });
    }
  } catch {
    return null;
  }

  return candidates.find((item) => item.page !== currentPageName()) || candidates[0] || null;
}

function buildSearchResumeItems() {
  const items = [];
  const seen = new Set();
  const pushItem = (item) => {
    const href = safeSearchHref(item?.href || "");
    if (!href || seen.has(href)) {
      return;
    }
    seen.add(href);
    items.push({
      label: item.label,
      detail: shortSearchText(item.detail || labelFromResumeHref(href), 72),
      meta: item.meta,
      href
    });
  };

  const lastTask = getLastTask();
  if (lastTask?.href && lastTask?.label) {
    pushItem({
      label: "Last task",
      detail: lastTask.label,
      meta: formatSearchRecentDate(lastTask.at),
      href: lastTask.href
    });
  }

  const recentPage = loadRecentNav().find((item) => item?.href && item?.label);
  if (recentPage) {
    pushItem({
      label: "Recent page",
      detail: recentPage.label,
      meta: formatSearchRecentDate(recentPage.at),
      href: recentPage.href
    });
  }

  const sectionItem = buildStoredSectionResumeItem();
  if (sectionItem) {
    pushItem(sectionItem);
  }

  return items.slice(0, 3);
}

function renderSearchResumeWork() {
  if (!searchResumeWork || !searchResumeList) {
    return;
  }

  const items = buildSearchResumeItems();
  searchResumeWork.hidden = !items.length;
  searchResumeList.innerHTML = "";

  items.forEach((item) => {
    const link = document.createElement("a");
    link.href = item.href;

    const label = document.createElement("span");
    label.textContent = item.label;

    const detail = document.createElement("strong");
    detail.textContent = item.detail;

    const meta = document.createElement("em");
    meta.textContent = item.meta;

    link.append(label, detail, meta);
    searchResumeList.append(link);
  });
}

function buildSearchRecentItems() {
  const items = [];
  const diagnostic = readSearchStorage("ridgeline-diagnostic-last-handoff", null);
  const roadside = readSearchStorage("ridgeline-roadside-last-handoff", null);
  const roadsideSession = readSearchStorage("ridgeline-roadside-live-session", null);
  const maintenanceLog = readSearchStorage("ridgeline-maintenance-log", []);
  const notes = readSearchStorage("ridgeline-notes", {});

  if (diagnostic?.title || diagnostic?.summary || diagnostic?.reference) {
    items.push({
      label: "Diagnostic note",
      detail: shortSearchText(diagnostic.summary || diagnostic.title || "Last saved diagnostic handoff"),
      meta: formatSearchRecentDate(diagnostic.savedAt),
      href: "garage.html#diagnostic-activity"
    });
  } else if (
    notes?.warning_light_indicator ||
    notes?.warning_light_mid_message ||
    notes?.warning_light_behavior ||
    notes?.warning_light_next_action
  ) {
    items.push({
      label: "Warning note",
      detail: shortSearchText(
        notes.warning_light_indicator ||
          notes.warning_light_mid_message ||
          notes.warning_light_behavior ||
          "Saved warning-light diagnostic memory"
      ),
      meta: "Open diagnostics",
      href: "garage.html#diagnostic-activity"
    });
  }

  const hasSavedRoadsideNote = Boolean(roadside?.title || roadside?.summary);
  if (hasSavedRoadsideNote) {
    items.push({
      label: "Roadside note",
      detail: shortSearchText(roadside.summary || roadside.title || "Last saved roadside handoff"),
      meta: formatSearchRecentDate(roadside.savedAt),
      href: "quick-sheet.html#roadside-action-stack"
    });
  }

  if (!hasSavedRoadsideNote && (roadsideSession?.startedAt || roadsideSession?.checkpoints?.length)) {
    const checkpoints = Array.isArray(roadsideSession.checkpoints) ? roadsideSession.checkpoints : [];
    const planKey = `${roadsideSession.planKey || "flat"}`.trim().toLowerCase();
    const routeKey = ["flat", "start", "warning", "trailer"].includes(planKey) ? planKey : "flat";
    items.push({
      label: "Live roadside",
      detail: shortSearchText(`${checkpoints.length} ${checkpoints.length === 1 ? "checkpoint" : "checkpoints"} / ${routeKey}`),
      meta: formatSearchRecentDate(roadsideSession.startedAt),
      href: `quick-sheet.html?roadside=${routeKey}#roadside-action-stack`
    });
  }

  const latestService = Array.isArray(maintenanceLog) ? maintenanceLog[0] : null;
  if (latestService?.service || latestService?.mileageText || latestService?.note) {
    const serviceLabel = `${latestService.service || "Service"}`.replace(/_/g, " ");
    items.push({
      label: "Service receipt",
      detail: shortSearchText(`${serviceLabel}${latestService.mileageText ? ` at ${latestService.mileageText}` : ""}`),
      meta: formatSearchRecentDate(latestService.createdAt || latestService.date),
      href: "maintenance.html#maintenance-updater"
    });
  }

  if (notes?.general_notes) {
    items.push({
      label: "Garage notes",
      detail: shortSearchText(notes.general_notes),
      meta: "Open saved notes",
      href: "garage.html#notes"
    });
  }

  return items.slice(0, 3);
}

function renderSearchRecentWork() {
  if (!searchRecentWork || !searchRecentList) {
    return;
  }
  const items = buildSearchRecentItems();
  searchRecentWork.hidden = !items.length;
  searchRecentList.innerHTML = "";

  items.forEach((item) => {
    const link = document.createElement("a");
    link.href = item.href;

    const label = document.createElement("span");
    label.textContent = item.label;

    const detail = document.createElement("strong");
    detail.textContent = item.detail;

    const meta = document.createElement("em");
    meta.textContent = item.meta;

    link.append(label, detail, meta);
    searchRecentList.append(link);
  });
}

function readRecentSearches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCH_STORAGE_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed
          .map((value) => `${value || ""}`.trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query) {
  const normalized = `${query || ""}`.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!normalized) {
    return;
  }
  try {
    const next = [normalized, ...readRecentSearches().filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 8);
    localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Search should still work when storage is unavailable.
  }
}

function renderRecentSearches() {
  if (!searchQueryStrip || !searchQueryList) {
    return;
  }

  const queries = readRecentSearches();
  searchQueryList.innerHTML = "";
  searchQueryStrip.hidden = queries.length === 0;
  if (!queries.length) {
    return;
  }

  queries.forEach((query) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.searchHistory = query;
    button.textContent = query;
    searchQueryList.appendChild(button);
  });
}

function joinSearchPhraseParts(parts = []) {
  if (!parts.length) {
    return "";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

function pickPrimarySearchType(queryParts) {
  const types = queryParts?.intent?.type || [];
  if (!types.length) {
    return null;
  }

  if (/(manager|console|builder|tracker|lab)/.test(queryParts.phrase)) {
    return types.find((rule) => rule.id === "tool") || types[0];
  }

  if (/(map|viewer|photo|atlas|diagram|pinout|landing)/.test(queryParts.phrase)) {
    return types.find((rule) => rule.id === "visual") || types[0];
  }

  if (/(spec|specs|torque|psi|capacity|washer|bolt|size)/.test(queryParts.phrase)) {
    return types.find((rule) => rule.id === "spec") || types[0];
  }

  return types[0];
}

function buildSearchIntentPhrase(queryParts) {
  const intent = queryParts?.intent || queryParts || {};
  const parts = [];

  if (intent.symptom?.[0]) {
    parts.push(intent.symptom[0].label.toLowerCase());
  }
  if (intent.location?.[0]) {
    parts.push(intent.location[0].label.toLowerCase());
  }
  const primaryType = pickPrimarySearchType(queryParts);
  if (primaryType) {
    parts.push(primaryType.label.toLowerCase());
  } else if (intent.task?.[0]) {
    parts.push(intent.task[0].label.toLowerCase());
  }

  return joinSearchPhraseParts(parts.slice(0, 3));
}

function renderSearchLens(query = "") {
  if (!searchLensStrip || !searchLensList || !searchLensCopy) {
    return;
  }

  const trimmedQuery = `${query || ""}`.trim();
  const queryParts = expandSearchQuery(trimmedQuery);
  const items = [];
  const primaryType = pickPrimarySearchType(queryParts);
  const pushItem = (label, tone, rule) => {
    if (!rule) {
      return;
    }
    items.push({ label, tone, value: rule.label });
  };

  pushItem("Symptom", "symptom", queryParts.intent.symptom[0]);
  pushItem("Area", "location", queryParts.intent.location[0]);
  pushItem("Goal", "task", queryParts.intent.task[0]);
  pushItem("Mode", "type", primaryType);

  searchLensList.innerHTML = "";
  searchLensStrip.hidden = !trimmedQuery || items.length === 0;
  if (searchLensStrip.hidden) {
    searchLensCopy.textContent = "Search by symptom, location, task, or part.";
    return;
  }

  const intentPhrase = buildSearchIntentPhrase(queryParts);
  searchLensCopy.textContent = intentPhrase
    ? `Prioritizing ${intentPhrase} results.`
    : "Search by symptom, location, task, or part.";

  items.forEach((item) => {
    const pill = document.createElement("div");
    pill.className = "search-lens-pill";
    pill.dataset.tone = item.tone;

    const label = document.createElement("span");
    label.textContent = item.label;
    const value = document.createElement("strong");
    value.textContent = item.value;

    pill.append(label, value);
    searchLensList.appendChild(pill);
  });
}

function buildSmartSearchRoutes(query, results) {
  const queryParts = expandSearchQuery(query);
  const normalized = queryParts.phrase;
  const intent = queryParts.intent;
  if (!normalized) {
    return [];
  }
  const routes = [];

  const pushRoute = (route) => {
    if (!route?.href || routes.some((item) => item.href === route.href || item.title === route.title)) {
      return;
    }
    routes.push(route);
  };

  const wantsFuseLookup = /(fuse|relay|electrical|circuit|power outlet|outlet|socket|12v|12 volt|charger|radio|audio|carplay|accessory)/.test(normalized);
  const wantsSpecs = /(torque|psi|capacity|size|washer|bolt|drain|plug|part number)/.test(normalized);
  const wantsNfcManager = searchIntentIncludes(intent, "symptom", "nfc") && /(manager|manage|plan|inventory|label|mount|mounted|programmed|history|track)/.test(normalized);

  if (searchIntentIncludes(intent, "symptom", "no-start")) {
    pushRoute({
      href: "diagnostics.html#no-start-workflow",
      label: "Fast Path",
      title: "Run the no-start workflow",
      detail: "Battery, click, crank, jump, and first checks in one route."
    });
  }
  if (searchIntentIncludes(intent, "symptom", "warning-light")) {
    pushRoute({
      href: "diagnostics.html#warning-light-workflow",
      label: "Fast Path",
      title: "Go straight to warning-light triage",
      detail: "Red, amber, MID messages, or multiple alerts."
    });
  }
  if (searchIntentIncludes(intent, "symptom", "accessory-power")) {
    pushRoute({
      href: "diagnostics.html#accessory-power-workflow",
      label: "Fast Path",
      title: "Trace the accessory power path",
      detail: "Outlets, charger issues, radio, USB, and fuse checks."
    });
  }
  if (searchIntentIncludes(intent, "symptom", "roadside")) {
    pushRoute({
      href: "quick-sheet.html#roadside-dispatch-pack",
      label: "Roadside",
      title: "Build the roadside dispatch pack",
      detail: "Location, callback, checkpoints, cached routes, and source reminder."
    });
  }
  if (searchIntentIncludes(intent, "symptom", "trailer-lights")) {
    pushRoute({
      href: searchIntentIncludes(intent, "task", "diagnose")
        ? "diagnostics.html#trailer-light-workflow"
        : "rear-hitch.html#trailer-hookup-flow",
      label: "Trailer",
      title: searchIntentIncludes(intent, "task", "diagnose")
        ? "Run trailer-light diagnostics"
        : "Check the trailer hookup flow",
      detail: searchIntentIncludes(intent, "task", "diagnose")
        ? "Brake, turn, running, reverse, and adapter checks."
        : "Tow setup, 7-way pinout, lights, and hitch prep."
    });
  }
  if (wantsFuseLookup && searchIntentIncludes(intent, "location", "cabin")) {
    pushRoute({
      href: "cabin.html#cabin-fuse-quick-finder",
      label: "Cabin",
      title: "Open the cabin fuse quick finder",
      detail: "Interior outlets, chargers, radio, and under-dash fuse lookups."
    });
  }
  if (wantsFuseLookup && (searchIntentIncludes(intent, "location", "hood") || searchIntentIncludes(intent, "symptom", "no-start"))) {
    pushRoute({
      href: "hood.html#hood-fuse-quick-finder",
      label: "Hood",
      title: "Open the under-hood fuse quick finder",
      detail: "Battery, jump, trailer, and engine-bay electrical checks."
    });
  }
  if (searchIntentIncludes(intent, "symptom", "service")) {
    pushRoute({
      href: searchIntentIncludes(intent, "task", "record")
        ? "maintenance.html#maintenance-updater"
        : "maintenance.html#service-closeout",
      label: "Service",
      title: searchIntentIncludes(intent, "task", "record")
        ? "Open the maintenance updater"
        : "Jump into the maintenance closeout flow",
      detail: searchIntentIncludes(intent, "task", "record")
        ? "Update service history, mileage, notes, and parts quickly."
        : "Log what you did and update the truck record quickly."
    });
  }
  if (wantsSpecs) {
    pushRoute({
      href: /(washer|bolt|drain|plug)/.test(normalized)
        ? "maintenance.html#drain-hardware"
        : "index.html#technical",
      label: "Specs",
      title: /(washer|bolt|drain|plug)/.test(normalized)
        ? "Open drain hardware specs"
        : "Open technical specs",
      detail: /(washer|bolt|drain|plug)/.test(normalized)
        ? "Drain plug washers, bolts, and part numbers."
        : "Torque, capacities, sizes, and reference specs."
    });
  }

  if (searchIntentIncludes(intent, "symptom", "tire")) {
    pushRoute({
      href: /pressure|psi/.test(normalized)
        ? "tires.html#tire-pressure-sweep"
        : "tires.html#tire-roadside-launcher",
      label: "Tires",
      title: /pressure|psi/.test(normalized)
        ? "Open the tire pressure sweep"
        : "Open tire tools and roadside tire help",
      detail: /pressure|psi/.test(normalized)
        ? "Record four-corner PSI and stage the next recheck."
        : "Pressure, flat-tire help, lug specs, and recheck notes."
    });
  }

  if (searchIntentIncludes(intent, "symptom", "nfc")) {
    pushRoute({
      href: wantsNfcManager
        ? "nfc.html#tag-manager"
        : searchIntentIncludes(intent, "task", "write-scan")
          ? "nfc.html#tag-writer"
          : "nfc.html#starter-tag-pack",
      label: "NFC",
      title: wantsNfcManager
        ? "Open the NFC Tag Manager"
        : searchIntentIncludes(intent, "task", "write-scan")
          ? "Open the NFC writer and reader"
          : "Start with the NFC starter pack",
      detail: wantsNfcManager
        ? "Track mounted, programmed, and scanned tags with a local plan."
        : searchIntentIncludes(intent, "task", "write-scan")
          ? "Write, scan, copy, or share tag URLs directly from the console."
          : "Load the first four truck tags with ready-made placements and URLs."
    });
  }

  if (searchIntentIncludes(intent, "symptom", "photo") || searchIntentIncludes(intent, "type", "visual")) {
    pushRoute({
      href: /map|viewer/.test(normalized) ? "index.html#viewer" : "photo-atlas.html",
      label: "Visual",
      title: /map|viewer/.test(normalized) ? "Open the vehicle map" : "Browse the photo atlas",
      detail: /map|viewer/.test(normalized)
        ? "Use the 3D map when you know the truck area but not the page."
        : "Use visual references instead of hunting through text."
    });
  }

  if (searchIntentIncludes(intent, "task", "record") || searchIntentIncludes(intent, "type", "record")) {
    pushRoute({
      href: searchIntentIncludes(intent, "symptom", "service")
        ? "maintenance.html#maintenance-updater"
        : "garage.html#recent-handoffs",
      label: "Saved Work",
      title: searchIntentIncludes(intent, "symptom", "service")
        ? "Open saved service history"
        : "Resume recent owner work",
      detail: searchIntentIncludes(intent, "symptom", "service")
        ? "Update the log, receipts, notes, and maintenance cadence."
        : "Jump back into the latest notes, handoffs, and saved activity."
    });
  }

  if (searchIntentIncludes(intent, "task", "prep-offline")) {
    pushRoute({
      href: "quick-sheet.html#print-offline-pack",
      label: "Offline",
      title: "Prep the offline pack",
      detail: "Prime routes, print the Quick Sheet, and confirm cached pages."
    });
  }

  results.slice(0, 3).forEach((entry, index) => {
    pushRoute({
      href: entry.url,
      label: index === 0 && !routes.length ? "Best Match" : "Also Helpful",
      title: entry.title,
      detail: entry.excerpt || entry.category || entry.url
    });
  });

  return routes.slice(0, 4);
}

function renderSmartSearchRoutes(query, results) {
  if (!searchSmartStrip || !searchSmartList || !searchSmartCopy) {
    return;
  }

  const routes = buildSmartSearchRoutes(query, results);
  const trimmedQuery = `${query || ""}`.trim();
  searchSmartList.innerHTML = "";
  searchSmartStrip.hidden = routes.length === 0;
  searchSmartCopy.textContent = trimmedQuery
    ? `Fastest paths for "${trimmedQuery}".`
    : "Search a truck problem, page, or service task.";

  if (!routes.length) {
    return;
  }

  routes.forEach((route) => {
    const anchor = document.createElement("a");
    anchor.href = route.href;

    const label = document.createElement("span");
    label.textContent = route.label;
    const title = document.createElement("strong");
    title.textContent = route.title;
    const detail = document.createElement("em");
    detail.textContent = route.detail;

    anchor.append(label, title, detail);
    searchSmartList.appendChild(anchor);
  });
}

function renderSearchSummary(query, results) {
  if (!searchResultsSummary) {
    return;
  }

  const trimmedQuery = `${query || ""}`.trim();
  if (!trimmedQuery) {
    searchResultsSummary.textContent = "Search pages, sections, tools, symptoms, and service phrases across the truck site.";
    return;
  }

  const intentPhrase = buildSearchIntentPhrase(expandSearchQuery(trimmedQuery));

  const lead = results[0];
  if (!lead) {
    searchResultsSummary.textContent = intentPhrase
      ? `Prioritizing ${intentPhrase}. No direct matches for "${trimmedQuery}" yet. Try a shorter symptom, part name, or page title.`
      : `No direct matches for "${trimmedQuery}" yet. Try a shorter symptom, part name, or page title.`;
    return;
  }

  const category = lead.source === "section" ? "Page section" : lead.category || "Reference";
  searchResultsSummary.textContent = intentPhrase
    ? `Prioritizing ${intentPhrase}. Best match: ${lead.title} in ${category}. ${results.length} result${results.length === 1 ? "" : "s"} ready.`
    : `Best match: ${lead.title} in ${category}. ${results.length} result${results.length === 1 ? "" : "s"} ready.`;
}

function activateSearchQuery(query) {
  searchInput.value = query;
  renderResults(query);
  saveRecentSearch(query);
  renderRecentSearches();
  searchInput.focus();
}

function openSearch(event) {
  searchReturnFocus =
    event?.currentTarget instanceof HTMLElement
      ? event.currentTarget
      : document.activeElement instanceof HTMLElement && document.activeElement !== document.body
        ? document.activeElement
        : searchReturnFocus;
  searchModal.hidden = false;
  document.body.classList.add("modal-open");
  updateSearchOfflineCard();
  renderSearchRouteReadiness();
  renderSearchResumeWork();
  renderSearchRecentWork();
  renderRecentSearches();
  renderResults(searchInput.value);
  focusFirstIn(searchModal, "#site-search-input");
}

function closeSearch() {
  searchModal.hidden = true;
  if (!isAnyModalOpen()) {
    document.body.classList.remove("modal-open");
  }
  restoreFocusTo(searchReturnFocus);
  searchReturnFocus = null;
}

document.querySelectorAll("[data-open-search]").forEach((button) => {
  button.addEventListener("click", openSearch);
});
document.querySelectorAll("[data-print-page]").forEach((button) => {
  button.addEventListener("click", () => performUiAction("print-page"));
});
searchModal.querySelectorAll("[data-search-suggestion]").forEach((button) => {
  button.addEventListener("click", () => {
    activateSearchQuery(button.dataset.searchSuggestion || "");
  });
});
searchModal.querySelector("[data-search-refresh-pack]")?.addEventListener("click", async () => {
  updateSearchOfflineCard("Checking offline pack...");
  try {
    await refreshServiceWorkerRegistrations();
    const results = await checkSearchOfflineRoutes();
    renderSearchRouteReadiness(results);
    const readyCount = results.filter((route) => route.ready).length;
    updateSearchOfflineCard(`Offline pack check complete. ${readyCount}/${results.length} routes visible in cache.`);
  } catch {
    updateSearchOfflineCard("Could not update the offline pack in this browser session.");
  }
});
searchModal.querySelector("[data-search-check-routes]")?.addEventListener("click", async () => {
  updateSearchOfflineCard("Checking cached routes...");
  try {
    const results = await checkSearchOfflineRoutes();
    renderSearchRouteReadiness(results);
    const readyCount = results.filter((route) => route.ready).length;
    updateSearchOfflineCard(`${readyCount}/${results.length} key offline routes found.`);
  } catch {
    renderSearchRouteReadiness();
    updateSearchOfflineCard("Could not inspect cached routes in this browser session.");
  }
});
searchModal.querySelector("[data-search-prime-routes]")?.addEventListener("click", async () => {
  updateSearchOfflineCard("Priming key routes while online...");
  try {
    const results = await primeSearchOfflineRoutes();
    renderSearchRouteReadiness(results);
    const readyCount = results.filter((route) => route.ready).length;
    const unavailable = results.every((route) => route.unavailable);
    updateSearchOfflineCard(unavailable
      ? `${readyCount}/${results.length} routes checked; browser cache unavailable in this session.`
      : `${readyCount}/${results.length} routes primed for offline use.`);
  } catch {
    updateSearchOfflineCard("Could not prime routes in this browser session; open each key page once while online.");
  }
});
searchModal.querySelector("[data-search-copy-route-plan]")?.addEventListener("click", async () => {
  try {
    await copyText(buildSearchOfflineRoutePlan());
    updateSearchOfflineCard("Offline route plan copied.");
  } catch {
    updateSearchOfflineCard("Could not copy the route plan in this browser session.");
  }
});
searchModal.querySelectorAll("[data-close-search]").forEach((el) => {
  el.addEventListener("click", closeSearch);
});
searchQueryList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-search-history]");
  if (!button) {
    return;
  }
  activateSearchQuery(button.dataset.searchHistory || "");
});
searchSmartList?.addEventListener("click", () => {
  saveRecentSearch(searchInput.value);
  renderRecentSearches();
});
searchResults.addEventListener("click", (event) => {
  const anchor = event.target.closest(".search-result[data-search-query]");
  if (!anchor) {
    return;
  }
  saveRecentSearch(anchor.dataset.searchQuery || "");
  renderRecentSearches();
});
searchInput.addEventListener("input", () => renderResults(searchInput.value));
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && lastRenderedSearchResults.length) {
    event.preventDefault();
    saveRecentSearch(searchInput.value);
    window.location.href = lastRenderedSearchResults[0].url;
  }
});
searchInput.addEventListener("blur", () => {
  const value = searchInput.value.trim();
  if (value.length >= 2) {
    saveRecentSearch(value);
    renderRecentSearches();
  }
});
window.addEventListener("online", () => updateSearchOfflineCard("Back online."));
window.addEventListener("offline", () => updateSearchOfflineCard("Browsing cached site."));
navigator.serviceWorker?.addEventListener?.("controllerchange", () => updateSearchOfflineCard("Offline pack updated."));
navigator.serviceWorker?.ready?.then(() => updateSearchOfflineCard()).catch(() => {});

const initialSearchQuery = new URLSearchParams(location.search).get("search");
if (initialSearchQuery) {
  searchInput.value = initialSearchQuery;
  openSearch();
  if (isOfflineSearchQuery(initialSearchQuery)) {
    updateSearchOfflineCard("Checking route readiness for this offline search...");
    checkSearchOfflineRoutes()
      .then((results) => {
        renderSearchRouteReadiness(results);
        const readyCount = results.filter((route) => route.ready).length;
        updateSearchOfflineCard(`${readyCount}/${results.length} route targets checked for offline use.`);
      })
      .catch(() => updateSearchOfflineCard("Could not inspect cached routes for this offline search."));
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !/input|textarea/i.test(document.activeElement?.tagName || "")) {
    event.preventDefault();
    openSearch();
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (event.shiftKey) {
      openCommandPalette();
    } else {
      openSearch();
    }
  }

  if (event.key === "Escape" && !searchModal.hidden) {
    closeSearch();
  }

  const ownerAuthModal = document.querySelector("[data-owner-auth-modal]");
  if (event.key === "Escape" && ownerAuthModal && !ownerAuthModal.hidden) {
    ownerAuthModal.hidden = true;
    if (!isAnyModalOpen()) {
      document.body.classList.remove("modal-open");
    }
  }

  const installAppModal = document.querySelector("[data-install-app-modal]");
  if (event.key === "Escape" && installAppModal && !installAppModal.hidden) {
    installAppModal.hidden = true;
    if (!isAnyModalOpen()) {
      document.body.classList.remove("modal-open");
    }
  }

  if (event.key === "Escape" && !commandPalette.modal.hidden) {
    closeCommandPalette();
  }

  if (event.key === "Escape" && siteMenu && !siteMenu.menu.hidden) {
    siteMenu.closeMenu();
  }

  if (event.key === "Escape" && document.querySelector(".quick-capture-modal")?.hidden === false) {
    closeQuickCapture();
  }

  if (event.key === "Escape" && document.querySelector(".sync-settings-modal")?.hidden === false) {
    closeSyncSettings();
  }

  if (event.key === "Escape" && document.querySelector(".mini-tools-drawer")?.hidden === false) {
    closeMiniToolsDrawer();
  }
});

window.ridgelineShowToast = showToast;
window.ridgelineSaveLastTask = saveLastTask;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
