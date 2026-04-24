import {
  filesToPhotoEntries,
  formPayload,
  hydrateForm,
  loadAreaJournal,
  saveAreaJournal
} from "./garage-data.js";

const areaSections = [...document.querySelectorAll("[data-area-journal]")];

function renderAreaPhotos(area, grid) {
  const journal = loadAreaJournal(area);
  grid.innerHTML = "";

  if (!journal.photos.length) {
    const empty = document.createElement("p");
    empty.className = "small-note";
    empty.textContent = "No area photos saved yet.";
    grid.appendChild(empty);
    return;
  }

  journal.photos.forEach((photo, index) => {
    const card = document.createElement("figure");
    card.className = "photo-card";
    card.innerHTML = `
      <img src="${photo.src}" alt="${photo.label}" />
      <figcaption>
        <strong>${photo.label}</strong>
        <button type="button" data-remove-area-photo="${index}">Remove</button>
      </figcaption>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll("[data-remove-area-photo]").forEach((button) => {
    button.addEventListener("click", () => {
      const journal = loadAreaJournal(area);
      journal.photos.splice(Number(button.dataset.removeAreaPhoto), 1);
      saveAreaJournal(area, journal);
      renderAreaPhotos(area, grid);
    });
  });
}

areaSections.forEach((section) => {
  const area = section.dataset.areaJournal;
  const form = section.querySelector("[data-area-form]");
  const input = section.querySelector("[data-area-photo-input]");
  const grid = section.querySelector("[data-area-photo-grid]");

  if (form) {
    hydrateForm(form, loadAreaJournal(area).notes || {});
    form.addEventListener("input", () => {
      const journal = loadAreaJournal(area);
      journal.notes = formPayload(form);
      saveAreaJournal(area, journal);
    });
  }

  if (input && grid) {
    renderAreaPhotos(area, grid);
    input.addEventListener("change", async () => {
      const files = [...input.files].slice(0, 4);
      const journal = loadAreaJournal(area);
      const additions = await filesToPhotoEntries(files);
      journal.photos = [...journal.photos, ...additions].slice(0, 8);
      saveAreaJournal(area, journal);
      renderAreaPhotos(area, grid);
      input.value = "";
    });
  }
});
