export const STORAGE = {
  notes: "ridgeline-notes",
  tracker: "ridgeline-tracker",
  maintenanceLog: "ridgeline-maintenance-log",
  photos: "ridgeline-photos",
  favorites: "ridgeline-favorites",
  areaJournal: "ridgeline-area-journal",
  profile: "ridgeline-truck-profile"
};

const SUPABASE = {
  url: "https://liogrqeevozzwefnketm.supabase.co",
  publishableKey: "sb_publishable_LFaNldVgRH4iXHX3U0OVUg_nE1DiHfs",
  table: "garage_kv",
  bucket: "2019 Honda Ridgeline Main",
  bucketFallback: "2019-honda-ridgeline-main",
  signedUrlTtlSeconds: 60 * 60 * 24
};

const DEVICE_ID_KEY = "ridgeline-device-id";
const REMOTE_ENABLED_KEY = "ridgeline-remote-enabled";
const REMOTE_DISABLED_UNTIL_KEY = "ridgeline-remote-disabled-until";
const GITHUB_BACKUP_ENDPOINT_KEY = "ridgeline-github-backup-endpoint";
const REMOTE_DISABLED_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const SYNCABLE_KEYS = new Set([
  STORAGE.notes,
  STORAGE.tracker,
  STORAGE.maintenanceLog,
  STORAGE.photos,
  STORAGE.favorites,
  STORAGE.areaJournal,
  STORAGE.profile
]);

const signedUrlCache = new Map();
let remoteInitPromise = null;
let remoteAvailable = false;
let remoteInitDone = false;
const pendingWrites = new Map();
let flushInFlight = false;
let githubBackupInFlight = false;
let githubBackupQueued = false;

function isRemoteEnabledForDevice() {
  return localStorage.getItem(REMOTE_ENABLED_KEY) !== "0";
}

function isRemoteTemporarilyDisabled() {
  const until = Number(localStorage.getItem(REMOTE_DISABLED_UNTIL_KEY) || 0);
  return Number.isFinite(until) && until > Date.now();
}

function setRemoteTemporarilyDisabled() {
  localStorage.setItem(
    REMOTE_DISABLED_UNTIL_KEY,
    `${Date.now() + REMOTE_DISABLED_COOLDOWN_MS}`
  );
}

function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

function supabaseHeaders(json = true) {
  const headers = {
    apikey: SUPABASE.publishableKey,
    Authorization: `Bearer ${SUPABASE.publishableKey}`
  };

  if (json) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

function encodeStoragePath(path) {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function sanitizeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function photoIdentity(photo) {
  return `${photo?.storagePath || ""}::${photo?.label || ""}::${photo?.uploadedAt || ""}`;
}

function stripPhotoLocalBackup(photo) {
  return {
    label: photo?.label || "photo",
    storagePath: photo?.storagePath || null,
    uploadedAt: photo?.uploadedAt || null
  };
}

function mergePhotoLists(localPhotos = [], remotePhotos = []) {
  const localMap = new Map(localPhotos.map((photo) => [photoIdentity(photo), photo]));
  const merged = [];
  const seen = new Set();

  remotePhotos.forEach((remotePhoto) => {
    const key = photoIdentity(remotePhoto);
    const localMatch =
      [...localMap.values()].find(
        (candidate) =>
          candidate.storagePath &&
          remotePhoto.storagePath &&
          candidate.storagePath === remotePhoto.storagePath
      ) || localMap.get(key);
    const next = {
      ...remotePhoto,
      src: localMatch?.src || remotePhoto.src || null
    };
    merged.push(next);
    seen.add(photoIdentity(next));
  });

  localPhotos.forEach((localPhoto) => {
    const key = photoIdentity(localPhoto);
    if (!seen.has(key)) {
      merged.push(localPhoto);
      seen.add(key);
    }
  });

  return merged;
}

function cloudPayloadForStorageKey(key, value) {
  if (key === STORAGE.photos && Array.isArray(value)) {
    return value.map(stripPhotoLocalBackup);
  }

  if (key === STORAGE.areaJournal && value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([area, journal]) => [
        area,
        {
          notes: journal?.notes || {},
          photos: Array.isArray(journal?.photos) ? journal.photos.map(stripPhotoLocalBackup) : []
        }
      ])
    );
  }

  return value;
}

function fallbackForStorageKey(key) {
  return key === STORAGE.notes || key === STORAGE.tracker || key === STORAGE.areaJournal || key === STORAGE.profile ? {} : [];
}

