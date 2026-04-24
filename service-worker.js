const CACHE_NAME = "ridgeline-console-v16";
const ASSETS = [
  "./",
  "./index.html",
  "./hood.html",
  "./cabin.html",
  "./cargo.html",
  "./rear-hitch.html",
  "./maintenance.html",
  "./diagnostics.html",
  "./garage.html",
  "./styles.css",
  "./script.js",
  "./fuse-interactive.js",
  "./shared-ui.js",
  "./search-data.js",
  "./garage.js",
  "./manifest.json",
  "./assets/ridgeline-2021/honda-ridgeline-2021.glb",
  "./assets/ridgeline-2021/textures/logo.jpg",
  "./assets/ridgeline-2021/textures/logo_hpd.jpg",
  "./assets/ridgeline-2021/textures/lamp_stripe.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
