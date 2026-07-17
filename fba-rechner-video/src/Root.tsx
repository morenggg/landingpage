import React from 'react';
import { Audio, Composition, Sequence, Series, staticFile } from 'remotion';
import {
  S1Welcome, S2Product, S3Costs, S4Results,
  S5StartCapital, S6Growth, S7Risk, S8Outro,
} from './scenes';

const DURATIONS = [240, 300, 300, 300, 390, 300, 300, 240];
const TOTAL = DURATIONS.reduce((a, b) => a + b, 0); // 2370 Frames ≈ 79 s

/**
 * Voiceover-Spur: Segmente aus assets/voice/ (siehe voiceover/script.md).
 * Auf true stellen, sobald die Audiodateien mit
 * `ELEVENLABS_API_KEY=... node voiceover/generate-voice.mjs` erzeugt wurden.
 */
const INCLUDE_VOICE = true;

/** [Datei, Startframe] — Starts passend zu den Szenen (30 fps). */
const VOICE_SEGMENTS: Array<[string, number]> = [
  ['s1', 12],    //  0,4 s — Willkommen
  ['s2', 252],   //  8,4 s — Produkt anlegen
  ['s3', 552],   // 18,4 s — Kosten erfassen
  ['s4', 852],   // 28,4 s — Kennzahlen
  ['s5a', 1152], // 38,4 s — Startkapital
  ['s5b', 1347], // 44,9 s — Selbsttragender Kreislauf
  ['s6', 1542],  // 51,4 s — Wachstum
  ['s7', 1842],  // 61,4 s — Risikoanalyse
  ['s8', 2139],  // 71,3 s — Abschluss
];

const VoiceTrack: React.FC = () => (
  <>
    {VOICE_SEGMENTS.map(([name, from]) => (
      <Sequence key={name} from={from}>
        <Audio src={staticFile(`voice/${name}.mp3`)} />
      </Sequence>
    ))}
  </>
);

export const Explainer: React.FC = () => (
  <>
    <Series>
      <Series.Sequence durationInFrames={DURATIONS[0]}><S1Welcome /></Series.Sequence>
      <Series.Sequence durationInFrames={DURATIONS[1]}><S2Product /></Series.Sequence>
      <Series.Sequence durationInFrames={DURATIONS[2]}><S3Costs /></Series.Sequence>
      <Series.Sequence durationInFrames={DURATIONS[3]}><S4Results /></Series.Sequence>
      <Series.Sequence durationInFrames={DURATIONS[4]}><S5StartCapital /></Series.Sequence>
      <Series.Sequence durationInFrames={DURATIONS[5]}><S6Growth /></Series.Sequence>
      <Series.Sequence durationInFrames={DURATIONS[6]}><S7Risk /></Series.Sequence>
      <Series.Sequence durationInFrames={DURATIONS[7]}><S8Outro /></Series.Sequence>
    </Series>
    {INCLUDE_VOICE ? <VoiceTrack /> : null}
  </>
);

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Explainer"
    component={Explainer}
    durationInFrames={TOTAL}
    fps={30}
    width={1920}
    height={1080}
  />
);
