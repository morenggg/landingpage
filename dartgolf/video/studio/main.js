/**
 * DartGolf – Render-Studio: Zusammenbau
 *
 * Registriert alle Szenen, legt Übergänge und Untertitel fest und stellt
 * `window.renderFrame(t)` bereit. Das Rendering-Skript ruft diese Funktion
 * Frame für Frame auf und fotografiert das Ergebnis.
 *
 * Zeitplan (Sekunden):
 *   0,0   Einstieg – Dart, Einschlag, Schriftzug
 *   9,5   Ausgangslage – Erkennung liefert Zahlen
 *  22,0   Architektur – DartThrow, Zugfilter, Physik, Anzeige
 *  41,6   Steuerung – Segmentwinkel und Multiplikator
 *  56,6   Live-Demo in der echten App
 *  94,0   Möglichkeiten
 * 107,0   Abschluss
 */

import { Timeline } from './lib/timeline.js';
import { APP_FRAMES } from './lib/appframe.js';
import { SUBTITLES } from './subtitles.js';

import { scene as s1 } from './scenes/s1-hook.js';
import { scene as s2 } from './scenes/s2-problem.js';
import { scene as s3 } from './scenes/s3-flow.js';
import { scene as s4 } from './scenes/s4-control.js';
import { scene as s5 } from './scenes/s5-demo.js';
import { scene as s6 } from './scenes/s6-features.js';
import { scene as s7 } from './scenes/s7-outro.js';

const back = document.getElementById('fx-back').getContext('2d');
const front = document.getElementById('fx-front').getContext('2d');
const layers = document.getElementById('layers');

const timeline = new Timeline({ layers, back, front });

[s1, s2, s3, s4, s5, s6, s7].forEach((scene) => timeline.add(scene));

/* ------------------------------- Übergänge -------------------------------
 * Bewusst keine einfachen Überblendungen: Balken, Iris-Öffnung und
 * Lichtwische, jeweils auf den Schnitt gelegt.
 */

timeline.addTransition({ at: 9.05, dur: 0.85, kind: 'bars' });
timeline.addTransition({ at: 21.55, dur: 0.85, kind: 'iris' });
timeline.addTransition({ at: 21.5, dur: 1.1, kind: 'sweep', options: { strength: 0.2 } });
timeline.addTransition({ at: 41.1, dur: 0.9, kind: 'up' });
timeline.addTransition({ at: 56.2, dur: 0.85, kind: 'bars' });
timeline.addTransition({ at: 56.3, dur: 1.0, kind: 'sweep', options: { strength: 0.18 } });
timeline.addTransition({ at: 93.6, dur: 0.9, kind: 'iris' });
timeline.addTransition({ at: 106.6, dur: 0.9, kind: 'down' });
timeline.addTransition({ at: 106.7, dur: 1.1, kind: 'sweep', options: { strength: 0.22, angle: 14 } });

/* ------------------------------- Untertitel ------------------------------
 * Ersetzen die Sprecherstimme im Bild. Der vollständige Sprechertext liegt
 * als narration.md daneben, die Zeiten stimmen mit captions.srt überein.
 */

timeline.addSubtitles(SUBTITLES);

/* --------------------------- Öffentliche Schnittstelle ------------------- */

window.renderFrame = (t) => timeline.render(t);
window.__duration = timeline.duration;
window.__timeline = timeline;

/**
 * Der Renderer ruft diese Funktion vor dem ersten Frame auf und wartet, bis
 * alle App-Rahmen geladen sind. Erst danach beginnt die Aufnahme.
 */
window.__prepareApps = async () => {
  await Promise.all(APP_FRAMES.map((frame) => frame.ready()));
  // Ein erster Frame, damit die Apps ihren Startzustand aufbauen.
  APP_FRAMES.forEach((frame) => frame.advanceTo(0.05));
  timeline.render(0);
  window.__appsReady = true;
};

// Erst wenn die Schriften geladen sind, darf gerendert werden – sonst wäre
// der erste Frame mit Ersatzschrift gesetzt.
document.fonts.ready.then(() => {
  timeline.render(0);
  window.__ready = true;
});
