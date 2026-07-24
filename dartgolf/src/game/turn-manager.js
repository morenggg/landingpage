/**
 * DartGolf – Zugverwaltung
 *
 * Zwei Aufgaben:
 *
 *  1. Eingangsfilter für Würfe
 *     Ein Schlag darf genau einen Dart auswerten. Deshalb werden
 *     doppelt empfangene Treffer (gleiche ID), zu schnell aufeinander
 *     folgende Treffer (Cooldown) und Treffer während der Ballbewegung
 *     abgefangen. Je nach Konfiguration landen letztere in einer kurzen
 *     Warteschlange oder werden verworfen.
 *
 *  2. Reihenfolge
 *     Wer ist als Nächstes dran, wann ist eine Bahn fertig, wann das Spiel.
 *     Ein Spieler spielt seine Bahn zu Ende, danach folgt der nächste Spieler.
 */

import { INPUT_GUARD, RULES } from '../config.js';
import { TURN_PHASE } from '../state.js';

/** Gründe, aus denen ein Wurf abgelehnt werden kann. */
export const REJECT = {
  DUPLICATE: 'duplicate',
  COOLDOWN: 'cooldown',
  BALL_MOVING: 'ballMoving',
  NOT_READY: 'notReady',
  QUEUED: 'queued',
};

/** Für Menschen verständliche Texte zu den Ablehnungsgründen. */
export const REJECT_TEXT = {
  [REJECT.DUPLICATE]: 'Treffer doppelt empfangen – ignoriert.',
  [REJECT.COOLDOWN]: 'Zu schnell hintereinander – dieser Treffer wurde ignoriert.',
  [REJECT.BALL_MOVING]: 'Der Ball rollt noch – bitte warten.',
  [REJECT.NOT_READY]: 'Gerade wird kein Wurf erwartet.',
  [REJECT.QUEUED]: 'Treffer vorgemerkt – wird nach dem Stillstand ausgeführt.',
};

export class TurnManager {
  /** @param {import('./scoring.js').Match} match */
  constructor(match) {
    this.match = match;
    /** @type {string[]} Ringpuffer der zuletzt gesehenen Wurf-IDs. */
    this._seenIds = [];
    /** @type {number} Zeitstempel des zuletzt angenommenen Wurfs. */
    this._lastAcceptedAt = 0;
    /** @type {import('../input/dart-provider.js').DartThrow[]} */
    this.queue = [];
    /** Zählt abgelehnte Würfe – nützlich im Debug-Panel. */
    this.rejected = { duplicate: 0, cooldown: 0, ballMoving: 0, notReady: 0 };
  }

  /**
   * Prüft einen eingehenden Wurf.
   * @param {import('../input/dart-provider.js').DartThrow} dartThrow
   * @param {string} phase aktuelle Phase (siehe TURN_PHASE)
   * @returns {{accepted: boolean, reason?: string}}
   */
  filterThrow(dartThrow, phase) {
    // 1. Duplikat anhand der ID.
    if (this._seenIds.includes(dartThrow.id)) {
      this.rejected.duplicate += 1;
      return { accepted: false, reason: REJECT.DUPLICATE };
    }

    // 2. Ball rollt oder Vorschau läuft.
    if (phase === TURN_PHASE.BALL_MOVING || phase === TURN_PHASE.PREVIEW || phase === TURN_PHASE.SETTLING) {
      this._remember(dartThrow.id);
      if (INPUT_GUARD.queueWhileBallMoving && this.queue.length < INPUT_GUARD.maxQueueLength) {
        this.queue.push(dartThrow);
        return { accepted: false, reason: REJECT.QUEUED };
      }
      this.rejected.ballMoving += 1;
      return { accepted: false, reason: REJECT.BALL_MOVING };
    }

    // 3. Es wird gerade kein Wurf erwartet (Pause, Menü, Bahnwechsel).
    if (phase !== TURN_PHASE.AWAITING_THROW) {
      this.rejected.notReady += 1;
      return { accepted: false, reason: REJECT.NOT_READY };
    }

    // 4. Cooldown gegen mehrfach gemeldete Treffer desselben Darts.
    const now = dartThrow.timestamp || Date.now();
    if (this._lastAcceptedAt && now - this._lastAcceptedAt < INPUT_GUARD.cooldownMs) {
      this._remember(dartThrow.id);
      this.rejected.cooldown += 1;
      return { accepted: false, reason: REJECT.COOLDOWN };
    }

    this._remember(dartThrow.id);
    this._lastAcceptedAt = now;
    return { accepted: true };
  }

  /**
   * Merkt sich eine Wurf-ID im Ringpuffer.
   * @param {string} id
   */
  _remember(id) {
    this._seenIds.push(id);
    if (this._seenIds.length > INPUT_GUARD.seenIdBufferSize) {
      this._seenIds.shift();
    }
  }

  /** Entnimmt den nächsten vorgemerkten Wurf (oder null). */
  takeQueued() {
    return this.queue.length > 0 ? this.queue.shift() : null;
  }

  /** Leert die Warteschlange, z. B. beim Spielerwechsel. */
  clearQueue() {
    this.queue.length = 0;
  }

  /** Setzt den Cooldown zurück – nach Spieler- oder Bahnwechsel. */
  resetCooldown() {
    this._lastAcceptedAt = 0;
  }

  /**
   * Ist die Bahn für den aktuellen Spieler beendet?
   * @param {boolean} holed
   * @param {number} strokes
   * @returns {{done: boolean, reason: 'holed'|'maxStrokes'|null}}
   */
  static evaluateHoleEnd(holed, strokes) {
    if (holed) return { done: true, reason: 'holed' };
    if (strokes >= RULES.maxStrokesPerHole) return { done: true, reason: 'maxStrokes' };
    return { done: false, reason: null };
  }

  /**
   * Schaltet zum nächsten Spieler bzw. zur nächsten Bahn weiter.
   * @returns {{type: 'nextPlayer'|'nextHole'|'gameEnd'}}
   */
  advance() {
    const match = this.match;
    this.clearQueue();
    this.resetCooldown();

    if (match.currentPlayerIndex + 1 < match.players.length) {
      match.currentPlayerIndex += 1;
      return { type: 'nextPlayer' };
    }

    match.currentPlayerIndex = 0;
    if (match.currentHoleIndex + 1 < match.courses.length) {
      match.currentHoleIndex += 1;
      return { type: 'nextHole' };
    }

    return { type: 'gameEnd' };
  }
}
