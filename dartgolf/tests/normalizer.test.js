/**
 * Tests für die Normalisierung von Autodarts-Ereignissen.
 *
 * Wichtig: Diese Tests prüfen das Verhalten der Funktion an simulierten
 * Ereignissen. Sie beweisen NICHT, dass echte Autodarts-Nachrichten genau so
 * aussehen. Die verwendeten Feldnamen stammen aus öffentlich einsehbaren
 * Open-Source-Projekten (siehe AUTODARTS-INTEGRATION.md).
 */

import { test, assert, assertEqual } from './runner.js';
import { normalizeAutodartsEvent, parseRawEvent } from '../src/input/autodarts-normalizer.js';

/* ------------------------- Ungültige Eingaben -------------------------- */

test('normalizer: null, undefined und leere Werte ergeben null', () => {
  assertEqual(normalizeAutodartsEvent(null), null);
  assertEqual(normalizeAutodartsEvent(undefined), null);
  assertEqual(normalizeAutodartsEvent(''), null);
  assertEqual(normalizeAutodartsEvent(42), null);
});

test('normalizer: ungültiges JSON löst keine Ausnahme aus', () => {
  assertEqual(normalizeAutodartsEvent('{ das ist kein json'), null);
  assertEqual(normalizeAutodartsEvent('{"a":'), null);
});

test('normalizer: unbekannte Ereignisse werden ignoriert', () => {
  assertEqual(normalizeAutodartsEvent({ channel: 'autodarts.boards', type: 'status' }), null);
  assertEqual(normalizeAutodartsEvent({ hello: 'world' }), null);
  assertEqual(normalizeAutodartsEvent({ data: { turns: [] } }), null);
});

/* ----------------------------- Match-State ----------------------------- */

const matchStateEvent = {
  channel: 'autodarts.matches',
  topic: 'abc-123.state',
  data: {
    id: 'abc-123',
    turns: [
      {
        round: 1,
        playerId: 'p1',
        throws: [
          { segment: { name: 'T20', number: 20, bed: 'Triple', multiplier: 3 }, coords: { x: 0.12, y: 0.44 } },
        ],
      },
    ],
  },
};

test('normalizer: Match-State mit Triple wird korrekt gelesen', () => {
  const result = normalizeAutodartsEvent(matchStateEvent);
  assert(result !== null, 'Ergebnis darf nicht null sein');
  assertEqual(result.segment, 20);
  assertEqual(result.multiplier, 3);
  assertEqual(result.score, 60);
  assertEqual(result.notation, 'T20');
  assertEqual(result.source, 'autodarts');
  assertEqual(result.x, 0.12);
  assertEqual(result.y, 0.44);
});

test('normalizer: derselbe Match-State erzeugt dieselbe ID (Duplikaterkennung)', () => {
  const first = normalizeAutodartsEvent(matchStateEvent);
  const second = normalizeAutodartsEvent(matchStateEvent);
  assertEqual(first.id, second.id);
  assert(first.id.startsWith('autodarts:'), 'ID sollte den Kontext enthalten');
});

test('normalizer: ein weiterer Wurf im selben Zug erzeugt eine andere ID', () => {
  const event = JSON.parse(JSON.stringify(matchStateEvent));
  event.data.turns[0].throws.push({
    segment: { name: 'S5', number: 5, bed: 'Single', multiplier: 1 },
  });
  const first = normalizeAutodartsEvent(matchStateEvent);
  const second = normalizeAutodartsEvent(event);
  assert(first.id !== second.id, 'IDs müssen sich unterscheiden');
  assertEqual(second.segment, 5);
  assertEqual(second.multiplier, 1);
});

test('normalizer: JSON-String wird genauso verarbeitet wie ein Objekt', () => {
  const asString = normalizeAutodartsEvent(JSON.stringify(matchStateEvent));
  assertEqual(asString.notation, 'T20');
});

/* ------------------------------- Bull ---------------------------------- */

