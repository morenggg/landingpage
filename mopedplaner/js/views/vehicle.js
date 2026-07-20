/**
 * MopedPlaner – Fahrzeugakte
 * Übersicht, Logbuch (Historie mit Kosten) und Aufgaben je Fahrzeug.
 */

import { el, icon, openSheet, closeSheet, confirmSheet, toast, fmtDate, fmtEuro, fmtEuro2, accordion, emptyState, techValue, note } from '../ui.js';
import { Vehicles, Logs, Tasks, LOG_TYPES } from '../store.js';
import { getModel } from '../data/models.js';
import { getAnatomy, attentionAssemblies } from '../data/anatomy.js';
import { findComponent } from '../data/components.js';
import { navigate, refresh } from '../router.js';
import { openVehicleForm } from './garage.js';

export async function renderVehicle({ id, tab = 'zwilling' }) {
  const vehicle = await Vehicles.get(id);
  if (!vehicle) {
    return el('div', { class: 'view' },
      el('div', { class: 'empty-state' },
        icon('warn', 44, 'empty-icon'),
        el('h2', {}, 'Fahrzeug nicht gefunden'),
        el('a', { class: 'btn btn-primary', href: '#/garage' }, 'Zur Garage'))
    );
  }

  const model = getModel(vehicle.modelId);
  const [logs, tasks] = await Promise.all([Logs.byVehicle(id), Tasks.byVehicle(id)]);
  const totalCost = logs.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
  const wrap = el('div', { class: 'view view-vehicle' });

  // ── Kopf ──
  wrap.append(
    el('div', { class: 'vehicle-hero' + (vehicle.photo ? ' has-photo' : ''), style: vehicle.photo ? `background-image:url('${vehicle.photo}')` : '' },
      el('div', { class: 'vehicle-hero-scrim' }),
      el('div', { class: 'vehicle-hero-bar' },
        el('a', { class: 'icon-btn glass', href: '#/garage', 'aria-label': 'Zurück' }, icon('back', 20)),
        el('div', { class: 'grow' }),
        el('button', { class: 'icon-btn glass', 'aria-label': 'Bearbeiten', onclick: () => openVehicleForm(vehicle, refresh) }, icon('edit', 18)),
        el('button', { class: 'icon-btn glass', 'aria-label': 'Löschen', onclick: async () => {
          const yes = await confirmSheet('Fahrzeug löschen?', `„${vehicle.name || model?.name}" wird mit kompletter Akte und allen Aufgaben gelöscht. Das lässt sich nicht rückgängig machen.`);
          if (yes) { await Vehicles.remove(id); toast('Fahrzeug gelöscht'); navigate('garage'); }
        } }, icon('trash', 18))
      ),
      el('div', { class: 'vehicle-hero-info' },
        !vehicle.photo ? icon('moped', 46, 'hero-moped') : null,
        el('h1', {}, vehicle.name || model?.name || 'Fahrzeug'),
        el('p', {}, [model?.name, vehicle.baujahr && `Bj. ${vehicle.baujahr}`, vehicle.farbe].filter(Boolean).join(' · ') || '—')
      )
    )
  );

  // ── Tabs ──
  const tabs = [
    { id: 'zwilling', name: 'Zwilling' },
    { id: 'uebersicht', name: 'Übersicht' },
    { id: 'logbuch', name: `Logbuch${logs.length ? ` (${logs.length})` : ''}` },
    { id: 'aufgaben', name: `Aufgaben${tasks.filter((t) => !t.done).length ? ` (${tasks.filter((t) => !t.done).length})` : ''}` },
  ];
  wrap.append(
    el('nav', { class: 'seg-tabs', role: 'tablist' },
      tabs.map((t) =>
        el('a', {
          class: 'seg-tab' + (t.id === tab ? ' active' : ''),
          href: `#/fahrzeug/${id}${t.id === 'zwilling' ? '' : '/' + t.id}`,
          role: 'tab', 'aria-selected': String(t.id === tab),
        }, t.name)
      )
    )
  );

  const body = el('div', { class: 'tab-body' });
  if (tab === 'logbuch') body.append(renderLogbuch(vehicle, logs));
  else if (tab === 'aufgaben') body.append(renderAufgaben(vehicle, tasks));
  else if (tab === 'uebersicht') body.append(renderUebersicht(vehicle, model, logs, tasks, totalCost));
  else body.append(renderZwilling(vehicle, model, tasks));
  wrap.append(body);

  return wrap;
}

/* ─────────────────────────── Zwilling (digitaler Zwilling) ─────────────────────────── */

