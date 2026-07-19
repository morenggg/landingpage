/**
 * MopedPlaner – Wissensdatenbank-Views
 * Motoren, Wartungen und Reparaturen: jeweils Liste + verknüpfte
 * Detailansicht. Kompakt in einer Datei, gemeinsame Render-Helfer.
 */

import { el, icon, verificationText, verificationNote, difficultyDots, techValue } from '../ui.js';
import { ENGINES } from '../data/engines.js';
import { MAINTENANCE } from '../data/maintenance.js';
import { REPAIRS } from '../data/repairs.js';
import { UNVERIFIED_HINT, getSource } from '../data/sources.js';
import {
  getEngine, getMaintenance, getRepair, getModel, getTool, getPart,
  getFastener, componentByPath,
} from '../knowledge.js';

/* ─────────────────────────── Motoren ─────────────────────────── */

export function renderMotorenList() {
  const wrap = el('div', { class: 'view' });
  wrap.append(head('Motoren', 'Alle Simson-Motorfamilien mit Stammdaten, Drehmomenten und Verknüpfungen.'));
  const list = el('div', { class: 'stack' });
  for (const e of ENGINES) {
    list.append(
      el('a', { class: 'row-item tall', href: `#/motor/${e.id}` },
        icon('engine', 22, 'row-lead accent-lead'),
        el('div', { class: 'row-main' },
          el('span', { class: 'row-title' }, e.name),
          el('span', { class: 'muted small' }, [e.family, e.ccm && `${e.ccm} ccm`, e.gears && `${e.gears} Gänge`.replace('(Handschaltung) Gänge', 'Gänge (Hand)')].filter(Boolean).join(' · ') || 'Daten folgen'),
          verificationText(e.verificationStatus)),
        icon('chevR', 18, 'muted'))
    );
  }
  wrap.append(list, disclaimer());
  return wrap;
}

export function renderMotorDetail({ id }) {
  const engine = getEngine(id);
  const wrap = el('div', { class: 'view' });
  if (!engine) return notFound(wrap, 'Motor nicht gefunden', '#/motoren');

  wrap.append(
    crumbs([['#/motoren', 'Motoren'], [null, engine.name]]),
    el('header', { class: 'comp-head' },
      icon('engine', 30, 'comp-icon'),
      el('div', {},
        el('h1', {}, engine.name),
        el('p', { class: 'muted small' }, engine.family))),
  );
  if (engine.notes) wrap.append(el('p', { class: 'lead' }, engine.notes));
  const vNote = verificationNote(engine.verificationStatus);
  if (vNote) wrap.append(vNote);

  const val = (v) => (v == null || v === '' ? 'Noch nicht erfasst' : String(v));
  wrap.append(section('Technische Daten',
    el('div', { class: 'card spec-grid' },
      spec('Bauzeit', val(engine.years)),
      spec('Hubraum', engine.ccm ? `${engine.ccm} ccm` : 'Noch nicht erfasst'),
      spec('Gänge', val(engine.gears)),
      spec('Kühlung', val(engine.cooling)),
      spec('Gemisch', val(engine.mix)),
      spec('Getriebeöl', engine.gearboxOil?.type ? [engine.gearboxOil.type, engine.gearboxOil.amount].filter(Boolean).join(', ') : 'Noch nicht erfasst'),
      spec('Zündung', engine.ignitionTypes.length ? engine.ignitionTypes.join(' / ') : 'Noch nicht erfasst'),
      spec('Vergaser', val(engine.carb)),
      spec('Kupplung', val(engine.clutch)),
      spec('Primärtrieb', val(engine.primaryDrive))
    )));

  if (engine.torques.length) {
    wrap.append(section('Wichtige Drehmomente',
      el('div', { class: 'card-technical table-card' },
        engine.torques.map((t) =>
          el('div', { class: 'fastener-row' },
            el('div', { class: 'row-main' }, el('span', {}, t.name)),
            techValue(t.value, { kind: 'torque' }))))));
  }

  linkChips(wrap, 'Verbaut in', engine.modelIds.map((mid) => {
    const m = getModel(mid);
    return m && { icon: 'moped', label: m.name };
  }));
  linkChips(wrap, 'Baugruppen im Technik-Explorer', engine.componentPaths.map((path) => {
    const c = componentByPath(path);
    return c && { icon: 'gearbox', label: c.node.name, href: `#/technik/${c.path}` };
  }));

  if (engine.typicalDefects.length) {
    wrap.append(section('Typische Defekte',
      el('div', { class: 'card' }, engine.typicalDefects.map((d) => el('p', { class: 'small', style: 'margin:4px 0' }, '• ' + d)))));
  }
  if (engine.maintenanceNotes) {
    wrap.append(section('Hinweise', el('div', { class: 'card' }, el('p', { class: 'small', style: 'margin:0' }, engine.maintenanceNotes))));
  }
  sourcesNote(wrap, engine.sourceIds);
  return wrap;
}

