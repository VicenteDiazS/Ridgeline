import { initGarageCloudSync, loadAreaJournal, resolvePhotoSrc } from "./garage-data.js";

const atlasCards = [...document.querySelectorAll("[data-atlas-area]")];
const countLabels = [...document.querySelectorAll("[data-photo-plan-count]")];

function updatePlanCount(area, count) {
  const label = countLabels.find((item) => item.dataset.photoPlanCount === area);

  if (!label) {
    return;
  }

  label.textContent = count === 1 ? "1 photo saved." : `${count} photos saved.`;
}

atlasCards.forEach(async (card) => {
  const area = card.dataset.atlasArea;
  const journalHref = card.dataset.atlasJournal;
  const grid = card.querySelector("[data-atlas-grid]");
  if (!grid) {
    return;
  }

  const journal = loadAreaJournal(area);
  updatePlanCount(area, journal.photos.length);
  grid.innerHTML = "";

  if (!journal.photos.length) {
    const empty = document.createElement("div");
    empty.className = "atlas-empty-state";
    empty.innerHTML = `
      <p class="small-note">No area photos added yet. Start in the matching area journal, then return here to review them.</p>
      ${journalHref ? `<a class="utility-link" href="${journalHref}">Open Area Journal</a>` : ""}
    `;
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
