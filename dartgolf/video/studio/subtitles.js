/**
 * DartGolf – Video: Untertitel
 *
 * Einzige Quelle für die eingebrannten Untertitel UND die Datei captions.srt.
 * So können beide nicht auseinanderlaufen.
 *
 * Zeiten in Sekunden ab Videobeginn.
 */

export const SUBTITLES = [
  { start: 2.3, end: 5.3, text: 'Jeder erkannte Dartwurf wird zu einem Minigolfschlag.' },
  { start: 5.6, end: 8.7, text: 'Alles läuft im Browser – auch ganz ohne Dartscheibe.' },

  { start: 10.0, end: 13.4, text: 'Eine Kamera-Erkennung liefert Segment, Multiplikator und Punktwert.' },
  { start: 13.8, end: 17.2, text: 'Für ein Spiel ist die Zahl aber erst der Anfang.' },
  { start: 18.6, end: 21.2, text: 'Was, wenn jeder Wurf einen Ball bewegt?' },

  { start: 22.7, end: 26.2, text: 'Deshalb sind Trefferquelle und Spiel strikt getrennt.' },
  { start: 26.6, end: 30.6, text: 'Jede Quelle liefert dasselbe Ereignis: DartThrow.' },
  { start: 30.9, end: 34.6, text: 'Ein Zugfilter erkennt Duplikate – ein Schlag, ein Dart.' },
  { start: 34.9, end: 39.0, text: 'Der Autodarts-Weg ist vorbereitet, aber noch nicht mit echten Daten geprüft.' },

  { start: 42.2, end: 46.0, text: 'Die Richtung kommt aus der Lage des Segments auf der Scheibe.' },
  { start: 46.3, end: 50.4, text: 'Segmentindex mal 18 Grad – eine Formel statt zwanzig Sonderregeln.' },
  { start: 50.6, end: 55.4, text: 'Der Multiplikator bestimmt die Schlagstärke. Bull zielt aufs Loch.' },

  { start: 57.6, end: 61.4, text: 'Der Verbindungsdialog ist ausdrücklich als experimentell gekennzeichnet.' },
  { start: 62.6, end: 66.0, text: 'Der Test sagt offen: bisher kommt keine echte Nachricht an.' },
  { start: 67.2, end: 71.4, text: 'Also weiter im Testmodus – Spieler, Farben und Bahnanzahl einstellen.' },
  { start: 73.0, end: 77.0, text: 'Im Spiel löst das Testpanel jeden möglichen Wurf aus.' },
  { start: 77.4, end: 81.4, text: 'Triple 20: Richtung aus dem Segment, volle Stärke aus dem Multiplikator.' },
  { start: 81.8, end: 86.0, text: 'Bullseye ist der Präzisionsschlag – Richtung und Stärke passen zur Entfernung.' },
  { start: 86.6, end: 90.4, text: 'Danach zählt die App Schläge, Par und Ergebnis pro Bahn.' },
  { start: 90.8, end: 93.4, text: 'Am Ende steht der komplette Endstand.' },

  { start: 94.8, end: 98.6, text: 'Drei Bahnen als reine Daten, bis zu sechs Spieler, Debug-Panel inklusive.' },
  { start: 99.0, end: 103.0, text: 'Als PWA installierbar und nach dem ersten Laden offline spielbar.' },
  { start: 103.2, end: 106.2, text: 'Vom Fernseher bis zum Smartphone – dieselbe Anwendung.' },

  { start: 108.4, end: 112.0, text: 'Spielfertig im Testmodus. Die Autodarts-Anbindung ist modular vorbereitet.' },
  { start: 112.4, end: 115.6, text: 'Offen dokumentiert: README und AUTODARTS-INTEGRATION.md im Repository.' },
];
