/**
 * Szene 4 – Die Steuerung
 *
 * Der Kniff des Spiels: die Richtung kommt aus der Lage des Segments auf der
 * Scheibe, die Stärke aus dem Multiplikator. Beides ist eine Formel, kein
 * Regelwerk aus zwanzig Sonderfällen.
 *
 *     Winkel = Index in der Segmentfolge × 18°
 *
 * Die Szene zeigt vier Segmente (20 · 6 · 3 · 11) mit dem zugehörigen
 * Richtungspfeil und danach die Stärkestufen Single/Double/Triple/Bull.
 *
 * Dauer: 15 s (Start 41,6 s)
 */

import {
  at, ease, clamp, lerp, alpha, easeOutCubic, easeInCubic, easeOutQuint,
  easeInOutCubic, easeOutBack, drift,
} from '../lib/easing.js';
import {
  background, dotGrid, dust, dartRing, directionArrow, glowDot, bloom,
  shockRing, roundRectPath, text, withCamera, BOARD_ORDER, W, H, COLORS,
} from '../lib/draw.js';
import { el, splitWords, set, place } from '../lib/ui.js';
import { revealStagger, camera } from '../lib/timeline.js';

/** Scheibe links, Erklärung rechts. */
const RING = { x: 570, y: 620 };
const RING_R = 250;

/**
 * Die vier gezeigten Richtungen. `angle` wird aus der Segmentfolge berechnet,
 * nicht von Hand gesetzt – genau wie im Spiel.
 */
const DEMOS = [
  { segment: 20, label: 'nach vorn', at: 1.5 },
  { segment: 6, label: 'nach rechts', at: 3.0 },
  { segment: 3, label: 'nach hinten', at: 4.5 },
  { segment: 11, label: 'nach links', at: 6.0 },
].map((d) => ({ ...d, angle: BOARD_ORDER.indexOf(d.segment) * 18 }));

/** Die Stärkestufen, wie in src/config.js (SHOT_POWER). */
const POWERS = [
  { name: 'Single', value: 420, share: 0.48, color: COLORS.dim },
  { name: 'Double', value: 640, share: 0.73, color: COLORS.cyan },
  { name: 'Triple', value: 880, share: 1.0, color: COLORS.mint },
  { name: 'Bull', value: null, share: 0.8, color: COLORS.magenta, note: 'zielt aufs Loch' },
];

/** Zeitpunkt, ab dem die Szene von Richtung auf Stärke umschaltet. */
const POWER_AT = 8.0;

