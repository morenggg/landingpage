/**
 * DartGolf – Video: kompletter Bau
 *
 * Reihenfolge:
 *   1. Untertiteldatei schreiben
 *   2. Tonspur berechnen
 *   3. Bild Frame für Frame rendern
 *   4. Bild und Ton zusammenlegen, Vorschaubild ziehen
 *
 * Voraussetzung: ein Webserver auf 127.0.0.1:8099, der das Repository-Wurzel-
 * verzeichnis ausliefert (siehe README.md im Ordner video/).
 *
 * Aufruf:
 *   node build/build.mjs [--fps 30] [--skip-render] [--skip-audio]
 */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const VIDEO_DIR = path.resolve(HERE, '..');

const has = (flag) => process.argv.includes(`--${flag}`);
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const FPS = arg('fps', '30');
const VIDEO_ONLY = path.join(VIDEO_DIR, 'out', 'video-only.mp4');
const AUDIO = path.join(VIDEO_DIR, 'out', 'soundtrack.wav');
const FINAL = path.join(VIDEO_DIR, 'out', 'dartgolf-demo.mp4');
const POSTER = path.join(VIDEO_DIR, 'out', 'poster.jpg');

const FFMPEG = process.env.FFMPEG_PATH
  || (() => { try { return require('ffmpeg-static'); } catch { return 'ffmpeg'; } })();

/** Führt ein Programm aus und wartet auf das Ende. */
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    process.stdout.write(`\n▸ ${path.basename(command)} ${args.slice(0, 6).join(' ')}${args.length > 6 ? ' …' : ''}\n`);
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${command} endete mit Code ${code}`))));
    child.on('error', reject);
  });
}

const started = Date.now();

/* 1. Untertitel */
await run(process.execPath, [path.join(HERE, 'captions.mjs')], { cwd: VIDEO_DIR });

/* 2. Ton */
if (!has('skip-audio')) {
  await run(process.execPath, [path.join(HERE, 'audio.mjs')], { cwd: VIDEO_DIR });
}

/* 3. Bild */
if (!has('skip-render')) {
  await run(process.execPath, [
    path.join(HERE, 'render.mjs'),
    '--fps', FPS,
    '--out', 'out/video-only.mp4',
  ], { cwd: VIDEO_DIR });
}

/* 4. Zusammenlegen */
if (!fs.existsSync(VIDEO_ONLY)) throw new Error(`Fehlt: ${VIDEO_ONLY}`);
if (!fs.existsSync(AUDIO)) throw new Error(`Fehlt: ${AUDIO}`);

await run(FFMPEG, [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-i', VIDEO_ONLY,
  '-i', AUDIO,
  '-c:v', 'copy',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-ar', '48000',
  '-ac', '2',
  // Kürzeste Spur bestimmt die Länge: Bild und Ton sind gleich lang gebaut.
  '-shortest',
  '-movflags', '+faststart',
  FINAL,
]);

/* Vorschaubild aus einer ruhigen, aussagekräftigen Stelle. */
await run(FFMPEG, [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-ss', '30.5',
  '-i', FINAL,
  '-frames:v', '1',
  '-q:v', '3',
  POSTER,
]);

const size = (fs.statSync(FINAL).size / 1048576).toFixed(1);
const secs = ((Date.now() - started) / 1000).toFixed(0);

process.stdout.write(`\n✓ Fertig in ${secs} s\n`);
process.stdout.write(`  Video:      ${FINAL} (${size} MB)\n`);
process.stdout.write(`  Vorschau:   ${POSTER}\n`);
process.stdout.write(`  Untertitel: ${path.join(VIDEO_DIR, 'captions.srt')}\n`);
