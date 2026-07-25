/**
 * DartGolf – Render-Studio: Zeichenbausteine für die Canvas-Ebenen
 *
 * Enthält die wiederverwendbaren Grafikelemente des Videos: Hintergründe,
 * Leuchtpunkte, Verbindungslinien, Datenpakete, Segmentring einer Dartscheibe
 * sowie die Übergänge (Vorhänge, Lichtwische).
 *
 * Alle Funktionen zeichnen ausschließlich anhand übergebener Werte – kein
 * eigener Zustand, keine Zeitmessung.
 */

import { clamp, lerp, alpha, easeInOutCubic, easeOutCubic, noise1 } from './easing.js';

export const W = 1920;
export const H = 1080;

export const COLORS = {
  bg: '#05080c',
  bg2: '#0a1018',
  text: '#eaf2f8',
  dim: '#93a6b8',
  mint: '#3ddc97',
  cyan: '#4cc9f0',
  violet: '#b892ff',
  amber: '#ffb703',
  magenta: '#ff5d8f',
  line: '#1b2735',
};

/* ============================== Hintergrund ============================= */

/**
 * Grundfläche: dunkler Verlauf mit zwei wandernden Lichtquellen.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t globale Zeit (für die langsame Bewegung der Lichter)
 * @param {{a?:string, b?:string, intensity?:number}} [options]
 */
