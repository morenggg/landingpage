/**
 * MopedPlaner – Schraubenfinder
 *
 * Durchsuchbare Schrauben- und Drehmoment-Datenbank.
 * Richtwerte für M53/M54/M531/M541/M741-Motoren und S/KR/SR-Fahrwerke –
 * im Zweifel gilt das Original-Reparaturhandbuch.
 *
 * Verknüpfungen (Wissensdatenbank):
 *   id            eindeutige ID – Ersatzteile/Reparaturen/Wartungen verweisen hierauf
 *   componentPath Pfad im Technik-Explorer (#/technik/<pfad>)
 *   partIds       zugehörige Ersatzteile (js/data/parts.js)
 *   toolIds       benötigte Werkzeuge (js/data/tools.js)
 *   locking       Sicherungsart, reuse: Wiederverwendbarkeit
 *   verificationStatus / sourceIds → js/data/sources.js
 */

export const FASTENER_GROUPS = [
  { id: 'motor', name: 'Motor' },
  { id: 'zuendung', name: 'Zündung & Elektrik' },
  { id: 'fahrwerk', name: 'Fahrwerk & Räder' },
  { id: 'anbau', name: 'Anbauteile' },
];

/** Defaults für Verknüpfungsfelder. */
function f(data) {
  return {
    componentPath: '',
    partIds: [],
    toolIds: [],
    locking: '',
    reuse: '',
    verificationStatus: 'partially-verified',
    sourceIds: ['source-community'],
    ...data,
  };
}

