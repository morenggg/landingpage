# DartGolf – Erklärvideo

Dieser Ordner enthält **nicht nur das fertige Video, sondern die komplette
Produktion**: Bühne, Szenen, Tonspur und Bauskripte. Das Video kann jederzeit
identisch neu erzeugt werden.

| Datei | Inhalt |
| --- | --- |
| `out/dartgolf-demo.mp4` | Das fertige Video, 1920×1080, 30 fps, ~116 s |
| `out/poster.jpg` | Vorschaubild |
| `captions.srt` | Untertitel (aus `studio/subtitles.js` erzeugt) |
| `narration.md` | Sprechertext für eine echte Sprachaufnahme |
| `studio/` | Die Bühne: Szenen, Zeitachse, Zeichenbausteine |
| `build/` | Skripte für Bild, Ton, Untertitel und Zusammenbau |

---

## 1 · Was zu sehen ist

| Zeit | Szene | Inhalt |
| --- | --- | --- |
| 0:00 | Einstieg | Dart schlägt ein, Schriftzug baut sich daraus auf |
| 0:09 | Ausgangslage | Erkannte Würfe laufen als Datenpakete in eine Zählanzeige |
| 0:22 | Architektur | DartThrow, Zugfilter, Physik, Anzeige – inklusive abgewiesenem Duplikat |
| 0:41 | Steuerung | Segmentwinkel (Index × 18°) und Multiplikator-Stärken |
| 0:56 | **Live-Demo** | Die echte App: Verbindungsdialog, Einrichtung, Triple 20, Bullseye, Bahnergebnis, Endstand |
| 1:34 | Möglichkeiten | Sechs Karten plus die echte App im Hochformat |
| 1:47 | Abschluss | Zusammenfassung, Adresse, Stand der Autodarts-Anbindung |

Die Live-Demo ist **kein Nachbau**. Es läuft die tatsächliche Anwendung aus
`/dartgolf/` in einem iframe; die Klicks gehen an die echten Bedienelemente,
Ballphysik und Punktezählung kommen aus dem Spiel selbst. Auch der Satz
„bisher kommt keine echte Nachricht an" ist keine Grafik, sondern die Antwort
der App auf „Verbindung testen".

---

## 2 · Warum Frame für Frame gerendert wird

Eine Bildschirmaufnahme in Echtzeit lässt Frames fallen, sobald ein Bild
aufwendig ist. Deshalb läuft es hier umgekehrt:

```
für jeden Frame:
    Zeit setzen  ->  zeichnen  ->  fotografieren  ->  in ffmpeg schieben
```

`studio/index.html` hat dafür genau einen Eintrittspunkt:
`window.renderFrame(t)`. Es gibt keine CSS-Animationen und keine eigenen
Timer – jede Bewegung wird pro Frame aus der Zeit `t` berechnet.

Vorteile:

* kein einziger ausgelassener Frame, unabhängig von der Rechenlast,
* bei jedem Lauf entsteht exakt dasselbe Video,
* keine Zwischenbilder auf der Platte (die Frames gehen direkt in ffmpeg).

### Die echte App Frame-genau mitlaufen lassen

Die App benutzt `requestAnimationFrame` und läuft damit normalerweise in
Echtzeit. Für die Aufnahme wird in den iframes die **Zeit virtualisiert**
(`build/render.mjs` → `installVirtualClock`): `requestAnimationFrame`,
`performance.now`, `Date.now`, `setTimeout`, `setInterval` und `Math.random`
werden ersetzt. Von außen gibt es nur noch einen Hebel:

```js
frame.advanceTo(sekunden);   // schaltet die App auf diesen Zeitpunkt
```

Die Virtualisierung greift **nur** bei Adressen mit `?vclock=1`, also
ausschließlich in den iframes der Aufnahme. Die App selbst bleibt unverändert –
im Repository steht kein Zeile Video-Code in `/dartgolf/src/`.

Ein Nebeneffekt wird bewusst genutzt: der Endstand am Ende der Demo entsteht,
indem ein zweiter, unsichtbarer App-Rahmen in einem einzigen Frame durch eine
komplette Runde geschickt wird. Virtuelle Zeit kostet keine Videozeit.

---

## 3 · Selbst bauen

Voraussetzungen: Node 20+, ein Chromium (Playwright), ffmpeg.

```bash
# 1. Webserver für das Repository-Wurzelverzeichnis
cd /pfad/zum/repo
python3 -m http.server 8099 --bind 127.0.0.1

# 2. Abhängigkeiten (nur für den Bau, nicht für die Website)
cd dartgolf/video
npm install playwright ffmpeg-static

# 3. Alles bauen: Untertitel, Ton, Bild, Zusammenbau
node build/build.mjs --fps 30
```

Einzelschritte:

```bash
node build/captions.mjs                     # captions.srt
node build/audio.mjs                        # out/soundtrack.wav
node build/render.mjs --fps 30              # out/video-only.mp4
node build/render.mjs --fps 10 --from 56.6 --to 94   # nur ein Abschnitt (Vorschau)
```

Nützliche Schalter von `render.mjs`:

| Schalter | Bedeutung |
| --- | --- |
| `--fps 30` | Bildrate |
| `--from` / `--to` | Zeitbereich in Sekunden (schnelle Vorschau) |
| `--scale 0.5` | halbe Auflösung, deutlich schneller |
| `--quality 92` | JPEG-Güte der Einzelbilder |
| `--base http://127.0.0.1:8099` | Adresse des Webservers |

**Wichtig:** Der Server muss auf `127.0.0.1` laufen, nicht auf `localhost`.
Die App registriert auf `localhost` einen Service Worker, der die Aufnahme
mit alten Zwischenständen versorgen könnte.