async function requestSupabase(path, options = {}) {
  return fetch(`${SUPABASE.url}/rest/v1/${path}`, {
    cache: options.cache || "no-store",
    ...options,
    headers: {
      ...supabaseHeaders(),
      ...(options.headers || {})
    }
  });
}

function getGitHubBackupEndpoint() {
  return localStorage.getItem(GITHUB_BACKUP_ENDPOINT_KEY) || "";
}

function fullBackupPayload() {
  const payload = {};
  SYNCABLE_KEYS.forEach((key) => {
    payload[key] = cloudPayloadForStorageKey(key, loadJson(key, fallbackForStorageKey(key)));
  });

  return {
    kind: "ridgeline-garage-backup",
    deviceId: getDeviceId(),
    generatedAt: new Date().toISOString(),
    payload
  };
}

export function buildGarageBackupPayload() {
  return fullBackupPayload();
}

export function restoreGarageBackupPayload(bundle, options = {}) {
  if (bundle?.kind !== "ridgeline-garage-backup") {
    return false;
  }

  return mergeBackupBundle(bundle, options);
}

function mergeBackupBundle(bundle, options = {}) {
  const payload = bundle?.payload && typeof bundle.payload === "object" ? bundle.payload : bundle;
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const rows = Object.entries(payload).map(([storage_key, value]) => ({
    storage_key,
    payload: value
  }));
  mergeRemoteRows(rows);
  if (options.notify !== false) {
    window.dispatchEvent(new CustomEvent("ridgeline:storage-hydrated"));
  }
  return true;
}

async function enqueueGitHubBackup() {
  const endpoint = getGitHubBackupEndpoint();
  if (!endpoint) {
    return false;
  }

  if (githubBackupInFlight) {
    githubBackupQueued = true;
    return true;
  }

  githubBackupInFlight = true;
  try {
    do {
      githubBackupQueued = false;
      const response = await fetch(endpoint, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(fullBackupPayload())
      });

      if (!response.ok) {
        console.warn("GitHub backup endpoint failed.", response.status);
        return false;
      }
    } while (githubBackupQueued);

    return true;
  } catch (error) {
    console.warn("GitHub backup endpoint unavailable.", error);
    return false;
  } finally {
    githubBackupInFlight = false;
  }
}

export async function refreshGitHubBackupData() {
  const endpoint = getGitHubBackupEndpoint();
  if (!endpoint) {
    return false;
  }

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache"
      }
    });

    if (!response.ok) {
      console.warn("GitHub backup read failed.", response.status);
      return false;
    }

    return mergeBackupBundle(await response.json());
  } catch (error) {
    console.warn("GitHub backup read unavailable.", error);
    return false;
  }
}

async function uploadPhotoToStorage(file, scope = "garage") {
  if (!SUPABASE.url || !SUPABASE.publishableKey || !SUPABASE.bucket) {
    return null;
  }

  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  const safeName = sanitizeFileName(file.name || `photo-${timestamp}.jpg`) || `photo-${timestamp}.jpg`;
  const storagePath = `${getDeviceId()}/${scope}/${timestamp}-${random}-${safeName}`;
  const bucketCandidates = [SUPABASE.bucket, SUPABASE.bucketFallback].filter(Boolean);

  for (const bucketName of bucketCandidates) {
    const url = `${SUPABASE.url}/storage/v1/object/${encodeURIComponent(bucketName)}/${encodeStoragePath(storagePath)}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...supabaseHeaders(false),
          "x-upsert": "true",
          "cache-control": "3600",
          "content-type": file.type || "application/octet-stream"
        },
        body: file
      });

      if (response.ok) {
        return storagePath;
      }
    } catch (error) {
      console.warn("Supabase storage upload error.", error);
    }
  }

  return null;
}

async function createSignedPhotoUrl(storagePath) {
  const cached = signedUrlCache.get(storagePath);
  const now = Date.now();
  if (cached && cached.expiresAt > now + 30_000) {
    return cached.url;
  }

  const bucketCandidates = [SUPABASE.bucket, SUPABASE.bucketFallback].filter(Boolean);
  for (const bucketName of bucketCandidates) {
    const url = `${SUPABASE.url}/storage/v1/object/sign/${encodeURIComponent(bucketName)}/${encodeStoragePath(storagePath)}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: supabaseHeaders(),
        body: JSON.stringify({ expiresIn: SUPABASE.signedUrlTtlSeconds })
      });

      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      const signedPath = payload?.signedURL || payload?.signedUrl || null;
      if (!signedPath) {
        continue;
      }

      const signedUrl = signedPath.startsWith("http")
        ? signedPath
        : `${SUPABASE.url}/storage/v1${signedPath}`;

      signedUrlCache.set(storagePath, {
        url: signedUrl,
        expiresAt: now + SUPABASE.signedUrlTtlSeconds * 1000
      });

      return signedUrl;
    } catch (error) {
      console.warn("Supabase signed URL request error.", error);
    }
  }

  return null;
}

