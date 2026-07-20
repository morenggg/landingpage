/**
 * MopedPlaner – Start (Werkstatt-Assistent)
 *
 * Design-DNA: maximale Ruhe. Genau ein aktives Fahrzeug, genau eine
 * dominante Aufgabe, große Leitfrage „Was ist heute dran?". Keine
 * Kartenwand, keine KPI-Flut – der Nutzer betritt seine Garage.
 *
 * Der Start besitzt keine eigenen Daten. Er liest nur (Fahrzeug, Aufgaben,
 * Logbuch) und führt in den Bereich, dem die Antwort gehört.
 */

import { el, icon, fmtDate, techValue } from '../ui.js';
import { Vehicles, Tasks, Logs, LOG_TYPES } from '../store.js';
import { getModel } from '../data/models.js';
import { openLogForm } from './vehicle.js';

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

  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Nachtschicht?' : hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Moin' : 'Guten Abend';

  // ── Kopf: Gruß + genau ein Fahrzeug (Zustand + Name) ──
  wrap.append(
    el('div', { class: 'start-top' },
      el('span', { class: 'start-greet' }, greet),
      el('a', { class: 'start-veh', href: `#/fahrzeug/${vehicle.id}` },
        conditionBars(vehicle.zustand),
        el('span', { class: 'start-veh-name' }, vehicle.name || model?.name || 'Fahrzeug')),
      vehicles.length > 1
        ? el('a', { class: 'start-garage', href: '#/garage' }, 'Garage', icon('chevR', 14))
        : null)
  );

  // ── Leitfrage ──
  wrap.append(el('h1', { class: 'start-q' }, 'Was ist', el('br'), 'heute dran?'));

  // ── Eine dominante Aufgabe ──
  const primaryTask = vTasks[0] || null;
  if (primaryTask) {
    const rest = vTasks.length - 1;
    wrap.append(
      el('a', { class: 'start-primary', href: `#/fahrzeug/${vehicle.id}/aufgaben` },
        icon('chevR', 22, 'start-primary-arr'),
        el('span', { class: 'start-primary-lead' }, 'Weiter'),
        el('p', { class: 'start-primary-main' }, primaryTask.title),
        el('p', { class: 'start-primary-meta' },
          rest > 0 ? `+${rest} weitere ${rest === 1 ? 'Aufgabe' : 'Aufgaben'} offen` : 'Deine einzige offene Aufgabe'))
    );
  } else {
    wrap.append(
      el('a', { class: 'start-primary calm', href: `#/fahrzeug/${vehicle.id}` },
        icon('chevR', 22, 'start-primary-arr'),
        el('span', { class: 'start-primary-lead' }, 'Alles erledigt'),
        el('p', { class: 'start-primary-main' }, 'Zwilling ansehen'),
        el('p', { class: 'start-primary-meta' }, 'Bauteile, Werte und Historie deiner Maschine'))
    );
  }

  // ── Drei Verben (keine Kacheln, klare Aktionen) ──
  wrap.append(
    el('div', { class: 'start-verbs' },
      verb('diag', 'Diagnose', '#/diagnose'),
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
        el('span', { class: 'hint-text' }, techValue(String(others), { kind: 'plain' }),
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
        icon('moped', 40, 'onboard-icon'),
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

function conditionBars(zustand = 3) {
  const n = Math.max(1, Math.min(5, Number(zustand) || 3));
  const wrap = el('span', { class: 'cond-bars', 'aria-label': `Zustand ${n} von 5` });
  for (let i = 1; i <= 5; i++) wrap.append(el('i', { class: i <= n ? 'on' : '' }));
  return wrap;
}

function verb(iconName, label, href, onclick = null) {
  const attrs = { class: 'start-verb' };
  if (href) attrs.href = href;
  if (onclick) attrs.onclick = onclick;
  return el(href ? 'a' : 'button', attrs, icon(iconName, 20, 'verb-icon'), el('span', {}, label));
}
