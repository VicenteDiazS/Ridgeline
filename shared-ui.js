import { searchIndex } from "./search-data.js";

const searchButton = document.querySelector("[data-open-search]");
const topbar = document.querySelector(".topbar");

const routeLinks = [
  { label: "Map", href: "index.html#viewer", match: "index.html" },
  { label: "Fuses", href: "hood.html#fuses", match: "hood.html" },
  { label: "Cabin", href: "cabin.html#fuses", match: "cabin.html" },
  { label: "Cargo", href: "cargo.html", match: "cargo.html" },
  { label: "Towing", href: "rear-hitch.html", match: "rear-hitch.html" },
  { label: "Maint", href: "maintenance.html", match: "maintenance.html" },
  { label: "Oil", href: "maintenance.html#oil-service", match: "maintenance.html" },
  { label: "Diag", href: "diagnostics.html", match: "diagnostics.html" },
  { label: "Garage", href: "garage.html", match: "garage.html" }
];

function currentPageName() {
  const page = location.pathname.split("/").pop();
  return page || "index.html";
}

function buildRouteStrip() {
  if (!topbar) {
    return;
  }

  const strip = document.createElement("nav");
  strip.className = "route-strip";
  strip.setAttribute("aria-label", "Quick page navigation");

  const page = currentPageName();

  routeLinks.forEach((link) => {
    const anchor = document.createElement("a");
    anchor.href = link.href;
    anchor.textContent = link.label;
    if (page === link.match) {
      anchor.classList.add("is-active");
    }
    strip.appendChild(anchor);
  });

  topbar.insertAdjacentElement("afterend", strip);
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
  document.body.classList.remove("modal-open");
}

buildRouteStrip();

searchButton?.addEventListener("click", openSearch);
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
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
