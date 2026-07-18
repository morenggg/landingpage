/**
 * MopedPlaner – Wissensschicht
 *
 * Verbindet alle statischen Datenmodule zu einem abfragbaren Graphen:
 * Modelle ↔ Motoren ↔ Bauteile ↔ Schrauben ↔ Werkzeuge ↔ Wartungen ↔
 * Reparaturen ↔ Diagnosen ↔ Ersatzteile.
 *
 * Reine Logik ohne DOM – Views fragen ausschließlich hier an.
 */

import { MODELS, getModel } from './data/models.js';
import { ENGINES, getEngine, matchEngineFromText, enginesForModel } from './data/engines.js';
import { COMPONENT_TREE } from './data/components.js';
import { PARTS, getPart, partsForComponent } from './data/parts.js';
import { FASTENERS, getFastener, fastenersForComponent } from './data/fasteners.js';
import { TOOLS, getTool } from './data/tools.js';
import { MAINTENANCE, getMaintenance, maintenanceForComponent } from './data/maintenance.js';
import { REPAIRS, getRepair, repairsForComponent } from './data/repairs.js';
import { BEARINGS_SEALS, bearingsForComponent } from './data/bearings-seals.js';
import { DIAGNOSTIC_FLOWS, getFlow } from './data/diagnostics.js';

export {
  getModel, getEngine, getPart, getFastener, getTool,
  getMaintenance, getRepair, getFlow,
  enginesForModel, matchEngineFromText,
  partsForComponent, fastenersForComponent,
  maintenanceForComponent, repairsForComponent, bearingsForComponent,
};

/* ─────────────────── Bauteil-Baum flach ─────────────────── */

let _flatComponents = null;

/** Alle Bauteile als flache Liste: { path, node, parents } */
export function flattenComponents() {
  if (_flatComponents) return _flatComponents;
  const out = [];
  const walk = (nodes, prefix, parents) => {
    for (const node of nodes) {
      const path = [...prefix, node.id].join('/');
      out.push({ path, node, parents: [...parents] });
      if (node.children) walk(node.children, [...prefix, node.id], [...parents, node]);
    }
  };
  walk(COMPONENT_TREE, [], []);
  _flatComponents = out;
  return out;
}

export function componentByPath(path) {
  return flattenComponents().find((c) => c.path === path) || null;
}

/* ─────────────────── Kompatibilität ─────────────────── */

export const COMPAT_STATES = {
  direkt: { id: 'direkt', label: 'Direkt passend', tone: 'ok' },
  einschraenkung: { id: 'einschraenkung', label: 'Passend mit Einschränkungen', tone: 'warn' },
  umbau: { id: 'umbau', label: 'Passend nach Umbau', tone: 'warn' },
  nicht: { id: 'nicht', label: 'Nicht kompatibel', tone: 'danger' },
  ungeprueft: { id: 'ungeprueft', label: 'Noch nicht geprüft', tone: 'muted' },
};

/**
 * Kompatibilität eines Ersatzteils zu einem konkreten Fahrzeug –
 * strikt aus den Daten abgeleitet, keine Vermutungen.
 * Liefert { state, label, tone, detail }.
 */
export function partCompatibility(part, vehicle) {
  if (!vehicle) return { ...COMPAT_STATES.ungeprueft, detail: 'Kein Fahrzeug gewählt.' };

  const modelListed = part.compatibleModelIds?.length
    ? part.compatibleModelIds.includes(vehicle.modelId)
    : null; // keine Angabe in den Daten

  const engine = matchEngineFromText(vehicle.motor);
  const engineListed = part.compatibleEngineIds?.length
    ? (engine ? part.compatibleEngineIds.includes(engine.id) : null)
    : null;

  // Beide Dimensionen ohne Daten → ungeprüft
  if (modelListed === null && engineListed === null) {
    return { ...COMPAT_STATES.ungeprueft, detail: 'Für dieses Teil sind noch keine Kompatibilitätsdaten hinterlegt.' };
  }
  // Explizit nicht gelistet → laut Datenbasis nicht kompatibel
  if (modelListed === false && engineListed !== true) {
    return { ...COMPAT_STATES.nicht, detail: `Laut Datenbasis nicht für ${getModel(vehicle.modelId)?.name || 'dieses Modell'} gelistet.` };
  }
  if (engineListed === false && modelListed !== true) {
    return { ...COMPAT_STATES.nicht, detail: `Laut Datenbasis nicht für den Motor ${engine?.name || vehicle.motor} gelistet.` };
  }
  // Modell passt, Motor unbekannt/ungepflegt
  if (modelListed === true && engineListed === null && part.compatibleEngineIds?.length) {
    return {
      ...COMPAT_STATES.einschraenkung,
      detail: vehicle.motor
        ? `Motor „${vehicle.motor}" konnte keiner Motorfamilie zugeordnet werden – Motorkompatibilität bitte selbst prüfen.`
        : 'Im Fahrzeug ist kein Motor gepflegt – Motorkompatibilität bitte selbst prüfen.',
    };
  }
  // Teilkonflikt Modell vs. Motor
  if (modelListed === false || engineListed === false) {
    return { ...COMPAT_STATES.einschraenkung, detail: 'Modell- und Motorangaben widersprechen sich – bitte manuell prüfen.' };
  }
  const note = part.compatNotes ? ` ${part.compatNotes}` : '';
  return { ...COMPAT_STATES.direkt, detail: `Laut Datenbasis passend.${note}` };
}

/* ─────────────────── Zentrale Suche ─────────────────── */

const norm = (s) => String(s || '').toLowerCase();

