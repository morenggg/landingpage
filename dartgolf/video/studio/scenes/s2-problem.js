/**
 * Szene 2 – Das Problem
 *
 * Eine Kamera-Erkennung liefert präzise Treffer: Segment, Multiplikator,
 * Punktwert. Für ein Spiel ist die Zahl allein aber nur der Anfang.
 *
 * Die Szene zeigt erkannte Würfe, die als Datenpakete in eine Punktespalte
 * laufen – und dann die Frage, was daraus werden könnte.
 *
 * Dauer: 12,5 s (Start 9,5 s)
 */

import {
  at, ease, clamp, lerp, alpha, easeOutCubic, easeInCubic, easeOutQuint,
  easeInOutCubic, drift,
} from '../lib/easing.js';
import {
  background, dotGrid, dust, dartRing, makeLink, drawLink, drawPacket,
  glowDot, bloom, shockRing, text, withCamera, W, H, COLORS,
} from '../lib/draw.js';
import { el, splitWords, set, place } from '../lib/ui.js';
import { revealStagger, camera } from '../lib/timeline.js';

/** Mittelpunkt des Segmentrings. */
const RING = { x: 566, y: 654 };
const RING_R = 206;

/** Ziel der Datenpakete: die Punktespalte. */
const SCORE = { x: 1400, y: 596 };

/** Die drei gezeigten Würfe mit ihren Punktwerten. */
const THROWS = [
  { notation: 'T20', points: 60, segment: 20, delay: 0.0, color: COLORS.mint },
  { notation: 'D5', points: 10, segment: 5, delay: 1.05, color: COLORS.cyan },
  { notation: 'BULL', points: 50, segment: null, delay: 2.1, color: COLORS.magenta },
];

/** Startzeit des ersten Wurfs innerhalb der Szene. */
const FIRST = 2.0;
/** Flugdauer eines Pakets. */
const FLIGHT = 0.95;

