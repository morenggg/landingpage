/**
 * DartGolf – Debugpanel
 *
 * Standardmäßig geschlossen. Aktivierung über `?debug=true` oder Shift + D.
 * Zeigt technische Details, die normale Nutzer nicht sehen sollen.
 *
 * Sensible Werte (Tokens, Passwörter, E-Mail-Adressen …) werden maskiert –
 * sowohl hier als auch überall, wo Rohereignisse angezeigt werden.
 */

import { el, qs, replaceChildren, setHidden, setText } from './dom.js';
import { APP_VERSION, DEBUG, SENSITIVE_KEYS } from '../config.js';

/** Maximale Länge einer angezeigten Zeichenkette. */
const MAX_STRING = 400;

/**
 * Ersetzt sensible Werte rekursiv durch "***".
 * @param {unknown} value
 * @param {number} [depth]
 * @returns {unknown}
 */
export function maskValue(value, depth = 0) {
  if (depth > 6) return '[…]';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  }
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.slice(0, 30).map((item) => maskValue(item, depth + 1));
  }

  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    const lower = key.toLowerCase();
    const sensitive = SENSITIVE_KEYS.some((needle) => lower.includes(needle.toLowerCase()));
    result[key] = sensitive ? '***' : maskValue(entry, depth + 1);
  }
  return result;
}

/**
 * Maskiert einen Wert und gibt ihn als lesbaren Text zurück.
 * @param {unknown} value
 * @returns {string}
 */
export function maskSensitive(value) {
  try {
    if (typeof value === 'string') {
      // Strings können JSON sein – dann ebenfalls maskieren.
      const trimmed = value.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return JSON.stringify(maskValue(JSON.parse(trimmed)), null, 2);
        } catch {
          return trimmed.length > MAX_STRING ? `${trimmed.slice(0, MAX_STRING)}…` : trimmed;
        }
      }
      return trimmed.length > MAX_STRING ? `${trimmed.slice(0, MAX_STRING)}…` : trimmed;
    }
    return JSON.stringify(maskValue(value), null, 2);
  } catch {
    return '(nicht darstellbar)';
  }
}

/** Ringpuffer der zuletzt empfangenen Rohereignisse. */
const rawEvents = [];

/**
 * Merkt sich ein Rohereignis für die Anzeige.
 * @param {unknown} raw
 */
export function recordRawEvent(raw) {
  rawEvents.unshift({ at: Date.now(), raw });
  if (rawEvents.length > DEBUG.rawEventBufferSize) rawEvents.pop();
}

let visible = false;
let updateTimer = null;
/** @type {() => Object} */
let snapshotProvider = () => ({});

/**
 * Richtet das Panel ein.
 * @param {() => Object} getSnapshot liefert die anzuzeigenden Werte
 */
export function initDebugPanel(getSnapshot) {
  snapshotProvider = getSnapshot;

  const closeButton = qs('#btn-debug-close');
  if (closeButton) closeButton.addEventListener('click', () => setDebugVisible(false));

  // Freischaltung über die Adresszeile.
  const params = new URLSearchParams(location.search);
  if (params.get(DEBUG.queryFlag) === 'true') setDebugVisible(true);
}

/** Blendet das Panel ein oder aus. */
export function setDebugVisible(next) {
  visible = next;
  setHidden(qs('#debug-panel'), !visible);
  if (visible) {
    renderDebug();
    if (!updateTimer) updateTimer = setInterval(renderDebug, 250);
  } else if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
}

/** @returns {boolean} */
export function isDebugVisible() {
  return visible;
}

/** Schaltet das Panel um. */
export function toggleDebug() {
  setDebugVisible(!visible);
}

/** Zeichnet den Inhalt des Panels. */
function renderDebug() {
  const body = qs('#debug-body');
  if (!body) return;

  const snapshot = snapshotProvider() || {};
  const lines = [
    ['Version', APP_VERSION],
    ['Provider', snapshot.providerName || '–'],
    ['Verbindung', snapshot.connection || '–'],
    ['Detail', snapshot.connectionDetail || '–'],
    ['Phase', snapshot.phase || '–'],
    ['Pause', snapshot.paused ? 'ja' : 'nein'],
    ['FPS', snapshot.fps !== undefined ? String(snapshot.fps) : '–'],
    ['Bahn', snapshot.course || '–'],
    ['Spieler', snapshot.player || '–'],
    ['Ball x/y', snapshot.ball ? `${snapshot.ball.x} / ${snapshot.ball.y}` : '–'],
    ['Ballgeschw.', snapshot.ball ? String(snapshot.ball.speed) : '–'],
    ['Queue', String(snapshot.queueLength ?? 0)],
    ['Verworfen', snapshot.rejected
      ? `dup ${snapshot.rejected.duplicate} · cd ${snapshot.rejected.cooldown} · roll ${snapshot.rejected.ballMoving}`
      : '–'],
    ['Ton', snapshot.sound || '–'],
    ['Online', navigator.onLine ? 'ja' : 'nein'],
    ['Letzter Fehler', snapshot.lastError || '–'],
  ];

  const list = el('dl', {}, lines.map(([label, value]) => el('div', { class: 'debug-line' }, [
    el('dt', { text: label }),
    el('dd', { text: value }),
  ])));

  const lastThrowBox = el('div', { class: 'field-group' }, [
    el('h3', { text: 'Letztes normalisiertes Ereignis' }),
    el('pre', {
      class: 'code-box',
      text: snapshot.lastThrow ? maskSensitive(stripRaw(snapshot.lastThrow)) : '–',
    }),
  ]);

  const rawBox = el('div', { class: 'field-group' }, [
    el('h3', { text: 'Letztes Rohereignis' }),
    el('pre', {
      class: 'code-box',
      text: rawEvents.length > 0 ? maskSensitive(rawEvents[0].raw) : '–',
    }),
  ]);

  const shotBox = el('div', { class: 'field-group' }, [
    el('h3', { text: 'Letzter Schlag' }),
    el('pre', { class: 'code-box', text: snapshot.lastShot ? maskSensitive(snapshot.lastShot) : '–' }),
  ]);

  replaceChildren(body, [list, lastThrowBox, rawBox, shotBox]);
}

/** Entfernt das Rohereignis aus einem DartThrow (wird separat angezeigt). */
function stripRaw(dartThrow) {
  const { raw, ...rest } = dartThrow;
  return rest;
}

/**
 * Setzt einen Text in eine Debug-Zeile (für Tests nutzbar).
 * @param {string} selector
 * @param {string} value
 */
export function setDebugText(selector, value) {
  setText(qs(selector), value);
}
