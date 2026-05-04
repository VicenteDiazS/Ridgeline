import { nfcTargets } from "./nfc-data.js";

const targetSelect = document.getElementById("nfc-target-select");
const targetUrl = document.getElementById("nfc-target-url");
const targetTitle = document.getElementById("nfc-selected-title");
const targetPlacement = document.getElementById("nfc-selected-placement");
const targetDescription = document.getElementById("nfc-selected-description");
const targetGrid = document.getElementById("nfc-target-grid");
const supportText = document.getElementById("nfc-support-text");
const statusText = document.getElementById("nfc-status-text");
const platformNote = document.getElementById("nfc-platform-note");
const scanHelp = document.getElementById("nfc-scan-help");
const iphoneWorkflow = document.getElementById("iphone-nfc-workflow");
const scannedResult = document.getElementById("nfc-scanned-result");
const scannedLink = document.getElementById("nfc-scanned-link");
const writeButton = document.querySelector("[data-nfc-write]");
const readButton = document.querySelector("[data-nfc-read]");
const copyButton = document.querySelector("[data-nfc-copy]");
const shareButton = document.querySelector("[data-nfc-share]");

let selectedTarget = nfcTargets[0];
let activeScanController = null;

function absoluteUrl(target = selectedTarget) {
  return new URL(target.url, window.location.href).href;
}

function setStatus(message, tone = "neutral") {
  if (!statusText) {
    return;
  }
  statusText.textContent = message;
  statusText.dataset.tone = tone;
}

function webNfcSupported() {
  return "NDEFReader" in window && window.isSecureContext;
}

function isProbablyIos() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isLocalTagUrl(url) {
  try {
    const value = new URL(url);
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(value.hostname);
  } catch {
    return false;
  }
}

function browserNfcState() {
  const hasNfc = "NDEFReader" in window;
  const secure = window.isSecureContext;
  const ios = isProbablyIos();

  return {
    direct: hasNfc && secure,
    hasNfc,
    secure,
    ios
  };
}

function updateSupportState() {
  const state = browserNfcState();
  document.body?.classList.toggle("nfc-direct-ready", state.direct);
  document.body?.classList.toggle("nfc-limited-browser", !state.direct);
  document.body?.classList.toggle("nfc-ios-browser", state.ios);

  if (supportText) {
    if (state.direct) {
      supportText.textContent = "Direct NFC read/write is available here.";
    } else if (state.hasNfc && !state.secure) {
      supportText.textContent = "Direct NFC needs HTTPS. URL tags will still open normally after they are written.";
    } else if (state.ios) {
      supportText.textContent = "iPhone Safari cannot read or write NFC tags from a web page.";
    } else {
      supportText.textContent =
        "This browser does not expose direct NFC read/write. Use the URL tag workflow.";
    }
  }

  if (writeButton) {
    writeButton.disabled = false;
    writeButton.textContent = state.direct ? "Write NFC" : state.ios ? "Show iPhone Write Steps" : "Show Write Steps";
  }
  if (readButton) {
    readButton.disabled = false;
    readButton.textContent = state.direct ? "Read NFC Tag" : state.ios ? "Show iPhone Scan Steps" : "Show Scan Steps";
  }
  if (scanHelp) {
    scanHelp.textContent = state.direct
      ? "Use this to verify a written URL tag without leaving the page."
      : "On iPhone, scan the finished tag from the home screen or lock screen. Safari opens the URL tag itself.";
  }
}

function updatePlatformNote() {
  if (!platformNote) {
    return;
  }

  const url = absoluteUrl();
  const state = browserNfcState();
  if (isLocalTagUrl(url)) {
    platformNote.textContent =
      "This selected URL is local to the current device. For final truck tags, open the deployed site address on your iPhone before copying and writing tags.";
  } else if (state.direct) {
    platformNote.textContent =
      "This browser supports direct Web NFC. You can use the Write NFC and Read NFC Tag buttons directly.";
  } else if (state.ios) {
    platformNote.textContent =
      "This iPhone can still use your tags: write each one as a website URL record, then scan it normally so Safari opens the matching section.";
  } else {
    platformNote.textContent =
      "This browser cannot access NFC directly. The generated URLs are still valid for NFC tags written by another app or device.";
  }
}

function showFallbackWorkflow(action) {
  const state = browserNfcState();
  const message =
    action === "read"
      ? "iPhone Safari cannot read NFC tags inside the page. Scan the finished URL tag from the iPhone home screen or lock screen instead."
      : "iPhone Safari cannot write NFC tags inside the page. Copy this URL and write it as a URL / URI record with an iPhone NFC writer app.";

  setStatus(state.ios ? message : "This browser does not expose direct NFC access. Use Copy URL or Share, then write the URL with an NFC writer app.", "warning");
  iphoneWorkflow?.scrollIntoView({ behavior: "smooth", block: "start" });
  iphoneWorkflow?.focus({ preventScroll: true });
}

function updateSelectedTarget(id = selectedTarget.id) {
  selectedTarget = nfcTargets.find((target) => target.id === id) || nfcTargets[0];
  const url = absoluteUrl(selectedTarget);

  if (targetSelect) {
    targetSelect.value = selectedTarget.id;
  }
  if (targetUrl) {
    targetUrl.value = url;
  }
  if (targetTitle) {
    targetTitle.textContent = selectedTarget.title;
  }
  if (targetPlacement) {
    targetPlacement.textContent = selectedTarget.placement;
  }
  if (targetDescription) {
    targetDescription.textContent = selectedTarget.description;
  }
  updatePlatformNote();

  targetGrid?.querySelectorAll("[data-nfc-target]").forEach((card) => {
    const active = card.dataset.nfcTarget === selectedTarget.id;
    card.classList.toggle("is-active", active);
    card.setAttribute("aria-current", active ? "true" : "false");
  });
}

