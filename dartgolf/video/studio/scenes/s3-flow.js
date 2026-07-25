/**
 * Szene 3 – Datenfluss und Architektur
 *
 * Der Kern der Anwendung: Trefferquelle und Spiel sind getrennt. Jede Quelle
 * liefert dasselbe Ereignis `DartThrow`; alles dahinter kennt keine API mehr.
 *
 * Die Szene zeigt beide Quellen ehrlich unterschiedlich:
 *   - Testmodus: durchgezogen, aktiv, Pakete laufen.
 *   - Autodarts: gestrichelt, gelb, "vorbereitet" – das Paket bleibt am Tor
 *     stehen, weil die Anbindung noch nicht mit echten Daten geprüft ist.
 *
 * Dauer: 19 s (Start 22 s)
 */

import {
  at, ease, clamp, lerp, alpha, easeOutCubic, easeInCubic, easeOutQuint,
  easeInOutCubic, easeOutBack, drift,
} from '../lib/easing.js';
import {
  background, dotGrid, dust, makeLink, drawLink, drawPacket, glowDot, bloom,
  shockRing, roundRectPath, text, withCamera, W, H, COLORS,
} from '../lib/draw.js';
import { el, splitWords, set, place, ICONS } from '../lib/ui.js';
import { revealStagger, camera } from '../lib/timeline.js';

/* --------------------------- Knoten der Kette ---------------------------- */

/**
 * Alle Knoten mit Position (Mittelpunkt), Größe und Beschriftung.
 * Die Reihenfolge entspricht dem Datenfluss.
 */
const NODES = {
  autodarts: {
    x: 250, y: 424, w: 316, h: 172, accent: COLORS.amber,
    title: 'Autodarts', note: 'vorbereitet · ungetestet', icon: ICONS.plug, dashed: true,
  },
  test: {
    x: 250, y: 700, w: 316, h: 156, accent: COLORS.mint,
    title: 'Testmodus', note: 'aktiv', icon: ICONS.bolt,
  },
  event: {
    x: 736, y: 562, w: 314, h: 184, accent: COLORS.cyan,
    title: 'DartThrow', note: 'ein Format, alle Quellen', icon: ICONS.code, big: true,
  },
  filter: {
    x: 1156, y: 562, w: 268, h: 160, accent: COLORS.violet,
    title: 'Zugfilter', note: 'ID · Cooldown', icon: ICONS.shield,
  },
  physics: {
    x: 1466, y: 562, w: 252, h: 160, accent: COLORS.mint,
    title: 'Physik', note: 'Ball · Bande', icon: ICONS.target,
  },
  hud: {
    x: 1752, y: 562, w: 220, h: 160, accent: COLORS.cyan,
    title: 'Anzeige', note: 'HUD · Punkte', icon: ICONS.screens,
  },
};

/** Zeilen der JSON-Karte – das echte Format aus src/input/dart-provider.js. */
const JSON_LINES = [
  ['id', '"throw-001"'],
  ['segment', '20'],
  ['multiplier', '3'],
  ['score', '60'],
  ['notation', '"T20"'],
  ['source', '"test"'],
];

/** Verkettet mehrere Verbindungen zu einem durchgehenden Weg. */
function chain(links) {
  const fn = (p) => {
    const n = links.length;
    const q = clamp(p) * n;
    const index = Math.min(n - 1, Math.floor(q));
    return links[index](q - index);
  };
  return fn;
}

/** Randpunkt eines Knotens (rechts / links / oben / unten). */
function edge(node, side) {
  if (side === 'right') return { x: node.x + node.w / 2, y: node.y };
  if (side === 'left') return { x: node.x - node.w / 2, y: node.y };
  if (side === 'top') return { x: node.x, y: node.y - node.h / 2 };
  return { x: node.x, y: node.y + node.h / 2 };
}

/** Pakete, die im Verlauf der Szene durch die Kette laufen. */
const PACKETS = [
  { start: 3.4, label: 'T20', color: COLORS.mint, dur: 3.4 },
  { start: 5.0, label: 'BULL', color: COLORS.cyan, dur: 3.4 },
  { start: 6.5, label: 'MISS', color: COLORS.dim, dur: 3.4 },
  // Ein doppelt empfangener Treffer wird vom Zugfilter abgewiesen.
  { start: 8.1, label: 'T20', color: COLORS.magenta, dur: 3.4, duplicate: true },
];

