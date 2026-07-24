/**
 * DartGolf – Punktezählung
 *
 * Zählt Schläge je Spieler und Bahn und berechnet Zwischen- und Endstände.
 * Enthält keine Darstellung – die UI liest nur die hier berechneten Werte.
 */

import { RULES } from '../config.js';

/**
 * @typedef {Object} MatchPlayer
 * @property {string} id
 * @property {string} name
 * @property {string} color
 * @property {number[]} strokes  Schläge je Bahn (Index = Bahnnummer - 1)
 * @property {boolean[]} holedOut  true, wenn die Bahn regulär beendet wurde
 *
 * @typedef {Object} Match
 * @property {MatchPlayer[]} players
 * @property {import('./course-manager.js').PreparedCourse[]} courses
 * @property {number} currentHoleIndex
 * @property {number} currentPlayerIndex
 * @property {Object} settings
 * @property {number} startedAt
 */

/**
 * Erzeugt ein neues Spiel.
 * @param {{name:string,color:string}[]} players Spieler in gewünschter Reihenfolge
 * @param {import('./course-manager.js').PreparedCourse[]} courses
 * @param {Object} settings
 * @returns {Match}
 */
export function createMatch(players, courses, settings) {
  return {
    players: players.map((p, index) => ({
      id: `p${index + 1}`,
      name: p.name,
      color: p.color,
      strokes: new Array(courses.length).fill(0),
      holedOut: new Array(courses.length).fill(false),
    })),
    courses,
    currentHoleIndex: 0,
    currentPlayerIndex: 0,
    settings,
    startedAt: Date.now(),
  };
}

/** Aktuelle Bahn. */
export function currentCourse(match) {
  return match.courses[match.currentHoleIndex];
}

/** Aktueller Spieler. */
export function currentPlayer(match) {
  return match.players[match.currentPlayerIndex];
}

/**
 * Zählt einen Schlag für den aktuellen Spieler auf der aktuellen Bahn.
 * @param {Match} match
 * @param {number} [count=1] Anzahl (z. B. 2 bei Schlag + Strafschlag)
 * @returns {number} neue Schlagzahl auf dieser Bahn
 */
export function addStrokes(match, count = 1) {
  const player = currentPlayer(match);
  player.strokes[match.currentHoleIndex] += count;
  return player.strokes[match.currentHoleIndex];
}

/** Schläge des aktuellen Spielers auf der aktuellen Bahn. */
export function strokesOnCurrentHole(match) {
  return currentPlayer(match).strokes[match.currentHoleIndex];
}

/**
 * Markiert die aktuelle Bahn für den aktuellen Spieler als beendet.
 * @param {Match} match
 * @param {boolean} holed true = eingelocht, false = Schlaggrenze erreicht
 */
export function finishHoleForCurrentPlayer(match, holed) {
  const player = currentPlayer(match);
  player.holedOut[match.currentHoleIndex] = holed;
  if (!holed) {
    // Ohne Einlochen wird die Höchstzahl an Schlägen gewertet.
    player.strokes[match.currentHoleIndex] = RULES.maxStrokesPerHole;
  }
}

/** Summe aller Schläge eines Spielers. */
export function totalStrokes(player) {
  return player.strokes.reduce((sum, value) => sum + value, 0);
}

/** Par-Summe aller gespielten Bahnen. */
export function totalPar(match, upToHoleIndex = match.courses.length - 1) {
  return match.courses
    .slice(0, upToHoleIndex + 1)
    .reduce((sum, course) => sum + course.par, 0);
}

/**
 * Differenz zu Par über alle bereits begonnenen Bahnen.
 * @param {Match} match
 * @param {MatchPlayer} player
 * @returns {number}
 */
export function toPar(match, player) {
  let played = 0;
  let par = 0;
  player.strokes.forEach((strokes, index) => {
    if (strokes > 0) {
      played += strokes;
      par += match.courses[index].par;
    }
  });
  return played - par;
}

/**
 * Sortierte Rangliste (wenigste Schläge zuerst).
 * @param {Match} match
 * @returns {Array<{player: MatchPlayer, total:number, toPar:number, rank:number}>}
 */
export function leaderboard(match) {
  const rows = match.players.map((player) => ({
    player,
    total: totalStrokes(player),
    toPar: toPar(match, player),
  }));
  rows.sort((a, b) => a.total - b.total);

  // Gleiche Schlagzahl ergibt denselben Rang.
  let lastTotal = null;
  let lastRank = 0;
  rows.forEach((row, index) => {
    if (row.total !== lastTotal) {
      lastRank = index + 1;
      lastTotal = row.total;
    }
    row.rank = lastRank;
  });
  return rows;
}

/**
 * Beschreibt ein Bahnergebnis in Golf-Sprache.
 * @param {number} strokes
 * @param {number} par
 * @returns {string}
 */
export function describeHoleResult(strokes, par) {
  if (strokes === 1) return 'Hole-in-One';
  const diff = strokes - par;
  if (diff <= -3) return 'Albatros';
  if (diff === -2) return 'Eagle';
  if (diff === -1) return 'Birdie';
  if (diff === 0) return 'Par';
  if (diff === 1) return 'Bogey';
  if (diff === 2) return 'Doppel-Bogey';
  return `${diff} über Par`;
}

/**
 * Formatiert eine Par-Differenz mit Vorzeichen.
 * @param {number} value
 * @returns {string}
 */
export function formatToPar(value) {
  if (value === 0) return 'Par';
  return value > 0 ? `+${value}` : `${value}`;
}

/**
 * Erzeugt Einträge für die lokale Bestenliste.
 * @param {Match} match
 * @returns {{name:string, strokes:number, toPar:number, holes:number, date:string}[]}
 */
export function buildHighscoreEntries(match) {
  const date = new Date().toISOString().slice(0, 10);
  return match.players.map((player) => ({
    name: player.name,
    strokes: totalStrokes(player),
    toPar: totalStrokes(player) - totalPar(match),
    holes: match.courses.length,
    date,
  }));
}
