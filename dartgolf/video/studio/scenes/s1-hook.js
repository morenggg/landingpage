/**
 * Szene 1 – Einstieg (Hook)
 *
 * Ein Dart fliegt ins Bild, schlägt ein, und aus dem Einschlag heraus baut
 * sich der Schriftzug auf. Danach die Kernaussage in zwei kurzen Zeilen.
 *
 * Dauer: 9,5 s
 */

import {
  at, ease, clamp, lerp, alpha, mixHex, easeOutCubic, easeInCubic, easeOutQuint,
  easeInOutCubic, easeOutBack, drift,
} from '../lib/easing.js';
import {
  background, dotGrid, dust, shockRing, flash, glowDot, bloom, W, H, COLORS,
} from '../lib/draw.js';
import { el, splitChars, splitWords, set, place } from '../lib/ui.js';
import { revealStagger } from '../lib/timeline.js';

/** Zeitpunkt des Einschlags – alles andere hängt daran. */
const IMPACT = 1.15;
const CENTER = { x: 960, y: 452 };

/**
 * Zeichnet einen stilisierten Dart (eigene Form, keine Produktnachbildung).
 * @param {CanvasRenderingContext2D} ctx
 */
function drawDart(ctx, x, y, angleDeg, scale, opacity) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.globalAlpha = opacity;

  // Spitze
  ctx.fillStyle = '#dbe8f2';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-26, -5);
  ctx.lineTo(-26, 5);
  ctx.closePath();
  ctx.fill();

  // Schaft (Barrel)
  const g = ctx.createLinearGradient(-26, 0, -108, 0);
  g.addColorStop(0, '#b9cdda');
  g.addColorStop(0.45, '#8ea6b8');
  g.addColorStop(1, '#5f7789');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-26, -6);
  ctx.lineTo(-100, -8);
  ctx.lineTo(-108, -5);
  ctx.lineTo(-108, 5);
  ctx.lineTo(-100, 8);
  ctx.lineTo(-26, 6);
  ctx.closePath();
  ctx.fill();

  // Flight in Mint
  ctx.fillStyle = alpha(COLORS.mint, 0.92);
  ctx.beginPath();
  ctx.moveTo(-104, -7);
  ctx.lineTo(-150, -26);
  ctx.lineTo(-146, 0);
  ctx.lineTo(-150, 26);
  ctx.lineTo(-104, 7);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = alpha('#ffffff', 0.35);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

