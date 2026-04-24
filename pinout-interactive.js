const detail = document.querySelector("[data-pinout-detail]");
const pins = [...document.querySelectorAll("[data-pin]")];

const pinData = {
  center: {
    title: "Center Pin",
    copy: "Reverse light circuit for backup lamps or a reverse-lockout feed on trailers that use it."
  },
  aux: {
    title: "1:00 Pin",
    copy: "12V auxiliary power feed, commonly used for trailer battery charge or accessory power."
  },
  right: {
    title: "3:00 Pin",
    copy: "Right turn signal and right brake-light circuit."
  },
  brake: {
    title: "5:00 Pin",
    copy: "Electric trailer brake output from the brake controller circuit."
  },
  ground: {
    title: "7:00 Pin",
    copy: "Main ground return path for the trailer harness."
  },
  left: {
    title: "9:00 Pin",
    copy: "Left turn signal and left brake-light circuit."
  },
  running: {
    title: "11:00 Pin",
    copy: "Running lights, marker lights, tail lamps, and clearance light feed."
  }
};

function renderPin(pinKey) {
  const pin = pinData[pinKey];
  if (!detail || !pin) {
    return;
  }

  detail.innerHTML = `
    <p class="eyebrow">Interactive Pinout</p>
    <h4>${pin.title}</h4>
    <p>${pin.copy}</p>
  `;
}

pins.forEach((pin) => {
  pin.addEventListener("click", () => {
    pins.forEach((node) => node.classList.remove("is-active"));
    pin.classList.add("is-active");
    renderPin(pin.dataset.pin);
  });
});

if (pins[0]) {
  pins[0].classList.add("is-active");
}