/**
 * Interaktive Prinzipzeichnung: Baugruppen antippen führt in die Bauteil-Akte.
 * Was Aufmerksamkeit braucht (offene, thematisch passende Aufgabe) glüht.
 * Die Zeichnung ist die Navigation – darunter dieselben Baugruppen als
 * klare, bedienbare Liste (Zugänglichkeit + Übersicht).
 */
function renderZwilling(vehicle, model, tasks) {
  const anatomy = getAnatomy(vehicle, model);
  const attention = attentionAssemblies(tasks);
  const wrap = el('div', { class: 'twin' });

  // Kontextzeile
  wrap.append(
    el('p', { class: 'twin-lead' },
      attention.size
        ? el('span', {}, techValue(String(attention.size), { kind: 'torque' }),
            attention.size === 1 ? ' Baugruppe braucht Aufmerksamkeit' : ' Baugruppen brauchen Aufmerksamkeit')
        : 'Alles ruhig. Tippe ein Bauteil, um einzutauchen.')
  );

  // Bühne mit Zeichnung + Hotspots
  const stage = el('div', { class: 'twin-stage' });
  const blueprint = el('div', {
    class: 'twin-blueprint',
    html: `<svg viewBox="${anatomy.viewBox}" fill="none" role="img" aria-label="Schematische Seitenansicht">${anatomy.svg}</svg>`,
  });
  // Baugruppen mit Aufmerksamkeit in der Zeichnung hervorheben
  for (const id of attention) {
    blueprint.querySelectorAll(`[data-part="${id}"]`).forEach((n) => n.classList.add('lit'));
  }
  stage.append(blueprint);

  for (const h of anatomy.hotspots) {
    const lit = attention.has(h.componentId);
    const hot = el('a', {
      class: 'twin-hot' + (lit ? ' lit' : ''),
      href: `#/technik/${h.componentId}`,
      style: `left:${h.x}%;top:${h.y}%`,
      'aria-label': h.label,
    }, el('span', { class: 'twin-hot-dot' }), el('span', { class: 'twin-hot-label' }, h.label));
    stage.append(hot);
  }
  wrap.append(stage);

  if (anatomy.approximate) {
    wrap.append(note('info', 'Für diese Baureihe ist noch keine eigene Zeichnung hinterlegt – gezeigt wird die schematische Moped-Ansicht. Die Baugruppen und Werte stimmen dennoch.', 'Schematische Darstellung'));
  }

  // Baugruppen als klare Liste (dieselben Ziele wie die Hotspots)
  const list = el('div', { class: 'twin-groups' });
  for (const h of anatomy.hotspots) {
    const node = findComponent([h.componentId]).node;
    if (!node) continue;
    const lit = attention.has(h.componentId);
    list.append(
      el('a', { class: 'twin-group' + (lit ? ' lit' : ''), href: `#/technik/${h.componentId}` },
        icon(node.icon || 'nut', 20, 'twin-group-icon'),
        el('div', { class: 'twin-group-main' },
          el('span', { class: 'twin-group-name' }, node.name),
          el('span', { class: 'muted small clamp-1' }, node.summary || '')),
        lit ? el('span', { class: 'twin-group-flag' }, 'fällig') : null,
        icon('chevR', 18, 'muted'))
    );
  }
  wrap.append(
    el('div', { class: 'twin-groups-wrap' },
      el('p', { class: 'twin-groups-lab' }, 'Alle Baugruppen'),
      list)
  );

  return wrap;
}

/* ─────────────────────────── Übersicht ─────────────────────────── */

