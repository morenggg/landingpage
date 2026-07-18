/**
 * MopedPlaner – Technik-Explorer
 * Interaktiver Drilldown durch den Bauteil-Baum:
 * Motor → Kupplung → Kupplungskorb → … mit Details je Ebene.
 */

import { el, icon } from '../ui.js';
import { COMPONENT_TREE, findComponent } from '../data/components.js';

export function renderTechnik({ path = [] }) {
  const wrap = el('div', { class: 'view' });
  const { node, crumbs } = findComponent(path);

  // Breadcrumbs
  const crumbBar = el('nav', { class: 'crumbs', 'aria-label': 'Pfad' });
  crumbBar.append(el('a', { href: '#/technik', class: crumbs.length ? '' : 'current' }, 'Technik'));
  crumbs.forEach((c, i) => {
    crumbBar.append(icon('chevR', 13, 'crumb-sep'));
    const href = '#/technik/' + crumbs.slice(0, i + 1).map((x) => x.id).join('/');
    crumbBar.append(el('a', { href, class: i === crumbs.length - 1 ? 'current' : '' }, c.name));
  });

  if (!path.length || !node) {
    // Wurzelebene: alle Baugruppen
    wrap.append(
      el('header', { class: 'page-head' },
        el('div', {},
          el('h1', {}, 'Technik'),
          el('p', { class: 'muted' }, 'Tippe dich durch die Baugruppen – bis zum einzelnen Bauteil.'))
      )
    );
    const grid = el('div', { class: 'tile-grid' });
    for (const c of COMPONENT_TREE) {
      grid.append(
        el('a', { class: 'tile', href: `#/technik/${c.id}` },
          icon(c.icon || 'wrench', 26, 'tile-icon'),
          el('strong', {}, c.name),
          el('span', { class: 'muted small clamp-2' }, c.summary)
        )
      );
    }
    wrap.append(grid, disclaimer());
    return wrap;
  }

  // Detailebene
  wrap.append(crumbBar);
  wrap.append(
    el('header', { class: 'comp-head' },
      icon(node.icon || crumbs[0]?.icon || 'wrench', 30, 'comp-icon'),
      el('div', {},
        el('h1', {}, node.name),
        node.models ? el('p', { class: 'muted small' }, Array.isArray(node.models) ? node.models.join(' · ') : node.models) : null
      )
    ),
    el('p', { class: 'lead' }, node.summary || '')
  );

  // Unterbauteile
  if (node.children?.length) {
    const sec = section('Bauteile');
    const list = el('div', { class: 'stack' });
    for (const child of node.children) {
      list.append(
        el('a', { class: 'row-item', href: `#/technik/${[...path, child.id].join('/')}` },
          icon(child.icon || 'nut', 18, 'row-lead'),
          el('div', { class: 'row-main' },
            el('span', {}, child.name),
            el('span', { class: 'muted small clamp-1' }, child.summary || '')
          ),
          icon('chevR', 18, 'muted')
        )
      );
    }
    sec.append(list);
    wrap.append(sec);
  }

  // Typische Defekte
  if (node.defects?.length) {
    const sec = section('Typische Defekte');
    for (const d of node.defects) {
      sec.append(
        el('div', { class: 'card defect' },
          el('div', { class: 'defect-head' }, icon('warn', 16, 'warn-icon'), el('strong', {}, d.name)),
          el('p', { class: 'small muted' }, d.symptom)
        )
      );
    }
    wrap.append(sec);
  }

  // Ausbau / Einbau
  if (node.removal?.length) wrap.append(stepsSection('Ausbau', node.removal));
  if (node.install?.length) wrap.append(stepsSection('Einbau & Einstellung', node.install));

  // Werkzeug
  if (node.tools?.length) {
    const sec = section('Werkzeug');
    sec.append(el('div', { class: 'chip-wrap' }, node.tools.map((t) => el('span', { class: 'chip static' }, icon('wrench', 14), t))));
    wrap.append(sec);
  }

  // Schrauben & Drehmomente
  if (node.fasteners?.length) {
    const sec = section('Schrauben & Drehmomente');
    const table = el('div', { class: 'card table-card' });
    for (const f of node.fasteners) {
      table.append(
        el('div', { class: 'fastener-row' },
          el('div', { class: 'row-main' },
            el('span', {}, f.name),
            el('span', { class: 'muted small' }, [f.size, f.note].filter(Boolean).join(' · '))
          ),
          el('strong', { class: 'torque' }, f.torque)
        )
      );
    }
    sec.append(table);
    wrap.append(sec);
  }

  // Ersatzteile
  if (node.parts?.length) {
    const sec = section('Typische Ersatzteile');
    const table = el('div', { class: 'card table-card' });
    for (const p of node.parts) {
      table.append(
        el('div', { class: 'fastener-row' },
          el('div', { class: 'row-main' }, el('span', {}, p.name)),
          el('span', { class: 'muted price' }, p.price)
        )
      );
    }
    sec.append(table);
    wrap.append(sec);
  }

  wrap.append(disclaimer());
  return wrap;
}

function section(title) {
  return el('section', { class: 'section' }, el('h2', { class: 'sub-head' }, title));
}

function stepsSection(title, steps) {
  const sec = section(title);
  const list = el('ol', { class: 'steps' });
  for (const s of steps) list.append(el('li', {}, s));
  sec.append(list);
  return sec;
}

function disclaimer() {
  return el('p', { class: 'disclaimer' },
    icon('info', 14),
    ' Alle Werte sind Richtwerte aus gängiger Werkstattliteratur – im Zweifel gilt das Original-Reparaturhandbuch deines Modells.');
}