export const scene = {
  id: 's2-problem',
  start: 9.5,
  dur: 12.5,

  build(root) {
    /* Kopfzeile oben links */
    const kicker = place(el('div', { class: 'kicker', text: 'Ausgangslage' }), { left: 140, top: 158 });
    const head = place(el('div', {}), { left: 140, top: 202, width: 1200 });
    const headWords = splitWords('Die Erkennung ist präzise.', { class: 'h2' });
    head.appendChild(headWords.node);

    const sub = place(el('div', {}), { left: 140, top: 316, width: 980 });
    const subWords = splitWords(
      'Segment, Multiplikator, Punktwert – Wurf für Wurf.',
      { class: 'lead' },
    );
    sub.appendChild(subWords.node);

    /* Punktespalte rechts: sieht aus wie eine nüchterne Zählanzeige. */
    const scoreCard = place(el('div', { class: 'card' }), {
      left: SCORE.x - 200, top: SCORE.y - 226, width: 400,
    });
    scoreCard.style.padding = '30px 34px';
    const scoreTitle = el('div', {
      class: 'mono',
      text: 'ERKANNT',
      style: { letterSpacing: '0.3em', fontSize: '20px', marginBottom: '22px' },
    });
    const rows = THROWS.map((thr) => {
      const row = el('div', {
        style: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.08)',
        },
      }, [
        el('span', {
          text: thr.notation,
          style: {
            fontFamily: 'var(--mono)', fontSize: '34px', fontWeight: '700', color: thr.color,
          },
        }),
        el('span', {
          text: `${thr.points}`,
          style: { fontSize: '44px', fontWeight: '900' },
        }),
      ]);
      return row;
    });
    const total = el('div', {
      style: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '20px',
      },
    }, [
      el('span', { class: 'mono', text: 'Summe', style: { fontSize: '24px' } }),
      el('span', { id: 's2-total', text: '0', style: { fontSize: '58px', fontWeight: '900', color: COLORS.mint } }),
    ]);
    scoreCard.append(scoreTitle, ...rows, total);

    /* Der wunde Punkt: die Zahl ist das Ende der Kette. */
    const dead = place(el('div', {}), { left: SCORE.x - 220, top: SCORE.y + 268, width: 440 });
    dead.style.textAlign = 'center';
    const deadWords = splitWords('Und dann?', { class: 'h3' });
    deadWords.node.style.color = COLORS.dim;
    dead.appendChild(deadWords.node);

    /* Schlussfrage, die die ganze Bühne übernimmt. */
    const question = place(el('div', {}), { left: 0, top: 420, width: W });
    question.style.textAlign = 'center';
    const qWords = splitWords('Was, wenn jeder Wurf einen Ball bewegt?', { class: 'h2' });
    question.appendChild(qWords.node);

    root.append(kicker, head, sub, scoreCard, dead, question);

    return {
      kicker, head, sub, scoreCard, dead, question,
      headWords: headWords.words,
      subWords: subWords.words,
      rows,
      total,
      totalValue: total.querySelector('#s2-total'),
      deadWords: deadWords.words,
      qWords: qWords.words,
    };
  },

  render(t, { back, front, refs, root }) {
    /* --------------------------------- Kamera ------------------------------- */
    // Zuerst die Kamera festlegen: DOM-Ebene und Canvas bewegen sich gemeinsam.
    const push = 1 + easeInOutCubic(at(t, 0, 9)) * 0.03;
    const cam = camera(root, {
      x: drift(t * 0.4, 3) * 5,
      y: drift(t * 0.4, 8) * 4,
      scale: push,
      ox: 960,
      oy: 540,
    });

    /* ------------------------------ Hintergrund ----------------------------- */
    background(back, t + 20, { intensity: 0.5 });
    dotGrid(back, 0.13, { offsetY: -t * 5 });
    dust(back, t + 20, { opacity: 0.14 });

    // Ab der Frage wird die Bühne aufgeräumt: alles Linke verlässt das Bild.
    const clearOut = easeInOutCubic(at(t, 8.5, 0.9));

    /* ------------------------------ Segmentring ----------------------------- */
    const ringIn = ease(t, 0.35, 1.5, easeOutQuint);
    const activeSegments = THROWS
      .filter((thr) => t >= FIRST + thr.delay && t < FIRST + thr.delay + 1.5)
      .map((thr) => thr.segment)
      .filter((s) => s !== null);

    if (ringIn > 0.01 && clearOut < 0.99) {
      withCamera(back, cam, () => {
      back.save();
      back.globalAlpha = ringIn * (1 - clearOut);
      const ringScale = lerp(0.86, 1, ringIn) * (1 - clearOut * 0.18);
      back.translate(RING.x, RING.y);
      back.scale(ringScale, ringScale);
      back.translate(-RING.x, -RING.y);
      dartRing(back, RING.x, RING.y, RING_R, {
        reveal: ringIn,
        highlight: activeSegments,
        labelOpacity: ringIn,
        color: COLORS.cyan,
        ringOpacity: 1,
      });
      back.restore();
      });
    }

    /* --------------------------- Erkannte Würfe ----------------------------- */
    // Jeder Wurf: kurzer Einschlag im Ring, dann läuft ein Paket zur Anzeige.
    let sum = 0;
    withCamera(front, cam, () => {
    THROWS.forEach((thr, i) => {
      const t0 = FIRST + thr.delay;
      const p = at(t, t0, FLIGHT);

      // Trefferposition am Ring (Bull in der Mitte).
      const angle = thr.segment === null
        ? 0
        : (([20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]
          .indexOf(thr.segment)) * 18);
      const rad = ((angle - 90) * Math.PI) / 180;
      const rr = thr.segment === null ? 0 : RING_R * 0.82;
      const from = {
        x: RING.x + Math.cos(rad) * rr,
        y: RING.y + Math.sin(rad) * rr,
      };

      if (t >= t0 - 0.25 && clearOut < 0.99) {
        // Einschlag-Ring am Trefferpunkt
        shockRing(front, from.x, from.y, at(t, t0 - 0.2, 0.7), {
          color: thr.color, maxRadius: 190, width: 4,
        });
        glowDot(front, from.x, from.y, 7, thr.color, 1 - at(t, t0, 2.0));
      }

      // Verbindung und Paket
      if (p > 0 && clearOut < 0.99) {
        const link = makeLink(from, { x: SCORE.x - 200, y: SCORE.y - 158 + i * 82 }, 0.42);
        drawLink(front, link, clamp(p * 1.35), {
          color: thr.color, width: 2, opacity: (1 - Math.max(0, p - 0.7) / 0.3) * 0.35 * (1 - clearOut),
        });
        if (p < 1) {
          drawPacket(front, link, p, {
            color: thr.color, size: 11, opacity: 1 - clearOut, label: thr.notation,
          });
        }
      }

      // Zeile in der Anzeige erscheint, sobald das Paket angekommen ist.
      const arrive = at(t, t0 + FLIGHT - 0.08, 0.42);
      set(refs.rows[i], {
        x: (1 - easeOutQuint(arrive)) * 40,
        opacity: easeOutQuint(arrive) * (1 - clearOut),
      });
      if (arrive > 0.5) sum += thr.points;
    });
    });

    // Summe zählt sichtbar hoch.
    const shownSum = Math.round(sum);
    if (refs.totalValue.textContent !== String(shownSum)) {
      refs.totalValue.textContent = String(shownSum);
    }
    set(refs.total, { opacity: ease(t, FIRST + 2.9, 0.5) * (1 - clearOut) });

    /* ------------------------------ Textblöcke ------------------------------ */
    revealStagger(refs.headWords, t, {
      start: 0.25, step: 0.07, dur: 0.85, y: 40, blur: 10, ease: easeOutQuint,
      outStart: 8.4, outDur: 0.6,
    });
    revealStagger(refs.subWords, t, {
      start: 0.6, step: 0.05, dur: 0.8, y: 26, blur: 8,
      outStart: 8.3, outDur: 0.5,
    });

    // Karte samt Ring fährt zur Frage hin aus dem Bild.
    set(refs.scoreCard, {
      x: 60 * (1 - ease(t, 1.4, 1.0, easeOutQuint)) + clearOut * 90,
      y: -clearOut * 40,
      opacity: ease(t, 1.4, 0.8) * (1 - clearOut),
      scale: 1 - clearOut * 0.06,
      blur: clearOut * 12,
    });

    revealStagger(refs.deadWords, t, {
      start: 6.0, step: 0.09, dur: 0.9, y: 30, blur: 8,
      outStart: 8.3, outDur: 0.5,
    });

    // Der Ring wird beim Aufräumen weich weggeschoben (per Canvas-Alpha oben).
    set(refs.kicker, {
      y: -clearOut * 26,
      opacity: ease(t, 0.1, 0.6) * (1 - clearOut),
    });

    /* ------------------------------- Die Frage ------------------------------ */
    revealStagger(refs.qWords, t, {
      start: 9.15, step: 0.075, dur: 0.9, y: 56, scale: 0.94, blur: 14, ease: easeOutQuint,
      outStart: 11.9, outDur: 0.6,
    });

    // Licht hinter der Frage, damit sie Gewicht bekommt.
    const qGlow = ease(t, 9.2, 1.4);
    if (qGlow > 0.01) {
      bloom(back, 960, 470, 900, COLORS.mint, 0.1 * qGlow * (1 - ease(t, 11.9, 0.6)));
    }

  },
};