export const FASTENERS = [
  // Motor
  f({ id: 'f-zylinderkopf', group: 'motor', part: 'Zylinderkopf', fastener: 'Sechskantmutter', thread: 'M6', sw: 'SW 10', grade: '8', torque: '9–10 Nm', note: 'Über Kreuz in 2 Stufen; nach 500 km nachziehen',
      componentPath: 'motor/zylinder/zylinderkopf', partIds: ['part-dichtsatz-zylinder', 'part-kolben-38'], toolIds: ['tool-drehmoment-klein'], reuse: 'wiederverwendbar' }),
  f({ id: 'f-zylinderfuss', group: 'motor', part: 'Zylinderfuß (Stehbolzen im Gehäuse)', fastener: 'Stehbolzen', thread: 'M6', sw: '—', grade: '8.8', torque: 'handfest', note: 'Mit Schraubensicherung mittelfest',
      componentPath: 'motor/zylinder', locking: 'Schraubensicherung mittelfest' }),
  f({ id: 'f-gehaeuse', group: 'motor', part: 'Gehäusehälften', fastener: 'Zylinderschraube', thread: 'M6', sw: 'SW 10 / Schlitz', grade: '8.8', torque: '8–10 Nm', note: 'Unterschiedliche Längen – Position notieren',
      componentPath: 'motor', toolIds: ['tool-drehmoment-klein'] }),
  f({ id: 'f-kupplungsdeckel', group: 'motor', part: 'Kupplungsdeckel', fastener: 'Zylinderschraube', thread: 'M6', sw: 'Schlitz/Innensechskant', grade: '8.8', torque: '8–10 Nm', note: 'Mit neuer Dichtung',
      componentPath: 'motor/kupplung', partIds: ['part-dichtung-kupplungsdeckel'], toolIds: ['tool-drehmoment-klein'] }),
  f({ id: 'f-kupplungsmutter', group: 'motor', part: 'Kupplungsmutter (Kurbelwelle)', fastener: 'Sechskantmutter', thread: 'M12 × 1,25', sw: 'SW 17', grade: '10', torque: '60–70 Nm', note: 'Sicherungsblech erneuern',
      componentPath: 'motor/kupplung/kupplungskorb', partIds: ['part-kupplungskorb-m500'], toolIds: ['tool-kupplungshalter', 'tool-drehmoment-gross'], locking: 'Sicherungsblech', reuse: 'Sicherungsblech einmalig' }),
  f({ id: 'f-primaerritzel', group: 'motor', part: 'Primärritzel / Antriebsritzel', fastener: 'Sechskantmutter', thread: 'M12 × 1,25', sw: 'SW 17', grade: '10', torque: '60 Nm', note: 'Mit Sicherungsblech',
      componentPath: 'antrieb', partIds: ['part-ritzel'], toolIds: ['tool-kupplungshalter', 'tool-drehmoment-gross'], locking: 'Sicherungsblech', reuse: 'Sicherungsblech einmalig' }),
  f({ id: 'f-oelablass', group: 'motor', part: 'Ölablassschraube', fastener: 'Sechskantschraube', thread: 'M8', sw: 'SW 13', grade: '8.8', torque: '10–12 Nm', note: 'Dichtring (Alu/Kupfer) erneuern',
      componentPath: 'motor/getriebe', toolIds: ['tool-drehmoment-klein'], locking: 'Dichtring', reuse: 'Dichtring einmalig' }),
  f({ id: 'f-oelkontrolle', group: 'motor', part: 'Öleinfüll-/Kontrollschraube', fastener: 'Sechskantschraube', thread: 'M8', sw: 'SW 13', grade: '8.8', torque: '8–10 Nm', note: 'Nicht überdrehen (Alu-Gewinde)',
      componentPath: 'motor/getriebe' }),
  f({ id: 'f-motoraufhaengung', group: 'motor', part: 'Motoraufhängung im Rahmen', fastener: 'Sechskantschraube + Mutter', thread: 'M8', sw: 'SW 13', grade: '8.8', torque: '22–25 Nm', note: 'Selbstsichernde Mutter oder Federring',
      componentPath: 'motor', locking: 'selbstsichernde Mutter/Federring' }),
  f({ id: 'f-ansaugstutzen', group: 'motor', part: 'Ansaugstutzen am Zylinder', fastener: 'Zylinderschraube', thread: 'M6', sw: 'Schlitz/Innensechskant', grade: '8.8', torque: '8 Nm', note: 'Flanschdichtung – Nebenluftquelle Nr. 1',
      componentPath: 'vergaser', partIds: ['part-vergaser-16n1-11'] }),
  f({ id: 'f-schalthebel', group: 'motor', part: 'Schalthebel / Kickstarter (Klemmung)', fastener: 'Klemmschraube', thread: 'M6', sw: 'SW 10', grade: '8.8', torque: '8 Nm', note: 'Verzahnung fetten',
      componentPath: 'motor/getriebe' }),

  // Zündung & Elektrik
  f({ id: 'f-polrad', group: 'zuendung', part: 'Polrad / Schwungmagnet', fastener: 'Sechskantmutter', thread: 'M12 × 1,25', sw: 'SW 17', grade: '10', torque: '60–70 Nm', note: 'Konus fett- und ölfrei!',
      componentPath: 'zuendung/polrad', toolIds: ['tool-polradabzieher', 'tool-kupplungshalter', 'tool-drehmoment-gross'] }),
  f({ id: 'f-abzieher', group: 'zuendung', part: 'Polrad-Abzieher (Werkzeug)', fastener: 'Abzieher', thread: 'M27 × 1,25 Außengewinde', sw: '—', grade: '—', torque: '—', note: 'Linksgewinde? Nein – normales Rechtsgewinde',
      componentPath: 'zuendung/polrad', toolIds: ['tool-polradabzieher'] }),
  f({ id: 'f-grundplatte', group: 'zuendung', part: 'Grundplatte Zündung', fastener: 'Zylinderschraube', thread: 'M5', sw: 'Schlitz', grade: '8.8', torque: '4–5 Nm', note: 'Nach Zündzeitpunkt-Einstellung anziehen',
      componentPath: 'zuendung', toolIds: ['tool-schraubendreher'] }),
  f({ id: 'f-zuendkerze', group: 'zuendung', part: 'Zündkerze', fastener: 'Kerze', thread: 'M14 × 1,25', sw: 'SW 21', grade: '—', torque: '20–25 Nm', note: 'Neue Kerze: Dichtring setzt sich – ¼ Umdrehung nach Anlage',
      componentPath: 'zuendung', partIds: ['part-zuendkerze-m14'], toolIds: ['tool-drehmoment-gross'] }),
  f({ id: 'f-zuendspule', group: 'zuendung', part: 'Zündspule am Rahmen', fastener: 'Sechskantschraube', thread: 'M6', sw: 'SW 10', grade: '8.8', torque: '8 Nm', note: 'Massekontakt sicherstellen',
      componentPath: 'zuendung/zuendspule', partIds: ['part-zuendspule-6v'] }),
  f({ id: 'f-unterbrecher', group: 'zuendung', part: 'Unterbrecher-Befestigung', fastener: 'Schlitzschraube', thread: 'M4', sw: 'Schlitz', grade: '—', torque: '2–3 Nm', note: 'Nach Kontaktabstand-Einstellung',
      componentPath: 'zuendung/unterbrecher', partIds: ['part-unterbrecher'], toolIds: ['tool-schraubendreher', 'tool-fuehlerlehre'] }),

  // Fahrwerk & Räder
  f({ id: 'f-achse-vorn', group: 'fahrwerk', part: 'Achse vorn', fastener: 'Achsmutter', thread: 'M12', sw: 'SW 17/19', grade: '8', torque: '40–50 Nm', note: 'Splint bzw. selbstsichernde Mutter',
      componentPath: 'fahrwerk', partIds: ['part-bremsbacken-125'], toolIds: ['tool-drehmoment-gross'], locking: 'Splint / selbstsichernde Mutter' }),
  f({ id: 'f-achse-hinten', group: 'fahrwerk', part: 'Achse hinten', fastener: 'Achsmutter', thread: 'M12', sw: 'SW 17/19', grade: '8', torque: '60–70 Nm', note: 'Kettenspannung vorher einstellen',
      componentPath: 'fahrwerk', partIds: ['part-kette-415'], toolIds: ['tool-drehmoment-gross'] }),
  f({ id: 'f-federbein', group: 'fahrwerk', part: 'Federbein oben/unten', fastener: 'Sechskantschraube', thread: 'M10', sw: 'SW 17', grade: '8.8', torque: '30–35 Nm', note: 'Gummibuchsen nicht vorspannen (im eingefederten Zustand anziehen)',
      componentPath: 'fahrwerk', partIds: ['part-federbeine'] }),
  f({ id: 'f-lenkerklemmung', group: 'fahrwerk', part: 'Lenkerklemmung', fastener: 'Sechskantschraube', thread: 'M8', sw: 'SW 13', grade: '8.8', torque: '20–22 Nm', note: 'Gleichmäßiger Klemmspalt',
      componentPath: 'fahrwerk' }),
  f({ id: 'f-lenkkopf', group: 'fahrwerk', part: 'Lenkkopfmutter (Kontermutter)', fastener: 'Nutmutter + Kontermutter', thread: 'M25 Sonderformat', sw: 'Hakenschlüssel', grade: '—', torque: 'spielfrei, leichtgängig', note: 'Kein Rasten in Mittelstellung',
      componentPath: 'fahrwerk', partIds: ['part-lenkkopflager'], toolIds: ['tool-hakenschluessel'] }),
  f({ id: 'f-schwinge', group: 'fahrwerk', part: 'Schwingenlagerung', fastener: 'Sechskantschraube', thread: 'M10', sw: 'SW 17', grade: '8.8', torque: '30–35 Nm', note: 'Buchsen prüfen',
      componentPath: 'fahrwerk' }),
  f({ id: 'f-kettenrad', group: 'fahrwerk', part: 'Kettenrad am Mitnehmer', fastener: 'Sechskantschraube', thread: 'M8', sw: 'SW 13', grade: '8.8', torque: '20–25 Nm', note: 'Mit Schraubensicherung',
      componentPath: 'antrieb', partIds: ['part-kettenrad'], locking: 'Schraubensicherung mittelfest' }),
  f({ id: 'f-bremsanker', group: 'fahrwerk', part: 'Bremsankerplatte (Bremsschild-Abstützung)', fastener: 'Sechskantschraube', thread: 'M8', sw: 'SW 13', grade: '8.8', torque: '20 Nm', note: 'Sicherungsblech/Splint zwingend',
      componentPath: 'bremsen', partIds: ['part-bremsbacken-125'], locking: 'Sicherungsblech/Splint', reuse: 'Sicherung einmalig' }),

  // Anbauteile
  f({ id: 'f-kruemmer', group: 'anbau', part: 'Auspuffkrümmer am Zylinder', fastener: 'Überwurfmutter', thread: 'Sonderformat', sw: 'Hakenschlüssel', grade: '—', torque: 'handfest + ¼ U.', note: 'Gewinde mit Keramikpaste fetten',
      componentPath: 'auspuff', partIds: ['part-auspuff-s51', 'part-kruemmerdichtung'], toolIds: ['tool-hakenschluessel'] }),
  f({ id: 'f-auspuffhalter', group: 'anbau', part: 'Auspuffhalter am Rahmen', fastener: 'Sechskantschraube', thread: 'M8', sw: 'SW 13', grade: '8.8', torque: '20 Nm', note: 'Gummielemente prüfen',
      componentPath: 'auspuff', partIds: ['part-auspuff-s51'] }),
  f({ id: 'f-tank', group: 'anbau', part: 'Tankbefestigung', fastener: 'Sechskantschraube', thread: 'M6', sw: 'SW 10', grade: '8.8', torque: '8 Nm', note: 'Gummiunterlagen nicht vergessen',
      componentPath: 'kraftstoff/tank' }),
  f({ id: 'f-sitzbank', group: 'anbau', part: 'Sitzbank-Scharnier', fastener: 'Sechskantschraube', thread: 'M6', sw: 'SW 10', grade: '8.8', torque: '8 Nm', note: '—' }),
  f({ id: 'f-schutzblech', group: 'anbau', part: 'Schutzblech-Streben', fastener: 'Sechskantschraube', thread: 'M6', sw: 'SW 10', grade: '8.8', torque: '8 Nm', note: 'Federringe verwenden (Vibration)',
      locking: 'Federring' }),
  f({ id: 'f-fussrasten', group: 'anbau', part: 'Fußrasten', fastener: 'Sechskantschraube', thread: 'M8', sw: 'SW 13', grade: '8.8', torque: '20–22 Nm', note: '—' }),
  f({ id: 'f-scheinwerferring', group: 'anbau', part: 'Scheinwerferring / Lampentopf', fastener: 'Schlitzschraube', thread: 'M4/M5', sw: 'Schlitz', grade: '—', torque: 'handfest', note: 'Blechgewinde, gefühlvoll anziehen',
      componentPath: 'elektrik/scheinwerfer', toolIds: ['tool-schraubendreher'] }),
];

export function getFastener(id) {
  return FASTENERS.find((x) => x.id === id) || null;
}

export function fastenersForComponent(componentPath) {
  return FASTENERS.filter((x) => x.componentPath === componentPath);
}
