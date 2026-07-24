/**
 * DartGolf – Bildschirmverwaltung
 *
 * Zuständig für: Wechsel zwischen den Bildschirmen, Überblendungen,
 * Kurzmeldungen (Toasts), Vollbild und den Querformat-Hinweis.
 */

import { el, qs, replaceChildren, setHidden } from './dom.js';
import { SCREEN } from '../state.js';
import { TIMING } from '../config.js';
import { describeHoleResult, formatToPar, leaderboard, totalStrokes } from '../game/scoring.js';

/** Zuordnung Bildschirmname → Element-ID. */
const SCREEN_IDS = {
  [SCREEN.START]: 'screen-start',
  [SCREEN.SETUP]: 'screen-setup',
  [SCREEN.GAME]: 'screen-game',
  [SCREEN.RESULT]: 'screen-result',
  [SCREEN.GUIDE]: 'screen-guide',
};

let currentScreen = SCREEN.START;

/**
 * Zeigt einen Bildschirm und blendet alle anderen aus.
 * @param {string} name siehe SCREEN
 */
export function showScreen(name) {
  Object.entries(SCREEN_IDS).forEach(([key, id]) => {
    setHidden(document.getElementById(id), key !== name);
  });
  currentScreen = name;
  // Das Spielfeld darf keine Wischgesten auslösen – Kennzeichen am body.
  document.body.dataset.playing = name === SCREEN.GAME ? 'true' : 'false';
  // Beim Verlassen des Spiels wieder nach oben scrollen.
  if (name !== SCREEN.GAME) window.scrollTo(0, 0);
  // Andere Bausteine (z. B. der Querformat-Hinweis) reagieren darauf.
  document.dispatchEvent(new CustomEvent('dartgolf:screenchange', { detail: { screen: name } }));
}

/** @returns {string} aktuell sichtbarer Bildschirm */
export function getCurrentScreen() {
  return currentScreen;
}

/* ------------------------------ Toasts -------------------------------- */

/**
 * Zeigt eine kurze Meldung.
 * @param {string} message
 * @param {'info'|'good'|'warn'|'error'} [kind]
 */
export function toast(message, kind = 'info') {
  const container = qs('#toasts');
  if (!container) return;
  const node = el('div', { class: 'toast', dataset: { kind }, text: message });
  container.appendChild(node);
  setTimeout(() => {
    node.remove();
  }, TIMING.toastMs);
}

/* ----------------------------- Vollbild ------------------------------- */

/** Ist gerade Vollbild aktiv? */
export function isFullscreen() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

/**
 * Schaltet den Vollbildmodus um.
 * Gibt eine verständliche Meldung aus, wenn der Browser es nicht erlaubt
 * (z. B. iPhone-Safari kennt die Fullscreen-API für Elemente nicht).
 * @returns {Promise<boolean>} neuer Zustand
 */
export async function toggleFullscreen() {
  const root = document.documentElement;
  try {
    if (isFullscreen()) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      return false;
    }
    if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' });
    else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
    else {
      toast('Dieser Browser unterstützt keinen Vollbildmodus.', 'warn');
      return false;
    }
    return true;
  } catch {
    toast('Vollbild wurde vom Browser abgelehnt.', 'warn');
    return isFullscreen();
  }
}

/* ------------------------- Bahn-Zusammenfassung ------------------------ */

/**
 * Zeigt die Zusammenfassung einer beendeten Bahn.
 * @param {Object} data
 * @param {string} data.playerName
 * @param {string} data.playerColor
 * @param {string} data.courseName
 * @param {number} data.strokes
 * @param {number} data.par
 * @param {boolean} data.holed
 * @param {string} data.nextLabel Text für die Weiter-Schaltfläche
 * @param {() => void} data.onContinue
 */
