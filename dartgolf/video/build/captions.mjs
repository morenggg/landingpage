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
const OUT = path.resolve(HERE, '..', 'captions.srt');

/** Sekunden → SRT-Zeitstempel (hh:mm:ss,mmm). */
function stamp(seconds) {
  const ms = Math.round(seconds * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const milli = String(ms % 1000).padStart(3, '0');
  return `${h}:${m}:${s},${milli}`;
}

const lines = SUBTITLES
  .slice()
  .sort((a, b) => a.start - b.start)
  .map((entry, index) => `${index + 1}\n${stamp(entry.start)} --> ${stamp(entry.end)}\n${entry.text}\n`);

fs.writeFileSync(OUT, `${lines.join('\n')}`, 'utf8');
process.stdout.write(`Untertitel geschrieben: ${OUT} (${SUBTITLES.length} Einträge)\n`);