/* ─────────────────────────── Wartung ─────────────────────────── */

export function renderWartungList() {
  const wrap = el('div', { class: 'view' });
  wrap.append(head('Wartungsplan', 'Die wichtigsten wiederkehrenden Arbeiten – mit Intervall, Werkzeug und Schritten.'));
  const list = el('div', { class: 'stack' });
  for (const m of MAINTENANCE) {
    list.append(
      el('a', { class: 'row-item tall', href: `#/wartung/${m.id}` },
        icon('calendar', 22, 'row-lead accent-lead'),
        el('div', { class: 'row-main' },
          el('span', { class: 'row-title' }, m.name),
          el('span', { class: 'muted small' }, `${m.interval} · ${m.duration}`)),
        icon('chevR', 18, 'muted'))
    );
  }
  wrap.append(list, disclaimer());
  return wrap;
}

export function renderWartungDetail({ id }) {
  const m = getMaintenance(id);
  const wrap = el('div', { class: 'view' });
  if (!m) return notFound(wrap, 'Wartung nicht gefunden', '#/wartung');

  wrap.append(
    crumbs([['#/wartung', 'Wartungsplan'], [null, m.name]]),
    el('header', { class: 'comp-head' },
      icon('calendar', 30, 'comp-icon'),
      el('div', {}, el('h1', {}, m.name), el('p', { class: 'muted small' }, m.interval))),
    el('div', { class: 'kpi-row', style: 'margin-top:14px' },
      kpi('clock', m.duration, 'Dauer'),
      kpiNode('gauge', difficultyDots(m.difficulty), 'Schwierigkeit'),
      kpi('calendar', m.interval.split(' ')[0] === 'alle' ? m.interval.replace('alle ', '') : m.interval, 'Intervall'))
  );

  stepsSection(wrap, 'Schritte', m.steps);
  toolChips(wrap, m.toolIds);
  if (m.materials?.length) {
    wrap.append(section('Material', el('div', { class: 'card' }, m.materials.map((x) => el('p', { class: 'small', style: 'margin:4px 0' }, '• ' + x)))));
  }
  fastenerTable(wrap, m.fastenerIds);
  partChips(wrap, m.partIds);
  componentChips(wrap, m.componentPaths);
  warningsBlock(wrap, m.warnings);
  sourcesNote(wrap, m.sourceIds, m.verificationStatus);
  return wrap;
}

/* ─────────────────────────── Reparaturen ─────────────────────────── */

export function renderReparaturList() {
  const wrap = el('div', { class: 'view' });
  wrap.append(head('Reparaturen', 'Geführte Reparaturen – verknüpft mit Diagnose, Teilen, Werkzeug und Drehmomenten.'));
  const list = el('div', { class: 'stack' });
  for (const r of REPAIRS) {
    list.append(
      el('a', { class: 'row-item tall', href: `#/reparatur/${r.id}` },
        icon('tools', 22, 'row-lead accent-lead'),
        el('div', { class: 'row-main' },
          el('span', { class: 'row-title' }, r.name),
          el('span', { class: 'muted small' }, r.duration),
          el('span', { class: 'chip-wrap tight' }, difficultyDots(r.difficulty))),
        icon('chevR', 18, 'muted'))
    );
  }
  wrap.append(list, disclaimer());
  return wrap;
}

export function renderReparaturDetail({ id }) {
  const r = getRepair(id);
  const wrap = el('div', { class: 'view' });
  if (!r) return notFound(wrap, 'Reparatur nicht gefunden', '#/reparaturen');

  wrap.append(
    crumbs([['#/reparaturen', 'Reparaturen'], [null, r.name]]),
    el('header', { class: 'comp-head' },
      icon('tools', 30, 'comp-icon'),
      el('div', {}, el('h1', {}, r.name), el('p', { class: 'muted small' }, r.duration))),
    el('div', { class: 'kpi-row', style: 'margin-top:14px' },
      kpi('clock', r.duration, 'Dauer'),
      kpiNode('gauge', difficultyDots(r.difficulty), 'Schwierigkeit'),
      kpi('engine', (r.engineIds || []).length ? (r.engineIds || []).map((e) => getEngine(e)?.name || e).join(', ') : 'alle', 'Motoren'))
  );

  if (r.values?.length) {
    wrap.append(section('Einstell- & Sollwerte',
      el('div', { class: 'card-technical table-card' },
        r.values.map((v) =>
          el('div', { class: 'fastener-row' },
            el('div', { class: 'row-main' }, el('span', {}, v.name)),
            techValue(v.value, { kind: 'torque' }))))));
  }
  stepsSection(wrap, 'Vorgehen', r.steps);
  toolChips(wrap, r.toolIds);
  fastenerTable(wrap, r.fastenerIds);
  partChips(wrap, r.partIds);
  componentChips(wrap, r.componentPaths);
  linkChips(wrap, 'Passende Diagnosen', (r.diagnosticIds || []).map((d) => ({ icon: 'diag', label: 'Problemfinder öffnen', href: `#/diagnose/${d}` })));
  warningsBlock(wrap, r.warnings);
  sourcesNote(wrap, r.sourceIds, r.verificationStatus);
  return wrap;
}

