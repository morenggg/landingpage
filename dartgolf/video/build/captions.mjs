/**
 * DartGolf – Video: Untertiteldatei erzeugen
 *
 * Schreibt captions.srt aus derselben Quelle, die auch die eingebrannten
 * Untertitel im Video speist (studio/subtitles.js). Damit können Bild und
 * Datei nicht auseinanderlaufen.
 *
 * Aufruf: node build/captions.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUBTITLES } from '../studio/subtitles.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_SRT = path.resolve(HERE, '..', 'captions.srt');
const OUT_VTT = path.resolve(HERE, '..', 'captions.vtt');

/**
 * Sekunden → Zeitstempel.
 * @param {number} seconds
 * @param {string} [sep] Trennzeichen der Millisekunden: ',' für SRT, '.' für WebVTT
 */
function stamp(seconds, sep = ',') {
  const ms = Math.round(seconds * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const milli = String(ms % 1000).padStart(3, '0');
  return `${h}:${m}:${s}${sep}${milli}`;
}

const sorted = SUBTITLES.slice().sort((a, b) => a.start - b.start);

/* SRT – für Videoschnitt und Weitergabe. */
const srt = sorted
  .map((entry, index) => `${index + 1}\n${stamp(entry.start)} --> ${stamp(entry.end)}\n${entry.text}\n`)
  .join('\n');
fs.writeFileSync(OUT_SRT, srt, 'utf8');

/*
 * WebVTT – das einzige Format, das <track> im Browser versteht.
 * Wird von der Einbindung auf /dartgolf/ genutzt.
 */
const vtt = `WEBVTT\n\n${sorted
  .map((entry, index) => `${index + 1}\n${stamp(entry.start, '.')} --> ${stamp(entry.end, '.')}\n${entry.text}\n`)
  .join('\n')}`;
fs.writeFileSync(OUT_VTT, vtt, 'utf8');

process.stdout.write(`Untertitel geschrieben: ${SUBTITLES.length} Einträge\n  ${OUT_SRT}\n  ${OUT_VTT}\n`);
