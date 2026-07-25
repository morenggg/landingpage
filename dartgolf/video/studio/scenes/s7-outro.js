/**
 * Szene 7 – Abschluss
 *
 * Zusammenfassung in drei nüchternen Aussagen, dazu die Adresse. Der Stand der
 * Autodarts-Anbindung wird auch hier klar benannt – im Abschluss besonders,
 * damit niemand mit einem falschen Eindruck zurückbleibt.
 *
 * Als letzte Bewegung rollt ein Ball ins Loch.
 *
 * Dauer: 9 s (Start 107 s)
 */

import {
  at, ease, clamp, lerp, alpha, mixHex, easeOutCubic, easeInCubic, easeOutQuint,
  easeInOutCubic, easeOutBack, drift,
} from '../lib/easing.js';
import {
  background, dotGrid, dust, bloom, glowDot, shockRing, W, H, COLORS,
} from '../lib/draw.js';
import { el, splitChars, splitWords, set, place } from '../lib/ui.js';
import { revealStagger, camera } from '../lib/timeline.js';

/** Position des Lochs, in das der Ball am Ende fällt. */
const HOLE = { x: 960, y: 792, r: 26 };

export const scene = {
  id: 's7-outro',
  start: 107,
  dur: 9,

  build(root) {
    /* Schriftzug, diesmal ruhig und mittig. */
    const markWrap = place(el('div', {}), { left: 0, top: 292, width: W });
    markWrap.style.textAlign = 'center';
    const dart = splitChars('Dart', { class: 'h1' });
    const golf = splitChars('Golf', { class: 'h1' });
    [dart.node, golf.node].forEach((node) => {
      node.style.display = 'inline-block';
      node.style.fontSize = '166px';
    });
    golf.chars.forEach((char, i) => {
      const p = golf.chars.length > 1 ? i / (golf.chars.length - 1) : 0;
      char.style.color = p < 0.5
        ? mixHex(COLORS.mint, COLORS.cyan, p * 2)
        : mixHex(COLORS.cyan, COLORS.violet, (p - 0.5) * 2);
    });
    markWrap.appendChild(el('div', {}, [dart.node, golf.node]));

    /* Drei Aussagen – knapp und überprüfbar. */
    const claims = place(el('div', {}), { left: 0, top: 502, width: W });
    claims.style.textAlign = 'center';
    const chipRow = el('div', {
      style: {
        display: 'flex', justifyContent: 'center', gap: '18px', flexWrap: 'wrap',
      },
    });
    const chipData = [
      { text: 'im Testmodus vollständig spielbar', kind: 'is-mint' },
      { text: '3 Bahnen · 1–6 Spieler · PWA', kind: 'is-mint' },
      { text: 'Autodarts-Anbindung vorbereitet, ungetestet', kind: 'is-amber' },
    ];
    const chips = chipData.map((c) => {
      const chip = el('span', { class: `chip ${c.kind}` }, [
        el('span', { class: 'dot' }),
        c.text,
      ]);
      chipRow.appendChild(chip);
      return chip;
    });
    claims.appendChild(chipRow);

    /* Adresse */
    const url = place(el('div', {}), { left: 0, top: 610, width: W });
    url.style.textAlign = 'center';
    const urlWords = splitWords('dorfdulliracing.de/dartgolf', {});
    urlWords.node.style.fontFamily = 'var(--mono)';
    urlWords.node.style.fontSize = '46px';
    urlWords.node.style.letterSpacing = '0.02em';
    urlWords.node.style.color = '#eaf2f8';
    url.appendChild(urlWords.node);

    /* Fußzeile: Version und Hinweis auf die Dokumentation. */
    const foot = place(el('div', { class: 'mono' }), { left: 0, top: 918, width: W });
    foot.style.textAlign = 'center';
    foot.style.fontSize = '22px';
    foot.style.color = 'var(--dim)';
    foot.textContent = 'Prototype 0.1 · README.md und AUTODARTS-INTEGRATION.md im Repository';

    root.append(markWrap, claims, url, foot);

    return {
      markWrap, chars: [...dart.chars, ...golf.chars], chips, chipRow,
      claims, url, urlWords: urlWords.words, foot,
    };
  },

  render(t, { back, front, refs, root }) {
    /* --------------------------------- Kamera ------------------------------- */
    const cam = camera(root, {
      x: drift(t * 0.3, 11) * 4,
      y: drift(t * 0.3, 5) * 3,
      scale: 1 + easeInOutCubic(at(t, 0, 8.5)) * 0.025,
      ox: 960,
      oy: 500,
    });

    /* ------------------------------ Hintergrund ----------------------------- */
    background(back, t + 240, { intensity: 0.55 });
    dotGrid(back, 0.1);
    dust(back, t + 240, { opacity: 0.16 });
    bloom(back, 960, 380, 900, COLORS.mint, 0.08 * ease(t, 0.2, 1.6));

    /* ------------------------------- Schriftzug ------------------------------ */
    refs.chars.forEach((char, i) => {
      const mid = (refs.chars.length - 1) / 2;
      const dist = (i - mid) / Math.max(1, mid);
      const p = easeOutQuint(at(t, 0.15 + Math.abs(dist) * 0.05, 0.85));
      const out = easeInCubic(at(t, 8.1, 0.9));
      char.style.transform = `translate3d(0, ${lerp(34, 0, p) - out * 30}px, 0) scale(${lerp(0.9, 1, p)})`;
      char.style.opacity = String(p * (1 - out));
      char.style.filter = p < 0.98 ? `blur(${(1 - p) * 10}px)` : 'none';
    });

    /* -------------------------------- Aussagen ------------------------------- */
    revealStagger(refs.chips, t, {
      start: 1.0, step: 0.16, dur: 0.85, y: 30, scale: 0.94, blur: 8, ease: easeOutQuint,
      outStart: 8.0, outDur: 0.7,
    });

    revealStagger(refs.urlWords, t, {
      start: 1.9, step: 0.06, dur: 0.9, y: 26, blur: 8, ease: easeOutQuint,
      outStart: 8.05, outDur: 0.7,
    });

    set(refs.foot, {
      y: (1 - ease(t, 2.6, 0.9)) * 18,
      opacity: ease(t, 2.6, 0.9) * (1 - ease(t, 8.0, 0.7)),
    });

    /* ---------------------------- Ball rollt ins Loch ----------------------- */
    // Letzte Bewegung des Videos: der Ball kommt von links und fällt.
    const rollP = at(t, 3.4, 2.3);
    const dropP = at(t, 5.7, 0.55);

    front.save();
    front.translate(cam.x, cam.y);
    front.translate(cam.ox, cam.oy);
    front.scale(cam.scale, cam.scale);
    front.translate(-cam.ox, -cam.oy);

    // Loch
    const holeIn = ease(t, 3.0, 0.6, easeOutQuint);
    if (holeIn > 0.01) {
      front.save();
      front.globalAlpha = holeIn * (1 - ease(t, 8.0, 0.7));
      front.fillStyle = '#03060a';
      front.beginPath();
      front.arc(HOLE.x, HOLE.y, HOLE.r, 0, Math.PI * 2);
      front.fill();
      front.strokeStyle = alpha('#ffffff', 0.4);
      front.lineWidth = 2;
      front.stroke();
      front.restore();
    }

    if (rollP > 0 && dropP < 1) {
      const startX = 330;
      const x = lerp(startX, HOLE.x, easeOutCubic(rollP));
      // Beim Fallen sinkt der Ball ins Loch und wird kleiner.
      const fall = easeInCubic(dropP);
      const y = HOLE.y + fall * 22;
      const radius = 15 * (1 - fall * 0.75);
      const o = (1 - ease(t, 8.0, 0.7)) * (dropP > 0.9 ? 1 - (dropP - 0.9) / 0.1 : 1);

      // Rollspur
      front.save();
      front.globalAlpha = 0.22 * o;
      front.strokeStyle = COLORS.mint;
      front.lineWidth = 3;
      front.setLineDash([12, 14]);
      front.beginPath();
      front.moveTo(startX, HOLE.y);
      front.lineTo(x, HOLE.y);
      front.stroke();
      front.restore();

      front.save();
      front.globalAlpha = o;
      front.shadowColor = COLORS.mint;
      front.shadowBlur = 24;
      front.fillStyle = '#f7fbff';
      front.beginPath();
      front.arc(x, y, radius, 0, Math.PI * 2);
      front.fill();
      front.strokeStyle = COLORS.mint;
      front.lineWidth = 3;
      front.stroke();
      front.restore();
    }

    // Bestätigungsring, wenn der Ball fällt.
    shockRing(front, HOLE.x, HOLE.y, at(t, 5.85, 1.1), {
      color: COLORS.mint, maxRadius: 460, width: 5,
    });
    front.restore();

    if (t > 5.8 && t < 7.4) {
      bloom(back, HOLE.x, HOLE.y, 520, COLORS.mint, 0.13 * (1 - at(t, 5.9, 1.4)));
    }
  },
};
