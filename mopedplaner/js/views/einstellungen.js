/**
 * MopedPlaner – Mehr / Einstellungen
 * Datensicherung (Export/Import), App-Infos und Ausblick.
 */

import { el, icon, toast, confirmSheet } from '../ui.js';
import { Backup } from '../store.js';

export function renderEinstellungen() {
  const wrap = el('div', { class: 'view' });
  wrap.append(
    el('header', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Mehr'),
        el('p', { class: 'muted' }, 'Deine Daten, Sicherung und Infos zur App.'))
    )
  );

  // Werkzeuge
  const toolsSec = el('section', { class: 'section' }, el('h2', { class: 'sub-head' }, 'Werkzeuge'));
  toolsSec.append(
    el('div', { class: 'stack' },
      el('a', { class: 'row-item', href: '#/suche' }, icon('search', 18, 'row-lead'), el('div', { class: 'row-main' }, el('span', {}, 'Technische Suche')), icon('chevR', 18, 'muted')),
      el('a', { class: 'row-item', href: '#/teile' }, icon('box', 18, 'row-lead'), el('div', { class: 'row-main' }, el('span', {}, 'Ersatzteil-Katalog')), icon('chevR', 18, 'muted')),
      el('a', { class: 'row-item', href: '#/motoren' }, icon('engine', 18, 'row-lead'), el('div', { class: 'row-main' }, el('span', {}, 'Motoren-Datenbank')), icon('chevR', 18, 'muted')),
      el('a', { class: 'row-item', href: '#/wartung' }, icon('calendar', 18, 'row-lead'), el('div', { class: 'row-main' }, el('span', {}, 'Wartungsplan')), icon('chevR', 18, 'muted')),
      el('a', { class: 'row-item', href: '#/reparaturen' }, icon('tools', 18, 'row-lead'), el('div', { class: 'row-main' }, el('span', {}, 'Reparaturen')), icon('chevR', 18, 'muted')),
      el('a', { class: 'row-item', href: '#/planer' }, icon('upgrade', 18, 'row-lead'), el('div', { class: 'row-main' }, el('span', {}, 'Umbauplaner')), icon('chevR', 18, 'muted')),
      el('a', { class: 'row-item', href: '#/schrauben' }, icon('nut', 18, 'row-lead'), el('div', { class: 'row-main' }, el('span', {}, 'Schraubenfinder')), icon('chevR', 18, 'muted'))
    )
  );
  wrap.append(toolsSec);

  // Datensicherung
  const backupSec = el('section', { class: 'section' }, el('h2', { class: 'sub-head' }, 'Datensicherung'));
  backupSec.append(
    el('p', { class: 'muted small' },
      'Alle Daten liegen ausschließlich lokal auf diesem Gerät (offline-first). Sichere sie regelmäßig als Datei – so kannst du sie auf ein neues Gerät mitnehmen.')
  );

  const fileInput = el('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const yes = await confirmSheet('Sicherung einspielen?', 'Die aktuellen Daten auf diesem Gerät werden durch die Sicherung ersetzt.', 'Einspielen');
    if (!yes) { fileInput.value = ''; return; }
    try {
      await Backup.import(await file.text());
      toast('Sicherung eingespielt 🎉');
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      toast(e.message || 'Import fehlgeschlagen.', 'err');
    }
    fileInput.value = '';
  });

  backupSec.append(
    el('div', { class: 'stack' },
      el('button', {
        class: 'row-item as-btn',
        onclick: async () => {
          const json = await Backup.export();
          const blob = new Blob([json], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `mopedplaner-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 5000);
          toast('Sicherung erstellt');
        },
      }, icon('download', 18, 'row-lead'), el('div', { class: 'row-main' }, el('span', {}, 'Daten exportieren'), el('span', { class: 'muted small' }, 'JSON-Datei herunterladen')), icon('chevR', 18, 'muted')),
      el('button', { class: 'row-item as-btn', onclick: () => fileInput.click() },
        icon('upload', 18, 'row-lead'), el('div', { class: 'row-main' }, el('span', {}, 'Sicherung einspielen'), el('span', { class: 'muted small' }, 'JSON-Datei auswählen')), icon('chevR', 18, 'muted')),
      fileInput
    )
  );
  wrap.append(backupSec);

  // Über
  const aboutSec = el('section', { class: 'section' }, el('h2', { class: 'sub-head' }, 'Über MopedPlaner'));
  aboutSec.append(
    el('div', { class: 'card' },
      el('p', { class: 'small', style: 'margin-top:0' },
        'MopedPlaner ist deine digitale Werkstatt für alle Simson-Fahrzeuge: Garage, Fahrzeugakte, geführte Diagnose, Technik-Wissen, Umbauplaner und Schraubenfinder.'),
      el('p', { class: 'small muted' },
        'Als App installierbar: Im Browser-Menü „Zum Startbildschirm hinzufügen" wählen – MopedPlaner funktioniert danach auch offline in der Garage.'),
      el('p', { class: 'small muted', style: 'margin-bottom:0' },
        'In Planung: Community-Projekte, Werkstattfinder, Foto-Analyse, Wartungserinnerungen und Cloud-Synchronisation.')
    ),
    el('p', { class: 'disclaimer' }, icon('info', 14),
      ' Alle technischen Angaben sind Richtwerte ohne Gewähr. Sicherheitsrelevante Arbeiten (Bremsen, Rahmen) im Zweifel von einer Fachwerkstatt prüfen lassen.')
  );
  wrap.append(aboutSec);

  return wrap;
}
