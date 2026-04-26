import { searchIndex } from "./search-data.js";

const searchButtons = document.querySelectorAll("[data-open-search]");
const topbar = document.querySelector(".topbar");
const topbarActions = document.querySelector(".topbar-actions");

function keepPlainPageLoadsAtTop() {
  if (location.hash) {
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

function prioritizeMobileViewerStageOnHome() {
  const isHomePage =
    location.pathname.endsWith("/") ||
    location.pathname.endsWith("/index.html") ||
    location.pathname.split("/").pop() === "";
  const isMobileViewport =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;

  if (!isHomePage || !isMobileViewport || location.hash) {
    return;
  }

  const viewerSection = document.getElementById("viewer");
  if (!viewerSection) {
    return;
  }

  let userInteracted = false;
  let enforcementTimer = null;
  let enforcementInterval = null;

  const stopEnforcement = () => {
    if (enforcementTimer) {
      clearTimeout(enforcementTimer);
      enforcementTimer = null;
    }
    if (enforcementInterval) {
      clearInterval(enforcementInterval);
      enforcementInterval = null;
    }
  };

  const markUserInteraction = () => {
    userInteracted = true;
    stopEnforcement();
  };

  const placeViewerFirst = () => {
    if (userInteracted) {
      return;
    }

    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    const viewerTop = viewerSection.getBoundingClientRect().top + window.scrollY;
    const targetTop = Math.max(0, viewerTop);

    root.style.scrollBehavior = "auto";
    window.scrollTo(0, targetTop);
    root.scrollTop = targetTop;
    document.body.scrollTop = targetTop;
    root.style.scrollBehavior = previousScrollBehavior;
  };

  requestAnimationFrame(placeViewerFirst);
  window.addEventListener("load", () => {
    placeViewerFirst();
    setTimeout(placeViewerFirst, 80);
    setTimeout(placeViewerFirst, 220);
    setTimeout(placeViewerFirst, 520);
  });
  window.addEventListener("pageshow", placeViewerFirst);

  enforcementInterval = window.setInterval(placeViewerFirst, 180);
  enforcementTimer = window.setTimeout(stopEnforcement, 2600);

  ["touchstart", "pointerdown", "wheel", "keydown"].forEach((eventName) => {
    window.addEventListener(eventName, markUserInteraction, { passive: true, once: true });
  });
}

prioritizeMobileViewerStageOnHome();

const menuLinks = [
  { label: "Vehicle Map", href: "index.html#viewer", match: "index.html", note: "3D truck viewer and interactive zones" },
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
