# Dorfdulli Racing — Website-Übersicht

Statische Website ohne Build-Schritt (reines HTML/CSS/JS), gehostet über
GitHub Pages unter der Domain **dorfdulliracing.de** (siehe `CNAME`).
Community-Seite für „Dorfdulli Racing" — Motocross & Enduro, plus ein
angegliederter Dart-Bereich (Döbrichauer Steeldart) und ein eingebettetes
SaaS-Tool (FBA-Rechner).

---

## 1. Startseite — `index.html`

**Motocross & Enduro Community-Landingpage.**

- Animiertes Hero-Intro mit großem Titel „Dorfdulli Racing", Hintergrundvideo
  (`images/hero.MP4`) und Hintergrundmusik (`images/background.mp3`)
- Laufende Marquee-Leiste („Motocross × Enduro × Dorfdulli Racing × Offroad")
- Abschnitt **„The Crew"** mit Foto-Galerie der Gruppe
- CTA-Sektion „Bock aufs *Gas*?" mit Button „Explore the Crew"
- **Newsletter-Popup** mit E-Mail-Anmeldeformular
- Ausklappbares **Seitenmenü** (Glassmorphism) mit Links zu:
  - Startseite, Mitgliederbereich (Login-Status wird live angezeigt),
    Gallery (in Arbeit), Events, Dart, Blog (in Arbeit), Instagram,
    Impressum, sowie ein externer Partner-Link (Pizza-Service)
- Responsive, Dark-Design, eigene CSS-Animationen (kein Framework)

## 2. Events — `events.html`

Terminübersicht für Vereins- und Community-Events, Karten im Editorial-Stil:

- **3H Block'N'Duro** (11.04.2026) — 3-Stunden-Enduro beim MSC Pflückuff,
  ca. 6 km Rundkurs mit Wald, Steigungen und Wasserdurchfahrten; Link zur
  offiziellen Ausschreibung
- **3. Döbrichauer Steeldart-Zeltturnier** (29.08.2026, 16:00 Uhr) — im
  Festzelt des FSV Döbrichau e. V., Vorrunde im Modus 501 Double Out,
  anschließend K.-o.-Runde; Adresse angegeben; Button „Zum Kalender
  hinzufügen" verlinkt auf eine mitgelieferte `.ics`-Datei
  (`doebrichau-steeldart-2026.ics`)
- Events werden clientseitig automatisch als „vergangen" markiert, sobald
  das im Markup hinterlegte Datum verstrichen ist

## 3. Mitgliederbereich — `login.html` / `members.html`

- **Login/Registrierung** (`login.html`) mit Benutzername, E-Mail, Passwort
  und optionalem Referral-Code; Anbindung an **Supabase** als Backend
- **Mitgliederbereich** (`members.html`) prüft den Login-Status und zeigt
  interne Mitgliedsdaten; nicht eingeloggte Besucher werden entsprechend
  informiert
- Login-Status wird sitenweit im Seitenmenü der Startseite gespiegelt
  (Status „Gast" vs. eingeloggt)

## 4. Uploads — `upload.html`

Interner Upload-Bereich für Mitglieder: Datei-Inputs für Bilder/Videos
(`accept="image/*,video/*"`), zugangsbeschränkt über den gleichen
Supabase-Login wie der Mitgliederbereich.

## 5. Gallery — `gallery.html`

Bildergalerie rund um die **KTM 125 SX** der Crew (Hero-Bild + Fotostrecke).
Im Hauptmenü aktuell noch als „Soon" markiert, existiert als Seite aber
bereits.

## 6. Dart Lounge — `tetris.html`

*(Dateiname historisch bedingt „tetris.html" — Inhalt ist ein vollwertiges
Turnier-Tool, kein Tetris.)*

Digitales Turnier-Management-Tool für Dart-Spielabende, „powered by
Dorfdulli Racing":

- Spieler erfassen, **Round-Robin-Turnierplan** automatisch generieren
- Ergebniserfassung pro Match (Legs/Sets), automatische **Tabellenberechnung**
- Unterstützung für Stechen/Bull-off bei Gleichstand
- Turnierstand, Spielplan und Ergebnisse werden lokal gespeichert
  (`localStorage`) — mehrere „Spielabende" lassen sich anlegen und löschen
- Screen-Wake-Lock (Bildschirm bleibt während des Spiels an) und
  Konfetti-Animation bei Turnierabschluss
- Läuft komplett offline im Browser, kein Server nötig

## 7. Sonstige Seiten

- **`pinball.html`** — eigenständiges, mobiloptimiertes Pinball-Spiel
  (Single-File-Prototyp, aktuell nicht im Hauptmenü verlinkt)
- **`impressum.html`** — rechtliches Impressum
- **`404.html`** — „Abgeflogen" — individuelle Fehlerseite

## 8. FBA Startkapital- & Liquiditätsrechner — `fba-rechner/`

Eigenständiges SaaS-artiges Tool, unter `/fba-rechner/` in die Seite
eingebunden: hilft angehenden Amazon-FBA-Händlern zu berechnen, wie viel
Startkapital ein Produkt wirklich braucht und ob sich das Geschäft nach der
ersten Verkaufsrunde selbst trägt. Details siehe `fba-rechner/README.md`;
Kurzfassung:

- Produkt- und Kosten-Eingaben mit automatischen, überschreibbaren
  Amazon-Gebühren-Vorschlägen (Provision, FBA-Gebühr nach Größenklasse,
  Fracht, Verpackung, PPC, Retouren, Lager)
- KPI-Dashboard (Gewinn/Stück, Gesamtgewinn, Umsatz, ROI, Marge,
  Kapitalbindung, Gewinnquote) inkl. Kostenverteilungs-Balken
- **Startkapitalrechner** als Hauptfeature: empfohlenes Startkapital inkl.
  Sicherheitspuffer, mit Klartext-Aussage, ob sich der zweite Bestellzyklus
  selbst trägt
- **Liquiditätssimulation** über 12 Verkaufszyklen mit SVG-Diagrammen
  (Kapital, Gewinn, Bestellmenge) und Tabelle
- **Risikoanalyse** mit Live-Reglern (Einkaufspreis, Verkaufspreis,
  Retourenquote, PPC, Lieferkosten)
- **Szenarien**: beliebig viele Produkte speichern und vergleichen
  (lokal im Browser, `localStorage`)
- Regelbasierte **Bewertung** (✅/⚠️/❌) mit Begründungen
- Dark & Light Mode, komplett responsive, kein Amazon-Konto nötig

### Erklärvideo (`fba-rechner-video/`)

79-sekündiges Produkterklärvideo, mit **Remotion** (React/TypeScript) aus
den echten UI-Komponenten der Website nachgebaut (gleiche Farben,
Design-Tokens, Karten, KPI-Kacheln, Slider). Acht Szenen entlang des
Storyboards: Intro, Produkt anlegen, Kosten, Kennzahlen, Startkapital &
selbsttragender Kreislauf, Wachstumssimulation, Risikoanalyse, Abschluss
mit CTA. Deutsche Sprecherstimme (ElevenLabs-TTS, szenengenau synchronisiert
— aktuell Stimme „George"). Eingebunden auf der Rechner-Seite über eine
Glassmorphism-Video-Karte, die ein barrierefreies Modal öffnet (ESC/Klick
außerhalb schließt, Fokus-Falle, Lazy Loading, MP4 + WebM-Fallback).

## 9. Technisches

- **Kein Framework, kein Build-Schritt** für die Hauptseite — reines
  HTML/CSS/Vanilla-JS, direkt über GitHub Pages ausgeliefert
- **`tracking.js`** — eigenes, leichtgewichtiges Visitor-/Session-Tracking
  auf Basis der Supabase-REST-API (kein SDK, nur `fetch`); vergibt eine
  persistente `visitor_id` (localStorage) und eine `session_id`
  (sessionStorage), legt pro Seitenaufruf einen `page_views`-Eintrag an und
  sendet alle 10 Sekunden einen Heartbeat; Fehler werden immer abgefangen,
  das Skript kann die Seite nie zum Absturz bringen
- **`manifest.json`** + **`sw.js`** — die Seite ist als **PWA**
  installierbar (Name „Dorfdulli Racing", eigenes Icon, Standalone-Modus);
  der Service Worker ist aktuell minimal (kein Caching aktiv)
- **`fba-rechner-video/`** ist die einzige Stelle mit Node-Tooling
  (Remotion-Renderpipeline für das Erklärvideo) — beeinflusst die
  ausgelieferte Website nicht, nur die Video-Assets in
  `fba-rechner/assets/`
