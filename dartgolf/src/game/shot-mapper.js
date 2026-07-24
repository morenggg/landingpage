/**
 * DartGolf – Übersetzung Dartwurf → Minigolfschlag
 *
 * Dies ist die einzige Stelle, an der aus einem `DartThrow` eine Richtung und
 * eine Schlagstärke wird. Das Spiel selbst kennt nur noch das Ergebnis.
 *
 * Steuerungsmodus A – Segmentsteuerung (immer verfügbar)
 *   Die Richtung folgt der Position des getroffenen Zahlenfeldes auf einer
 *   Standardscheibe. Die 20 steht oben, die Segmente laufen im Uhrzeigersinn.
 *   Der Winkel wird aus dem Segmentindex berechnet:
 *
 *       Winkel = Index * 18°     (0° = nach vorn/oben)
 *
 *   Damit ergibt sich alles aus einer Formel – es gibt keine 20 Sonderregeln.
 *   Treffer links der Mitte lenken nach links, rechts nach rechts, untere
 *   Segmente entsprechend rückwärts.
 *
 *   Die Stärke kommt vom Multiplikator (Single/Double/Triple), Bull-Treffer
 *   sind Präzisionsschläge Richtung Loch.
 *
 * Steuerungsmodus B – Koordinatensteuerung (nur mit echten Koordinaten)
 *   x bestimmt den Winkel relativ zur Linie zum Loch, y die Stärke, die Nähe
 *   zum Bull löst einen Präzisionsschlag aus. Dieser Modus wird nur genutzt,
 *   wenn der Wurf tatsächlich verwertbare Koordinaten mitbringt.
 */

import {
  BOARD_SEGMENT_ORDER,
  SEGMENT_ARC_DEGREES,
  SHOT_POWER,
  CONTROL_TUNING,
  CONTROL_MODE,
  COORDINATE_MODE,
  PHYSICS,
} from '../config.js';
import { vectorToAngle, blendAngles, powerForDistance, vec } from './golf-physics.js';

/** Ergebnis eines Wurfs, wenn kein Ballkontakt zustande kommt. */
export const NO_CONTACT = Object.freeze({
  kind: 'miss',
  angleDeg: null,
  power: 0,
  label: 'Kein Ballkontakt',
  detail: 'Der Schlag zählt trotzdem.',
});

/**
 * Winkel des Segmentmittelpunkts auf einer Standardscheibe.
 * @param {number} segment 1..20
 * @returns {number|null} Grad im Uhrzeigersinn ab oben, null bei unbekanntem Segment
 */
export function segmentToAngle(segment) {
  const index = BOARD_SEGMENT_ORDER.indexOf(segment);
  if (index === -1) return null;
  return index * SEGMENT_ARC_DEGREES;
}

/**
 * Grobe Himmelsrichtung eines Winkels – für die Anzeige im HUD.
 * @param {number} angleDeg
 * @returns {string}
 */
export function describeDirection(angleDeg) {
  const names = [
    'vorwärts', 'vorwärts rechts', 'rechts', 'rückwärts rechts',
    'rückwärts', 'rückwärts links', 'links', 'vorwärts links',
  ];
  const index = Math.round(((angleDeg % 360) + 360) % 360 / 45) % 8;
  return names[index];
}

/**
 * Beschreibt die Stärke eines Schlags in Worten.
 * @param {number} power
 * @returns {string}
 */
export function describePower(power) {
  if (power <= 0) return '–';
  if (power < SHOT_POWER.single * 1.05) return 'leicht';
  if (power < SHOT_POWER.double * 1.05) return 'mittel';
  if (power < SHOT_POWER.triple * 0.95) return 'kräftig';
  return 'voll';
}

/**
 * Richtung vom Ball zum Loch in Grad.
 * @param {{x:number,y:number}} ballPosition
 * @param {{x:number,y:number}} holePosition
 * @returns {number}
 */
function angleToHole(ballPosition, holePosition) {
  return vectorToAngle(vec.sub(holePosition, ballPosition));
}

/**
 * Berechnet den Schlag zu einem Wurf.
 *
 * @param {import('../input/dart-provider.js').DartThrow} dartThrow
 * @param {Object} context
 * @param {{x:number,y:number}} context.ballPosition
 * @param {{x:number,y:number}} context.holePosition
 * @param {string} context.controlMode CONTROL_MODE.SIMPLE | CONTROL_MODE.ADVANCED
 * @param {boolean} [context.useCoordinates] Modus B erlauben
 * @returns {{kind:string, angleDeg:number|null, power:number, label:string, detail:string, mode:string}}
 */