function enqueueRemoteWrite(key, value) {
  if (!SYNCABLE_KEYS.has(key)) {
    return;
  }

  pendingWrites.set(key, cloudPayloadForStorageKey(key, value));
  flushRemoteWrites();
}

async function flushRemoteWrites() {
  if (!remoteAvailable || !pendingWrites.size || flushInFlight) {
    return;
  }

  flushInFlight = true;
  try {
    while (remoteAvailable && pendingWrites.size) {
      const deviceId = getDeviceId();
      const rows = [...pendingWrites.entries()].map(([storage_key, payload]) => ({
        device_id: deviceId,
        storage_key,
        payload,
        updated_at: new Date().toISOString()
      }));
      pendingWrites.clear();

      const response = await requestSupabase(
        `${SUPABASE.table}?on_conflict=device_id,storage_key`,
        {
          method: "POST",
          headers: {
            Prefer: "resolution=merge-duplicates,return=minimal"
          },
          body: JSON.stringify(rows)
        }
      );

      if (!response.ok) {
        console.warn("Supabase sync write failed.", response.status);
        rows.forEach((row) => pendingWrites.set(row.storage_key, row.payload));
        break;
      }
    }
  } catch (error) {
    console.warn("Supabase sync write error.", error);
  } finally {
    flushInFlight = false;
  }
}

function mergeRemoteRows(rows) {
  if (!Array.isArray(rows)) {
    return;
  }

  rows.forEach((row) => {
    if (!row || !SYNCABLE_KEYS.has(row.storage_key)) {
      return;
    }

    if (row.storage_key === STORAGE.photos) {
      const localPhotos = loadJson(STORAGE.photos, []);
      const remotePhotos = Array.isArray(row.payload) ? row.payload : [];
      localStorage.setItem(STORAGE.photos, JSON.stringify(mergePhotoLists(localPhotos, remotePhotos)));
      return;
    }

    if (row.storage_key === STORAGE.areaJournal) {
      const localArea = loadJson(STORAGE.areaJournal, {});
      const remoteArea = row.payload || {};
      const merged = {};
      const areaKeys = new Set([...Object.keys(localArea), ...Object.keys(remoteArea)]);

      areaKeys.forEach((areaKey) => {
        const localEntry = localArea[areaKey] || {};
        const remoteEntry = remoteArea[areaKey] || {};
        merged[areaKey] = {
          notes: remoteEntry.notes || localEntry.notes || {},
          photos: mergePhotoLists(localEntry.photos || [], remoteEntry.photos || [])
        };
      });

      localStorage.setItem(STORAGE.areaJournal, JSON.stringify(merged));
      return;
    }

    localStorage.setItem(row.storage_key, JSON.stringify(row.payload));
  });
}

export async function refreshGarageRemoteData(options = {}) {
  if (!SUPABASE.url || !SUPABASE.publishableKey) {
    return false;
  }

  if (options.enableRemote !== false) {
    localStorage.setItem(REMOTE_ENABLED_KEY, "1");
    localStorage.removeItem(REMOTE_DISABLED_UNTIL_KEY);
  }

  try {
    const deviceId = encodeURIComponent(getDeviceId());
    const response = await requestSupabase(
      `${SUPABASE.table}?select=storage_key,payload,updated_at&device_id=eq.${deviceId}`,
      {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache"
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        setRemoteTemporarilyDisabled();
      }
      remoteAvailable = false;
      remoteInitDone = true;
      console.warn("Supabase sync read failed.", response.status);
      return false;
    }

    mergeRemoteRows(await response.json());
    remoteAvailable = true;
    remoteInitDone = true;
    localStorage.setItem(REMOTE_ENABLED_KEY, "1");
    localStorage.removeItem(REMOTE_DISABLED_UNTIL_KEY);
    window.dispatchEvent(new CustomEvent("ridgeline:storage-hydrated"));
    flushRemoteWrites();
    enqueueGitHubBackup();
    return true;
  } catch (error) {
    remoteAvailable = false;
    remoteInitDone = true;
    console.warn("Supabase sync unavailable.", error);
    return false;
  }
}