export function background(ctx, t, options = {}) {
  const { a = COLORS.mint, b = COLORS.cyan, intensity = 1 } = options;

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // Zwei sehr weiche, langsam driftende Lichtwolken.
  const lights = [
    { x: W * (0.28 + noise1(t * 0.11) * 0.04), y: H * (0.3 + noise1(t * 0.13 + 3) * 0.05), r: 980, c: a, o: 0.16 },
    { x: W * (0.78 + noise1(t * 0.09 + 7) * 0.04), y: H * (0.72 + noise1(t * 0.12 + 11) * 0.05), r: 900, c: b, o: 0.13 },
  ];

  for (const l of lights) {
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    g.addColorStop(0, alpha(l.c, l.o * intensity));
    g.addColorStop(0.55, alpha(l.c, l.o * 0.28 * intensity));
    g.addColorStop(1, alpha(l.c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

/**
 * Feines Punktraster – gibt Tiefe, ohne technisch zu wirken.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} opacity
 * @param {{size?:number, offsetX?:number, offsetY?:number}} [options]
 */
export function dotGrid(ctx, opacity, options = {}) {
  const { size = 56, offsetX = 0, offsetY = 0 } = options;
  if (opacity <= 0.001) return;
  ctx.save();
  ctx.fillStyle = alpha('#8fb4d0', opacity);
  for (let y = (offsetY % size); y < H + size; y += size) {
    for (let x = (offsetX % size); x < W + size; x += size) {
      // Randbereiche ausblenden, damit das Raster nicht "endet".
      const fx = 1 - Math.abs(x / W - 0.5) * 1.6;
      const fy = 1 - Math.abs(y / H - 0.5) * 1.6;
      const f = clamp(Math.min(fx, fy) * 1.5);
      if (f <= 0.02) continue;
      ctx.globalAlpha = f;
      ctx.beginPath();
      ctx.arc(x, y, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/* ================================ Kamera ================================ */

/**
 * Zeichnet einen Block mit derselben Kamera, die auch die DOM-Ebene bewegt.
 *
 * Wichtig: Ohne das würden Canvas-Grafik (Verbindungen, Pakete) und DOM-Karten
 * bei einer Kamerafahrt auseinanderlaufen.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number,y:number,scale:number,ox:number,oy:number}} cam
 * @param {() => void} fn
 */
export function withCamera(ctx, cam, fn) {
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.translate(cam.ox, cam.oy);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.ox, -cam.oy);
  fn();
  ctx.restore();
}

/* ============================== Grundformen ============================= */

/** Rechteck mit runden Ecken als Pfad (ohne zu füllen). */
export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Leuchtender Punkt (Knoten im Datenfluss).
 * @param {CanvasRenderingContext2D} ctx
 */
export function glowDot(ctx, x, y, radius, color, glow = 1) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius * 6 * glow);
  g.addColorStop(0, alpha(color, 0.5 * glow));
  g.addColorStop(0.4, alpha(color, 0.12 * glow));
  g.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - radius * 6 * glow, y - radius * 6 * glow, radius * 12 * glow, radius * 12 * glow);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Weicher Lichtschein hinter einem Element.
 */
export function bloom(ctx, x, y, radius, color, strength = 0.3) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, alpha(color, strength));
  g.addColorStop(0.5, alpha(color, strength * 0.3));
  g.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

/* ============================ Verbindungen ============================== */

/**
 * Bezier-Verbindung zwischen zwei Knoten.
 * @returns {(p:number) => {x:number, y:number, angle:number}} Punkt auf der Kurve
 */
export function makeLink(from, to, bend = 0.28) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Kontrollpunkte seitlich versetzt: ergibt weiche, "geführte" Kurven.
  const c1 = { x: from.x + dx * bend, y: from.y + dy * 0.06 };
  const c2 = { x: to.x - dx * bend, y: to.y - dy * 0.06 };

  const point = (p) => {
    const u = 1 - p;
    const x = u ** 3 * from.x + 3 * u * u * p * c1.x + 3 * u * p * p * c2.x + p ** 3 * to.x;
    const y = u ** 3 * from.y + 3 * u * u * p * c1.y + 3 * u * p * p * c2.y + p ** 3 * to.y;
    const dxp = 3 * u * u * (c1.x - from.x) + 6 * u * p * (c2.x - c1.x) + 3 * p * p * (to.x - c2.x);
    const dyp = 3 * u * u * (c1.y - from.y) + 6 * u * p * (c2.y - c1.y) + 3 * p * p * (to.y - c2.y);
    return { x, y, angle: Math.atan2(dyp, dxp) };
  };
  point.from = from;
  point.to = to;
  point.c1 = c1;
  point.c2 = c2;
  return point;
}

/**
 * Zeichnet eine Verbindung, optional nur teilweise (wächst von A nach B).
 * @param {CanvasRenderingContext2D} ctx
 * @param {ReturnType<makeLink>} link
 * @param {number} progress 0..1
 * @param {{color?:string, width?:number, dash?:boolean, opacity?:number}} [options]
 */
export function drawLink(ctx, link, progress, options = {}) {
  const {
    color = COLORS.line, width = 3, dash = false, opacity = 1, dashPhase = 0,
  } = options;
  if (progress <= 0.001) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = alpha(color, opacity);
  if (dash) {
    ctx.setLineDash([16, 18]);
    ctx.lineDashOffset = -dashPhase;
  }

  // Kurve in Segmenten zeichnen, damit sich der Fortschritt exakt begrenzen lässt.
  const steps = 70;
  const end = Math.round(steps * clamp(progress));
  ctx.beginPath();
  for (let i = 0; i <= end; i += 1) {
    const p = link(i / steps);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Ein Datenpaket, das auf einer Verbindung läuft: Kern, Schweif, Lichtschein.
 * @param {CanvasRenderingContext2D} ctx
 * @param {ReturnType<makeLink>} link
 * @param {number} p Position auf der Kurve 0..1
 * @param {{color?:string, size?:number, tail?:number, opacity?:number, label?:string}} [options]
 */
export function drawPacket(ctx, link, p, options = {}) {
  const {
    color = COLORS.cyan, size = 9, tail = 0.13, opacity = 1, label = null,
  } = options;
  const pos = link(clamp(p));

  ctx.save();
  // Schweif als verlaufende Linie hinter dem Paket.
  const steps = 18;
  for (let i = steps; i >= 1; i -= 1) {
    const q = clamp(p - (tail * i) / steps);
    const a = (1 - i / steps) ** 1.6 * 0.55 * opacity;
    const s = size * (0.35 + (1 - i / steps) * 0.65);
    const pt = link(q);
    ctx.fillStyle = alpha(color, a);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  bloom(ctx, pos.x, pos.y, size * 7, color, 0.32 * opacity);
  ctx.fillStyle = alpha('#ffffff', 0.95 * opacity);
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, size * 0.52, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = alpha(color, opacity);
  ctx.lineWidth = 3;
  ctx.stroke();

  if (label) {
    ctx.font = '600 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(label).width + 26;
    ctx.fillStyle = alpha('#05080c', 0.9 * opacity);
    roundRectPath(ctx, pos.x - tw / 2, pos.y - 54, tw, 36, 12);
    ctx.fill();
    ctx.strokeStyle = alpha(color, 0.6 * opacity);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = alpha(color, opacity);
    ctx.fillText(label, pos.x, pos.y - 35);
  }
  ctx.restore();
}

/* ============================ Dartscheibe =============================== */

/** Reihenfolge der Segmente wie in der App (src/config.js). */
export const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

/**
 * Zeichnet einen abstrahierten Segmentring einer Dartscheibe.
 * Bewusst eine eigene, reduzierte Darstellung – keine Nachbildung eines
 * fremden Produkts.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 * @param {Object} [options]
 * @param {number} [options.reveal] 0..1 – wie viele Segmente sichtbar sind
 * @param {number[]} [options.highlight] hervorgehobene Segmentzahlen
 * @param {number} [options.rotation] Drehung in Grad
 * @param {number} [options.labelOpacity]
 * @param {string} [options.color]
 */
export function dartRing(ctx, cx, cy, radius, options = {}) {
  const {
    reveal = 1, highlight = [], rotation = 0, labelOpacity = 1,
    color = COLORS.cyan, ringOpacity = 1,
  } = options;

  const seg = 360 / BOARD_ORDER.length;
  const count = Math.round(BOARD_ORDER.length * clamp(reveal));

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);

  for (let i = 0; i < count; i += 1) {
    const number = BOARD_ORDER[i];
    const isHot = highlight.includes(number);
    // Mittelwinkel des Segments: 0° zeigt nach oben, im Uhrzeigersinn.
    const mid = i * seg;
    const a0 = ((mid - seg / 2) - 90) * (Math.PI / 180);
    const a1 = ((mid + seg / 2) - 90) * (Math.PI / 180);

    // Segmentfläche
    ctx.beginPath();
    ctx.arc(0, 0, radius, a0, a1);
    ctx.arc(0, 0, radius * 0.62, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = isHot
      ? alpha(color, 0.3 * ringOpacity)
      : alpha('#9fc4dc', (i % 2 === 0 ? 0.075 : 0.035) * ringOpacity);
    ctx.fill();
    ctx.strokeStyle = isHot ? alpha(color, 0.9 * ringOpacity) : alpha('#9fc4dc', 0.12 * ringOpacity);
    ctx.lineWidth = isHot ? 3 : 1.2;
    ctx.stroke();

    // Segmentzahl
    if (labelOpacity > 0.01) {
      const ar = ((mid) - 90) * (Math.PI / 180);
      const lr = radius * 1.14;
      ctx.save();
      ctx.font = `${isHot ? 900 : 700} ${isHot ? 46 : 34}px "Barlow Condensed", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isHot ? color : alpha('#c8dbe9', 0.55 * labelOpacity);
      if (isHot) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 22;
      }
      ctx.globalAlpha = labelOpacity;
      ctx.fillText(String(number), Math.cos(ar) * lr, Math.sin(ar) * lr);
      ctx.restore();
    }
  }

  // Bull in der Mitte
  if (reveal > 0.98) {
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.17, 0, Math.PI * 2);
    ctx.fillStyle = alpha(COLORS.mint, 0.22 * ringOpacity);
    ctx.fill();
    ctx.strokeStyle = alpha(COLORS.mint, 0.7 * ringOpacity);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = alpha(COLORS.magenta, 0.85 * ringOpacity);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Pfeil, der eine Richtung aus dem Segmentwinkel zeigt.
 * @param {CanvasRenderingContext2D} ctx
 */
export function directionArrow(ctx, cx, cy, angleDeg, length, options = {}) {
  const { color = COLORS.mint, width = 6, opacity = 1, head = 26 } = options;
  if (length <= 1) return;
  const rad = (angleDeg * Math.PI) / 180;
  // 0° = nach oben, im Uhrzeigersinn (wie in der App).
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const ex = cx + dx * length;
  const ey = cy + dy * length;

  ctx.save();
  ctx.strokeStyle = alpha(color, opacity);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.shadowColor = alpha(color, 0.8 * opacity);
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  ctx.fillStyle = alpha(color, opacity);
  ctx.beginPath();
  ctx.moveTo(ex + dx * head * 0.6, ey + dy * head * 0.6);
  ctx.lineTo(ex - dx * head * 0.5 + dy * head * 0.5, ey - dy * head * 0.5 - dx * head * 0.5);
  ctx.lineTo(ex - dx * head * 0.5 - dy * head * 0.5, ey - dy * head * 0.5 + dx * head * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ============================= Partikel ================================= */

/**
 * Deterministisches Partikelfeld (Staub im Licht).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} t
 * @param {{count?:number, opacity?:number, color?:string, speed?:number}} [options]
 */
export function dust(ctx, t, options = {}) {
  const {
    count = 70, opacity = 0.25, color = '#bfe6ff', speed = 12,
  } = options;
  if (opacity <= 0.001) return;
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const seed = i * 1.618;
    const baseX = ((Math.sin(seed * 7.3) + 1) / 2) * W;
    const baseY = ((Math.cos(seed * 3.1) + 1) / 2) * H;
    const x = (baseX + noise1(t * 0.14 + seed) * 90 + 40) % W;
    const y = (baseY - t * speed * (0.4 + (i % 5) / 8) + noise1(t * 0.2 + seed * 2) * 60 + H * 4) % H;
    const r = 1 + (i % 4) * 0.7;
    const a = opacity * (0.35 + 0.65 * ((Math.sin(t * 1.2 + seed * 4) + 1) / 2));
    ctx.fillStyle = alpha(color, a);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Ausbreitende Ringwelle (Einschlag, Bestätigung).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} p 0..1 Fortschritt
 */
export function shockRing(ctx, x, y, p, options = {}) {
  const { color = COLORS.mint, maxRadius = 420, width = 6 } = options;
  if (p <= 0 || p >= 1) return;
  const e = easeOutCubic(p);
  const r = maxRadius * e;
  ctx.save();
  ctx.strokeStyle = alpha(color, (1 - p) ** 1.6 * 0.85);
  ctx.lineWidth = width * (1 - p * 0.7);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/* ============================= Übergänge ================================ */

/**
 * Vorhang mit Ausschnitt: füllt die Fläche und schneidet eine wachsende Form
 * heraus. Dadurch werden die DOM-Ebenen darunter "aufgedeckt" – ein Übergang,
 * der deutlich hochwertiger wirkt als ein einfaches Überblenden.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} p 0..1
 * @param {'up'|'down'|'iris'|'bars'} kind
 * @param {{color?:string}} [options]
 */
export function curtain(ctx, p, kind = 'up', options = {}) {
  const { color = COLORS.bg } = options;
  const q = clamp(p);
  if (q >= 1) return;

  ctx.save();
  ctx.fillStyle = color;

  if (kind === 'iris') {
    // Runder Ausschnitt, der von der Mitte aufgeht.
    const r = easeInOutCubic(q) * Math.hypot(W, H) * 0.62;
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2, true);
    ctx.fill();
  } else if (kind === 'bars') {
    // Sechs Balken, die zeitlich versetzt nach oben wegfahren.
    const cols = 6;
    const cw = W / cols;
    for (let i = 0; i < cols; i += 1) {
      const local = clamp((q - i * 0.055) / (1 - 0.055 * (cols - 1)));
      const h = H * (1 - easeInOutCubic(local));
      ctx.fillRect(i * cw - 1, 0, cw + 2, h);
    }
  } else {
    // Weiche Kante, die nach oben bzw. unten aus dem Bild läuft.
    const e = easeInOutCubic(q);
    const edge = kind === 'up' ? H - H * e : H * e;
    const grad = ctx.createLinearGradient(0, edge - 90, 0, edge + 90);
    if (kind === 'up') {
      ctx.fillRect(0, 0, W, edge);
      grad.addColorStop(0, alpha(color, 1));
      grad.addColorStop(1, alpha(color, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, edge - 90, W, 180);
    } else {
      ctx.fillRect(0, edge, W, H - edge);
      grad.addColorStop(0, alpha(color, 0));
      grad.addColorStop(1, alpha(color, 1));
      ctx.fillStyle = grad;
      ctx.fillRect(0, edge - 90, W, 180);
    }
  }
  ctx.restore();
}

/**
 * Lichtwisch: ein schräger, weicher Lichtbalken fährt durchs Bild.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} p 0..1
 */
export function lightSweep(ctx, p, options = {}) {
  const { color = '#ffffff', strength = 0.5, angle = -18, width = 520 } = options;
  const q = clamp(p);
  if (q <= 0 || q >= 1) return;

  const travel = W + width * 2;
  const x = -width + travel * easeInOutCubic(q);
  const fade = Math.sin(q * Math.PI); // am Anfang und Ende schwächer

  ctx.save();
  ctx.translate(x, H / 2);
  ctx.rotate((angle * Math.PI) / 180);
  const g = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
  g.addColorStop(0, alpha(color, 0));
  g.addColorStop(0.5, alpha(color, strength * fade));
  g.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-width / 2, -H, width, H * 2);
  ctx.restore();
}

/**
 * Kurzes weißes Aufblitzen – nur sparsam als Akzent bei Einschlägen.
 */
export function flash(ctx, p, options = {}) {
  const { color = '#ffffff', strength = 0.32 } = options;
  const q = clamp(p);
  if (q <= 0 || q >= 1) return;
  ctx.save();
  ctx.fillStyle = alpha(color, (1 - q) ** 2 * strength);
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* ============================== Textsatz ================================ */

/**
 * Text auf Canvas mit optionalem Lichtschein.
 */
export function text(ctx, str, x, y, options = {}) {
  const {
    font = '700 40px "Barlow Condensed", sans-serif',
    color = COLORS.text, align = 'left', baseline = 'alphabetic',
    opacity = 1, glow = 0, letterSpacing = 0,
  } = options;
  ctx.save();
  ctx.font = font;
  ctx.textAlign = letterSpacing ? 'left' : align;
  ctx.textBaseline = baseline;
  ctx.globalAlpha = opacity;
  if (glow > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
  }
  ctx.fillStyle = color;

  if (letterSpacing) {
    // Manuelle Laufweite: Canvas kennt kein letter-spacing in allen Engines.
    const chars = [...str];
    const total = chars.reduce((sum, c) => sum + ctx.measureText(c).width + letterSpacing, 0) - letterSpacing;
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    for (const c of chars) {
      ctx.fillText(c, cx, y);
      cx += ctx.measureText(c).width + letterSpacing;
    }
  } else {
    ctx.fillText(str, x, y);
  }
  ctx.restore();
}
