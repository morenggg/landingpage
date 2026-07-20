/**
 * MopedPlaner – Datenhaltung
 *
 * Architektur: Repository-API über einem austauschbaren StorageAdapter.
 * Aktuell: LocalStorageAdapter (offline-first, keine Accounts nötig).
 * Später:  SupabaseAdapter mit identischer Schnittstelle andocken –
 *          das Schema dafür ist im README dokumentiert.
 *
 * Alle Methoden sind async, damit der Wechsel auf einen Netzwerk-Adapter
 * keine Änderungen in den Views erfordert.
 */

const STORAGE_KEY = 'mopedplaner.v1';
const SCHEMA_VERSION = 1;

/* ─────────────────────────── Adapter ─────────────────────────── */

class LocalStorageAdapter {
  constructor() {
    this._cache = null;
  }

  _load() {
    if (this._cache) return this._cache;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this._cache = raw ? JSON.parse(raw) : null;
    } catch {
      this._cache = null;
    }
    if (!this._cache || typeof this._cache !== 'object') {
      this._cache = { version: SCHEMA_VERSION, vehicles: [], logs: [], tasks: [], settings: {} };
    }
    return this._cache;
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._cache));
      return true;
    } catch (e) {
      console.error('MopedPlaner: Speichern fehlgeschlagen (Speicher voll?)', e);
      return false;
    }
  }

  async getAll(collection) {
    return [...(this._load()[collection] || [])];
  }

  async put(collection, item) {
    const db = this._load();
    if (!db[collection]) db[collection] = [];
    const idx = db[collection].findIndex((x) => x.id === item.id);
    if (idx >= 0) db[collection][idx] = item;
    else db[collection].push(item);
    if (!this._save()) throw new Error('storage-full');
    return item;
  }

  async remove(collection, id) {
    const db = this._load();
    db[collection] = (db[collection] || []).filter((x) => x.id !== id);
    this._save();
  }

  async getSettings() {
    return { ...(this._load().settings || {}) };
  }

  async setSettings(patch) {
    const db = this._load();
    db.settings = { ...(db.settings || {}), ...patch };
    this._save();
    return db.settings;
  }

  async exportJSON() {
    return JSON.stringify({ ...this._load(), exportedAt: new Date().toISOString(), app: 'MopedPlaner' }, null, 2);
  }

  async importJSON(json) {
    const data = JSON.parse(json);
    if (!data || !Array.isArray(data.vehicles)) throw new Error('Ungültige Sicherungsdatei.');
    this._cache = {
      version: SCHEMA_VERSION,
      vehicles: data.vehicles || [],
      logs: data.logs || [],
      tasks: data.tasks || [],
      settings: data.settings || {},
    };
    if (!this._save()) throw new Error('storage-full');
  }
}

const adapter = new LocalStorageAdapter();

/* ─────────────────────────── Helpers ─────────────────────────── */

export function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) || 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

const now = () => new Date().toISOString();

/* ─────────────────────────── Fahrzeuge ─────────────────────────── */

export const Vehicles = {
  async all() {
    const list = await adapter.getAll('vehicles');
    return list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  },
  async get(id) {
    return (await adapter.getAll('vehicles')).find((v) => v.id === id) || null;
  },
  async create(data) {
    const vehicle = {
      id: uid(),
      name: '',
      modelId: 'sonstige',
      baujahr: '',
      farbe: '',
      rahmennummer: '',
      motornummer: '',
      motor: '',
      vergaser: '',
      zuendung: '',
      auspuff: '',
      zustand: 3,
      notizen: '',
      photo: null,
      createdAt: now(),
      updatedAt: now(),
      ...data,
    };
    return adapter.put('vehicles', vehicle);
  },
  async update(id, patch) {
    const v = await this.get(id);
    if (!v) throw new Error('Fahrzeug nicht gefunden');
    return adapter.put('vehicles', { ...v, ...patch, updatedAt: now() });
  },
  async remove(id) {
    await adapter.remove('vehicles', id);
    // Verknüpfte Daten mitlöschen
    for (const log of await Logs.byVehicle(id)) await adapter.remove('logs', log.id);
    for (const task of await Tasks.byVehicle(id)) await adapter.remove('tasks', task.id);
  },
  async touch(id) {
    const v = await this.get(id);
    if (v) await adapter.put('vehicles', { ...v, updatedAt: now() });
  },
};

/* ─────────────────────────── Fahrzeugakte (Logbuch) ─────────────────────────── */

export const LOG_TYPES = [
  { id: 'wartung', name: 'Wartung', icon: 'wrench' },
  { id: 'reparatur', name: 'Reparatur', icon: 'tools' },
  { id: 'umbau', name: 'Umbau', icon: 'upgrade' },
  { id: 'kauf', name: 'Teilekauf', icon: 'cart' },
  { id: 'notiz', name: 'Notiz', icon: 'note' },
];

export const Logs = {
  async byVehicle(vehicleId) {
    const list = await adapter.getAll('logs');
    return list
      .filter((l) => l.vehicleId === vehicleId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
  },
  async recent(limit = 5) {
    const list = await adapter.getAll('logs');
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, limit);
  },
  async create(vehicleId, data) {
    const entry = {
      id: uid(),
      vehicleId,
      type: 'wartung',
      title: '',
      date: new Date().toISOString().slice(0, 10),
      km: '',
      cost: null,
      parts: '',
      notes: '',
      createdAt: now(),
      ...data,
    };
    await Vehicles.touch(vehicleId);
    return adapter.put('logs', entry);
  },
  async update(id, patch) {
    const list = await adapter.getAll('logs');
    const entry = list.find((l) => l.id === id);
    if (!entry) throw new Error('Eintrag nicht gefunden');
    return adapter.put('logs', { ...entry, ...patch });
  },
  async remove(id) {
    await adapter.remove('logs', id);
  },
  async totalCost(vehicleId) {
    const list = await this.byVehicle(vehicleId);
    return list.reduce((sum, l) => sum + (parseFloat(l.cost) || 0), 0);
  },
};

