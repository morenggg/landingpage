/**
 * DartGolf – Render-Studio: Zeit- und Kurvenhelfer
 *
 * Alle Bewegungen im Video entstehen aus diesen Funktionen. Sie sind rein und
 * damit reproduzierbar – gleiche Zeit, gleiches Bild.
 */

export const clamp = (v, min = 0, max = 1) => (v < min ? min : v > max ? max : v);

export const lerp = (a, b, t) => a + (b - a) * t;

/** Mischt zwei Farben im RGB-Raum (Eingabe: "#rrggbb"). */
export function mixHex(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const out = pa.map((v, i) => Math.round(lerp(v, pb[i], clamp(t))));
  return `rgb(${out[0]},${out[1]},${out[2]})`;
}

/** Wandelt "#rrggbb" mit Alpha in eine rgba()-Angabe. */
export function alpha(hex, a) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
}

/* ------------------------------- Kurven -------------------------------- */

export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
export const easeInCubic = (t) => t * t * t;
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOutQuint = (t) => 1 - (1 - t) ** 5;
export const easeInOutQuint = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);
export const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
export const easeInExpo = (t) => (t <= 0 ? 0 : 2 ** (10 * t - 10));

/** Weiches Überschwingen – gibt Bewegungen Gewicht, ohne zu wippen. */
export const easeOutBack = (t, s = 1.42) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;

/** Gedämpfte Feder. Für Elemente, die "einrasten". */
export function spring(t, { stiffness = 7.5, damping = 0.62 } = {}) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-stiffness * t) * Math.cos(damping * stiffness * t * Math.PI);
}

/* ----------------------------- Zeitfenster ------------------------------ */

/**
 * Normalisierte Position innerhalb eines Zeitfensters.
 * @param {number} t aktuelle Zeit
 * @param {number} start Beginn
 * @param {number} dur Dauer
 * @returns {number} 0..1
 */
export const at = (t, start, dur) => clamp((t - start) / dur);

/**
 * Zeitfenster mit Kurve.
 * @param {number} t
 * @param {number} start
 * @param {number} dur
 * @param {(v:number)=>number} [ease]
 */
export const ease = (t, start, dur, easeFn = easeOutCubic) => easeFn(at(t, start, dur));

/**
 * Ein- und Ausblenden in einem Rutsch: steigt an, hält, fällt ab.
 * @returns {number} 0..1
 */
export function pulse(t, start, inDur, hold, outDur, easeIn = easeOutCubic, easeOut = easeInCubic) {
  const rise = easeIn(at(t, start, inDur));
  const fall = 1 - easeOut(at(t, start + inDur + hold, outDur));
  return Math.min(rise, fall);
}

/**
 * Versetzt Elemente einer Liste zeitlich gegeneinander (Staffelung).
 * @param {number} index
 * @param {number} step Abstand in Sekunden
 */
export const stagger = (index, step = 0.08) => index * step;

/** Sanftes Rauschen für Kamerawackeln – deterministisch, ohne Math.random. */
export function noise1(x) {
  const s = Math.sin(x * 12.9898) * 43758.5453;
  const f = s - Math.floor(s);
  return f * 2 - 1;
}

/** Weiche, mehrlagige Bewegung (fBm) für organische Kamerafahrten. */
export function drift(t, seed = 0) {
  return (
    noise1(t * 0.37 + seed) * 0.6
    + noise1(t * 0.83 + seed * 2.3) * 0.28
    + noise1(t * 1.9 + seed * 5.1) * 0.12
  );
}
