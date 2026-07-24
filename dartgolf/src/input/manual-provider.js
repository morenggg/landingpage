/**
 * DartGolf – Manueller Provider
 *
 * Für den Fall, dass eine echte Scheibe geworfen wird, die Erkennung aber
 * nicht angebunden ist: Eine Person trägt den Treffer von Hand ein.
 *
 * Technisch identisch zum Testmodus, aber bewusst als eigene Quelle geführt –
 * so bleibt in Statistik und Debug-Panel erkennbar, woher ein Wurf stammt.
 */

import { BaseDartProvider, createDartThrow } from './dart-provider.js';

export class ManualDartProvider extends BaseDartProvider {
  constructor() {
    super('manual');
  }

  async connect() {
    this._connected = true;
    this._emitStatus('connected', 'Manuelle Eingabe aktiv');
  }

  async disconnect() {
    this._connected = false;
    this._emitStatus('disconnected', 'Manuelle Eingabe beendet');
  }

  /**
   * Trägt einen von Hand erfassten Treffer ein.
   * @param {{segment: number|null, multiplier: 0|1|2|3}} input
   * @returns {import('./dart-provider.js').DartThrow}
   */
  throwDart({ segment, multiplier }) {
    const dartThrow = createDartThrow({
      segment,
      multiplier,
      source: 'manual',
      raw: { manual: true, segment, multiplier },
    });
    this._emit(dartThrow);
    return dartThrow;
  }
}
