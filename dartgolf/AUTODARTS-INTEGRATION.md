# Autodarts-Anbindung – Stand der Untersuchung

**Prüfdatum: 24. Juli 2026**
**Status: vorbereitet, aber NICHT mit echten Daten getestet.**

Dieses Dokument hält fest, was tatsächlich belegt ist und was nur eine Annahme
ist. Es enthält keine Zugangsdaten, keine Tokens und keine erfundenen Endpunkte.

„Autodarts“ wird hier ausschließlich beschreibend verwendet, um auf das
bestehende System zu verweisen. DartGolf ist kein Autodarts-Produkt und steht
in keiner Verbindung dazu.

---

## 1. Untersuchte Quellen

Alle Quellen sind öffentlich einsehbar. Es wurde **kein fremder Code übernommen**.
Verwendet wurden ausschließlich Erkenntnisse über Feldnamen und Abläufe.

| Quelle | Art | Was daraus stammt |
| --- | --- | --- |
| `lbormann/darts-caller` | Open-Source-Python-Projekt | Cloud-Endpunkte, Authentifizierungsverfahren, Feldpfade eines Wurfs |
| `creazy231/tools-for-autodarts` | Open-Source-Browser-Erweiterung | Vorgehen „WebSocket der Seite beobachten statt selbst verbinden“, Struktur von Match/Turn/Throw |
| `inventwo/ioBroker.autodarts` (MIT) | Open-Source-Adapter | Lokaler Board Manager unter `IP:3180`, Abfrage per Polling, Ereignisnamen |
| `horseyhorsey/autodarts-hook-web-extension` | Open-Source-Erweiterung | Bestätigt den Ansatz „Weiterleitung an einen eigenen Dienst“ |
| `belese/python-autodarts` | Open-Source-Bindings | Bestätigt Web-API + WebSocket-Nutzung mit Sitzung/Authentifizierung |

Nicht erreichbar bzw. nicht auswertbar war zum Prüfzeitpunkt:

* `docs.autodarts.io` – lieferte HTTP 403 und konnte nicht gelesen werden.
  Eine offizielle, öffentliche API-Dokumentation liegt dieser Umsetzung
  deshalb **nicht** vor.

---

## 2. Bestätigte Erkenntnisse

Bestätigt heißt hier: in mindestens einem der oben genannten Projekte
nachweislich so verwendet. Es heißt **nicht**, dass es selbst getestet wurde.

### 2.1 Cloud-Dienst

| Punkt | Wert |
| --- | --- |
| API-Basis | `https://api.autodarts.io` |
| WebSocket | `wss://api.autodarts.io/ms/v0/subscribe` |
| Anmeldung | Keycloak, Realm `autodarts`, unter `https://login.autodarts.io/` |
| Autorisierung | `Authorization: Bearer <access_token>` |
| Abonnement | `{ "channel": "autodarts.matches", "type": "subscribe", "topic": "<match-id>.state" }` |

### 2.2 Felder eines Wurfs

```
turns[n].throws[m].segment.name        z. B. "T20"
turns[n].throws[m].segment.number      1..20, 25
turns[n].throws[m].segment.bed         z. B. "Triple", "Bull", "Outside"
turns[n].throws[m].segment.multiplier  0..3
turns[n].throws[m].coords.x
turns[n].throws[m].coords.y
turns[n].points
```

Genau diese Pfade liest `src/input/autodarts-normalizer.js` – nicht mehr.

### 2.3 Lokaler Board Manager

* Erreichbar über die IP des Autodarts-Rechners, Standardport **3180**
  (z. B. `http://192.168.x.x:3180`).
* Der ioBroker-Adapter **pollt** diese Adresse, er nutzt dort keinen WebSocket.
* Ereignisnamen aus diesem Umfeld: `busted`, `gameon`, `gameshot`, `180`,
  `matchshot`, `takeout`.

---

## 3. Nicht bestätigte Annahmen

