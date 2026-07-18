/**
 * MopedPlaner – Simson-Modellkatalog
 *
 * Zentrale, erweiterbare Datenbasis aller unterstützten Simson-Fahrzeuge.
 * Neue Modelle/Varianten: einfach ein weiteres Objekt ergänzen –
 * die gesamte App (Garage, Technik, Planer) liest ausschließlich aus dieser Liste.
 *
 * Alle technischen Angaben sind Richtwerte aus zeitgenössischen
 * Betriebsanleitungen – ohne Gewähr.
 */

export const MODEL_CATEGORIES = [
  { id: 'moped',   name: 'Mopeds & Mokicks' },
  { id: 'vogel',   name: 'Vogelserie' },
  { id: 'schwalbe',name: 'Kleinroller (Schwalbe & Co.)' },
  { id: 'roller',  name: 'Roller (SR50/SR80)' },
  { id: 'duo',     name: 'Duo & Sonderfahrzeuge' },
  { id: 'klassik', name: 'Klassiker (50er Jahre)' },
  { id: 'sonder',  name: 'Export- & Sondermodelle' },
];

export const MODELS = [
  // ── Klassiker ────────────────────────────────────────────────
  {
    id: 'sr1', name: 'Simson SR1', category: 'klassik',
    years: '1955–1957', engine: 'Rh 50', engineIds: ['rh50'], ccm: 47.6, ps: 1.5, vmax: 40,
    mix: '1:25', tank: 5.5, weight: 55, voltage: '6 V',
    tags: ['Klassiker', 'Sammler'],
    notes: 'Das erste Simson-Moped. Rücktrittbremse am Tretlager, 2-Gang-Handschaltung.',
  },
  {
    id: 'sr2', name: 'Simson SR2', category: 'klassik',
    years: '1957–1959', engine: 'Rh 50', engineIds: ['rh50'], ccm: 47.6, ps: 1.5, vmax: 40,
    mix: '1:25', tank: 5.5, weight: 57, voltage: '6 V',
    tags: ['Klassiker', 'Sammler'],
    notes: 'Weiterentwicklung des SR1 mit verstärktem Rahmen und geändertem Tank.',
  },
  {
    id: 'sr2e', name: 'Simson SR2E', category: 'klassik',
    years: '1959–1963', engine: 'Rh 50 E', engineIds: ['rh50'], ccm: 47.6, ps: 1.6, vmax: 40,
    mix: '1:25', tank: 5.5, weight: 59, voltage: '6 V',
    tags: ['Klassiker', 'Sammler'],
    notes: 'Letzte Ausbaustufe der SR-Mopeds, u. a. mit geänderter Hinterradfederung.',
  },
  {
    id: 'kr50', name: 'Simson KR50', category: 'schwalbe',
    years: '1958–1964', engine: 'KR-Motor (2-Gang)', engineIds: ['m52'], ccm: 47.6, ps: 2.1, vmax: 50,
    mix: '1:25', tank: 6.5, weight: 69, voltage: '6 V',
    tags: ['Kleinroller', 'Sammler'],
    notes: 'Erster Simson-Kleinroller, Vorläufer der Schwalbe. Handschaltung, Pedalstart.',
  },

  // ── Vogelserie ───────────────────────────────────────────────
  {
    id: 'sr4-1', name: 'Simson SR4-1 Spatz', category: 'vogel',
    years: '1964–1970', engine: 'M53 (2-/3-Gang)', engineIds: ['m52'], ccm: 47.6, ps: 2.0, vmax: 40,
    mix: '1:33', tank: 8.5, weight: 66, voltage: '6 V',
    tags: ['Vogelserie', 'Moped'],
    notes: 'Einstiegsmodell der Vogelserie. Frühe Version mit Pedalen und 2-Gang-Motor.',
  },
  {
    id: 'sr4-2', name: 'Simson SR4-2 Star', category: 'vogel',
    years: '1964–1975', engine: 'M53/M54 (3-Gang)', engineIds: ['m53'], ccm: 49.8, ps: 3.4, vmax: 60,
    mix: '1:33', tank: 8.5, weight: 77, voltage: '6 V',
    tags: ['Vogelserie', 'Mokick'],
    notes: 'Meistgebautes Modell der Vogelserie. Robuster Alltagsklassiker mit Kickstarter.',
  },
  {
    id: 'sr4-3', name: 'Simson SR4-3 Sperber', category: 'vogel',
    years: '1966–1972', engine: 'M54 (4-Gang)', engineIds: ['m54'], ccm: 49.8, ps: 4.6, vmax: 75,
    mix: '1:33', tank: 8.5, weight: 79, voltage: '6 V',
    tags: ['Vogelserie', 'Kleinkraftrad', 'Sammler'],
    notes: 'Das sportliche Kleinkraftrad der Vogelserie – 75 km/h, heute gesucht.',
  },
  {
    id: 'sr4-4', name: 'Simson SR4-4 Habicht', category: 'vogel',
    years: '1972–1975', engine: 'M54 (4-Gang)', engineIds: ['m54'], ccm: 49.8, ps: 3.4, vmax: 60,
    mix: '1:33', tank: 8.5, weight: 81, voltage: '6 V',
    tags: ['Vogelserie', 'Mokick'],
    notes: 'Letztes Modell der Vogelserie, technisch eng mit dem Star verwandt.',
  },

  // ── Schwalbe ─────────────────────────────────────────────────
  {
    id: 'kr51', name: 'Simson KR51 Schwalbe', category: 'schwalbe',
    years: '1964–1968', engine: 'M53 KF (3-Gang)', engineIds: ['m53'], ccm: 49.8, ps: 3.4, vmax: 60,
    mix: '1:33', tank: 6.3, weight: 76, voltage: '6 V',
    tags: ['Schwalbe', 'Kleinroller', 'Sammler'],
    notes: 'Die erste Schwalbe. Handschaltung, gebläsegekühlter Motor.',
  },
  {
    id: 'kr51-1', name: 'Simson KR51/1 Schwalbe', category: 'schwalbe',
    years: '1968–1980', engine: 'M53/1 KF (3-/4-Gang)', engineIds: ['m53'], ccm: 49.8, ps: 3.4, vmax: 60,
    mix: '1:33', tank: 6.3, weight: 77, voltage: '6 V',
    tags: ['Schwalbe', 'Kleinroller'],
    notes: 'Varianten: KR51/1 (Handschaltung), /1F (Fußschaltung), /1K (Kickstarter), /1S (4-Gang).',
    variants: ['KR51/1', 'KR51/1F', 'KR51/1K', 'KR51/1S'],
  },
  {
    id: 'kr51-2', name: 'Simson KR51/2 Schwalbe', category: 'schwalbe',
    years: '1980–1986', engine: 'M531/M541 KF (3-/4-Gang)', engineIds: ['m531', 'm541'], ccm: 49.8, ps: 3.4, vmax: 60,
    mix: '1:50', tank: 6.3, weight: 79, voltage: '6 V',
    tags: ['Schwalbe', 'Kleinroller'],
    notes: 'Letzte Schwalbe-Generation mit fahrtwindgekühltem Motor der S51-Familie. Varianten: /2N, /2E, /2L.',
    variants: ['KR51/2N', 'KR51/2E', 'KR51/2L'],
  },

  // ── Mopeds & Mokicks (S-Reihe) ───────────────────────────────
  {
    id: 's50', name: 'Simson S50', category: 'moped',
    years: '1975–1980', engine: 'M53/2 (3-Gang)', engineIds: ['m53'], ccm: 49.8, ps: 3.6, vmax: 60,
    mix: '1:33', tank: 8.7, weight: 78.5, voltage: '6 V',
    tags: ['Mokick', 'Alltagsklassiker'],
    notes: 'Erstes Modell der S-Reihe. Varianten: S50 N, S50 B, S50 B1, S50 B2 (mit Elektronikzündung).',
    variants: ['S50 N', 'S50 B', 'S50 B1', 'S50 B2'],
  },
  {
    id: 's51', name: 'Simson S51', category: 'moped',
    years: '1980–1990', engine: 'M531/M541 (3-/4-Gang)', engineIds: ['m531', 'm541'], ccm: 49.8, ps: 3.7, vmax: 60,
    mix: '1:50', tank: 8.7, weight: 79, voltage: '6 V (12 V bei /1-Varianten)',
    tags: ['Mokick', 'Meistgefahren'],
    notes: 'Das meistverbreitete Simson-Modell. Varianten: N, B1-4, B2-4, C, E (Elektronik), Enduro.',
    variants: ['S51 N', 'S51 B1-4', 'S51 B2-4', 'S51 C', 'S51 E', 'S51 Enduro'],
  },
  {
    id: 's70', name: 'Simson S70', category: 'moped',
    years: '1983–1990', engine: 'M741 (4-Gang)', engineIds: ['m741'], ccm: 69.9, ps: 5.6, vmax: 75,
    mix: '1:50', tank: 8.7, weight: 82, voltage: '12 V',
    tags: ['Kleinkraftrad', '70ccm'],
    notes: 'Große Schwester der S51 mit 70-ccm-Motor und 12-V-Elektrik. Führerscheinklasse beachten.',
    variants: ['S70 N', 'S70 C', 'S70 E', 'S70 Enduro'],
  },
  {
    id: 's53', name: 'Simson S53', category: 'moped',
    years: '1990–2002', engine: 'M531/M541', engineIds: ['m531', 'm541'], ccm: 49.8, ps: 3.7, vmax: 60,
    mix: '1:50', tank: 8.7, weight: 80, voltage: '12 V',
    tags: ['Nachwende', 'Mokick'],
    notes: 'Nachwende-Weiterentwicklung der S51 mit Telegabel und moderner Optik. Varianten: Alpha, Beta, OR.',
    variants: ['S53 N Alpha', 'S53 E Beta', 'S53 OR'],
  },
  {
    id: 's83', name: 'Simson S83', category: 'moped',
    years: '1990–2002', engine: 'M743', engineIds: ['m743'], ccm: 69.9, ps: 5.6, vmax: 75,
    mix: '1:50', tank: 8.7, weight: 82, voltage: '12 V',
    tags: ['Nachwende', '70ccm'],
    notes: '70-ccm-Version der S53-Baureihe.',
  },

  // ── Roller ───────────────────────────────────────────────────
  {
    id: 'sr50', name: 'Simson SR50', category: 'roller',
    years: '1986–2002', engine: 'M541/M542 (4-Gang)', engineIds: ['m541', 'm542'], ccm: 49.8, ps: 3.7, vmax: 60,
    mix: '1:50', tank: 6.6, weight: 84, voltage: '12 V',
    tags: ['Roller'],
    notes: 'Moderner Rollernachfolger der Schwalbe. Varianten: N, B, C, CE, Gamma.',
    variants: ['SR50 N', 'SR50 B', 'SR50 C', 'SR50 CE', 'SR50 Gamma'],
  },
  {
    id: 'sr80', name: 'Simson SR80', category: 'roller',
    years: '1986–1990', engine: 'M741/M742 (4-Gang)', engineIds: ['m741', 'm742'], ccm: 69.9, ps: 5.6, vmax: 75,
    mix: '1:50', tank: 6.6, weight: 86, voltage: '12 V',
    tags: ['Roller', '70ccm'],
    notes: '70-ccm-Version des SR50.',
  },

  // ── Duo & Sonderfahrzeuge ────────────────────────────────────
  {
    id: 'duo4-1', name: 'Simson Duo 4/1', category: 'duo',
    years: '1972–1980', engine: 'M53 (angepasst, Rückwärtsgang-Getriebe)', engineIds: ['m53'], ccm: 49.8, ps: 3.4, vmax: 50,
    mix: '1:33', tank: 8.5, weight: 150, voltage: '6 V',
    tags: ['Dreirad', 'Krankenfahrzeug', 'Sammler'],
    notes: 'Dreirädriges Krankenfahrzeug auf Schwalbe-Technik, Handbedienung.',
  },
  {
    id: 'duo4-2', name: 'Simson Duo 4/2', category: 'duo',
    years: '1980–1989', engine: 'M541 (angepasst)', engineIds: ['m541'], ccm: 49.8, ps: 3.4, vmax: 50,
    mix: '1:50', tank: 8.5, weight: 155, voltage: '6 V',
    tags: ['Dreirad', 'Krankenfahrzeug', 'Sammler'],
    notes: 'Weiterentwicklung des Duo mit Motorentechnik der S51-Familie.',
  },
  {
    id: 'sd50', name: 'Simson SD50', category: 'duo',
    years: '1988–1990', engine: 'M541 (angepasst)', engineIds: ['m541'], ccm: 49.8, ps: 3.7, vmax: 50,
    mix: '1:50', tank: 8.7, weight: 170, voltage: '12 V',
    tags: ['Lastendreirad', 'Selten'],
    notes: 'Seltenes Lastendreirad auf SR50-Basis, u. a. als Pritsche und Koffer.',
  },

  // ── Export- & Sondermodelle ──────────────────────────────────
  {
    id: 'ms50', name: 'Simson MS50 Sperber', category: 'sonder',
    years: '1970er', engine: 'M54 (4-Gang)', engineIds: ['m54'], ccm: 49.8, ps: 4.6, vmax: 75,
    mix: '1:33', tank: 8.5, weight: 79, voltage: '6 V',
    tags: ['Export', 'Selten'],
    notes: 'Exportversion des SR4-3 Sperber, u. a. für westliche Märkte.',
  },
  {
    id: 'albatros', name: 'Simson Albatros', category: 'sonder',
    years: 'Prototyp/Kleinserie', engine: 'variiert', engineIds: [], ccm: 49.8, ps: null, vmax: null,
    mix: '1:33', tank: null, weight: null, voltage: '6 V',
    tags: ['Rarität'],
    notes: 'Sehr seltenes Sondermodell – Daten je nach Ausführung. Angaben bitte je Fahrzeug in der Akte pflegen.',
  },
  {
    id: 'sonstige', name: 'Anderes / Sondermodell', category: 'sonder',
    years: '—', engine: 'variiert', engineIds: [], ccm: null, ps: null, vmax: null,
    mix: '—', tank: null, weight: null, voltage: '—',
    tags: ['Individuell'],
    notes: 'Für Export-, Sonder- und Umbau-Fahrzeuge, die (noch) nicht im Katalog stehen.',
  },
];

export function getModel(id) {
  return MODELS.find((m) => m.id === id) || null;
}

export function modelsByCategory() {
  return MODEL_CATEGORIES.map((cat) => ({
    ...cat,
    models: MODELS.filter((m) => m.category === cat.id),
  })).filter((cat) => cat.models.length);
}
