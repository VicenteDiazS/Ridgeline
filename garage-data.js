export const STORAGE = {
  notes: "ridgeline-notes",
  tracker: "ridgeline-tracker",
  photos: "ridgeline-photos",
  favorites: "ridgeline-favorites",
  areaJournal: "ridgeline-area-journal"
};

export function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
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

export async function filesToPhotoEntries(files) {
  const entries = [];

  for (const file of files) {
    const src = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });

    entries.push({
      label: file.name.replace(/\.[^.]+$/, ""),
      src
    });
  }

  return entries;
}
