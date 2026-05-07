import { initGarageCloudSync, loadAreaJournal, resolvePhotoSrc } from "./garage-data.js";

const atlasCards = [...document.querySelectorAll("[data-atlas-area]")];

atlasCards.forEach(async (card) => {
  const area = card.dataset.atlasArea;
  const grid = card.querySelector("[data-atlas-grid]");
  if (!grid) {
    return;
  }

  const journal = loadAreaJournal(area);
  grid.innerHTML = "";

  if (!journal.photos.length) {
    const empty = document.createElement("p");
    empty.className = "small-note";
    empty.textContent = "No area photos added yet. Upload them from the matching section journal.";
    grid.appendChild(empty);
    return;
  }

  for (const photo of journal.photos) {
    const resolvedSrc = await resolvePhotoSrc(photo);
    const cardEl = document.createElement("figure");
    cardEl.className = "photo-card";
    cardEl.innerHTML = `
      <img src="${resolvedSrc || photo.src || ""}" alt="${photo.label}" />
      <figcaption>
        <strong>${photo.label}</strong>
      </figcaption>
    `;
    grid.appendChild(cardEl);
  }
});

initGarageCloudSync();