/* ─────────────────────────── Aufgaben ─────────────────────────── */

export const Tasks = {
  async byVehicle(vehicleId) {
    const list = await adapter.getAll('tasks');
    return list
      .filter((t) => t.vehicleId === vehicleId)
      .sort((a, b) => Number(a.done) - Number(b.done) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  },
  async allOpen() {
    const list = await adapter.getAll('tasks');
    return list.filter((t) => !t.done).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  },
  async create(vehicleId, title, extra = {}) {
    const task = { id: uid(), vehicleId, title, done: false, createdAt: now(), doneAt: null, ...extra };
    return adapter.put('tasks', task);
  },
  async toggle(id) {
    const list = await adapter.getAll('tasks');
    const task = list.find((t) => t.id === id);
    if (!task) return;
    return adapter.put('tasks', { ...task, done: !task.done, doneAt: !task.done ? now() : null });
  },
  /** Fortschritt einer geführten Aufgabe setzen (0 … Anzahl Schritte). */
  async setStep(id, stepDone) {
    const list = await adapter.getAll('tasks');
    const task = list.find((t) => t.id === id);
    if (!task) return;
    const total = (task.steps || []).length;
    const sd = Math.max(0, Math.min(total, Number(stepDone) || 0));
    return adapter.put('tasks', { ...task, stepDone: sd });
  },
  async remove(id) {
    await adapter.remove('tasks', id);
  },
};

/* ─────────────────────────── Einstellungen & Backup ─────────────────────────── */

export const Settings = {
  get: () => adapter.getSettings(),
  set: (patch) => adapter.setSettings(patch),
};

export const Backup = {
  export: () => adapter.exportJSON(),
  import: (json) => adapter.importJSON(json),
};

/* ─────────────────────────── Demo-Datensatz (Entwicklungsprototyp) ───────────────────────────
 *
 * Beim allerersten Start (leere Garage, noch nie geseedet) wird ein
 * realistisches Beispiel-Fahrzeug mit einer laufenden, geführten Reparatur
 * angelegt – damit die App sofort ihren Charakter zeigt statt leer zu sein.
 * Es sind ganz normale, löschbare Daten. Nach dem Seeden merkt sich die App
 * das (settings.demoSeeded) und legt nie wieder etwas an.
 */
const DEMO_REPAIR_STEPS = [
  'Getriebeöl ablassen – Ablassschraube unten am Motor öffnen, Öl auffangen.',
  'Kupplungsdeckel abschrauben – die unterschiedlichen Schraubenlängen dokumentieren.',
  'Federschrauben über Kreuz gleichmäßig entlasten, Lamellenpaket entnehmen (Reihenfolge fotografieren).',
  'Neue Reiblamellen in Getriebeöl einlegen und mindestens 10 Minuten ziehen lassen.',
  'Paket in Originalreihenfolge einsetzen, Deckel mit neuer Dichtung montieren (M6: 8–10 Nm).',
  'Getriebeöl auffüllen, Kupplungsspiel am Hebel auf 2–3 mm einstellen, Probelauf.',
];

export async function seedDemoIfEmpty() {
  try {
    const settings = await Settings.get();
    if (settings.demoSeeded) return false;
    const existing = await Vehicles.all();
    if (existing.length) { await Settings.set({ demoSeeded: true }); return false; }

    const v = await Vehicles.create({
      name: 'Oma Ilse', modelId: 's51', baujahr: '1987', farbe: 'blau',
      motor: 'M541 · 4-Gang', vergaser: 'BVF 16N1-11', zuendung: 'Unterbrecher 6 V',
      zustand: 3, notizen: 'Beispiel-Fahrzeug zum Ausprobieren – kannst du jederzeit löschen.',
    });
    await Tasks.create(v.id, 'Kupplungslamellen wechseln', {
      repairId: 'rep-lamellen-wechseln', componentId: 'motor',
      steps: DEMO_REPAIR_STEPS, stepDone: 2, minutes: 60,
    });
    await Tasks.create(v.id, 'Bremse vorn einstellen', { componentId: 'bremsen' });

    const d = new Date(); d.setDate(d.getDate() - 8);
    await Logs.create(v.id, {
      type: 'reparatur', title: 'Vergaser gereinigt', date: d.toISOString().slice(0, 10),
      km: '8450', cost: '28', parts: 'Dichtsatz BVF', notes: 'Düsen frei, läuft wieder rund.',
    });

    await Settings.set({ demoSeeded: true });
    return true;
  } catch {
    return false;
  }
}

/* ─────────────────────────── Foto-Verkleinerung ─────────────────────────── */

/**
 * Verkleinert ein Bild auf max. 900 px Kantenlänge und liefert eine
 * kompakte JPEG-DataURL – hält den localStorage-Verbrauch klein.
 */
export function shrinkImage(file, maxSize = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Bild konnte nicht gelesen werden.'));
    };
    img.src = url;
  });
}