export const scene = {
  id: 's4-control',
  start: 41.6,
  dur: 15,

  build(root) {
    const kicker = place(el('div', { class: 'kicker', text: 'Steuerung' }), { left: 140, top: 138 });
    const head = place(el('div', {}), { left: 140, top: 180, width: 1400 });
    const headWords = splitWords('Das Segment ist die Richtung.', { class: 'h2' });
    head.appendChild(headWords.node);

    /* Formelkarte rechts oben: die eine Regel. */
    const formula = place(el('div', { class: 'card' }), { left: 1046, top: 330, width: 700 });
    formula.style.padding = '34px 38px';
    const formulaTitle = el('div', {
      class: 'mono',
      text: 'EINE FORMEL',
      style: { fontSize: '18px', letterSpacing: '0.3em', color: COLORS.mint, marginBottom: '18px' },
    });
    const formulaBody = el('div', {
      style: {
        fontFamily: 'var(--mono)', fontSize: '34px', fontWeight: '500',
        color: '#dceffb', lineHeight: '1.4',
      },
    }, [
      el('span', { text: 'Winkel = ' }),
      el('span', { text: 'Index', style: { color: COLORS.cyan } }),
      el('span', { text: ' × ' }),
      el('span', { text: '18°', style: { color: COLORS.amber } }),
    ]);
    const formulaNote = el('div', {
      class: 'mono',
      text: 'Segmentfolge ab der 20, im Uhrzeigersinn',
      style: { fontSize: '20px', color: 'var(--dim)', marginTop: '16px' },
    });
    // Die echte Segmentfolge als laufende Zeile.
    const orderRow = el('div', {
      style: {
        display: 'flex', flexWrap: 'wrap', gap: '9px', marginTop: '22px',
      },
    }, BOARD_ORDER.map((n) => el('span', {
      text: String(n),
      style: {
        fontFamily: 'var(--mono)', fontSize: '21px', padding: '5px 11px',
        border: '1px solid rgba(255,255,255,0.10)', borderRadius: '9px',
        color: 'var(--dim)', minWidth: '46px', textAlign: 'center',
      },
    })));
    formula.append(formulaTitle, formulaBody, formulaNote, orderRow);

    /* Anzeige der aktuell gezeigten Richtung. */
    const readout = place(el('div', {}), { left: 1046, top: 700, width: 760 });
    const readSeg = el('div', {
      text: '20',
      style: {
        fontSize: '132px', fontWeight: '900', lineHeight: '0.9', color: COLORS.mint,
      },
    });
    const readLabel = el('div', {
      text: 'nach vorn',
      style: { fontSize: '46px', fontWeight: '700', color: '#dceffb', marginTop: '6px' },
    });
    const readAngle = el('div', {
      class: 'mono',
      text: '0°',
      style: { fontSize: '26px', color: 'var(--dim)', marginTop: '10px' },
    });
    readout.append(readSeg, readLabel, readAngle);

    /* Zweiter Teil: Stärke aus dem Multiplikator. */
    const head2 = place(el('div', {}), { left: 140, top: 180, width: 1400 });
    const head2Words = splitWords('Der Multiplikator ist die Stärke.', { class: 'h2' });
    head2.appendChild(head2Words.node);

    const bars = POWERS.map((power, i) => {
      const row = place(el('div', {}), { left: 1046, top: 356 + i * 128, width: 720 });
      const label = el('div', {
        style: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          marginBottom: '12px',
        },
      }, [
        el('span', {
          text: power.name,
          style: { fontSize: '40px', fontWeight: '700', color: '#eaf2f8' },
        }),
        el('span', {
          class: 'mono',
          text: power.value ? `${power.value}` : power.note,
          style: { fontSize: '24px', color: power.color },
        }),
      ]);
      const track = el('div', {
        style: {
          height: '14px', borderRadius: '999px',
          background: 'rgba(255,255,255,0.07)', overflow: 'hidden',
        },
      });
      const fill = el('div', {
        style: {
          height: '100%', width: '0%', borderRadius: '999px',
          background: `linear-gradient(90deg, ${alpha(power.color, 0.55)}, ${power.color})`,
        },
      });
      track.appendChild(fill);
      row.append(label, track);
      return { row, fill, power };
    });

    root.append(kicker, head, formula, readout, head2, ...bars.map((b) => b.row));

    return {
      shown: null,
      kicker, head, headWords: headWords.words, formula, formulaBody, orderRow,
      orderChips: [...orderRow.children],
      readout, readSeg, readLabel, readAngle,
      head2, head2Words: head2Words.words, bars,
    };
  },

  render(t, { back, front, refs, root }) {
    /* --------------------------------- Kamera ------------------------------- */
    // Die Kamera fährt beim Wechsel auf die Stärke leicht mit.
    const shift = easeInOutCubic(at(t, POWER_AT - 0.3, 1.0));
    const cam = camera(root, {
      x: drift(t * 0.35, 6) * 5,
      y: drift(t * 0.35, 2) * 4 - shift * 8,
      scale: 1 + easeInOutCubic(at(t, 0, 14)) * 0.03,
      ox: 960,
      oy: 560,
    });

    /* ------------------------------ Hintergrund ----------------------------- */
    background(back, t + 70, { intensity: 0.45, a: COLORS.cyan, b: COLORS.mint });
    dotGrid(back, 0.12, { offsetY: t * 4 });
    dust(back, t + 70, { opacity: 0.1 });

    /* ---------------------------- Aktuelle Auswahl -------------------------- */
    // Welches Segment ist gerade an der Reihe?
    let active = null;
    for (const demo of DEMOS) {
      if (t >= demo.at - 0.2) active = demo;
    }
    const inPowerPart = t >= POWER_AT;

    /* ------------------------------ Segmentring ----------------------------- */
    const ringIn = ease(t, 0.3, 1.2, easeOutQuint);
    const ringOut = easeInCubic(at(t, 13.9, 0.9));
    // Im Stärke-Teil verschwindet die Scheibe: dort geht es um Reichweite,
    // und die Ball-Bahnen sollen nicht über den Ring laufen.
    const ringPowerOut = easeInOutCubic(at(t, POWER_AT - 0.3, 0.8));
    const ringAlpha = ringIn * (1 - ringOut) * (1 - ringPowerOut);

    withCamera(back, cam, () => {
      if (ringAlpha <= 0.01) return;
      back.save();
      back.globalAlpha = ringAlpha;
      dartRing(back, RING.x, RING.y, RING_R, {
        reveal: ringIn,
        highlight: active && !inPowerPart ? [active.segment] : [],
        labelOpacity: ringIn * (inPowerPart ? 0.55 : 1),
        color: COLORS.mint,
      });
      back.restore();
    });

    withCamera(front, cam, () => {
      /* --------------------------- Richtungspfeil --------------------------- */
      if (active && !inPowerPart) {
        const p = easeOutQuint(at(t, active.at, 0.55));
        const fadeOut = 1 - easeInCubic(at(t, POWER_AT - 0.4, 0.4));

        // Pfeil aus der Scheibenmitte in Richtung des Segments.
        directionArrow(front, RING.x, RING.y, active.angle, RING_R * 1.2 * p, {
          color: COLORS.mint, width: 8, opacity: 0.95 * fadeOut, head: 30,
        });

        // Einschlagpunkt im Segment
        const rad = ((active.angle - 90) * Math.PI) / 180;
        const hit = {
          x: RING.x + Math.cos(rad) * RING_R * 0.82,
          y: RING.y + Math.sin(rad) * RING_R * 0.82,
        };
        shockRing(front, hit.x, hit.y, at(t, active.at, 0.8), {
          color: COLORS.mint, maxRadius: 210, width: 4,
        });
        glowDot(front, hit.x, hit.y, 8, COLORS.mint, fadeOut);
        bloom(front, RING.x, RING.y, 420, COLORS.mint, 0.1 * p * fadeOut);
      }

      /* ------------------- Ball, der die Richtung übernimmt ------------------ */
      // Ein kleiner Ball rollt bei jedem Wechsel in die gezeigte Richtung.
      if (active && !inPowerPart) {
        const roll = at(t, active.at + 0.35, 1.1);
        if (roll > 0 && roll < 1) {
          const d = easeOutCubic(roll) * RING_R * 1.1;
          const rad = (active.angle * Math.PI) / 180;
          const bx = RING.x + Math.sin(rad) * d;
          const by = RING.y - Math.cos(rad) * d;
          const o = 1 - clamp((roll - 0.7) / 0.3);
          front.save();
          front.globalAlpha = o;
          front.shadowColor = COLORS.mint;
          front.shadowBlur = 22;
          front.fillStyle = '#f7fbff';
          front.beginPath();
          front.arc(bx, by, 13, 0, Math.PI * 2);
          front.fill();
          front.restore();
        }
      }

      /* ------------------- Stärke: Ball mit drei Reichweiten ----------------- */
      if (inPowerPart) {
        text(front, 'REICHWEITE', RING.x - 330, RING.y - 250, {
          font: '500 22px "JetBrains Mono", monospace',
          color: COLORS.dim, letterSpacing: 6,
          opacity: ease(t, POWER_AT + 0.4, 0.8) * (1 - ease(t, 13.7, 0.7)),
        });
        // Drei Bälle starten gleichzeitig und kommen unterschiedlich weit –
        // die Stärke wird als Strecke sichtbar.
        POWERS.slice(0, 3).forEach((power, i) => {
          const start = POWER_AT + 1.0 + i * 0.75;
          const p = at(t, start, 1.6);
          if (p <= 0) return;
          const y = RING.y - 170 + i * 140;
          const maxLen = 520 * power.share;
          const d = easeOutCubic(p) * maxLen;

          // Bahnlinie
          front.save();
          front.strokeStyle = alpha(power.color, 0.28);
          front.lineWidth = 2;
          front.setLineDash([10, 12]);
          front.beginPath();
          front.moveTo(RING.x - 330, y);
          front.lineTo(RING.x - 330 + maxLen, y);
          front.stroke();
          front.restore();

          // Ball
          const bx = RING.x - 330 + d;
          front.save();
          front.shadowColor = power.color;
          front.shadowBlur = 20;
          front.fillStyle = '#f7fbff';
          front.beginPath();
          front.arc(bx, y, 12, 0, Math.PI * 2);
          front.fill();
          front.strokeStyle = power.color;
          front.lineWidth = 3;
          front.stroke();
          front.restore();

          // Zielmarke am Ende der Reichweite
          if (p > 0.96) {
            glowDot(front, RING.x - 330 + maxLen, y, 5, power.color, 1);
          }
        });
      }
    });

    /* ------------------------------- Textblöcke ----------------------------- */
    revealStagger(refs.headWords, t, {
      start: 0.2, step: 0.06, dur: 0.85, y: 38, blur: 10, ease: easeOutQuint,
      outStart: POWER_AT - 0.5, outDur: 0.45,
    });
    set(refs.kicker, { opacity: ease(t, 0.1, 0.5) * (1 - ease(t, 13.9, 0.7)) });

    // Formelkarte
    const fIn = ease(t, 0.9, 0.9, easeOutQuint);
    const fOut = easeInCubic(at(t, POWER_AT - 0.5, 0.5));
    set(refs.formula, {
      y: (1 - fIn) * 40 - fOut * 24,
      opacity: fIn * (1 - fOut),
      scale: lerp(0.97, 1, fIn),
      blur: (1 - fIn) * 8,
    });
    // Segmentfolge erscheint Chip für Chip.
    revealStagger(refs.orderChips, t, { start: 1.15, step: 0.028, dur: 0.35, y: 12, blur: 0 });

    // Der aktive Chip in der Segmentfolge wird hervorgehoben.
    refs.orderChips.forEach((chip, i) => {
      const isActive = active && !inPowerPart && BOARD_ORDER[i] === active.segment;
      chip.style.color = isActive ? '#04140f' : 'var(--dim)';
      chip.style.background = isActive ? COLORS.mint : 'transparent';
      chip.style.borderColor = isActive ? COLORS.mint : 'rgba(255,255,255,0.10)';
      chip.style.fontWeight = isActive ? '700' : '400';
    });

    // Anzeige des aktuellen Segments
    if (active && !inPowerPart) {
      // Merker statt DOM-Vergleich: der Startwert im HTML ist bereits "20",
      // ein Textvergleich würde die erste Aktualisierung verschlucken.
      if (refs.shown !== active.segment) {
        refs.shown = active.segment;
        refs.readSeg.textContent = String(active.segment);
        refs.readLabel.textContent = active.label;
        refs.readAngle.textContent = `Index ${BOARD_ORDER.indexOf(active.segment)} × 18° = ${active.angle}°`;
      }
      const p = easeOutBack(clamp(at(t, active.at, 0.5)), 1.2);
      const o = 1 - easeInCubic(at(t, POWER_AT - 0.5, 0.5));
      set(refs.readout, { y: (1 - p) * 26, opacity: clamp(p) * o, scale: lerp(0.94, 1, p) });
    } else {
      set(refs.readout, { opacity: 0 });
    }

    /* ------------------------------- Teil Stärke ---------------------------- */
    revealStagger(refs.head2Words, t, {
      start: POWER_AT + 0.1, step: 0.06, dur: 0.85, y: 38, blur: 10, ease: easeOutQuint,
      outStart: 13.8, outDur: 0.7,
    });

    refs.bars.forEach((bar, i) => {
      const start = POWER_AT + 0.5 + i * 0.42;
      const p = ease(t, start, 0.9, easeOutQuint);
      const grow = ease(t, start + 0.15, 1.1, easeOutQuint);
      const out = easeInCubic(at(t, 13.7, 0.7));
      set(bar.row, {
        x: (1 - p) * 44,
        opacity: p * (1 - out),
        blur: (1 - p) * 6,
      });
      bar.fill.style.width = `${grow * bar.power.share * 100}%`;
    });

    // Vor dem Wechsel sind die Balken unsichtbar.
    if (!inPowerPart) refs.bars.forEach((bar) => set(bar.row, { opacity: 0 }));
  },
};
