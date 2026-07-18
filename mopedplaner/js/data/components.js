/**
 * MopedPlaner – Interaktiver Bauteil-Baum
 *
 * Hierarchische Wissensbasis: Baugruppe → Komponente → Einzelteil.
 * Jeder Knoten kann enthalten:
 *   summary     Kurzbeschreibung / Funktion
 *   defects     typische Defekte mit Symptom
 *   removal     Ausbau Schritt für Schritt
 *   install     Einbau-Hinweise
 *   tools       benötigtes Werkzeug
 *   fasteners   Schrauben/Muttern mit Drehmoment (Richtwerte!)
 *   parts       typische Ersatzteile mit Circa-Preisen
 *   models      Kompatibilität
 *   children    Unterbauteile
 *
 * Alle Drehmomente sind Richtwerte für die Motoren M53/M54/M531/M541/M741 –
 * im Zweifel gilt das Original-Reparaturhandbuch.
 */

export const COMPONENT_TREE = [
  {
    id: 'motor',
    name: 'Motor',
    icon: 'engine',
    summary:
      'Herzstück jeder Simson: luftgekühlter Einzylinder-Zweitakter. M53/M54 (Vogelserie, S50, frühe Schwalbe) bzw. M531/M541 (S51, KR51/2, SR50) und M741 (S70/SR80).',
    models: ['Alle Modelle'],
    defects: [
      { name: 'Simmerringe undicht', symptom: 'Nebenluft: klingelt, dreht hoch, geht im Leerlauf aus, überhitzt.' },
      { name: 'Kurbelwellenlager verschlissen', symptom: 'Mahlende/rasselnde Geräusche aus dem Kurbelgehäuse, besonders unter Last.' },
      { name: 'Zylinder/Kolben verschlissen', symptom: 'Schlechte Kompression, springt schlecht an, Leistungsverlust, Ölkohle.' },
    ],
    tools: ['Knarrenkasten SW 8–19', 'Drehmomentschlüssel 2–25 Nm & 20–100 Nm', 'Innensechskant-Satz', 'Gummihammer'],
    fasteners: [
      { name: 'Motorbefestigung im Rahmen', size: 'M8', torque: '22–25 Nm' },
      { name: 'Gehäuseschrauben (Motorhälften)', size: 'M6', torque: '8–10 Nm' },
    ],
    children: [
      {
        id: 'zylinder',
        name: 'Zylinder & Kolben',
        icon: 'cylinder',
        summary:
          'Graugusszylinder mit Leichtmetall-Kolben. Verdichtung und Steuerzeiten bestimmen Charakter und Leistung des Motors.',
        defects: [
          { name: 'Kolbenklemmer', symptom: 'Motor blockiert plötzlich (oft bei Vollgas + magerem Gemisch). Riefen an Kolben und Laufbahn.' },
          { name: 'Kolbenringe verschlissen', symptom: 'Kompression < 8 bar, blauer Rauch, schlechter Kaltstart.' },
          { name: 'Kolbenkipper', symptom: 'Helles Klackern im Leerlauf, das unter Last verschwindet.' },
        ],
        removal: [
          'Tank abnehmen bzw. Benzinhahn zu, Kerzenstecker ab.',
          'Auspuffkrümmer und Vergaser demontieren.',
          'Zylinderhaube (falls Gebläse: Verkleidung) abnehmen.',
          '4 Muttern am Zylinderkopf über Kreuz lösen, Kopf abnehmen.',
          'Zylinder senkrecht nach oben vom Kolben ziehen – Kurbelgehäuse sofort mit sauberem Lappen verschließen!',
          'Kolbenbolzen-Sicherungsringe entfernen, Bolzen mit Auszieher oder vorsichtig mit Dorn austreiben (Kolben abstützen!).',
        ],
        install: [
          'Neue Fußdichtung trocken auflegen (kein Dichtmittel nötig).',
          'Kolbenringe-Stoß auf die Arretierstifte ausrichten.',
          'Kolben und Laufbahn mit Zweitaktöl benetzen.',
          'Zylinder mit leichtem Druck über die Ringe schieben – niemals mit Gewalt.',
          'Kopfmuttern über Kreuz in 2 Stufen auf Enddrehmoment anziehen.',
          'Nach ca. 500 km Einfahrzeit Kopfmuttern nachziehen.',
        ],
        tools: ['Ringschlüssel SW 10', 'Drehmomentschlüssel', 'Kolbenbolzen-Auszieher', 'Spitzzange für Sicherungsringe', 'Fühlerlehre'],
        fasteners: [
          { name: 'Zylinderkopfmuttern', size: 'M6', torque: '9–10 Nm', note: 'über Kreuz, in 2 Stufen' },
          { name: 'Zündkerze', size: 'M14 × 1,25', torque: '20–25 Nm' },
        ],
        parts: [
          { name: 'Kolben komplett (Ø 38 mm, S51)', price: '25–45 €' },
          { name: 'Kolbenringe (Paar)', price: '8–15 €' },
          { name: 'Dichtsatz Zylinder (Fuß + Kopf)', price: '5–10 €' },
          { name: 'Zylinder regeneriert / Neuteil', price: '60–150 €' },
        ],
        models: ['M53/M54: Ø 40 mm (Vogelserie)', 'M531/M541: Ø 38 mm (S51 & Co.)', 'M741: Ø 45 mm (S70)'],
        children: [
          {
            id: 'zylinderkopf',
            name: 'Zylinderkopf',
            summary: 'Bestimmt die Verdichtung. Zentraler Kerzensitz, Quetschkante. Bei Überhitzung auf Planheit prüfen.',
            defects: [
              { name: 'Kopfdichtung defekt', symptom: 'Kompressionsverlust, „Blubbern" am Kopf, Ölspuren an den Stehbolzen.' },
              { name: 'Kerzengewinde ausgerissen', symptom: 'Kerze lässt sich nicht mehr festziehen – Helicoil/Zeitwert-Reparatur nötig.' },
            ],
            fasteners: [{ name: 'Kopfmuttern', size: 'M6', torque: '9–10 Nm', note: 'über Kreuz' }],
            parts: [{ name: 'Kopfdichtung', price: '2–4 €' }],
          },
          {
            id: 'kolben',
            name: 'Kolben & Ringe',
            summary:
              'Übermaßstufen in 0,25-mm-Schritten. Einbauspiel ca. 0,03–0,04 mm. Ringstoß-Spiel: 0,2–0,35 mm (Verschleißgrenze ~0,8 mm).',
            defects: [
              { name: 'Ringstoß zu groß', symptom: 'Kompression sinkt schleichend, Leistung fehlt oben raus.' },
              { name: 'Festgebackene Ringe', symptom: 'Nach langer Standzeit: kaum Kompression, löst sich manchmal nach Ölgabe ins Kerzenloch.' },
            ],
            tools: ['Fühlerlehre', 'Kolbenring-Zange (optional)'],
            parts: [{ name: 'Ringe je Übermaß', price: '8–15 €' }],
          },
        ],
      },
      {
        id: 'kupplung',
        name: 'Kupplung',
        icon: 'clutch',
        summary:
          'Mehrscheiben-Ölbadkupplung auf der Kurbelwelle. Trennt Motor und Getriebe; Verschleißteile sind Reib- und Stahllamellen sowie die Druckfedern.',
        defects: [
          { name: 'Kupplung rutscht', symptom: 'Drehzahl steigt beim Beschleunigen, Tempo nicht – Lamellen verschlissen oder falsches Öl.' },
          { name: 'Kupplung trennt nicht', symptom: 'Gänge krachen, Moped kriecht bei gezogener Kupplung – Einstellung oder verklebte Lamellen.' },
          { name: 'Rasselnde Kupplung', symptom: 'Klappern im Leerlauf, das beim Ziehen des Hebels verschwindet – Kupplungskorb-Verzahnung eingelaufen.' },
        ],
        removal: [
          'Getriebeöl ablassen (Ablassschraube unten am Motor).',
          'Kupplungsdeckel abschrauben (Schrauben-Positionen merken, unterschiedliche Längen!).',
          'Druckplatte entlasten: Federschrauben gleichmäßig über Kreuz lösen.',
          'Lamellenpaket entnehmen, Reihenfolge und Einbaurichtung notieren.',
          'Für den Korb: Kupplungsmutter mit Haltewerkzeug kontern und lösen.',
        ],
        install: [
          'Neue Reiblamellen vor Einbau in Getriebeöl einlegen.',
          'Paketreihenfolge exakt einhalten (außen beginnt/endet je nach Motor – Foto vom Ausbau hilft).',
          'Kupplungsspiel am Hebel: 2–3 mm Leerweg einstellen.',
          'Frisches Getriebeöl auffüllen: GL80 bzw. Original-Spezifikation, M53: ca. 0,4 l / M541: ca. 0,5 l.',
        ],
        tools: ['Kupplungshalter / Halteband', 'Steckschlüssel SW 17', 'Schlitzschraubendreher (Federteller)', 'Ölauffangwanne'],
        fasteners: [
          { name: 'Kupplungsmutter', size: 'M12 × 1,25', torque: '60–70 Nm', note: 'mit Sicherungsblech' },
          { name: 'Kupplungsdeckel-Schrauben', size: 'M6', torque: '8–10 Nm' },
        ],
        parts: [
          { name: 'Reiblamellen-Satz', price: '12–25 €' },
          { name: 'Kupplungsfedern (Satz)', price: '5–10 €' },
          { name: 'Dichtung Kupplungsdeckel', price: '2–3 €' },
        ],
        children: [
          {
            id: 'kupplungskorb',
            name: 'Kupplungskorb',
            summary:
              'Trägt die Reiblamellen und wird über das Primärritzel angetrieben. Die Mitnehmer-Verzahnung schlägt mit den Jahren aus.',
            defects: [
              { name: 'Eingelaufene Mitnehmernuten', symptom: 'Lamellen haken, Kupplung trennt unsauber, rasselt im Leerlauf.' },
            ],
            removal: [
              'Lamellenpaket entnehmen (siehe Kupplung).',
              'Sicherungsblech aufbiegen, Kupplungsmutter mit Haltewerkzeug lösen.',
              'Korb mit Druckstück und Anlaufscheiben abnehmen – Reihenfolge dokumentieren.',
            ],
            fasteners: [{ name: 'Kupplungsmutter', size: 'M12 × 1,25', torque: '60–70 Nm' }],
            parts: [{ name: 'Kupplungskorb (Nachbau)', price: '25–40 €' }],
          },
          {
            id: 'lamellen',
            name: 'Reib- & Stahllamellen',
            summary:
              'Das eigentliche Verschleißpaket. Reiblamellen-Mindeststärke prüfen (M541: unter ~2,6 mm ersetzen), Stahllamellen auf Verzug (Planplatte).',
            defects: [
              { name: 'Verschlissene Beläge', symptom: 'Kupplung rutscht unter Last, riecht bei Bergfahrten verbrannt.' },
              { name: 'Verzogene Stahllamellen', symptom: 'Kupplung trennt nicht sauber trotz korrekter Einstellung.' },
            ],
            parts: [{ name: 'Lamellensatz komplett', price: '15–30 €' }],
          },
          {
            id: 'druckstueck',
            name: 'Druckstück & Ausrückung',
            summary:
              'Übersetzt den Zug am Hebel in axialen Druck auf die Druckplatte. Einstellschraube im Kupplungsdeckel bestimmt das Spiel.',
            defects: [
              { name: 'Falsch eingestellt', symptom: 'Trennt nicht (zu viel Spiel) oder rutscht (zu wenig Spiel).' },
            ],
            install: [
              'Einstellschraube hineindrehen bis leichter Widerstand, dann ca. ¼ Umdrehung zurück, kontern.',
              'Spiel am Handhebel: 2–3 mm.',
            ],
          },
        ],
      },
      {
        id: 'getriebe',
        name: 'Getriebe & Schaltung',
        icon: 'gearbox',
        summary:
          '3- oder 4-Gang-Klauengetriebe mit Fußschaltung (Ausnahme: frühe Schwalbe/KR: Handschaltung). Läuft im gemeinsamen Ölbad mit der Kupplung.',
        defects: [
          { name: 'Gänge springen raus', symptom: 'Meist verschlissene Schaltklauen oder Schaltgabel – Motor muss geteilt werden.' },
          { name: 'Hakelige Schaltung', symptom: 'Oft nur Schaltwelle/Feder oder falsche Öl-Viskosität, erst extern prüfen.' },
        ],
        tools: ['Getriebeöl GL80', 'Ölauffangwanne'],
        fasteners: [
          { name: 'Ölablassschraube', size: 'M8', torque: '10–12 Nm', note: 'Dichtring erneuern' },
          { name: 'Schalthebel-Klemmschraube', size: 'M6', torque: '8 Nm' },
        ],
        parts: [{ name: 'Getriebeöl 0,5 l', price: '5–8 €' }],
      },
      {
        id: 'kurbeltrieb',
        name: 'Kurbelwelle & Lager',
        icon: 'crank',
        summary:
          'Pressverband-Kurbelwelle mit Pleuel auf Nadellager. Hauptlager und Wellendichtringe (Simmerringe) sind die Lebensdauer-Bauteile des Motors.',
        defects: [
          { name: 'Pleuellager-Schaden', symptom: 'Metallisches Schlagen unter Last, im Extremfall Motorblockade.' },
          { name: 'Simmerringe hart/undicht', symptom: 'Falschluft (kupplungsseitig: Getriebeöl wird mitverbrannt – weißblauer Qualm).' },
        ],
        removal: [
          'Simmerring zündungsseitig: Polrad abziehen, Grundplatte ab, Ring vorsichtig heraushebeln – geht ohne Motorteilung.',
          'Simmerring kupplungsseitig: Kupplung komplett demontieren.',
          'Kurbelwelle selbst: Motor komplett teilen (Spezialwerkzeug: Abzieher, Montagebrücke).',
        ],
        tools: ['Polrad-Abzieher', 'Simmerring-Haken', 'ggf. Motorteilungs-Werkzeug'],
        parts: [
          { name: 'Wellendichtring-Satz', price: '5–12 €' },
          { name: 'Kurbelwelle regeneriert', price: '80–160 €' },
          { name: 'Hauptlager-Satz (2×6302)', price: '15–30 €' },
        ],
      },
    ],
  },

  {
    id: 'vergaser',
    name: 'Vergaser & Ansaugung',
    icon: 'carb',
    summary:
      'BVF-Schiebervergaser (16N1-, 16N3-, 19N1-Serie). Bereitet das Benzin-Luft-Gemisch auf – die häufigste Ursache für Laufprobleme überhaupt.',
    models: ['S51: 16N1-11', 'S50: 16N1-1', 'S70: 16N3-4', 'Schwalbe KR51/2: 16N1-12'],
    defects: [
      { name: 'Verstopfte Düsen', symptom: 'Springt nicht an oder nimmt kein Gas an – meist nach längerer Standzeit.' },
      { name: 'Schwimmernadelventil undicht', symptom: 'Vergaser läuft über, Benzin tropft, Motor „ersäuft".' },
      { name: 'Falsches Kerzenbild', symptom: 'Rehbraun = gut. Schwarz/nass = zu fett. Weiß/grau = zu mager (Klemmergefahr!).' },
    ],
    removal: [
      'Benzinhahn schließen, Schlauch abziehen.',
      'Gaszug am Schieberdeckel aushängen.',
      'Klemmschraube am Ansaugstutzen lösen, Vergaser abziehen.',
      'Schwimmerkammer über einem Behälter öffnen (Restbenzin).',
    ],
    install: [
      'Alle Düsen nur mit Druckluft/Bremsenreiniger reinigen – nie mit Draht aufbohren.',
      'Schwimmerstand prüfen (Kammerdichtfläche als Referenz laut Handbuch).',
      'Leerlaufschraube: ganz rein, dann ~1,5 Umdrehungen raus als Grundeinstellung.',
      'Vergaser waagerecht montieren, Klemmung fest, aber Stutzen nicht abwürgen.',
    ],
    tools: ['Schraubendreher-Satz', 'Düsenreiniger/Druckluft', 'Bremsenreiniger', 'Gabelschlüssel SW 8'],
    parts: [
      { name: 'Hauptdüse (z. B. 72 bei S51)', price: '2–4 €' },
      { name: 'Vergaser-Dichtsatz', price: '5–8 €' },
      { name: 'Schwimmernadelventil', price: '4–8 €' },
      { name: 'Kompletter BVF-Nachbau', price: '35–60 €' },
    ],
    children: [
      {
        id: 'duesen',
        name: 'Düsen & Nadel',
        summary:
          'Hauptdüse (Volllast), Nadel + Nadelposition (Teillast), Leerlaufdüse (Standgas). Serienbedüsung S51/16N1-11: HD 72, Nadel 2. Rille.',
        defects: [
          { name: 'Zu große HD nach Tuning-Versuch', symptom: 'Viertaktet obenraus, verrußte Kerze.' },
        ],
      },
      {
        id: 'schwimmer',
        name: 'Schwimmer & Nadelventil',
        summary:
          'Regelt den Benzinstand in der Kammer. Nach Standzeit klebt das Nadelventil gern – Überlaufen ist die Folge.',
        defects: [{ name: 'Schwimmer undicht (voll Benzin)', symptom: 'Vergaser läuft dauerhaft über, viel zu fettes Gemisch.' }],
        parts: [{ name: 'Schwimmer', price: '5–10 €' }],
      },
      {
        id: 'luftfilter',
        name: 'Luftfilter & Ansauggeräuschdämpfer',
        summary:
          'Nassluftfilter im Herzkasten (S51) bzw. Rahmenansaugung. Ein verölter, zugesetzter Filter macht das Gemisch fett.',
        defects: [{ name: 'Filter zugesetzt', symptom: 'Läuft fett, wenig Leistung, schwarzes Kerzenbild.' }],
        parts: [{ name: 'Luftfiltereinsatz', price: '3–6 €' }],
      },
    ],
  },

  {
    id: 'zuendung',
    name: 'Zündung',
    icon: 'spark',
    summary:
      'Original: 6-V-Unterbrecherzündung (SLPZ) oder elektronische Zündung (SLEZ, „E"-Modelle). Beliebtestes Upgrade: 12-V-VAPE (POWERDYNAMO).',
    defects: [
      { name: 'Kein Zündfunke', symptom: 'Unterbrecherkontakt abgebrannt/verstellt, Kondensator defekt, Kabelbruch, Zündspule.' },
      { name: 'Falscher Zündzeitpunkt', symptom: 'Schlechter Durchzug, Überhitzen, Klingeln. Soll: 1,8 mm (M541: 1,8 ± 0,2) vor OT.' },
      { name: 'Kondensator stirbt', symptom: 'Läuft warm zunehmend schlechter, starkes Funkenfeuer am Unterbrecher.' },
    ],
    removal: [
      'Polrad-Abdeckung entfernen, OT-Stellung suchen.',
      'Polradmutter lösen (Polrad mit Halteband blockieren).',
      'Polrad ausschließlich mit Abzieher abdrücken – niemals abhebeln!',
      'Grundplatte markieren (Zündzeitpunkt!), dann Schrauben lösen.',
    ],
    tools: ['Polrad-Abzieher M27 × 1,25', 'Halteband', 'Fühlerlehre', 'Zündeinstelllehre oder Messuhr', 'Prüflampe/Multimeter'],
    fasteners: [
      { name: 'Polradmutter', size: 'M12 × 1,25', torque: '60–70 Nm' },
      { name: 'Grundplatten-Schrauben', size: 'M5', torque: '4–5 Nm' },
      { name: 'Zündkerze', size: 'M14 × 1,25', torque: '20–25 Nm' },
    ],
    parts: [
      { name: 'Unterbrecherkontakt', price: '5–10 €' },
      { name: 'Kondensator', price: '4–8 €' },
      { name: 'Zündkerze (Isolator ZM14-260 / NGK B7HS)', price: '3–6 €' },
      { name: 'VAPE-Komplettanlage 12 V', price: '150–220 €' },
    ],
    children: [
      {
        id: 'unterbrecher',
        name: 'Unterbrecher & Kondensator',
        summary:
          'Kontaktabstand 0,4 ± 0,05 mm bei vollem Hub. Zündzeitpunkt danach neu einstellen – beides hängt zusammen.',
        defects: [
          { name: 'Kontakt abgebrannt', symptom: 'Unruhiger Lauf, setzt aus, schwacher Funke.' },
        ],
        install: [
          'Kontaktabstand bei höchstem Nockenpunkt auf 0,4 mm stellen.',
          'Zündzeitpunkt: Kolben 1,8 mm vor OT, Kontakt beginnt zu öffnen (Prüflampe).',
          'Kontaktflächen fettfrei halten, Filz leicht ölen.',
        ],
        tools: ['Fühlerlehre', 'Prüflampe', 'Messuhr/Zündlehre'],
      },
      {
        id: 'zuendspule',
        name: 'Zündspule & Kerzenstecker',
        summary:
          'Externe 6-V-Zündspule am Rahmen. Kerzenstecker mit 1–5 kΩ Entstörwiderstand.',
        defects: [
          { name: 'Spule mit Wärmefehler', symptom: 'Kalt top, warm Aussetzer – klassischer Wärmedefekt.' },
        ],
        parts: [{ name: 'Zündspule 6 V', price: '10–20 €' }],
      },
      {
        id: 'polrad',
        name: 'Polrad / Schwungmagnet',
        summary:
          'Sitzt konisch auf der Kurbelwelle, enthält die Magnete für Zünd- und Lichtstrom.',
        defects: [{ name: 'Passfeder abgeschert', symptom: 'Zündzeitpunkt „wandert", Motor läuft plötzlich gar nicht mehr.' }],
        fasteners: [{ name: 'Polradmutter', size: 'M12 × 1,25', torque: '60–70 Nm' }],
      },
    ],
  },

  {
    id: 'kraftstoff',
    name: 'Kraftstoffsystem',
    icon: 'fuel',
    summary: 'Tank, Benzinhahn mit Reserve, Schlauch, ggf. Filter. Zweitakt-Gemisch je nach Motor 1:33 (Alt) oder 1:50 (M531/M541/M741).',
    defects: [
      { name: 'Benzinhahn verstopft/undicht', symptom: 'Motor verhungert bei Fahrt oder Hahn tropft am Sieb.' },
      { name: 'Tank innen rostig', symptom: 'Ständig verstopfte Düsen, brauner Schmodder im Schwimmergehäuse.' },
      { name: 'Poröser Benzinschlauch', symptom: 'Benzingeruch, feuchte Stellen, Luftblasen in der Leitung.' },
    ],
    tools: ['Gabelschlüssel SW 14/17', 'Auffangbehälter'],
    parts: [
      { name: 'Benzinhahn EHR mit Reserve', price: '8–15 €' },
      { name: 'Benzinschlauch (Meterware)', price: '2–4 €/m' },
      { name: 'Tankentrostung + Versiegelung (Set)', price: '20–40 €' },
    ],
    children: [
      {
        id: 'benzinhahn',
        name: 'Benzinhahn',
        summary: 'Drei Stellungen: Zu / Auf / Reserve. Integriertes Sieb regelmäßig reinigen.',
        removal: ['Tank leerfahren oder abpumpen.', 'Hahn mit SW 14/17 abschrauben, Dichtung prüfen.'],
      },
      {
        id: 'tank',
        name: 'Tank',
        summary: 'Stahltank – Rost ist nach Standzeiten das Hauptthema. Vor Saisonstart Sichtprüfung mit Lampe.',
      },
    ],
  },

  {
    id: 'auspuff',
    name: 'Auspuffanlage',
    icon: 'exhaust',
    summary:
      'Krümmer + Endschalldämpfer. Beim Zweitakter leistungsrelevant: Ein zugesetzter Auspuff kostet massiv Leistung.',
    defects: [
      { name: 'Verkokt / zugesetzt', symptom: 'Schleichender Leistungsverlust, dumpfer Klang, Höchstgeschwindigkeit fehlt.' },
      { name: 'Krümmer undicht', symptom: 'Metallisches Plätschern/Knattern am Zylinder, Ölspuren am Auslass.' },
    ],
    removal: [
      'Krümmermutter am Zylinder lösen (Hakenschlüssel oder große Rohrzange mit Schutz).',
      'Schelle/Halter am Rahmen lösen, Anlage abnehmen.',
      'Endschalldämpfer: Innenleben (Dämpfereinsatz) hinten herausschrauben und reinigen/ausbrennen.',
    ],
    tools: ['Hakenschlüssel', 'SW 13 für Halter', 'Drahtbürste'],
    fasteners: [
      { name: 'Krümmermutter (Überwurf)', size: 'M32 Sonderformat', torque: 'handfest + ¼ U.', note: 'Hitzefest fetten' },
      { name: 'Halteschellen', size: 'M6/M8', torque: '8–20 Nm' },
    ],
    parts: [
      { name: 'Auspuff komplett (S51-Form)', price: '35–70 €' },
      { name: 'Krümmerdichtung', price: '1–3 €' },
    ],
  },

  {
    id: 'elektrik',
    name: 'Elektrik & Beleuchtung',
    icon: 'bolt',
    summary:
      '6-V-Bordnetz (Original) mit Licht-, Zünd- und Ladespule in der Grundplatte. 12-V-Modelle (S70, SR50 u. a.) mit Elektronik-Ladeanlage.',
    defects: [
      { name: 'Massefehler', symptom: 'Flackerndes Licht, tote Hupe, wildes Fehlerbild – Masse an Rahmen/Lampentopf prüfen.' },
      { name: 'Lichtspule defekt', symptom: 'Kein oder nur schwaches Licht, Spannung an der Spule messen.' },
      { name: 'Batterie lädt nicht (12-V/Batteriemodelle)', symptom: 'Ladeanlage/Regler prüfen, Batteriepole korrodiert.' },
    ],
    tools: ['Multimeter', 'Prüflampe', 'Kabelschuh-Zange', 'Isolierband/Schrumpfschlauch'],
    parts: [
      { name: 'Kabelbaum komplett (Modellabhängig)', price: '25–50 €' },
      { name: 'Glühlampen-Set 6 V', price: '5–10 €' },
      { name: 'Schalterkombination', price: '15–30 €' },
    ],
    children: [
      {
        id: 'scheinwerfer',
        name: 'Scheinwerfer & Rücklicht',
        summary: 'Bilux 6 V 25/25 W vorn, 5 W Rücklicht. Bei LED-Umrüstung Zulassung (E-Prüfzeichen) beachten.',
        defects: [{ name: 'Gebrochene Fassung/Wackelkontakt', symptom: 'Licht geht bei Erschütterung aus.' }],
      },
      {
        id: 'schalter',
        name: 'Schalter & Armaturen',
        summary: 'Kombischalter für Licht/Blinker/Hupe. Kontakte oxidieren – Kontaktspray wirkt oft Wunder.',
      },
      {
        id: 'batterie',
        name: 'Batterie & Ladeanlage',
        summary: '6-V-4,5-Ah-Batterie (Blinker/Hupe bei Zündschloss-Modellen). Bei VAPE-Umbau meist batterielos möglich.',
        defects: [{ name: 'Sulfatierte Batterie', symptom: 'Blinker langsam, Hupe leise – Batterie hält keine Ladung.' }],
      },
    ],
  },

  {
    id: 'fahrwerk',
    name: 'Fahrwerk & Rahmen',
    icon: 'suspension',
    summary:
      'Vorn Telegabel (S-Reihe/SR50) oder Schwinggabel (Schwalbe/Vogelserie), hinten Federbeine mit Schwinge. Lenkkopflager regelmäßig prüfen.',
    defects: [
      { name: 'Lenkkopflager verschlissen', symptom: '„Rasten" in Mittelstellung, klackern beim Bremsen.' },
      { name: 'Telegabel undicht', symptom: 'Ölfilm auf den Standrohren, durchschlagende Gabel.' },
      { name: 'Ausgeschlagene Schwingenlager', symptom: 'Schwammiges Fahrverhalten, Hinterrad läuft nicht spurtreu.' },
    ],
    tools: ['Hakenschlüssel Lenkkopf', 'Gabelöl', 'Drehmomentschlüssel'],
    fasteners: [
      { name: 'Achsmutter vorn', size: 'M12', torque: '40–50 Nm' },
      { name: 'Achsmutter hinten', size: 'M12', torque: '60–70 Nm' },
      { name: 'Federbein-Befestigung', size: 'M10', torque: '30–35 Nm' },
    ],
    parts: [
      { name: 'Lenkkopflager-Satz', price: '10–20 €' },
      { name: 'Federbeine (Paar)', price: '30–80 €' },
      { name: 'Simmerringe Telegabel', price: '5–10 €' },
    ],
  },

  {
    id: 'bremsen',
    name: 'Bremsen',
    icon: 'brake',
    summary:
      'Trommelbremsen (Ø 125 mm S-Reihe) mit Seilzugbetätigung vorn, Gestänge/Seilzug hinten. Regelmäßig: Belagstärke, Züge, Einstellung.',
    defects: [
      { name: 'Schlechte Bremswirkung', symptom: 'Verglaste/verölte Beläge, gelängter Zug, falsch eingestellt.' },
      { name: 'Bremse rubbelt', symptom: 'Trommel unrund – ausdrehen lassen oder ersetzen.' },
      { name: 'Quietschen', symptom: 'Beläge anschleifen/entgraten, Trommel entfetten – kein Öl in die Trommel!' },
    ],
    removal: [
      'Rad ausbauen (Achsmutter, Bremsgestänge/Zug aushängen).',
      'Bremsschild abnehmen, Backen an der Feder zusammendrücken und abklappen.',
      'Nur mit Bremsenreiniger arbeiten – Bremsstaub nicht einatmen.',
    ],
    tools: ['SW 17/19 für Achse', 'Bremsenreiniger', 'Federhaken'],
    fasteners: [
      { name: 'Achsmuttern', size: 'M12', torque: '40–70 Nm', note: 'vorn 40–50 / hinten 60–70' },
    ],
    parts: [
      { name: 'Bremsbacken (Paar)', price: '10–18 €' },
      { name: 'Bremszug vorn', price: '5–10 €' },
    ],
  },

  {
    id: 'antrieb',
    name: 'Kette & Antrieb',
    icon: 'chain',
    summary:
      'Rollenkette (meist 1/2×5,4, 415er-Teilung) im Kettenschlauch. Sekundärübersetzung über Ritzel (vorn) und Kettenrad (hinten).',
    defects: [
      { name: 'Kette gelängt', symptom: 'Rasselt im Schlauch, springt im Extremfall über – Durchhang prüfen (~20 mm).' },
      { name: 'Ritzel/Kettenrad spitz', symptom: '„Haifischzähne" – immer als Satz mit Kette ersetzen.' },
    ],
    install: [
      'Kettenspannung: 15–20 mm Durchhang in Mittelstellung des Federwegs.',
      'Hinterrad exakt fluchten (Markierungen an den Kettenspannern).',
      'Kette regelmäßig mit Kettenspray/Getriebeöl schmieren – Kettenschlauch verlängert die Lebensdauer enorm.',
    ],
    tools: ['SW 17/19', 'Kettennieter oder Kettenschloss-Zange'],
    fasteners: [
      { name: 'Ritzelmutter (Antriebsritzel)', size: 'M12/Sicherungsblech', torque: '60 Nm' },
      { name: 'Kettenrad-Schrauben am Mitnehmer', size: 'M8', torque: '20–25 Nm' },
    ],
    parts: [
      { name: 'Kette 415 (110–130 Glieder)', price: '10–20 €' },
      { name: 'Ritzel (13–16 Z)', price: '5–10 €' },
      { name: 'Kettenrad (34–36 Z)', price: '10–18 €' },
    ],
  },
];

/** Knoten (rekursiv) über Pfad-Array finden, z. B. ['motor','kupplung','kupplungskorb'] */
export function findComponent(path) {
  let list = COMPONENT_TREE;
  let node = null;
  const crumbs = [];
  for (const id of path) {
    node = list.find((n) => n.id === id);
    if (!node) return { node: null, crumbs };
    crumbs.push(node);
    list = node.children || [];
  }
  return { node, crumbs };
}
