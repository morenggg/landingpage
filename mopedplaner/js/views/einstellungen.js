/**
 * MopedPlaner – Mehr / Einstellungen
 * Datensicherung (Export/Import), App-Infos und Ausblick.
 */

import { el, icon, toast, confirmSheet } from '../ui.js';
import { Backup } from '../store.js';
import { refresh } from '../router.js';

/* Zeitstempel der letzten Sicherung – im UI-State, getrennt von Nutzerdaten,
   damit er nicht mit exportiert wird. Erst nach echtem Erfolg gesetzt. */
const UI_KEY = 'mopedplaner.ui.v1';
function markBackup(kind) {
  try {
    const s = JSON.parse(localStorage.getItem(UI_KEY)) || {};
    s.lastBackup = { at: new Date().toISOString(), kind };
    localStorage.setItem(UI_KEY, JSON.stringify(s));
  } catch { /* voll – egal */ }
}
function lastBackup() {
  try { return (JSON.parse(localStorage.getItem(UI_KEY)) || {}).lastBackup || null; } catch { return null; }
}
function agoText(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'heute';
  if (days === 1) return 'gestern';
  if (days < 30) return `vor ${days} Tagen`;
  return `vor ${Math.floor(days / 30)} Monaten`;
}

export function renderEinstellungen() {
  const wrap = el('div', { class: 'view' });
  wrap.append(
    el('header', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Mehr'),
        el('p', { class: 'muted' }, 'Werkzeuge, Datensicherung und Infos zur App.'))
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
      'Deine Daten liegen nur auf diesem Gerät – keine Cloud, kein Konto. Sicher sie ab und zu als Datei, dann kannst du sie aufs nächste Gerät mitnehmen.')
  );

  const lb = lastBackup();
  backupSec.append(
    el('div', { class: 'backup-status' },
      icon(lb ? 'check' : 'info', 16, lb ? 'brass' : 'muted'),
      el('span', {}, lb
        ? `Letzte Sicherung: ${agoText(lb.at)} (${lb.kind === 'import' ? 'eingespielt' : 'exportiert'})`
        : 'Noch keine Sicherung erstellt.'))
  );

  const fileInput = el('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const yes = await confirmSheet('Sicherung einspielen?', 'Die aktuellen Daten auf diesem Gerät werden durch die Sicherung ersetzt. Das lässt sich nicht rückgängig machen.', 'Einspielen');
    if (!yes) { fileInput.value = ''; return; }
    try {
      await Backup.import(await file.text());
      markBackup('import');
      toast('Sicherung eingespielt.');
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
          try {
            const json = await Backup.export();
            const blob = new Blob([json], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `mopedplaner-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 5000);
            markBackup('export');
            toast('Sicherung als Datei gespeichert.');
            refresh();
          } catch {
            toast('Export fehlgeschlagen.', 'err');
          }
        },
      }, icon('download', 18, 'row-lead'), el('div', { class: 'row-main' }, el('span', {}, 'Daten sichern'), el('span', { class: 'muted small' }, 'Als JSON-Datei herunterladen')), icon('chevR', 18, 'muted')),
      el('button', { class: 'row-item as-btn', onclick: () => fileInput.click() },
        icon('upload', 18, 'row-lead'), el('div', { class: 'row-main' }, el('span', {}, 'Sicherung einspielen'), el('span', { class: 'muted small' }, 'JSON-Datei vom Gerät wählen')), icon('chevR', 18, 'muted')),
      fileInput
    )
  );
  wrap.append(backupSec);

  // Über
  const aboutSec = el('section', { class: 'section' }, el('h2', { class: 'sub-head' }, 'Über MopedPlaner'));
  aboutSec.append(
    el('div', { class: 'card' },
      el('p', { class: 'small', style: 'margin-top:0' },
        'MopedPlaner ist die digitale Werkbank für alle Simson: Fahrzeugakte, geführte Diagnose, Technik-Wissen, Umbauplaner und Schraubenfinder – gemacht für die Garage, nicht fürs Büro.'),
      el('p', { class: 'small muted' },
        'Als App aufs Handy: im Browser-Menü „Zum Startbildschirm hinzufügen". Danach läuft alles offline – auch ohne Empfang in der Werkstatt.'),
      el('p', { class: 'small muted', style: 'margin-bottom:0' },
        'Geplant: Community-Projekte, Werkstattfinder, Foto-Analyse, Wartungserinnerungen und Cloud-Sicherung.')
    ),
    el('p', { class: 'disclaimer' }, icon('info', 14),
      ' Alle technischen Angaben sind Richtwerte ohne Gewähr. Bei sicherheitsrelevanten Arbeiten (Bremsen, Rahmen, Lenkung) im Zweifel die Fachwerkstatt fragen.')
  );
  wrap.append(aboutSec);

  return wrap;
}
