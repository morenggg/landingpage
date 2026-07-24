/**
 * Bahn 1 – "Auftakt"
 *
 * Einstiegsbahn: ein leicht geschwungener Korridor mit gleichbleibender
 * Breite, einem einzelnen runden Hindernis in der Kurve und ohne Gefahren.
 * Ziel: die Segment-Steuerung kennenlernen.
 *
 * Alle Bahnen sind reine Daten. Die Renderfunktion kennt keine Bahn im Detail.
 * Weltmaß: 1000 x 600 Einheiten (Seitenverhältnis passend zu 16:9-Bildschirmen).
 */

/** @type {import('../game/course-manager.js').Course} */
export const course01 = {
  id: 'auftakt',
  name: 'Auftakt',
  par: 3,
  width: 1000,
  height: 600,
  hint: 'Sanfte Kurve nach oben rechts. Ein Triple reicht fast bis zum Loch.',

  theme: {
    fairway: '#123a2c',
    fairwayEdge: '#1d5a42',
    accent: '#3ddc97',
    background: '#080d12',
  },

  start: { x: 150, y: 315 },
  hole: { x: 870, y: 205, radius: 22 },

  /** Außenkontur des Spielfelds (geschlossener Linienzug, Banden). */
  polygon: [
    [60, 220], [420, 200], [700, 110], [940, 110],
    [940, 300], [700, 300], [420, 390], [60, 410],
  ],

  /** Zusätzliche freie Bandenstücke (hier keine). */
  walls: [],

  obstacles: [
    // Bewusst neben der direkten Linie: der kurze Weg bleibt spielbar,
    // die untere Bahnhälfte wird eingeengt.
    { shape: 'circle', x: 520, y: 330, r: 32, label: 'Findling' },
  ],

  hazards: [],
};