function hit(query, ...fields) {
  return fields.some((f) => {
    if (Array.isArray(f)) return f.some((x) => norm(x).includes(query));
    return norm(f).includes(query);
  });
}

/**
 * Durchsucht die gesamte Wissensbasis.
 * Liefert Gruppen: [{ type, label, icon, items: [{ title, sub, href }] }]
 */
export function searchKnowledge(rawQuery, { limitPerGroup = 8 } = {}) {
  const query = norm(rawQuery).trim();
  if (query.length < 2) return [];

  const groups = [];
  const add = (type, label, icon, items) => {
    if (items.length) groups.push({ type, label, icon, count: items.length, items: items.slice(0, limitPerGroup) });
  };

  add('modell', 'Modelle', 'moped',
    MODELS.filter((m) => hit(query, m.name, m.engine, m.tags, m.notes, m.variants))
      .map((m) => ({ title: m.name, sub: m.years, href: null })));

  add('motor', 'Motoren', 'engine',
    ENGINES.filter((e) => hit(query, e.name, e.family, e.carb, e.notes, e.ignitionTypes))
      .map((e) => ({ title: e.name, sub: e.family, href: `#/motor/${e.id}`, status: e.verificationStatus })));

  add('bauteil', 'Bauteile', 'gearbox',
    flattenComponents().filter((c) => hit(query, c.node.name, c.node.summary))
      .map((c) => ({ title: c.node.name, sub: c.parents.map((p) => p.name).join(' → ') || 'Baugruppe', href: `#/technik/${c.path}` })));

  add('ersatzteil', 'Ersatzteile', 'box',
    PARTS.filter((p) => hit(query, p.name, p.shortName, p.category, p.subcategory, p.description, p.function, p.oemNumbers, p.notes))
      .map((p) => ({ title: p.name, sub: p.category, href: `#/teile/${p.id}`, status: p.verificationStatus })));

  add('schraube', 'Schrauben & Drehmomente', 'nut',
    FASTENERS.filter((x) => hit(query, x.part, x.fastener, x.thread, x.sw, x.torque, x.note))
      .map((x) => ({ title: x.part, sub: `${x.thread} · ${x.torque}`, href: '#/schrauben', status: x.verificationStatus })));

  add('werkzeug', 'Werkzeuge', 'wrench',
    TOOLS.filter((t) => hit(query, t.name, t.purpose, t.size))
      .map((t) => ({ title: t.name, sub: t.purpose, href: null })));

  add('wartung', 'Wartungen', 'calendar',
    MAINTENANCE.filter((m) => hit(query, m.name, m.steps, m.materials))
      .map((m) => ({ title: m.name, sub: m.interval, href: `#/wartung/${m.id}`, status: m.verificationStatus })));

  add('reparatur', 'Reparaturen', 'tools',
    REPAIRS.filter((r) => hit(query, r.name, r.steps, (r.values || []).map((v) => v.name + ' ' + v.value)))
      .map((r) => ({ title: r.name, sub: `${r.duration} · Schwierigkeit ${r.difficulty}/5`, href: `#/reparatur/${r.id}`, status: r.verificationStatus })));

  add('diagnose', 'Diagnosen', 'diag',
    DIAGNOSTIC_FLOWS.filter((d) => hit(query, d.title, d.tagline))
      .map((d) => ({ title: d.title, sub: d.tagline, href: `#/diagnose/${d.id}` })));

  add('lager', 'Lager & Dichtungen', 'clutch',
    BEARINGS_SEALS.filter((b) => hit(query, b.name, b.size, b.location, b.notes))
      .map((b) => ({ title: b.name, sub: b.location, href: null, status: b.verificationStatus })));

  return groups;
}

/* ─────────────────── Ersatzteil-Filterung ─────────────────── */

/**
 * Filtert den Teilekatalog. filters:
 * { query, category, modelId, engineId, quality, status }
 */
export function filterParts(filters = {}) {
  const query = norm(filters.query).trim();
  return PARTS.filter((part) => {
    if (filters.category && part.category !== filters.category) return false;
    if (filters.quality && !part.qualityLevels.includes(filters.quality)) return false;
    if (filters.status && part.verificationStatus !== filters.status) return false;
    if (filters.modelId && part.compatibleModelIds.length && !part.compatibleModelIds.includes(filters.modelId)) return false;
    if (filters.engineId && part.compatibleEngineIds.length && !part.compatibleEngineIds.includes(filters.engineId)) return false;
    if (query) {
      const componentNames = part.componentIds.map((cid) => componentByPath(cid)?.node.name || '');
      const engineNames = part.compatibleEngineIds.map((eid) => getEngine(eid)?.name || '');
      const modelNames = part.compatibleModelIds.map((mid) => getModel(mid)?.name || '');
      const related = part.relatedPartIds.map((rid) => getPart(rid)?.name || '');
      if (!hit(query, part.name, part.shortName, part.category, part.subcategory, part.description,
               part.function, part.oemNumbers, part.notes, componentNames, engineNames, modelNames, related)) return false;
    }
    return true;
  });
}

/** Reparaturen/Wartungen/Lager, die auf ein Ersatzteil verweisen. */
export function usagesOfPart(partId) {
  return {
    repairs: REPAIRS.filter((r) => (r.partIds || []).includes(partId)),
    maintenance: MAINTENANCE.filter((m) => (m.partIds || []).includes(partId)),
    bearings: BEARINGS_SEALS.filter((b) => (b.partIds || []).includes(partId)),
    fasteners: FASTENERS.filter((x) => (x.partIds || []).includes(partId)),
  };
}
