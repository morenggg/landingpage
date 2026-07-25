/**
 * Szene 5 – Live-Demo mit der echten Anwendung
 *
 * Hier wird nichts nachgebaut: die tatsächliche Web-App läuft in einem iframe
 * und wird Frame für Frame weitergeschaltet. Alle Klicks gehen an die echten
 * Bedienelemente, alle Reaktionen (Dialoge, Hinweise, Ballphysik, Punkte)
 * kommen aus der App selbst.
 *
 * Ablauf:
 *   1. Verbindungsdialog öffnen – ehrlich als experimentell gekennzeichnet
 *   2. Verbindung testen: die App sagt selbst, dass keine Daten ankommen
 *   3. Zurück in den Testmodus, Spiel einrichten (Spieler, Bahnen)
 *   4. Spielen: Triple-Schlag, Bandenkontakt, Bullseye-Präzisionsschlag
 *   5. Bahnergebnis und Endstand
 *
 * Dauer: 37,4 s (Start 56,6 s)
 */

import {
  at, ease, clamp, lerp, alpha, easeOutCubic, easeInCubic, easeOutQuint,
  easeInOutCubic, drift,
} from '../lib/easing.js';
import {
  background, dotGrid, dust, bloom, glowDot, shockRing, W, H, COLORS,
} from '../lib/draw.js';
import { el, splitWords, set, place } from '../lib/ui.js';
import { revealStagger } from '../lib/timeline.js';
import { AppFrame, cameraTrack, cursorTrack, runSteps } from '../lib/appframe.js';

/** Die App wird zweimal geladen: einmal für die Bedienung, einmal für den Endstand. */
const APP_SRC = '../../index.html?vclock=1';

/** Merker für einmalig ausgeführte Schritte. */
const doneMain = new Set();
const doneResult = new Set();

/**
 * Kamerafahrt über die Demo. `fx/fy` ist der Punkt in App-Koordinaten, der auf
 * `sx/sy` der Bühne liegen soll.
 */
const CAMERA = [
  { at: 0.0, fx: 960, fy: 540, scale: 0.70, sy: 468 },
  { at: 1.6, fx: 960, fy: 540, scale: 0.72, sy: 468 },
  // Verbindungsdialog: er füllt den App-Bildschirm ohnehin aus
  { at: 2.8, fx: 960, fy: 540, scale: 0.78, sy: 468 },
  { at: 6.2, fx: 960, fy: 600, scale: 0.80, sy: 468 },
  { at: 8.8, fx: 960, fy: 540, scale: 0.72, sy: 468 },
  // Spielerstellung
  { at: 10.8, fx: 960, fy: 480, scale: 0.80, sy: 460 },
  { at: 14.6, fx: 960, fy: 500, scale: 0.80, sy: 460 },
  // Spielfeld ganz zeigen
  { at: 16.3, fx: 960, fy: 540, scale: 0.74, sy: 468 },
  { at: 17.6, fx: 700, fy: 660, scale: 0.80, sy: 468 },
  // Näher an die Bahn, während der Ball rollt
  { at: 20.0, fx: 1000, fy: 520, scale: 0.86, sy: 460 },
  { at: 23.6, fx: 900, fy: 560, scale: 0.80, sy: 464 },
  { at: 26.4, fx: 1120, fy: 470, scale: 0.92, sy: 455 },
  { at: 30.0, fx: 1000, fy: 500, scale: 0.86, sy: 460 },
  // Bahnergebnis
  { at: 32.6, fx: 960, fy: 530, scale: 0.78, sy: 462 },
  { at: 34.2, fx: 960, fy: 540, scale: 0.72, sy: 468 },
  { at: 37.4, fx: 960, fy: 540, scale: 0.72, sy: 468 },
];

