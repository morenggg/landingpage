# FBA Kapital — Startkapital- & Liquiditätsrechner für Amazon FBA

Eine schlanke, moderne Web-App, die vor dem ersten Verkauf beantwortet:
**„Wie viel Geld brauche ich, damit sich mein Amazon-FBA-Business nach der
ersten Verkaufsrunde selbst trägt?"**

Ohne Amazon-Konto nutzbar, ohne Build-Schritt, ohne Backend — alle Daten
bleiben lokal im Browser (`localStorage`).

## Features

- **Produkt & Kosten**: Alle Amazon-Kosten (Provision, FBA-Gebühr nach
  Größenklasse, Fracht, Verpackung, PPC, Retourenreserve, Lager) werden
  automatisch vorgeschlagen und sind jederzeit überschreibbar.
- **Kennzahlen**: Gewinn pro Stück & gesamt, Umsatz, ROI, Marge,
  Kapitalbindung, Gewinnquote — plus Kostenverteilung des Verkaufspreises.
- **Startkapitalrechner** (Hauptfeature): Empfohlenes Startkapital inkl.
  Sicherheitspuffer und Antwort, ob nach dem Abverkauf die nächste
  Bestellung selbst finanziert ist.
- **Liquiditätssimulation**: 12 Verkaufszyklen mit Reinvestition, Diagramme
  für Kapital-, Gewinn- und Bestellmengenentwicklung + Tabelle. Optionales
  Absatzlimit pro Zyklus.
- **Risikoanalyse**: Live-Schieberegler (Einkaufspreis ↑, Verkaufspreis ↓,
  Retourenquote ↑, PPC ↑, Lieferkosten ↑) — alle Ergebnisse aktualisieren
  sich sofort, mit Basis-vs.-Risiko-Vergleich.
- **Szenarien**: Beliebig viele Produkte speichern, laden, löschen und in
  einer Vergleichstabelle gegenüberstellen.
- **Intelligente Bewertung**: Ampel (✅ / ⚠️ / ❌) mit konkreten Begründungen.
- Dark & Light Mode, responsive, ohne Fremdbibliotheken.

## Architektur

```
fba-rechner/
├── index.html        Struktur & Layout (Karten, Formulare, Diagramm-Container)
├── css/styles.css    Design-System (CSS-Variablen für Light/Dark, Karten, KPIs)
└── js/
    ├── calc.js       Reiner Berechnungskern — pure functions, kein DOM
    ├── charts.js     SVG-Liniendiagramme mit Crosshair-Tooltip, keine Libs
    └── app.js        UI-Schicht: State, Event-Wiring, Rendering, localStorage
```

Die strikte Trennung (Berechnung ↔ Diagramme ↔ UI) hält den Code wartbar
und testbar: `calc.js` ist vollständig DOM-frei.

## Erweiterungspunkte

Die Struktur ist auf spätere Ausbaustufen vorbereitet:

- **Amazon SP-API / echte Verkaufsdaten**: Das ASIN-Feld existiert bereits;
  ein Import müsste nur `state.product` und `state.costs` befüllen
  (clientseitiger Abruf scheitert heute an CORS — dafür wird ein kleines
  Backend oder eine Serverless-Function benötigt).
- **Zoll / Containerkosten / Lieferanten**: Als weitere Einträge in
  `COST_FIELDS` (app.js) plus Vorschlagslogik in `suggestCosts()` (calc.js).
- **Währungsumrechnung**: Die `Intl.NumberFormat`-Formatter in app.js sind
  die einzige Stelle mit fester Währung.
- **CSV-/PDF-Export**: `simulate()` und `computeResults()` liefern bereits
  vollständige, serialisierbare Datensätze.
- **Mehrbenutzerfähigkeit**: `loadScenarios()`/`persistScenarios()` sind die
  einzige Persistenz-Schicht — gegen eine API austauschbar.

## Entwicklung

Statisch hostbar (z. B. GitHub Pages). Lokal:

```bash
python3 -m http.server 8000
# → http://localhost:8000/fba-rechner/
```

Hinweis: Gebühren-Vorschläge basieren auf vereinfachten Amazon.de-Tarifen
und sind Schätzwerte — die tatsächlichen Gebühren zeigt das Verkäuferkonto.
