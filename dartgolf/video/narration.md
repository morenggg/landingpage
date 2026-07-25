# DartGolf – Sprechertext

Sprechertext für das Erklärvideo (`out/dartgolf-demo.mp4`, 116 Sekunden).

**Warum als Datei und nicht als Stimme im Video:** In der Umgebung, in der
dieses Video gebaut wurde, ist keine Sprachsynthese vorhanden. Statt eine
schlechte Roboterstimme einzubauen, sind die Kernsätze als gestaltete
Untertitel eingebrannt (Quelle: `studio/subtitles.js`, identisch mit
`captions.srt`). Dieser Text hier ist die Vorlage für eine echte Aufnahme.

**Tonfall:** ruhig, sachlich, ohne Werbesprache. Kurze Sätze. Keine
Superlative. Wo etwas nicht belegt ist, wird das gesagt.

**Sprechtempo:** etwa 145 Wörter pro Minute. Die Zeiten unten sind die
Startzeiten der jeweiligen Bildpassage.

---

## 1 · Einstieg (0:00 – 0:09)

> **[0:02]** Jeder erkannte Dartwurf wird zu einem Minigolfschlag.
>
> **[0:06]** Alles läuft im Browser – auch ganz ohne Dartscheibe.

*Regie: Der Dart schlägt bei 0:01 ein, daraus baut sich der Schriftzug auf.
Der erste Satz beginnt danach, nicht darüber.*

---

## 2 · Ausgangslage (0:09 – 0:22)

> **[0:10]** Ein Autodarts-System erkennt jeden Wurf: Segment, Multiplikator,
> Punktwert.
>
> **[0:14]** Für ein Spiel ist die Zahl aber erst der Anfang.
>
> **[0:19]** Was, wenn jeder Wurf einen Ball bewegt?

*Regie: Drei Treffer laufen als Datenpakete in eine Zählanzeige. Die Frage
übernimmt danach das ganze Bild.*

---

## 3 · Architektur und Datenfluss (0:22 – 0:41)

> **[0:23]** Deshalb sind Trefferquelle und Spiel strikt getrennt.
>
> **[0:27]** Jede Quelle liefert dasselbe Ereignis: DartThrow. Segment,
> Multiplikator, Punktwert, Kurzschreibweise – und optionale Koordinaten.
>
> **[0:31]** Ein Zugfilter erkennt Duplikate, hält einen Cooldown ein und
> sperrt Würfe, während der Ball rollt. Ein Schlag, ein Dart.
>
> **[0:35]** Der Autodarts-Weg ist modular vorbereitet, aber noch nicht mit
> echten Daten geprüft. Deshalb ist er hier gestrichelt und gelb.

*Regie: Der Testmodus-Zweig ist durchgezogen und aktiv, der Autodarts-Zweig
gestrichelt. Das Paket bleibt dort an einer Schranke stehen.*

---

## 4 · Steuerung (0:41 – 0:56)

> **[0:42]** Die Richtung kommt aus der Lage des Segments auf der Scheibe.
>
> **[0:46]** Segmentindex mal achtzehn Grad. Eine Formel statt zwanzig
> Sonderregeln: Die zwanzig schlägt nach vorn, die sechs nach rechts, die drei
> nach hinten, die elf nach links.
>
> **[0:51]** Der Multiplikator bestimmt die Schlagstärke. Single leicht, Double
> mittel, Triple voll. Bull zielt aufs Loch.

---

## 5 · Live-Demo in der echten App (0:56 – 1:34)

> **[0:58]** Der Verbindungsdialog ist ausdrücklich als experimentell
> gekennzeichnet.
>
> **[1:03]** Der Test sagt offen, was Sache ist: bisher kommt keine echte
> Nachricht an.
>
> **[1:07]** Also weiter im Testmodus. Ein bis sechs Spieler, eigene Farben,
> Reihenfolge, drei, sechs oder neun Bahnen.
>
> **[1:13]** Im Spiel löst das Testpanel jeden möglichen Wurf aus.
>
> **[1:17]** Triple zwanzig: Richtung aus dem Segment, volle Stärke aus dem
> Multiplikator. Der Ball rollt, prallt von der Bande ab und kommt zur Ruhe.
>
> **[1:22]** Bullseye ist der Präzisionsschlag. Richtung und Stärke passen zur
> Entfernung – und der Ball fällt.
>
> **[1:27]** Zwei Schläge auf Par drei. Die App zählt Schläge, Par und
> Ergebnis je Bahn.
>
> **[1:31]** Am Ende steht der komplette Endstand mit Rangliste.

*Regie: Alles, was hier zu sehen ist, ist die echte Anwendung – keine
Nachbildung. Die Klicks gehen an die tatsächlichen Bedienelemente.*

---

## 6 · Möglichkeiten (1:34 – 1:47)

> **[1:35]** Drei Bahnen als reine Daten, bis zu sechs Spieler, Zugschutz und
> ein Debug-Panel für den Blick hinter die Kulissen.
>
> **[1:39]** Als PWA installierbar und nach dem ersten Laden offline spielbar.
> Spielstände bleiben lokal im Browser.
>
> **[1:43]** Vom Fernseher bis zum Smartphone – dieselbe Anwendung, dieselbe
> Bedienung.

---

## 7 · Abschluss (1:47 – 1:56)

> **[1:48]** DartGolf ist im Testmodus vollständig spielbar. Die
> Autodarts-Anbindung ist vorbereitet, aber ungetestet.
>
> **[1:52]** Zu finden unter dorfdulliracing.de Schrägstrich dartgolf.

*Regie: Zum Schluss rollt ein Ball ins Loch. Kein Aufruf zum Handeln,
kein Versprechen.*

---

## Hinweise für eine Aufnahme

- **Aussprache:** „DartGolf" mit betontem *Dart*. „Autodarts" bleibt der
  Eigenname des fremden Systems und wird nur beschreibend genannt.
- **Nicht ändern:** die Formulierungen zum Stand der Autodarts-Anbindung.
  Sie sind bewusst zurückhaltend, weil die Verbindung nicht mit echten Daten
  getestet wurde.
- **Pausen:** vor jeder neuen Szene eine halbe Sekunde Luft lassen. Die
  Übergänge im Bild haben eigene Geräusche.
- **Musikpegel:** Die Musikspur liegt bei etwa −28 dB im Mittel und ist so
  gebaut, dass eine Stimme darüber Platz hat. Bei einer echten Aufnahme die
  Musik in den Sprechpassagen um weitere 3 bis 4 dB absenken.
- **Länge:** Der gesprochene Text ist etwas dichter als die Untertitel. Wer
  ihn einspricht, kann die Untertitel im Video abschalten – dazu in
  `studio/subtitles.js` die Liste leeren und neu rendern.
