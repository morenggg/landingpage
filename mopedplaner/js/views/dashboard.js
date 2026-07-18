/**
 * MopedPlaner – Dashboard
 * Einstieg: Fahrzeuge, offene Aufgaben, letzte Aktivitäten, Schnellzugriffe.
 */

import { el, icon, fmtDate, fmtEuro } from '../ui.js';
import { Vehicles, Tasks, Logs, LOG_TYPES } from '../store.js';
import { getModel } from '../data/models.js';
import { DIAGNOSTIC_FLOWS } from '../data/diagnostics.js';

export async function renderDashboard() {
  const [vehicles, openTasks, recentLogs] = await Promise.all([
    Vehicles.all(),
    Tasks.allOpen(),
    Logs.recent(4),
  ]);

  const wrap = el('div', { class: 'view' });

  // Kopfbereich
  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Nachtschicht?' : hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Moin' : 'Guten Abend';
  wrap.append(
    el(
      'header',
      { class: 'hero' },
      el('p', { class: 'hero-kicker' }, greet),
      el('h1', {}, 'Deine digitale ', el('span', { class: 'accent' }, 'Werkstatt')),
      el('p', { class: 'muted' }, 'Fahrzeuge verwalten, Probleme finden, Umbauten planen – alles an einem Ort.')
    )
  );

  // Schnellzugriffe
  wrap.append(
    el(
      'div',
      { class: 'quick-grid' },
      quickTile('diag', 'Problemfinder', 'Geführte Diagnose', '#/diagnose'),
      quickTile('engine', 'Technik', 'Bauteile erkunden', '#/technik'),
      quickTile('upgrade', 'Umbauplaner', 'Kits & Teilelisten', '#/planer'),
      quickTile('nut', 'Schrauben', 'Drehmomente', '#/schrauben')
    )
  );

  // Meine Fahrzeuge
  const vehSection = el('section', { class: 'section' });
  vehSection.append(sectionHead('Meine Garage', '#/garage', vehicles.length ? 'Alle anzeigen' : null));
  if (!vehicles.length) {
    vehSection.append(
      el(
        'a',
        { class: 'card card-cta', href: '#/garage?neu=1' },
        icon('moped', 30, 'cta-icon'),
        el('div', {},
          el('strong', {}, 'Erstes Fahrzeug anlegen'),
          el('p', { class: 'muted small' }, 'Simson auswählen, Daten eintragen – und die Fahrzeugakte beginnt.')
        ),
        icon('chevR', 20, 'muted')
      )
    );
  } else {
    const scroller = el('div', { class: 'h-scroll' });
    for (const v of vehicles.slice(0, 6)) scroller.append(vehicleCard(v));
    vehSection.append(scroller);
  }
  wrap.append(vehSection);

  // Offene Aufgaben
  if (openTasks.length) {
    const list = el('div', { class: 'stack' });
    for (const t of openTasks.slice(0, 5)) {
      const v = vehicles.find((x) => x.id === t.vehicleId);
      list.append(
        el(
          'a',
          { class: 'row-item', href: v ? `#/fahrzeug/${v.id}/aufgaben` : '#/garage' },
          icon('check', 18, 'row-lead'),
          el('div', { class: 'row-main' },
            el('span', {}, t.title),
            v ? el('span', { class: 'muted small' }, v.name || modelName(v)) : null
          ),
          icon('chevR', 18, 'muted')
        )
      );
    }
    const sec = el('section', { class: 'section' });
    sec.append(sectionHead(`Offene Aufgaben (${openTasks.length})`), list);
    wrap.append(sec);
  }

  // Zuletzt im Logbuch
  if (recentLogs.length) {
    const list = el('div', { class: 'stack' });
    for (const log of recentLogs) {
      const v = vehicles.find((x) => x.id === log.vehicleId);
      const type = LOG_TYPES.find((t) => t.id === log.type);
      list.append(
        el(
          'a',
          { class: 'row-item', href: v ? `#/fahrzeug/${v.id}/logbuch` : '#/garage' },
          icon(type?.icon || 'note', 18, 'row-lead'),
          el('div', { class: 'row-main' },
            el('span', {}, log.title || type?.name || 'Eintrag'),
            el('span', { class: 'muted small' }, `${v ? (v.name || modelName(v)) + ' · ' : ''}${fmtDate(log.date)}${log.cost ? ' · ' + fmtEuro(log.cost) : ''}`)
          ),
          icon('chevR', 18, 'muted')
        )
      );
    }
    const sec = el('section', { class: 'section' });
    sec.append(sectionHead('Zuletzt in der Akte'), list);
    wrap.append(sec);
  }

  // Häufige Probleme
  const diagSec = el('section', { class: 'section' });
  diagSec.append(sectionHead('Häufige Probleme', '#/diagnose', 'Alle'));
  const chips = el('div', { class: 'chip-wrap' });
  for (const f of DIAGNOSTIC_FLOWS.slice(0, 5)) {
    chips.append(el('a', { class: 'chip', href: `#/diagnose/${f.id}` }, icon(f.icon, 16), f.title));
  }
  diagSec.append(chips);
  wrap.append(diagSec);

  return wrap;
}

function modelName(v) {
  return getModel(v.modelId)?.name || 'Simson';
}

function quickTile(iconName, title, sub, href) {
  return el(
    'a',
    { class: 'quick-tile', href },
    icon(iconName, 24, 'quick-icon'),
    el('strong', {}, title),
    el('span', { class: 'muted small' }, sub)
  );
}

function sectionHead(title, href, linkText) {
  return el(
    'div',
    { class: 'section-head' },
    el('h2', {}, title),
    href && linkText ? el('a', { class: 'section-link', href }, linkText) : null
  );
}

function vehicleCard(v) {
  const model = getModel(v.modelId);
  return el(
    'a',
    { class: 'vehicle-card', href: `#/fahrzeug/${v.id}` },
    v.photo
      ? el('div', { class: 'vehicle-photo', style: `background-image:url('${v.photo}')` })
      : el('div', { class: 'vehicle-photo placeholder' }, icon('moped', 42)),
    el('div', { class: 'vehicle-card-body' },
      el('strong', {}, v.name || model?.name || 'Fahrzeug'),
      el('span', { class: 'muted small' }, [model?.name, v.baujahr].filter(Boolean).join(' · ') || '—')
    )
  );
}