/* ─────────────────────────── Gemeinsame Helfer ─────────────────────────── */

function head(title, sub) {
  return el('header', { class: 'page-head' },
    el('div', {}, el('h1', {}, title), el('p', { class: 'muted' }, sub)));
}

function crumbs(entries) {
  const nav = el('nav', { class: 'crumbs' });
  entries.forEach(([href, label], i) => {
    if (i) nav.append(icon('chevR', 13, 'crumb-sep'));
    nav.append(el('a', { href: href || null, class: href ? '' : 'current' }, label));
  });
  return nav;
}

function section(title, ...children) {
  return el('section', { class: 'section' }, el('h2', { class: 'sub-head' }, title), ...children);
}

function spec(label, value) {
  return el('div', { class: 'spec' }, el('span', { class: 'muted small' }, label), el('strong', {}, value));
}

function kpi(iconName, value, label) {
  return el('div', { class: 'kpi' }, icon(iconName, 18, 'kpi-icon'), el('strong', { class: 'small' }, String(value)), el('span', { class: 'muted small' }, label));
}
function kpiNode(iconName, node, label) {
  return el('div', { class: 'kpi' }, icon(iconName, 18, 'kpi-icon'), node, el('span', { class: 'muted small' }, label));
}

function stepsSection(wrap, title, steps) {
  if (!steps?.length) return;
  const list = el('ol', { class: 'steps' });
  for (const s of steps) list.append(el('li', {}, s));
  wrap.append(section(title, list));
}

function linkChips(wrap, title, entries) {
  const items = (entries || []).filter(Boolean);
  if (!items.length) return;
  wrap.append(section(title,
    el('div', { class: 'link-chips' },
      items.map((it) => el(it.href ? 'a' : 'span', { class: 'chip' + (it.href ? '' : ' static'), href: it.href || null },
        icon(it.icon, 14), it.label)))));
}

function toolChips(wrap, toolIds) {
  linkChips(wrap, 'Werkzeug', (toolIds || []).map((tid) => {
    const t = getTool(tid);
    return t && { icon: 'wrench', label: t.name };
  }));
}

function partChips(wrap, partIds) {
  linkChips(wrap, 'Passende Ersatzteile', (partIds || []).map((pid) => {
    const p = getPart(pid);
    return p && { icon: 'box', label: p.shortName || p.name, href: `#/teile/${p.id}` };
  }));
}

function componentChips(wrap, componentPaths) {
  linkChips(wrap, 'Betroffene Bauteile', (componentPaths || []).map((path) => {
    const c = componentByPath(path);
    return c && { icon: 'gearbox', label: c.node.name, href: `#/technik/${c.path}` };
  }));
}

function fastenerTable(wrap, fastenerIds) {
  const rows = (fastenerIds || []).map(getFastener).filter(Boolean);
  if (!rows.length) return;
  wrap.append(section('Schrauben & Drehmomente',
    el('div', { class: 'card-technical table-card' },
      rows.map((x) =>
        el('div', { class: 'fastener-row' },
          el('div', { class: 'row-main' },
            el('span', {}, x.part),
            el('span', { class: 'muted small' }, x.thread)),
          techValue(x.torque, { kind: 'torque' }))))));
}

function warningsBlock(wrap, warnings) {
  for (const w of warnings || []) {
    wrap.append(el('div', { class: 'card legal warn', style: 'margin-top:12px' }, icon('warn', 18, 'legal-icon'), el('p', { class: 'small' }, w)));
  }
}

function sourcesNote(wrap, sourceIds, status) {
  const names = (sourceIds || []).map((sid) => getSource(sid)?.title).filter(Boolean);
  wrap.append(el('p', { class: 'disclaimer' }, icon('info', 14),
    ` ${status && status !== 'verified' ? UNVERIFIED_HINT + ' ' : ''}${names.length ? 'Quellen: ' + names.join(' · ') + '.' : ''} Im Zweifel gilt das Original-Reparaturhandbuch.`));
}

function notFound(wrap, title, backHref) {
  wrap.append(el('div', { class: 'empty-state' },
    icon('warn', 44, 'empty-icon'),
    el('h2', {}, title),
    el('a', { class: 'btn btn-primary', href: backHref }, 'Zurück')));
  return wrap;
}

function disclaimer() {
  return el('p', { class: 'disclaimer' }, icon('info', 14),
    ' Alle Angaben sind Richtwerte aus gängiger Werkstattliteratur – im Zweifel gilt das Original-Reparaturhandbuch.');
}
