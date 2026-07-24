/**
 * DartGolf – Testmodus-Provider
 *
 * Erzeugt Würfe vollständig lokal. Damit ist das komplette Spiel ohne
 * Dartscheibe und ohne Autodarts spielbar und automatisiert testbar.
 */

import { BaseDartProvider, createDartThrow } from './dart-provider.js';
import { BOARD_SEGMENT_ORDER } from '../config.js';

/** Zufälliges Element aus einem Array. */
function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export class TestDartProvider extends BaseDartProvider {
  constructor() {
    super('test');
    /** @type {number|null} Timer-ID einer laufenden Testsequenz. */
    this._sequenceTimer = null;
  }

  async connect() {
    this._connected = true;
    this._emitStatus('connected', 'Testmodus aktiv');
  }

  async disconnect() {
    this.stopSequence();
    this._connected = false;
    this._emitStatus('disconnected', 'Testmodus beendet');
  }

  /**
   * Löst einen konkreten Wurf aus.
   * @param {Object} options
   * @param {number|null} options.segment 1..20, 25 oder null
   * @param {0|1|2|3} options.multiplier
   * @param {number} [options.x] normalisierte Koordinate -1..1
   * @param {number} [options.y] normalisierte Koordinate -1..1
   * @returns {import('./dart-provider.js').DartThrow}
   */
  throwDart({ segment, multiplier, x, y }) {
    const dartThrow = createDartThrow({
      segment,
      multiplier,
      x,
      y,
      source: 'test',
      // Das "Rohereignis" des Testmodus ist die Eingabe selbst – so lässt sich
      // im Debug-Panel dieselbe Kette wie bei echten Daten nachvollziehen.
      raw: { simulated: true, segment, multiplier, x, y },
    });
    this._emit(dartThrow);
    return dartThrow;
  }

  /**
   * Erzeugt einen zufälligen, realistisch verteilten Wurf.
   * @returns {import('./dart-provider.js').DartThrow}
   */
  randomThrow() {
    const roll = Math.random();
    if (roll < 0.08) return this.throwDart({ segment: null, multiplier: 0 });
    if (roll < 0.13) return this.throwDart({ segment: 25, multiplier: 1 });
    if (roll < 0.16) return this.throwDart({ segment: 25, multiplier: 2 });

    const segment = pick(BOARD_SEGMENT_ORDER);
    const m = Math.random();
    const multiplier = m < 0.68 ? 1 : m < 0.88 ? 2 : 3;
    return this.throwDart({ segment, multiplier });
  }

  /**
   * Spielt eine Folge von Würfen mit festem Abstand ab.
   * Nützlich, um einen kompletten Spielablauf ohne Handeingabe zu prüfen.
   * @param {Array<{segment:number|null, multiplier:0|1|2|3}>} throws
   * @param {number} intervalMs
   * @param {() => void} [onDone]
   */
  playSequence(throws, intervalMs = 2600, onDone) {
    this.stopSequence();
    let index = 0;
    const step = () => {
      if (index >= throws.length) {
        this.stopSequence();
        if (onDone) onDone();
        return;
      }
      this.throwDart(throws[index]);
      index += 1;
      this._sequenceTimer = setTimeout(step, intervalMs);
    };
    step();
  }

  /** Bricht eine laufende Testsequenz ab. */
  stopSequence() {
    if (this._sequenceTimer !== null) {
      clearTimeout(this._sequenceTimer);
      this._sequenceTimer = null;
    }
  }

  /** @returns {boolean} */
  isSequenceRunning() {
    return this._sequenceTimer !== null;
  }
}

/**
 * Vordefinierte Testsequenz: deckt Single, Double, Triple, Bull, Bullseye und
 * Miss ab – also alle Trefferarten, die das Spiel unterscheiden muss.
 */
export const DEMO_SEQUENCE = [
  { segment: 20, multiplier: 1 },
  { segment: 20, multiplier: 2 },
  { segment: 20, multiplier: 3 },
  { segment: 25, multiplier: 1 },
  { segment: 25, multiplier: 2 },
  { segment: null, multiplier: 0 },
  { segment: 3, multiplier: 2 },
  { segment: 11, multiplier: 1 },
  { segment: 6, multiplier: 3 },
];
