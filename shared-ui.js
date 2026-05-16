import { searchIndex } from "./search-data.js";
import { nfcTargets } from "./nfc-data.js";

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
  { label: "Engine Explorer", href: "engine.html", match: "engine.html", note: "Interactive J35Y6 technical engine model" },
  { label: "Tire And Wheel Lab", href: "tires.html", match: "tires.html", note: "3D tire model, wheel specs, and fitment guidance" },
  { label: "NFC Tags", href: "nfc.html", match: "nfc.html", note: "Program truck tags that open exact pages and diagrams" },
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
  if (!topbar || !main || document.querySelector(".view-mode-rail")) {
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
      key: "map",
      label: "Map",
      href: "index.html#viewer",
      icon: "map",
      aria: "Open vehicle map",
      title: "Vehicle map"
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
      existingLink.setAttribute("aria-label", existingLink.getAttribute("aria-label") || action.aria);
      existingLink.title = existingLink.title || action.title;
      return;
    }

    const link = document.createElement("a");
    link.className = "header-nav-button";
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
    currentPage.innerHTML = `<span>Current</span><strong>${currentPageDisplayLabel()}</strong>`;
    topbar.insertBefore(currentPage, topbarActions);
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
  target.closest(".section-reveal")?.classList.add("is-visible");
  return true;
}

function getNavigationScrollOffset() {
  const topbarHeight = document.querySelector(".topbar")?.getBoundingClientRect().height || 0;
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
  if (!revealNavigationTarget(target)) {
    return;
  }

  const offset = getNavigationScrollOffset();
  const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
  scrollWindowTo(top, "auto");
}

