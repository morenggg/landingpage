/**
 * MopedPlaner – Technik-Explorer
 * Interaktiver Drilldown durch den Bauteil-Baum:
 * Motor → Kupplung → Kupplungskorb → … mit Details je Ebene.
 */

import { el, icon, verificationBadge } from '../ui.js';
import { COMPONENT_TREE, findComponent } from '../data/components.js';
import {
  partsForComponent, maintenanceForComponent, repairsForComponent,
  bearingsForComponent, fastenersForComponent,
} from '../knowledge.js';

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
    wrap.append(grid);

    // Wissensdatenbank-Einstiege
    const kb = section('Wissensdatenbank');
    kb.append(
      el('div', { class: 'stack' },
        kbRow('search', 'Technische Suche', 'Alles durchsuchen – Teile, Schrauben, Reparaturen …', '#/suche'),
        kbRow('box', 'Ersatzteile', 'Katalog mit Kompatibilität & Verknüpfungen', '#/teile'),
        kbRow('engine', 'Motoren', 'Alle Motorfamilien von Rh 50 bis M741', '#/motoren'),
        kbRow('calendar', 'Wartungsplan', 'Intervalle, Werkzeug, Schritte', '#/wartung'),
        kbRow('tools', 'Reparaturen', 'Geführte Reparaturen mit Sollwerten', '#/reparaturen'),
        kbRow('nut', 'Schraubenfinder', 'Drehmomente & Gewinde', '#/schrauben')
      )
    );
    wrap.append(kb, disclaimer());
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

  // Passende Ersatzteile aus dem Katalog (verknüpft, klickbar)
  const currentPath = path.join('/');
  const linkedParts = partsForComponent(currentPath);
  if (linkedParts.length) {
    const sec = section('Passende Ersatzteile');
    const list = el('div', { class: 'stack' });
    for (const part of linkedParts) {
      const price = part.estimatedPriceRange;
      list.append(
        el('a', { class: 'row-item', href: `#/teile/${part.id}` },
          icon('box', 18, 'row-lead accent-lead'),
          el('div', { class: 'row-main' },
            el('span', {}, part.name),
            el('span', { class: 'chip-wrap tight' }, verificationBadge(part.verificationStatus))),
          el('div', { style: 'display:grid;justify-items:end;gap:4px' },
            price?.min != null ? el('span', { class: 'part-price small' }, `${price.min}–${price.max} €`) : null,
            icon('chevR', 16, 'muted'))));
    }
    sec.append(list);
    wrap.append(sec);
  } else if (node.parts?.length) {
    // Fallback: unverknüpfte Alt-Liste aus dem Bauteil-Baum
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

  // Verknüpfte Wartungen, Reparaturen, Lager & Dichtungen
  linkedRows(wrap, 'Zugehörige Wartungen', 'calendar', maintenanceForComponent(currentPath)
    .map((m) => ({ label: m.name, sub: m.interval, href: `#/wartung/${m.id}` })));
  linkedRows(wrap, 'Zugehörige Reparaturen', 'tools', repairsForComponent(currentPath)
    .map((r) => ({ label: r.name, sub: r.duration, href: `#/reparatur/${r.id}` })));
  linkedRows(wrap, 'Lager & Dichtungen', 'clutch', bearingsForComponent(currentPath)
    .map((b) => ({ label: b.name, sub: b.size || b.location || '', href: null, status: b.verificationStatus })));

  wrap.append(disclaimer());
  return wrap;
}

function linkedRows(wrap, title, iconName, items) {
  if (!items.length) return;
  const sec = section(title);
  const list = el('div', { class: 'stack' });
  for (const it of items) {
    const inner = [
      icon(iconName, 18, 'row-lead'),
      el('div', { class: 'row-main' },
        el('span', {}, it.label),
        it.sub ? el('span', { class: 'muted small' }, it.sub) : null),
      it.status ? verificationBadge(it.status) : null,
      it.href ? icon('chevR', 16, 'muted') : null,
    ];
    list.append(it.href ? el('a', { class: 'row-item', href: it.href }, ...inner) : el('div', { class: 'row-item' }, ...inner));
  }
  sec.append(list);
  wrap.append(sec);
}

function kbRow(iconName, title, sub, href) {
  return el('a', { class: 'row-item', href },
    icon(iconName, 18, 'row-lead accent-lead'),
    el('div', { class: 'row-main' },
      el('span', {}, title),
      el('span', { class: 'muted small' }, sub)),
    icon('chevR', 18, 'muted'));
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
