const viewer = document.querySelector("[data-ridgeline-ar-viewer]");
const cameraButtons = [...document.querySelectorAll("[data-ar-camera]")];

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

viewer?.addEventListener("load", () => {
  const materials = viewer.model?.materials || [];
  materials.forEach(tuneMaterial);
  applyCameraView("exterior");
});

cameraButtons.forEach((button) => {
  button.addEventListener("click", () => applyCameraView(button.dataset.arCamera));
});
