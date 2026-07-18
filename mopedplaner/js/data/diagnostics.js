/**
 * MopedPlaner – Geführte Diagnose (Problemfinder)
 *
 * Jeder Flow ist ein kleiner Entscheidungsbaum:
 *   steps:   { id: { question, help?, options: [{ label, next? | result? }] } }
 *   results: { id: { title, severity, causes: [{ name, likelihood, fix, link? }] } }
 *
 * `link` verweist auf einen Pfad im Technik-Explorer (#/technik/...).
 * likelihood: 'hoch' | 'mittel' | 'gering'
 */

export const DIAGNOSTIC_FLOWS = [
  {
    id: 'springt-nicht-an',
    title: 'Springt nicht an',
    icon: 'spark',
    tagline: 'Der Klassiker – wir prüfen Zündfunke, Sprit und Kompression.',
    start: 'funke',
    steps: {
      funke: {
        question: 'Hat der Motor einen Zündfunken?',
        help: 'Kerze herausdrehen, in den Stecker, Gewinde an den Zylinderkopf halten (Kerze fest an Masse!) und kräftig durchtreten. Im Schatten prüfen – der Funke sollte kräftig blau sein.',
        options: [
          { label: 'Ja, kräftiger blauer Funke', next: 'sprit' },
          { label: 'Nur schwacher / roter Funke', result: 'funke-schwach' },
          { label: 'Kein Funke', next: 'kein-funke' },
        ],
      },
      'kein-funke': {
        question: 'Ist der Killschalter/Zündschloss auf „Ein" und die Kabel unbeschädigt?',
        help: 'Zündschloss auf Fahrt, Kurzschlusskabel (Killschalter) prüfen. Ein gegen Masse liegendes blaues Kabel unterbindet jeden Funken.',
        options: [
          { label: 'Alles ok, trotzdem kein Funke', result: 'zuendung-defekt' },
          { label: 'Kabel/Schalter war das Problem', result: 'geloest' },
        ],
      },
      sprit: {
        question: 'Kommt Benzin am Vergaser an?',
        help: 'Benzinschlauch am Vergaser abziehen, Hahn öffnen – es muss ein sauberer Strahl kommen (auch auf „Reserve" testen).',
        options: [
          { label: 'Ja, Benzin fließt', next: 'kerze-nass' },
          { label: 'Nein / nur Tropfen', result: 'sprit-mangel' },
        ],
      },
      'kerze-nass': {
        question: 'Wie sieht die Kerze nach mehreren Startversuchen aus?',
        help: 'Kerze herausdrehen und Elektrode ansehen.',
        options: [
          { label: 'Nass, riecht nach Benzin', result: 'ersoffen' },
          { label: 'Staubtrocken', result: 'vergaser-zu' },
          { label: 'Normal feucht', next: 'kompression' },
        ],
      },
      kompression: {
        question: 'Fühlt sich beim Durchtreten spürbarer Widerstand (Kompression)?',
        help: 'Der Kickstarter muss gegen deutlichen Druck arbeiten. Noch besser: Kompressionstester – gesund sind ca. 9–12 bar.',
        options: [
          { label: 'Ja, deutlicher Widerstand', result: 'einstellung' },
          { label: 'Kaum Widerstand', result: 'kompression-weg' },
        ],
      },
    },
    results: {
      geloest: {
        title: 'Problem gefunden 🎉',
        severity: 'ok',
        causes: [
          { name: 'Kurzschluss im Kill-/Zündschalter oder Kabel', likelihood: 'hoch', fix: 'Defektes Kabel isolieren oder Schalter ersetzen. Danach Startprobe.', link: 'elektrik/schalter' },
        ],
      },
      'funke-schwach': {
        title: 'Schwacher Zündfunke',
        severity: 'mittel',
        causes: [
          { name: 'Unterbrecherkontakt abgebrannt/verstellt', likelihood: 'hoch', fix: 'Kontaktabstand auf 0,4 mm einstellen, verschlissene Kontakte ersetzen, Zündzeitpunkt neu (1,8 mm v. OT).', link: 'zuendung/unterbrecher' },
          { name: 'Kondensator schwach', likelihood: 'hoch', fix: 'Kondensator ersetzen (4–8 €) – häufigster Verschleißdefekt der Unterbrecherzündung.', link: 'zuendung/unterbrecher' },
          { name: 'Zündkerze / Kerzenstecker', likelihood: 'mittel', fix: 'Neue Kerze (B7HS / ZM14-260) testen, Stecker auf Korrosion prüfen.', link: 'zuendung/zuendspule' },
        ],
      },
      'zuendung-defekt': {
        title: 'Zündanlage prüfen',
        severity: 'mittel',
        causes: [
          { name: 'Kondensator defekt', likelihood: 'hoch', fix: 'Ersetzen – günstigstes und häufigstes Teil.', link: 'zuendung/unterbrecher' },
          { name: 'Zündspule defekt', likelihood: 'mittel', fix: 'Primär-/Sekundärwicklung mit Multimeter messen, ggf. ersetzen.', link: 'zuendung/zuendspule' },
          { name: 'Kabelbruch Grundplatte → Spule', likelihood: 'mittel', fix: 'Kabel auf Durchgang prüfen, besonders am Rahmendurchgang.', link: 'elektrik' },
          { name: 'Elektronikbaustein (E-Zündung)', likelihood: 'gering', fix: 'Bei SLEZ: Geberspule und Steuerteil prüfen/tauschen.', link: 'zuendung' },
        ],
      },
      'sprit-mangel': {
        title: 'Kein Benzin am Vergaser',
        severity: 'leicht',
        causes: [
          { name: 'Benzinhahn/Sieb verstopft', likelihood: 'hoch', fix: 'Hahn ausbauen, Sieb reinigen, Tank auf Rost prüfen.', link: 'kraftstoff/benzinhahn' },
          { name: 'Tankdeckel-Belüftung zu', likelihood: 'mittel', fix: 'Belüftungsbohrung im Deckel freimachen (Unterdruck im Tank).', link: 'kraftstoff/tank' },
          { name: 'Schlauch geknickt/zugesetzt', likelihood: 'mittel', fix: 'Benzinschlauch erneuern (Meterware).', link: 'kraftstoff' },
        ],
      },
      ersoffen: {
        title: 'Motor ersoffen / zu viel Sprit',
        severity: 'leicht',
        causes: [
          { name: 'Zu viel getupft / Choke', likelihood: 'hoch', fix: 'Kerze trocknen, Vollgas + ohne Tupfen einige Male durchtreten, dann normal starten.' },
          { name: 'Schwimmernadelventil hängt', likelihood: 'mittel', fix: 'Vergaser läuft über: Kammer öffnen, Nadelventil reinigen/ersetzen.', link: 'vergaser/schwimmer' },
        ],
      },
      'vergaser-zu': {
        title: 'Kein Sprit im Brennraum',
        severity: 'leicht',
        causes: [
          { name: 'Düsen verstopft', likelihood: 'hoch', fix: 'Vergaser zerlegen, Düsen mit Druckluft reinigen – nie mit Draht.', link: 'vergaser/duesen' },
          { name: 'Schwimmerstand zu niedrig', likelihood: 'mittel', fix: 'Schwimmerstand nach Handbuch einstellen.', link: 'vergaser/schwimmer' },
        ],
      },
      'kompression-weg': {
        title: 'Kompression fehlt',
        severity: 'schwer',
        causes: [
          { name: 'Kolbenringe verschlissen/festgebacken', likelihood: 'hoch', fix: 'Kompressionstest. Bei Standzeit: etwas Öl ins Kerzenloch und erneut testen – steigt der Wert, sind es die Ringe.', link: 'motor/zylinder/kolben' },
          { name: 'Kopfdichtung defekt', likelihood: 'mittel', fix: 'Kopf abnehmen, Dichtflächen prüfen, neue Dichtung, Muttern 9–10 Nm über Kreuz.', link: 'motor/zylinder/zylinderkopf' },
          { name: 'Kolbenklemmer-Folgeschaden', likelihood: 'gering', fix: 'Zylinder ziehen und Laufbahn inspizieren.', link: 'motor/zylinder' },
        ],
      },
      einstellung: {
        title: 'Grundeinstellungen prüfen',
        severity: 'leicht',
        causes: [
          { name: 'Zündzeitpunkt verstellt', likelihood: 'hoch', fix: '1,8 mm vor OT einstellen (Prüflampe/Messuhr).', link: 'zuendung/unterbrecher' },
          { name: 'Vergaser-Grundeinstellung', likelihood: 'mittel', fix: 'Leerlaufschraube ~1,5 Umdrehungen raus, frischer Sprit, Luftfilter prüfen.', link: 'vergaser' },
          { name: 'Alter Sprit', likelihood: 'mittel', fix: 'Nach > 6 Monaten Standzeit: Tank und Schwimmerkammer entleeren, frisches Gemisch.' },
        ],
      },
    },
  },

  {
    id: 'geht-aus',
    title: 'Geht im Betrieb aus',
    icon: 'stop',
    tagline: 'Motor startet, stirbt aber im Leerlauf oder während der Fahrt ab.',
    start: 'wann',
    steps: {
      wann: {
        question: 'Wann geht der Motor aus?',
        options: [
          { label: 'Im Leerlauf / an der Ampel', result: 'leerlauf' },
          { label: 'Bei Vollgas / nach längerer Fahrt', result: 'vollgas' },
          { label: 'Sporadisch, wie abgeschaltet', result: 'elektrisch' },
        ],
      },
    },
    results: {
      leerlauf: {
        title: 'Stirbt im Leerlauf ab',
        severity: 'leicht',
        causes: [
          { name: 'Leerlaufdüse/Einstellung', likelihood: 'hoch', fix: 'Leerlaufdüse reinigen, Standgasschraube nachstellen.', link: 'vergaser/duesen' },
          { name: 'Nebenluft (Simmerringe, Ansaugstutzen)', likelihood: 'mittel', fix: 'Startpilot-Test an Stutzen/Wellendichtringen – Drehzahländerung = undicht.', link: 'motor/kurbeltrieb' },
          { name: 'Zündzeitpunkt', likelihood: 'gering', fix: 'Auf 1,8 mm v. OT prüfen.', link: 'zuendung' },
        ],
      },
      vollgas: {
        title: 'Stirbt unter Last / warm ab',
        severity: 'mittel',
        causes: [
          { name: 'Spritmangel (Hahn/Belüftung)', likelihood: 'hoch', fix: 'Durchfluss am Hahn prüfen, Tankdeckel-Belüftung freimachen.', link: 'kraftstoff/benzinhahn' },
          { name: 'Zu mager (Klemmergefahr!)', likelihood: 'mittel', fix: 'Kerzenbild prüfen – weiß = sofort Ursache suchen (Düse, Nebenluft).', link: 'vergaser' },
          { name: 'Zündspule Wärmedefekt', likelihood: 'mittel', fix: 'Typisch: kalt ok, warm Aussetzer. Spule tauschen.', link: 'zuendung/zuendspule' },
        ],
      },
      elektrisch: {
        title: 'Sporadischer Zündungsausfall',
        severity: 'mittel',
        causes: [
          { name: 'Wackelkontakt Kurzschlusskabel', likelihood: 'hoch', fix: 'Blaues Kabel vom Zündschloss/Killschalter auf Scheuerstellen prüfen.', link: 'elektrik/schalter' },
          { name: 'Kondensator', likelihood: 'mittel', fix: 'Ersetzen.', link: 'zuendung/unterbrecher' },
          { name: 'Kerzenstecker locker', likelihood: 'gering', fix: 'Stecker und Kerze prüfen/ersetzen.' },
        ],
      },
    },
  },

  {
    id: 'laeuft-schlecht',
    title: 'Läuft schlecht / keine Leistung',
    icon: 'gauge',
    tagline: 'Ruckeln, Viertakteln, fehlender Durchzug oder zu niedrige Endgeschwindigkeit.',
    start: 'symptom',
    steps: {
      symptom: {
        question: 'Was beschreibt das Verhalten am besten?',
        options: [
          { label: '„Viertaktelt", blubbert, Kerze schwarz', result: 'fett' },
          { label: 'Klingelt, wird heiß, Kerze weiß', result: 'mager' },
          { label: 'Zieht einfach nicht mehr wie früher', next: 'schleichend' },
        ],
      },
      schleichend: {
        question: 'Kam der Leistungsverlust schleichend über Wochen?',
        options: [
          { label: 'Ja, langsam schlimmer geworden', result: 'schleichend-r' },
          { label: 'Nein, plötzlich', result: 'ploetzlich' },
        ],
      },
    },
    results: {
      fett: {
        title: 'Gemisch zu fett',
        severity: 'leicht',
        causes: [
          { name: 'Luftfilter zugesetzt', likelihood: 'hoch', fix: 'Filtereinsatz reinigen/ersetzen.', link: 'vergaser/luftfilter' },
          { name: 'Schwimmerstand zu hoch / Nadelventil', likelihood: 'mittel', fix: 'Schwimmer einstellen, Nadelventil prüfen.', link: 'vergaser/schwimmer' },
          { name: 'Falsche Bedüsung', likelihood: 'mittel', fix: 'Serien-HD einbauen (S51: 72), Nadelposition prüfen.', link: 'vergaser/duesen' },
        ],
      },
      mager: {
        title: 'Gemisch zu mager – Vorsicht Klemmer!',
        severity: 'schwer',
        causes: [
          { name: 'Nebenluft', likelihood: 'hoch', fix: 'Ansaugstutzen, Flanschdichtung und Wellendichtringe prüfen (Startpilot-Test). Bis zur Klärung nicht Vollgas fahren!', link: 'motor/kurbeltrieb' },
          { name: 'Hauptdüse zu klein / verschmutzt', likelihood: 'mittel', fix: 'Düse reinigen, Bedüsung prüfen.', link: 'vergaser/duesen' },
          { name: 'Zu wenig Öl im Gemisch', likelihood: 'gering', fix: 'Mischungsverhältnis prüfen (M541: 1:50, Altmotoren 1:33).' },
        ],
      },
      'schleichend-r': {
        title: 'Schleichender Leistungsverlust',
        severity: 'mittel',
        causes: [
          { name: 'Auspuff verkokt', likelihood: 'hoch', fix: 'Dämpfereinsatz reinigen/ausbrennen – häufigste Ursache.', link: 'auspuff' },
          { name: 'Kolbenringe verschlissen', likelihood: 'mittel', fix: 'Kompression messen (soll ~9–12 bar).', link: 'motor/zylinder/kolben' },
          { name: 'Luftfilter', likelihood: 'mittel', fix: 'Einsatz erneuern.', link: 'vergaser/luftfilter' },
        ],
      },
      ploetzlich: {
        title: 'Plötzlicher Leistungsverlust',
        severity: 'mittel',
        causes: [
          { name: 'Zündzeitpunkt verstellt (Passfeder!)', likelihood: 'hoch', fix: 'Polrad-Passfeder und Zündeinstellung prüfen.', link: 'zuendung/polrad' },
          { name: 'Kupplung rutscht', likelihood: 'mittel', fix: 'Drehzahl steigt ohne Vortrieb? → Kupplung.', link: 'motor/kupplung' },
          { name: 'Krümmer undicht', likelihood: 'gering', fix: 'Krümmermutter nachziehen, Dichtung neu.', link: 'auspuff' },
        ],
      },
    },
  },

  {
    id: 'verliert-benzin',
    title: 'Verliert Benzin',
    icon: 'drop',
    tagline: 'Benzingeruch oder sichtbare Tropfen – wir finden die Leckstelle.',
    start: 'wo',
    steps: {
      wo: {
        question: 'Wo tritt das Benzin aus?',
        options: [
          { label: 'Am Vergaser (Überlauf)', result: 'vergaser' },
          { label: 'Am Benzinhahn', result: 'hahn' },
          { label: 'Am Schlauch / unklar', result: 'schlauch' },
        ],
      },
    },
    results: {
      vergaser: {
        title: 'Vergaser läuft über',
        severity: 'mittel',
        causes: [
          { name: 'Schwimmernadelventil undicht/verklemmt', likelihood: 'hoch', fix: 'Kammer öffnen, Ventil reinigen oder ersetzen. Bei Rost im Sprit: Tank sanieren.', link: 'vergaser/schwimmer' },
          { name: 'Schwimmer defekt (vollgelaufen)', likelihood: 'mittel', fix: 'Schwimmer schütteln – schwappt es, ersetzen.', link: 'vergaser/schwimmer' },
          { name: 'Schwimmerstand falsch', likelihood: 'gering', fix: 'Nach Handbuch einstellen.', link: 'vergaser' },
        ],
      },
      hahn: {
        title: 'Benzinhahn undicht',
        severity: 'leicht',
        causes: [
          { name: 'Dichtung/Küken verschlissen', likelihood: 'hoch', fix: 'Dichtsatz oder kompletten EHR-Hahn ersetzen (8–15 €).', link: 'kraftstoff/benzinhahn' },
          { name: 'Hahn locker am Tank', likelihood: 'mittel', fix: 'Mit neuer Dichtung nachziehen – nicht überdrehen.', link: 'kraftstoff/benzinhahn' },
        ],
      },
      schlauch: {
        title: 'Leitung undicht',
        severity: 'leicht',
        causes: [
          { name: 'Poröser Benzinschlauch', likelihood: 'hoch', fix: 'Komplett erneuern, Schellen setzen.', link: 'kraftstoff' },
          { name: 'Tanknaht undicht', likelihood: 'gering', fix: 'Tank abdrücken/prüfen, ggf. versiegeln oder ersetzen. Achtung Brandgefahr – nicht schweißen ohne Fachkenntnis!', link: 'kraftstoff/tank' },
        ],
      },
    },
  },

  {
    id: 'elektrik-licht',
    title: 'Licht / Elektrik spinnt',
    icon: 'bolt',
    tagline: 'Kein Licht, flackern, Hupe tot oder Batterie lädt nicht.',
    start: 'was',
    steps: {
      was: {
        question: 'Was genau funktioniert nicht?',
        options: [
          { label: 'Gar kein Licht', result: 'kein-licht' },
          { label: 'Licht flackert / Birnen brennen durch', result: 'flackern' },
          { label: 'Batterie lädt nicht / Blinker lahm', result: 'laden' },
        ],
      },
    },
    results: {
      'kein-licht': {
        title: 'Kein Licht',
        severity: 'leicht',
        causes: [
          { name: 'Birne durch / Fassung korrodiert', likelihood: 'hoch', fix: 'Bilux 6V 25/25W prüfen, Kontakte reinigen.', link: 'elektrik/scheinwerfer' },
          { name: 'Massefehler Lampentopf', likelihood: 'hoch', fix: 'Massekabel und Übergang Rahmen→Topf prüfen (Multimeter).', link: 'elektrik' },
          { name: 'Lichtspule defekt', likelihood: 'mittel', fix: 'Wechselspannung an der Spule bei laufendem Motor messen.', link: 'elektrik' },
          { name: 'Lichtschalter', likelihood: 'mittel', fix: 'Schalter zerlegen, Kontakte reinigen, Kontaktspray.', link: 'elektrik/schalter' },
        ],
      },
      flackern: {
        title: 'Flackern / Birnensterben',
        severity: 'mittel',
        causes: [
          { name: 'Wackelkontakt/Masse', likelihood: 'hoch', fix: 'Alle Steckverbinder und Massepunkte nacharbeiten.', link: 'elektrik' },
          { name: 'Fehlender Verbraucher (Überspannung)', likelihood: 'mittel', fix: 'Bei 6-V-Anlagen: durchgebranntes Rücklicht lässt Frontbirne sterben – alle Birnen korrekt bestücken.', link: 'elektrik/scheinwerfer' },
          { name: 'Regler defekt (12-V-Anlagen)', likelihood: 'mittel', fix: 'Ladespannung messen: > 14,8 V = Regler ersetzen.', link: 'elektrik/batterie' },
        ],
      },
      laden: {
        title: 'Batterie lädt nicht',
        severity: 'mittel',
        causes: [
          { name: 'Batterie sulfatiert', likelihood: 'hoch', fix: 'Batterie extern laden und testen, ggf. ersetzen.', link: 'elektrik/batterie' },
          { name: 'Ladeanlage/Gleichrichter', likelihood: 'mittel', fix: 'Ladespannung an der Batterie bei mittlerer Drehzahl messen (soll ~6,9–7,5 V bzw. 13,8–14,4 V).', link: 'elektrik/batterie' },
          { name: 'Korrodierte Pole/Sicherung', likelihood: 'mittel', fix: 'Pole reinigen und fetten, Sicherungshalter prüfen.', link: 'elektrik' },
        ],
      },
    },
  },

  {
    id: 'kupplung-rutscht',
    title: 'Kupplung rutscht / trennt nicht',
    icon: 'clutch',
    tagline: 'Drehzahl ohne Vortrieb – oder krachende Gänge.',
    start: 'art',
    steps: {
      art: {
        question: 'Was macht die Kupplung?',
        options: [
          { label: 'Rutscht (Drehzahl steigt, Tempo nicht)', result: 'rutscht' },
          { label: 'Trennt nicht (Gänge krachen)', result: 'trennt-nicht' },
        ],
      },
    },
    results: {
      rutscht: {
        title: 'Kupplung rutscht',
        severity: 'mittel',
        causes: [
          { name: 'Zu wenig Spiel eingestellt', likelihood: 'hoch', fix: 'Einstellschraube im Deckel: bis Anlage, ¼ zurück, kontern. 2–3 mm Spiel am Hebel.', link: 'motor/kupplung/druckstueck' },
          { name: 'Reiblamellen verschlissen', likelihood: 'hoch', fix: 'Lamellenpaket ersetzen (Mindeststärke!).', link: 'motor/kupplung/lamellen' },
          { name: 'Falsches Öl (Additive)', likelihood: 'mittel', fix: 'GL80-Getriebeöl verwenden, kein modernes Motoröl mit Reibminderern.', link: 'motor/getriebe' },
          { name: 'Ermüdete Federn', likelihood: 'gering', fix: 'Federsatz erneuern (5–10 €).', link: 'motor/kupplung' },
        ],
      },
      'trennt-nicht': {
        title: 'Kupplung trennt nicht',
        severity: 'leicht',
        causes: [
          { name: 'Zu viel Spiel / Zug gelängt', likelihood: 'hoch', fix: 'Kupplungszug und Einstellschraube neu einstellen.', link: 'motor/kupplung/druckstueck' },
          { name: 'Lamellen verklebt (Standzeit)', likelihood: 'mittel', fix: 'Warmfahren, im Stand Gang einlegen und mit gezogener Kupplung „losreißen" – sonst zerlegen und Lamellen lösen.', link: 'motor/kupplung/lamellen' },
          { name: 'Stahllamellen verzogen', likelihood: 'gering', fix: 'Auf Planplatte prüfen, ersetzen.', link: 'motor/kupplung/lamellen' },
        ],
      },
    },
  },

  {
    id: 'geraeusche',
    title: 'Ungewöhnliche Geräusche',
    icon: 'sound',
    tagline: 'Klappern, Rasseln, Schlagen – Geräusche richtig deuten.',
    start: 'art',
    steps: {
      art: {
        question: 'Wie klingt das Geräusch?',
        options: [
          { label: 'Helles Klackern im Leerlauf', result: 'klackern' },
          { label: 'Rasseln, verschwindet bei gezogener Kupplung', result: 'rasseln' },
          { label: 'Metallisches Schlagen unter Last', result: 'schlagen' },
          { label: 'Rasseln/Schleifen im Fahrbetrieb', result: 'kette' },
        ],
      },
    },
    results: {
      klackern: {
        title: 'Klackern im Leerlauf',
        severity: 'mittel',
        causes: [
          { name: 'Kolbenkipper', likelihood: 'hoch', fix: 'Typisch: verschwindet unter Last. Mittelfristig Kolben/Zylinder ersetzen bzw. schleifen lassen.', link: 'motor/zylinder/kolben' },
          { name: 'Loses Polrad', likelihood: 'gering', fix: 'Polradmutter auf 60–70 Nm prüfen.', link: 'zuendung/polrad' },
        ],
      },
      rasseln: {
        title: 'Kupplungsrasseln',
        severity: 'leicht',
        causes: [
          { name: 'Kupplungskorb-Spiel', likelihood: 'hoch', fix: 'Normal bei Laufleistung; stört es, Korb/Lamellen erneuern.', link: 'motor/kupplung/kupplungskorb' },
        ],
      },
      schlagen: {
        title: 'Schlagen unter Last – Motor schonen!',
        severity: 'schwer',
        causes: [
          { name: 'Pleuellager-Schaden', likelihood: 'hoch', fix: 'Nicht weiterfahren! Kurbelwelle regenerieren lassen – sonst droht kapitaler Motorschaden.', link: 'motor/kurbeltrieb' },
          { name: 'Hauptlager', likelihood: 'mittel', fix: 'Mahlende Geräusche aus dem Gehäuse – Motor überholen.', link: 'motor/kurbeltrieb' },
        ],
      },
      kette: {
        title: 'Geräusche aus dem Antrieb',
        severity: 'leicht',
        causes: [
          { name: 'Kette zu locker / trocken', likelihood: 'hoch', fix: 'Spannen (15–20 mm Durchhang), schmieren.', link: 'antrieb' },
          { name: 'Ritzel/Kettenrad verschlissen', likelihood: 'mittel', fix: '„Haifischzähne"? Als Satz mit Kette ersetzen.', link: 'antrieb' },
        ],
      },
    },
  },

  {
    id: 'bremse-schlecht',
    title: 'Bremse schlecht',
    icon: 'brake',
    tagline: 'Zu lange Bremswege, Quietschen oder Rubbeln.',
    start: 'symptom',
    steps: {
      symptom: {
        question: 'Was ist das Symptom?',
        options: [
          { label: 'Schwache Bremswirkung', result: 'schwach' },
          { label: 'Quietscht laut', result: 'quietscht' },
          { label: 'Rubbelt / pulsiert', result: 'rubbelt' },
        ],
      },
    },
    results: {
      schwach: {
        title: 'Schwache Bremswirkung',
        severity: 'schwer',
        causes: [
          { name: 'Falsch eingestellt / Zug gelängt', likelihood: 'hoch', fix: 'Flügelmutter/Einsteller nachziehen: Rad muss frei laufen, aber früh greifen.', link: 'bremsen' },
          { name: 'Beläge verschlissen/verglast', likelihood: 'hoch', fix: 'Backen ersetzen; verglaste Beläge leicht anschleifen.', link: 'bremsen' },
          { name: 'Öl/Fett in der Trommel', likelihood: 'mittel', fix: 'Ursache (Radlager-Fett, Simmerring) beheben, Trommel entfetten, Beläge ersetzen.', link: 'bremsen' },
        ],
      },
      quietscht: {
        title: 'Bremse quietscht',
        severity: 'leicht',
        causes: [
          { name: 'Belag-Kanten scharf / Staub', likelihood: 'hoch', fix: 'Trommel ausblasen (Bremsenreiniger, Staub nicht einatmen!), Belagkanten brechen.', link: 'bremsen' },
        ],
      },
      rubbelt: {
        title: 'Bremse rubbelt',
        severity: 'mittel',
        causes: [
          { name: 'Trommel unrund', likelihood: 'hoch', fix: 'Trommel ausdrehen lassen oder Nabe ersetzen.', link: 'bremsen' },
          { name: 'Ungleichmäßiger Belagverschleiß', likelihood: 'mittel', fix: 'Backen paarweise neu.', link: 'bremsen' },
        ],
      },
    },
  },
];

export function getFlow(id) {
  return DIAGNOSTIC_FLOWS.find((f) => f.id === id) || null;
}