function renderUebersicht(vehicle, model, logs, tasks, totalCost) {
  const openTasks = tasks.filter((t) => !t.done);
  const info = (label, value) => value
    ? el('div', { class: 'info-row' }, el('span', { class: 'info-label' }, label), el('span', { class: 'info-value' }, value))
    : null;

  return el('div', {},
    // Wichtigste Aktionen zuerst
    el('div', { class: 'quick-grid', style: 'margin-top:0' },
      actionTile('plus', 'Eintrag', () => openLogForm(vehicle.id)),
      actionTile('check', 'Aufgabe', null, `#/fahrzeug/${vehicle.id}/aufgaben`),
      actionTile('box', 'Ersatzteile', null, '#/teile'),
      actionTile('diag', 'Diagnose', null, '#/diagnose')
    ),

    // Überblick
    el('div', { class: 'kpi-row', style: 'margin-top:20px' },
      kpi('book', logs.length, 'Einträge'),
      kpi('euro', fmtEuro(totalCost), 'Investiert'),
      kpi('check', openTasks.length, 'Offen')
    ),

    // Details erst bei Bedarf (progressive Offenlegung)
    el('div', { style: 'margin-top:20px' },
      accordion('Fahrzeugdaten',
        el('div', { class: 'info-list' },
          info('Modell', model?.name),
          info('Baujahr', vehicle.baujahr),
          info('Farbe', vehicle.farbe),
          info('Motor', vehicle.motor || model?.engine),
          info('Vergaser', vehicle.vergaser),
          info('Zündung', vehicle.zuendung),
          info('Auspuff', vehicle.auspuff),
          info('Rahmennummer', vehicle.rahmennummer),
          info('Motornummer', vehicle.motornummer)
        ), { open: true, icon: 'moped', variant: 'personal' }),
      model && model.id !== 'sonstige'
        ? accordion('Modell-Steckbrief',
            el('div', {},
              el('div', { class: 'info-list' },
                info('Bauzeit', model.years),
                info('Motor', model.engine),
                info('Hubraum', model.ccm && `${model.ccm} ccm`),
                info('Leistung', model.ps && `${model.ps} PS`),
                info('V max', model.vmax && `${model.vmax} km/h`),
                info('Gemisch', model.mix),
                info('Tank', model.tank && `${model.tank} l`),
                info('Bordspannung', model.voltage)),
              model.notes ? el('p', { class: 'muted small', style: 'margin:10px 0 0' }, model.notes) : null),
            { icon: 'book', variant: 'technical' })
        : null,
      vehicle.notizen
        ? accordion('Notizen', el('p', { class: 'pre-wrap small', style: 'margin:0' }, vehicle.notizen), { icon: 'note', variant: 'personal' })
        : null
    )
  );
}

function actionTile(iconName, label, onclick, href = null) {
  const attrs = { class: 'quick-tile' };
  if (href) attrs.href = href;
  if (onclick) attrs.onclick = onclick;
  return el(href ? 'a' : 'button', attrs,
    icon(iconName, 22, 'quick-icon'),
    el('strong', {}, label));
}

function kpi(iconName, value, label) {
  return el('div', { class: 'kpi' }, icon(iconName, 18, 'kpi-icon'), el('strong', {}, String(value)), el('span', { class: 'muted small' }, label));
}

/* ─────────────────────────── Logbuch ─────────────────────────── */

function renderLogbuch(vehicle, logs) {
  const wrap = el('div', {});
  wrap.append(
    el('button', { class: 'btn btn-primary btn-block', onclick: () => openLogForm(vehicle.id) }, icon('plus', 18), 'Neuer Eintrag')
  );

  if (!logs.length) {
    wrap.append(emptyState('book', null,
      'Hier ist noch nichts dokumentiert. Trag die nächste Wartung, Reparatur oder den Umbau ein – so wächst mit der Zeit die lückenlose Historie deines Mopeds.', null, true));
    return wrap;
  }

  const list = el('div', { class: 'timeline' });
  for (const log of logs) {
    const type = LOG_TYPES.find((t) => t.id === log.type) || LOG_TYPES[4];
    list.append(
      el('div', { class: 'timeline-item' },
        el('div', { class: `timeline-dot type-${log.type}` }, icon(type.icon, 14)),
        el('div', { class: 'timeline-card card' },
          el('div', { class: 'timeline-head' },
            el('strong', {}, log.title || type.name),
            el('span', { class: 'muted small' }, fmtDate(log.date))
          ),
          el('div', { class: 'timeline-meta' },
            el('span', { class: 'badge' }, type.name),
            log.km ? techValue(`${log.km} km`, { kind: 'plain' }) : null,
            log.cost ? techValue(fmtEuro2(parseFloat(log.cost)), { kind: 'price' }) : null
          ),
          log.parts ? el('p', { class: 'small' }, el('span', { class: 'muted' }, 'Teile: '), log.parts) : null,
          log.notes ? el('p', { class: 'small muted pre-wrap' }, log.notes) : null,
          el('div', { class: 'timeline-actions' },
            el('button', { class: 'mini-btn', onclick: () => openLogForm(vehicle.id, log) }, icon('edit', 14), 'Bearbeiten'),
            el('button', { class: 'mini-btn danger', onclick: async () => {
              if (await confirmSheet('Eintrag löschen?', 'Der Logbuch-Eintrag wird dauerhaft entfernt.')) {
                await Logs.remove(log.id);
                refresh();
              }
            } }, icon('trash', 14), 'Löschen')
          )
        )
      )
    );
  }
  wrap.append(list);
  return wrap;
}

