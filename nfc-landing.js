import { nfcTargets } from "./nfc-data.js";
import { STORAGE, loadJson, saveJson } from "./garage-data.js";

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
const notes = document.getElementById("nfc-landing-note-list");
const related = document.getElementById("nfc-landing-related-grid");
const scanSummary = document.getElementById("nfc-scan-summary");
const scanButtons = [...document.querySelectorAll("[data-nfc-scan-status]")];
const scanNote = document.getElementById("nfc-scan-note");
const scanPreview = document.getElementById("nfc-scan-preview");
const scanStatus = document.getElementById("nfc-scan-status");
const scanCopy = document.getElementById("nfc-scan-copy");
const scanShare = document.getElementById("nfc-scan-share");
const scanSave = document.getElementById("nfc-scan-save");

let scanState = "Checked";

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
  if (scanSummary) {
    scanSummary.textContent = `Scanned ${target.title}. Copy, share, or save a quick check note before opening ${target.primaryActionLabel || "the section"}.`;
  }
  updateScanButtons();
  updateScanPreview();
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

function timestampLabel() {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function buildScanNote() {
  const extra = `${scanNote?.value || ""}`.trim();
  return [
    `[${timestampLabel()} - NFC Tag Check]`,
    `Tag: ${target.title}`,
    `Status: ${scanState}`,
    `Placement: ${target.placement}`,
    `Open: ${target.sectionUrl}`,
    extra ? `Note: ${extra}` : "",
    "Saved from NFC landing page; tag target data was not changed."
  ].filter(Boolean).join("\n");
}

function setScanStatus(message, tone = "neutral") {
  if (!scanStatus) {
    return;
  }
  scanStatus.textContent = message;
  scanStatus.dataset.tone = tone;
}

function updateScanButtons() {
  scanButtons.forEach((button) => {
    const active = button.dataset.nfcScanStatus === scanState;
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function updateScanPreview() {
  if (!scanPreview) {
    return;
  }
  scanPreview.textContent = buildScanNote();
}

async function copyScanNote() {
  const text = buildScanNote();
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    setScanStatus("Copied the NFC scan note.", "success");
    return;
  }
  setScanStatus("Copy is blocked here. Select the preview text and copy it manually.", "warning");
}

async function shareScanNote() {
  const text = buildScanNote();
  if (navigator.share) {
    await navigator.share({
      title: `${target.title} NFC check`,
      text,
      url: target.sectionUrl
    });
    setScanStatus("Shared the NFC scan note.", "success");
    return;
  }
  await copyScanNote();
}

function saveScanNote() {
  const text = buildScanNote();
  const garageNotes = loadJson(STORAGE.notes, {});
  const existing = `${garageNotes.general_notes || ""}`.trim();
  saveJson(STORAGE.notes, {
    ...garageNotes,
    general_notes: existing ? `${text}\n\n${existing}` : text
  });
  localStorage.setItem("ridgeline-nfc-last-scan", JSON.stringify({
    target: target.id,
    title: target.title,
    status: scanState,
    savedAt: new Date().toISOString()
  }));
  window.dispatchEvent(new CustomEvent("ridgeline:garage-note-saved", { detail: { source: "nfc-landing" } }));
  setScanStatus("Saved the NFC scan note into Garage Notes.", "success");
}

scanButtons.forEach((button) => {
  button.addEventListener("click", () => {
    scanState = button.dataset.nfcScanStatus || "Checked";
    updateScanButtons();
    updateScanPreview();
  });
});

scanNote?.addEventListener("input", updateScanPreview);
scanCopy?.addEventListener("click", () => copyScanNote().catch(() => setScanStatus("Copy failed.", "warning")));
scanShare?.addEventListener("click", () => shareScanNote().catch(() => setScanStatus("Share failed.", "warning")));
scanSave?.addEventListener("click", saveScanNote);