export function showHoleSummary(data) {
  const overlay = qs('#hole-summary');
  const card = qs('#hole-summary-card');
  if (!overlay || !card) return;

  const resultText = data.holed
    ? describeHoleResult(data.strokes, data.par)
    : 'Schlaggrenze erreicht';

  replaceChildren(card, [
    el('p', { class: 'hud-label', text: data.courseName }),
    el('h2', {}, [
      el('span', { class: 'player-dot', style: { background: data.playerColor, color: data.playerColor } }),
      ' ',
      data.playerName,
    ]),
    el('p', { class: 'summary-score', text: `${data.strokes}` }),
    el('p', { text: `${data.strokes === 1 ? 'Schlag' : 'Schläge'} · Par ${data.par} · ${resultText}` }),
    el('button', {
      class: 'btn btn--primary',
      type: 'button',
      text: data.nextLabel,
      onClick: () => {
        setHidden(overlay, true);
        data.onContinue();
      },
    }),
  ]);

  setHidden(overlay, false);
}

/** Blendet die Bahn-Zusammenfassung aus. */
export function hideHoleSummary() {
  setHidden(qs('#hole-summary'), true);
}

/* ----------------------------- Ergebnis -------------------------------- */

/**
 * Baut den Endstand auf.
 * @param {import('../game/scoring.js').Match} match
 */
export function renderResult(match) {
  const body = qs('#result-body');
  if (!body) return;

  const rows = leaderboard(match);
  const holesLabel = `${match.courses.length} Bahnen`;

  const list = el('div', { class: 'result-list' }, rows.map((row) => el(
    'div',
    { class: `result-row${row.rank === 1 ? ' result-row--winner' : ''}` },
    [
      el('span', { class: 'result-rank', text: `${row.rank}.` }),
      el('span', { class: 'player-dot', style: { background: row.player.color, color: row.player.color } }),
      el('span', { text: row.player.name }),
      el('strong', { text: `${totalStrokes(row.player)}` }),
      el('span', { class: 'hud-sub', text: formatToPar(row.toPar) }),
    ],
  )));

  // Detailtabelle: Schläge je Bahn.
  const header = el('tr', {}, [
    el('th', { text: 'Spieler' }),
    ...match.courses.map((course, index) => el('th', { text: `${index + 1}` })),
    el('th', { text: 'Ges.' }),
  ]);

  const bodyRows = match.players.map((player) => el('tr', {}, [
    el('td', { text: player.name }),
    ...player.strokes.map((strokes) => el('td', { text: strokes === 0 ? '–' : String(strokes) })),
    el('td', {}, [el('strong', { text: String(totalStrokes(player)) })]),
  ]));

  const parRow = el('tr', {}, [
    el('td', {}, [el('em', { text: 'Par' })]),
    ...match.courses.map((course) => el('td', { text: String(course.par) })),
    el('td', { text: String(match.courses.reduce((sum, c) => sum + c.par, 0)) }),
  ]);

  replaceChildren(body, [
    el('p', { class: 'field-hint', text: holesLabel }),
    list,
    el('div', { class: 'field-group' }, [
      el('h3', { text: 'Schläge je Bahn' }),
      el('table', { class: 'highscore-table' }, [
        el('thead', {}, [header]),
        el('tbody', {}, [...bodyRows, parRow]),
      ]),
    ]),
  ]);
}

/* -------------------------- Querformat-Hinweis ------------------------- */

/**
 * Richtet den Hinweis für das Hochformat ein.
 * Der Hinweis ist freundlich und blockiert nicht: Wer weiterspielen möchte,
 * kann ihn wegklicken.
 */
export function setupOrientationHint() {
  const hint = qs('#orientation-hint');
  const button = qs('#btn-orientation-dismiss');
  if (!hint || !button) return;

  // Sichtbarkeit steuert die CSS-Regel; das Attribut merkt sich das Wegklicken.
  button.addEventListener('click', () => {
    hint.dataset.dismissed = 'true';
    setHidden(hint, true);
  });

  const update = () => {
    if (hint.dataset.dismissed === 'true') return;
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    const small = window.innerHeight < 950;
    const playing = document.body.dataset.playing === 'true';
    setHidden(hint, !(portrait && small && playing));
  };

  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  document.addEventListener('dartgolf:screenchange', update);
  update();
}
