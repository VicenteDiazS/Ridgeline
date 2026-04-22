const notesForm = document.querySelector("[data-notes-form]");
const trackerForm = document.querySelector("[data-tracker-form]");
const photosInput = document.querySelector("[data-photo-input]");
const photosGrid = document.querySelector("[data-photo-grid]");
const favoritesList = document.querySelector("[data-favorites-list]");

const STORAGE = {
  notes: "ridgeline-notes",
  tracker: "ridgeline-tracker",
  photos: "ridgeline-photos",
  favorites: "ridgeline-favorites"
};

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

if (notesForm) {
  const saved = loadJson(STORAGE.notes, {});
  [...notesForm.elements].forEach((field) => {
    if (field.name && saved[field.name]) {
      field.value = saved[field.name];
    }
  });

  notesForm.addEventListener("input", () => {
    const payload = {};
    [...notesForm.elements].forEach((field) => {
      if (field.name) {
        payload[field.name] = field.value;
      }
    });
    saveJson(STORAGE.notes, payload);
  });
}

if (trackerForm) {
  const saved = loadJson(STORAGE.tracker, {});
  [...trackerForm.elements].forEach((field) => {
    if (field.name && saved[field.name]) {
      field.value = saved[field.name];
    }
  });

  trackerForm.addEventListener("input", () => {
    const payload = {};
    [...trackerForm.elements].forEach((field) => {
      if (field.name) {
        payload[field.name] = field.value;
      }
    });
    saveJson(STORAGE.tracker, payload);
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

  for (const file of files) {
    const src = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

    current.push({
      label: file.name.replace(/\.[^.]+$/, ""),
      src
    });
  }

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

renderPhotos();
renderFavorites();
