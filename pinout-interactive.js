const detail = document.querySelector("[data-pinout-detail]");
const pins = [...document.querySelectorAll("[data-pin]")];
const handoff = document.querySelector("[data-pinout-handoff]");
const choices = [...document.querySelectorAll("[data-pinout-choice]")];
const copyButton = document.querySelector("[data-copy-pinout-handoff]");
const shareButton = document.querySelector("[data-share-pinout-handoff]");
let selectedPinKey = "center";

const pinData = {
  center: {
    title: "Center Pin",
    functionLabel: "Reverse lights",
    copy: "Reverse light circuit for backup lamps or a reverse-lockout feed on trailers that use it."
  },
  aux: {
    title: "1:00 Pin",
    functionLabel: "12V auxiliary power",
    copy: "12V auxiliary power feed, commonly used for trailer battery charge or accessory power."
  },
  right: {
    title: "3:00 Pin",
    functionLabel: "Right turn / brake",
    copy: "Right turn signal and right brake-light circuit."
  },
  brake: {
    title: "5:00 Pin",
    functionLabel: "Electric brake output",
    copy: "Electric trailer brake output from the brake controller circuit."
  },
  ground: {
    title: "7:00 Pin",
    functionLabel: "Ground",
    copy: "Main ground return path for the trailer harness."
  },
  left: {
    title: "9:00 Pin",
    functionLabel: "Left turn / brake",
    copy: "Left turn signal and left brake-light circuit."
  },
  running: {
    title: "11:00 Pin",
    functionLabel: "Running lights",
    copy: "Running lights, marker lights, tail lamps, and clearance light feed."
  }
};

function setStatus(message) {
  const status = handoff?.querySelector("[data-pinout-handoff-status]");
  if (status) {
    status.textContent = message;
  }
}

function buildPinoutHandoff(pinKey = selectedPinKey) {
  const pin = pinData[pinKey] || pinData.center;
  return [
    `Ridgeline trailer pin handoff: ${pin.title}`,
    `Function: ${pin.functionLabel}`,
    `Use: ${pin.copy}`,
    "Next: confirm the truck socket is the mirror image, then check the adapter or trailer side before pulling fuses.",
    "Route: rear-hitch.html#pinout and diagnostics.html#trailer-light-workflow.",
    "Source rule: truck labels, owner manual, connector condition, and current roadside conditions remain final authority."
  ].join("\n");
}

function copyTextFallback(value = "") {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    return true;
  } catch (error) {
    return false;
  } finally {
    textarea.remove();
  }
}

async function copyText(value = "") {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (error) {
      return copyTextFallback(value);
    }
  }
  return copyTextFallback(value);
}

function renderPin(pinKey, statusMessage = "") {
  const pin = pinData[pinKey];
  if (!pin) {
    return;
  }
  selectedPinKey = pinKey;

  if (detail) {
    detail.innerHTML = `
      <p class="eyebrow">Interactive Pinout</p>
      <h4>${pin.title}</h4>
      <p>${pin.copy}</p>
    `;
  }

  handoff?.querySelector("[data-pinout-handoff-title]")?.replaceChildren(document.createTextNode(`${pin.title} / ${pin.functionLabel}`));
  handoff?.querySelector("[data-pinout-handoff-copy]")?.replaceChildren(document.createTextNode(pin.copy));

  pins.forEach((node) => node.classList.toggle("is-active", node.dataset.pin === pinKey));
  choices.forEach((button) => {
    const isActive = button.dataset.pinoutChoice === pinKey;
    button.classList.toggle("utility-link-strong", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  if (statusMessage) {
    setStatus(statusMessage);
  }
}

pins.forEach((pin) => {
  pin.addEventListener("click", () => {
    renderPin(pin.dataset.pin, "Pin selected. Copy or share the handoff before testing.");
  });
});

choices.forEach((button) => {
  button.addEventListener("click", () => {
    renderPin(button.dataset.pinoutChoice, "Function selected. Copy or share the handoff before testing.");
  });
});

copyButton?.addEventListener("click", async () => {
  setStatus("Selected trailer pin handoff copied. Verify connector condition and truck labels before testing.");
  const copied = await copyText(buildPinoutHandoff());
  if (!copied) {
    setStatus("Copy is unavailable in this browser.");
  }
});

shareButton?.addEventListener("click", async () => {
  const text = buildPinoutHandoff();
  try {
    if (navigator.share) {
      await navigator.share({ title: "Ridgeline trailer pin handoff", text });
      setStatus("Selected trailer pin handoff shared.");
      return;
    }
    const copied = await copyText(text);
    setStatus(copied ? "Share unavailable, so the selected trailer pin handoff was copied." : "Share and copy are unavailable in this browser.");
  } catch (error) {
    setStatus("Share canceled or unavailable.");
  }
});

renderPin(selectedPinKey);