/** Zeigerbewegung: Ziele sind echte Bedienelemente der App. */
const CURSOR = [
  { at: 0.5, x: 1520, y: 940, dur: 0.1 },
  { at: 0.7, sel: '#btn-open-connection', dur: 1.0 },
  { at: 4.9, sel: '#connection-body .btn', text: 'Verbindung testen', dur: 0.9 },
  { at: 7.0, sel: '#connection-body .btn', text: 'Zurück zum Testmodus', dur: 0.9 },
  { at: 9.3, sel: '#btn-start-game', dur: 0.9 },
  { at: 11.0, sel: '#setup-body .btn', text: '+ Spieler', dur: 0.8 },
  { at: 12.4, sel: '#setup-body .btn', text: '6', dur: 0.8 },
  { at: 14.2, sel: '#btn-setup-start', dur: 0.9 },
  { at: 16.6, x: 300, y: 700, dur: 0.8 },
  { at: 17.2, sel: '#test-panel-body .segment-grid .btn', text: '20', dur: 0.7 },
  { at: 17.9, sel: '#test-panel-body .multiplier-row .btn', text: 'Triple', dur: 0.5 },
  { at: 18.5, sel: '#test-panel-body .btn--primary', dur: 0.5 },
  { at: 24.0, sel: '#test-panel-body .special-row .btn', text: 'Bullseye', dur: 0.6 },
  { at: 24.7, sel: '#test-panel-body .btn--primary', dur: 0.5 },
  { at: 32.0, sel: '#btn-test-panel', dur: 0.9 },
];

/**
 * Führt eine Aktion nur aus, wenn die App gerade einen Wurf erwartet.
 * So wird nie gegen den rollenden Ball geworfen – der Zugfilter würde den
 * Treffer ohnehin abweisen.
 */
function whenWaiting(app, action) {
  const doc = app.doc;
  if (!doc) return;
  const summary = doc.getElementById('hole-summary');
  if (summary && !summary.hasAttribute('hidden')) return;
  const prompt = doc.getElementById('stage-prompt');
  if (!prompt || prompt.textContent.indexOf('Bitte werfen') !== 0) return;
  action();
}

/** Klicks: Zeitpunkt und Ziel. */
function buildSteps(app) {
  return [
    { at: 1.8, run: () => app.click('#btn-open-connection') },
    // Verbindung testen – die App antwortet ehrlich mit "keine Nachricht empfangen".
    { at: 5.9, run: () => app.clickByText('#connection-body .btn', 'Verbindung testen') },
    // Zurück in den Testmodus
    { at: 8.0, run: () => app.clickByText('#connection-body .btn', 'Zurück zum Testmodus') },
    { at: 10.2, run: () => app.click('#btn-start-game') },
    // Zweiter Spieler
    { at: 11.8, run: () => app.clickByText('#setup-body .btn', '+ Spieler') },
    // Sechs Bahnen wählen
    { at: 13.2, run: () => app.clickByText('#setup-body .field-group:nth-child(2) .btn', '6') },
    { at: 15.1, run: () => app.click('#btn-setup-start') },
    // Das Testpanel ist bereits offen: "Zurück zum Testmodus" öffnet es in der App.
    // Segment 20, Triple, auslösen
    { at: 17.6, run: () => app.clickByText('#test-panel-body .segment-grid .btn', '20') },
    { at: 18.2, run: () => app.clickByText('#test-panel-body .multiplier-row .btn', 'Triple') },
    { at: 18.8, run: () => app.click('#test-panel-body .btn--primary') },
    // Bullseye als Präzisionsschlag – erst, wenn der Ball wirklich steht.
    { at: 24.4, run: () => app.clickByText('#test-panel-body .special-row .btn', 'Bullseye') },
    { at: 25.0, run: () => whenWaiting(app, () => app.click('#test-panel-body .btn--primary')) },
    // Sicherheitsnetz: fällt der Ball nicht, folgt ein weiterer Präzisionsschlag.
    { at: 28.6, run: () => whenWaiting(app, () => app.click('#test-panel-body .btn--primary')) },
    { at: 31.0, run: () => whenWaiting(app, () => app.click('#test-panel-body .btn--primary')) },
    // Panel schließen, damit die Bahn frei liegt
    { at: 32.4, run: () => app.click('#btn-test-panel') },
    // Bahn-Zusammenfassung wegklicken
    { at: 33.4, run: () => app.click('#hole-summary-card button') },
  ];
}

/**
 * Beschriftungen, die auf die App zeigen. Position in Bühnenkoordinaten,
 * damit sie unabhängig von der Kamerafahrt ruhig stehen.
 */
