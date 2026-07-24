/**
 * Bahn 2 – "Bande"
 *
 * Ein Block in der Mitte versperrt die direkte Linie zwischen Abschlag und
 * Loch. Es gibt zwei Wege daran vorbei (oben und unten) – und dank der
 * abgeschrägten Ecken lohnt sich ein Schlag über die Bande.
 */

/** @type {import('../game/course-manager.js').Course} */
export const course02 = {
  id: 'bande',
  name: 'Bande',
  par: 4,
  width: 1000,
  height: 600,
  hint: 'Direkt geht nicht. Oben herum, unten herum – oder über die Schräge.',

  theme: {
    fairway: '#132a44',
    fairwayEdge: '#1f4670',
    accent: '#4cc9f0',
    background: '#070b12',
  },

  start: { x: 170, y: 300 },
  hole: { x: 855, y: 300, radius: 22 },

  /** Abgeschrägte Ecken erzeugen berechenbare Bandenwinkel. */
  polygon: [
    [60, 140], [140, 80], [860, 80], [940, 140],
    [940, 460], [860, 520], [140, 520], [60, 460],
  ],

  walls: [],

  obstacles: [
    // Zentraler Block – trennt die beiden Wege.
    { shape: 'rect', x: 390, y: 215, w: 280, h: 170, label: 'Block' },
    // Kleines Hindernis im oberen Weg: schneller, aber enger.
    { shape: 'circle', x: 545, y: 150, r: 26, label: 'Poller' },
    // Querriegel im unteren Weg: längerer, aber ruhigerer Bogen.
    { shape: 'rect', x: 520, y: 430, w: 130, h: 26, label: 'Riegel' },
  ],

  hazards: [],
};