function scrollToSectionElement(target, behavior = "smooth") {
  if (!target) {
    return;
  }

  revealNavigationTarget(target);

  const offset = getNavigationScrollOffset();
  const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
  scrollWindowTo(top, behavior);
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

function scheduleHashScroll(hashValue = location.hash, behavior = "auto") {
  const delays = [0, 80, 220, 520, 1000, 1800, 2800, 4200, 6000];
  delays.forEach((delay) => {
    window.setTimeout(() => scrollToHashValue(hashValue, behavior), delay);
  });
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
  const hasSectionDock = Boolean(document.querySelector(".section-dock"));

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

  container.innerHTML = `
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
    if (event.target.closest("a.mobile-nav-link")) {
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
    if (linkMap.size) {
      linkMap.forEach((link, key) => {
        const active = key === id;
        link.classList.toggle("is-active", active);
        link.setAttribute("aria-current", active ? "true" : "false");
      });
    }
    saveLastSection(id);
    window.dispatchEvent(new CustomEvent("ridgeline:active-section", { detail: { id } }));
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
      { label: "Update", href: "#maintenance-updater", icon: "wrench" },
      { label: "Oil", href: "#oil-service", icon: "bolt" },
      { label: "Jobs", href: "#job-mode", icon: "map" },
      { label: "More", action: "tools", icon: "menu" }
    ],
    "tires.html": [
      { label: "3D Tire", href: "#wheel-model", icon: "wheel" },
      { label: "Fitment", href: "#fitment-guide", icon: "wrench" },
      { label: "Search", action: "search", icon: "search" },
      { label: "More", action: "tools", icon: "menu" }
    ],
    "nfc.html": [
      { label: "Write", href: "#tag-writer", icon: "nfc" },
      { label: "Map", href: "#tag-map", icon: "map" },
      { label: "Search", action: "search", icon: "search" },
      { label: "More", action: "tools", icon: "menu" }
    ],
    "diagnostics.html": [
      { label: "Flows", href: "#workflow-index", icon: "diag" },
      { label: "Fuses", href: "hood.html#fuses", icon: "bolt" },
      { label: "Search", action: "search", icon: "search" },
      { label: "More", action: "tools", icon: "menu" }
    ],
    "garage.html": [
      { label: "Dash", href: "#dashboard", icon: "map" },
      { label: "Notes", href: "#notes", icon: "wrench" },
      { label: "Search", action: "search", icon: "search" },
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
  if (action === "copy-location") {
    copyCurrentLocation();
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
      return `<a class="context-action" ${attrs} data-nav-icon="${item.icon || getNavIcon(item.label, item.href || item.action)}"><span>${item.label}</span></a>`;
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
        <button type="button" data-mini-action="copy-location" data-nav-icon="copy">Copy Location</button>
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
  if (!main || document.querySelector(".current-page-chip")) {
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
  const hash = location.hash;
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
      ariaCurrent = localHash && localHash === hash ? "location" : "page";
    }

    link.classList.toggle("is-current-link", active);
    if (active) {
      link.setAttribute("aria-current", ariaCurrent);
    } else {
      link.removeAttribute("aria-current");
    }
  });
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
  badges.setAttribute("aria-label", "Save and backup status");
  const render = (message = "Saved locally") => {
    const githubReady = Boolean(localStorage.getItem("ridgeline-github-backup-endpoint"));
    const supabaseOff = localStorage.getItem("ridgeline-remote-enabled") === "0";
    badges.innerHTML = `
      <span>Saved</span>
      <span>${supabaseOff ? "Supabase off" : "Supabase ready"}</span>
      <span>${githubReady ? "GitHub backup ready" : "GitHub backup not set"}</span>
      <strong>${message}</strong>
    `;
  };
  render();
  window.addEventListener("ridgeline:storage-hydrated", () => render("Synced from remote"));
  window.addEventListener("storage", () => render());
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
    <a href="photo-atlas.html">Add Photo</a>
    <a href="maintenance.html">Mark Done</a>
    <a href="${relatedHref}">Open Related</a>
    <button type="button" data-page-action="quick-capture">Quick Add</button>
    <button type="button" data-page-action="sync-settings">Sync</button>
    <button type="button" data-page-action="copy-location">Copy Link</button>
    <button type="button" data-page-action="last-task">Last Task</button>
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
  if (document.querySelector(".quick-capture-modal")) {
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
  "quick-sheet.html"
];

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

function expandSearchQuery(value = "") {
  const normalized = normalizeSearchText(value);
  const tokens = tokenizeSearch(normalized);
  const expanded = new Set(tokens);

  tokens.forEach((token) => {
    SEARCH_SYNONYMS.get(token)?.forEach((term) => {
      tokenizeSearch(term).forEach((expandedToken) => expanded.add(expandedToken));
    });
  });

  return {
    phrase: normalized,
    tokens,
    expandedTokens: [...expanded]
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
  return {
    title: entry.title || "Untitled",
    url: entry.url || "#",
    category: entry.category || "Reference",
    keywords,
    excerpt: entry.excerpt || "",
    source,
    normalized,
    tokens
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
let searchReturnFocus = null;
const commandPalette = buildCommandPalette();
document.body.classList.add(currentPageName() === "index.html" ? "is-home-page" : "is-subpage");
document.body.classList.add(`page-${currentPageName().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "index"}`);
setWorkArea(getSavedWorkArea());
buildUniversalHeaderActions();
const siteMenu = buildSiteMenu();
const brandLink = document.querySelector(".brand");
buildHomeCommandCenter();
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
buildBreadcrumbTrail(pageSections);
buildRecentStrip();
buildSyncStatusBadges();
buildPageActionBar();
buildNeedLauncher();
buildFavoritePins();
buildVisualSiteMap();
buildQuickCapture();
buildSyncSettingsPanel();
buildEmptyStates();
buildCurrentPageChip(pageSections);
buildContextualBottomBar();
buildMiniToolsDrawer();
const sectionRail = isMobileNavMode ? null : buildSectionRail(pageSections);
syncActiveSectionUi(pageSections, sectionRail);
buildBackToMapButton();
buildScrollProgress();
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
    scheduleHashScroll(targetHash, "auto");
    keepHashTargetAligned(targetHash, "auto");
    setTimeout(scrollToHashTarget, 1800);
  });
}

window.addEventListener("hashchange", () => requestAnimationFrame(scrollToHashTarget));
document.addEventListener("click", (event) => {
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
  scrollToHashValue(localUrl.hash, "smooth");
  scheduleHashScroll(localUrl.hash, "smooth");
  keepHashTargetAligned(localUrl.hash, "smooth", 2600);
});

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
  const requestId = `${Date.now()}-${Math.random()}`;
  searchResults.dataset.requestId = requestId;

  const staticEntries = [
    ...searchIndex.map((entry) => makeSearchEntry(entry, "static")),
    ...entriesFromNfcTargets()
  ];
  renderSearchEntries(searchEntries(staticEntries, query));

  buildFullSearchIndex()
    .then((entries) => {
      if (searchResults.dataset.requestId !== requestId) {
        return;
      }
      renderSearchEntries(searchEntries(entries, query));
    })
    .catch(() => {
      if (!searchResults.children.length) {
        renderSearchEntries(searchEntries(staticEntries, query));
      }
    });
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
    searchInput.value = button.dataset.searchSuggestion || "";
    renderResults(searchInput.value);
    searchInput.focus();
  });
});
searchModal.querySelectorAll("[data-close-search]").forEach((el) => {
  el.addEventListener("click", closeSearch);
});
searchInput.addEventListener("input", () => renderResults(searchInput.value));

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
