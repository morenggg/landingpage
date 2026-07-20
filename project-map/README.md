# Projekt-Map – interaktive Repository-Visualisierung

Eine **eigenständige, lokale Dokumentations- und Analyseansicht** für dieses
Repository. Sie stellt alle Dateien, Ordner, Abhängigkeiten, APIs, Datenbank-
Tabellen und externen Dienste als interaktive Karte dar.

> **Wichtig:** Diese Seite ist bewusst **nicht** in die Website eingebunden,
> wird nirgends verlinkt und trägt `noindex, nofollow`. Sie verändert keine
> bestehende Datei und dient ausschließlich der internen Analyse.

## Öffnen

Einfach die Datei direkt im Browser öffnen – es ist kein Server und keine
Build-Umgebung nötig:

```
project-map/index.html
```

(Doppelklick oder per `file://…` öffnen. Alle Bibliotheken sind eingebettet,
es wird nichts von einem CDN geladen.)

## PIN-Schutz

Beim Öffnen erscheint ein PIN-Overlay (Standard-PIN: **1234**). Der PIN wird
nur als SHA-256-Hash verglichen – die Konstante `PIN_HASH` steht zentral am
Anfang von `app.js`, direkt daneben ist beschrieben, wie man einen neuen Hash
erzeugt (`echo -n 'neuerpin' | sha256sum`). Nach 3 Fehlversuchen sperrt die
Eingabe 30 Sekunden, nach 10 Fehlversuchen 5 Minuten (lokal im Browser
gespeichert). Hinweis: Das ist ein Sichtschutz für eine statische Seite,
kein echter Server-Login.

## Bedienung

| Aktion | Bedienung |
| --- | --- |
| Zoomen | Mausrad (weich), `＋`/`－`-Buttons, Pinch mit zwei Fingern |
| Verschieben | Fläche ziehen (mit Trägheit beim Loslassen), Minimap anklicken/ziehen |
| Doppeltipp / Doppelklick | auf Node: fokussieren & heranzoomen · auf Fläche: hineinzoomen |
| Zwei-Finger-Tipp | herauszoomen (Touch) |
| Cluster öffnen | In der Mindmap Bereich/Ordner antippen → klappt animiert auf (▸/▾) |
| Level of Detail | Beim Herauszoomen werden automatisch nur Hauptbereiche/Hubs gezeigt |
| Node verschieben | Karte anklicken und ziehen |
| Details öffnen | Node anklicken → Panel rechts (Desktop) bzw. Bottom Sheet (Mobil) |
| Verbindungstiefe | Im Detailpanel: Tiefe 1 / 2 / 3 / Alle, Button „Abhängigkeiten weiterverfolgen“ |
| Verbindungsart | Mauszeiger über eine Linie halten → Tooltip mit Beziehungstyp |
| Ansicht wechseln | Kopfleiste: **Mindmap · Abhängigkeiten · Ordner · Datenfluss · System** |
| Suche | Suchfeld oben (Dateien, Funktionen, APIs, Pfade, Env-Variablen); Enter fokussiert den Treffer |
| Filter | Linke Leiste: Bereiche, Kategorien, „nur verbundene“, „nur unverbundene“, „nur Auffälligkeiten“, „nur Hubs“ |
| Auffälligkeiten | `⚠`-Button oben rechts; Klick auf einen Hinweis hebt betroffene Dateien hervor |
| Legende | `🗺`-Button oben rechts |
| Vollbild | `⛶`-Button |
| Zentrieren / Layout zurücksetzen | `◎` bzw. `↺` unten links |
| Auswahl aufheben | `Esc` oder Doppelklick auf freie Fläche |

## Daten aktualisieren

Die Karte liest `repository-data.js`. Nach Änderungen am Repository die Daten
neu erzeugen:

```
node project-map/generate-project-map.js
```

Das Skript analysiert das gesamte Repository (ohne `node_modules`, `.git`,
`dist`, `build`, `.next`, `coverage`, `vendor` und `project-map` selbst),
erkennt Imports, Script-/Style-Einbindungen, Asset-Referenzen, Links,
Supabase-Tabellen/-Auth/-Storage, externe Dienste, Environment-Variablen
(nur Namen!) und schreibt das Ergebnis nach `project-map/repository-data.js`.
Danach die Seite im Browser neu laden.

## Dateien in diesem Ordner

| Datei | Zweck |
| --- | --- |
| `index.html` | Die eigenständige Visualisierungsseite |
| `styles.css` | Design (Dark Mode, Glassmorphism) |
| `app.js` | Renderer & Interaktion (eigener SVG-Graph, keine externen Bibliotheken) |
| `repository-data.js` | Generierte Analyse-Daten des Repositories |
| `generate-project-map.js` | Analyse-Skript (Node.js, ohne Abhängigkeiten) |

## Datenschutz & Sicherheit

- Es werden **keine Secrets, Tokens, Passwörter oder Schlüsselwerte** in die
  generierten Dateien übernommen – nur **Namen** von Environment-Variablen
  (z. B. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ELEVENLABS_API_KEY`).
- Das Generator-Skript bricht ab, falls die Ausgabe bekannte Secret-Muster
  enthalten würde.
- Die Seite lädt nichts nach und sendet nichts – sie funktioniert vollständig
  offline.
