/**
 * DartGolf – Video: Tonspur
 *
 * Musik und Geräusche werden hier vollständig selbst berechnet und als
 * WAV-Datei geschrieben. Damit liegen keine fremden Audiodateien im
 * Repository und es gibt keine Lizenzfragen.
 *
 * Aufbau:
 *   - ruhiger Flächenklang (Pad) mit langsamer Akkordfolge in a-Moll
 *   - Arpeggio ab der Architektur-Szene
 *   - weicher Puls (Kick + Hi-Hat) ab der Steuerungs-Szene
 *   - Geräusche: Dart-Einschlag, Klicks, Datenpakete, Ball, Übergänge
 *
 * Aufruf:
 *   node build/audio.mjs [--out out/soundtrack.wav] [--duration 116]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const VIDEO_DIR = path.resolve(HERE, '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const SR = 48000;                                  // Abtastrate
const DURATION = Number(arg('duration', 116.4));   // Gesamtlänge in Sekunden
const OUT = path.resolve(VIDEO_DIR, arg('out', 'out/soundtrack.wav'));

const LENGTH = Math.ceil(DURATION * SR);
const left = new Float64Array(LENGTH);
const right = new Float64Array(LENGTH);

/* ============================== Werkzeuge =============================== */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

/** Deterministisches Rauschen (kein Math.random – gleicher Lauf, gleicher Ton). */
let noiseSeed = 987654321;
function noise() {
  noiseSeed = (noiseSeed * 1664525 + 1013904223) >>> 0;
  return (noiseSeed / 2147483648) - 1;
}

/**
 * Mischt einen Wert auf die Summenspur.
 * @param {number} index Sample-Position
 * @param {number} value Amplitude
 * @param {number} pan -1 (links) .. 1 (rechts)
 */
function add(index, value, pan = 0) {
  if (index < 0 || index >= LENGTH) return;
  const l = Math.cos((pan + 1) * Math.PI / 4);
  const r = Math.sin((pan + 1) * Math.PI / 4);
  left[index] += value * l;
  right[index] += value * r;
}

/** Hüllkurve: Anschlag, Abfall, Halten, Ausklang. */
function envelope(pos, dur, { a = 0.01, d = 0.1, s = 0.7, r = 0.2 } = {}) {
  const attack = a * SR;
  const decay = d * SR;
  const release = r * SR;
  const total = dur * SR;
  if (pos < attack) return pos / attack;
  if (pos < attack + decay) return lerp(1, s, (pos - attack) / decay);
  if (pos < total - release) return s;
  if (pos < total) return s * (1 - (pos - (total - release)) / release);
  return 0;
}

/** Einfacher Tiefpass (ein Pol) – nimmt Schärfe aus Rauschen und Sägezahn. */
function makeLowpass(cutoffHz) {
  const x = Math.exp(-2 * Math.PI * cutoffHz / SR);
  let last = 0;
  return (input) => {
    last = input * (1 - x) + last * x;
    return last;
  };
}

/** Hochpass, damit die Fläche nicht mit dem Puls kollidiert. */
function makeHighpass(cutoffHz) {
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const alpha = rc / (rc + 1 / SR);
  let lastIn = 0;
  let lastOut = 0;
  return (input) => {
    const out = alpha * (lastOut + input - lastIn);
    lastIn = input;
    lastOut = out;
    return out;
  };
}

/* ================================ Noten ================================= */

