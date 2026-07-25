/**
 * DartGolf – Video: Frame-Renderer
 *
 * Rendert die Bühne (studio/index.html) Frame für Frame und schiebt die Bilder
 * direkt in ffmpeg. Es wird nichts in Echtzeit aufgezeichnet: für jeden Frame
 * wird die Zeit gesetzt, gezeichnet und fotografiert. Dadurch
 *
 *   - fällt kein Frame aus, egal wie aufwendig ein Bild ist,
 *   - ist das Ergebnis bei jedem Lauf identisch,
 *   - entstehen keine Zwischendateien auf der Platte.
 *
 * Die echte Web-App läuft dabei in iframes derselben Seite. Damit auch sie
 * Frame-genau mitläuft, wird in diesen iframes die Zeit virtualisiert
 * (requestAnimationFrame, performance.now, Date.now, setTimeout, Math.random).
 *
 * Aufruf:
 *   node build/render.mjs [--fps 30] [--from 0] [--to 12] [--scale 1] [--out datei.mp4]
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const VIDEO_DIR = path.resolve(HERE, '..');

/* ------------------------------- Argumente ------------------------------- */

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const FPS = Number(arg('fps', 30));
const FROM = Number(arg('from', 0));
const TO = arg('to', null);
const SCALE = Number(arg('scale', 1));
const OUT = path.resolve(VIDEO_DIR, arg('out', 'out/video-only.mp4'));
const BASE = arg('base', 'http://127.0.0.1:8099');
const QUALITY = Number(arg('quality', 92));

const WIDTH = Math.round(1920 * SCALE);
const HEIGHT = Math.round(1080 * SCALE);

/** Pfade zu den benötigten Programmen. */
function resolveFfmpeg() {
  const candidates = [
    process.env.FFMPEG_PATH,
    (() => { try { return require('ffmpeg-static'); } catch { return null; } })(),
    '/usr/bin/ffmpeg',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Kein ffmpeg gefunden. FFMPEG_PATH setzen oder ffmpeg-static installieren.');
}

const FFMPEG = resolveFfmpeg();

/**
 * Virtualisierte Zeit für die iframes mit der echten App.
 * Wird vor allen Seitenskripten ausgeführt und greift nur, wenn die Adresse
 * `vclock=1` enthält – die Bühne selbst bleibt unangetastet.
 */
function installVirtualClock() {
  if (!location.search.includes('vclock=1')) return;

  const state = {
    now: 0,
    rafs: new Map(),
    rafId: 1,
    timers: new Map(),
    timerId: 1,
  };
  window.__v = state;

  performance.now = () => state.now;
  const EPOCH = 1784900000000; // fester Startzeitpunkt für reproduzierbare Anzeigen
  Date.now = () => EPOCH + state.now;
  const RealDate = Date;
  // eslint-disable-next-line no-global-assign
  window.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(EPOCH + state.now);
      else super(...args);
    }
    static now() { return EPOCH + state.now; }
  };

  window.requestAnimationFrame = (cb) => {
    const id = state.rafId += 1;
    state.rafs.set(id, cb);
    return id;
  };
  window.cancelAnimationFrame = (id) => state.rafs.delete(id);

  window.setTimeout = (cb, ms = 0, ...args) => {
    const id = state.timerId += 1;
    state.timers.set(id, { cb, args, at: state.now + Math.max(0, ms) });
    return id;
  };
  window.clearTimeout = (id) => state.timers.delete(id);
  window.setInterval = (cb, ms = 16, ...args) => {
    const id = state.timerId += 1;
    state.timers.set(id, { cb, args, at: state.now + Math.max(1, ms), every: Math.max(1, ms) });
    return id;
  };
  window.clearInterval = (id) => state.timers.delete(id);

  // Deterministischer Zufall (linearer Kongruenzgenerator).
  let seed = 20260724;
  Math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  /** Führt die virtuelle Zeit in 60-Hz-Schritten bis `target` (ms) weiter. */
  state.advanceTo = (target) => {
    const STEP = 1000 / 60;
    let guard = 0;
    while (state.now < target - 1e-6 && guard < 200000) {
      guard += 1;
      state.now = Math.min(target, state.now + STEP);

      for (const [id, timer] of [...state.timers]) {
        if (timer.at <= state.now) {
          if (timer.every) timer.at = state.now + timer.every;
          else state.timers.delete(id);
          try { timer.cb(...timer.args); } catch (err) { console.error(err); }
        }
      }

      const due = [...state.rafs.values()];
      state.rafs.clear();
      for (const cb of due) {
        try { cb(state.now); } catch (err) { console.error(err); }
      }
    }
  };
}