const CALLOUTS = [
  {
    at: 3.0, until: 6.0, x: 96, y: 300, w: 500, kind: '',
    badge: '1', label: 'Bridge oder eigene WebSocket-Adresse',
  },
  {
    at: 4.0, until: 6.0, x: 96, y: 392, w: 500, kind: 'is-amber',
    badge: '!', label: 'experimentell · noch nicht mit echten Daten getestet',
  },
  {
    at: 6.8, until: 8.6, x: 96, y: 620, w: 540, kind: 'is-amber',
    badge: '→', label: 'Die App sagt es selbst: bisher keine Nachricht empfangen',
  },
  {
    at: 11.2, until: 14.8, x: 1300, y: 300, w: 500, kind: 'is-mint',
    badge: '2', label: '1 bis 6 Spieler, Farbe und Reihenfolge',
  },
  {
    at: 12.9, until: 14.8, x: 1300, y: 424, w: 500, kind: 'is-mint',
    badge: '3', label: '3, 6 oder 9 Bahnen',
  },
  {
    at: 16.6, until: 18.8, x: 1300, y: 210, w: 480, kind: '',
    badge: '4', label: 'Testpanel: jeder Wurf ohne Scheibe',
  },
  {
    at: 19.4, until: 23.4, x: 1300, y: 210, w: 500, kind: 'is-mint',
    badge: 'T20', label: 'Richtung aus dem Segment, Stärke aus dem Triple',
  },
  {
    at: 25.4, until: 29.4, x: 1300, y: 210, w: 500, kind: 'is-mint',
    badge: 'BULL', label: 'Präzisionsschlag: Stärke passt zur Entfernung',
  },
  {
    at: 30.2, until: 33.2, x: 96, y: 250, w: 520, kind: 'is-mint',
    badge: '✓', label: 'Schläge, Par und Ergebnis je Bahn',
  },
  {
    at: 35.0, until: 37.0, x: 96, y: 176, w: 480, kind: '',
    badge: '5', label: 'Endstand mit Schlägen je Bahn und Rangliste',
  },
];