export function computeShot(dartThrow, context) {
  const {
    ballPosition,
    holePosition,
    controlMode = CONTROL_MODE.SIMPLE,
    useCoordinates = false,
  } = context;

  // Miss: kein Ballkontakt, aber der Schlag zählt.
  if (!dartThrow || dartThrow.multiplier === 0 || dartThrow.segment === null) {
    return { ...NO_CONTACT, mode: 'segment' };
  }

  const towardHole = angleToHole(ballPosition, holePosition);
  const distance = vec.distance(ballPosition, holePosition);
  const tuning = CONTROL_TUNING[controlMode] || CONTROL_TUNING[CONTROL_MODE.SIMPLE];

  /* ----------------------- Modus B: Koordinaten ----------------------- */
  const hasCoordinates = typeof dartThrow.x === 'number' && typeof dartThrow.y === 'number';
  if (useCoordinates && hasCoordinates) {
    const radius = Math.hypot(dartThrow.x, dartThrow.y);

    if (radius <= COORDINATE_MODE.precisionRadius) {
      // Nahe am Bull: Präzisionsschlag genau auf das Loch.
      return {
        kind: 'precision',
        angleDeg: towardHole,
        power: Math.min(SHOT_POWER.bullseye, powerForDistance(distance) * 1.02),
        label: 'Präzisionsschlag',
        detail: 'Treffer nahe am Bull – Richtung und Stärke aufs Loch abgestimmt.',
        mode: 'coordinates',
      };
    }

    const angleOffset = Math.max(-1, Math.min(1, dartThrow.x)) * COORDINATE_MODE.maxAngleDeg;
    const powerFactor = (Math.max(-1, Math.min(1, dartThrow.y)) + 1) / 2;
    const power = COORDINATE_MODE.minPower
      + (COORDINATE_MODE.maxPower - COORDINATE_MODE.minPower) * powerFactor;

    return {
      kind: 'coordinates',
      angleDeg: (towardHole + angleOffset + 360) % 360,
      power: Math.min(power * tuning.powerTolerance, PHYSICS.maxSpeed),
      label: 'Koordinatenschlag',
      detail: `x ${dartThrow.x.toFixed(2)} → Winkel, y ${dartThrow.y.toFixed(2)} → Stärke.`,
      mode: 'coordinates',
    };
  }

  /* ------------------------ Modus A: Segmente ------------------------- */

  // Bull-Treffer sind Präzisionsschläge Richtung Loch.
  if (dartThrow.segment === 25) {
    if (dartThrow.multiplier === 2) {
      return {
        kind: 'bullseye',
        angleDeg: towardHole,
        power: Math.min(SHOT_POWER.bullseye, powerForDistance(distance) * 1.02),
        label: 'Bullseye – Präzisionsschlag',
        detail: 'Genau aufs Loch, Stärke passend zur Entfernung.',
        mode: 'segment',
      };
    }
    return {
      kind: 'outerBull',
      angleDeg: towardHole,
      power: SHOT_POWER.outerBull,
      label: 'Outer Bull – gezielter Schlag',
      detail: 'Richtung Loch mit mittlerer Stärke.',
      mode: 'segment',
    };
  }

  const segmentAngle = segmentToAngle(dartThrow.segment);
  if (segmentAngle === null) {
    // Unbekanntes Segment: als Miss behandeln, statt etwas zu erfinden.
    return { ...NO_CONTACT, mode: 'segment' };
  }

  // Zielhilfe im einfachen Modus: der Winkel wird anteilig Richtung Loch gedreht.
  const angleDeg = tuning.aimAssist > 0
    ? blendAngles(segmentAngle, towardHole, tuning.aimAssist)
    : segmentAngle;

  const powerByMultiplier = {
    1: SHOT_POWER.single,
    2: SHOT_POWER.double,
    3: SHOT_POWER.triple,
  };
  const basePower = powerByMultiplier[dartThrow.multiplier] || SHOT_POWER.single;

  return {
    kind: dartThrow.multiplier === 3 ? 'triple' : dartThrow.multiplier === 2 ? 'double' : 'single',
    angleDeg,
    power: Math.min(basePower * tuning.powerTolerance, PHYSICS.maxSpeed),
    label: `${dartThrow.notation} – ${describePower(basePower)}`,
    detail: `Segment ${dartThrow.segment} zeigt ${describeDirection(segmentAngle)}.`,
    mode: 'segment',
  };
}
