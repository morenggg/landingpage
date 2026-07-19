/**
 * MopedPlaner – Technik-Explorer
 * Interaktiver Drilldown durch den Bauteil-Baum.
 * Detailseiten: Wichtiges sofort sichtbar (Funktion, Defekte, Reparaturen,
 * Ersatzteile) – technische Tiefe (Schritte, Drehmomente, Werkzeug)
 * per Akkordeon (progressive Offenlegung).
 */

import { el, icon, accordion, sectionEl } from '../ui.js';
import { COMPONENT_TREE, findComponent } from '../data/components.js';
import {
  partsForComponent, maintenanceForComponent, repairsForComponent,
  bearingsForComponent,
} from '../knowledge.js';

export function renderTechnik({ path = [] }) {
  const wrap = el('div', { class: 'view' });
  const { node, crumbs } = findComponent(path);

  // Breadcrumbs als technisches Aktenzeichen (Register-Nummern je Ebene)
  const crumbBar = el('nav', { class: 'crumbs aktenzeichen', 'aria-label': 'Pfad' });
  crumbBar.append(el('a', { href: '#/technik', class: crumbs.length ? '' : 'current' }, 'Technik'));
  let level = COMPONENT_TREE;
  crumbs.forEach((c, i) => {
    const idx = level.findIndex((n) => n.id === c.id);
    crumbBar.append(icon('chevR', 12, 'crumb-sep'));
    const href = '#/technik/' + crumbs.slice(0, i + 1).map((x) => x.id).join('/');
    crumbBar.append(el('a', { href, class: i === crumbs.length - 1 ? 'current' : '' },
      el('span', { class: 'crumb-idx' }, String(idx + 1).padStart(2, '0')), c.name));
    level = c.children || [];
  });

  if (!path.length || !node) {
    // ── Wurzelebene ──
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

    const kb = sectionEl('Wissensdatenbank');
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

  // ── Detailebene ──
  const currentPath = path.join('/');
  wrap.append(crumbBar);
  wrap.append(
    el('header', { class: 'comp-head' },
      icon(node.icon || crumbs[0]?.icon || 'wrench', 26, 'comp-icon'),
      el('div', {},
        el('h1', {}, node.name),
        node.models ? el('p', { class: 'muted small' }, Array.isArray(node.models) ? node.models.join(' · ') : node.models) : null
      )
    ),
    el('p', { class: 'lead' }, node.summary || '')
  );

  // 1. Unterbauteile – Kern der Navigation, immer sichtbar
  if (node.children?.length) {
    const sec = sectionEl('Bauteile');
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

  // 2. Typische Defekte – wichtig, sichtbar, aber ruhig als Liste
  if (node.defects?.length) {
    const sec = sectionEl('Typische Defekte');
    const card = el('div', { class: 'card', style: 'padding:4px 16px' });
    for (const d of node.defects) {
      card.append(
        el('div', { class: 'info-row', style: 'display:block' },
          el('div', { style: 'display:flex;align-items:center;gap:8px' },
            icon('warn', 15, 'warn-icon'), el('strong', { class: 'small' }, d.name)),
          el('p', { class: 'small muted', style: 'margin:4px 0 0 23px' }, d.symptom))
      );
    }
    sec.append(card);
    wrap.append(sec);
  }

  // 3. Aktionen: Reparaturen & Wartungen (verknüpft, klickbar)
  const repairs = repairsForComponent(currentPath);
  const maintenance = maintenanceForComponent(currentPath);
  if (repairs.length || maintenance.length) {
    const sec = sectionEl('Reparieren & Warten');
    const list = el('div', { class: 'stack' });
    for (const r of repairs) {
      list.append(el('a', { class: 'row-item', href: `#/reparatur/${r.id}` },
        icon('tools', 18, 'row-lead accent-lead'),
        el('div', { class: 'row-main' }, el('span', {}, r.name), el('span', { class: 'muted small' }, r.duration)),
        icon('chevR', 16, 'muted')));
    }
    for (const m of maintenance) {
      list.append(el('a', { class: 'row-item', href: `#/wartung/${m.id}` },
        icon('calendar', 18, 'row-lead'),
        el('div', { class: 'row-main' }, el('span', {}, m.name), el('span', { class: 'muted small' }, m.interval)),
        icon('chevR', 16, 'muted')));
    }
    sec.append(list);
    wrap.append(sec);
  }

  // 4. Passende Ersatzteile (Katalog) – sichtbar
  const linkedParts = partsForComponent(currentPath);
  if (linkedParts.length) {
    const sec = sectionEl('Passende Ersatzteile');
    const list = el('div', { class: 'stack' });
    for (const part of linkedParts) {
      const price = part.estimatedPriceRange;
      list.append(
        el('a', { class: 'row-item', href: `#/teile/${part.id}` },
          icon('box', 18, 'row-lead accent-lead'),
          el('div', { class: 'row-main' },
            el('span', {}, part.shortName || part.name),
            el('span', { class: 'muted small' }, part.category)),
          price?.min != null ? el('span', { class: 'part-price small' }, `${price.min}–${price.max} €`) : null,
          icon('chevR', 16, 'muted')));
    }
    sec.append(list);
    wrap.append(sec);
  }

  // 5. Technische Tiefe – eingeklappt
  const details = el('div', { class: 'section' });
  let hasDetails = false;

  if (node.removal?.length) {
    details.append(accordion('Ausbau', stepsList(node.removal), { icon: 'wrench', meta: `${node.removal.length} Schritte` }));
    hasDetails = true;
  }
  if (node.install?.length) {
    details.append(accordion('Einbau & Einstellung', stepsList(node.install), { icon: 'check', meta: `${node.install.length} Schritte` }));
    hasDetails = true;
  }
  if (node.fasteners?.length) {
    details.append(accordion('Schrauben & Drehmomente',
      el('div', {}, node.fasteners.map((f) =>
        el('div', { class: 'fastener-row' },
          el('div', { class: 'row-main' },
            el('span', { class: 'small' }, f.name),
            el('span', { class: 'muted small' }, [f.size, f.note].filter(Boolean).join(' · '))),
          el('strong', { class: 'torque' }, f.torque)))),
      { icon: 'nut', meta: String(node.fasteners.length) }));
    hasDetails = true;
  }
  if (node.tools?.length) {
    details.append(accordion('Werkzeug',
      el('div', { class: 'chip-wrap' }, node.tools.map((t) => el('span', { class: 'chip static' }, icon('wrench', 14), t))),
      { icon: 'wrench', meta: String(node.tools.length) }));
    hasDetails = true;
  }
  const bearings = bearingsForComponent(currentPath);
  if (bearings.length) {
    details.append(accordion('Lager & Dichtungen',
      el('div', {}, bearings.map((b) =>
        el('div', { class: 'info-row', style: 'display:block' },
          el('strong', { class: 'small' }, b.name),
          el('p', { class: 'small muted', style: 'margin:2px 0 0' }, [b.size, b.location].filter(Boolean).join(' · ') || b.notes || '')))),
      { icon: 'clutch', meta: String(bearings.length) }));
    hasDetails = true;
  }
  // Alt-Ersatzteilliste aus dem Baum nur zeigen, wenn keine Katalog-Teile verknüpft sind
  if (!linkedParts.length && node.parts?.length) {
    details.append(accordion('Typische Ersatzteile',
      el('div', {}, node.parts.map((p) =>
        el('div', { class: 'fastener-row' },
          el('div', { class: 'row-main' }, el('span', { class: 'small' }, p.name)),
          el('span', { class: 'muted price' }, p.price)))),
      { icon: 'box', meta: String(node.parts.length) }));
    hasDetails = true;
  }
  if (hasDetails) wrap.append(details);

  wrap.append(disclaimer());
  return wrap;
}

function stepsList(steps) {
  const list = el('ol', { class: 'steps' });
  for (const s of steps) list.append(el('li', {}, s));
  return list;
}

function kbRow(iconName, title, sub, href) {
  return el('a', { class: 'row-item', href },
    icon(iconName, 18, 'row-lead accent-lead'),
    el('div', { class: 'row-main' },
      el('span', {}, title),
      el('span', { class: 'muted small' }, sub)),
    icon('chevR', 18, 'muted'));
}

function disclaimer() {
  return el('p', { class: 'disclaimer' },
    icon('info', 14),
    ' Alle Werte sind Richtwerte aus gängiger Werkstattliteratur – im Zweifel gilt das Original-Reparaturhandbuch deines Modells.');
}
