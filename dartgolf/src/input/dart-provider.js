/**
 * DartGolf – Eingabe-Provider: gemeinsame Schnittstelle und Hilfsfunktionen
 *
 * Das Spiel kennt ausschließlich das Format `DartThrow`. Jede Trefferquelle
 * (Testmodus, manuelle Eingabe, Autodarts) implementiert dieselbe Schnittstelle
 * und liefert normalisierte Würfe. Dadurch ist die Spiel-Logik von jeder
 * konkreten API-Struktur unabhängig.
 *
 * Schnittstelle:
 *   name: string
 *   connect(): Promise<void>
 *   disconnect(): Promise<void>
 *   isConnected(): boolean
 *   subscribe(cb: (throwData: DartThrow) => void): () => void
 *
 * @typedef {Object} DartThrow
 * @property {string} id            Eindeutige ID des Wurfs (Duplikaterkennung)
 * @property {number} timestamp     Zeitstempel in Millisekunden
 * @property {number|null} segment  1..20, 25 (Bull) oder null bei Miss
 * @property {0|1|2|3} multiplier   0 = Miss, 1 = Single, 2 = Double, 3 = Triple
 * @property {number} score         Punktwert des Wurfs
 * @property {string} notation      Kurzschreibweise, z. B. "T20", "BULL", "MISS"
 * @property {number} [x]           Optionale normalisierte X-Koordinate (-1..1)
 * @property {number} [y]           Optionale normalisierte Y-Koordinate (-1..1)
 * @property {"test"|"autodarts"|"manual"} source
 * @property {unknown} [raw]        Rohereignis – nur für das Debug-Panel
 */

let throwCounter = 0;

/**
 * Erzeugt eine eindeutige Wurf-ID.
 * `crypto.randomUUID` wird genutzt, wenn verfügbar; sonst ein Zähler-Fallback.
 * @param {string} prefix
 * @returns {string}
 */
export function createThrowId(prefix = 'throw') {
  throwCounter += 1;
  const rand = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${throwCounter.toString().padStart(3, '0')}-${rand}`;
}

/**
 * Berechnet den Punktwert eines Treffers.
 * @param {number|null} segment
 * @param {number} multiplier
 * @returns {number}
 */
export function computeScore(segment, multiplier) {
  if (segment === null || multiplier === 0) return 0;
  if (segment === 25) return multiplier === 2 ? 50 : 25;
  return segment * multiplier;
}

/**
 * Erzeugt die Kurzschreibweise eines Treffers.
 * @param {number|null} segment
 * @param {number} multiplier
 * @returns {string}
 */
export function computeNotation(segment, multiplier) {
  if (segment === null || multiplier === 0) return 'MISS';
  if (segment === 25) return multiplier === 2 ? 'BULL' : '25';
  const prefix = multiplier === 3 ? 'T' : multiplier === 2 ? 'D' : 'S';
  return `${prefix}${segment}`;
}

/**
 * Prüft, ob eine Zahl eine verwertbare, endliche Koordinate ist.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isUsableCoordinate(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Baut ein vollständiges, validiertes DartThrow-Objekt.
 * Ungültige Kombinationen werden auf "MISS" zurückgeführt, damit das Spiel
 * niemals mit unvollständigen Daten arbeitet.
 *
 * @param {Object} input
 * @param {number|null} input.segment
 * @param {number} input.multiplier
 * @param {"test"|"autodarts"|"manual"} input.source
 * @param {number} [input.x]
 * @param {number} [input.y]
 * @param {unknown} [input.raw]
 * @param {string} [input.id]
 * @param {number} [input.timestamp]
 * @returns {DartThrow}
 */
export function createDartThrow(input) {
  let segment = input.segment;
  let multiplier = input.multiplier;

  // Segment prüfen: 1..20 oder 25 (Bull). Alles andere gilt als Miss.
  const segmentValid =
    typeof segment === 'number'
    && Number.isInteger(segment)
    && ((segment >= 1 && segment <= 20) || segment === 25);

  if (!segmentValid) segment = null;

  // Multiplikator prüfen.
  if (![0, 1, 2, 3].includes(multiplier)) multiplier = 0;
  // Das Bull kennt kein Triple.
  if (segment === 25 && multiplier === 3) multiplier = 2;
  // Ohne Segment gibt es keinen Multiplikator und umgekehrt.
  if (segment === null) multiplier = 0;
  if (multiplier === 0) segment = null;

  /** @type {DartThrow} */
  const result = {
    id: input.id || createThrowId(input.source || 'throw'),
    timestamp: typeof input.timestamp === 'number' ? input.timestamp : Date.now(),
    segment,
    multiplier: /** @type {0|1|2|3} */ (multiplier),
    score: computeScore(segment, multiplier),
    notation: computeNotation(segment, multiplier),
    source: input.source,
  };

  // Koordinaten nur übernehmen, wenn beide tatsächlich vorhanden und numerisch sind.
  if (isUsableCoordinate(input.x) && isUsableCoordinate(input.y)) {
    result.x = input.x;
    result.y = input.y;
  }

  if (input.raw !== undefined) result.raw = input.raw;

  return result;
}

/**
 * Basisklasse für Provider: übernimmt Abonnentenverwaltung und Zustand.
 * Konkrete Provider überschreiben `connect`/`disconnect`.
 */
export class BaseDartProvider {
  /** @param {string} name */
  constructor(name) {
    this.name = name;
    /** @type {Set<(t: DartThrow) => void>} */
    this._subscribers = new Set();
    /** @type {Set<(status: {state: string, detail?: string}) => void>} */
    this._statusSubscribers = new Set();
    this._connected = false;
  }

  /** @returns {Promise<void>} */
  async connect() {
    this._connected = true;
  }

  /** @returns {Promise<void>} */
  async disconnect() {
    this._connected = false;
  }

  /** @returns {boolean} */
  isConnected() {
    return this._connected;
  }

  /**
   * Abonniert eingehende Würfe.
   * @param {(t: DartThrow) => void} callback
   * @returns {() => void} Funktion zum Abbestellen
   */
  subscribe(callback) {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  /**
   * Abonniert Verbindungsstatus-Änderungen.
   * @param {(status: {state: string, detail?: string}) => void} callback
   * @returns {() => void}
   */
  subscribeStatus(callback) {
    this._statusSubscribers.add(callback);
    return () => this._statusSubscribers.delete(callback);
  }

  /**
   * Gibt einen Wurf an alle Abonnenten weiter.
   * @param {DartThrow} throwData
   * @protected
   */
  _emit(throwData) {
    for (const fn of this._subscribers) {
      try {
        fn(throwData);
      } catch (err) {
        console.error(`[DartGolf] Fehler im Abonnenten von ${this.name}:`, err);
      }
    }
  }

  /**
   * Meldet einen Statuswechsel.
   * @param {string} stateName
   * @param {string} [detail]
   * @protected
   */
  _emitStatus(stateName, detail = '') {
    for (const fn of this._statusSubscribers) {
      try {
        fn({ state: stateName, detail });
      } catch (err) {
        console.error(`[DartGolf] Fehler im Status-Abonnenten von ${this.name}:`, err);
      }
    }
  }
}