Dauer eines vollen Durchlaufs: rund 20 Minuten (etwa 3 Frames pro Sekunde,
begrenzt durch die Einzelbildaufnahme).

---

## 4 · Aufbau der Bühne

```
studio/
  index.html        1920×1080, zwei Canvas-Ebenen + DOM-Ebene
  studio.css        Gestaltung, Typografie, Gerätrahmen
  main.js           Szenen, Übergänge, Untertitel, renderFrame(t)
  subtitles.js      Untertitel – einzige Quelle, auch für captions.srt
  lib/
    easing.js       Kurven, Zeitfenster, deterministisches Rauschen
    draw.js         Hintergründe, Verbindungen, Datenpakete, Segmentring,
                    Übergänge (Vorhänge, Lichtwische), Kamera für Canvas
    ui.js           DOM-Bausteine, Textzerlegung, eigene SVG-Symbole
    timeline.js     Zeitachse, Staffelungen, gemeinsame Kamera
    appframe.js     die echte App im iframe: Zeit, Klicks, Zeiger, Kamera
  scenes/
    s1-hook.js  s2-problem.js  s3-flow.js  s4-control.js
    s5-demo.js  s6-features.js s7-outro.js
```

**Gemeinsame Kamera:** DOM-Ebene und Canvas müssen sich bei einer Kamerafahrt
gleich bewegen, sonst laufen Karten und Verbindungslinien auseinander. Dafür
gibt es `camera()` (setzt die DOM-Transformation und liefert die Werte) und
`withCamera()` (wendet dieselben Werte auf einen Canvas-Block an).

**Übergänge** sind keine Überblendungen: Der Vordergrund-Canvas wird als
Vorhang benutzt, aus dem eine wachsende Form herausgeschnitten wird
(Balken, Iris). Dazu kommen Lichtwische und – sparsam – ein Aufblitzen.

### Eine Szene ändern

Jede Szene ist ein Objekt mit `start`, `dur`, `build(root)` und
`render(t, ctx)`. `build` erzeugt das DOM einmalig, `render` setzt pro Frame
nur `transform`, `opacity` und `filter` und zeichnet auf die Canvas-Ebenen.
`t` ist die Zeit **innerhalb** der Szene.

Zum Prüfen einer Änderung genügt ein kurzer Abschnitt:

```bash
node build/render.mjs --fps 12 --from 41.6 --to 57 --out out/_vorschau.mp4
```

---

## 5 · Ton

`build/audio.mjs` berechnet die komplette Tonspur selbst und schreibt eine
WAV-Datei. Es sind **keine fremden Audiodateien im Spiel** – damit gibt es
keine Lizenzfragen.

Enthalten:

* Flächenklang (Pad) mit einer Akkordfolge im a-Moll-Umfeld, 8 s pro Akkord
* Arpeggio ab der Architektur-Szene
* weicher Puls (Kick, Hi-Hat) ab der Steuerungs-Szene, in der Demo abgesenkt
* Geräusche: Dart-Einschlag, Klicks der Bedienung, Datenpakete, Rollen des
  Balls, Einlochen, Übergangsrauschen, Riser

Die Pegel sind so gesetzt, dass eine Sprecherstimme darüber Platz hat
(Mittelwert etwa −28 dB, Spitze −5 dB). Wer `narration.md` einspricht, senkt
die Musik in den Sprechpassagen um weitere 3–4 dB.

---

## 6 · Untertitel und Sprechertext

Es gibt keine Sprachsynthese in der Bauumgebung. Statt einer schlechten
Roboterstimme sind die Kernsätze als gestaltete Untertitel eingebrannt.

* `studio/subtitles.js` – einzige Quelle der Zeiten und Texte
* `captions.srt` – daraus erzeugt (`node build/captions.mjs`)
* `narration.md` – ausformulierter Sprechertext mit Timecodes und Regiehinweisen

Sollen die eingebrannten Untertitel weg (etwa weil eine echte Stimme
aufgenommen wurde), genügt es, die Liste in `subtitles.js` zu leeren und neu
zu rendern.

---

## 7 · Inhaltliche Grundsätze

Das Video ist eine Produkt-Demo, keine Werbung. Deshalb:

* **Nur vorhandene Funktionen.** Jede gezeigte Funktion existiert in
  `/dartgolf/`. Es wird nichts angedeutet, was es nicht gibt.
* **Der Stand der Autodarts-Anbindung wird dreimal klar benannt** – im
  Datenfluss (gestrichelt, gelb, „vorbereitet · ungetestet"), in der Live-Demo
  (die App sagt es selbst) und im Abschluss.
* **Keine fremden Marken oder Grafiken.** Der Segmentring ist eine eigene,
  abstrahierte Darstellung. „Autodarts" wird nur beschreibend genannt.
* **Keine erfundenen Zahlen.** Punktwerte, Stärken (`SHOT_POWER`) und die
  Segmentfolge stammen direkt aus `src/config.js`.

---

## 8 · Bekannte Einschränkungen

* Keine Sprecherstimme (siehe oben) – dafür Untertitel und Sprechertext.
* Die Musik ist selbst synthetisiert und klingt entsprechend schlicht.
  Sie ist als ruhiger Hintergrund gedacht, nicht als Musikstück.
* Der Bau braucht einen laufenden Webserver und rund 20 Minuten.
* `out/soundtrack.wav` ist eine Zwischendatei (21 MB) und wird nicht
  eingecheckt – sie entsteht in Sekunden neu.
* Die Demo läuft in einer Chromium-Version der Bauumgebung. Auf anderen
  Browsern kann die Anwendung minimal anders aussehen (Schriftglättung).
