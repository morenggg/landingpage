/**
 * Erzeugt die Voiceover-Segmente über die ElevenLabs-API.
 *
 * Aufruf:  ELEVENLABS_API_KEY=... node voiceover/generate-voice.mjs
 *
 * Der API-Key wird ausschließlich aus der Umgebungsvariable gelesen und
 * nirgends gespeichert. Die Segmente landen in assets/voice/*.mp3 und werden
 * von der Remotion-Komposition automatisch eingebunden (siehe Root.tsx).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://api.elevenlabs.io/v1';
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error('ELEVENLABS_API_KEY ist nicht gesetzt.');
  process.exit(1);
}

// Segmente — Texte und Zeitfenster siehe voiceover/script.md
const SEGMENTS = [
  ['s1', 'Willkommen beim Amazon-FBA-Startkapital-Rechner. Hier planst du dein Business – noch bevor du das erste Produkt verkaufst.'],
  ['s2', 'Leg einfach los: Produktname, Verkaufspreis, Einkaufspreis, Stückzahl und Kategorie – mehr braucht es für den Start nicht.'],
  ['s3', 'Alle Amazon-Kosten schlägt der Rechner automatisch vor – von der Provision bis zur Werbung. Und jeden Wert kannst du jederzeit selbst überschreiben.'],
  ['s4', 'Im selben Moment stehen alle Kennzahlen bereit: Gewinn pro Stück, Gesamtgewinn, Rendite und Marge – deine Wirtschaftlichkeit auf einen Blick.'],
  ['s5a', 'Und jetzt die wichtigste Zahl: dein Startkapital – inklusive Sicherheitspuffer.'],
  ['s5b', 'Das Beste: Nach dem ersten Abverkauf finanziert sich die nächste Bestellung von ganz allein.'],
  ['s6', 'Simuliere mehrere Verkaufszyklen und sieh zu, wie Kapital und Bestellmenge von Runde zu Runde wachsen.'],
  ['s7', 'Was, wenn der Preis sinkt oder die Retouren steigen? Zieh an den Reglern – alle Zahlen reagieren sofort.'],
  ['s8', 'Plane smarter. Starte sicher. Wachse schneller. Berechne jetzt dein Startkapital – kostenlos und direkt im Browser.'],
];

const headers = { 'xi-api-key': KEY, 'Content-Type': 'application/json' };

/** Bevorzugt eine deutsche Stimme, sonst eine bewährte multilinguale. */
async function pickVoice() {
  const res = await fetch(`${API}/voices`, { headers });
  if (!res.ok) throw new Error(`voices: HTTP ${res.status}`);
  const { voices } = await res.json();
  const german = voices.find((v) => (v.labels?.language || '').toLowerCase().startsWith('de'));
  const chosen = german ?? voices.find((v) => v.name === 'Sarah') ?? voices[0];
  console.log(`Stimme: ${chosen.name} (${chosen.voice_id})`);
  return chosen.voice_id;
}

async function tts(voiceId, text) {
  const res = await fetch(`${API}/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.25 },
    }),
  });
  if (!res.ok) throw new Error(`tts: HTTP ${res.status} — ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, 'assets', 'voice');
mkdirSync(outDir, { recursive: true });

const voiceId = await pickVoice();
for (const [name, text] of SEGMENTS) {
  const audio = await tts(voiceId, text);
  const file = join(outDir, `${name}.mp3`);
  writeFileSync(file, audio);
  console.log(`${file} — ${(audio.length / 1024).toFixed(0)} KiB`);
}
console.log('\nFertig. Dauer prüfen mit z. B.:');
console.log('  npx remotion ffprobe assets/voice/s1.mp3');
console.log('Danach das Video neu rendern: npm run render');
