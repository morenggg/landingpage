/**
 * DartGolf – Soundverwaltung
 *
 * Alle Klänge werden zur Laufzeit mit der Web Audio API selbst erzeugt.
 * Damit sind keine fremden Audiodateien im Repository nötig und es gibt
 * keinerlei Lizenzfragen. Der Ordner /assets/audio/ bleibt als Platz für
 * später eigene Aufnahmen bestehen.
 *
 * Regeln:
 *  - Audio wird erst nach einer Nutzerinteraktion gestartet
 *    (Browser-Vorgabe, kein Autoplay).
 *  - Ist Web Audio nicht verfügbar, bleibt alles still – ohne Fehler.
 */

import { SOUND_EVENTS } from '../config.js';

/**
 * Klangrezepte: Frequenzverlauf, Dauer, Wellenform und Lautstärke.
 * Bewusst kurz und trocken gehalten – die Klänge sollen den Spielfluss
 * unterstützen, nicht dominieren.
 */
const RECIPES = {
  dart:         { type: 'triangle', from: 880, to: 1320, duration: 0.09, gain: 0.16 },
  hit:          { type: 'square',   from: 320, to: 120,  duration: 0.13, gain: 0.20 },
  wall:         { type: 'sine',     from: 520, to: 300,  duration: 0.07, gain: 0.13 },
  hazard:       { type: 'sawtooth', from: 260, to: 70,   duration: 0.34, gain: 0.16 },
  holed:        { type: 'sine',     from: 660, to: 1180, duration: 0.26, gain: 0.22 },
  playerChange: { type: 'triangle', from: 440, to: 660,  duration: 0.16, gain: 0.14 },
  holeComplete: { type: 'sine',     from: 520, to: 880,  duration: 0.30, gain: 0.20 },
  gameComplete: { type: 'sine',     from: 440, to: 1320, duration: 0.55, gain: 0.22 },
};

export class SoundManager {
  constructor() {
    this.enabled = true;
    /** @type {AudioContext|null} */
    this._context = null;
    this._unlocked = false;
    this._unsupported = typeof window === 'undefined'
      || !(window.AudioContext || window.webkitAudioContext);
  }

  /** Schaltet den Ton an oder aus. */
  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  /**
   * Muss aus einem Nutzer-Ereignis heraus aufgerufen werden (Klick, Taste).
   * Erst danach darf ein Browser Audio abspielen.
   * @returns {boolean} true, wenn Audio nutzbar ist
   */
  unlock() {
    if (this._unsupported) return false;
    if (!this._context) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      try {
        this._context = new Ctor();
      } catch {
        this._unsupported = true;
        return false;
      }
    }
    if (this._context.state === 'suspended') {
      this._context.resume().catch(() => { /* bleibt still */ });
    }
    this._unlocked = true;
    return true;
  }

  /**
   * Spielt ein Spielereignis ab.
   * Unbekannte Namen werden ignoriert – so kann die Engine gefahrlos
   * neue Ereignisse melden, bevor es dafür einen Klang gibt.
   * @param {string} name siehe SOUND_EVENTS
   */
  play(name) {
    if (!this.enabled || !this._unlocked || this._unsupported) return;
    if (!SOUND_EVENTS.includes(name)) return;
    const recipe = RECIPES[name];
    if (!recipe || !this._context) return;

    try {
      const ctx = this._context;
      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = recipe.type;
      oscillator.frequency.setValueAtTime(recipe.from, now);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, recipe.to),
        now + recipe.duration,
      );

      // Kurze Hüllkurve, damit nichts klickt.
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(recipe.gain, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + recipe.duration);

      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + recipe.duration + 0.02);
    } catch {
      // Ton ist nie kritisch – Fehler werden bewusst verschluckt.
    }
  }

  /** Zustand für das Debug-Panel. */
  getStatus() {
    if (this._unsupported) return 'nicht unterstützt';
    if (!this._unlocked) return 'wartet auf Nutzerinteraktion';
    return this.enabled ? 'aktiv' : 'stumm';
  }
}
