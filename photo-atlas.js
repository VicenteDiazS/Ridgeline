import { STORAGE, initGarageCloudSync, loadAreaJournal, loadJson, resolvePhotoSrc, saveJson } from "./garage-data.js";

const atlasCards = [...document.querySelectorAll("[data-atlas-area]")];
const countLabels = [...document.querySelectorAll("[data-photo-plan-count]")];
const mission = document.querySelector("[data-photo-mission]");
const missionTitle = document.querySelector("[data-photo-mission-title]");
const missionSummary = document.querySelector("[data-photo-mission-summary]");
const missionList = document.querySelector("[data-photo-mission-list]");
const missionStatus = document.querySelector("[data-photo-mission-status]");
const missionButtons = {
  copy: document.querySelector("[data-photo-copy-missing]"),
  share: document.querySelector("[data-photo-share-missing]"),
  save: document.querySelector("[data-photo-save-missing]")
};

const photoPlan = [
  {
    area: "hood",
    label: "Hood",
    route: "hood.html#area-journal",
    missing: "Fuse covers, battery label, jump points"
  },
  {
    area: "cabin",
    label: "Cabin",
    route: "cabin.html#area-journal",
    missing: "Driver-left fuse panel and outlet labels"
  },
  {
    area: "cargo",
    label: "Cargo",
    route: "cargo.html#area-journal",
    missing: "Trunk layout, tie-downs, repeat loadouts"
  },
  {
    area: "rear-hitch",
    label: "Hitch",
    route: "rear-hitch.html#area-journal",
    missing: "Connector, adapter, hitch label, tester result"
  }
];

const counts = Object.fromEntries(photoPlan.map((item) => [item.area, 0]));

function updatePlanCount(area, count) {
  const label = countLabels.find((item) => item.dataset.photoPlanCount === area);

  if (!label) {
    return;
  }

  label.textContent = count === 1 ? "1 photo saved." : `${count} photos saved.`;
}

function getMissingAreas() {
  return photoPlan.filter((item) => !counts[item.area]);
}

function buildMissingPlanText() {
  const missing = getMissingAreas();
  const completeCount = photoPlan.length - missing.length;
  const lines = [
    "Ridgeline Photo Capture Plan",
    `Complete: ${completeCount}/${photoPlan.length} areas have saved photos.`,
    ""
  ];

  if (!missing.length) {
    lines.push("All four area-photo groups have at least one saved photo.");
    lines.push("Review Photo Atlas: photo-atlas.html");
    return lines.join("\n");
  }

  lines.push("Missing area photos:");
  missing.forEach((item) => {
    lines.push(`- ${item.label}: ${item.missing} (${item.route})`);
  });
  lines.push("");
  lines.push("Note: this checklist only routes to existing area journals and saved local photo metadata.");
  return lines.join("\n");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  return copied;
}

function setMissionStatus(message) {
  if (missionStatus) {
    missionStatus.textContent = message;
  }
}

function saveMissingPlanNote() {
  const notes = loadJson(STORAGE.notes, {});
  const existing = notes.general_notes || "";
  const stamp = new Date().toLocaleString();
  const text = buildMissingPlanText();
  notes.general_notes = [`Photo Capture Plan - ${stamp}`, text, "", existing].filter(Boolean).join("\n");
  saveJson(STORAGE.notes, notes);
  window.dispatchEvent(new CustomEvent("ridgeline:garage-note-saved", { detail: { source: "photo-atlas" } }));
  setMissionStatus("Saved the photo capture plan into Garage Notes.");
}

function updateMission() {
  if (!mission || !missionList || !missionTitle || !missionSummary) {
    return;
  }

  const missing = getMissingAreas();
  const completeCount = photoPlan.length - missing.length;
  missionTitle.textContent = missing.length
    ? `${missing.length} photo groups still need a first shot`
    : "All four photo groups have a first shot";
  missionSummary.textContent = missing.length
    ? `Saved on this iPhone: ${completeCount}/${photoPlan.length}. Capture the missing groups before the next service or tow day.`
    : "The Photo Atlas has at least one saved photo for hood, cabin, cargo, and hitch.";
  missionList.innerHTML = photoPlan
    .map((item) => {
      const count = counts[item.area] || 0;
      const done = count > 0;
      return `
        <li class="${done ? "is-complete" : "is-missing"}">
          <span>${done ? "Saved" : "Needed"}</span>
          <a href="${item.route}">${item.label}</a>
          <small>${done ? `${count} saved photo${count === 1 ? "" : "s"}` : item.missing}</small>
        </li>
      `;
    })
    .join("");
  missionButtons.copy.disabled = false;
  missionButtons.share.disabled = false;
  missionButtons.save.disabled = false;
}

Object.values(missionButtons).forEach((button) => {
  if (button) {
    button.disabled = true;
  }
});

atlasCards.forEach(async (card) => {
  const area = card.dataset.atlasArea;
  const journalHref = card.dataset.atlasJournal;
  const grid = card.querySelector("[data-atlas-grid]");
  if (!grid) {
    return;
  }

  const journal = loadAreaJournal(area);
  counts[area] = journal.photos.length;
  updatePlanCount(area, journal.photos.length);
  updateMission();
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

missionButtons.copy?.addEventListener("click", async () => {
  try {
    await copyText(buildMissingPlanText());
    setMissionStatus("Copied the missing-photo checklist.");
  } catch {
    setMissionStatus("Copy was blocked. Select and copy from the page instead.");
  }
});

missionButtons.share?.addEventListener("click", async () => {
  const text = buildMissingPlanText();
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Ridgeline Photo Capture Plan",
        text
      });
      setMissionStatus("Shared the photo capture plan.");
      return;
    } catch (error) {
      if (error?.name === "AbortError") {
        setMissionStatus("Share canceled.");
        return;
      }
    }
  }

  try {
    await copyText(text);
    setMissionStatus("Share is unavailable here, so the plan was copied.");
  } catch {
    setMissionStatus("Share is unavailable in this browser.");
  }
});

missionButtons.save?.addEventListener("click", saveMissingPlanNote);

initGarageCloudSync();
