const viewer = document.querySelector("[data-ridgeline-ar-viewer]");
const cameraButtons = [...document.querySelectorAll("[data-ar-camera]")];
const measureToggle = document.querySelector("[data-ar-measure-toggle]");
const measurePanel = document.querySelector("[data-ar-measure-panel]");
const measureLength = document.querySelector("[data-ar-measure-length]");
const measureWidth = document.querySelector("[data-ar-measure-width]");
const measureHeight = document.querySelector("[data-ar-measure-height]");
const measureNote = document.querySelector("[data-ar-measure-note]");
const measureFocusButtons = [...document.querySelectorAll("[data-ar-measure-focus]")];
const arLaunchButton = document.querySelector("[data-ar-launch]");
const clearArrowsButton = document.querySelector("[data-ar-clear-arrows]");
let measureModeEnabled = false;
let restoringAfterAr = false;
const visibleArrowKeys = new Set();
const embeddedModelSrc = viewer?.getAttribute("src") || "";
const arModelSrc = viewer?.dataset.arSource || embeddedModelSrc;
const arrowMaterialNames = {
  length: "measure_arrow_height_material",
  width: "measure_arrow_width_material",
  height: "measure_arrow_length_material"
};
const arrowColors = {
  length: [0.4745, 0.8314, 1.0],
  width: [1.0, 0.5686, 0.3686],
  height: [0.7451, 0.8275, 0.9098]
};
const truckDimensionsInches = {
  length: 210.0,
  width: 78.6,
  height: 70.2
};
const arrowMaterials = {};

const cameraViews = {
  exterior: {
    orbit: "-34deg 68deg 115%",
    target: "0m 0.75m 0m",
    fov: "30deg"
  },
  cabin: {
    orbit: "-58deg 68deg 28%",
    target: "0.05m 1.05m 0.18m",
    fov: "18deg"
  },
  front: {
    orbit: "8deg 72deg 34%",
    target: "0.9m 0.85m 0m",
    fov: "16deg"
  },
  bed: {
    orbit: "148deg 62deg 38%",
    target: "-0.9m 0.88m 0m",
    fov: "18deg"
  },
  length: {
    orbit: "90deg 88deg 140%",
    target: "0m 0.85m 0m",
    fov: "14deg"
  },
  width: {
    orbit: "0deg 88deg 120%",
    target: "0m 0.85m 0m",
    fov: "15deg"
  },
  height: {
    orbit: "-34deg 56deg 118%",
    target: "0m 0.95m 0m",
    fov: "18deg"
  }
};

function tokenIncludes(token, terms) {
  return terms.some((term) => token.includes(term));
}

function setPbr(material, color, metallic, roughness) {
  const pbr = material?.pbrMetallicRoughness;
  if (!pbr) {
    return;
  }

  pbr.setBaseColorFactor?.(color);
  pbr.setMetallicFactor?.(metallic);
  pbr.setRoughnessFactor?.(roughness);
}

function tuneMaterial(material) {
  const token = `${material?.name || ""}`.toLowerCase();

  if (token.includes("measure_arrow")) {
    const key = token.includes("length") ? "length" : token.includes("width") ? "width" : "height";
    const color = arrowColors[key];
    material.setAlphaMode?.("BLEND");
    material.setDoubleSided?.(true);
    setPbr(material, [...color, 0], 0.08, 0.34);
    return;
  }

  if (tokenIncludes(token, ["glass", "window", "windshield"])) {
    material.setAlphaMode?.("BLEND");
    material.setDoubleSided?.(true);
    setPbr(material, [0.08, 0.11, 0.13, 0.36], 0, 0.22);
    return;
  }

  if (tokenIncludes(token, ["tire", "tyre", "rubber"])) {
    setPbr(material, [0.015, 0.017, 0.02, 1], 0.02, 0.96);
    return;
  }

  if (tokenIncludes(token, ["trim", "grill", "grille", "bumper", "plastic", "cladding", "flare", "guard", "rocker", "pillar"])) {
    setPbr(material, [0.005, 0.006, 0.008, 1], 0.02, 0.92);
    return;
  }

  if (tokenIncludes(token, ["wheel", "rim", "alloy", "hpd"])) {
    setPbr(material, [0.42, 0.25, 0.16, 1], 0.88, 0.36);
    return;
  }

  if (tokenIncludes(token, ["logo", "badge", "emblem"])) {
    setPbr(material, [0.01, 0.012, 0.014, 1], 0.18, 0.68);
    return;
  }

  if (tokenIncludes(token, ["light", "lamp", "head", "tail", "fog"])) {
    setPbr(material, [0.42, 0.47, 0.5, 0.88], 0.04, 0.22);
    return;
  }

  setPbr(material, [0.2, 0.22, 0.24, 1], 0.38, 0.58);
}

function applyCameraView(key) {
  const view = cameraViews[key];
  if (!viewer || !view) {
    return;
  }

  viewer.autoRotate = false;
  viewer.cameraOrbit = view.orbit;
  viewer.cameraTarget = view.target;
  viewer.fieldOfView = view.fov;
  viewer.jumpCameraToGoal?.();

  cameraButtons.forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.arCamera === key ? "true" : "false");
  });
}

function formatUsDistance(inchesTotal) {
  const feet = Math.floor(inchesTotal / 12);
  const inches = Math.round((inchesTotal - feet * 12) * 10) / 10;
  return `${feet} ft ${inches.toFixed(1)} in`;
}

