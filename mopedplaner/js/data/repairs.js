/**
 * MopedPlaner – Reparaturdatenbank
 *
 * Zentrale Reparaturen als Bindeglied der Wissensbasis:
 * Symptom (diagnosticIds) → Bauteil (componentPaths) → Ersatzteil (partIds)
 * → Werkzeug (toolIds) → Schraube/Drehmoment (fastenerIds).
 */

export const REPAIRS = [
  {
    id: 'rep-kupplung-einstellen',
    name: 'Kupplung einstellen',
    duration: '20 min',
    difficulty: 1,
    engineIds: ['m53', 'm54', 'm531', 'm541', 'm741'],
    componentPaths: ['motor/kupplung/druckstueck', 'motor/kupplung'],
    diagnosticIds: ['kupplung-rutscht'],
    partIds: [],
    toolIds: ['tool-schraubendreher', 'tool-ringmaul'],
    fastenerIds: [],
    values: [
      { name: 'Spiel am Handhebel', value: '2–3 mm' },
      { name: 'Einstellschraube', value: 'bis Anlage, dann ¼ Umdrehung zurück, kontern' },
    ],
    steps: [
      'Kontermutter an der Einstellschraube im Kupplungsdeckel lösen.',
      'Schraube hineindrehen bis spürbarer Widerstand (Druckstück liegt an).',
      'Eine Viertelumdrehung zurückdrehen und kontern.',
      'Zugspiel am Handhebel auf 2–3 mm einstellen.',
      'Probelauf: trennt sauber, rutscht nicht.',
    ],
    warnings: ['Zu wenig Spiel lässt die Kupplung schleifen und verbrennt die Lamellen.'],
    verificationStatus: 'partially-verified',
    sourceIds: ['source-community'],
  },
  {
    id: 'rep-lamellen-wechseln',
    name: 'Kupplungslamellen wechseln',
    duration: '1,5–2 h',
    difficulty: 2,
    engineIds: ['m531', 'm541', 'm741'],
    componentPaths: ['motor/kupplung', 'motor/kupplung/lamellen', 'motor/kupplung/kupplungskorb'],
    diagnosticIds: ['kupplung-rutscht'],
    partIds: ['part-lamellensatz-m500', 'part-kupplungsfedern', 'part-dichtung-kupplungsdeckel'],
    toolIds: ['tool-kupplungshalter', 'tool-knarrenkasten', 'tool-drehmoment-klein', 'tool-drehmoment-gross'],
    fastenerIds: ['f-kupplungsdeckel', 'f-kupplungsmutter', 'f-oelablass'],
    values: [
      { name: 'Kupplungsdeckel M6', value: '8–10 Nm' },
      { name: 'Kupplungsmutter M12×1,25', value: '60–70 Nm' },
    ],
    steps: [
      'Getriebeöl ablassen (siehe Wartung „Getriebeöl wechseln").',
      'Kupplungsdeckel abschrauben – Schraubenlängen dokumentieren.',
      'Federschrauben über Kreuz entlasten, Lamellenpaket entnehmen (Reihenfolge fotografieren).',
      'Neue Reiblamellen in Getriebeöl einlegen, Paket in Originalreihenfolge einsetzen.',
      'Deckel mit neuer Dichtung montieren, Öl auffüllen, Kupplung einstellen.',
    ],
    warnings: ['Reihenfolge und Einbaurichtung des Pakets exakt einhalten.'],
    verificationStatus: 'partially-verified',
    sourceIds: ['source-community'],
  },
  {
    id: 'rep-zuendung-einstellen',
    name: 'Zündung einstellen (Unterbrecher)',
    duration: '45–60 min',
    difficulty: 3,
    engineIds: ['m53', 'm54', 'm531', 'm541'],
    componentPaths: ['zuendung/unterbrecher', 'zuendung/polrad'],
    diagnosticIds: ['springt-nicht-an', 'geht-aus', 'laeuft-schlecht'],
    partIds: ['part-unterbrecher', 'part-kondensator', 'part-zuendkerze-m14'],
    toolIds: ['tool-fuehlerlehre', 'tool-prueflampe', 'tool-messuhr', 'tool-polradabzieher', 'tool-drehmoment-gross'],
    fastenerIds: ['f-unterbrecher', 'f-grundplatte', 'f-polrad', 'f-zuendkerze'],
    values: [
      { name: 'Kontaktabstand', value: '0,4 mm (± 0,05)' },
      { name: 'Zündzeitpunkt', value: '1,8 mm vor OT' },
      { name: 'Polradmutter', value: '60–70 Nm' },
    ],
    steps: [
      'Kerze heraus, Messuhr in das Kerzenloch, OT suchen.',
      'Kontaktabstand bei höchstem Nockenpunkt auf 0,4 mm einstellen.',
      'Kolben auf 1,8 mm vor OT stellen.',
      'Grundplatte drehen, bis der Kontakt exakt hier öffnet (Prüflampe erlischt/leuchtet je nach Anschluss).',
      'Grundplatte festziehen, Einstellung erneut kontrollieren.',
    ],
    warnings: ['Konus von Polrad und Kurbelwelle muss beim Aufsetzen fettfrei sein.'],
    verificationStatus: 'partially-verified',
    sourceIds: ['source-community'],
  },
  {
    id: 'rep-vergaser-reinigen',
    name: 'Vergaser zerlegen und reinigen',
    duration: '45 min',
    difficulty: 2,
    engineIds: ['m53', 'm54', 'm531', 'm541', 'm741'],
    componentPaths: ['vergaser', 'vergaser/duesen', 'vergaser/schwimmer'],
    diagnosticIds: ['springt-nicht-an', 'laeuft-schlecht', 'verliert-benzin', 'geht-aus'],
    partIds: ['part-hauptduese', 'part-schwimmernadelventil', 'part-vergaser-16n1-11'],
    toolIds: ['tool-schraubendreher', 'tool-ringmaul'],
    fastenerIds: ['f-ansaugstutzen'],
    values: [
      { name: 'Leerlaufschraube Grundeinstellung', value: 'ca. 1,5 Umdrehungen heraus' },
      { name: 'Hauptdüse Serie (S51, 16N1-11)', value: '72' },
    ],
    steps: [
      'Benzinhahn zu, Schlauch ab, Gaszug aushängen, Vergaser abnehmen.',
      'Schwimmerkammer über Auffangbehälter öffnen.',
      'Hauptdüse, Leerlaufdüse und Nadelventil ausbauen.',
      'Alles mit Bremsenreiniger und Druckluft reinigen – niemals Draht durch Düsen.',
      'Zusammenbau, Grundeinstellung, Standgas warm einstellen.',
    ],
    warnings: ['Arbeiten mit Benzin: gut lüften, keine Zündquellen.'],
    verificationStatus: 'partially-verified',
    sourceIds: ['source-community'],
  },
  {
    id: 'rep-zylinder-wechseln',
    name: 'Zylinder und Kolben wechseln',
    duration: '2–3 h (+ Einfahren)',
    difficulty: 3,
    engineIds: ['m53', 'm54', 'm531', 'm541', 'm741'],
    componentPaths: ['motor/zylinder', 'motor/zylinder/kolben', 'motor/zylinder/zylinderkopf'],
    diagnosticIds: ['springt-nicht-an', 'laeuft-schlecht', 'geraeusche'],
    partIds: ['part-kolben-38', 'part-kolbenringe-38', 'part-dichtsatz-zylinder', 'part-zuendkerze-m14'],
    toolIds: ['tool-knarrenkasten', 'tool-drehmoment-klein', 'tool-kolbenbolzen', 'tool-fuehlerlehre', 'tool-kompressionstester'],
    fastenerIds: ['f-zylinderkopf', 'f-zuendkerze', 'f-ansaugstutzen', 'f-kruemmer'],
    values: [
      { name: 'Zylinderkopfmuttern M6', value: '9–10 Nm, über Kreuz in 2 Stufen' },
      { name: 'Kompression gesund', value: 'ca. 9–12 bar' },
    ],
    steps: [
      'Auspuff, Vergaser und Kerzenstecker demontieren.',
      'Kopf abnehmen, Zylinder senkrecht abziehen, Kurbelgehäuse sofort abdecken.',
      'Kolben wechseln: Pfeil zum Auslass, Sicherungsringe korrekt setzen.',
      'Neue Fußdichtung, Ringe zentrieren, Zylinder aufschieben.',
      'Kopf über Kreuz anziehen, alles montieren, 250–500 km einfahren.',
      'Nach dem Einfahren Kopfmuttern nachziehen.',
    ],
    warnings: ['Fallende Sicherungsringe oder Schrauben im offenen Kurbelgehäuse bedeuten Motorteilung – Gehäuse immer abdecken!'],
    verificationStatus: 'partially-verified',
    sourceIds: ['source-community'],
  },
  {
    id: 'rep-wdr-zuendseite',
    name: 'Wellendichtring zündungsseitig wechseln',
    duration: '1–1,5 h',
    difficulty: 3,
    engineIds: ['m53', 'm54', 'm531', 'm541', 'm741'],
    componentPaths: ['motor/kurbeltrieb', 'zuendung/polrad'],
    diagnosticIds: ['geht-aus', 'laeuft-schlecht'],
    partIds: ['part-wdr-satz'],
    toolIds: ['tool-polradabzieher', 'tool-simmerringhaken', 'tool-drehmoment-gross', 'tool-messuhr'],
    fastenerIds: ['f-polrad', 'f-grundplatte'],
    values: [
      { name: 'Polradmutter M12×1,25', value: '60–70 Nm' },
    ],
    steps: [
      'Polrad mit Abzieher demontieren, Grundplatten-Position markieren, Grundplatte abnehmen.',
      'Alten Dichtring vorsichtig herausziehen – Sitz und Welle nicht beschädigen.',
      'Neuen Ring leicht geölt gerade eindrücken (Dichtlippe zur Kurbelkammer).',
      'Grundplatte an Markierung montieren, Zündzeitpunkt kontrollieren (1,8 mm v. OT).',
      'Polrad aufsetzen (Konus fettfrei), Mutter anziehen, Probelauf.',
    ],
    warnings: ['Nach dem Tausch Zündeinstellung immer prüfen.'],
    verificationStatus: 'partially-verified',
    sourceIds: ['source-community'],
  },
  {
    id: 'rep-bremsbacken',
    name: 'Bremsbacken wechseln',
    duration: '45 min pro Rad',
    difficulty: 2,
    componentPaths: ['bremsen'],
    diagnosticIds: ['bremse-schlecht'],
    partIds: ['part-bremsbacken-125'],
    toolIds: ['tool-knarrenkasten', 'tool-drehmoment-gross'],
    fastenerIds: ['f-achse-vorn', 'f-achse-hinten', 'f-bremsanker'],
    values: [
      { name: 'Achsmutter vorn', value: '40–50 Nm' },
      { name: 'Achsmutter hinten', value: '60–70 Nm' },
    ],
    steps: [
      'Rad ausbauen (Zug/Gestänge aushängen, Achse ziehen).',
      'Bremsschild abnehmen, Backen gegen die Feder zusammendrücken und abklappen.',
      'Trommel mit Bremsenreiniger säubern, auf Riefen prüfen.',
      'Neue Backen einsetzen, Bremsschild montieren, Rad einbauen.',
      'Bremse einstellen und mehrfach probebremsen.',
    ],
    warnings: ['Bremsstaub nicht einatmen.', 'Sicherheitsrelevant – nach dem Einbau Funktionsprobe im Stand und bei Schrittgeschwindigkeit.'],
    verificationStatus: 'partially-verified',
    sourceIds: ['source-community'],
  },
  {
    id: 'rep-kette-wechseln',
    name: 'Kette, Ritzel und Kettenrad wechseln',
    duration: '1–1,5 h',
    difficulty: 2,
    componentPaths: ['antrieb'],
    diagnosticIds: ['geraeusche'],
    partIds: ['part-kette-415', 'part-ritzel', 'part-kettenrad'],
    toolIds: ['tool-knarrenkasten', 'tool-kupplungshalter', 'tool-drehmoment-gross'],
    fastenerIds: ['f-primaerritzel', 'f-kettenrad', 'f-achse-hinten'],
    values: [
      { name: 'Ritzelmutter', value: '60 Nm (Sicherungsblech!)' },
      { name: 'Kettendurchhang', value: '15–20 mm' },
    ],
    steps: [
      'Ritzelabdeckung ab, Sicherungsblech aufbiegen, Ritzelmutter lösen (Hinterradbremse treten oder Halter).',
      'Kette öffnen (Kettenschloss), alte Kette mit neuer durch den Kettenschlauch einziehen.',
      'Kettenrad am Mitnehmer wechseln (Schrauben mit Sicherung).',
      'Neues Ritzel montieren, Sicherungsblech umlegen.',
      'Kette schließen (Schlossfeder: geschlossene Seite in Laufrichtung), spannen, fluchten.',
    ],
    warnings: ['Ritzel, Kette und Kettenrad immer als Satz tauschen.'],
    verificationStatus: 'partially-verified',
    sourceIds: ['source-community'],
  },
];

export function getRepair(id) {
  return REPAIRS.find((r) => r.id === id) || null;
}

export function repairsForComponent(componentPath) {
  return REPAIRS.filter((r) => (r.componentPaths || []).includes(componentPath));
}

export function repairsForDiagnostic(flowId) {
  return REPAIRS.filter((r) => (r.diagnosticIds || []).includes(flowId));
}
