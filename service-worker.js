const CACHE_NAME = "ridgeline-console-v282";
let bypassNextNavigation = false;
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./hood.html",
  "./cabin.html",
  "./cargo.html",
  "./rear-hitch.html",
  "./maintenance.html",
  "./diagnostics.html",
  "./garage.html",
  "./engine.html",
  "./tires.html",
  "./nfc.html",
  "./nfc-landing.html",
  "./ar-lab.html",
  "./photo-atlas.html",
  "./quick-sheet.html",
  "./anton.html",
  "./styles.css",
  "./script.js",
  "./engine-viewer.js",
  "./engine-part-data.js",
  "./wheel-viewer.js",
  "./nfc.js",
  "./nfc-landing.js",
  "./nfc-data.js",
  "./fuse-interactive.js",
  "./ar-viewer.js",
  "./pinout-interactive.js",
  "./photo-atlas.js",
  "./shared-ui.js",
  "./model-gallery.js",
  "./search-data.js",
  "./garage.js",
  "./garage-data.js",
  "./maintenance.js",
  "./section-tools.js",
  "./agent-status.js",
  "./anton-console.js",
  "./manifest.json",
  "./favicon.svg",
  "./favicon-32x32.png",
  "./assets/icons/ridgeline-icon-180.png",
  "./assets/icons/ridgeline-icon-192.png",
  "./assets/icons/ridgeline-icon-512.png",
  "./vendor/three/three.module.js",
  "./vendor/three/examples/jsm/controls/OrbitControls.js",
  "./vendor/three/examples/jsm/loaders/GLTFLoader.js",
  "./vendor/three/examples/jsm/loaders/FBXLoader.js",
  "./vendor/three/examples/jsm/environments/RoomEnvironment.js",
  "./vendor/three/examples/jsm/geometries/RoundedBoxGeometry.js",
  "./vendor/three/examples/jsm/utils/BufferGeometryUtils.js",
  "./vendor/three/examples/jsm/utils/TextureUtils.js",
  "./vendor/three/examples/jsm/utils/WorkerPool.js",
  "./vendor/three/examples/jsm/curves/NURBSCurve.js",
  "./vendor/three/examples/jsm/curves/NURBSUtils.js",
  "./vendor/three/examples/jsm/libs/fflate.module.js",
  "./vendor/model-viewer/model-viewer.min.js"
];

function shouldRuntimeCache(request) {
  if (request.method !== "GET") {
    return false;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false;
  }

  return (
    url.pathname.endsWith(".glb") ||
    url.pathname.endsWith(".fbx") ||
    url.pathname.includes("/textures/")
  );
}

function shouldBypassCache(request) {
  if (request.method !== "GET") {
    return false;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false;
  }

  if (bypassNextNavigation) {
    return true;
  }

  return (
    request.cache === "reload" ||
    request.cache === "no-store" ||
    request.cache === "no-cache" ||
    url.pathname.endsWith("/agent-last-run.json") ||
    url.searchParams.has("__live") ||
    url.searchParams.has("__nocache")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "RIDGELINE_BYPASS_NEXT_NAV") {
    bypassNextNavigation = true;
    return;
  }

  if (event.data?.type === "RIDGELINE_SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (shouldBypassCache(event.request)) {
    if (bypassNextNavigation && event.request.mode === "navigate") {
      setTimeout(() => {
        bypassNextNavigation = false;
      }, 12000);
    }

    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(() =>
        caches.match(event.request, { ignoreSearch: true })
      )
    );
    return;
  }

  if (shouldRuntimeCache(event.request)) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        return response;
      });
    })
  );
});
