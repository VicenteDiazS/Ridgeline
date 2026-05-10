import { nfcTargets } from "./nfc-data.js";

const params = new URLSearchParams(window.location.search);
const targetId = params.get("target") || params.get("nfc") || "";
const target = nfcTargets.find((item) => item.id === targetId) || nfcTargets[0];

const badge = document.getElementById("nfc-landing-badge");
const category = document.getElementById("nfc-landing-category");
const title = document.getElementById("nfc-landing-title");
const description = document.getElementById("nfc-landing-description");
const primary = document.getElementById("nfc-landing-primary");
const copyButton = document.getElementById("nfc-landing-copy");
const placement = document.getElementById("nfc-landing-placement");
const placementNote = document.getElementById("nfc-landing-placement-note");
const use = document.getElementById("nfc-landing-use");
const urlText = document.getElementById("nfc-landing-url");
const notes = document.getElementById("nfc-landing-notes");
const related = document.getElementById("nfc-landing-related");

function absoluteTagUrl() {
  return new URL(target.url, window.location.href).href;
}

function renderTarget() {
  document.title = `${target.title} NFC | Ridgeline`;

  if (badge) {
    badge.textContent = target.badge;
  }
  if (category) {
    category.textContent = target.category;
  }
  if (title) {
    title.textContent = target.title;
  }
  if (description) {
    description.textContent = target.description;
  }
  if (primary) {
    primary.href = target.sectionUrl;
    primary.textContent = target.primaryActionLabel || "Open Section";
  }
  if (placement) {
    placement.textContent = target.placement;
  }
  if (placementNote) {
    placementNote.textContent = "Put the physical NFC tag where it matches the part or truck area without blocking service access.";
  }
  if (use) {
    use.textContent = target.quickUse;
  }
  if (urlText) {
    urlText.textContent = absoluteTagUrl();
  }
  if (notes) {
    notes.innerHTML = (target.details || [])
      .map((detail) => `<article><span></span><p>${detail}</p></article>`)
      .join("");
  }
  if (related) {
    related.innerHTML = (target.relatedLinks || [])
      .map((link) => `<a class="nfc-landing-related-link" href="${link.href}">${link.label}</a>`)
      .join("");
  }
}

async function copyTagUrl() {
  const url = absoluteTagUrl();
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    copyButton.textContent = "Copied";
    window.setTimeout(() => {
      copyButton.textContent = "Copy This Tag URL";
    }, 1600);
    return;
  }

  copyButton.textContent = "Copy From Address Bar";
}

renderTarget();
copyButton?.addEventListener("click", () => {
  copyTagUrl().catch(() => {
    copyButton.textContent = "Copy Failed";
  });
});
