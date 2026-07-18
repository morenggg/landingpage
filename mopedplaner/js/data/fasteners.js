/**
 * MopedPlaner – Schraubenfinder
 *
 * Durchsuchbare Schrauben- und Drehmoment-Datenbank.
 * Richtwerte für M53/M54/M531/M541/M741-Motoren und S/KR/SR-Fahrwerke –
 * im Zweifel gilt das Original-Reparaturhandbuch.
 */

export const FASTENER_GROUPS = [
  { id: 'motor', name: 'Motor' },
  { id: 'zuendung', name: 'Zündung & Elektrik' },
  { id: 'fahrwerk', name: 'Fahrwerk & Räder' },
  { id: 'anbau', name: 'Anbauteile' },
];

export const FASTENERS = [
  // Motor
  { group: 'motor', part: 'Zylinderkopf', fastener: 'Sechskantmutter', thread: 'M6', sw: 'SW 10', grade: '8', torque: '9–10 Nm', note: 'Über Kreuz in 2 Stufen; nach 500 km nachziehen' },
  { group: 'motor', part: 'Zylinderfuß (Stehbolzen im Gehäuse)', fastener: 'Stehbolzen', thread: 'M6', sw: '—', grade: '8.8', torque: 'handfest', note: 'Mit Schraubensicherung mittelfest' },
  { group: 'motor', part: 'Gehäusehälften', fastener: 'Zylinderschraube', thread: 'M6', sw: 'SW 10 / Schlitz', grade: '8.8', torque: '8–10 Nm', note: 'Unterschiedliche Längen – Position notieren' },
  { group: 'motor', part: 'Kupplungsdeckel', fastener: 'Zylinderschraube', thread: 'M6', sw: 'Schlitz/Innensechskant', grade: '8.8', torque: '8–10 Nm', note: 'Mit neuer Dichtung' },
  { group: 'motor', part: 'Kupplungsmutter (Kurbelwelle)', fastener: 'Sechskantmutter', thread: 'M12 × 1,25', sw: 'SW 17', grade: '10', torque: '60–70 Nm', note: 'Sicherungsblech erneuern' },
  { group: 'motor', part: 'Primärritzel / Antriebsritzel', fastener: 'Sechskantmutter', thread: 'M12 × 1,25', sw: 'SW 17', grade: '10', torque: '60 Nm', note: 'Mit Sicherungsblech' },
  { group: 'motor', part: 'Ölablassschraube', fastener: 'Sechskantschraube', thread: 'M8', sw: 'SW 13', grade: '8.8', torque: '10–12 Nm', note: 'Dichtring (Alu/Kupfer) erneuern' },
  { group: 'motor', part: 'Öleinfüll-/Kontrollschraube', fastener: 'Sechskantschraube', thread: 'M8', sw: 'SW 13', grade: '8.8', torque: '8–10 Nm', note: 'Nicht überdrehen (Alu-Gewinde)' },
  { group: 'motor', part: 'Motoraufhängung im Rahmen', fastener: 'Sechskantschraube + Mutter', thread: 'M8', sw: 'SW 13', grade: '8.8', torque: '22–25 Nm', note: 'Selbstsichernde Mutter oder Federring' },
  { group: 'motor', part: 'Ansaugstutzen am Zylinder', fastener: 'Zylinderschraube', thread: 'M6', sw: 'Schlitz/Innensechskant', grade: '8.8', torque: '8 Nm', note: 'Flanschdichtung – Nebenluftquelle Nr. 1' },
  { group: 'motor', part: 'Schalthebel / Kickstarter (Klemmung)', fastener: 'Klemmschraube', thread: 'M6', sw: 'SW 10', grade: '8.8', torque: '8 Nm', note: 'Verzahnung fetten' },

  // Zündung & Elektrik
  { group: 'zuendung', part: 'Polrad / Schwungmagnet', fastener: 'Sechskantmutter', thread: 'M12 × 1,25', sw: 'SW 17', grade: '10', torque: '60–70 Nm', note: 'Konus fett- und ölfrei!' },
  { group: 'zuendung', part: 'Polrad-Abzieher (Werkzeug)', fastener: 'Abzieher', thread: 'M27 × 1,25 Außengewinde', sw: '—', grade: '—', torque: '—', note: 'Linksgewinde? Nein – normales Rechtsgewinde' },
  { group: 'zuendung', part: 'Grundplatte Zündung', fastener: 'Zylinderschraube', thread: 'M5', sw: 'Schlitz', grade: '8.8', torque: '4–5 Nm', note: 'Nach Zündzeitpunkt-Einstellung anziehen' },
  { group: 'zuendung', part: 'Zündkerze', fastener: 'Kerze', thread: 'M14 × 1,25', sw: 'SW 21', grade: '—', torque: '20–25 Nm', note: 'Neue Kerze: Dichtring setzt sich – ¼ Umdrehung nach Anlage' },
  { group: 'zuendung', part: 'Zündspule am Rahmen', fastener: 'Sechskantschraube', thread: 'M6', sw: 'SW 10', grade: '8.8', torque: '8 Nm', note: 'Massekontakt sicherstellen' },
  { group: 'zuendung', part: 'Unterbrecher-Befestigung', fastener: 'Schlitzschraube', thread: 'M4', sw: 'Schlitz', grade: '—', torque: '2–3 Nm', note: 'Nach Kontaktabstand-Einstellung' },

  // Fahrwerk & Räder
  { group: 'fahrwerk', part: 'Achse vorn', fastener: 'Achsmutter', thread: 'M12', sw: 'SW 17/19', grade: '8', torque: '40–50 Nm', note: 'Splint bzw. selbstsichernde Mutter' },
  { group: 'fahrwerk', part: 'Achse hinten', fastener: 'Achsmutter', thread: 'M12', sw: 'SW 17/19', grade: '8', torque: '60–70 Nm', note: 'Kettenspannung vorher einstellen' },
  { group: 'fahrwerk', part: 'Federbein oben/unten', fastener: 'Sechskantschraube', thread: 'M10', sw: 'SW 17', grade: '8.8', torque: '30–35 Nm', note: 'Gummibuchsen nicht vorspannen (im eingefederten Zustand anziehen)' },
  { group: 'fahrwerk', part: 'Lenkerklemmung', fastener: 'Sechskantschraube', thread: 'M8', sw: 'SW 13', grade: '8.8', torque: '20–22 Nm', note: 'Gleichmäßiger Klemmspalt' },
  { group: 'fahrwerk', part: 'Lenkkopfmutter (Kontermutter)', fastener: 'Nutmutter + Kontermutter', thread: 'M25 Sonderformat', sw: 'Hakenschlüssel', grade: '—', torque: 'spielfrei, leichtgängig', note: 'Kein Rasten in Mittelstellung' },
  { group: 'fahrwerk', part: 'Schwingenlagerung', fastener: 'Sechskantschraube', thread: 'M10', sw: 'SW 17', grade: '8.8', torque: '30–35 Nm', note: 'Buchsen prüfen' },
  { group: 'fahrwerk', part: 'Kettenrad am Mitnehmer', fastener: 'Sechskantschraube', thread: 'M8', sw: 'SW 13', grade: '8.8', torque: '20–25 Nm', note: 'Mit Schraubensicherung' },
  { group: 'fahrwerk', part: 'Bremsankerplatte (Bremsschild-Abstützung)', fastener: 'Sechskantschraube', thread: 'M8', sw: 'SW 13', grade: '8.8', torque: '20 Nm', note: 'Sicherungsblech/Splint zwingend' },

  // Anbauteile
  { group: 'anbau', part: 'Auspuffkrümmer am Zylinder', fastener: 'Überwurfmutter', thread: 'Sonderformat', sw: 'Hakenschlüssel', grade: '—', torque: 'handfest + ¼ U.', note: 'Gewinde mit Keramikpaste fetten' },
  { group: 'anbau', part: 'Auspuffhalter am Rahmen', fastener: 'Sechskantschraube', thread: 'M8', sw: 'SW 13', grade: '8.8', torque: '20 Nm', note: 'Gummielemente prüfen' },
  { group: 'anbau', part: 'Tankbefestigung', fastener: 'Sechskantschraube', thread: 'M6', sw: 'SW 10', grade: '8.8', torque: '8 Nm', note: 'Gummiunterlagen nicht vergessen' },
  { group: 'anbau', part: 'Sitzbank-Scharnier', fastener: 'Sechskantschraube', thread: 'M6', sw: 'SW 10', grade: '8.8', torque: '8 Nm', note: '—' },
  { group: 'anbau', part: 'Schutzblech-Streben', fastener: 'Sechskantschraube', thread: 'M6', sw: 'SW 10', grade: '8.8', torque: '8 Nm', note: 'Federringe verwenden (Vibration)' },
  { group: 'anbau', part: 'Fußrasten', fastener: 'Sechskantschraube', thread: 'M8', sw: 'SW 13', grade: '8.8', torque: '20–22 Nm', note: '—' },
  { group: 'anbau', part: 'Scheinwerferring / Lampentopf', fastener: 'Schlitzschraube', thread: 'M4/M5', sw: 'Schlitz', grade: '—', torque: 'handfest', note: 'Blechgewinde, gefühlvoll anziehen' },
];
