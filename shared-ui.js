import { searchIndex } from "./search-data.js";

const searchButtons = document.querySelectorAll("[data-open-search]");
const topbar = document.querySelector(".topbar");
const topbarActions = document.querySelector(".topbar-actions");
const main = document.querySelector("main");
const nfcTargetId = new URLSearchParams(location.search).get("nfc");

if (nfcTargetId) {
  document.body?.classList.add("nfc-deep-link");
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

  resetOpeningScroll();
  requestAnimationFrame(resetOpeningScroll);
  window.addEventListener("load", () => {
    resetOpeningScroll();
    setTimeout(resetOpeningScroll, 100);
    setTimeout(resetOpeningScroll, 400);
  });
  window.addEventListener("pageshow", resetOpeningScroll);
}

keepPlainPageLoadsAtTop();

const menuLinks = [
  { label: "Vehicle Map", href: "index.html#viewer", match: "index.html", note: "3D truck viewer and interactive zones" },
  { label: "Engine Explorer", href: "engine.html", match: "engine.html", note: "Interactive J35Y6 technical engine model" },
  { label: "NFC Tags", href: "nfc.html", match: "nfc.html", note: "Program truck tags that open exact pages and diagrams" },
  { label: "AR Lab", href: "ar-lab.html", match: "ar-lab.html", note: "Open the truck model in AR or 3D" },
  { label: "Photo Atlas", href: "photo-atlas.html", match: "photo-atlas.html", note: "Real truck area photos grouped by zone" },
  { label: "Fuse Boxes", href: "hood.html#fuses", match: "hood.html", note: "Under-hood and driver-left fuse references" },
  { label: "Cabin", href: "cabin.html#fuses", match: "cabin.html", note: "Interior fuse and electronics section" },
  { label: "Cargo", href: "cargo.html", match: "cargo.html", note: "Bed, trunk, and dimensions" },
  { label: "Towing", href: "rear-hitch.html", match: "rear-hitch.html", note: "Connector, pinout, and towing checklist" },
  { label: "Maintenance", href: "maintenance.html", match: "maintenance.html", note: "Oil, filters, service codes, brakes, tires, and fluids" },
  { label: "Quick Sheet", href: "quick-sheet.html", match: "quick-sheet.html", note: "One-page fast reference for common specs" },
  { label: "Diagnostics", href: "diagnostics.html", match: "diagnostics.html", note: "Symptom-based troubleshooting shortcuts" },
  { label: "Garage Log", href: "garage.html", match: "garage.html", note: "Your notes, service history, and saved references" }
];

