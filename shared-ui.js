import { searchIndex } from "./search-data.js";

const searchButtons = document.querySelectorAll("[data-open-search]");
const topbar = document.querySelector(".topbar");
const topbarActions = document.querySelector(".topbar-actions");
const main = document.querySelector("main");
const nfcTargetId = new URLSearchParams(location.search).get("nfc");
const hasDeepTargetOnLoad = Boolean(location.hash) || Boolean(nfcTargetId);
const CONTENT_MODE_STORAGE_KEY = "ridgeline-content-mode";
const RECENT_NAV_STORAGE_KEY = "ridgeline-recent-nav";
const LAST_SECTION_STORAGE_PREFIX = "ridgeline-last-section:";
const prefersCompactDefault =
  window.matchMedia("(max-width: 900px)").matches || window.matchMedia("(pointer: coarse)").matches;
const isMobileNavMode = prefersCompactDefault;

let currentContentMode = prefersCompactDefault ? "essential" : "full";
let optionalSections = [];
let navOnlySections = [];
let viewModeButtons = [];
let navActionButtons = [];

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
    return `${url.pathname.split("/").pop() || "index.html"}${url.hash || ""}`;
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
  { label: "Garage Log", href: "garage.html", match: "garage.html", note: "Your notes, service history, and saved references" }
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

function buildTopbarLiveRefreshButton() {
  if (!topbarActions || document.querySelector("[data-live-refresh-button]")) {
    return null;
  }

  const button = document.createElement("button");
  button.className = "live-refresh-button";
  button.type = "button";
  button.dataset.liveRefreshButton = "true";
  button.textContent = "Refresh";
  button.title = "Reload fresh code from GitHub";
  button.setAttribute("aria-label", "Reload fresh code from GitHub");

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

function getHashTarget() {
  const nfcTarget = new URLSearchParams(location.search).get("nfc");
  const targetId = nfcTarget || (location.hash && location.hash !== "#top" ? location.hash.slice(1) : "");
  if (!targetId) {
    return null;
  }

  try {
    return document.getElementById(decodeURIComponent(targetId));
  } catch {
    return document.getElementById(targetId);
  }
}

function scrollToHashTarget() {
  const target = getHashTarget();
  if (!target) {
    return;
  }

  const targetSection = target.closest("main > section");
  if (targetSection?.hidden) {
    setContentMode("full", true);
  }

  const topbarHeight = document.querySelector(".topbar")?.getBoundingClientRect().height || 0;
  const offset = Math.max(72, topbarHeight + 18);
  const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
  window.scrollTo({ top, left: 0, behavior: "auto" });
}

function scrollToSectionElement(target, behavior = "smooth") {
  if (!target) {
    return;
  }

  const topbarHeight = document.querySelector(".topbar")?.getBoundingClientRect().height || 0;
  const offset = Math.max(72, topbarHeight + 18);
  const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
  window.scrollTo({ top, left: 0, behavior });
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
    document.querySelector(".menu-toggle")?.click();
  });

  window.addEventListener("ridgeline:active-section", (event) => {
    setActiveFromId(event.detail?.id);
  });
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
    ...document.querySelectorAll(".topnav a, .route-strip a, .section-dock a, .section-utility-nav a")
  ];

  links.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const localHash = normalizeLocalHref(href);
    let active = false;

    if (href.startsWith("#")) {
      active = !!hash && href === hash;
    } else if (href.includes(".html")) {
      active = href.split("#")[0] === page && (!localHash || localHash === hash);
    }

    link.classList.toggle("is-current-link", active);
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

  const button = document.createElement("button");
  button.className = "menu-toggle";
  button.type = "button";
  button.setAttribute("aria-pressed", "false");
  button.textContent = "Nav";
  topbarActions.insertBefore(button, topbarActions.firstChild);
  navActionButtons = [...navActionButtons, button];

  const page = currentPageName();
  const menu = document.createElement("div");
  menu.className = "site-menu";
  menu.id = "site-menu";
  menu.hidden = true;

  const linkMarkup = menuLinks
    .map((link) => {
      const activeClass = page === link.match ? " is-active" : "";
      return `
        <a class="site-menu-link${activeClass}" href="${link.href}">
          <strong>${link.label}</strong>
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

  const openMenu = () => {
    refreshRecentPanel(recentPanel);
    menu.hidden = false;
    document.body.classList.add("modal-open");
  };

  const closeMenu = () => {
    menu.hidden = true;
    if (searchModal.hidden) {
      document.body.classList.remove("modal-open");
    }
  };

  bindPress(button, toggleNavigationMode);

  menu.querySelectorAll("[data-close-menu], .site-menu-link").forEach((element) => {
    element.addEventListener("click", closeMenu);
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

  return { menu, closeMenu };
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
      <div class="search-results" id="site-search-results"></div>
      <div class="search-foot">
        <span>Tip: press <kbd>/</kbd> or <kbd>Ctrl</kbd> + <kbd>K</kbd></span>
      </div>
    </section>
  `;
  document.body.appendChild(modal);
  return modal;
}

const searchModal = buildSearchModal();
const searchInput = searchModal.querySelector("#site-search-input");
const searchResults = searchModal.querySelector("#site-search-results");
const siteMenu = buildSiteMenu();
buildTopbarLiveRefreshButton();
const brandLink = document.querySelector(".brand");
const pageSections = collectPageSections();
recordCurrentPageVisit();
registerRecentNavTracking();
promoteNfcTarget();
buildViewModeRail();
setContentMode(getSavedContentMode(), false);
buildMobileNavAccordion(pageSections);
simplifyNavigationLayout();
const sectionRail = isMobileNavMode ? null : buildSectionRail(pageSections);
syncActiveSectionUi(pageSections, sectionRail);
buildResumeButton();
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
    requestAnimationFrame(scrollToHashTarget);
    setTimeout(scrollToHashTarget, 160);
    setTimeout(scrollToHashTarget, 520);
  });
}