export const scene = {
  id: 's5-demo',
  start: 56.6,
  dur: 37.4,

  build(root) {
    /* Zwei Rahmen: Bedienung und Endstand. */
    const app = new AppFrame({ src: APP_SRC });
    const result = new AppFrame({ src: APP_SRC, cursor: false });

    root.append(app.device, result.device);

    /* Kopfzeile der Szene */
    const kicker = place(el('div', { class: 'kicker', text: 'Live in der App' }), { left: 140, top: 92 });

    /* Beschriftungen */
    const callouts = CALLOUTS.map((c) => {
      const node = place(el('div', { class: `callout ${c.kind}` }), { left: c.x, top: c.y });
      // Mehrzeilig statt aus dem Bild hinaus.
      node.style.whiteSpace = 'normal';
      node.style.maxWidth = `${c.w || 520}px`;
      node.style.alignItems = 'flex-start';
      node.append(
        el('span', { class: 'badge', text: c.badge, style: { flex: 'none' } }),
        el('span', { text: c.label }),
      );
      return { ...c, node };
    });

    root.append(kicker, ...callouts.map((c) => c.node));

    return { app, result, kicker, callouts, steps: null };
  },

  render(t, { back, front, refs, root }) {
    const { app, result } = refs;
    if (!refs.steps) refs.steps = buildSteps(app);

    /* ------------------------------ Hintergrund ----------------------------- */
    background(back, t + 120, { intensity: 0.3 });
    dotGrid(back, 0.08);

    /* --------------------------- Ablauf und App-Zeit ------------------------ */
    // Die App läuft synchron zur Szene – 1 Sekunde Video = 1 Sekunde App.
    runSteps(refs.steps, t, doneMain);
    app.advanceTo(t + 0.05);

    /* ------------------------------- Kamerafahrt ---------------------------- */
    const cam = cameraTrack(CAMERA, t);
    // Sehr feines Kamerazittern, damit die Fahrt nicht steril wirkt.
    const jitterX = drift(t * 0.5, 5) * 3;
    const jitterY = drift(t * 0.5, 15) * 2;
    app.focus(cam.fx, cam.fy, cam.scale, cam.sx + jitterX, cam.sy + jitterY);

    /* -------------------------------- Zeiger -------------------------------- */
    const pos = cursorTrack(app, CURSOR, t);
    if (pos) {
      const visible = t > 0.45 && t < 33.8 ? 1 : 0;
      app.setCursor(pos.x, pos.y, visible);

      // Klick-Welle jeweils kurz nach einem echten Klick.
      let ripple = { p: -1, x: 0, y: 0 };
      for (const step of refs.steps) {
        const p = at(t, step.at, 0.55);
        if (p > 0 && p < 1) ripple = { p, x: pos.x, y: pos.y };
      }
      app.setRipple(ripple.x, ripple.y, ripple.p);
    } else {
      app.setCursor(0, 0, 0);
    }

    /* ------------------------- Endstand im zweiten Rahmen ------------------- */
    // Der zweite Rahmen wird unsichtbar durch ein komplettes Spiel geschickt und
    // erst am Ende der Szene eingeblendet. Das kostet keine Videozeit, weil die
    // Zeit dort virtuell ist.
    const resultShow = at(t, 34.4, 0.9);
    if (t >= 33.8) {
      runSteps([{
        at: 33.8,
        run: () => {
          // Kurze Runde festlegen: drei Bahnen, zwei Spieler. Die Werte liegen
          // im gleichen localStorage wie in der App (Präfix "dartgolf:").
          try {
            const store = result.win.localStorage;
            store.setItem('dartgolf:settings', JSON.stringify({
              holeCount: 3, controlMode: 'simple', soundEnabled: false,
              trainingMode: true, useCoordinates: false, autoReconnect: true,
            }));
            store.setItem('dartgolf:players', JSON.stringify([
              { name: 'Nina', color: '#3ddc97' },
              { name: 'Tobi', color: '#ff5d8f' },
            ]));
          } catch { /* ohne Speicher gelten die Voreinstellungen */ }

          result.advanceTo(0.4);
          result.click('#btn-start-game');
          result.advanceTo(0.9);
          result.click('#btn-setup-start');
          result.advanceTo(2.0);

          // Bis zum Endstand: nur werfen, wenn die App auch einen Wurf erwartet.
          let clock = 2.0;
          for (let i = 0; i < 260; i += 1) {
            const doc = result.doc;
            if (!doc) break;
            if (!doc.getElementById('screen-result').hasAttribute('hidden')) break;

            const summaryButton = doc.querySelector('#hole-summary:not([hidden]) button');
            if (summaryButton) {
              summaryButton.click();
              clock += 0.4;
            } else {
              const prompt = doc.getElementById('stage-prompt');
              const waiting = prompt && prompt.textContent.indexOf('Bitte werfen') === 0;
              if (waiting) {
                // Abwechselnd Präzisionsschlag und Zufallswurf: der reine
                // Bullseye käme auf Bahn 2 nicht am Mittelblock vorbei.
                if (i % 2 === 0) {
                  result.key('b');
                  result.key(' ');
                } else {
                  result.key('r');
                }
                clock += 1.6;
              } else {
                clock += 0.5;
              }
            }
            result.advanceTo(clock);
          }
          refs.resultClock = clock;
        },
      }], t, doneResult);
      result.advanceTo((refs.resultClock || 2) + (t - 33.8));
    }

    // Der Bedienrahmen weicht dem Endstand.
    const mainOpacity = 1 - resultShow;
    app.device.style.opacity = String(mainOpacity);
    app.device.style.filter = resultShow > 0.02 ? `blur(${resultShow * 14}px)` : 'none';

    result.device.style.opacity = String(resultShow);
    result.device.style.filter = resultShow < 0.98 ? `blur(${(1 - resultShow) * 16}px)` : 'none';
    result.focus(960, 540, lerp(0.7, 0.78, resultShow), 960, 540);

    /* ------------------------------ Beschriftungen -------------------------- */
    refs.callouts.forEach((c) => {
      const inP = easeOutQuint(at(t, c.at, 0.5));
      const outP = easeInCubic(at(t, c.until, 0.4));
      const o = inP * (1 - outP);
      set(c.node, {
        x: (1 - inP) * -26,
        y: outP * -14,
        opacity: o,
        blur: (1 - inP) * 6,
      });
    });

    set(refs.kicker, { opacity: ease(t, 0.2, 0.6) * (1 - ease(t, 9.0, 0.6)) });

    /* --------------------------- Akzent beim Einlochen ---------------------- */
    // Wenn der Ball fällt, betont ein Ring das Ereignis (Zeitpunkt aus dem Ablauf).
    shockRing(front, 1300, 452, at(t, 29.3, 1.1), { color: COLORS.mint, maxRadius: 420, width: 5 });
    if (t > 29.1 && t < 30.7) {
      bloom(front, 1300, 452, 520, COLORS.mint, 0.12 * (1 - at(t, 29.3, 1.4)));
    }
  },
};