function currentPageName() {
  const page = location.pathname.split("/").pop();
  return page || "index.html";
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

  const topbarHeight = document.querySelector(".topbar")?.getBoundingClientRect().height || 0;
  const offset = Math.max(72, topbarHeight + 18);
  const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
  window.scrollTo({ top, left: 0, behavior: "auto" });
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
    { label: "Engine", href: "engine.html" },
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

function actionHint(label) {
  const value = `${label}`.toLowerCase();
  if (value.includes("engine")) return "Open the interactive J35Y6 engine model.";
  if (value.includes("fuse")) return "Fastest route into the electrical reference.";
  if (value.includes("maintenance")) return "Open the recurring service and spec page.";
  if (value.includes("diagnostic")) return "Start from symptoms and quick checks.";
  if (value.includes("garage")) return "See truck-specific notes and service memory.";
  if (value.includes("map") || value.includes("viewer")) return "Jump back into the live truck view.";
  if (value.includes("ar")) return "Open the truck in AR or 3D preview.";
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
  if (!sections.length || !rail) {
    return;
  }

  const linkMap = new Map(
    [...rail.querySelectorAll("[data-section-link]")].map((link) => [link.dataset.sectionLink, link])
  );

  const setActive = (id) => {
    linkMap.forEach((link, key) => {
      const active = key === id;
      link.classList.toggle("is-active", active);
      link.setAttribute("aria-current", active ? "true" : "false");
    });
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

function buildBackToMapButton() {
  if (document.querySelector(".back-to-map-fab")) {
    return;
  }

  const button = document.createElement("a");
  button.className = "back-to-map-fab";
  button.href = "index.html#viewer";
  button.dataset.navIcon = "map";
  button.textContent = "Back To Map";
  document.body.appendChild(button);
}

function relatedLinksForPage(page) {
  const map = {
    "index.html": [
      { label: "Engine Explorer", href: "engine.html", note: "Inspect the J35Y6 technical engine model." },
      { label: "Maintenance", href: "maintenance.html", note: "Service intervals, fluids, and specs." },
      { label: "Garage Log", href: "garage.html#dashboard", note: "Your truck-specific history and notes." }
    ],
    "engine.html": [
      { label: "NFC Tags", href: "nfc.html", note: "Make physical tags open this engine model or a part reference." },
      { label: "Timing Service Record", href: "maintenance.html#major-service-log", note: "Open the recorded AISIN timing kit service." },
      { label: "Vehicle Map", href: "index.html#viewer", note: "Return to the full truck map." }
    ],
    "nfc.html": [
      { label: "Fuse Box A", href: "hood.html#hood-fuse-box-a", note: "Test the exact under-hood fuse-box deep link." },
      { label: "Cabin Fuses", href: "cabin.html#cabin-fuse-box-a", note: "Test the exact driver-left fuse-box deep link." },
      { label: "Vehicle Map", href: "index.html#viewer", note: "Return to the main truck map." }
    ],
    "maintenance.html": [
      { label: "Engine Explorer", href: "engine.html", note: "View the timing-side engine model." },
      { label: "Garage Log", href: "garage.html#dashboard", note: "Save what was actually installed and serviced." },
      { label: "Quick Sheet", href: "quick-sheet.html", note: "Condensed numbers and emergency references." }
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
  if (!mainElement || document.querySelector(".related-strip")) {
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

    const button = document.createElement("button");
    button.className = "collapsible-card-toggle";
    button.type = "button";
    button.setAttribute("aria-expanded", "true");
    button.innerHTML = `<span>${title.textContent.trim()}</span><strong>Collapse</strong>`;

    const heading = document.createElement("div");
    heading.className = "collapsible-card-head";
    heading.append(title, button);

    card.append(heading, content);

    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", expanded ? "false" : "true");
      button.querySelector("strong").textContent = expanded ? "Expand" : "Collapse";
      content.hidden = expanded;
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
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", "site-menu");
  button.textContent = "Menu";
  topbarActions.insertBefore(button, topbarActions.firstChild);

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
    </aside>
  `;

  document.body.appendChild(menu);

  const openMenu = () => {
    menu.hidden = false;
    button.setAttribute("aria-expanded", "true");
    document.body.classList.add("modal-open");
  };

  const closeMenu = () => {
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (searchModal.hidden) {
      document.body.classList.remove("modal-open");
    }
  };

  button.addEventListener("click", () => {
    if (menu.hidden) {
      openMenu();
    } else {
      closeMenu();
    }
  });

  menu.querySelectorAll("[data-close-menu], .site-menu-link").forEach((element) => {
    element.addEventListener("click", closeMenu);
  });

  return { menu, closeMenu };
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
const brandLink = document.querySelector(".brand");
const pageSections = collectPageSections();
promoteNfcTarget();
buildQuickActionBar();
buildHeroActionCards();
const sectionRail = buildSectionRail(pageSections);
syncActiveSectionUi(pageSections, sectionRail);
buildBackToMapButton();
buildCollapsibleCards();
buildRelatedStrip();
enhanceActiveLinks();

if (location.hash || new URLSearchParams(location.search).has("nfc")) {
  requestAnimationFrame(scrollToHashTarget);
  window.addEventListener("load", () => {
    requestAnimationFrame(scrollToHashTarget);
    setTimeout(scrollToHashTarget, 160);
    setTimeout(scrollToHashTarget, 520);
  });
  window.addEventListener("hashchange", () => requestAnimationFrame(scrollToHashTarget));
}

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