/* --------------------------------- Ablauf -------------------------------- */

const problems = [];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: [
    '--force-device-scale-factor=1',
    '--disable-lcd-text',            // gleichmäßige Kanten statt Subpixel-Farbsäume
    '--hide-scrollbars',
    '--mute-audio',
    '--font-render-hinting=none',
    '--disable-font-subpixel-positioning',
  ],
});

const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
});

await context.addInitScript(installVirtualClock);

const page = await context.newPage();
page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
});

const studioUrl = `${BASE}/dartgolf/video/studio/index.html`;
process.stdout.write(`Bühne laden: ${studioUrl}\n`);
await page.goto(studioUrl, { waitUntil: 'load' });

// Auf Schriften und Szenenaufbau warten.
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });

// Die App-Rahmen melden sich, sobald sie geladen und bereit sind.
if (await page.evaluate(() => typeof window.__prepareApps === 'function')) {
  await page.evaluate(() => window.__prepareApps());
  await page.waitForFunction(() => window.__appsReady === true, null, { timeout: 60000 });
}

const duration = TO !== null ? Number(TO) : await page.evaluate(() => window.__duration);
const totalFrames = Math.round((duration - FROM) * FPS);

process.stdout.write(`Rendern: ${duration.toFixed(2)} s · ${FPS} fps · ${totalFrames} Frames · ${WIDTH}x${HEIGHT}\n`);

fs.mkdirSync(path.dirname(OUT), { recursive: true });

const ffmpeg = spawn(FFMPEG, [
  '-y',
  '-hide_banner',
  '-loglevel', 'error',
  '-nostats',
  '-f', 'image2pipe',
  '-framerate', String(FPS),
  '-i', 'pipe:0',
  '-an',
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '21',
  '-pix_fmt', 'yuv420p',
  '-profile:v', 'high',
  '-movflags', '+faststart',
  '-colorspace', 'bt709',
  '-color_primaries', 'bt709',
  '-color_trc', 'bt709',
  OUT,
], { stdio: ['pipe', 'inherit', 'inherit'] });

const ffmpegDone = new Promise((resolve, reject) => {
  ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg endete mit Code ${code}`))));
  ffmpeg.on('error', reject);
});

/** Schreibt einen Frame und wartet, wenn die Pipe voll ist. */
function writeFrame(buffer) {
  if (ffmpeg.stdin.write(buffer)) return Promise.resolve();
  return new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
}

const started = Date.now();

for (let i = 0; i < totalFrames; i += 1) {
  const t = FROM + i / FPS;

  // 1. Zeit setzen: Bühne zeichnen, App-Rahmen gleich mit weiterlaufen lassen.
  await page.evaluate((time) => window.renderFrame(time), t);

  // 2. Bild aufnehmen.
  const buffer = await page.screenshot({ type: 'jpeg', quality: QUALITY });
  await writeFrame(buffer);

  if (i % (FPS * 5) === 0 || i === totalFrames - 1) {
    const done = i + 1;
    const secs = (Date.now() - started) / 1000;
    const rate = done / Math.max(secs, 0.001);
    const rest = (totalFrames - done) / Math.max(rate, 0.001);
    process.stdout.write(
      `  ${String(done).padStart(5)}/${totalFrames}  `
      + `${(done / totalFrames * 100).toFixed(1).padStart(5)} %  `
      + `${rate.toFixed(1)} fps  noch ~${Math.round(rest)} s\n`,
    );
  }
}

ffmpeg.stdin.end();
await ffmpegDone;
await browser.close();

process.stdout.write(`\nFertig: ${OUT}\n`);
if (problems.length > 0) {
  process.stdout.write('\nMeldungen aus der Seite:\n');
  [...new Set(problems)].slice(0, 20).forEach((p) => process.stdout.write(`  ${p}\n`));
} else {
  process.stdout.write('Keine Fehler in der Browser-Konsole.\n');
}
