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
| **Schraubenfinder** | Durchsuchbare Drehmoment-Datenbank (Gewinde, SW, Festigkeit, Hinweise) mit Gruppenfilter |
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
    ├── ui.js               DOM-Factory, Icon-Bibliothek (Inline-SVG), Sheets, Toasts
    ├── data/               Reine Daten – ohne DOM, einzeln erweiterbar
    │   ├── models.js       Simson-Modellkatalog
    │   ├── components.js   Bauteil-Baum (Technik-Explorer)
    │   ├── diagnostics.js  Diagnose-Entscheidungsbäume
    │   ├── conversions.js  Umbau-Kits
    │   └── fasteners.js    Schrauben-/Drehmoment-Datenbank
    └── views/              Eine Datei je Screen
```

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
