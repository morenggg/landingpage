import React from 'react';
import { Composition, Series } from 'remotion';
import {
  S1Welcome, S2Product, S3Costs, S4Results,
  S5StartCapital, S6Growth, S7Risk, S8Outro,
} from './scenes';

const DURATIONS = [240, 300, 300, 300, 390, 300, 300, 240];
const TOTAL = DURATIONS.reduce((a, b) => a + b, 0); // 2370 Frames ≈ 79 s

export const Explainer: React.FC = () => (
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
