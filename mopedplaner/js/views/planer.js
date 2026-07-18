/**
 * MopedPlaner – Umbauplaner
 * Kit wählen → komplette Teileliste, Werkzeug, Reihenfolge, Kosten & Recht.
 * Teileliste kann als Aufgaben in ein Fahrzeug übernommen werden.
 */

import { el, icon, difficultyDots, openSheet, closeSheet, toast, fmtEuro } from '../ui.js';
import { CONVERSION_KITS, getKit } from '../data/conversions.js';
import { Vehicles, Tasks } from '../store.js';
import { getModel } from '../data/models.js';
import { navigate } from '../router.js';

export function renderPlanerList() {
  const wrap = el('div', { class: 'view' });
  wrap.append(
    el('header', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Umbauplaner'),
        el('p', { class: 'muted' }, 'Wähle dein Projekt – du bekommst Teileliste, Werkzeug, Reihenfolge und Kosten.'))
    )
  );

  const list = el('div', { class: 'stack' });
  for (const kit of CONVERSION_KITS) {
    list.append(
      el('a', { class: 'kit-card card', href: `#/planer/${kit.id}` },
        el('div', { class: 'kit-head' },
          icon(kit.icon, 24, 'row-lead accent-lead'),
          el('div', { class: 'row-main' },
            el('span', { class: 'row-title' }, kit.title),
            el('span', { class: 'muted small' }, kit.tagline))
        ),
        el('div', { class: 'kit-meta' },
          el('span', { class: 'badge' }, icon('clock', 13), ' ', kit.duration),
          el('span', { class: 'badge accent' }, `${fmtEuro(kit.costFrom)}–${fmtEuro(kit.costTo)}`),
          difficultyDots(kit.difficulty)
        )
      )
    );
  }
  wrap.append(list);
  return wrap;
}

export function renderPlanerKit({ kitId }) {
  const kit = getKit(kitId);
  const wrap = el('div', { class: 'view' });
  if (!kit) {
    wrap.append(el('div', { class: 'empty-state' }, el('h2', {}, 'Umbau nicht gefunden'), el('a', { class: 'btn btn-primary', href: '#/planer' }, 'Zur Übersicht')));
    return wrap;
  }

  wrap.append(
    el('nav', { class: 'crumbs' },
      el('a', { href: '#/planer' }, 'Umbauplaner'),
      icon('chevR', 13, 'crumb-sep'),
      el('a', { class: 'current' }, kit.title)),
    el('header', { class: 'comp-head' },
      icon(kit.icon, 30, 'comp-icon'),
      el('div', {},
        el('h1', {}, kit.title),
        el('p', { class: 'muted small' }, kit.tagline))
    ),
    el('div', { class: 'kpi-row' },
      el('div', { class: 'kpi' }, icon('clock', 18, 'kpi-icon'), el('strong', {}, kit.duration), el('span', { class: 'muted small' }, 'Dauer')),
      el('div', { class: 'kpi' }, icon('euro', 18, 'kpi-icon'), el('strong', {}, `${fmtEuro(kit.costFrom)}–${fmtEuro(kit.costTo)}`), el('span', { class: 'muted small' }, 'Kosten ca.')),
      el('div', { class: 'kpi' }, icon('gauge', 18, 'kpi-icon'), difficultyDots(kit.difficulty), el('span', { class: 'muted small' }, 'Schwierigkeit'))
    )
  );

  if (kit.legal) {
    wrap.append(
      el('div', { class: 'card legal' + (kit.legal.startsWith('⚠') ? ' warn' : '') },
        icon(kit.legal.startsWith('⚠') ? 'warn' : 'shield', 18, 'legal-icon'),
        el('p', { class: 'small' }, kit.legal.replace(/^⚠️\s*/, ''))
      )
    );
  }

  // Teileliste
  const partsSec = el('section', { class: 'section' }, el('h2', { class: 'sub-head' }, 'Teileliste'));
  const partsCard = el('div', { class: 'card table-card' });
  for (const p of kit.parts) {
    partsCard.append(
      el('div', { class: 'fastener-row' },
        el('div', { class: 'row-main' }, el('span', {}, p.name), p.note ? el('span', { class: 'muted small' }, p.note) : null),
        el('span', { class: 'muted price' }, p.price)
      )
    );
  }
  partsSec.append(partsCard);
  wrap.append(partsSec);

  // Werkzeug
  const toolSec = el('section', { class: 'section' }, el('h2', { class: 'sub-head' }, 'Werkzeug'));
  toolSec.append(el('div', { class: 'chip-wrap' }, kit.tools.map((t) => el('span', { class: 'chip static' }, icon('wrench', 14), t))));
  wrap.append(toolSec);

  // Arbeitsschritte
  const stepSec = el('section', { class: 'section' }, el('h2', { class: 'sub-head' }, 'Reihenfolge'));
  const stepList = el('div', { class: 'stack' });
  kit.steps.forEach((s, i) => {
    stepList.append(
      el('div', { class: 'card step-card' },
        el('div', { class: 'step-num' }, String(i + 1)),
        el('div', { class: 'row-main' },
          el('strong', {}, s.title),
          el('span', { class: 'small muted' }, s.desc),
          s.duration && s.duration !== '—' ? el('span', { class: 'badge', style: 'margin-top:8px' }, icon('clock', 12), ' ', s.duration) : null
        )
      )
    );
  });
  stepSec.append(stepList);
  wrap.append(stepSec);

  // Hinweise
  if (kit.hints?.length) {
    const hintSec = el('section', { class: 'section' }, el('h2', { class: 'sub-head' }, 'Profi-Hinweise'));
    for (const h of kit.hints) {
      hintSec.append(el('div', { class: 'card hint-card' }, icon('info', 16, 'hint-icon'), el('p', { class: 'small' }, h)));
    }
    wrap.append(hintSec);
  }

  // In Fahrzeug übernehmen
  wrap.append(
    el('button', { class: 'btn btn-primary btn-block', style: 'margin-top:8px', onclick: () => pickVehicle(kit) },
      icon('upgrade', 18), 'Als Projekt in ein Fahrzeug übernehmen')
  );

  return wrap;
}

/** Fahrzeug wählen → Umbau-Schritte + Teile als Aufgaben anlegen. */
async function pickVehicle(kit) {
  const vehicles = await Vehicles.all();
  if (!vehicles.length) {
    toast('Lege zuerst ein Fahrzeug in der Garage an.', 'err');
    navigate('garage');
    return;
  }
  const list = el('div', { class: 'stack' });
  for (const v of vehicles) {
    const model = getModel(v.modelId);
    list.append(
      el('button', {
        class: 'row-item as-btn',
        onclick: async () => {
          for (const s of kit.steps) await Tasks.create(v.id, `${kit.title}: ${s.title}`);
          for (const p of kit.parts) await Tasks.create(v.id, `Besorgen: ${p.name} (${p.price})`);
          closeSheet();
          toast('Projekt übernommen – Aufgaben angelegt 🎉');
          navigate(`fahrzeug/${v.id}/aufgaben`);
        },
      },
        icon('moped', 20, 'row-lead'),
        el('div', { class: 'row-main' },
          el('span', {}, v.name || model?.name || 'Fahrzeug'),
          el('span', { class: 'muted small' }, model?.name || '')),
        icon('chevR', 18, 'muted'))
    );
  }
  openSheet('Fahrzeug wählen', el('div', {},
    el('p', { class: 'muted small', style: 'margin-top:0' }, 'Alle Arbeitsschritte und die Einkaufsliste werden als Aufgaben angelegt.'),
    list));
}
