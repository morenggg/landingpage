/**
 * MopedPlaner – Ersatzteile
 * Durchsuchbarer Teilekatalog mit Filtern, Fahrzeugbezug und
 * voll verknüpfter Detailansicht (Bauteile, Schrauben, Werkzeuge,
 * Reparaturen, Wartungen, Alternativen, Angebote-Vorschau).
 */

import { el, icon, verificationBadge, compatBadge, toast } from '../ui.js';
import {
  filterParts, getPart, getModel, getEngine, getTool, getFastener,
  componentByPath, partCompatibility, usagesOfPart, matchEngineFromText,
} from '../knowledge.js';
import { PARTS, PART_CATEGORIES, QUALITY_LEVELS } from '../data/parts.js';
import { ENGINES } from '../data/engines.js';
import { MODELS } from '../data/models.js';
import { offersForPart, getSeller } from '../data/offers.js';
import { UNVERIFIED_HINT } from '../data/sources.js';
import { Vehicles } from '../store.js';

/* Zuletzt angesehene Teile – UI-Zustand, bewusst getrennt von den
   Nutzdaten (mopedplaner.v1), damit Export/Import unberührt bleiben. */
const UI_KEY = 'mopedplaner.ui.v1';

function readUiState() {
  try { return JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch { return {}; }
}
function rememberPart(partId) {
  const state = readUiState();
  state.recentParts = [partId, ...(state.recentParts || []).filter((id) => id !== partId)].slice(0, 6);
  try { localStorage.setItem(UI_KEY, JSON.stringify(state)); } catch { /* voll → egal */ }
}

/* ─────────────────────────── Liste ─────────────────────────── */

export async function renderTeileList() {
  const vehicles = await Vehicles.all();
  const wrap = el('div', { class: 'view' });

  wrap.append(
    el('header', { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Ersatzteile'),
        el('p', { class: 'muted' }, `${PARTS.length} Teile im Katalog – händlerunabhängig, voll verknüpft.`))
    )
  );

  const filters = { query: '', category: '', modelId: '', engineId: '', quality: '', status: '', vehicleId: '' };

  // Suche
  const search = el('input', {
    class: 'search-input', type: 'search',
    placeholder: 'Suchen: „Kupplung", „Lamellen", „M541", „S51" …',
    oninput: (e) => { filters.query = e.target.value; renderList(); },
  });
  wrap.append(el('div', { class: 'search-wrap' }, icon('search', 18, 'search-icon'), search));

  // Fahrzeugfilter
  if (vehicles.length) {
    const vSelect = el('select', {
      onchange: (e) => {
        filters.vehicleId = e.target.value;
        const v = vehicles.find((x) => x.id === filters.vehicleId);
        filters.modelId = v ? v.modelId : '';
        filters.engineId = v ? (matchEngineFromText(v.motor)?.id || '') : '';
        renderList();
      },
    },
      el('option', { value: '' }, 'Alle Fahrzeuge'),
      vehicles.map((v) => el('option', { value: v.id }, `Nur passend zu: ${v.name || getModel(v.modelId)?.name || 'Fahrzeug'}`))
    );
    wrap.append(el('div', { class: 'vehicle-filter' }, icon('moped', 18), vSelect));
  }

  // Filter-Selects
  const sel = (label, options, key) => {
    const s = el('select', { class: 'filter-select', onchange: (e) => { filters[key] = e.target.value; renderList(); } },
      el('option', { value: '' }, label),
      options);
    return s;
  };
  wrap.append(
    el('div', { class: 'filter-bar' },
      sel('Kategorie', PART_CATEGORIES.map((c) => el('option', { value: c }, c)), 'category'),
      sel('Motor', ENGINES.map((e) => el('option', { value: e.id }, e.name)), 'engineId'),
      sel('Modell', MODELS.filter((m) => m.id !== 'sonstige').map((m) => el('option', { value: m.id }, m.name)), 'modelId'),
      sel('Qualität', Object.entries(QUALITY_LEVELS).map(([id, name]) => el('option', { value: id }, name)), 'quality'),
      sel('Prüfstatus', [
        el('option', { value: 'partially-verified' }, 'Teilweise geprüft'),
        el('option', { value: 'unverified' }, 'Ungeprüft'),
        el('option', { value: 'verified' }, 'Verifiziert'),
      ], 'status')
    )
  );

  // Hinweis, wenn Fahrzeug ohne gepflegten Motor gefiltert wird
  const vehicleHint = el('div', {});
  wrap.append(vehicleHint);

  // Zuletzt angesehen
  const recentIds = (readUiState().recentParts || []).filter((id) => getPart(id));
  if (recentIds.length) {
    const sec = el('section', { class: 'section' },
      el('h2', { class: 'sub-head' }, 'Zuletzt angesehen'),
      el('div', { class: 'link-chips' },
        recentIds.map((id) => el('a', { class: 'chip', href: `#/teile/${id}` }, icon('box', 14), getPart(id).shortName || getPart(id).name)))
    );
    wrap.append(sec);
  }

  const listWrap = el('div', { class: 'stack', style: 'margin-top:18px' });
  wrap.append(listWrap);

  const vehicleForCompat = () => vehicles.find((x) => x.id === filters.vehicleId) || null;

  function renderList() {
    // Fahrzeug-Hinweis aktualisieren
    vehicleHint.replaceChildren();
    const v = vehicleForCompat();
    if (v && !matchEngineFromText(v.motor)) {
      vehicleHint.append(
        el('p', { class: 'verify-note' }, icon('info', 14),
          v.motor
            ? `Der Motor „${v.motor}" konnte keiner Motorfamilie zugeordnet werden – gefiltert wird nur nach Modell. Motor-Kompatibilität bitte je Teil prüfen.`
            : 'In diesem Fahrzeug ist kein Motor gepflegt (Garage → Bearbeiten) – gefiltert wird nur nach Modell.')
      );
    }

    const results = filterParts(filters);
    listWrap.replaceChildren();

    if (!results.length) {
      listWrap.append(
        el('div', { class: 'empty-state slim' },
          icon('search', 36, 'empty-icon'),
          el('p', { class: 'muted' }, 'Kein Teil gefunden – Suchbegriff oder Filter anpassen.'))
      );
      return;
    }

    // Verzögertes Rendern großer Listen: erst 20, Rest auf Klick
    const first = results.slice(0, 20);
    for (const part of first) listWrap.append(partRow(part, v));
    if (results.length > first.length) {
      const more = el('button', { class: 'btn btn-ghost btn-block' }, `${results.length - first.length} weitere anzeigen`);
      more.addEventListener('click', () => {
        more.remove();
        for (const part of results.slice(20)) listWrap.append(partRow(part, v));
      });
      listWrap.append(more);
    }

    const unverified = results.filter((p) => p.verificationStatus !== 'verified').length;
    if (unverified) {
      listWrap.append(el('p', { class: 'disclaimer' }, icon('info', 14),
        ` ${unverified} der angezeigten Teile sind noch nicht vollständig verifiziert – Prüfstatus je Teil beachten.`));
    }
  }

  renderList();
  return wrap;
}

function partRow(part, vehicle) {
  const price = part.estimatedPriceRange;
  const priceText = price?.min != null ? `${price.min}–${price.max} €` : '';
  const compat = vehicle ? partCompatibility(part, vehicle) : null;
  return el('a', { class: 'row-item tall', href: `#/teile/${part.id}` },
    icon('box', 20, 'row-lead accent-lead'),
    el('div', { class: 'row-main' },
      el('span', { class: 'row-title' }, part.name),
      el('span', { class: 'muted small' }, [part.category, part.subcategory].filter(Boolean).join(' · ')),
      el('span', { class: 'chip-wrap tight' },
        verificationBadge(part.verificationStatus),
        compat ? compatBadge(compat) : null)
    ),
    el('div', { style: 'display:grid;justify-items:end;gap:4px' },
      priceText ? el('span', { class: 'part-price small' }, priceText) : null,
      icon('chevR', 18, 'muted'))
  );
}

/* ─────────────────────────── Detail ─────────────────────────── */

export async function renderTeilDetail({ partId }) {
  const part = getPart(partId);
  const wrap = el('div', { class: 'view' });
  if (!part) {
    wrap.append(el('div', { class: 'empty-state' },
      el('h2', {}, 'Teil nicht gefunden'),
      el('a', { class: 'btn btn-primary', href: '#/teile' }, 'Zum Katalog')));
    return wrap;
  }
  rememberPart(partId);

  const vehicles = await Vehicles.all();

  wrap.append(
    el('nav', { class: 'crumbs' },
      el('a', { href: '#/teile' }, 'Ersatzteile'),
      icon('chevR', 13, 'crumb-sep'),
      el('a', { class: 'current' }, part.shortName || part.name)),
    el('header', { class: 'comp-head' },
      icon('box', 30, 'comp-icon'),
      el('div', {},
        el('h1', {}, part.name),
        el('p', { class: 'muted small' }, [part.category, part.subcategory].filter(Boolean).join(' · ')))),
    el('div', { class: 'chip-wrap tight', style: 'margin-top:10px' },
      verificationBadge(part.verificationStatus),
      part.estimatedPriceRange?.min != null
        ? el('span', { class: 'badge accent' }, `ca. ${part.estimatedPriceRange.min}–${part.estimatedPriceRange.max} €`)
        : null)
  );

  if (part.description) wrap.append(el('p', { class: 'lead' }, part.description));
  if (part.function) {
    wrap.append(section('Funktion', el('div', { class: 'card' }, el('p', { class: 'small', style: 'margin:0' }, part.function))));
  }

  // Prüfstatus-Hinweis
  if (part.verificationStatus !== 'verified') {
    wrap.append(el('p', { class: 'verify-note' }, icon('warn', 14), ` ${UNVERIFIED_HINT}`));
  }

  // Kompatibilität zum eigenen Fahrzeug
  if (vehicles.length) {
    const compatOut = el('div', { style: 'margin-top:10px' });
    const vSelect = el('select', {
      onchange: (e) => {
        const v = vehicles.find((x) => x.id === e.target.value);
        compatOut.replaceChildren();
        if (v) {
          const compat = partCompatibility(part, v);
          compatOut.append(
            el('div', { class: 'chip-wrap tight' }, compatBadge(compat)),
            el('p', { class: 'small muted', style: 'margin:8px 0 0' }, compat.detail)
          );
        }
      },
    },
      el('option', { value: '' }, 'Fahrzeug wählen …'),
      vehicles.map((v) => el('option', { value: v.id }, v.name || getModel(v.modelId)?.name || 'Fahrzeug'))
    );
    wrap.append(section('Passt das an mein Fahrzeug?',
      el('div', { class: 'card' }, el('div', { class: 'vehicle-filter', style: 'margin:0' }, icon('moped', 18), vSelect), compatOut)));
  }

  // Kompatibilität (Katalogdaten)
  const compatCard = el('div', { class: 'card spec-grid' });
  const spec = (label, value) => value ? el('div', { class: 'spec' }, el('span', { class: 'muted small' }, label), el('strong', {}, value)) : null;
  compatCard.append(
    spec('Kompatible Modelle', part.compatibleModelIds.length ? part.compatibleModelIds.map((id) => getModel(id)?.name || id).join(', ') : 'Noch nicht erfasst'),
    spec('Kompatible Motoren', part.compatibleEngineIds.length ? part.compatibleEngineIds.map((id) => getEngine(id)?.name || id).join(', ') : 'Noch nicht erfasst'),
    spec('OEM-Nummern', part.oemNumbers.length ? part.oemNumbers.join(', ') : 'Noch nicht erfasst'),
    spec('Qualitätsstufen', part.qualityLevels.map((q) => QUALITY_LEVELS[q] || q).join(', '))
  );
  const compatSec = section('Kompatibilität', compatCard);
  if (part.compatNotes) compatSec.append(el('p', { class: 'muted small card-note' }, part.compatNotes));
  wrap.append(compatSec);

  // Verbaut in (Bauteile)
  linkSection(wrap, 'Verbaut in', part.componentIds.map((cid) => {
    const c = componentByPath(cid);
    return c && { icon: 'gearbox', label: c.node.name, href: `#/technik/${c.path}` };
  }));

  // Schrauben & Drehmomente
  const fastenerRows = part.requiredFastenerIds.map(getFastener).filter(Boolean);
  if (fastenerRows.length) {
    const table = el('div', { class: 'card table-card' },
      fastenerRows.map((x) =>
        el('div', { class: 'fastener-row' },
          el('div', { class: 'row-main' },
            el('span', {}, x.part),
            el('span', { class: 'muted small' }, [x.thread, x.note !== '—' && x.note].filter(Boolean).join(' · '))),
          el('strong', { class: 'torque' }, x.torque))));
    wrap.append(section('Zugehörige Schrauben & Drehmomente', table));
  }

  // Werkzeuge
  linkSection(wrap, 'Benötigtes Werkzeug', part.requiredToolIds.map((tid) => {
    const t = getTool(tid);
    return t && { icon: 'wrench', label: t.name, href: null, title: t.purpose };
  }));

  // Verwandte & Alternative Teile
  linkSection(wrap, 'Alternative Teile', part.alternativePartIds.map((pid) => {
    const p2 = getPart(pid);
    return p2 && { icon: 'box', label: p2.shortName || p2.name, href: `#/teile/${p2.id}` };
  }));
  linkSection(wrap, 'Verwandte Teile', part.relatedPartIds.map((pid) => {
    const p2 = getPart(pid);
    return p2 && { icon: 'box', label: p2.shortName || p2.name, href: `#/teile/${p2.id}` };
  }));

  // Verknüpfte Reparaturen/Wartungen/Diagnosen (aus beiden Richtungen)
  const usages = usagesOfPart(part.id);
  const repairs = [...new Map([...usages.repairs].map((r) => [r.id, r])).values()];
  linkSection(wrap, 'Zugehörige Reparaturen', repairs.map((r) => ({ icon: 'tools', label: r.name, href: `#/reparatur/${r.id}` })));
  linkSection(wrap, 'Zugehörige Wartungen', usages.maintenance.map((m) => ({ icon: 'calendar', label: m.name, href: `#/wartung/${m.id}` })));
  linkSection(wrap, 'Passende Diagnosen', (part.diagnosticIds || []).map((did) => ({ icon: 'diag', label: 'Problemfinder: ' + did.replaceAll('-', ' '), href: `#/diagnose/${did}` })));

  // Warnungen & Recht
  for (const w of part.warnings || []) {
    wrap.append(el('div', { class: 'card legal warn', style: 'margin-top:12px' }, icon('warn', 18, 'legal-icon'), el('p', { class: 'small' }, w)));
  }
  for (const l of part.legalNotes || []) {
    wrap.append(el('div', { class: 'card legal', style: 'margin-top:12px' }, icon('shield', 18, 'legal-icon'), el('p', { class: 'small' }, l)));
  }
  if (part.notes?.length) {
    wrap.append(section('Hinweise', el('div', { class: 'card' }, part.notes.map((n) => el('p', { class: 'small', style: 'margin:4px 0' }, '• ' + n)))));
  }

  // Angebote (Demo-Vorschau)
  const offers = offersForPart(part.id, { includeDemo: true });
  if (offers.length) {
    const sec = section('Angebote & Preisvergleich',
      el('div', { class: 'stack' },
        offers.map((o) =>
          el('div', { class: 'card', style: 'padding:14px' },
            el('div', { class: 'fastener-row', style: 'border:0;padding:0' },
              el('div', { class: 'row-main' },
                el('span', {}, o.productName),
                el('span', { class: 'muted small' }, getSeller(o.sellerId)?.name || '')),
              el('span', { class: 'chip-wrap tight' }, verificationBadge('demo')))))));
    sec.append(el('p', { class: 'muted small card-note' },
      'Die Händleranbindung ist vorbereitet, aber noch nicht aktiv – gezeigt werden nur Demo-Strukturen ohne echte Preise oder Links.'));
    wrap.append(sec);
  }

  wrap.append(el('p', { class: 'disclaimer' }, icon('info', 14),
    ' Alle Angaben sind Richtwerte ohne Gewähr – Prüfstatus beachten, im Zweifel Original-Reparaturhandbuch.'));

  return wrap;
}

/* ─────────────────────────── Helfer ─────────────────────────── */

function section(title, ...children) {
  return el('section', { class: 'section' }, el('h2', { class: 'sub-head' }, title), ...children);
}

/** Zeigt eine Chip-Reihe verlinkter Elemente – oder nichts, wenn leer. */
function linkSection(wrap, title, entries) {
  const items = (entries || []).filter(Boolean);
  if (!items.length) return;
  wrap.append(section(title,
    el('div', { class: 'link-chips' },
      items.map((it) => el(it.href ? 'a' : 'span', { class: 'chip' + (it.href ? '' : ' static'), href: it.href || null, title: it.title || null },
        icon(it.icon, 14), it.label)))));
}
