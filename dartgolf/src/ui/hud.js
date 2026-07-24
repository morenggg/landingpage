/**
 * DartGolf – Spielanzeige (HUD)
 *
 * Liest ausschließlich aus dem Spielstand und schreibt in die bereits im
 * HTML vorhandenen Elemente. Die Anzeige verdeckt die Bahn nicht: sie sitzt
 * in eigenen Zeilen ober- und unterhalb des Spielfelds.
 */

import { qs, setText } from './dom.js';
import { TURN_PHASE, CONNECTION_STATE } from '../state.js';
import {
  currentCourse, currentPlayer, strokesOnCurrentHole, totalStrokes, toPar, formatToPar,
} from '../game/scoring.js';
import { describeDirection, describePower } from '../game/shot-mapper.js';

/** Texte für die Phasenanzeige über dem Spielfeld. */
const PHASE_PROMPT = {
  [TURN_PHASE.AWAITING_THROW]: 'Bitte werfen',
  [TURN_PHASE.PREVIEW]: 'Schlag wird ausgeführt …',
  [TURN_PHASE.BALL_MOVING]: 'Ball rollt …',
  [TURN_PHASE.SETTLING]: 'Moment …',
  [TURN_PHASE.HOLE_DONE]: 'Bahn beendet',
  [TURN_PHASE.PAUSED]: 'Pause',
  [TURN_PHASE.FINISHED]: 'Spiel beendet',
  [TURN_PHASE.IDLE]: '',
};

/** Anzeigetexte der Verbindungszustände. */
const CONNECTION_TEXT = {
  [CONNECTION_STATE.DISCONNECTED]: 'Getrennt',
  [CONNECTION_STATE.CONNECTING]: 'Verbinde …',
  [CONNECTION_STATE.CONNECTED]: 'Verbunden',
  [CONNECTION_STATE.RECONNECTING]: 'Neuer Versuch …',
  [CONNECTION_STATE.LOST]: 'Verbindung verloren',
  [CONNECTION_STATE.ERROR]: 'Fehler',
};

/**
 * Aktualisiert die Statusanzeige (Start- und Spielbildschirm).
 * @param {HTMLElement|null} pill
 * @param {{providerName:string, connection:string, connectionDetail:string}} status
 */
function renderStatusPill(pill, status) {
  if (!pill) return;
  const textNode = pill.querySelector('.status-text');

  if (status.providerName === 'test') {
    pill.dataset.state = 'test';
    setText(textNode, 'Testmodus');
    pill.title = 'Würfe kommen aus dem Testpanel.';
    return;
  }

  if (status.providerName === 'manual') {
    pill.dataset.state = 'test';
    setText(textNode, 'Manuelle Eingabe');
    pill.title = 'Treffer werden von Hand eingetragen.';
    return;
  }

  const state = status.connection || CONNECTION_STATE.DISCONNECTED;
  const label = CONNECTION_TEXT[state] || 'Unbekannt';
  pill.dataset.state = state === CONNECTION_STATE.CONNECTED ? 'connected'
    : state === CONNECTION_STATE.CONNECTING || state === CONNECTION_STATE.RECONNECTING ? 'connecting'
      : state === CONNECTION_STATE.LOST || state === CONNECTION_STATE.ERROR ? 'error' : 'disconnected';
  setText(textNode, `Autodarts: ${label}`);
  pill.title = status.connectionDetail || '';
}

/**
 * Aktualisiert die Statusanzeigen auf allen Bildschirmen.
 * @param {{providerName:string, connection:string, connectionDetail:string}} status
 */
export function updateConnectionDisplays(status) {
  renderStatusPill(qs('#start-status'), status);
  renderStatusPill(qs('#hud-status'), status);
}

/**
 * Aktualisiert die Spielanzeige.
 * @param {Object} data
 * @param {import('../game/scoring.js').Match} data.match
 * @param {string} data.phase
 * @param {import('../input/dart-provider.js').DartThrow|null} data.lastThrow
 * @param {Object|null} data.lastShot
 * @param {boolean} data.paused
 */
export function updateHud({ match, phase, lastThrow, lastShot, paused }) {
  if (!match) return;

  const course = currentCourse(match);
  const player = currentPlayer(match);

  setText(qs('#hud-hole'), `${match.currentHoleIndex + 1} / ${match.courses.length}`);
  setText(qs('#hud-course-name'), course.name);
  setText(qs('#hud-par'), `Par ${course.par}`);

  setText(qs('#hud-player-name'), player.name);
  const dot = qs('#hud-player-color');
  if (dot) {
    dot.style.background = player.color;
    dot.style.color = player.color;
  }

  const strokes = strokesOnCurrentHole(match);
  setText(qs('#hud-strokes'), `Schläge: ${strokes}`);
  setText(qs('#hud-total'), String(totalStrokes(player)));
  setText(qs('#hud-topar'), formatToPar(toPar(match, player)));

  // Letzter Dart und daraus abgeleiteter Schlag.
  setText(qs('#hud-throw'), lastThrow ? lastThrow.notation : '–');
  const shotNode = qs('#hud-shot');
  if (shotNode) {
    if (!lastThrow) {
      setText(shotNode, 'Warte auf Wurf');
    } else if (!lastShot || lastShot.angleDeg === null) {
      setText(shotNode, 'Kein Ballkontakt');
    } else {
      setText(
        shotNode,
        `${describeDirection(lastShot.angleDeg)} · ${describePower(lastShot.power)} `
        + `(${Math.round(lastShot.angleDeg)}°)`,
      );
    }
  }

  // Aufforderung über dem Spielfeld.
  const prompt = qs('#stage-prompt');
  if (prompt) {
    const text = paused ? 'Pause' : (PHASE_PROMPT[phase] || '');
    setText(prompt, text);
    prompt.dataset.pulse = phase === TURN_PHASE.AWAITING_THROW && !paused ? 'true' : 'false';
    prompt.style.display = text ? '' : 'none';
  }
}

/**
 * Schaltet die Beschriftung der Ton-Schaltfläche um.
 * @param {boolean} enabled
 */
export function updateSoundButton(enabled) {
  const button = qs('#btn-sound');
  if (!button) return;
  setText(button, enabled ? 'Ton an' : 'Ton aus');
  button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
}

/**
 * Schaltet die Beschriftung der Pause-Schaltfläche um.
 * @param {boolean} paused
 */
export function updatePauseButton(paused) {
  const button = qs('#btn-pause');
  if (!button) return;
  setText(button, paused ? 'Weiter' : 'Pause');
  button.setAttribute('aria-pressed', paused ? 'true' : 'false');
}