/** Frequenz einer Note (A4 = 440 Hz). */
function note(name) {
  const table = {
    C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
  };
  const match = /^([A-G]#?)(-?\d)$/.exec(name);
  if (!match) throw new Error(`Unbekannte Note: ${name}`);
  const semitone = table[match[1]] + (Number(match[2]) + 1) * 12;
  return 440 * 2 ** ((semitone - 69) / 12);
}

/**
 * Akkordfolge des Stücks. Jeder Eintrag gilt für 8 Sekunden.
 * a-Moll-Umfeld: ruhig, leicht melancholisch, ohne Kitsch.
 */
const PROGRESSION = [
  ['A2', 'E3', 'A3', 'C4'],   // Am
  ['F2', 'C3', 'F3', 'A3'],   // F
  ['C3', 'G3', 'C4', 'E4'],   // C
  ['G2', 'D3', 'G3', 'B3'],   // G
];

const BAR = 8.0; // Sekunden pro Akkord

/* =========================== Klangbausteine ============================= */

/**
 * Flächenklang: mehrere leicht verstimmte Sinus-/Dreieckstimmen.
 * @param {number} startSec
 * @param {number} durSec
 * @param {number} freq
 * @param {number} gain
 * @param {number} pan
 */
function pad(startSec, durSec, freq, gain, pan) {
  const start = Math.floor(startSec * SR);
  const total = Math.floor(durSec * SR);
  const lp = makeLowpass(1400);
  // Drei Stimmen mit minimalem Versatz ergeben Breite ohne Chorus-Effekt.
  const detunes = [0.9985, 1, 1.0016];

  for (let i = 0; i < total; i += 1) {
    const t = i / SR;
    const env = envelope(i, durSec, { a: 1.6, d: 1.2, s: 0.82, r: 2.2 });
    let sample = 0;
    for (let v = 0; v < detunes.length; v += 1) {
      const f = freq * detunes[v];
      // Sinus plus leiser dritter Teilton – wärmer als ein reiner Sinus.
      sample += Math.sin(2 * Math.PI * f * t) * 0.7;
      sample += Math.sin(2 * Math.PI * f * 3 * t) * 0.06;
    }
    sample /= detunes.length;
    // Langsames Atmen der Fläche
    const breath = 0.86 + 0.14 * Math.sin(2 * Math.PI * 0.06 * t + freq);
    add(start + i, lp(sample) * env * gain * breath, pan);
  }
}

/** Arpeggio: kurze, perlende Töne. */
function pluck(startSec, freq, gain, pan = 0, durSec = 0.7) {
  const start = Math.floor(startSec * SR);
  const total = Math.floor(durSec * SR);
  const lp = makeLowpass(3200);
  for (let i = 0; i < total; i += 1) {
    const t = i / SR;
    const env = Math.exp(-t * 6.5);
    const sample = Math.sin(2 * Math.PI * freq * t)
      + Math.sin(2 * Math.PI * freq * 2 * t) * 0.22
      + Math.sin(2 * Math.PI * freq * 3.01 * t) * 0.08;
    add(start + i, lp(sample) * env * gain, pan);
  }
}

/** Weicher Kick: tiefer Sinus mit fallender Tonhöhe. */
function kick(startSec, gain = 0.5) {
  const start = Math.floor(startSec * SR);
  const total = Math.floor(0.42 * SR);
  for (let i = 0; i < total; i += 1) {
    const t = i / SR;
    const f = 118 * Math.exp(-t * 26) + 42;
    const env = Math.exp(-t * 7.5);
    add(start + i, Math.sin(2 * Math.PI * f * t) * env * gain, 0);
  }
}

/** Hi-Hat: gefiltertes Rauschen, sehr kurz. */
function hat(startSec, gain = 0.12, pan = 0.2) {
  const start = Math.floor(startSec * SR);
  const total = Math.floor(0.08 * SR);
  const hp = makeHighpass(6500);
  for (let i = 0; i < total; i += 1) {
    const t = i / SR;
    const env = Math.exp(-t * 60);
    add(start + i, hp(noise()) * env * gain, pan);
  }
}

/** Klick eines Bedienelements: sehr kurzer, hoher Impuls. */
function click(startSec, gain = 0.16, pan = 0) {
  const start = Math.floor(startSec * SR);
  const total = Math.floor(0.06 * SR);
  const hp = makeHighpass(1800);
  for (let i = 0; i < total; i += 1) {
    const t = i / SR;
    const env = Math.exp(-t * 90);
    const tone = Math.sin(2 * Math.PI * 2400 * t) * 0.6 + noise() * 0.4;
    add(start + i, hp(tone) * env * gain, pan);
  }
}

/** Datenpaket: kurzer, aufsteigender Ton. */
function blip(startSec, from = 900, to = 1600, gain = 0.1, pan = 0) {
  const start = Math.floor(startSec * SR);
  const total = Math.floor(0.16 * SR);
  for (let i = 0; i < total; i += 1) {
    const t = i / SR;
    const p = i / total;
    const f = lerp(from, to, p);
    const env = Math.sin(p * Math.PI) ** 1.4;
    add(start + i, Math.sin(2 * Math.PI * f * t) * env * gain, pan);
  }
}

/** Dart-Einschlag: Anschlag plus kurzer Körper. */
function impact(startSec, gain = 0.55) {
  const start = Math.floor(startSec * SR);
  const total = Math.floor(0.9 * SR);
  const lp = makeLowpass(2600);
  for (let i = 0; i < total; i += 1) {
    const t = i / SR;
    // Anschlag: Rauschen mit sehr schnellem Abfall
    const crack = noise() * Math.exp(-t * 120) * 0.9;
    // Körper: tiefer Ton, der ausklingt
    const body = (Math.sin(2 * Math.PI * 160 * t) + Math.sin(2 * Math.PI * 96 * t) * 0.7)
      * Math.exp(-t * 12) * 0.5;
    add(start + i, lp(crack + body) * gain, 0);
  }
}

/** Übergangsrauschen (Whoosh): Rauschen mit wandernder Filterfrequenz. */
function whoosh(startSec, durSec = 0.85, gain = 0.2, direction = 1) {
  const start = Math.floor(startSec * SR);
  const total = Math.floor(durSec * SR);
  let lpState = 0;
  for (let i = 0; i < total; i += 1) {
    const p = i / total;
    const cutoff = direction > 0 ? lerp(280, 4200, p) : lerp(4200, 280, p);
    const x = Math.exp(-2 * Math.PI * cutoff / SR);
    lpState = noise() * (1 - x) + lpState * x;
    const env = Math.sin(p * Math.PI) ** 1.2;
    // Gegenläufige Panoramafahrt macht den Übergang räumlich.
    add(start + i, lpState * env * gain, lerp(-0.75, 0.75, direction > 0 ? p : 1 - p));
  }
}

/** Ball rollt: leises, tieffrequentes Rumpeln. */
function roll(startSec, durSec, gain = 0.075) {
  const start = Math.floor(durSec > 0 ? startSec * SR : 0);
  const total = Math.floor(durSec * SR);
  const lp = makeLowpass(320);
  for (let i = 0; i < total; i += 1) {
    const p = i / total;
    const env = Math.sin(p * Math.PI) ** 0.7 * (1 - p * 0.45);
    add(start + i, lp(noise()) * env * gain, 0);
  }
}

/** Ball fällt ins Loch: kurzer, tiefer "Plopp" mit hellem Anklang. */
function holed(startSec, gain = 0.4) {
  const start = Math.floor(startSec * SR);
  const total = Math.floor(0.7 * SR);
  const lp = makeLowpass(1800);
  for (let i = 0; i < total; i += 1) {
    const t = i / SR;
    const f = 320 * Math.exp(-t * 9) + 90;
    const env = Math.exp(-t * 6);
    const bell = Math.sin(2 * Math.PI * 1320 * t) * Math.exp(-t * 14) * 0.25;
    add(start + i, lp(Math.sin(2 * Math.PI * f * t) * env + bell) * gain, 0);
  }
}

/** Aufsteigender Ton für Höhepunkte (Riser). */
function riser(startSec, durSec, gain = 0.16) {
  const start = Math.floor(startSec * SR);
  const total = Math.floor(durSec * SR);
  for (let i = 0; i < total; i += 1) {
    const t = i / SR;
    const p = i / total;
    const f = lerp(180, 900, p ** 1.7);
    const env = p ** 2;
    const sample = Math.sin(2 * Math.PI * f * t) * 0.5 + noise() * 0.2 * p;
    add(start + i, sample * env * gain, 0);
  }
}

/* ============================== Arrangement ============================= */

process.stdout.write(`Tonspur berechnen: ${DURATION.toFixed(1)} s\n`);

/* --- Flächen: Akkorde über die gesamte Länge, dynamisch abgestuft --- */
const SECTION_GAIN = [
  { from: 0.0, to: 9.5, gain: 0.30 },     // Einstieg: sehr zurückhaltend
  { from: 9.5, to: 22.0, gain: 0.34 },    // Ausgangslage
  { from: 22.0, to: 41.6, gain: 0.40 },   // Architektur
  { from: 41.6, to: 56.6, gain: 0.42 },   // Steuerung
  { from: 56.6, to: 94.0, gain: 0.30 },   // Demo: Platz für Bedien-Geräusche
  { from: 94.0, to: 107.0, gain: 0.42 },  // Möglichkeiten
  { from: 107.0, to: DURATION, gain: 0.46 }, // Abschluss
];

function sectionGain(timeSec) {
  const entry = SECTION_GAIN.find((s) => timeSec >= s.from && timeSec < s.to);
  return entry ? entry.gain : 0.34;
}

for (let bar = 0; bar * BAR < DURATION; bar += 1) {
  const startSec = bar * BAR;
  const chord = PROGRESSION[bar % PROGRESSION.length];
  const gain = sectionGain(startSec) * 0.16;
  chord.forEach((noteName, i) => {
    // Stimmen leicht im Panorama verteilen.
    const pan = lerp(-0.45, 0.45, i / (chord.length - 1));
    pad(startSec, BAR + 1.6, note(noteName), gain, pan);
  });
}

/* --- Arpeggio ab der Architektur-Szene --- */
for (let step = 0; step * 0.5 < DURATION; step += 1) {
  const timeSec = step * 0.5;
  if (timeSec < 22 || timeSec > 107.5) continue;
  // In der Demo dünner, damit die Bedienung hörbar bleibt.
  const dense = timeSec >= 56.6 && timeSec < 94 ? step % 4 === 0 : step % 2 === 0;
  if (!dense) continue;
  const chord = PROGRESSION[Math.floor(timeSec / BAR) % PROGRESSION.length];
  const noteName = chord[(step + Math.floor(step / 4)) % chord.length];
  const octave = step % 8 < 4 ? 1 : 2;
  pluck(timeSec, note(noteName) * octave, 0.075 * (sectionGain(timeSec) / 0.4), step % 4 < 2 ? -0.3 : 0.3);
}

/* --- Puls: ab der Steuerung, in der Demo zurückgenommen --- */
for (let beat = 0; beat * 0.5 < DURATION; beat += 1) {
  const timeSec = beat * 0.5;
  if (timeSec < 41.6 || timeSec > 107.0) continue;
  const inDemo = timeSec >= 56.6 && timeSec < 94.0;
  const level = inDemo ? 0.22 : 0.42;
  if (beat % 4 === 0) kick(timeSec, level);
  if (beat % 4 === 2) kick(timeSec, level * 0.55);
  if (beat % 2 === 1) hat(timeSec, inDemo ? 0.045 : 0.085, beat % 4 === 1 ? 0.25 : -0.25);
}

/* --- Szene 1: Dartflug, Einschlag, Aufbau des Schriftzugs --- */
whoosh(0.62, 0.55, 0.26, 1);           // Dart fliegt heran
impact(1.15, 0.6);                     // Einschlag
riser(0.4, 0.75, 0.1);
for (let i = 0; i < 6; i += 1) blip(1.2 + i * 0.05, 1200 + i * 180, 1800 + i * 220, 0.045, lerp(-0.5, 0.5, i / 5));
[4.6, 4.76, 4.92].forEach((timeSec, i) => click(timeSec, 0.1, lerp(-0.3, 0.3, i / 2)));
whoosh(8.95, 0.9, 0.22, -1);           // Übergang Balken

/* --- Szene 2: erkannte Würfe --- */
[11.5, 12.55, 13.6].forEach((timeSec, i) => {
  blip(timeSec, 700 + i * 120, 1500 + i * 200, 0.1, lerp(-0.4, 0.4, i / 2));
  click(timeSec + 0.95, 0.09);
});
riser(19.6, 1.5, 0.12);                // vor der Frage
whoosh(21.5, 1.0, 0.24, 1);            // Iris-Übergang

/* --- Szene 3: Datenpakete durch die Kette --- */
[25.4, 27.0, 28.5, 30.1].forEach((timeSec, i) => {
  for (let k = 0; k < 4; k += 1) {
    blip(timeSec + k * 0.42, 800 + k * 220, 1200 + k * 260, 0.055, lerp(-0.5, 0.5, k / 3));
  }
  if (i === 3) {
    // Der abgewiesene Duplikat-Treffer klingt anders: fallender Ton.
    blip(timeSec + 1.5, 1400, 520, 0.11, 0.35);
  }
});
whoosh(41.0, 0.95, 0.22, -1);

/* --- Szene 4: Richtungen und Stärken --- */
[43.1, 44.6, 46.1, 47.6].forEach((timeSec, i) => {
  click(timeSec, 0.13, lerp(-0.35, 0.35, i / 3));
  blip(timeSec + 0.1, 900, 1500, 0.06, lerp(-0.35, 0.35, i / 3));
});
[50.1, 50.5, 50.9].forEach((timeSec, i) => blip(timeSec, 500 + i * 260, 900 + i * 320, 0.075));
whoosh(56.1, 0.95, 0.24, 1);

/* --- Szene 5: Bedienung der App (Klicks passend zu den Schritten) --- */
const DEMO_CLICKS = [
  58.4, 62.5, 64.6, 66.8, 68.4, 69.8, 71.7,  // Dialog, Test, Setup
  74.2, 74.8, 75.4,                          // Segment, Triple, auslösen
  81.0, 81.6,                                // Bullseye, auslösen
  89.0, 90.0,                                // Panel zu, Zusammenfassung
];
DEMO_CLICKS.forEach((timeSec) => click(timeSec, 0.14));

// Abschlag, Rollen und Einlochen – zeitlich an die echte Physik gelegt.
impact(76.2, 0.3);            // Abschlag Triple 20
roll(76.4, 3.4, 0.07);
impact(82.4, 0.26);           // Abschlag Bullseye
roll(82.6, 2.9, 0.06);
holed(86.0, 0.42);            // Ball fällt
blip(86.3, 900, 1800, 0.09);
riser(90.6, 1.2, 0.1);        // Übergang zum Endstand
whoosh(93.5, 1.0, 0.22, -1);

/* --- Szene 6: Karten --- */
for (let i = 0; i < 6; i += 1) {
  const timeSec = 94.6 + i * 0.22;
  click(timeSec, 0.075, lerp(-0.4, 0.4, i / 5));
  blip(timeSec + 0.05, 1000 + i * 90, 1500 + i * 120, 0.05, lerp(-0.4, 0.4, i / 5));
}
whoosh(106.5, 1.0, 0.2, 1);

/* --- Szene 7: Abschluss --- */
riser(107.1, 1.1, 0.1);
roll(110.4, 2.3, 0.06);       // Ball rollt zum Loch
holed(112.7, 0.44);           // und fällt

/* ============================== Ausspielen ============================== */

/** Sanfter Ein- und Ausklang der gesamten Spur. */
const FADE_IN = 1.2 * SR;
const FADE_OUT = 3.4 * SR;

/** Kompressor-Ersatz: weiche Begrenzung, damit nichts übersteuert. */
function softClip(x) {
  return Math.tanh(x * 1.05) * 0.97;
}

let peak = 0;
for (let i = 0; i < LENGTH; i += 1) {
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}
// Auf einen ruhigen Zielpegel normalisieren (Musik unter der Sprachebene).
const normalize = peak > 0 ? 0.62 / peak : 1;

const buffer = Buffer.alloc(44 + LENGTH * 4);
buffer.write('RIFF', 0, 'ascii');
buffer.writeUInt32LE(36 + LENGTH * 4, 4);
buffer.write('WAVE', 8, 'ascii');
buffer.write('fmt ', 12, 'ascii');
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);          // PCM
buffer.writeUInt16LE(2, 22);          // Stereo
buffer.writeUInt32LE(SR, 24);
buffer.writeUInt32LE(SR * 4, 28);     // Bytes pro Sekunde
buffer.writeUInt16LE(4, 32);          // Bytes pro Frame
buffer.writeUInt16LE(16, 34);         // Bit pro Sample
buffer.write('data', 36, 'ascii');
buffer.writeUInt32LE(LENGTH * 4, 40);

for (let i = 0; i < LENGTH; i += 1) {
  let fade = 1;
  if (i < FADE_IN) fade = i / FADE_IN;
  if (i > LENGTH - FADE_OUT) fade = Math.max(0, (LENGTH - i) / FADE_OUT);

  const l = softClip(left[i] * normalize) * fade;
  const r = softClip(right[i] * normalize) * fade;
  buffer.writeInt16LE(Math.round(clamp(l, -1, 1) * 32767), 44 + i * 4);
  buffer.writeInt16LE(Math.round(clamp(r, -1, 1) * 32767), 46 + i * 4);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, buffer);

process.stdout.write(`Fertig: ${OUT} (${(buffer.length / 1048576).toFixed(1)} MB, Spitze vor Normalisierung ${peak.toFixed(2)})\n`);