function cacheArrowMaterials() {
  Object.keys(arrowMaterialNames).forEach((key) => {
    arrowMaterials[key] = viewer?.model?.materials?.find((material) => material.name === arrowMaterialNames[key]) || null;
  });
}

function setArrowMaterialAlpha(key, alpha) {
  const material = arrowMaterials[key];
  const color = arrowColors[key];
  if (!material || !color) {
    return;
  }

  material.setAlphaMode?.("BLEND");
  material.setDoubleSided?.(true);
  setPbr(material, [...color, alpha], 0.08, 0.34);
}

function hideDimensionArrows() {
  visibleArrowKeys.clear();
  Object.keys(arrowMaterialNames).forEach((key) => {
    setArrowMaterialAlpha(key, 0);
  });
  updateClearButton();
}

function showDimensionArrow(key) {
  visibleArrowKeys.add(key);
  setArrowMaterialAlpha(key, 1);
  updateClearButton();
}

function getVisibleArrowKeys() {
  return [...visibleArrowKeys];
}

function restoreVisibleArrowKeys(keys) {
  hideDimensionArrows();
  keys.forEach((key) => showDimensionArrow(key));
}

function updateMeasureCards() {
  if (measureLength) {
    measureLength.textContent = formatUsDistance(truckDimensionsInches.length);
  }

  if (measureWidth) {
    measureWidth.textContent = formatUsDistance(truckDimensionsInches.width);
  }

  if (measureHeight) {
    measureHeight.textContent = formatUsDistance(truckDimensionsInches.height);
  }

  if (measureNote) {
    measureNote.textContent = "Tap dimension cards to add multiple 3D arrows, then use Clear Arrows inside the viewer when you want to reset them.";
  }
}

function updateClearButton() {
  if (!clearArrowsButton) {
    return;
  }

  const hasVisibleArrows = visibleArrowKeys.size > 0;
  clearArrowsButton.hidden = !hasVisibleArrows;
  clearArrowsButton.disabled = !hasVisibleArrows;
}

function updateArLaunchButton() {
  if (!arLaunchButton || !viewer) {
    return;
  }

  const canLaunchAr = viewer.canActivateAR !== false;
  arLaunchButton.hidden = !canLaunchAr;
  arLaunchButton.disabled = !canLaunchAr;
}

function swapViewerSource(nextSrc) {
  if (!viewer || !nextSrc || viewer.getAttribute("src") === nextSrc) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const handleLoad = () => {
      viewer.removeEventListener("load", handleLoad);
      resolve();
    };

    viewer.addEventListener("load", handleLoad, { once: true });
    viewer.setAttribute("src", nextSrc);
  });
}

async function restoreEmbeddedViewer(restoreArrowKeys = []) {
  if (!viewer || restoringAfterAr || viewer.getAttribute("src") === embeddedModelSrc) {
    if (viewer && viewer.getAttribute("src") === embeddedModelSrc && restoreArrowKeys.length) {
      restoreVisibleArrowKeys(restoreArrowKeys);
    }
    return;
  }

  restoringAfterAr = true;

  try {
    await swapViewerSource(embeddedModelSrc);
    restoreVisibleArrowKeys(restoreArrowKeys);
    updateMeasureCards();
    if (!measureModeEnabled) {
      hideDimensionArrows();
    }
  } finally {
    restoringAfterAr = false;
  }
}

async function launchArViewer() {
  if (!viewer) {
    return;
  }

  const restoreArrowKeys = getVisibleArrowKeys();
  hideDimensionArrows();

  try {
    await swapViewerSource(arModelSrc);
    await viewer.activateAR?.();
  } catch (error) {
    console.error("Unable to launch AR viewer", error);
    await restoreEmbeddedViewer(restoreArrowKeys);
  }

  const handleReturn = () => {
    if (document.visibilityState !== "visible") {
      return;
    }

    document.removeEventListener("visibilitychange", handleReturn);
    window.removeEventListener("pageshow", handleReturn);
    restoreEmbeddedViewer(restoreArrowKeys);
  };

  document.addEventListener("visibilitychange", handleReturn);
  window.addEventListener("pageshow", handleReturn, { once: true });
}

function setMeasureMode(enabled, nextCameraKey = "exterior") {
  measureModeEnabled = enabled;

  if (measureToggle) {
    measureToggle.setAttribute("aria-pressed", enabled ? "true" : "false");
  }

  if (measurePanel) {
    measurePanel.hidden = !enabled;
  }

  if (!enabled) {
    hideDimensionArrows();
    applyCameraView(nextCameraKey);
    return;
  }

  viewer.autoRotate = false;
  updateMeasureCards();
}

viewer?.addEventListener("load", () => {
  const materials = viewer.model?.materials || [];
  materials.forEach(tuneMaterial);
  cacheArrowMaterials();
  applyCameraView("exterior");
  updateMeasureCards();
  hideDimensionArrows();
  updateArLaunchButton();
});

cameraButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMeasureMode(false, button.dataset.arCamera);
  });
});

measureToggle?.addEventListener("click", () => {
  setMeasureMode(!measureModeEnabled);
});

measureFocusButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!measureModeEnabled) {
      setMeasureMode(true);
    }

    const key = button.dataset.arMeasureFocus;
    applyCameraView(key);
    showDimensionArrow(key);
  });
});

clearArrowsButton?.addEventListener("click", hideDimensionArrows);
arLaunchButton?.addEventListener("click", launchArViewer);
updateArLaunchButton();
