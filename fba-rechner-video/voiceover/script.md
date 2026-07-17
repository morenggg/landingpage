# Sprechertext (Voiceover) — szenengenau synchronisiert

Video: 79 s, 30 fps, Szenengrenzen bei 0 / 8 / 18 / 28 / 38 / 51 / 61 / 71 s.
Jedes Segment startet kurz nach dem Einblenden der Szene und endet vor dem
Szenenwechsel. „Fenster“ = maximale Sprechdauer.

| Seg | Start   | Fenster | Szene (Bildinhalt)                          | Text |
|-----|---------|---------|---------------------------------------------|------|
| s1  | 0,4 s   | 7,2 s   | Logo-Animation, Titel, Untertitel           | Willkommen beim Amazon-FBA-Startkapital-Rechner. Hier planst du dein Business – noch bevor du das erste Produkt verkaufst. |
| s2  | 8,4 s   | 9,2 s   | Produktkarte, Felder werden ausgefüllt      | Leg einfach los: Produktname, Verkaufspreis, Einkaufspreis, Stückzahl und Kategorie – mehr braucht es für den Start nicht. |
| s3  | 18,4 s  | 9,2 s   | Kostenkarte, Vorschläge erscheinen, PPC wird überschrieben | Alle Amazon-Kosten schlägt der Rechner automatisch vor – von der Provision bis zur Werbung. Und jeden Wert kannst du jederzeit selbst überschreiben. |
| s4  | 28,4 s  | 9,2 s   | KPI-Kacheln zählen hoch                     | Im selben Moment stehen alle Kennzahlen bereit: Gewinn pro Stück, Gesamtgewinn, Rendite und Marge – deine Wirtschaftlichkeit auf einen Blick. |
| s5a | 38,4 s  | 5,8 s   | Startkapital-Karte leuchtet, 667,70 € zählt hoch | Und jetzt die wichtigste Zahl: dein Startkapital – inklusive Sicherheitspuffer. |
| s5b | 44,9 s  | 5,7 s   | Kreislauf: 1. Bestellung → Abverkauf → 2. Bestellung ✓ | Das Beste: Nach dem ersten Abverkauf finanziert sich die nächste Bestellung von ganz allein. |
| s6  | 51,4 s  | 9,2 s   | Wachstumskurve zeichnet sich, Zähler laufen | Simuliere mehrere Verkaufszyklen und sieh zu, wie Kapital und Bestellmenge von Runde zu Runde wachsen. |
| s7  | 61,4 s  | 9,2 s   | Risiko-Regler bewegen sich, Gewinn reagiert | Was, wenn der Preis sinkt oder die Retouren steigen? Zieh an den Reglern – alle Zahlen reagieren sofort. |
| s8  | 71,3 s  | 7,2 s   | Logo, Tagline, CTA-Button                   | Plane smarter. Starte sicher. Wachse schneller. Berechne jetzt dein Startkapital – kostenlos und direkt im Browser. |

## Stimmen-Vorgaben (ElevenLabs)

- Modell: `eleven_multilingual_v2`
- Stimme: natürliche, freundliche deutsche Stimme (im Generator-Skript wird
  bevorzugt eine Stimme mit Label `de` gewählt; sonst eine multilinguale
  Standardstimme)
- `voice_settings`: stability 0.5, similarity_boost 0.75, style 0.25
- Ausgabe: `mp3_44100_128` → `assets/voice/s1.mp3` … `s8b.mp3`

Nach der Generierung: Dauer jedes Segments mit `npx remotion ffprobe`
gegen die Fenster-Spalte prüfen; zu lange Segmente kürzen (Text straffen,
nicht schneller sprechen lassen).
