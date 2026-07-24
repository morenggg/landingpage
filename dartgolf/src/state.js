/**
 * DartGolf – Zustandsverwaltung
 *
 * Enthält:
 *  - einen kleinen beobachtbaren Store für den Laufzeit-Zustand,
 *  - persistente Einstellungen und lokale Highscores über localStorage.
 *
 * Es werden ausschließlich Daten im Browser des Nutzers gespeichert.
 * Es findet keinerlei Übertragung an einen Server statt.
 */

import { STORAGE_PREFIX, DEFAULT_SETTINGS, PLAYER_COLORS, RULES } from './config.js';

/* ------------------------------------------------------------------ *
 * Beobachtbarer Laufzeit-Store
 * ------------------------------------------------------------------ */

/** Bildschirme der Anwendung. */
export const SCREEN = {
  START: 'start',
  SETUP: 'setup',
  GAME: 'game',
  HOLE_SUMMARY: 'holeSummary',
  RESULT: 'result',
  GUIDE: 'guide',
};

/** Zustände des Zugablaufs. */
export const TURN_PHASE = {
  IDLE: 'idle',                 // kein Spiel aktiv
  AWAITING_THROW: 'awaiting',   // "Bitte werfen"
  PREVIEW: 'preview',           // Richtung/Stärke werden visualisiert
  BALL_MOVING: 'moving',        // Ball rollt
  SETTLING: 'settling',         // kurze Pause nach Stillstand
  HOLE_DONE: 'holeDone',        // Bahn für diesen Spieler beendet
  PAUSED: 'paused',
  FINISHED: 'finished',
};

/** Verbindungszustände der Eingabequelle. */
export const CONNECTION_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  LOST: 'lost',
  ERROR: 'error',
};

const listeners = new Set();

/** Der gesamte Laufzeit-Zustand. Nur über `setState` verändern. */
export const state = {
  screen: SCREEN.START,
  phase: TURN_PHASE.IDLE,

  /** Aktiver Eingabe-Provider ("test" | "manual" | "autodarts"). */
  providerName: 'test',
  connection: CONNECTION_STATE.DISCONNECTED,
  connectionDetail: '',

  /** Spieler-, Bahn- und Punktdaten des laufenden Spiels (siehe scoring.js). */
  match: null,

  /** Zuletzt akzeptierter Wurf (DartThrow). */
  lastThrow: null,
  /** Zuletzt berechneter Schlag ({ angleDeg, power, mode }). */
  lastShot: null,
  /** Letzte für Menschen verständliche Fehlermeldung. */
  lastError: '',

  paused: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  debugVisible: false,
};

/**
 * Ändert den Zustand und benachrichtigt alle Abonnenten.
 * @param {Partial<typeof state>} patch
 */
export function setState(patch) {
  Object.assign(state, patch);
  for (const fn of listeners) {
    try {
      fn(state);
    } catch (err) {
      // Ein defekter Abonnent darf den Rest der App nicht anhalten.
      console.error('[DartGolf] Fehler in State-Listener:', err);
    }
  }
}

/**
 * Abonniert Zustandsänderungen.
 * @param {(s: typeof state) => void} fn
 * @returns {() => void} Funktion zum Abbestellen
 */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ------------------------------------------------------------------ *
 * Persistenz (localStorage)
 * ------------------------------------------------------------------ */

/**
 * Liest einen Wert aus localStorage. Fehler (privater Modus, volle Quota,
 * ungültiges JSON) führen niemals zu einer Ausnahme.
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @returns {T}
 */
function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/**
 * Schreibt einen Wert nach localStorage.
 * @param {string} key
 * @param {unknown} value
 * @returns {boolean} true, wenn das Speichern gelungen ist
 */
function writeStorage(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const SETTINGS_KEY = 'settings';
const PLAYERS_KEY = 'players';
const SCORES_KEY = 'highscores';
const CONNECTION_KEY = 'connection';

/**
 * Lädt die gespeicherten Einstellungen und füllt fehlende Felder mit den
 * Voreinstellungen auf (robust gegen ältere gespeicherte Stände).
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function loadSettings() {
  const stored = readStorage(SETTINGS_KEY, {});
  const merged = { ...DEFAULT_SETTINGS, ...(stored && typeof stored === 'object' ? stored : {}) };
  // Bahnanzahl gegen die erlaubten Werte prüfen.
  if (!RULES.holeCountOptions.includes(merged.holeCount)) {
    merged.holeCount = DEFAULT_SETTINGS.holeCount;
  }
  return merged;
}

/** Speichert die Einstellungen. */
export function saveSettings(settings) {
  return writeStorage(SETTINGS_KEY, settings);
}

/**
 * Lädt die zuletzt genutzte Spielerliste.
 * @returns {{name: string, color: string}[]}
 */
export function loadPlayers() {
  const stored = readStorage(PLAYERS_KEY, null);
  if (!Array.isArray(stored) || stored.length === 0) {
    return [{ name: 'Spieler 1', color: PLAYER_COLORS[0] }];
  }
  return stored
    .filter((p) => p && typeof p.name === 'string')
    .slice(0, RULES.maxPlayers)
    .map((p, i) => ({
      name: String(p.name).slice(0, 18),
      color: typeof p.color === 'string' ? p.color : PLAYER_COLORS[i % PLAYER_COLORS.length],
    }));
}

/** Speichert die Spielerliste (nur Name und Farbe – keine weiteren Daten). */
export function savePlayers(players) {
  return writeStorage(
    PLAYERS_KEY,
    players.map((p) => ({ name: p.name, color: p.color })),
  );
}

/**
 * Nicht sensible Verbindungseinstellungen (z. B. Board-ID, Transportweg).
 * Es werden bewusst keine Tokens oder Passwörter gespeichert.
 */
export function loadConnectionSettings() {
  const stored = readStorage(CONNECTION_KEY, {});
  return {
    transport: 'bridge',
    url: '',
    boardId: '',
    autoReconnect: true,
    ...(stored && typeof stored === 'object' ? stored : {}),
  };
}

/** Speichert nicht sensible Verbindungseinstellungen. */
export function saveConnectionSettings(settings) {
  // Sicherheitsnetz: alles, was nach einem Geheimnis aussieht, wird verworfen.
  const safe = {
    transport: String(settings.transport || 'bridge'),
    url: String(settings.url || ''),
    boardId: String(settings.boardId || ''),
    autoReconnect: Boolean(settings.autoReconnect),
  };
  return writeStorage(CONNECTION_KEY, safe);
}

/**
 * Lokale Bestenliste. Ein Eintrag pro abgeschlossenem Spiel.
 * @returns {{name:string, strokes:number, toPar:number, holes:number, date:string}[]}
 */
export function loadHighscores() {
  const stored = readStorage(SCORES_KEY, []);
  return Array.isArray(stored) ? stored : [];
}

/**
 * Ergänzt die Bestenliste um die Ergebnisse eines Spiels.
 * Es werden maximal 50 Einträge behalten, sortiert nach Schlägen über Par.
 */
export function addHighscores(entries) {
  const list = loadHighscores().concat(entries);
  list.sort((a, b) => a.toPar - b.toPar || a.strokes - b.strokes);
  const trimmed = list.slice(0, 50);
  writeStorage(SCORES_KEY, trimmed);
  return trimmed;
}

/** Löscht alle lokal gespeicherten DartGolf-Daten. */
export function clearAllStoredData() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    return true;
  } catch {
    return false;
  }
}