export const scene = {
  id: 's1-hook',
  start: 0,
  dur: 9.5,

  build(root) {
    // Schriftzug: zeichenweise, damit er aus dem Einschlag "aufspringt".
    const markWrap = place(el('div', {}), { left: 0, top: 322, width: W });
    markWrap.style.textAlign = 'center';

    const dart = splitChars('Dart', { class: 'h1' });
    const golf = splitChars('Golf', { class: 'h1' });
    [dart.node, golf.node].forEach((node) => {
      node.style.display = 'inline-block';
      node.style.fontSize = '200px';
    });

    // Farbverlauf zeichenweise: `background-clip: text` greift bei
    // inline-block-Kindern nicht, deshalb bekommt jedes Zeichen seine
    // eigene Farbe entlang des Verlaufs Mint → Cyan → Violett.
    golf.chars.forEach((char, i) => {
      const p = golf.chars.length > 1 ? i / (golf.chars.length - 1) : 0;
      char.style.color = p < 0.5
        ? mixHex(COLORS.mint, COLORS.cyan, p * 2)
        : mixHex(COLORS.cyan, COLORS.violet, (p - 0.5) * 2);
    });

    const markRow = el('div', {}, [dart.node, golf.node]);
    markWrap.appendChild(markRow);

    const kicker = place(el('div', { class: 'kicker', text: 'Dart trifft Minigolf' }), {
      left: 0, top: 252, width: W,
    });
    kicker.style.textAlign = 'center';

    // Zwei Aussagen, die nacheinander erscheinen.
    const line1 = place(el('div', {}), { left: 0, top: 588, width: W });
    line1.style.textAlign = 'center';
    const l1 = splitWords('Aus jedem Dartwurf wird ein Minigolfschlag.', { class: 'lead' });
    line1.appendChild(l1.node);

    const line2 = place(el('div', {}), { left: 0, top: 706, width: W });
    line2.style.textAlign = 'center';
    const chip1 = el('span', { class: 'chip is-mint', style: { marginRight: '18px' } }, [
      el('span', { class: 'dot' }), 'läuft im Browser',
    ]);
    const chip2 = el('span', { class: 'chip is-mint', style: { marginRight: '18px' } }, [
      el('span', { class: 'dot' }), 'keine Installation',
    ]);
    const chip3 = el('span', { class: 'chip is-mint' }, [
      el('span', { class: 'dot' }), 'Testmodus ohne Scheibe',
    ]);
    line2.append(chip1, chip2, chip3);

    root.append(kicker, markWrap, line1, line2);

    return {
      kicker, markWrap, markRow, line1, line2,
      chars: [...dart.chars, ...golf.chars],
      leadWords: l1.words,
      chips: [chip1, chip2, chip3],
    };
  },

  render(t, { back, front, refs, root }) {
    /* ------------------------------ Hintergrund ----------------------------- */
    background(back, t, { intensity: 0.35 + ease(t, IMPACT, 2.4) * 0.8 });
    dotGrid(back, ease(t, 0.2, 2.2) * 0.16, { offsetY: t * 6 });
    dust(back, t, { opacity: 0.16 + ease(t, IMPACT, 1.5) * 0.12 });

    // Lichtkern an der Einschlagstelle, der langsam atmet.
    const coreGlow = ease(t, IMPACT, 1.1) * (1 - ease(t, 7.6, 1.6) * 0.7);
    if (coreGlow > 0.01) {
      bloom(back, CENTER.x, CENTER.y - 40, 720, COLORS.mint, 0.1 * coreGlow);
    }

    /* -------------------------------- Dartflug ------------------------------ */
    // Der Dart kommt von rechts oben und wird zum Einschlag hin schneller.
    const flightP = at(t, IMPACT - 0.62, 0.62);
    if (flightP > 0 && flightP < 1) {
      const p = easeInCubic(flightP);
      const fromX = W + 340;
      const fromY = -180;
      const x = lerp(fromX, CENTER.x, p);
      const y = lerp(fromY, CENTER.y, p);
      const angle = 28;

      // Bewegungsunschärfe durch mehrere versetzte Kopien.
      for (let i = 7; i >= 0; i -= 1) {
        const q = clamp(p - i * 0.022);
        const gx = lerp(fromX, CENTER.x, q);
        const gy = lerp(fromY, CENTER.y, q);
        drawDart(front, gx, gy, angle, 1.05, (1 - i / 8) ** 2 * (i === 0 ? 1 : 0.28));
      }

      // Lichtspur
      front.save();
      const trail = front.createLinearGradient(x, y, x + 420, y - 224);
      trail.addColorStop(0, alpha(COLORS.mint, 0.5));
      trail.addColorStop(1, alpha(COLORS.mint, 0));
      front.strokeStyle = trail;
      front.lineWidth = 3;
      front.beginPath();
      front.moveTo(x, y);
      front.lineTo(x + 420, y - 224);
      front.stroke();
      front.restore();

      drawDart(front, x, y, angle, 1.05, 1);
    }

    // Steckender Dart nach dem Einschlag: sinkt minimal nach, dann verblasst er.
    if (t >= IMPACT && t < IMPACT + 1.5) {
      const settle = easeOutBack(at(t, IMPACT, 0.5), 2.2);
      const wobble = Math.sin((t - IMPACT) * 26) * (1 - at(t, IMPACT, 0.7)) * 2.4;
      const fade = 1 - ease(t, IMPACT + 0.75, 0.7, easeInCubic);
      drawDart(front, CENTER.x, CENTER.y, 28 + wobble - (1 - settle) * 6, 1.05, fade);
    }

    /* ------------------------------- Einschlag ------------------------------ */
    shockRing(front, CENTER.x, CENTER.y, at(t, IMPACT, 1.25), { color: COLORS.mint, maxRadius: 900, width: 9 });
    shockRing(front, CENTER.x, CENTER.y, at(t, IMPACT + 0.09, 1.0), { color: COLORS.cyan, maxRadius: 620, width: 5 });
    flash(front, at(t, IMPACT, 0.34), { strength: 0.3 });

    // Funken, die aus dem Einschlag stieben.
    const sparkP = at(t, IMPACT, 1.0);
    if (sparkP > 0 && sparkP < 1) {
      front.save();
      for (let i = 0; i < 26; i += 1) {
        const a = (i / 26) * Math.PI * 2 + 0.4;
        const speed = 260 + ((i * 37) % 240);
        const d = easeOutQuint(sparkP) * speed;
        const x = CENTER.x + Math.cos(a) * d;
        const y = CENTER.y + Math.sin(a) * d * 0.72;
        front.fillStyle = alpha(i % 3 === 0 ? COLORS.cyan : COLORS.mint, (1 - sparkP) ** 2);
        front.beginPath();
        front.arc(x, y, 3.4 * (1 - sparkP * 0.6), 0, Math.PI * 2);
        front.fill();
      }
      front.restore();
    }

    /* ------------------------------- Schriftzug ----------------------------- */
    // Zeichen springen aus der Mitte heraus nach außen an ihren Platz.
    refs.chars.forEach((char, i) => {
      const mid = (refs.chars.length - 1) / 2;
      const dist = (i - mid) / Math.max(1, mid);
      const p = easeOutQuint(at(t, IMPACT + 0.04 + Math.abs(dist) * 0.06, 0.85));
      const out = easeInCubic(at(t, 8.0, 1.2));

      const x = lerp(-dist * 190, 0, p);
      const y = lerp(56, 0, p) - out * 46;
      const sc = lerp(0.62, 1, p) * (1 + out * 0.13);
      char.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${sc})`;
      char.style.opacity = String(clamp(p * 1.1) * (1 - out));
      char.style.filter = p < 0.98 ? `blur(${(1 - p) * 13}px)` : 'none';
    });

    // Kicker über dem Schriftzug
    const kickP = ease(t, IMPACT + 0.55, 0.8);
    const kickOut = easeInCubic(at(t, 8.0, 1.0));
    set(refs.kicker, {
      y: (1 - kickP) * -26 - kickOut * 30,
      opacity: kickP * (1 - kickOut),
      blur: (1 - kickP) * 6,
    });

    /* -------------------------------- Aussagen ------------------------------ */
    revealStagger(refs.leadWords, t, {
      start: 2.3, step: 0.07, dur: 0.8, y: 30, blur: 9,
      outStart: 7.9, outDur: 0.8, ease: easeOutQuint,
    });

    revealStagger(refs.chips, t, {
      start: 4.6, step: 0.14, dur: 0.85, y: 34, scale: 0.9, blur: 8,
      outStart: 7.7, outDur: 0.7, ease: easeOutQuint,
    });

    /* --------------------------- Kamera / Abschluss ------------------------- */
    // Sehr langsames Heranfahren, plus minimales Atmen der Kamera.
    const push = 1 + easeInOutCubic(at(t, IMPACT, 8)) * 0.045;
    const outPush = easeInCubic(at(t, 8.2, 1.3)) * 0.09;
    const dx = drift(t * 0.5, 1) * 5;
    const dy = drift(t * 0.5, 9) * 4;
    root.style.transformOrigin = '960px 480px';
    root.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${push + outPush})`;
  },
};
