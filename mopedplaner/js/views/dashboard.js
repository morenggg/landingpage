/**
 * MopedPlaner – Start (Werkstatt-Assistent)
 *
 * Design-DNA (Entwurf 01): der glühende Moped-Held als Charakterträger,
 * eine warme Begrüßung, die große Leitfrage „Was ist heute dran?", genau
 * eine dominante „Weiter, wo du warst"-Aktion und klare Verben. Ein
 * Gedanke pro Bildschirm – der Nutzer betritt seine Garage.
 *
 * Der Start besitzt keine eigenen Daten. Er liest nur (Fahrzeug, Aufgaben,
 * Logbuch) und führt in den Bereich, dem die Antwort gehört.
 */

import { el, icon, fmtDate } from '../ui.js';
import { Vehicles, Tasks, Logs, LOG_TYPES } from '../store.js';
import { getModel } from '../data/models.js';
import { getAnatomy } from '../data/anatomy.js';
import { openLogForm } from './vehicle.js';

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export async function renderDashboard() {
  const [vehicles, openTasks, recentLogs] = await Promise.all([
    Vehicles.all(),
    Tasks.allOpen(),
    Logs.recent(4),
  ]);

  const wrap = el('div', { class: 'view view-start' });
  const vehicle = vehicles[0] || null; // zuletzt bearbeitet steht vorn

  if (!vehicle) return renderOnboarding(wrap);

  const model = getModel(vehicle.modelId);
  const vTasks = openTasks.filter((t) => t.vehicleId === vehicle.id);
  const vLog = recentLogs.find((l) => l.vehicleId === vehicle.id);
  const anatomy = getAnatomy(vehicle, model);

  // ── Der glühende Moped-Held (Charakter) ──
  wrap.append(
    el('a', { class: 'start-moped', href: `#/fahrzeug/${vehicle.id}`, 'aria-label': `${vehicle.name || model?.name || 'Fahrzeug'} öffnen` },
      el('span', { class: 'start-moped-glow' }),
      el('span', { class: 'start-moped-art', html: `<svg viewBox="${anatomy.viewBox}" fill="none" aria-hidden="true">${anatomy.svg}</svg>` }))
  );

  // ── Warme Begrüßung: Wochentag+Tageszeit · Fahrzeug ──
  const now = new Date();
  const hour = now.getHours();
  const teil = hour < 5 ? 'nacht' : hour < 11 ? 'morgen' : hour < 14 ? 'mittag' : hour < 18 ? 'nachmittag' : hour < 22 ? 'abend' : 'nacht';
  wrap.append(
    el('p', { class: 'start-greet' },
      `${WEEKDAYS[now.getDay()]}${teil}`,
      el('span', { class: 'start-greet-veh' }, ' · ', vehicle.name || model?.name || 'Fahrzeug'))
  );

  // ── Leitfrage ──
  wrap.append(el('h1', { class: 'start-q' }, 'Was ist', el('br'), 'heute dran?'));

  // ── Eine dominante Aktion ──
  const primaryTask = vTasks[0] || null;
  if (primaryTask) {
    const rest = vTasks.length - 1;
    wrap.append(
      el('a', { class: 'start-primary', href: `#/fahrzeug/${vehicle.id}/aufgaben` },
        el('span', { class: 'start-primary-lead' }, 'Weiter, wo du warst'),
        el('p', { class: 'start-primary-main' }, primaryTask.title),
        el('div', { class: 'start-primary-foot' },
          el('span', { class: 'start-primary-meta' },
            rest > 0 ? `+${rest} weitere ${rest === 1 ? 'Aufgabe' : 'Aufgaben'} offen` : 'Deine offene Aufgabe'),
          icon('back', 22, 'start-primary-arr')))
    );
  } else {
    wrap.append(
      el('a', { class: 'start-primary calm', href: `#/fahrzeug/${vehicle.id}` },
        el('span', { class: 'start-primary-lead' }, 'Alles erledigt'),
        el('p', { class: 'start-primary-main' }, 'Zwilling ansehen'),
        el('div', { class: 'start-primary-foot' },
          el('span', { class: 'start-primary-meta' }, 'Bauteile, Werte und Historie deiner Maschine'),
          icon('back', 22, 'start-primary-arr')))
    );
  }

  // ── Verben: klare, volle Aktionen ──
  wrap.append(
    el('div', { class: 'start-verbs' },
      verb('diag', 'Problem finden', '#/diagnose'),
      verb('box', 'Teil finden', '#/teile'),
      verb('plus', 'Eintragen', null, () => openLogForm(vehicle.id)))
  );

  // ── Dezente Hinweise (verdienen sich ihren Platz) ──
  const hints = el('div', { class: 'start-hints' });
  if (vLog) {
    const type = LOG_TYPES.find((t) => t.id === vLog.type);
    hints.append(
      el('a', { class: 'start-hint', href: `#/fahrzeug/${vehicle.id}/logbuch` },
        el('span', { class: 'hint-dot brass' }),
        el('span', { class: 'hint-text' }, 'Zuletzt: ', el('strong', {}, vLog.title || type?.name || 'Eintrag'),
          el('span', { class: 'hint-when' }, ` · ${fmtDate(vLog.date)}`)),
        icon('chevR', 16, 'hint-arr'))
    );
  }
  if (vehicles.length > 1) {
    const others = vehicles.length - 1;
    hints.append(
      el('a', { class: 'start-hint', href: '#/garage' },
        el('span', { class: 'hint-dot' }),
        el('span', { class: 'hint-text' }, el('strong', {}, String(others)),
          ` weiteres ${others === 1 ? 'Fahrzeug' : 'Fahrzeuge'} in der Garage`),
        icon('chevR', 16, 'hint-arr'))
    );
  }
  if (hints.childElementCount) wrap.append(hints);

  return wrap;
}

/* ── Onboarding: erster Start ohne Fahrzeug ── */
function renderOnboarding(wrap) {
  wrap.classList.add('view-start-empty');
  wrap.append(
    el('div', { class: 'onboard perfboard' },
      el('div', { class: 'onboard-body' },
        el('span', { class: 'onboard-moped', html: `<svg viewBox="${getAnatomy({}, null).viewBox}" fill="none" aria-hidden="true">${getAnatomy({}, null).svg}</svg>` }),
        el('h1', { class: 'onboard-title' }, 'Du betrittst deine Garage.'),
        el('p', { class: 'onboard-lead' },
          'Leg dein Moped an – der Start beantwortet danach jeden Tag nur eine Frage: Was ist dran? Fahrzeugakte, Zwilling, Diagnose und Teile für jede Simson, komplett offline.'),
        el('a', { class: 'btn btn-primary', href: '#/garage?neu=1' }, icon('plus', 18), 'Fahrzeug anlegen'),
        el('p', { class: 'onboard-hint' },
          'Nur stöbern? Technik, Reparaturen und der Schraubenfinder laufen auch ohne Fahrzeug.')))
  );
  return wrap;
}

/* ── kleine Bausteine ── */

function verb(iconName, label, href, onclick = null) {
  const attrs = { class: 'start-verb' };
  if (href) attrs.href = href;
  if (onclick) attrs.onclick = onclick;
  return el(href ? 'a' : 'button', attrs,
    icon(iconName, 20, 'verb-icon'),
    el('span', { class: 'verb-label' }, label),
    icon('chevR', 18, 'verb-arr'));
}
