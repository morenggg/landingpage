# MopedPlaner — Die digitale Simson-Werkstatt

**Arbeitstitel.** Eine eigenständige, mobile-first Web-App rund um alle
Simson-Fahrzeuge: digitale Garage, Fahrzeugakte, geführte Diagnose,
interaktives Technik-Wissen, Umbauplaner und Schraubenfinder.

> Direktlink: `https://dorfdulliracing.de/mopedplaner/`
> Bewusst **nirgends** in der Dorfdulli-Racing-Website verlinkt und per
> `noindex` von Suchmaschinen ausgenommen — erreichbar nur über den
> direkten Link.

## Features (v1)

| Bereich | Was es kann |
| --- | --- |
| **Dashboard** | Begrüßung, Schnellzugriffe, Fahrzeuge, offene Aufgaben, letzte Akteneinträge, häufige Probleme |
| **Garage** | Beliebig viele Fahrzeuge mit Modell, Baujahr, Farbe, Rahmen-/Motornummer, Motor, Vergaser, Zündung, Auspuff, Zustand, Foto (automatisch verkleinert) und Notizen |
| **Fahrzeugakte** | Logbuch-Timeline (Wartung/Reparatur/Umbau/Teilekauf/Notiz) mit Datum, Kosten, km und Teilen; Kosten-Summe; Aufgabenliste mit Abhaken |
| **Technik-Explorer** | Interaktiver Drilldown Motor → Kupplung → Kupplungskorb → … mit Funktion, typischen Defekten, Aus-/Einbau-Schritten, Werkzeug, Drehmomenten und Ersatzteil-Preisen |
| **Problemfinder** | 8 geführte Diagnose-Flows (springt nicht an, geht aus, läuft schlecht, verliert Benzin, Elektrik, Kupplung, Geräusche, Bremse) mit Rückfragen, Wahrscheinlichkeiten und Direktlinks in den Technik-Explorer |
| **Umbauplaner** | 7 Kits (VAPE, 60 ccm, 70 ccm, LED, Originalrestauration, Alltags-Setup, Enduro) mit Teileliste, Werkzeug, Reihenfolge, Kosten, Dauer, Schwierigkeit und Rechts-Hinweisen; Übernahme als Aufgaben in ein Fahrzeug |
| **Schraubenfinder** | Durchsuchbare Drehmoment-Datenbank (Gewinde, SW, Festigkeit, Sicherungsart, Wiederverwendbarkeit) – jede Schraube verlinkt auf Bauteil, Ersatzteile und Werkzeug |
| **Ersatzteil-Katalog** | 35+ händlerunabhängige Teile mit Kompatibilität (Modelle/Motoren), Qualitätsstufen, Preisspannen, Prüfstatus, Volltextsuche, Filtern und Fahrzeugbezug („nur passend zu meiner S51") |
| **Technische Suche** | Ein Suchfeld über die gesamte Wissensbasis – Treffer gruppiert nach Typ (Modelle, Motoren, Bauteile, Teile, Schrauben, Werkzeuge, Wartungen, Reparaturen, Diagnosen) |
| **Motoren-Datenbank** | Rh 50 bis M743: Stammdaten, Gemisch, Öl, Zündung, Drehmomente, typische Defekte – je Motor verknüpft mit Modellen und Baugruppen |
| **Wartungsplan** | 11 strukturierte Wartungen mit Intervall, Werkzeug, Material, Schritten und Warnhinweisen |
| **Reparaturen** | 8 geführte Reparaturen mit Sollwerten, verknüpft mit Diagnosen, Teilen, Schrauben und Werkzeug |
| **PWA** | Installierbar („Zum Startbildschirm"), läuft dank Service Worker komplett offline in der Garage |
| **Datensicherung** | JSON-Export/-Import unter „Mehr" |

## Modellkatalog

Von SR1 (1955) bis S83: Vogelserie, Schwalbe-Generationen, S50/S51/S70,
S53/S83, SR50/SR80, Duo 4/1 & 4/2, SD50, Export- und Sondermodelle —
erweiterbar über eine einzige Datei (`js/data/models.js`).

## Architektur

Bewusst **ohne Build-Schritt, ohne Framework, ohne Abhängigkeiten** —
wie das restliche Repo direkt von GitHub Pages servierbar und dadurch
jederzeit 1:1 in ein eigenes Repository/eine eigene Domain verschiebbar
(Ordner kopieren, fertig).

```
mopedplaner/
├── index.html              App-Shell (View-Container + Tab-Bar)
├── manifest.webmanifest    PWA-Manifest (Scope: /mopedplaner/)
├── sw.js                   Service Worker: Precache + offline (nur eigener Scope)
├── assets/icons/           App-Icons (selbst generiert, lizenzfrei)
├── css/app.css             Eigenes Design-System (Dark, Mobile First)
└── js/
    ├── app.js              Bootstrap, Routen, Tab-Bar, SW-Registrierung
    ├── router.js           Hash-Router (Params, Wildcards, Soft-Refresh)
    ├── store.js            Repository-API über StorageAdapter (localStorage)
    ├── knowledge.js        Wissensschicht: verbindet alle Datenmodule,
    │                       zentrale Suche, Kompatibilitätslogik, Filter
    ├── ui.js               DOM-Factory, Icon-Bibliothek (Inline-SVG), Sheets, Toasts
    ├── data/               Reine Daten – ohne DOM, einzeln erweiterbar
    │   ├── models.js       Simson-Modellkatalog (mit engineIds)
    │   ├── engines.js      Motorendatenbank (Rh 50 … M743)
    │   ├── components.js   Bauteil-Baum (Technik-Explorer)
    │   ├── parts.js        Ersatzteil-Katalog (händlerunabhängig)
    │   ├── offers.js       Händlerangebote (Struktur + Demo, strikt getrennt)
    │   ├── tools.js        Werkzeugdatenbank
    │   ├── maintenance.js  Wartungsdatenbank
    │   ├── repairs.js      Reparaturdatenbank
    │   ├── bearings-seals.js  Lager, Dichtungen, Wellendichtringe
    │   ├── fasteners.js    Schrauben-/Drehmoment-Datenbank (mit IDs & Links)
    │   ├── diagnostics.js  Diagnose-Entscheidungsbäume
    │   ├── conversions.js  Umbau-Kits
    │   └── sources.js      Quellen & Verifikationssystem
    └── views/              Eine Datei je Screen
        ├── … (bestehende Views)
        ├── teile.js        Ersatzteil-Katalog + Detailansicht
        ├── suche.js        Zentrale technische Suche
        └── wissen.js       Motoren, Wartungen, Reparaturen (Liste + Detail)
```

## UI-System

Die Oberfläche folgt dem Prinzip **„Weniger gleichzeitig, mehr im richtigen
Moment"** (progressive Offenlegung):

- **Spacing-System:** `--sp-1` (4 px) bis `--sp-5` (32 px) in `app.css` –
  Sektionen nutzen `--sp-5`, Listenelemente `--sp-2/3`.
- **Typografie-Rollen:** Seitentitel (`h1`, 1,7 rem), Detailseiten-Titel
  (`.comp-head h1`, 1,4 rem), Sektionstitel (`h2`/`.sub-head`), Fließtext,
  technische Werte (`--mono`, z. B. `.torque`), Hilfetext (`.muted .small`),
  Status-Kleintext (`.v-text`).
- **Button-Hierarchie:** `btn-primary` (eine Hauptaktion pro Seite) ·
  `btn-ghost` (sekundär) · `mini-btn` (tertiär) · `btn-danger` (destruktiv).
- **Badges sparsam:** nur für Kompatibilität, Wahrscheinlichkeit und
  wichtige Warnungen. Prüfstatus in Listen = ruhiger Kleintext
  (`verificationText`), auf Detailseiten = erklärender Block
  (`verificationNote`).
- **Wiederverwendbare Komponenten** (`ui.js`): `pageHead`, `sectionEl`,
  `accordion` (auf `<details>`-Basis), `emptyState` (Warum leer + nächste
  Aktion), `infoRow`/`.info-list` (Key-Value statt Karten-Gitter),
  `note(kind)` (info/tip/warn/legal/danger), `openSheet`, `toast`,
  `verificationText/-Note`, `compatBadge`.
- **Navigation:** Bottom-Tab-Bar mit 5 Bereichen; Detailseiten tragen
  Breadcrumbs (`.crumbs`), Technik-Drilldowns behalten den vollen Pfad.
- **Dashboard-Priorität:** Mein Fahrzeug → Schnellaktionen (max. 4) →
  Als Nächstes → Entdecken.
- **Filter:** Detailfilter im Bottom-Sheet, aktive Filter als entfernbare
  Chips, Fahrzeugbezug als dauerhaft sichtbare Sonderrolle.
- **Mobil:** keine breiten Tabellen (Key-Value-Listen/Akkordeons),
  Touch-Ziele ≥ 48 px, Safe-Areas, kein horizontales Scrollen (getestet
  ab 320 px). **Desktop:** begrenzte Inhaltsbreite (760 px), Garage und
  Kachelraster zweispaltig – bleibt mobile-first.
- **Animationen:** nur Seitenwechsel, Sheets, Akkordeon-Chevron und
  Feedback; `prefers-reduced-motion` deaktiviert alles.

## Wissensdatenbank & Verknüpfungslogik

Alle technischen Stammdaten sind statisch (ES-Module) und strikt von den
Nutzerdaten getrennt (Nutzerdaten: `mopedplaner.v1` im localStorage,
UI-Zustand wie „zuletzt angesehene Teile": `mopedplaner.ui.v1` –
Export/Import betrifft ausschließlich Nutzerdaten).

Verknüpft wird ausschließlich über IDs bzw. Explorer-Pfade:

```
Modell (models.js, engineIds)
  ↔ Motor (engines.js, modelIds/componentPaths)
    ↔ Bauteil (components.js, adressiert über Pfad 'motor/kupplung/…')
      ↔ Schraube (fasteners.js: id, componentPath, partIds, toolIds)
      ↔ Ersatzteil (parts.js: componentIds, compatibleModel/EngineIds,
                    requiredFastener/ToolIds, repair/maintenance/diagnosticIds)
        ↔ Angebot (offers.js: partId, sellerId – strikt getrennt)
      ↔ Wartung (maintenance.js) ↔ Reparatur (repairs.js) ↔ Diagnose (diagnostics.js)
      ↔ Lager/Dichtung (bearings-seals.js)
```

`js/knowledge.js` ist die einzige Abfrageschicht: flacher Bauteil-Baum,
`searchKnowledge()` (gruppierte Volltextsuche), `filterParts()`,
`partCompatibility(part, vehicle)` (nur datenbasierte Aussagen:
direkt passend / mit Einschränkungen / nicht kompatibel / ungeprüft)
und Rückwärts-Verweise (`usagesOfPart`).

### Quellen & Prüfstatus

Jeder Stammdatensatz trägt `verificationStatus`
(`verified` / `partially-verified` / `unverified` / `disputed` / `demo`)
und optional `sourceIds` → `sources.js`. Die UI zeigt den Status als
Badge; unterhalb von `verified` erscheint der Hinweis „Technische
Angaben noch nicht vollständig verifiziert." Es werden keine
OEM-Nummern, Maße oder Kompatibilitäten erfunden – unbekannte Werte
stehen auf `null` / „Noch nicht erfasst".

### Neue Inhalte hinzufügen

| Was | Wo | Wie |
| --- | --- | --- |
| Ersatzteil | `js/data/parts.js` | `p({ id, name, category, componentIds, … })` ergänzen – IDs müssen existieren |
| Motor | `js/data/engines.js` | Objekt in `ENGINES`; `modelIds` pflegen und ggf. `engineIds` im Modell |
| Werkzeug | `js/data/tools.js` | Objekt in `TOOLS`, dann per `toolIds` referenzieren |
| Wartung/Reparatur | `maintenance.js` / `repairs.js` | Objekt mit `componentPaths`, `toolIds`, `partIds`, `fastenerIds` |
| Bauteil | `js/data/components.js` | Knoten im Baum; Ersatzteile verweisen per Pfad darauf |
| Schraube | `js/data/fasteners.js` | `f({ id: 'f-…', … })` mit `componentPath`/`partIds` |
| Quelle | `js/data/sources.js` | Quelle anlegen, per `sourceIds` referenzieren |

### Spätere Händleranbindung & Preisvergleich

`js/data/offers.js` trennt Angebote strikt vom Teilekatalog:
`{ partId, sellerId, price, shippingCost, availability, qualityLevel,
affiliate, active, lastCheckedAt }`. Aktuell nur klar gekennzeichnete
Demo-Einträge (`demo: true`, `active: false`). Für echte Angebote:
Seller anlegen, Offers mit `active: true` pflegen — der Preisvergleich
ist dann `offersForPart(partId)` sortiert nach Gesamtpreis; Affiliate-
Links werden über das `affiliate`-Flag transparent gekennzeichnet.

**Grundsätze**

- **Isolation:** Kein einziger geteilter Style, Font oder Skript mit der
  Dorfdulli-Racing-Website. Der Service Worker ist auf `/mopedplaner/`
  gescoped und fasst fremde Requests nicht an.
- **Daten ↔ UI getrennt:** Alle Inhalte (Modelle, Bauteile, Diagnosen,
  Kits, Schrauben) liegen als reine Datenmodule in `js/data/` — neue
  Inhalte brauchen keine UI-Änderung.
- **Austauschbare Persistenz:** Views sprechen nur mit den Repositories
  in `store.js` (async API). Der `LocalStorageAdapter` kann gegen einen
  Supabase-Adapter getauscht werden, ohne eine View anzufassen.

## Später: Supabase-Anbindung (vorbereitet)

Das Projekt nutzt bereits Supabase (`morrzzgbyowlauhkfmdg.supabase.co`).
Für Cloud-Sync/Accounts genügt ein zweiter Adapter in `store.js` plus
diese Tabellen (RLS: `user_id = auth.uid()`):

```sql
create table mp_vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  data jsonb not null,          -- Fahrzeugfelder wie im LocalStorage-Schema
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table mp_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  vehicle_id uuid references mp_vehicles on delete cascade,
  data jsonb not null,
  created_at timestamptz default now()
);

create table mp_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  vehicle_id uuid references mp_vehicles on delete cascade,
  title text not null,
  done boolean default false,
  created_at timestamptz default now(),
  done_at timestamptz
);
-- Fotos: Storage-Bucket "mp-photos" statt DataURLs
```

## Roadmap-Ideen

Community & geteilte Projekte · Werkstattfinder & Händlerverzeichnis ·
Ersatzteil-Preisvergleich · KI-Assistent (Foto-/Geräuschanalyse) ·
Wartungserinnerungen (Push) · QR-Code am Fahrzeug → direkt zur Akte ·
interaktive Explosionszeichnungen/3D · echte Illustrationen je Bauteil
(aktuell hochwertige Icon-Platzhalter).

## Entwicklung

```bash
python3 -m http.server 8000
# → http://localhost:8000/mopedplaner/
```

Kein Build nötig. Alle technischen Angaben (Drehmomente, Preise,
Baujahre) sind Richtwerte ohne Gewähr — maßgeblich ist das
Original-Reparaturhandbuch.