function renderTargetSelect() {
  if (!targetSelect) {
    return;
  }

  targetSelect.replaceChildren();
  nfcTargets.forEach((target) => {
    const option = document.createElement("option");
    option.value = target.id;
    option.textContent = target.title;
    targetSelect.appendChild(option);
  });
}

function renderTargetCards() {
  if (!targetGrid) {
    return;
  }

  targetGrid.innerHTML = nfcTargets
    .map(
      (target) => `
        <article class="nfc-target-card" data-nfc-target="${target.id}">
          <div class="nfc-target-head">
            <span>${target.badge}</span>
            <strong>${target.title}</strong>
          </div>
          <p>${target.description}</p>
          <dl>
            <div>
              <dt>Place</dt>
              <dd>${target.placement}</dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>${target.url}</dd>
            </div>
          </dl>
          <div class="nfc-card-actions">
            <button type="button" data-nfc-select="${target.id}">Select</button>
            <a href="${target.url}">Open</a>
          </div>
        </article>
      `
    )
    .join("");
}

async function copySelectedUrl() {
  const url = absoluteUrl();
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    setStatus(
      isProbablyIos()
        ? "Copied. Paste this into an NFC writer app as a URL / URI record."
        : "Copied the NFC URL.",
      "success"
    );
    return;
  }

  targetUrl?.select();
  setStatus("URL selected. Use Copy from the browser menu.", "neutral");
}

async function shareSelectedUrl() {
  const url = absoluteUrl();
  if (!navigator.share) {
    await copySelectedUrl();
    return;
  }

  await navigator.share({
    title: selectedTarget.title,
    text: selectedTarget.description,
    url
  });
  setStatus("Shared the NFC URL.", "success");
}

async function writeSelectedTag() {
  if (!webNfcSupported()) {
    showFallbackWorkflow("write");
    return;
  }

  const url = absoluteUrl();
  try {
    const ndef = new NDEFReader();
    setStatus(`Hold a writable NFC tag near the phone for ${selectedTarget.title}.`, "neutral");
    await ndef.write({
      records: [{ recordType: "url", data: url }]
    });
    setStatus(`Wrote ${selectedTarget.title} to the NFC tag.`, "success");
  } catch (error) {
    setStatus(`NFC write failed: ${error.message || error.name || error}`, "warning");
  }
}

function decodeRecordData(record) {
  if (!record.data) {
    return "";
  }

  try {
    const view = record.data instanceof DataView ? record.data : new DataView(record.data);
    return new TextDecoder(record.encoding || "utf-8").decode(view);
  } catch {
    return "";
  }
}

function matchingTargetFromUrl(value) {
  try {
    const scanned = new URL(value, window.location.href);
    return nfcTargets.find((target) => {
      const targetUrlValue = new URL(target.url, window.location.href);
      return (
        scanned.origin === targetUrlValue.origin &&
        scanned.pathname === targetUrlValue.pathname &&
        scanned.search === targetUrlValue.search &&
        scanned.hash === targetUrlValue.hash
      );
    });
  } catch {
    return null;
  }
}

function renderScannedUrl(value) {
  if (!scannedResult || !scannedLink) {
    return;
  }

  const match = matchingTargetFromUrl(value);
  scannedResult.hidden = false;
  scannedLink.href = value;
  scannedLink.textContent = match ? `Open ${match.title}` : value;
  setStatus(match ? `Scanned ${match.title}.` : "Scanned a URL tag.", "success");
}

async function readTag() {
  if (!webNfcSupported()) {
    showFallbackWorkflow("read");
    return;
  }

  try {
    activeScanController?.abort();
    activeScanController = new AbortController();
    const ndef = new NDEFReader();
    await ndef.scan({ signal: activeScanController.signal });
    setStatus("Scan is active. Hold a tag near the phone.", "neutral");
    ndef.addEventListener("readingerror", () => {
      setStatus("The tag could not be read. Try another NDEF URL tag.", "warning");
    });
    ndef.addEventListener("reading", ({ message }) => {
      const urlRecord = [...message.records].find((record) => ["url", "absolute-url"].includes(record.recordType));
      const url = urlRecord ? decodeRecordData(urlRecord) : "";
      if (url) {
        renderScannedUrl(url);
      } else {
        setStatus("The tag was read, but it did not contain a URL record.", "warning");
      }
    });
  } catch (error) {
    setStatus(`NFC scan failed: ${error.message || error.name || error}`, "warning");
  }
}

renderTargetSelect();
renderTargetCards();
updateSupportState();
updateSelectedTarget(new URLSearchParams(window.location.search).get("target") || nfcTargets[0].id);
setStatus(
  webNfcSupported()
    ? "Choose a truck location, then write or read a tag directly from this browser."
    : "Choose a truck location, then Copy URL or Share. On iPhone, paste it into an NFC writer app as a URL / URI record.",
  "neutral"
);

targetSelect?.addEventListener("change", () => updateSelectedTarget(targetSelect.value));
copyButton?.addEventListener("click", () => copySelectedUrl().catch((error) => setStatus(error.message, "warning")));
shareButton?.addEventListener("click", () => shareSelectedUrl().catch((error) => setStatus(error.message, "warning")));
writeButton?.addEventListener("click", writeSelectedTag);
readButton?.addEventListener("click", readTag);

targetGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-nfc-select]");
  if (!button) {
    return;
  }
  updateSelectedTarget(button.dataset.nfcSelect);
  document.getElementById("tag-writer")?.scrollIntoView({ behavior: "smooth", block: "start" });
});
