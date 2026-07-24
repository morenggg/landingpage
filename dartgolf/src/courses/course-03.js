/**
 * Bahn 3 – "Risiko"
 *
 * Zwischen Abschlag und Loch liegt eine Wasserfläche mit einem schmalen
 * Durchgang in der Mitte. Wer ihn trifft, spart zwei Schläge. Wer daneben
 * liegt, zahlt einen Strafschlag und beginnt vom letzten sicheren Punkt.
 * Der Weg oben herum ist länger, aber gefahrlos.
 */

/** @type {import('../game/course-manager.js').Course} */
export const course03 = {
  id: 'risiko',
  name: 'Risiko',
  par: 4,
  width: 1000,
  height: 600,
  hint: 'Schmaler Durchgang mittendurch – oder außen herum ohne Wasser.',

  theme: {
    fairway: '#2a1f3d',
    fairwayEdge: '#463160',
    accent: '#b892ff',
    background: '#0a070f',
  },

  start: { x: 150, y: 470 },
  hole: { x: 850, y: 175, radius: 22 },

  polygon: [
    [60, 60], [940, 60], [940, 540], [60, 540],
  ],

  walls: [],

  obstacles: [
    // Leitplanken, die den Durchgang sichtbar machen und Bälle ablenken.
    { shape: 'rect', x: 320, y: 246, w: 14, h: 68, label: 'Leitplanke' },
    { shape: 'rect', x: 666, y: 246, w: 14, h: 68, label: 'Leitplanke' },
  ],

  hazards: [
    // Obere Wasserfläche.
    { shape: 'rect', kind: 'water', x: 330, y: 140, w: 330, h: 106, name: 'Wasser' },
    // Untere Wasserfläche – dazwischen bleibt ein 60 Einheiten breiter Weg.
    { shape: 'rect', kind: 'water', x: 330, y: 314, w: 330, h: 96, name: 'Wasser' },
    // Aus-Bereich in der rechten unteren Ecke: gefährlich beim Anspiel von unten.
    { shape: 'rect', kind: 'out', x: 720, y: 430, w: 220, h: 110, name: 'Aus' },
  ],
};
