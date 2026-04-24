import {
  filesToPhotoEntries,
  formPayload,
  hydrateForm,
  loadAreaJournal,
  loadJson,
  saveJson,
  STORAGE
} from "./garage-data.js";

const notesForm = document.querySelector("[data-notes-form]");
const trackerForm = document.querySelector("[data-tracker-form]");
const photosInput = document.querySelector("[data-photo-input]");
const photosGrid = document.querySelector("[data-photo-grid]");
const favoritesList = document.querySelector("[data-favorites-list]");
const areaSummary = document.querySelector("[data-area-summary]");
const dashboardGrid = document.querySelector("[data-garage-dashboard]");

if (notesForm) {
  hydrateForm(notesForm, loadJson(STORAGE.notes, {}));

  notesForm.addEventListener("input", () => {
    saveJson(STORAGE.notes, formPayload(notesForm));
  });
}

if (trackerForm) {
  hydrateForm(trackerForm, loadJson(STORAGE.tracker, {}));

  trackerForm.addEventListener("input", () => {
    saveJson(STORAGE.tracker, formPayload(trackerForm));
  });
}

function renderPhotos() {
  if (!photosGrid) {
    return;
  }

  const photos = loadJson(STORAGE.photos, []);
  photosGrid.innerHTML = "";

  if (!photos.length) {
    const empty = document.createElement("p");
    empty.className = "small-note";
    empty.textContent = "No saved reference photos yet.";
    photosGrid.appendChild(empty);
    return;
  }

  photos.forEach((photo, index) => {
    const card = document.createElement("figure");
    card.className = "photo-card";
    card.innerHTML = `
      <img src="${photo.src}" alt="${photo.label}" />
      <figcaption>
        <strong>${photo.label}</strong>
        <button type="button" data-remove-photo="${index}">Remove</button>
      </figcaption>
    `;
    photosGrid.appendChild(card);
  });

  photosGrid.querySelectorAll("[data-remove-photo]").forEach((button) => {
    button.addEventListener("click", () => {
      const photos = loadJson(STORAGE.photos, []);
      photos.splice(Number(button.dataset.removePhoto), 1);
      saveJson(STORAGE.photos, photos);
      renderPhotos();
    });
  });
}

photosInput?.addEventListener("change", async () => {
  const files = [...photosInput.files].slice(0, 4);
  const current = loadJson(STORAGE.photos, []).slice(0, 8);
  const additions = await filesToPhotoEntries(files);
  current.push(...additions);

  saveJson(STORAGE.photos, current.slice(0, 8));
  renderPhotos();
  photosInput.value = "";
});

function renderFavorites() {
  if (!favoritesList) {
    return;
  }

  const favorites = loadJson(STORAGE.favorites, []);
  favoritesList.innerHTML = "";

  if (!favorites.length) {
    const empty = document.createElement("p");
    empty.className = "small-note";
    empty.textContent = "No saved fuse favorites yet. Save them from a fuse diagram.";
    favoritesList.appendChild(empty);
    return;
  }

  favorites.forEach((favorite, index) => {
    const card = document.createElement("article");
    card.className = "tech-card";
    card.innerHTML = `
      <h3>${favorite.panel ? `${favorite.panel.toUpperCase()} - ` : ""}${favorite.position}</h3>
      <p>${favorite.circuit}</p>
      <div class="mini-specs">
        <div class="mini-spec"><span>Rating</span><span>${favorite.rating}</span></div>
        <div class="mini-spec"><span>Type</span><span>${favorite.type}</span></div>
      </div>
      <div class="inspector-actions">
        <a class="utility-link" href="${favorite.url}">Open Fuse</a>
        <button class="ghost-button" type="button" data-remove-favorite="${index}">Remove</button>
      </div>
    `;
    favoritesList.appendChild(card);
  });

  favoritesList.querySelectorAll("[data-remove-favorite]").forEach((button) => {
    button.addEventListener("click", () => {
      const favorites = loadJson(STORAGE.favorites, []);
      favorites.splice(Number(button.dataset.removeFavorite), 1);
      saveJson(STORAGE.favorites, favorites);
      renderFavorites();
    });
  });
}

function renderAreaSummary() {
  if (!areaSummary) {
    return;
  }

  const areas = [
    { key: "hood", title: "Hood / Engine Bay", url: "hood.html#area-journal" },
    { key: "cabin", title: "Cabin / Electronics", url: "cabin.html#area-journal" },
    { key: "cargo", title: "Bed / In-Bed Trunk", url: "cargo.html#area-journal" },
    { key: "rear-hitch", title: "Rear Hitch / Wiring", url: "rear-hitch.html#area-journal" }
  ];

  areaSummary.innerHTML = "";

  areas.forEach((area) => {
    const journal = loadAreaJournal(area.key);
    const noteCount = Object.values(journal.notes || {}).filter(Boolean).length;
    const photoCount = (journal.photos || []).length;
    const card = document.createElement("article");
    card.className = "tech-card";
    card.innerHTML = `
      <h3>${area.title}</h3>
      <div class="mini-specs">
        <div class="mini-spec"><span>Saved fields</span><span>${noteCount}</span></div>
        <div class="mini-spec"><span>Photos</span><span>${photoCount}</span></div>
      </div>
      <div class="inspector-actions">
        <a class="utility-link" href="${area.url}">Open Area Journal</a>
      </div>
    `;
    areaSummary.appendChild(card);
  });
}

function renderDashboard() {
  if (!dashboardGrid) {
    return;
  }

  const notes = loadJson(STORAGE.notes, {});
  const tracker = loadJson(STORAGE.tracker, {});
  const favorites = loadJson(STORAGE.favorites, []);
  const photos = loadJson(STORAGE.photos, []);
  const areas = ["hood", "cabin", "cargo", "rear-hitch"].map((key) => loadAreaJournal(key));
  const noteFields = Object.values(notes).filter(Boolean).length;
  const trackerFields = Object.values(tracker).filter(Boolean).length;
  const areaPhotos = areas.reduce((sum, area) => sum + (area.photos || []).length, 0);
  const areaNotes = areas.reduce(
    (sum, area) => sum + Object.values(area.notes || {}).filter(Boolean).length,
    0
  );

  const cards = [
    ["Truck Profile", "VIN 5FPYK2F64KB002267", "2019 Ridgeline / 2WD / 3.5L V6"],
    ["Saved Notes", `${noteFields} fields`, "Installed parts and general truck memory"],
    ["Service Tracker", `${trackerFields} entries`, "Mileage and last-service checkpoints"],
    ["Fuse Saves", `${favorites.length} favorites`, "Frequently checked circuits saved locally"],
    ["Photo Atlas", `${photos.length + areaPhotos} photos`, "Garage and area-reference images"],
    ["Area Journals", `${areaNotes} notes`, "Hood, cabin, cargo, and hitch journals"]
  ];

  dashboardGrid.innerHTML = cards
    .map(
      ([label, value, note]) => `
        <article class="dashboard-card">
          <span>${label}</span>
          <strong>${value}</strong>
          <p>${note}</p>
        </article>
      `
    )
    .join("");
}

renderPhotos();
renderFavorites();
renderAreaSummary();
renderDashboard();