export function openLogForm(vehicleId, log = null, prefill = null) {
  const isEdit = !!log;
  const l = log || prefill || {};

  const typeSelect = el('select', { name: 'type', class: 'field-input' },
    LOG_TYPES.map((t) => el('option', { value: t.id, selected: t.id === (l.type || 'wartung') || null }, t.name))
  );

  const form = el('form', { class: 'form-stack' },
    el('label', { class: 'field' }, el('span', {}, 'Art'), typeSelect),
    el('label', { class: 'field' }, el('span', {}, 'Titel'),
      el('input', { name: 'title', value: l.title || '', required: true, placeholder: 'z. B. Kupplung neu eingestellt' })),
    el('div', { class: 'field-row' },
      el('label', { class: 'field' }, el('span', {}, 'Datum'),
        el('input', { name: 'date', type: 'date', value: l.date || new Date().toISOString().slice(0, 10) })),
      el('label', { class: 'field' }, el('span', {}, 'Kosten (€)'),
        el('input', { name: 'cost', inputmode: 'decimal', value: l.cost ?? '', placeholder: '0' }))
    ),
    el('label', { class: 'field' }, el('span', {}, 'Kilometerstand'),
      el('input', { name: 'km', inputmode: 'numeric', value: l.km || '', placeholder: 'optional' })),
    el('label', { class: 'field' }, el('span', {}, 'Verbaute Teile'),
      el('input', { name: 'parts', value: l.parts || '', placeholder: 'z. B. Lamellensatz, Dichtung' })),
    el('label', { class: 'field' }, el('span', {}, 'Notizen'),
      el('textarea', { name: 'notes', rows: 3, placeholder: 'Was wurde gemacht? Worauf achten?' }, l.notes || '')),
    el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, isEdit ? 'Speichern' : 'Eintrag anlegen')
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.cost = data.cost ? String(data.cost).replace(',', '.') : null;
    try {
      if (isEdit) await Logs.update(log.id, data);
      else await Logs.create(vehicleId, data);
      toast(isEdit ? 'Eintrag gespeichert' : 'Eintrag angelegt');
      closeSheet();
      if (location.hash === `#/fahrzeug/${vehicleId}/logbuch`) refresh();
      else location.hash = `#/fahrzeug/${vehicleId}/logbuch`;
    } catch {
      toast('Speichern fehlgeschlagen.', 'err');
    }
  });

  openSheet(isEdit ? 'Eintrag bearbeiten' : 'Neuer Logbuch-Eintrag', form);
}

/* ─────────────────────────── Aufgaben ─────────────────────────── */

function renderAufgaben(vehicle, tasks) {
  const wrap = el('div', {});

  const input = el('input', { class: 'task-input', placeholder: 'Neue Aufgabe, z. B. „Kette spannen"', enterkeyhint: 'done' });
  const add = async () => {
    const title = input.value.trim();
    if (!title) return;
    await Tasks.create(vehicle.id, title);
    input.value = '';
    refresh();
  };
  input.addEventListener('keydown', (e) => e.key === 'Enter' && (e.preventDefault(), add()));

  wrap.append(
    el('div', { class: 'task-add' },
      input,
      el('button', { class: 'btn btn-primary btn-compact', onclick: add, 'aria-label': 'Aufgabe hinzufügen' }, icon('plus', 18))
    )
  );

  if (!tasks.length) {
    wrap.append(emptyState('check', null,
      'Nichts offen. Schreib dir hier auf, was als Nächstes ansteht – der Umbauplaner kann ganze Teilelisten direkt hierher übernehmen.', null, true));
    return wrap;
  }

  const list = el('div', { class: 'stack' });
  for (const t of tasks) {
    list.append(
      el('div', { class: 'row-item task' + (t.done ? ' done' : '') },
        el('button', {
          class: 'task-check' + (t.done ? ' checked' : ''),
          'aria-label': t.done ? 'Als offen markieren' : 'Als erledigt markieren',
          onclick: async (e) => {
            const cb = e.currentTarget;
            const willCheck = !t.done;
            if (willCheck) { cb.classList.add('checked', 'pop'); cb.replaceChildren(icon('check', 15)); }
            await Tasks.toggle(t.id);
            setTimeout(refresh, willCheck ? 240 : 0);
          },
        }, t.done ? icon('check', 15) : ''),
        el('div', { class: 'row-main' }, el('span', {}, t.title)),
        el('button', { class: 'icon-btn subtle', 'aria-label': 'Löschen', onclick: async () => { await Tasks.remove(t.id); refresh(); } }, icon('x', 16))
      )
    );
  }
  wrap.append(list);
  return wrap;
}
