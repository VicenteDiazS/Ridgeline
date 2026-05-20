const roadsidePlans = {
  flat: {
    kicker: "Flat tire or wheel work",
    title: "Open jack points, pressure, and torque",
    summary: "Use the truck placard and the closest jack point, then keep torque and pressure values visible before moving.",
    steps: [
      "Park safely, set the brake, and confirm the tire/wheel position.",
      "Open the jack map before lifting and use the point closest to the flat tire.",
      "After wheel work, torque wheel nuts to 94 lb-ft in a star pattern and recheck."
    ],
    reference: "Reference: tire card, jack map, door placard.",
    primary: { label: "Tire Card", href: "#tires" },
    secondary: { label: "Jack Map", href: "index.html?system=jack-points#viewer" }
  },
  start: {
    kicker: "No start or weak battery",
    title: "Capture power symptoms before chasing fuses",
    summary: "Separate no-crank, slow-crank, and normal-crank/no-start before jumping into deeper references.",
    steps: [
      "Note whether the starter is silent, slow, or cranking normally.",
      "Open the no-start flow, then use jump notes only if the truck is safe to inspect.",
      "Save a Garage note if the issue follows battery work, fuse work, or repeat short trips."
    ],
    reference: "Reference: no-start flow, battery/jump card, Garage notes.",
    primary: { label: "No-Start Flow", href: "diagnostics.html#no-start-workflow" },
    secondary: { label: "Jump Notes", href: "hood.html#wiring" }
  },
  warning: {
    kicker: "Warning light or MID message",
    title: "Record exact wording before guessing",
    summary: "Color, wording, multiple lights, and recent service context matter more than memory after the light goes away.",
    steps: [
      "Write the exact indicator or MID message and whether it is red or amber.",
      "Check whether multiple systems lit up after battery, fuse, tire, or service work.",
      "Open the warning-light flow and save the structured note before clearing context."
    ],
    reference: "Reference: warning-light flow, emergency card, Garage warning note.",
    primary: { label: "Warning Flow", href: "diagnostics.html#warning-light-workflow" },
    secondary: { label: "Save Warning Note", href: "garage.html#warning-light-template" }
  },
  trailer: {
    kicker: "Trailer light or tow setup",
    title: "Confirm hookup, pinout, and symptom side",
    summary: "Keep the 7-way pinout visible while checking whether the truck, adapter, or trailer side changed.",
    steps: [
      "Confirm coupler, hitch pin, chains, and wiring are connected before moving.",
      "Test running lights, both turns, brake lights, and reverse lights in place.",
      "Use the trailer-light flow if one side, one function, or every trailer light fails."
    ],
    reference: "Reference: towing card, 7-way pinout, trailer-light flow.",
    primary: { label: "Tow Card", href: "#towing" },
    secondary: { label: "Trailer Flow", href: "diagnostics.html#trailer-light-workflow" }
  }
};

function buildHandoff(plan) {
  return [
    `Ridgeline roadside: ${plan.kicker}`,
    plan.title,
    ...plan.steps.map((step, index) => `${index + 1}. ${step}`),
    plan.reference
  ].join("\n");
}

function setStatus(root, message) {
  const status = root.querySelector("[data-roadside-status]");
  if (status) {
    status.textContent = message;
  }
}

function updateRoadsidePlan(root, key) {
  const plan = roadsidePlans[key] || roadsidePlans.flat;
  root.dataset.currentRoadsidePlan = key;
  root.querySelector("[data-roadside-kicker]").textContent = plan.kicker;
  root.querySelector("[data-roadside-title]").textContent = plan.title;
  root.querySelector("[data-roadside-summary]").textContent = plan.summary;
  root.querySelector("[data-roadside-reference]").textContent = plan.reference;

  const steps = root.querySelector("[data-roadside-steps]");
  steps.innerHTML = plan.steps.map((step) => `<li>${step}</li>`).join("");

  const primary = root.querySelector("[data-roadside-primary]");
  const secondary = root.querySelector("[data-roadside-secondary]");
  primary.textContent = plan.primary.label;
  primary.setAttribute("href", plan.primary.href);
  secondary.textContent = plan.secondary.label;
  secondary.setAttribute("href", plan.secondary.href);

  root.querySelectorAll("[data-roadside-plan]").forEach((button) => {
    const isActive = button.dataset.roadsidePlan === key;
    button.classList.toggle("utility-link-strong", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  setStatus(root, `${plan.kicker} handoff ready.`);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

function initRoadsideStack() {
  const root = document.querySelector("[data-roadside-stack]");
  if (!root) {
    return;
  }

  root.querySelectorAll("[data-roadside-plan]").forEach((button) => {
    button.addEventListener("click", () => updateRoadsidePlan(root, button.dataset.roadsidePlan));
  });

  root.querySelector("[data-copy-roadside-stack]")?.addEventListener("click", async () => {
    const plan = roadsidePlans[root.dataset.currentRoadsidePlan] || roadsidePlans.flat;
    try {
      const copied = await copyText(buildHandoff(plan));
      setStatus(root, copied ? "Roadside handoff copied." : "Copy is unavailable in this browser.");
    } catch (error) {
      setStatus(root, "Copy failed. Select and copy the visible steps instead.");
    }
  });

  root.querySelector("[data-share-roadside-stack]")?.addEventListener("click", async () => {
    const plan = roadsidePlans[root.dataset.currentRoadsidePlan] || roadsidePlans.flat;
    const text = buildHandoff(plan);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ridgeline roadside handoff", text });
        setStatus(root, "Roadside handoff shared.");
        return;
      }
      const copied = await copyText(text);
      setStatus(root, copied ? "Share unavailable; handoff copied instead." : "Share is unavailable in this browser.");
    } catch (error) {
      setStatus(root, "Share canceled or unavailable.");
    }
  });

  updateRoadsidePlan(root, "flat");
}

initRoadsideStack();
