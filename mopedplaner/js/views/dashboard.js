/**
 * MopedPlaner – Dashboard
 * Klar priorisiert: 1. Mein Fahrzeug · 2. Schnellaktionen ·
 * 3. Was ist als Nächstes wichtig? · 4. Weiter entdecken.
 */

import { el, icon, fmtDate, sectionEl, techValue } from '../ui.js';
import { Vehicles, Tasks, Logs, LOG_TYPES } from '../store.js';
import { getModel } from '../data/models.js';

export async function renderDashboard() {
  const [vehicles, openTasks, recentLogs] = await Promise.all([
    Vehicles.all(),
    Tasks.allOpen(),
    Logs.recent(3),
  ]);

  const wrap = el('div', { class: 'view' });
  const mainVehicle = vehicles[0] || null; // zuletzt bearbeitet steht vorn

  if (!mainVehicle) {
    // ── Onboarding: erster Start ohne Fahrzeug ──
    wrap.append(
      el('header', { class: 'hero' },
        el('p', { class: 'hero-kicker' }, 'MopedPlaner'),
        el('h1', {}, 'Deine digitale ', el('span', { class: 'accent' }, 'Werkbank')))
    );
    wrap.append(
      el('section', { class: 'section', style: 'margin-top:18px' },
        el('div', { class: 'onboard perfboard' },
          el('div', { class: 'onboard-body' },
            icon('moped', 38, 'onboard-icon'),
            el('h2', {}, 'Leg dein Moped an – der Rest ergibt sich.'),
            el('p', { class: 'onboard-lead' },
              'Fahrzeugakte, geführte Diagnose und passende Ersatzteile für jede Simson – alles offline, direkt in der Garage.'),
            el('a', { class: 'btn btn-primary', href: '#/garage?neu=1' }, icon('plus', 18), 'Fahrzeug anlegen'),
            el('p', { class: 'onboard-hint' },
              'Nur stöbern? Technik, Reparaturen und der Schraubenfinder funktionieren auch ohne Fahrzeug.'))))
    );
  } else {
    // ── Kopf: ruhig, eine Zeile Kontext ──
    const hour = new Date().getHours();
    const greet = hour < 5 ? 'Nachtschicht?' : hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Moin' : 'Guten Abend';
    wrap.append(
      el('header', { class: 'hero' },
        el('p', { class: 'hero-kicker' }, greet),
        el('h1', {}, 'Deine ', el('span', { class: 'accent' }, 'Werkstatt')))
    );

    // ── 1. Mein Fahrzeug ──
    const model = getModel(mainVehicle.modelId);
    const vTasks = openTasks.filter((t) => t.vehicleId === mainVehicle.id);
    const vLog = recentLogs.find((l) => l.vehicleId === mainVehicle.id);
    const mySec = sectionEl('Mein Fahrzeug', vehicles.length > 1 ? { href: '#/garage', link: 'Garage' } : {});
    mySec.append(
      el('a', {
        class: 'my-vehicle perfboard',
        href: `#/fahrzeug/${mainVehicle.id}`,
        style: mainVehicle.photo ? `background-image:url('${mainVehicle.photo}')` : '',
      },
        el('div', { class: 'my-vehicle-scrim' }),
        el('div', { class: 'my-vehicle-body' },
          el('h2', {}, mainVehicle.name || model?.name || 'Fahrzeug'),
          el('span', { class: 'my-vehicle-meta' },
            [model?.name, mainVehicle.baujahr && `Bj. ${mainVehicle.baujahr}`, mainVehicle.motor].filter(Boolean).join(' · ') || 'Details in der Akte'),
          el('div', { class: 'my-vehicle-stats' },
            el('span', { class: vTasks.length ? 'stat-lit' : '' }, techValue(String(vTasks.length), { kind: vTasks.length ? 'torque' : 'plain' }), vTasks.length === 1 ? 'offene Aufgabe' : 'offene Aufgaben'),
            vLog ? el('span', {}, 'Zuletzt: ', el('strong', { style: 'color:var(--muted-strong);font-weight:600' }, vLog.title || 'Eintrag')) : el('span', {}, 'Noch nichts dokumentiert')))
      )
    );
    if (vehicles.length > 1) {
      mySec.append(
        el('div', { class: 'vehicle-switch' },
          vehicles.slice(1, 5).map((v) =>
            el('a', { class: 'chip', href: `#/fahrzeug/${v.id}` },
              icon('moped', 14), v.name || getModel(v.modelId)?.name || 'Fahrzeug')))
      );
    }
    wrap.append(mySec);
  }

  // ── 2. Schnellzugriff als kompakte Werkzeugleiste ──
  const quickSec = sectionEl('Schnellzugriff');
  quickSec.append(
    el('div', { class: 'action-bar' },
      actionBarItem('diag', 'Diagnose', '#/diagnose'),
      actionBarItem('box', 'Ersatzteile', '#/teile'),
      actionBarItem('engine', 'Technik', '#/technik'),
      actionBarItem('search', 'Suche', '#/suche'))
  );
  wrap.append(quickSec);

  // ── 3. Was ist als Nächstes wichtig? ──
  const nextItems = [];
  for (const t of openTasks.slice(0, 4)) {
    const v = vehicles.find((x) => x.id === t.vehicleId);
    nextItems.push(rowLink('check', t.title, v ? (v.name || getModel(v.modelId)?.name) : '', v ? `#/fahrzeug/${v.id}/aufgaben` : '#/garage'));
  }
  for (const log of recentLogs.slice(0, 2)) {
    const v = vehicles.find((x) => x.id === log.vehicleId);
    const type = LOG_TYPES.find((t) => t.id === log.type);
    nextItems.push(rowLink(type?.icon || 'note', log.title || type?.name || 'Eintrag',
      `${v ? (v.name || getModel(v.modelId)?.name) + ' · ' : ''}${fmtDate(log.date)}`,
      v ? `#/fahrzeug/${v.id}/logbuch` : '#/garage'));
  }
  if (nextItems.length) {
    const nextSec = sectionEl('Als Nächstes');
    nextSec.append(el('div', { class: 'stack' }, nextItems));
    wrap.append(nextSec);
  }

  // ── 4. Weiter entdecken ──
  const moreSec = sectionEl('Entdecken');
  moreSec.append(
    el('div', { class: 'stack' },
      rowLink('calendar', 'Wartungsplan', 'Intervalle & Anleitungen', '#/wartung'),
      rowLink('tools', 'Reparaturen', 'Geführt, mit Sollwerten', '#/reparaturen'),
      rowLink('nut', 'Schraubenfinder', 'Drehmomente & Gewinde', '#/schrauben'),
      rowLink('upgrade', 'Umbauplaner', 'VAPE, Tuning, Restauration', '#/planer'))
  );
  wrap.append(moreSec);

  return wrap;
}

function actionBarItem(iconName, label, href) {
  return el('a', { class: 'action-bar-item', href },
    icon(iconName, 23),
    el('span', {}, label));
}

function rowLink(iconName, title, sub, href) {
  return el('a', { class: 'row-item', href },
    icon(iconName, 18, 'row-lead'),
    el('div', { class: 'row-main' },
      el('span', {}, title),
      sub ? el('span', { class: 'muted small clamp-1' }, sub) : null),
    icon('chevR', 18, 'muted'));
}
