/**
 * Erzeugt die Voiceover-Segmente über die ElevenLabs-API.
 *
 * Aufruf:  ELEVENLABS_API_KEY=... node voiceover/generate-voice.mjs
 *
 * Nutzt `curl` statt fetch() für die HTTP-Aufrufe, weil Node's eingebautes
 * fetch (undici) den HTTPS_PROXY dieser Umgebung nicht automatisch beachtet —
 * curl tut das und ist hier bereits als funktionierend verifiziert.
 *
 * Der API-Key wird ausschließlich aus der Umgebungsvariable gelesen, nie
 * geloggt und nirgends gespeichert. Die Segmente landen in assets/voice/*.mp3
 * und werden von der Remotion-Komposition automatisch eingebunden (Root.tsx).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const API = 'https://api.elevenlabs.io/v1';
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error('ELEVENLABS_API_KEY ist nicht gesetzt.');
  process.exit(1);
}

// Standardstimme "Sarah" (ElevenLabs Premade Voice) — warm, professionell,
// gut geeignet für multilinguale SaaS-Erklärvideos. Der verwendete Schlüssel
// hat keine Berechtigung zum Auflisten der Stimmen (voices_read), daher fest
// hinterlegt statt dynamisch abgefragt.
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';

// Segmente — Texte und Zeitfenster siehe voiceover/script.md
const SEGMENTS = [
  ['s1', 'Willkommen beim Amazon-FBA-Startkapital-Rechner. Plane dein Business, noch bevor du verkaufst.'],
  ['s2', 'Leg einfach los: Produktname, Verkaufspreis, Einkaufspreis, Stückzahl und Kategorie – mehr braucht es für den Start nicht.'],
  ['s3', 'Alle Amazon-Kosten schlägt der Rechner automatisch vor. Jeden Wert kannst du jederzeit selbst überschreiben.'],
  ['s4', 'Im selben Moment stehen alle Kennzahlen bereit: Gewinn pro Stück, Gesamtgewinn, Rendite und Marge – deine Wirtschaftlichkeit auf einen Blick.'],
  ['s5a', 'Und jetzt die wichtigste Zahl: dein Startkapital – inklusive Sicherheitspuffer.'],
  ['s5b', 'Nach dem ersten Abverkauf finanziert sich die nächste Bestellung von ganz allein.'],
  ['s6', 'Simuliere mehrere Verkaufszyklen und sieh zu, wie Kapital und Bestellmenge von Runde zu Runde wachsen.'],
  ['s7', 'Was, wenn der Preis sinkt oder die Retouren steigen? Zieh an den Reglern – alle Zahlen reagieren sofort.'],
  ['s8', 'Plane smarter. Starte sicher. Wachse schneller. Jetzt dein Startkapital berechnen.'],
];

/** POST via curl; gibt den Response-Body als Buffer zurück, wirft bei Nicht-2xx. */
function curlPost(url, bodyObj, outFile) {
  const bodyFile = join(tmpdir(), `elbody-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(bodyFile, JSON.stringify(bodyObj));
  try {
    const code = execFileSync('curl', [
      '-s', '-o', outFile, '-w', '%{http_code}',
      '-H', `xi-api-key: ${KEY}`,
      '-H', 'Content-Type: application/json',
      '-X', 'POST', url,
      '--data', `@${bodyFile}`,
    ], { encoding: 'utf8' }).trim();
    if (code !== '200') {
      const body = readFileSync(outFile, 'utf8').slice(0, 500);
      throw new Error(`HTTP ${code} — ${body}`);
    }
  } finally {
    unlinkSync(bodyFile);
  }
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'assets', 'voice');
mkdirSync(outDir, { recursive: true });

console.log(`Stimme: Sarah (${VOICE_ID})`);
for (const [name, text] of SEGMENTS) {
  const file = join(outDir, `${name}.mp3`);
  curlPost(
    `${API}/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.25 },
    },
    file,
  );
  const size = readFileSync(file).length;
  console.log(`${file} — ${(size / 1024).toFixed(0)} KiB`);
}
console.log('\nFertig.');