test('normalizer: Bullseye (50) wird zu Segment 25 mit Multiplikator 2', () => {
  const result = normalizeAutodartsEvent({
    segment: { name: 'BULL', number: 25, bed: 'Bull', multiplier: 2 },
  });
  assertEqual(result.segment, 25);
  assertEqual(result.multiplier, 2);
  assertEqual(result.score, 50);
  assertEqual(result.notation, 'BULL');
});

test('normalizer: Outer Bull (25) ergibt 25 Punkte', () => {
  const result = normalizeAutodartsEvent({
    segment: { number: 25, bed: 'OuterBull', multiplier: 1 },
  });
  assertEqual(result.score, 25);
  assertEqual(result.notation, '25');
});

/* -------------------------------- Miss --------------------------------- */

test('normalizer: Miss über bed "Outside"', () => {
  const result = normalizeAutodartsEvent({ segment: { name: 'Outside', bed: 'Outside', multiplier: 0 } });
  assertEqual(result.segment, null);
  assertEqual(result.multiplier, 0);
  assertEqual(result.score, 0);
  assertEqual(result.notation, 'MISS');
});

test('normalizer: Multiplikator 0 ohne Segment ist ein gültiger Miss', () => {
  const result = normalizeAutodartsEvent({ segment: { multiplier: 0 } });
  assertEqual(result.notation, 'MISS');
});

test('normalizer: Multiplikator > 0 ohne Segmentangabe wird verworfen', () => {
  assertEqual(normalizeAutodartsEvent({ segment: { multiplier: 3 } }), null);
});

/* ---------------------------- Feldvarianten ---------------------------- */

test('normalizer: Multiplikator aus der Kurzschreibweise ableiten', () => {
  const result = normalizeAutodartsEvent({ segment: { name: 'D18' } });
  assertEqual(result.segment, 18);
  assertEqual(result.multiplier, 2);
  assertEqual(result.score, 36);
});

test('normalizer: bed-Schreibweisen werden unabhängig von Groß-/Kleinschreibung erkannt', () => {
  const a = normalizeAutodartsEvent({ segment: { number: 19, bed: 'TRIPLE' } });
  const b = normalizeAutodartsEvent({ segment: { number: 19, bed: 'triple' } });
  assertEqual(a.multiplier, 3);
  assertEqual(b.multiplier, 3);
});

test('normalizer: flaches Ereignis ohne segment-Objekt', () => {
  const result = normalizeAutodartsEvent({ number: 7, bed: 'Double' });
  assertEqual(result.segment, 7);
  assertEqual(result.multiplier, 2);
  assertEqual(result.score, 14);
});

/* ----------------------------- Koordinaten ----------------------------- */

test('normalizer: Ereignis ohne Koordinaten liefert keine x/y-Felder', () => {
  const result = normalizeAutodartsEvent({ segment: { number: 12, bed: 'Single' } });
  assertEqual(result.x, undefined);
  assertEqual(result.y, undefined);
});

test('normalizer: unbrauchbare Koordinaten werden nicht übernommen', () => {
  const nonNumeric = normalizeAutodartsEvent({
    segment: { number: 12, multiplier: 1 },
    coords: { x: 'links', y: null },
  });
  assertEqual(nonNumeric.x, undefined);

  const outOfRange = normalizeAutodartsEvent({
    segment: { number: 12, multiplier: 1 },
    coords: { x: 148, y: -230 },
  });
  assertEqual(outOfRange.x, undefined, 'unbekannte Skalierung darf nicht verwendet werden');
});

test('normalizer: NaN-Koordinaten werden abgelehnt', () => {
  const result = normalizeAutodartsEvent({
    segment: { number: 3, multiplier: 1 },
    coords: { x: NaN, y: 0.2 },
  });
  assertEqual(result.x, undefined);
});

/* ------------------------------ Parser --------------------------------- */

test('parseRawEvent: Objekte werden unverändert zurückgegeben', () => {
  const input = { a: 1 };
  assertEqual(parseRawEvent(input), input);
});

test('parseRawEvent: Text ohne JSON ergibt null', () => {
  assertEqual(parseRawEvent('pong'), null);
});
