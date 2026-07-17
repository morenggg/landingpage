# fba-rechner-video — Remotion-Erklärvideo

Quellcode des 79-sekündigen Erklärvideos für den
[FBA-Startkapital-Rechner](../fba-rechner/). Gebaut mit
[Remotion](https://remotion.dev) (React + TypeScript); Design-Tokens, Farben
und UI-Bausteine sind aus `fba-rechner/css/styles.css` (Dark Theme)
übernommen, damit das Video exakt wie die Website aussieht.

## Struktur

```
src/
├── index.ts          Remotion-Einstieg (registerRoot)
├── Root.tsx          Komposition „Explainer“ (1920×1080, 30 fps, 2370 Frames)
├── scenes.tsx        Die 8 Storyboard-Szenen
├── theme.ts          Design-Tokens der Website + Inter-Font (eingebettet)
├── inter-font.ts     Inter Variable als Base64-Data-URL (generiert)
└── components/ui.tsx Karten, Felder, KPIs, Slider, Logo — Website-Nachbauten
```

## Szenen (Storyboard)

1. Willkommen (Logo + Titel) · 2. Produkt anlegen · 3. Kosten erfassen ·
4. Sofortige Berechnung (KPIs) · 5. Startkapital + selbsttragender Kreislauf ·
6. Wachstum (Simulation) · 7. Risikoanalyse (Slider) · 8. Abschluss + CTA

## Befehle

```bash
npm install
npm run studio   # Vorschau im Remotion Studio
npm run render   # → ../fba-rechner/assets/explainer.mp4
npm run poster   # → ../fba-rechner/assets/explainer-poster.jpg
```

WebM-Fallback (für Browser ohne H.264) nach dem Render:

```bash
npx remotion ffmpeg -i ../fba-rechner/assets/explainer.mp4 \
  -c:v libvpx-vp9 -crf 38 -b:v 0 -an -y ../fba-rechner/assets/explainer.webm
```

## Hinweise

- `remotion.config.ts` zeigt auf einen vorinstallierten Headless-Chromium;
  Pfad bei Bedarf anpassen oder die Zeile entfernen (Remotion lädt dann
  selbst einen Browser).
- Die Schrift wird bewusst ohne `delayRender` geladen (eingebettete
  Data-URL, `font-display: block`) — Details im Kommentar in `theme.ts`.