Diese Punkte sind offen. DartGolf verhält sich hier bewusst zurückhaltend.

| Annahme | Warum offen | Umgang in DartGolf |
| --- | --- | --- |
| Ein WebSocket-Pfad am lokalen Board Manager | Öffentlich nicht dokumentiert | Es wird **keine** Adresse vorgegeben. Der Nutzer trägt sie selbst ein. |
| Skalierung der Koordinaten (`coords.x/y`) | Nirgends dokumentiert | Werte werden nur übernommen, wenn sie im Bereich −1..1 liegen. Alles andere gilt als unbekannt und wird ignoriert. |
| Welche Nachricht genau einen *neuen* Wurf meldet | Match-State wird wiederholt gesendet | Stabile ID aus `matchId:round:turn:throw` + Cooldown + Ballbewegungssperre. |
| Vollständige Liste der `bed`-Werte | Nur Beispiele gefunden | Ein breiter Satz Schreibweisen wird abgedeckt, Unbekanntes ergibt `null` statt eines geratenen Wertes. |
| Verhalten bei mehreren Boards | Nicht geprüft | Board-ID ist ein freies, lokal gespeichertes Feld. Keine Auswahlliste, solange keine echte Quelle existiert. |

---

## 4. Bewertung der drei Zielvarianten

### Variante A – Direkte Verbindung aus dem Browser

**Ergebnis: nicht sauber umsetzbar.** Gründe (Browser-Regeln, keine Meinung):

1. **Same-Origin-Policy.** Eine Seite auf `dorfdulliracing.de` kann die
   angemeldete Sitzung von `autodarts.io` nicht mitlesen. Deren Cookies und
   Tokens sind für sie unsichtbar.
2. **OAuth/Keycloak.** Für einen Token bräuchte es einen registrierten Client
   mit hinterlegter Redirect-Adresse. Ein solcher existiert für dieses Projekt
   nicht und lässt sich nicht erfinden. Zugangsdaten selbst abzufragen ist
   ausgeschlossen (siehe Abschnitt 6).
3. **CORS.** Ohne passende Freigabe des Servers sind Anfragen aus dem Browser
   ohnehin blockiert.
4. **Mixed Content.** Für den lokalen Board Manager: die Seite läuft über
   HTTPS, das Gerät im Heimnetz antwortet über `http`/`ws`. Der Browser
   blockiert das. Es gibt dafür keine zulässige Umgehung – und es wurde
   bewusst keine gebaut.

Der `AutodartsProvider` erkennt Punkt 4 vorab und sagt es klar, statt still
zu scheitern.

### Variante B – Zweiter Autodarts-Tab

**Ergebnis: mit Bordmitteln nicht möglich.**

* `BroadcastChannel` und `localStorage`-Ereignisse funktionieren nur innerhalb
  desselben Origin. Zwischen `autodarts.io` und `dorfdulliracing.de` also nicht.
* `postMessage` zwischen Fenstern setzt voraus, dass die **Gegenseite**
  mitspielt und aktiv sendet. Auf einer fremden Seite lässt sich das nicht
  nachrüsten, ohne dort Code auszuführen – und genau das ist eine Erweiterung.

Die Empfangsseite für beide Mechanismen ist in DartGolf trotzdem vorhanden:
Läuft eine Bridge im **selben** Origin (Userscript, eigenes Skript), wird sie
über `BroadcastChannel('dartgolf-bridge')` oder `window.postMessage` erkannt.

### Variante C – Kleine optionale Browser-Bridge

**Ergebnis: der einzige gangbare Weg – und deshalb vorbereitet.**

Da A und B nachweisbar an Browser-Regeln scheitern, liegt unter
`bridge-extension/` ein klar gekennzeichneter, optionaler Fallback:
eine minimale Manifest-V3-Erweiterung, die im eigenen Autodarts-Tab
Wurfnachrichten mitliest und an den DartGolf-Tab weiterreicht.

