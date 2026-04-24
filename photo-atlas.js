import { loadAreaJournal } from "./garage-data.js";

const atlasCards = [...document.querySelectorAll("[data-atlas-area]")];

atlasCards.forEach((card) => {
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

  journal.photos.forEach((photo) => {
    const cardEl = document.createElement("figure");
    cardEl.className = "photo-card";
    cardEl.innerHTML = `
      <img src="${photo.src}" alt="${photo.label}" />
      <figcaption>
        <strong>${photo.label}</strong>
      </figcaption>
    `;
    grid.appendChild(cardEl);
  });
});
