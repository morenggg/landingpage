/**
 * DartGolf – Normalisierung von Autodarts-Ereignissen
 *
 * Aufgabe: aus einem beliebigen Rohereignis ein `DartThrow` machen –
 * oder `null`, wenn das Ereignis kein Wurf ist.
 *
 *   raw event -> validieren -> Wurf extrahieren -> normalisieren -> DartThrow
 *
 * Grundsätze:
 *  - Diese Datei rät nicht. Sie liest nur Felder, die in öffentlich
 *    einsehbaren Open-Source-Projekten nachweisbar verwendet werden
 *    (siehe AUTODARTS-INTEGRATION.md, Abschnitt "Bestätigte Ereignisfelder").
 *  - Unbekannte Ereignisse werden still ignoriert (Rückgabe `null`).
 *  - Ungültiges JSON löst keine Ausnahme aus.
 *  - Koordinaten werden nur übernommen, wenn sie tatsächlich vorhanden,
 *    numerisch und in einem plausiblen normalisierten Bereich sind.
 *
 * Bestätigte Feldpfade (aus quelloffenen Community-Projekten):
 *   turns[n].throws[m].segment.name       z. B. "T20"
 *   turns[n].throws[m].segment.number     1..20, 25
 *   turns[n].throws[m].segment.bed        z. B. "Triple", "Bull", "Outside"
 *   turns[n].throws[m].segment.multiplier 0..3
 *   turns[n].throws[m].coords.x / .y
 */

import { createDartThrow, isUsableCoordinate } from './dart-provider.js';

/**
 * Zuordnung der "bed"-Bezeichnungen zu Multiplikatoren.
 * Die Schlüssel werden in Kleinbuchstaben verglichen, damit Schreibweisen
 * verschiedener Quellen (z. B. "Triple" / "TRIPLE") gleich behandelt werden.
 */
const BED_TO_MULTIPLIER = {
  single: 1,
  singleinner: 1,
  singleouter: 1,
  inner: 1,
  outer: 1,
  double: 2,
  triple: 3,
  treble: 3,
  bull: 2,        // Bullseye (50)
  bullseye: 2,
  outerbull: 1,   // Outer Bull (25)
  singlebull: 1,
  miss: 0,
  outside: 0,
  none: 0,
};

/**
 * Grenze, bis zu der eine Koordinate als normalisiert (-1..1) gilt.
 * Die tatsächliche Skalierung der Autodarts-Koordinaten ist nicht öffentlich
 * dokumentiert. Werte außerhalb dieses Bereichs werden deshalb NICHT für das
 * Spiel verwendet – sie bleiben nur im Rohereignis sichtbar.
 */
const COORD_LIMIT = 1.5;

/**
 * Wandelt einen Wert sicher in ein Objekt um.
 * Strings werden als JSON interpretiert; ungültiges JSON ergibt `null`.
 * @param {unknown} raw
 * @returns {Record<string, any>|null}
 */
export function parseRawEvent(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text || (text[0] !== '{' && text[0] !== '[')) return null;
    try {
      const parsed = JSON.parse(text);
      return typeof parsed === 'object' && parsed !== null ? parsed : null;
    } catch {
      return null; // Ungültiges JSON wird ignoriert, nicht geworfen.
    }
  }
  if (typeof raw === 'object') return /** @type {Record<string, any>} */ (raw);
  return null;
}

/**
 * Leitet den Multiplikator aus den vorhandenen Feldern ab.
 * Reihenfolge: expliziter Multiplikator > bed-Bezeichnung > Kurzschreibweise.
 * @param {Record<string, any>} segment
 * @returns {number|null} null, wenn nichts Verwertbares gefunden wurde
 */
function extractMultiplier(segment) {
  if (typeof segment.multiplier === 'number' && Number.isFinite(segment.multiplier)) {
    const m = Math.round(segment.multiplier);
    if (m >= 0 && m <= 3) return m;
  }

  if (typeof segment.bed === 'string') {
    const key = segment.bed.toLowerCase().replace(/[\s_-]/g, '');
    if (key in BED_TO_MULTIPLIER) return BED_TO_MULTIPLIER[key];
  }

  // Kurzschreibweise wie "T20", "D5", "S18", "25", "BULL"
  if (typeof segment.name === 'string') {
    const name = segment.name.trim().toUpperCase();
    if (name === 'BULL' || name === 'BULLSEYE' || name === '50') return 2;
    if (name === '25' || name === 'OUTERBULL' || name === 'OUTER BULL') return 1;
    if (name === 'MISS' || name === 'OUTSIDE' || name === 'M') return 0;
    const match = /^([SDT])(\d{1,2})$/.exec(name);
    if (match) return { S: 1, D: 2, T: 3 }[match[1]];
  }

  return null;
}

/**
 * Leitet die Segmentnummer aus den vorhandenen Feldern ab.
 * @param {Record<string, any>} segment
 * @returns {number|null}
 */
function extractSegmentNumber(segment) {
  if (typeof segment.number === 'number' && Number.isFinite(segment.number)) {
    return Math.round(segment.number);
  }

  if (typeof segment.name === 'string') {
    const name = segment.name.trim().toUpperCase();
    if (name === 'BULL' || name === 'BULLSEYE' || name === '50' || name === '25') return 25;
    if (name === 'MISS' || name === 'OUTSIDE' || name === 'M') return null;
    const match = /^([SDT])?(\d{1,2})$/.exec(name);
    if (match) return Number(match[2]);
  }

  // Ein "bed" allein reicht für Bull-Treffer aus.
  if (typeof segment.bed === 'string') {
    const key = segment.bed.toLowerCase().replace(/[\s_-]/g, '');
    if (key === 'bull' || key === 'bullseye' || key === 'outerbull' || key === 'singlebull') {
      return 25;
    }
  }

  return null;
}