export const scene = {
  id: 's3-flow',
  start: 22,
  dur: 19,

  build(root) {
    const kicker = place(el('div', { class: 'kicker', text: 'Architektur' }), { left: 140, top: 138 });
    const head = place(el('div', {}), { left: 140, top: 180, width: 1500 });
    const headWords = splitWords('Trefferquelle und Spiel sind getrennt.', { class: 'h2' });
    head.appendChild(headWords.node);

    /* Knotenkarten als DOM – scharfe Schrift, Bewegung per transform. */
    const cards = {};
    for (const [key, node] of Object.entries(NODES)) {
      const card = place(el('div', { class: 'card' }), {
        left: node.x - node.w / 2, top: node.y - node.h / 2, width: node.w, height: node.h,
      });
      card.style.padding = '22px 24px';
      card.style.borderRadius = '22px';
      card.style.setProperty('--accent', node.accent);
      card.style.borderColor = alpha(node.accent, node.dashed ? 0.36 : 0.26);
      if (node.dashed) card.style.borderStyle = 'dashed';

      const iconWrap = el('div', {
        html: node.icon,
        style: { width: '40px', height: '40px', marginBottom: '10px' },
      });
      const title = el('div', {
        text: node.title,
        style: {
          fontSize: node.big ? '46px' : '38px',
          fontWeight: '700',
          letterSpacing: '-0.01em',
          lineHeight: '1.05',
        },
      });
      const note = el('div', {
        text: node.note,
        style: {
          fontFamily: 'var(--mono)',
          fontSize: '19px',
          color: node.dashed ? '#ffe0a3' : 'var(--dim)',
          marginTop: '8px',
          letterSpacing: '0.02em',
        },
      });
      card.append(iconWrap, title, note);
      cards[key] = card;
      root.appendChild(card);
    }

    /* JSON-Karte: das Ereignis, wie es wirklich aussieht. */
    const jsonCard = place(el('div', { class: 'card' }), { left: 1236, top: 668, width: 452 });
    jsonCard.style.padding = '24px 28px';
    const jsonTitle = el('div', {
      class: 'mono',
      text: 'DartThrow',
      style: { fontSize: '18px', letterSpacing: '0.28em', marginBottom: '14px', color: COLORS.cyan },
    });
    const jsonRows = JSON_LINES.map(([key, value]) => el('div', {
      class: 'code',
      style: {
        fontSize: '20px', lineHeight: '1.52', whiteSpace: 'pre',
        display: 'flex', justifyContent: 'space-between', gap: '18px',
      },
    }, [
      el('span', { text: `${key}:`, style: { color: COLORS.cyan } }),
      el('span', {
        text: value,
        style: { color: /^"/.test(value) ? COLORS.mint : COLORS.amber },
      }),
    ]));
    jsonCard.append(jsonTitle, ...jsonRows);
    root.appendChild(jsonCard);

    /* Hinweis am Autodarts-Zweig – ehrlich und deutlich. */
    const gate = place(el('div', { class: 'callout is-amber' }), { left: 96, top: 528 });
    gate.append(
      el('span', { class: 'badge', text: '!' }),
      el('span', { text: 'noch nicht mit echten Daten getestet' }),
    );

    /* Schlussaussage der Szene. */
    const claim = place(el('div', {}), { left: 0, top: 440, width: W });
    claim.style.textAlign = 'center';
    const claimWords = splitWords('Das Spiel kennt keine API. Es kennt nur DartThrow.', { class: 'h2' });
    claim.appendChild(claimWords.node);

    root.append(kicker, head, gate, claim);

    return {
      kicker, head, headWords: headWords.words, cards, jsonCard, jsonRows, gate,
      claim, claimWords: claimWords.words,
    };
  },

  render(t, { back, front, refs, root }) {
    /* --------------------------------- Kamera ------------------------------- */
    // Sehr langsame Fahrt nach links, damit die Kette "abgelaufen" wirkt.
    const pan = easeInOutCubic(at(t, 1, 15)) * -46;
    const camPush = 1 + easeInOutCubic(at(t, 1, 16)) * 0.035;
    const cam = camera(root, {
      x: pan + drift(t * 0.3, 4) * 4,
      y: drift(t * 0.3, 12) * 3,
      scale: camPush,
      ox: 960,
      oy: 548,
    });

    // Ab diesem Zeitpunkt verlässt das Diagramm das Bild und die Aussage kommt.
    const fade = 1 - ease(t, 13.5, 0.7);

    /* ------------------------------ Hintergrund ----------------------------- */
    background(back, t + 44, { intensity: 0.42 });
    dotGrid(back, 0.12, { offsetX: t * 4 });
    dust(back, t + 44, { opacity: 0.1 });

    /* ------------------------------- Kopfzeile ------------------------------ */
    set(refs.kicker, { opacity: ease(t, 0.1, 0.5) * (1 - ease(t, 13.4, 0.6)) });
    revealStagger(refs.headWords, t, {
      start: 0.2, step: 0.06, dur: 0.85, y: 38, blur: 10, ease: easeOutQuint,
      outStart: 13.4, outDur: 0.7,
    });

    /* -------------------------------- Knoten -------------------------------- */
    // Erscheinen in Flussrichtung: Quellen, Ereignis, dann die Kette.
    const order = ['test', 'autodarts', 'event', 'filter', 'physics', 'hud'];
    const nodeIn = {};
    order.forEach((key, i) => {
      const p = easeOutBack(clamp(at(t, 0.75 + i * 0.16, 0.85)), 1.1);
      nodeIn[key] = p;
      const out = easeInCubic(at(t, 13.5 + i * 0.04, 0.7));
      set(refs.cards[key], {
        y: (1 - p) * 34 - out * 26,
        scale: lerp(0.9, 1, p) * (1 - out * 0.05),
        opacity: clamp(p) * (1 - out),
        blur: (1 - clamp(p)) * 9,
      });
    });

    /* ----------------------------- Verbindungen ----------------------------- */
    // Verbindungen, Pakete und Lichter laufen mit der Kamera mit.
    withCamera(front, cam, () => {
    const linkTestEvent = makeLink(edge(NODES.test, 'right'), { x: NODES.event.x - NODES.event.w / 2, y: NODES.event.y + 34 }, 0.5);
    const linkAutoEvent = makeLink(edge(NODES.autodarts, 'right'), { x: NODES.event.x - NODES.event.w / 2, y: NODES.event.y - 34 }, 0.5);
    const linkEventFilter = makeLink(edge(NODES.event, 'right'), edge(NODES.filter, 'left'), 0.42);
    const linkFilterPhysics = makeLink(edge(NODES.filter, 'right'), edge(NODES.physics, 'left'), 0.42);
    const linkPhysicsHud = makeLink(edge(NODES.physics, 'right'), edge(NODES.hud, 'left'), 0.42);


    // Testmodus: durchgezogen und in Mint – dieser Weg funktioniert.
    drawLink(front, linkTestEvent, ease(t, 1.5, 0.7), {
      color: COLORS.mint, width: 3, opacity: 0.5 * fade,
    });
    // Autodarts: gestrichelt und gelb – vorbereitet, aber ungeprüft.
    drawLink(front, linkAutoEvent, ease(t, 1.7, 0.7), {
      color: COLORS.amber, width: 3, opacity: 0.42 * fade, dash: true, dashPhase: t * 26,
    });
    drawLink(front, linkEventFilter, ease(t, 2.2, 0.6), { color: '#6f8ba3', width: 3, opacity: 0.55 * fade });
    drawLink(front, linkFilterPhysics, ease(t, 2.45, 0.6), { color: '#6f8ba3', width: 3, opacity: 0.55 * fade });
    drawLink(front, linkPhysicsHud, ease(t, 2.7, 0.6), { color: '#6f8ba3', width: 3, opacity: 0.55 * fade });

    /* ------------------------- Pakete durch die Kette ----------------------- */
    const fullPath = chain([linkTestEvent, linkEventFilter, linkFilterPhysics, linkPhysicsHud]);

    for (const packet of PACKETS) {
      const p = at(t, packet.start, packet.dur);
      if (p <= 0 || p >= 1) continue;

      if (packet.duplicate) {
        // Doppelter Treffer: läuft bis zum Zugfilter und wird abgewiesen.
        const stopAt = 0.5; // Position des Zugfilters auf dem Gesamtweg
        if (p < stopAt) {
          drawPacket(front, fullPath, p, {
            color: packet.color, size: 11, opacity: fade, label: packet.label,
          });
        } else {
          // Abprall nach oben, mit Drehung und Ausblenden.
          const q = clamp((p - stopAt) / 0.34);
          const base = fullPath(stopAt);
          const x = base.x + q * 210;
          const y = base.y - Math.sin(q * Math.PI * 0.85) * 150 - q * 30;
          const o = (1 - q) * fade;

          front.save();
          front.globalAlpha = o;
          glowDot(front, x, y, 9, packet.color, 1);
          // Kreuz als Zeichen der Abweisung
          front.strokeStyle = alpha(packet.color, o);
          front.lineWidth = 4;
          front.translate(x, y);
          front.rotate(q * 3.2);
          front.beginPath();
          front.moveTo(-13, -13); front.lineTo(13, 13);
          front.moveTo(13, -13); front.lineTo(-13, 13);
          front.stroke();
          front.restore();

          if (q < 0.85) {
            text(front, 'Duplikat', x, y - 46, {
              font: '700 24px "JetBrains Mono", monospace',
              color: packet.color, align: 'center', opacity: o, glow: 14,
            });
          }
          shockRing(front, base.x, base.y, q * 1.1, { color: packet.color, maxRadius: 130, width: 3 });
        }
      } else {
        drawPacket(front, fullPath, p, {
          color: packet.color, size: 11, opacity: fade, label: p < 0.42 ? packet.label : null,
        });
        // Aufleuchten der Knoten, wenn ein Paket sie erreicht.
        [0.33, 0.5, 0.75, 1].forEach((mark, i) => {
          const near = 1 - clamp(Math.abs(p - mark) / 0.07);
          if (near > 0.02) {
            const node = [NODES.event, NODES.filter, NODES.physics, NODES.hud][i];
            bloom(front, node.x, node.y, 240, node.accent, 0.2 * near * fade);
          }
        });
      }
    }

    /* -------------------------- Autodarts-Paket am Tor ---------------------- */
    // Es startet, kommt aber nicht durch: das ist der ehrliche Stand.
    const gateP = at(t, 11.0, 2.6);
    if (gateP > 0 && gateP < 1) {
      const travel = Math.min(0.62, easeOutCubic(clamp(gateP * 1.9)) * 0.62);
      drawPacket(front, linkAutoEvent, travel, {
        color: COLORS.amber, size: 10, opacity: (1 - clamp((gateP - 0.72) / 0.28)) * fade,
      });
      // Tor als senkrechte Schranke im Autodarts-Zweig
      const gatePos = linkAutoEvent(0.66);
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      front.save();
      front.strokeStyle = alpha(COLORS.amber, (0.35 + pulse * 0.35) * fade);
      front.lineWidth = 4;
      front.setLineDash([12, 10]);
      front.beginPath();
      front.moveTo(gatePos.x, gatePos.y - 54);
      front.lineTo(gatePos.x, gatePos.y + 54);
      front.stroke();
      front.restore();
    }

    set(refs.gate, {
      y: (1 - ease(t, 11.2, 0.7, easeOutQuint)) * 18,
      opacity: ease(t, 11.2, 0.7) * (1 - ease(t, 13.3, 0.5)),
    });

    });

    /* ------------------------------- JSON-Karte ----------------------------- */
    const jsonIn = ease(t, 4.4, 0.8, easeOutQuint);
    const jsonOut = easeInCubic(at(t, 13.4, 0.7));
    set(refs.jsonCard, {
      y: (1 - jsonIn) * 40 - jsonOut * 30,
      opacity: jsonIn * (1 - jsonOut),
      scale: lerp(0.96, 1, jsonIn),
      blur: (1 - jsonIn) * 8,
    });
    // Zeilen erscheinen nacheinander, als würde das Objekt aufgebaut.
    revealStagger(refs.jsonRows, t, {
      start: 4.6, step: 0.09, dur: 0.4, y: 0, x: -18, blur: 0,
    });

    /* ---------------------------- Schlussaussage ---------------------------- */
    revealStagger(refs.claimWords, t, {
      start: 14.4, step: 0.07, dur: 0.95, y: 48, scale: 0.96, blur: 14, ease: easeOutQuint,
      outStart: 18.0, outDur: 0.7,
    });

    // Licht hinter der Aussage
    const claimGlow = ease(t, 14.5, 1.3) * (1 - ease(t, 18.0, 0.7));
    if (claimGlow > 0.01) bloom(back, 960, 490, 880, COLORS.cyan, 0.1 * claimGlow);

    // Die ganze Kette leuchtet einmal durch, während die Aussage steht.
    const sweepP = at(t, 11.8, 1.6);
    if (sweepP > 0 && sweepP < 1) {
      const x = lerp(200, 1800, easeInOutCubic(sweepP));
      bloom(front, x, 548, 340, COLORS.cyan, 0.16 * Math.sin(sweepP * Math.PI) * fade);
    }

  },
};