Sie ist **ungetestet** und ausdrücklich nicht erforderlich: das Spiel läuft
vollständig ohne sie. Das Minigolfspiel selbst bleibt zu 100 % auf der eigenen
Website – die Erweiterung transportiert nur Ereignisse.

---

## 5. Gewählter Ansatz

```
Autodarts-Sitzung (Tab des Nutzers)
        │  Bridge (Erweiterung oder Userscript) – optional, experimentell
        ▼
window.postMessage / BroadcastChannel   { source:'dartgolf-bridge', version:1, type:'throw', payload }
        ▼
AutodartsProvider   (prüft Fenster, Origin, Quelle, Version)
        ▼
normalizeAutodartsEvent()   (validiert, extrahiert, normalisiert)
        ▼
DartThrow  →  Zugfilter  →  Spiel
```

Zusätzlich gibt es den Weg **WebSocket**: Wer eine eigene, erreichbare Quelle
betreibt (etwa einen kleinen Dienst im Heimnetz mit TLS), trägt deren Adresse
im Verbindungsdialog ein. DartGolf gibt keine Adresse vor.

Beide Wege enden in derselben Normalisierung. Das Spiel selbst kennt weder
WebSockets noch Autodarts.

---

## 6. Sicherheitsregeln, die eingehalten wurden

* Keine erfundenen URLs, Endpunkte oder Authentifizierungsverfahren.
* Keine hart codierten Zugänge, Tokens oder Board-IDs.
* Keine Abfrage von Autodarts-Passwörtern – nirgends im Projekt.
* Keine dauerhafte Speicherung geheimer Werte. In `localStorage` liegen nur
  Transportweg, selbst eingetragene Adresse, Board-ID und der Reconnect-Schalter.
* Keine Ausgabe sensibler Daten in der Konsole. Rohereignisse erscheinen nur
  im Debug-Panel und laufen dort durch `maskSensitive()`
  (`token`, `password`, `cookie`, `email` … werden zu `***`).
* Kein Proxy, kein Server, keine Weitergabe an Dritte.
* Kein Umgehen von Schutzmaßnahmen – Mixed Content wird gemeldet, nicht umschifft.
* Die Bridge liest nur mit und sendet nie etwas an Autodarts.

---

## 7. Offene Testpunkte

Diese Punkte lassen sich erst mit einer echten Scheibe klären:

1. Kommt über die Bridge tatsächlich eine Nachricht je erkanntem Dart an?
2. Wie oft wird derselbe Wurf gemeldet – greift die Duplikaterkennung?
3. Enthalten die Nachrichten `coords`, und in welcher Skalierung?
4. Wie verhält sich die Verbindung bei Takeout, Spielerwechsel und Spielende?
5. Wie schnell folgt die Meldung auf den Wurf (spürbare Verzögerung)?
6. Verhalten bei Verbindungsabbruch und automatischer Wiederverbindung.
7. Gibt es am lokalen Board Manager einen nutzbaren Ereignis-Endpunkt?
8. Wie verhält sich das System bei mehreren Boards im selben Konto?

Bis diese Punkte geprüft sind, gilt: **die Autodarts-Anbindung ist vorbereitet,
nicht funktionsfähig belegt.** Der Verbindungsdialog sagt das auch dem Nutzer.

---

## 8. Was schon nachweislich funktioniert

* Die Normalisierung selbst – geprüft mit 22 simulierten Ereignisformaten
  (`tests/normalizer.test.js`): Match-State, Einzelwürfe, flache Ereignisse,
  Bull, Bullseye, Miss, fehlende Felder, ungültiges JSON, unbrauchbare
  Koordinaten, doppelte Ereignisse.
* Die Duplikaterkennung: identische Match-State-Nachrichten erzeugen dieselbe
  Wurf-ID und werden vom Zugfilter verworfen.
* Die Empfangsseite der Bridge: Quelle, Origin und Protokollversion werden
  geprüft, unpassende Nachrichten still verworfen.