/**
 * Liest Koordinaten aus einem Wurf-Objekt.
 * @param {Record<string, any>} throwObj
 * @returns {{x:number, y:number}|null}
 */
function extractCoords(throwObj) {
  const candidates = [throwObj.coords, throwObj.coordinates, throwObj.position, throwObj];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const { x, y } = candidate;
    if (!isUsableCoordinate(x) || !isUsableCoordinate(y)) continue;
    // Nur plausibel normalisierte Werte werden für das Spiel verwendet.
    if (Math.abs(x) > COORD_LIMIT || Math.abs(y) > COORD_LIMIT) continue;
    return { x, y };
  }
  return null;
}

/**
 * Findet in einem beliebigen Ereignis das Objekt, das einen einzelnen Wurf
 * beschreibt – zusammen mit einem möglichst stabilen Kontext für die ID.
 *
 * Unterstützte Formen:
 *  1. Match-State mit `turns[].throws[]`  (Autodarts-Cloud-Format)
 *  2. Einzelner Wurf mit `segment`        (z. B. von einer Bridge normalisiert)
 *  3. Flaches Objekt mit `number`/`bed`   (einfache Board-Ereignisse)
 *
 * @param {Record<string, any>} event
 * @returns {{throwObj: Record<string, any>, idHint: string}|null}
 */
function findThrow(event) {
  // Der eigentliche Nutzinhalt steckt je nach Quelle unter `data`.
  const body = event && typeof event.data === 'object' && event.data !== null
    ? event.data
    : event;

  if (!body || typeof body !== 'object') return null;

  // Form 1: Match-State mit Zügen.
  if (Array.isArray(body.turns) && body.turns.length > 0) {
    const turnIndex = body.turns.length - 1;
    const turn = body.turns[turnIndex];
    if (turn && Array.isArray(turn.throws) && turn.throws.length > 0) {
      const throwIndex = turn.throws.length - 1;
      const throwObj = turn.throws[throwIndex];
      if (throwObj && typeof throwObj === 'object') {
        // Stabile ID: gleiche Zustandsnachricht => gleiche ID => Duplikat erkannt.
        const matchId = typeof body.id === 'string' ? body.id : 'match';
        const round = turn.round !== undefined ? turn.round : turnIndex;
        return {
          throwObj,
          idHint: `${matchId}:${round}:${turnIndex}:${throwIndex}`,
        };
      }
    }
    return null;
  }

  // Form 2: einzelner Wurf mit Segment-Objekt.
  if (body.segment && typeof body.segment === 'object') {
    return { throwObj: body, idHint: typeof body.id === 'string' ? body.id : '' };
  }

  // Form 2b: `throw`-Container.
  if (body.throw && typeof body.throw === 'object') {
    return { throwObj: body.throw, idHint: typeof body.id === 'string' ? body.id : '' };
  }

  // Form 3: flaches Ereignis mit Nummer und/oder bed.
  const hasNumber = typeof body.number === 'number';
  const hasBed = typeof body.bed === 'string';
  const hasName = typeof body.name === 'string';
  if (hasNumber || hasBed || hasName) {
    return { throwObj: { segment: body, coords: body.coords }, idHint: '' };
  }

  return null;
}

/**
 * Normalisiert ein Autodarts-Rohereignis zu einem DartThrow.
 *
 * @param {unknown} raw Rohereignis (Objekt oder JSON-String)
 * @param {Object} [options]
 * @param {boolean} [options.keepRaw=true] Rohdaten anhängen (nur Debug-Panel)
 * @param {number} [options.timestamp] Zeitstempel überschreiben (Tests)
 * @returns {import('./dart-provider.js').DartThrow|null}
 */
export function normalizeAutodartsEvent(raw, options = {}) {
  const { keepRaw = true, timestamp } = options;

  const event = parseRawEvent(raw);
  if (!event) return null;

  const found = findThrow(event);
  if (!found) return null;

  const { throwObj, idHint } = found;
  const segmentSource = throwObj.segment && typeof throwObj.segment === 'object'
    ? throwObj.segment
    : throwObj;

  const multiplier = extractMultiplier(segmentSource);
  const number = extractSegmentNumber(segmentSource);

  // Ohne verwertbaren Multiplikator ist das Ereignis kein Wurf.
  if (multiplier === null) return null;

  // Ein Miss ist ein gültiger Wurf – aber nur, wenn er auch als solcher
  // gekennzeichnet ist. Fehlt gleichzeitig jede Segmentangabe und der
  // Multiplikator ist > 0, sind die Daten unvollständig.
  if (multiplier > 0 && number === null) return null;

  const coords = extractCoords(throwObj);

  return createDartThrow({
    id: idHint ? `autodarts:${idHint}` : undefined,
    timestamp,
    segment: multiplier === 0 ? null : number,
    multiplier: /** @type {0|1|2|3} */ (multiplier),
    x: coords ? coords.x : undefined,
    y: coords ? coords.y : undefined,
    source: 'autodarts',
    raw: keepRaw ? raw : undefined,
  });
}