export async function refreshGarageBackups(options = {}) {
  const githubOk = await refreshGitHubBackupData();
  const supabaseOk = await refreshGarageRemoteData(options);
  return githubOk || supabaseOk;
}

export async function initGarageCloudSync(options = {}) {
  if (remoteInitPromise) {
    return remoteInitPromise;
  }

  remoteInitPromise = (async () => {
    if (!SUPABASE.url || !SUPABASE.publishableKey) {
      remoteAvailable = false;
      remoteInitDone = true;
      return false;
    }

    if (options.enableRemote !== false && !localStorage.getItem(REMOTE_ENABLED_KEY)) {
      localStorage.setItem(REMOTE_ENABLED_KEY, "1");
    }

    if (!isRemoteEnabledForDevice()) {
      remoteAvailable = false;
      remoteInitDone = true;
      return false;
    }

    if (isRemoteTemporarilyDisabled()) {
      remoteAvailable = false;
      remoteInitDone = true;
      return false;
    }

    return refreshGarageRemoteData();
  })();

  return remoteInitPromise;
}

export function getGarageCloudState() {
  const disabledUntil = Number(localStorage.getItem(REMOTE_DISABLED_UNTIL_KEY) || 0);
  return {
    configured: Boolean(SUPABASE.url && SUPABASE.publishableKey && SUPABASE.table),
    enabled: isRemoteEnabledForDevice(),
    temporarilyDisabled: Number.isFinite(disabledUntil) && disabledUntil > Date.now(),
    disabledUntil: Number.isFinite(disabledUntil) ? disabledUntil : 0,
    githubBackupConfigured: Boolean(getGitHubBackupEndpoint())
  };
}

export function setGarageCloudEnabled(enabled) {
  if (enabled) {
    localStorage.setItem(REMOTE_ENABLED_KEY, "1");
    localStorage.removeItem(REMOTE_DISABLED_UNTIL_KEY);
  } else {
    localStorage.setItem(REMOTE_ENABLED_KEY, "0");
  }

  remoteInitPromise = null;
  remoteAvailable = false;
  remoteInitDone = false;
}

export function setGitHubBackupEndpoint(endpoint) {
  const value = `${endpoint || ""}`.trim();
  if (value) {
    localStorage.setItem(GITHUB_BACKUP_ENDPOINT_KEY, value);
  } else {
    localStorage.removeItem(GITHUB_BACKUP_ENDPOINT_KEY);
  }
}

export function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  if (!remoteInitDone) {
    initGarageCloudSync();
  }
  enqueueRemoteWrite(key, value);
  enqueueGitHubBackup();
}

export async function resolvePhotoSrc(photo) {
  if (!photo) {
    return "";
  }

  if (photo.storagePath) {
    const signed = await createSignedPhotoUrl(photo.storagePath);
    if (signed) {
      return signed;
    }
  }

  return photo.src || "";
}

export function hydrateForm(form, saved) {
  [...form.elements].forEach((field) => {
    if (field.name && saved[field.name]) {
      field.value = saved[field.name];
    }
  });
}

export function formPayload(form) {
  const payload = {};
  [...form.elements].forEach((field) => {
    if (field.name) {
      payload[field.name] = field.value;
    }
  });
  return payload;
}

export function loadAreaJournal(area) {
  const all = loadJson(STORAGE.areaJournal, {});
  return all[area] || { notes: {}, photos: [] };
}

export function saveAreaJournal(area, value) {
  const all = loadJson(STORAGE.areaJournal, {});
  all[area] = {
    notes: value.notes || {},
    photos: value.photos || []
  };
  saveJson(STORAGE.areaJournal, all);
}

export async function filesToPhotoEntries(files, options = {}) {
  const entries = [];
  const scope = options.scope || "garage";

  for (const file of files) {
    const src = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

    const storagePath = await uploadPhotoToStorage(file, scope);

    entries.push({
      label: file.name.replace(/\.[^.]+$/, ""),
      src,
      storagePath,
      uploadedAt: new Date().toISOString()
    });
  }

  return entries;
}