window.addEventListener("hashchange", () => requestAnimationFrame(scrollToHashTarget));
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href^='#']");
  if (!link) {
    return;
  }

  const href = link.getAttribute("href") || "";
  if (!href || href === "#" || href === "#top") {
    return;
  }

  requestAnimationFrame(scrollToHashTarget);
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

function renderResults(query = "") {
  const value = query.trim().toLowerCase();
  const results = !value
    ? searchIndex.slice(0, 8)
    : searchIndex.filter((entry) => {
        const haystack = `${entry.title} ${entry.category} ${entry.keywords.join(" ")}`.toLowerCase();
        return haystack.includes(value);
      }).slice(0, 12);

  searchResults.innerHTML = "";

  results.forEach((entry) => {
    const anchor = document.createElement("a");
    anchor.className = "search-result";
    anchor.href = entry.url;
    anchor.innerHTML = `
      <span>${entry.category}</span>
      <strong>${entry.title}</strong>
      <p>${entry.url}</p>
    `;
    searchResults.appendChild(anchor);
  });

  if (!results.length) {
    const empty = document.createElement("p");
    empty.className = "search-empty";
    empty.textContent = "No matches yet. Try a fuse number, acronym, or page name.";
    searchResults.appendChild(empty);
  }
}

function openSearch() {
  searchModal.hidden = false;
  document.body.classList.add("modal-open");
  renderResults(searchInput.value);
  searchInput.focus();
}

function closeSearch() {
  searchModal.hidden = true;
  if (!siteMenu || siteMenu.menu.hidden) {
    document.body.classList.remove("modal-open");
  }
}

document.querySelectorAll("[data-open-search]").forEach((button) => {
  button.addEventListener("click", openSearch);
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
    openSearch();
  }

  if (event.key === "Escape" && !searchModal.hidden) {
    closeSearch();
  }

  if (event.key === "Escape" && siteMenu && !siteMenu.menu.hidden) {
    siteMenu.closeMenu();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
